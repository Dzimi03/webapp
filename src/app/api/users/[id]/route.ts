import { NextRequest, NextResponse } from 'next/server';
import { db, User } from '../../db';
import { getToken } from 'next-auth/jwt';

async function getSessionUser(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) return null;
  await db.read();
  return db.data?.users.find((u: User) => u.email === token.email) || null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const currentUser = await getSessionUser(req);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = params.id;
  
  // Find the target user
  const targetUser = db.data?.users.find((u: User) => u.id === userId);
  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Check if they are friends
  const isFriend = currentUser.friends?.includes(targetUser.id) || false;
  
  // Check if there's a pending friend request
  const hasPendingRequest = db.data?.friendRequests?.some((req: any) => 
    ((req.fromUserId === currentUser.id && req.toUserId === targetUser.id) ||
     (req.fromUserId === targetUser.id && req.toUserId === currentUser.id)) &&
    req.status === 'pending'
  ) || false;

  // Return user data without password and with friend status
  const { password, ...userData } = targetUser;
  
  return NextResponse.json({
    ...userData,
    isFriend,
    hasPendingRequest
  });
} 