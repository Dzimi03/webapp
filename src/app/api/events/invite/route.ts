import { NextRequest, NextResponse } from 'next/server';
import { db, User, EventInvite } from '../../db';
import { getToken } from 'next-auth/jwt';

async function getSessionUser(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) return null;
  await db.read();
  return db.data?.users.find((u: User) => u.email === token.email) || null;
}

// POST - Send event invitation
export async function POST(req: NextRequest) {
  const currentUser = await getSessionUser(req);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { eventId, eventName, friendId } = await req.json();

  if (!eventId || !eventName || !friendId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Check if target user exists and is a friend
  const targetUser = db.data?.users.find((u: User) => u.id === friendId);
  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (!currentUser.friends.includes(friendId)) {
    return NextResponse.json({ error: 'Can only invite friends' }, { status: 403 });
  }

  // Check if invitation already exists
  const existingInvite = db.data?.eventInvites?.find(
    (invite: EventInvite) => 
      invite.fromUserId === currentUser.id && 
      invite.toUserId === friendId && 
      invite.eventId === eventId && 
      invite.status === 'pending'
  );

  if (existingInvite) {
    return NextResponse.json({ error: 'Invitation already sent' }, { status: 400 });
  }

  // Create event invitation
  const eventInvite: EventInvite = {
    id: `ei_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    fromUserId: currentUser.id,
    toUserId: friendId,
    eventId: eventId,
    eventName: eventName,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  if (!db.data?.eventInvites) {
    db.data!.eventInvites = [];
  }

  db.data!.eventInvites.push(eventInvite);

  // Update user's sent event invites
  if (!currentUser.sentEventInvites) {
    currentUser.sentEventInvites = [];
  }
  currentUser.sentEventInvites.push(eventInvite.id);

  // Update target user's received event invites
  if (!targetUser.receivedEventInvites) {
    targetUser.receivedEventInvites = [];
  }
  targetUser.receivedEventInvites.push(eventInvite.id);

  await db.write();

  return NextResponse.json({ 
    success: true, 
    message: 'Event invitation sent',
    inviteId: eventInvite.id 
  });
}

// GET - Get event invitations for current user
export async function GET(req: NextRequest) {
  const currentUser = await getSessionUser(req);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userInvites = db.data?.eventInvites?.filter(
    (invite: EventInvite) => invite.toUserId === currentUser.id && invite.status === 'pending'
  ) || [];

  // Enrich invites with sender information
  const enrichedInvites = userInvites.map((invite: EventInvite) => {
    const sender = db.data?.users.find((u: User) => u.id === invite.fromUserId);
    return {
      ...invite,
      sender: sender ? {
        id: sender.id,
        name: sender.name,
        avatarUrl: sender.avatarUrl
      } : null
    };
  });

  return NextResponse.json(enrichedInvites);
}

// PUT - Accept/Reject event invitation
export async function PUT(req: NextRequest) {
  const currentUser = await getSessionUser(req);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { inviteId, action } = await req.json();

  if (!inviteId || !action || !['accept', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const invite = db.data?.eventInvites?.find((inv: EventInvite) => inv.id === inviteId);
  if (!invite) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
  }

  if (invite.toUserId !== currentUser.id) {
    return NextResponse.json({ error: 'Not authorized to modify this invitation' }, { status: 403 });
  }

  if (invite.status !== 'pending') {
    return NextResponse.json({ error: 'Invitation already processed' }, { status: 400 });
  }

  // Update invitation status
  invite.status = action === 'accept' ? 'accepted' : 'rejected';

  if (action === 'accept') {
    // Add event to user's going events
    if (!currentUser.goingEvents) {
      currentUser.goingEvents = [];
    }
    if (!currentUser.goingEvents.includes(invite.eventId)) {
      currentUser.goingEvents.push(invite.eventId);
    }
  }

  await db.write();

  return NextResponse.json({ 
    success: true, 
    message: `Invitation ${action}ed`,
    eventId: invite.eventId,
    eventName: invite.eventName
  });
} 