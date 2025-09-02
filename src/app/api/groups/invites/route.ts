import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { db } from '../../db';
import { createNotification } from '../../notifications/route';

// GET - Get current user's group invitations
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await db.read();
    const currentUser = db.data.users.find(u => u.email === session.user!.email);
    
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get pending group invitations for current user
    const pendingInvites = db.data.groupInvites?.filter((invite: any) => 
      invite.toUserId === currentUser.id && invite.status === 'pending'
    ) || [];

    // Enrich invitations with user and group details
    const enrichedInvites = pendingInvites.map((invite: any) => {
      const fromUser = db.data.users.find(u => u.id === invite.fromUserId);
      const group = db.data.groups.find(g => g.id === invite.groupId);
      
      return {
        ...invite,
        fromUser: fromUser ? { id: fromUser.id, name: fromUser.name, email: fromUser.email, avatarUrl: fromUser.avatarUrl } : null,
        group: group ? { id: group.id, name: group.name, imageUrl: group.imageUrl } : null
      };
    });

    return NextResponse.json({ invites: enrichedInvites });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Accept group invitation
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { inviteId } = await req.json();
    
    if (!inviteId) {
      return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 });
    }

    await db.read();
    const currentUser = db.data.users.find(u => u.email === session.user!.email);
    
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find the invitation
    const inviteIndex = db.data.groupInvites?.findIndex((invite: any) => invite.id === inviteId);
    
    if (inviteIndex === -1 || inviteIndex === undefined) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    const invite = db.data.groupInvites[inviteIndex];
    
    // Check if invitation is for current user
    if (invite.toUserId !== currentUser.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if invitation is still pending
    if (invite.status !== 'pending') {
      return NextResponse.json({ error: 'Invitation already processed' }, { status: 400 });
    }

    // Find the group
    const groupIndex = db.data.groups.findIndex(g => g.id === invite.groupId);
    
    if (groupIndex === -1) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if user is already a member
    const isAlreadyMember = db.data.groups[groupIndex].members.some(member => {
      if ('userId' in member) {
        return member.userId === currentUser.id;
      } else {
        return member.id === currentUser.id;
      }
    });

    if (!isAlreadyMember) {
      // Add user to group
      db.data.groups[groupIndex].members.push(currentUser);
    }
    
    // Update invitation status
    db.data.groupInvites[inviteIndex].status = 'accepted';
    
    await db.write();

    // Create notification for the user who sent the invitation
    const group = db.data.groups[groupIndex];
    console.log('Creating notification for:', invite.fromUserId, 'about group:', group.name);
    const notification = await createNotification(
      invite.fromUserId,
      'group_invite_accepted',
      'Group Invitation Accepted',
      `${currentUser.name} accepted your invitation to group: ${group.name}`,
      group.id
    );
    console.log('Notification created:', notification);

    return NextResponse.json({ message: 'Group invitation accepted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Reject group invitation
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { inviteId } = await req.json();
    
    if (!inviteId) {
      return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 });
    }

    await db.read();
    const currentUser = db.data.users.find(u => u.email === session.user!.email);
    
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find the invitation
    const inviteIndex = db.data.groupInvites?.findIndex((invite: any) => invite.id === inviteId);
    
    if (inviteIndex === -1 || inviteIndex === undefined) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    const invite = db.data.groupInvites[inviteIndex];
    
    // Check if invitation is for current user
    if (invite.toUserId !== currentUser.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if invitation is still pending
    if (invite.status !== 'pending') {
      return NextResponse.json({ error: 'Invitation already processed' }, { status: 400 });
    }

    // Update invitation status
    db.data.groupInvites[inviteIndex].status = 'rejected';
    
    await db.write();

    // Create notification for the user who sent the invitation
    const group = db.data.groups.find(g => g.id === invite.groupId);
    if (group) {
      await createNotification(
        invite.fromUserId,
        'group_invite_rejected',
        'Group Invitation Rejected',
        `${currentUser.name} rejected your invitation to group: ${group.name}`,
        group.id
      );
    }

    return NextResponse.json({ message: 'Group invitation rejected successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 