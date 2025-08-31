import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';
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

// PUT - Edytuj event grupy
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupId = params.id;
    const eventId = params.eventId;
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
    
    // Znajdź event
    const eventIndex = dbData.groupEvents?.findIndex((event: GroupEvent) => 
      event.id === eventId && event.groupId === groupId
    );
    
    if (eventIndex === -1 || eventIndex === undefined) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    // Zaktualizuj event
    const updatedEvent = {
      ...dbData.groupEvents[eventIndex],
      name: body.name,
      description: body.description,
      date: body.date,
      time: body.time,
      location: body.location,
      ticketmasterEventId: body.ticketmasterEventId,
      ticketmasterEventUrl: body.ticketmasterEventUrl,
      imageUrl: body.imageUrl
    };
    
    dbData.groupEvents[eventIndex] = updatedEvent;
    
    // Zapisz dane
    writeFileSync(dbPath, JSON.stringify(dbData, null, 2));
    
    return NextResponse.json({ event: updatedEvent });
  } catch (error) {
    console.error('Error updating group event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Usuń event grupy
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupId = params.id;
    const eventId = params.eventId;
    
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
    
    // Znajdź i usuń event
    const eventIndex = dbData.groupEvents?.findIndex((event: GroupEvent) => 
      event.id === eventId && event.groupId === groupId
    );
    
    if (eventIndex === -1 || eventIndex === undefined) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    dbData.groupEvents.splice(eventIndex, 1);
    
    // Zapisz dane
    writeFileSync(dbPath, JSON.stringify(dbData, null, 2));
    
    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting group event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
