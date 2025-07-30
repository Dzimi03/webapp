import { NextRequest, NextResponse } from 'next/server';
import { db, User, Event, Comment } from '../db';
import { getToken } from 'next-auth/jwt';
import { v4 as uuidv4 } from 'uuid';

async function getSessionUser(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) return null;
  await db.read();
  return db.data?.users.find((u: User) => u.email === token.email) || null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get('eventId');
  if (!eventId) {
    return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });
  }
  await db.read();
  const comments = db.data?.comments.filter((c: Comment) => c.eventId === eventId) || [];
  return NextResponse.json(comments);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { eventId, text } = await req.json();
  if (!eventId || !text) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  const event = db.data?.events.find((e: Event) => e.id === eventId);
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }
  const comment: Comment = {
    id: uuidv4(),
    eventId,
    userId: user.id,
    text,
    createdAt: new Date().toISOString(),
  };
  db.data?.comments.push(comment);
  event.comments.push(comment.id);
  await db.write();
  return NextResponse.json(comment);
} 