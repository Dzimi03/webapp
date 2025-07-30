import { NextRequest, NextResponse } from 'next/server';
import { db, User } from '../db';
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
  const friends = db.data?.users.filter((u: User) => user.friends.includes(u.id)).map(({ password, ...rest }) => rest) || [];
  return NextResponse.json(friends);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { email } = await req.json();
  const friend = db.data?.users.find((u: User) => u.email === email);
  if (!friend) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  if (user.friends.includes(friend.id)) {
    return NextResponse.json({ error: 'Already friends' }, { status: 400 });
  }
  user.friends.push(friend.id);
  friend.friends.push(user.id);
  await db.write();
  const { password, ...friendNoPass } = friend;
  return NextResponse.json(friendNoPass);
}

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