import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/authOptions';
import { db } from '../../../db';

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
    await db.read();
    const group = db.data.groups.find(g => g.id === groupId);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    // member check (structure: full user objects)
  const isMember = group.members.some(m => m.email === session.user?.email);
    if (!isMember) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }
    const groupEvent = (db.data as any).groupEvents?.find((event: GroupEvent) => event.groupId === groupId) || null;
    return NextResponse.json({ event: groupEvent });
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
    await db.read();
    const group = db.data.groups.find(g => g.id === groupId);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
  const isMember = group.members.some(m => m.email === session.user?.email);
    if (!isMember) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }
    const eventsArray: GroupEvent[] = (db.data as any).groupEvents || ((db.data as any).groupEvents = []);
    const existingEvent = eventsArray.find(ev => ev.groupId === groupId);
    if (existingEvent) {
      return NextResponse.json({ error: 'Group already has an event' }, { status: 400 });
    }
    if (!body.name || !body.date) {
      return NextResponse.json({ error: 'Name and date required' }, { status: 400 });
    }
    const newEvent: GroupEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      groupId,
      name: body.name,
      description: body.description || '',
      date: body.date,
      time: body.time,
      location: body.location,
      ticketmasterEventId: body.ticketmasterEventId,
      ticketmasterEventUrl: body.ticketmasterEventUrl,
      imageUrl: body.imageUrl,
      createdAt: new Date().toISOString()
    };
    eventsArray.push(newEvent);
    await db.write();
    return NextResponse.json({ event: newEvent });
  } catch (error) {
    console.error('Error creating group event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
