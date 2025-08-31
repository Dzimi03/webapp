import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
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

// GET - Pobierz wszystkie eventy grupy
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbData = JSON.parse(readFileSync(dbPath, 'utf8'));
    const group = dbData.groups.find((g: any) => g.id === params.id);
    
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Sprawdź czy użytkownik jest członkiem grupy
    const isMember = group.members.some((member: any) => member.email === session.user.email);
    if (!isMember) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    // Pobierz wszystkie eventy dla tej grupy
    const events = dbData.groupEvents?.filter((event: GroupEvent) => event.groupId === params.id) || [];

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching group events:', error);
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

    const dbData = JSON.parse(readFileSync(dbPath, 'utf8'));
    const group = dbData.groups.find((g: any) => g.id === params.id);
    
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Sprawdź czy użytkownik jest członkiem grupy
    const isMember = group.members.some((member: any) => member.email === session.user.email);
    if (!isMember) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, date, time, location, ticketmasterEventId, ticketmasterEventUrl, imageUrl } = body;

    if (!name || !date) {
      return NextResponse.json({ error: 'Name and date are required' }, { status: 400 });
    }

    const newEvent: GroupEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      groupId: params.id,
      name,
      description,
      date,
      time,
      location,
      ticketmasterEventId,
      ticketmasterEventUrl,
      imageUrl,
      createdAt: new Date().toISOString()
    };

    // Inicjalizuj tablicę groupEvents jeśli nie istnieje
    if (!dbData.groupEvents) {
      dbData.groupEvents = [];
    }

    dbData.groupEvents.push(newEvent);
    writeFileSync(dbPath, JSON.stringify(dbData, null, 2));

    return NextResponse.json({ event: newEvent });
  } catch (error) {
    console.error('Error adding group event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
