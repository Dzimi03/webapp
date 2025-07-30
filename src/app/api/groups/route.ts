import { NextRequest, NextResponse } from 'next/server';
import { db, User, Group } from '../db';
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
  const groups = db.data?.groups.filter((g: Group) => g.members.includes(user.id)) || [];
  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { name, memberEmails } = await req.json();
  if (!name || !Array.isArray(memberEmails)) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  const members = db.data?.users.filter((u: User) => memberEmails.includes(u.email)).map(u => u.id) || [];
  if (!members.includes(user.id)) members.push(user.id);
  const group: Group = {
    id: uuidv4(),
    name,
    members,
    events: [],
  };
  db.data?.groups.push(group);
  db.data?.users.forEach(u => {
    if (members.includes(u.id) && !u.groups.includes(group.id)) {
      u.groups.push(group.id);
    }
  });
  await db.write();
  return NextResponse.json(group);
} 