import { NextRequest, NextResponse } from 'next/server';
import { db, User } from '../../db';
import { getToken } from 'next-auth/jwt';

async function getSessionUser(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) return null;
  await db.read();
  return db.data?.users.find((u: User) => u.email === token.email) || null;
}

// GET - Get user's friend requests
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const receivedRequests = db.data?.friendRequests
    ?.filter((req: any) => req.toUserId === user.id && req.status === 'pending')
    .map((req: any) => {
      const fromUser = db.data?.users.find((u: User) => u.id === req.fromUserId);
      return {
        ...req,
        fromUser: fromUser ? { id: fromUser.id, name: fromUser.name, email: fromUser.email, avatarUrl: fromUser.avatarUrl } : null
      };
    }) || [];

  return NextResponse.json({ requests: receivedRequests });
}

// POST - Accept friend request
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { requestId } = await req.json();
  
  const friendRequest = db.data?.friendRequests?.find((req: any) => req.id === requestId);
  if (!friendRequest) {
    return NextResponse.json({ error: 'Friend request not found' }, { status: 404 });
  }

  if (friendRequest.toUserId !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (friendRequest.status !== 'pending') {
    return NextResponse.json({ error: 'Request already processed' }, { status: 400 });
  }

  // Update request status
  friendRequest.status = 'accepted';

  // Add each user to the other's friends list
  const fromUser = db.data?.users.find((u: User) => u.id === friendRequest.fromUserId);
  if (fromUser) {
    if (!fromUser.friends) fromUser.friends = [];
    if (!user.friends) user.friends = [];
    
    if (!fromUser.friends.includes(user.id)) {
      fromUser.friends.push(user.id);
    }
    if (!user.friends.includes(fromUser.id)) {
      user.friends.push(fromUser.id);
    }
  }

  await db.write();

  return NextResponse.json({ 
    success: true, 
    message: 'Friend request accepted' 
  });
}

// DELETE - Reject friend request
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { requestId } = await req.json();
  
  const friendRequest = db.data?.friendRequests?.find((req: any) => req.id === requestId);
  if (!friendRequest) {
    return NextResponse.json({ error: 'Friend request not found' }, { status: 404 });
  }

  if (friendRequest.toUserId !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (friendRequest.status !== 'pending') {
    return NextResponse.json({ error: 'Request already processed' }, { status: 400 });
  }

  // Update request status
  friendRequest.status = 'rejected';

  await db.write();

  return NextResponse.json({ 
    success: true, 
    message: 'Friend request rejected' 
  });
} 