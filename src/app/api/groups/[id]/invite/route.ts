import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { db } from '../../../db';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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
    const groupIndex = db.data.groups.findIndex(g => g.id === params.id);
    
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

    // Check if current user is a member of the group with appropriate role (handle both old and new structures)
    const currentUserMember = group.members.find(member => {
      if ('userId' in member) {
        return member.userId === currentUser.id;
      } else {
        return member.id === currentUser.id;
      }
    });
    if (!currentUserMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Only founder and admin can invite users
    const userRole = 'role' in currentUserMember ? currentUserMember.role : 'founder'; // Default to founder for old structure
    if (userRole !== 'founder' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Only founders and admins can invite users' }, { status: 403 });
    }

    // Check if target user is already a member (handle both old and new structures)
    const isAlreadyMember = group.members.some(member => {
      if ('userId' in member) {
        return member.userId === targetUser.id;
      } else {
        return member.id === targetUser.id;
      }
    });
    if (isAlreadyMember) {
      return NextResponse.json({ error: 'User is already a member of this group' }, { status: 400 });
    }

    // Check if target user is a friend of current user
    const isFriend = currentUser.friends.includes(targetUser.id);
    if (!isFriend) {
      return NextResponse.json({ error: 'You can only invite your friends to groups' }, { status: 400 });
    }

    // Check if invitation already exists
    const existingInvite = db.data.groupInvites?.find(
      (invite: any) => 
        invite.fromUserId === currentUser.id && 
        invite.toUserId === targetUser.id && 
        invite.groupId === params.id && 
        invite.status === 'pending'
    );
    
    if (existingInvite) {
      return NextResponse.json({ error: 'Invitation already sent' }, { status: 400 });
    }

    // Create group invitation
    const groupInvite = {
      id: `gi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fromUserId: currentUser.id,
      toUserId: targetUser.id,
      groupId: params.id,
      status: 'pending' as const,
      createdAt: new Date().toISOString()
    };

    if (!db.data.groupInvites) {
      db.data.groupInvites = [];
    }
    
    db.data.groupInvites.push(groupInvite);
    
    // Update user's sent invites
    if (!currentUser.sentGroupInvites) {
      currentUser.sentGroupInvites = [];
    }
    currentUser.sentGroupInvites.push(groupInvite.id);
    
    // Update target user's received invites
    if (!targetUser.receivedGroupInvites) {
      targetUser.receivedGroupInvites = [];
    }
    targetUser.receivedGroupInvites.push(groupInvite.id);
    
    await db.write();

    return NextResponse.json({ message: 'Group invitation sent successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 