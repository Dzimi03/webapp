import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/authOptions';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'src/app/api/db.json');

interface GroupEvent {
  id: string;
  groupId: string;
  name: string;
  description?: string;
  date: string;
  time?: string;
  location?: string;
  ticketmasterEventId?: string;
  ticketmasterEventUrl?: string;
  imageUrl?: string;
  createdAt: string;
}

// GET - Pobierz event grupy
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupId = params.id;
    
    // Wczytaj dane z pliku JSON
    const dbData = JSON.parse(readFileSync(dbPath, 'utf-8'));
    
    // Znajdź event dla tej grupy
    const groupEvent = dbData.groupEvents?.find((event: GroupEvent) => event.groupId === groupId);
    
    return NextResponse.json({ event: groupEvent || null });
  } catch (error) {
    console.error('Error fetching group event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Dodaj nowy event do grupy
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupId = params.id;
    const body = await request.json();
    
    // Wczytaj dane z pliku JSON
    const dbData = JSON.parse(readFileSync(dbPath, 'utf-8'));
    
    // Sprawdź czy grupa istnieje
    const group = dbData.groups?.find((g: any) => g.id === groupId);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    
    // Sprawdź czy użytkownik jest członkiem grupy
    const isMember = group.members?.some((member: any) => member.email === session.user.email);
    if (!isMember) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }
    
    // Sprawdź czy grupa już ma event
    const existingEvent = dbData.groupEvents?.find((event: GroupEvent) => event.groupId === groupId);
    if (existingEvent) {
      return NextResponse.json({ error: 'Group already has an event' }, { status: 400 });
    }
    
    // Utwórz nowy event
    const newEvent: GroupEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      groupId,
      name: body.name,
      description: body.description,
      date: body.date,
      time: body.time,
      location: body.location,
      ticketmasterEventId: body.ticketmasterEventId,
      ticketmasterEventUrl: body.ticketmasterEventUrl,
      imageUrl: body.imageUrl,
      createdAt: new Date().toISOString()
    };
    
    // Dodaj event do bazy danych
    if (!dbData.groupEvents) {
      dbData.groupEvents = [];
    }
    dbData.groupEvents.push(newEvent);
    
    // Zapisz dane
    writeFileSync(dbPath, JSON.stringify(dbData, null, 2));
    
    return NextResponse.json({ event: newEvent });
  } catch (error) {
    console.error('Error creating group event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
