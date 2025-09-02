import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/authOptions';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'src/app/api/db.json');

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

    // Znajdź event do usunięcia
    const eventIndex = dbData.groupEvents?.findIndex((event: any) => 
      event.id === params.eventId && event.groupId === params.id
    );

    if (eventIndex === -1 || eventIndex === undefined) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Usuń event
    dbData.groupEvents.splice(eventIndex, 1);
    writeFileSync(dbPath, JSON.stringify(dbData, null, 2));

    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting group event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
