import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/authOptions';
import { db } from '../../../db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await db.read();
    const { id } = await params;
    const groupIndex = db.data.groups.findIndex(g => g.id === id);
    
    if (groupIndex === -1) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const group = db.data.groups[groupIndex];
    const currentUser = db.data.users.find(u => u.email === session.user!.email);
    const targetUser = db.data.users.find(u => u.id === userId);
    
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    // Check if current user is a member of the group
    const isMember = group.members.some(member => {
      if ('userId' in member) {
        return member.userId === currentUser.id;
      } else {
        return member.id === currentUser.id;
      }
    });
    if (!isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if target user is already a member
    const isAlreadyMember = group.members.some(member => {
      if ('userId' in member) {
        return member.userId === userId;
      } else {
        return member.id === userId;
      }
    });
    if (isAlreadyMember) {
      return NextResponse.json({ error: 'User is already a member of this group' }, { status: 400 });
    }

    // Check if invitation already exists
    const existingInvite = db.data.groupInvites.find(invite => 
      invite.groupId === id &&
      invite.toUserId === userId &&
      invite.status === 'pending'
    );
    
    if (existingInvite) {
      return NextResponse.json({ error: 'Invitation already sent' }, { status: 400 });
    }

    // Create new invitation
    const newInvite = {
      id: Date.now().toString(),
      fromUserId: currentUser.id,
      toUserId: userId,
      groupId: id,
      status: 'pending' as const,
      createdAt: new Date().toISOString()
    };

    db.data.groupInvites.push(newInvite);
    await db.write();

    return NextResponse.json({ message: 'Invitation sent successfully' });
  } catch (error) {
    console.error('Error sending invitation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 