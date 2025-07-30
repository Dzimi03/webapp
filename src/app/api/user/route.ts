import { NextRequest, NextResponse } from 'next/server';
import { db, User } from '../db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await db.read();
  const user = db.data?.users.find((u: User) => u.email === session.user.email);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  const { password, ...userNoPass } = user;
  return NextResponse.json(userNoPass);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { name, avatarUrl } = await req.json();
  await db.read();
  const user = db.data?.users.find((u: User) => u.email === session.user.email);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  if (name) user.name = name;
  if (avatarUrl) user.avatarUrl = avatarUrl;
  await db.write();
  const { password, ...userNoPass } = user;
  return NextResponse.json(userNoPass);
} 