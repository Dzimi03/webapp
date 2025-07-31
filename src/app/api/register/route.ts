import { NextRequest, NextResponse } from 'next/server';
import { db, User } from '../db';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json();
  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  await db.read();
  if (db.data?.users.find((u: User) => u.email === email)) {
    return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
  }
  const hashed = await bcrypt.hash(password, 10);
  const user: User = {
    id: uuidv4(),
    name,
    email,
    password: hashed,
    friends: [],
    groups: [],
    avatarUrl: '',
    likedEvents: [],
    goingEvents: [],
    likedEventDetails: [],
    goingEventDetails: [],
  };
  db.data?.users.push(user);
  await db.write();
  const { password: _, ...userNoPass } = user;
  return NextResponse.json(userNoPass);
} 