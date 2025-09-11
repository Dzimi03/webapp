import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/authOptions';
import { db } from '../../../../db';

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
type EventContext = { params: { id: string; eventId: string } };
export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest, context: EventContext) {
  try {
  const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: groupId, eventId } = context.params;
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
    const events: GroupEvent[] = (db.data as any).groupEvents || [];
    const idx = events.findIndex(ev => ev.id === eventId && ev.groupId === groupId);
    if (idx === -1) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    const updatedEvent: GroupEvent = {
      ...events[idx],
      name: body.name ?? events[idx].name,
      description: body.description ?? events[idx].description,
      date: body.date ?? events[idx].date,
      time: body.time ?? events[idx].time,
      location: body.location ?? events[idx].location,
      ticketmasterEventId: body.ticketmasterEventId ?? events[idx].ticketmasterEventId,
      ticketmasterEventUrl: body.ticketmasterEventUrl ?? events[idx].ticketmasterEventUrl,
      imageUrl: body.imageUrl ?? events[idx].imageUrl
    };
    events[idx] = updatedEvent;
    (db.data as any).groupEvents = events;
    await db.write();
    return NextResponse.json({ event: updatedEvent });
  } catch (error) {
    console.error('Error updating group event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Usuń event grupy
export async function DELETE(request: NextRequest, context: EventContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: groupId, eventId } = context.params;
    await db.read();
    const group = db.data.groups.find(g => g.id === groupId);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    const isMember = group.members.some(m => m.email === session.user?.email);
    if (!isMember) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }
    const events: GroupEvent[] = (db.data as any).groupEvents || [];
    const idx = events.findIndex(ev => ev.id === eventId && ev.groupId === groupId);
    if (idx === -1) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    events.splice(idx, 1);
    (db.data as any).groupEvents = events;
    await db.write();
    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting group event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
