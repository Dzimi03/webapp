import { NextRequest, NextResponse } from 'next/server';
import { db, User, Event } from '../db';
import { getToken } from 'next-auth/jwt';

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
  const event = db.data?.events.find((e: Event) => e.id === eventId);
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }
  const perPerson = event.participants.length > 0 ? event.budget / event.participants.length : 0;
  return NextResponse.json({ total: event.budget, perPerson });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { eventId, budget, participants } = await req.json();
  if (!eventId || typeof budget !== 'number' || !Array.isArray(participants)) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  const event = db.data?.events.find((e: Event) => e.id === eventId);
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }
  event.budget = budget;
  event.participants = participants;
  await db.write();
  const perPerson = participants.length > 0 ? budget / participants.length : 0;
  return NextResponse.json({ total: budget, perPerson });
} 