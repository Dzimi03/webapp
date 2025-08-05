import { NextRequest, NextResponse } from 'next/server';
import { db, User } from '../db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await db.read();
  if (!session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userEmail = session.user?.email;
  const user = db.data?.users.find((u: User) => u.email === userEmail);
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
  const { name, avatarUrl, residence, description, likedEvents, goingEvents, likedEventDetails, goingEventDetails } = await req.json();
  await db.read();
  if (!session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userEmail = session.user.email;
  const user = db.data?.users.find((u: User) => u.email === userEmail);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  if (name) user.name = name;
  if (avatarUrl) user.avatarUrl = avatarUrl;
  if (residence !== undefined) user.residence = residence;
  if (description !== undefined) user.description = description;
  if (likedEvents !== undefined) user.likedEvents = likedEvents;
  if (goingEvents !== undefined) user.goingEvents = goingEvents;
  if (likedEventDetails !== undefined) user.likedEventDetails = likedEventDetails;
  if (goingEventDetails !== undefined) user.goingEventDetails = goingEventDetails;
  await db.write();
  const { password, ...userNoPass } = user;
  return NextResponse.json(userNoPass);
} 