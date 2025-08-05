import { NextRequest, NextResponse } from 'next/server';
import { db, User } from '../../db';
import { getToken } from 'next-auth/jwt';

async function getSessionUser(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) return null;
  await db.read();
  return db.data?.users.find((u: User) => u.email === token.email) || null;
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ users: [] });
  }

  const searchTerm = query.toLowerCase().trim();
  
  // Search users by name (excluding current user)
  const matchingUsers = db.data?.users
    .filter((u: User) => 
      u.id !== user.id && 
      u.name.toLowerCase().includes(searchTerm)
    )
    .map(({ password, ...rest }) => ({
      ...rest,
      isFriend: user.friends.includes(rest.id),
      hasPendingRequest: db.data?.friendRequests?.some((req: any) => 
        ((req.fromUserId === user.id && req.toUserId === rest.id) ||
         (req.fromUserId === rest.id && req.toUserId === user.id)) &&
        req.status === 'pending'
      ) || false
    }))
    .slice(0, 10) || []; // Limit to 10 results

  return NextResponse.json({ users: matchingUsers });
} 