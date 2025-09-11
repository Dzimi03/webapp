import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/authOptions';
import { db } from '../../../db';

// Send invite to a user to join the group
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

    await db.read();
    const { id } = params;
    const group = db.data.groups.find(g => g.id === id);
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    const currentUser = db.data.users.find(u => u.email === session.user!.email);
    if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const targetUser = db.data.users.find(u => u.id === userId);
    if (!targetUser) return NextResponse.json({ error: 'Target user not found' }, { status: 404 });

    const isMember = group.members.some(m => ('userId' in m ? m.userId : m.id) === currentUser.id);
    if (!isMember) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    const isAlreadyMember = group.members.some(m => ('userId' in m ? m.userId : m.id) === userId);
    if (isAlreadyMember) return NextResponse.json({ error: 'User is already a member of this group' }, { status: 400 });

    const existingInvite = db.data.groupInvites.find(invite => invite.groupId === id && invite.toUserId === userId && invite.status === 'pending');
    if (existingInvite) return NextResponse.json({ error: 'Invitation already sent' }, { status: 400 });

    db.data.groupInvites.push({
      id: Date.now().toString(),
      fromUserId: currentUser.id,
      toUserId: userId,
      groupId: id,
      status: 'pending' as const,
      createdAt: new Date().toISOString()
    });
    await db.write();
    return NextResponse.json({ message: 'Invitation sent successfully' });
  } catch (e) {
    console.error('Error sending invitation:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}