import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/authOptions';
import { db } from '../../../../db';

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

  await db.read();
  const group = db.data.groups.find(g => g.id === params.id);
    
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Sprawdź czy użytkownik jest członkiem grupy
  const isMember = group.members.some((member: any) => member.email === session.user?.email);
    if (!isMember) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    // Znajdź event do usunięcia
  const list = (db.data as any).groupEvents || [];
  const eventIndex = list.findIndex((event: any) => event.id === params.eventId && event.groupId === params.id);

    if (eventIndex === -1 || eventIndex === undefined) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Usuń event
  list.splice(eventIndex, 1);
  (db.data as any).groupEvents = list;
  await db.write();

    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting group event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
