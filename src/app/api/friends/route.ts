import { NextRequest, NextResponse } from 'next/server';
import { db, User } from '../db';
import { getToken } from 'next-auth/jwt';

async function getSessionUser(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) return null;
  await db.read();
  return db.data?.users.find((u: User) => u.email === token.email) || null;
}

// GET - Get current user's friends
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const friends = db.data?.users.filter((u: User) => user.friends.includes(u.id)).map(({ password, ...rest }) => rest) || [];
  console.log('API /friends - User:', user.email, 'Friends count:', friends.length, 'Friends:', friends.map(f => f.name));
  return NextResponse.json(friends);
}

// POST - Send friend request
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { targetUserId } = await req.json();
  
  // Check if target user exists
  const targetUser = db.data?.users.find((u: User) => u.id === targetUserId);
  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  
  // Check if already friends
  if (user.friends.includes(targetUserId)) {
    return NextResponse.json({ error: 'Already friends' }, { status: 400 });
  }
  
  // Check if request already exists
  const existingRequest = db.data?.friendRequests?.find(
    (req: any) => 
      (req.fromUserId === user.id && req.toUserId === targetUserId && req.status === 'pending') ||
      (req.fromUserId === targetUserId && req.toUserId === user.id && req.status === 'pending')
  );
  
  if (existingRequest) {
    return NextResponse.json({ error: 'Friend request already sent' }, { status: 400 });
  }
  
  // Create friend request
  const friendRequest = {
    id: `fr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    fromUserId: user.id,
    toUserId: targetUserId,
    status: 'pending' as const,
    createdAt: new Date().toISOString()
  };
  
  if (!db.data?.friendRequests) {
    db.data!.friendRequests = [];
  }
  
  db.data!.friendRequests.push(friendRequest);
  
  // Update user's sent requests
  if (!user.sentFriendRequests) {
    user.sentFriendRequests = [];
  }
  user.sentFriendRequests.push(friendRequest.id);
  
  // Update target user's received requests
  if (!targetUser.receivedFriendRequests) {
    targetUser.receivedFriendRequests = [];
  }
  targetUser.receivedFriendRequests.push(friendRequest.id);
  
  await db.write();
  
  return NextResponse.json({ 
    success: true, 
    message: 'Friend request sent',
    requestId: friendRequest.id 
  });
}

// DELETE - Remove friend
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { id } = await req.json();
  const friend = db.data?.users.find((u: User) => u.id === id);
  if (!friend) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  
  user.friends = user.friends.filter(fid => fid !== friend.id);
  friend.friends = friend.friends.filter(fid => fid !== user.id);
  await db.write();
  
  return NextResponse.json({ success: true });
} 