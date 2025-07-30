import { NextRequest, NextResponse } from 'next/server';
import { db, User, Event, Group } from '../db';
import { getToken } from 'next-auth/jwt';
import { v4 as uuidv4 } from 'uuid';

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
  const publicEvents = db.data?.events.filter((e: Event) => e.isPublic) || [];
  const privateEvents = db.data?.events.filter((e: Event) => !e.isPublic && e.participants.includes(user.id)) || [];
  return NextResponse.json([...publicEvents, ...privateEvents]);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { title, description, date, groupId, budget, participants } = await req.json();
  if (!title || !date || !groupId || !Array.isArray(participants)) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  const group = db.data?.groups.find((g: Group) => g.id === groupId);
  if (!group || !group.members.includes(user.id)) {
    return NextResponse.json({ error: 'Group not found or unauthorized' }, { status: 404 });
  }
  const event: Event = {
    id: uuidv4(),
    title,
    description: description || '',
    date,
    isPublic: false,
    groupId,
    budget: budget || 0,
    participants,
    comments: [],
  };
  db.data?.events.push(event);
  group.events.push(event.id);
  await db.write();
  return NextResponse.json(event);
} 