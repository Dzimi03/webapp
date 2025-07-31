import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

// Types
export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  friends: string[];
  groups: string[];
  avatarUrl?: string;
  likedEvents?: string[];
  goingEvents?: string[];
  likedEventDetails?: any[];
  goingEventDetails?: any[];
};
export type Group = {
  id: string;
  name: string;
  members: string[];
  events: string[];
};
export type Event = {
  id: string;
  title: string;
  description: string;
  date: string;
  isPublic: boolean;
  groupId?: string;
  budget: number;
  participants: string[];
  comments: string[];
};
export type Comment = {
  id: string;
  eventId: string;
  userId: string;
  text: string;
  createdAt: string;
};
export type DB = {
  users: User[];
  groups: Group[];
  events: Event[];
  comments: Comment[];
};

const file = join(process.cwd(), 'src', 'app', 'api', 'db.json');
const adapter = new JSONFile<DB>(file);
const db = new Low<DB>(adapter, { users: [], groups: [], events: [], comments: [] });

async function seed() {
  await db.read();
  db.data ||= { users: [], groups: [], events: [], comments: [] };

  // Users
  const password = await bcrypt.hash('password', 10);
  const user1: User = {
    id: uuidv4(),
    name: 'Alice',
    email: 'alice@example.com',
    password,
    friends: [],
    groups: [],
    avatarUrl: '',
    likedEvents: [],
    goingEvents: [],
    likedEventDetails: [],
    goingEventDetails: [],
  };
  const user2: User = {
    id: uuidv4(),
    name: 'Bob',
    email: 'bob@example.com',
    password,
    friends: [],
    groups: [],
    avatarUrl: '',
    likedEvents: [],
    goingEvents: [],
    likedEventDetails: [],
    goingEventDetails: [],
  };
  const user3: User = {
    id: uuidv4(),
    name: 'Charlie',
    email: 'charlie@example.com',
    password,
    friends: [],
    groups: [],
    avatarUrl: '',
    likedEvents: [],
    goingEvents: [],
    likedEventDetails: [],
    goingEventDetails: [],
  };
  user1.friends = [user2.id, user3.id];
  user2.friends = [user1.id];
  user3.friends = [user1.id];

  // Groups
  const group1: Group = {
    id: uuidv4(),
    name: 'Best Friends',
    members: [user1.id, user2.id, user3.id],
    events: [],
  };
  user1.groups = [group1.id];
  user2.groups = [group1.id];
  user3.groups = [group1.id];

  // Events
  const event1: Event = {
    id: uuidv4(),
    title: 'Public Concert',
    description: 'A fun public concert!',
    date: new Date(Date.now() + 86400000).toISOString(),
    isPublic: true,
    budget: 0,
    participants: [],
    comments: [],
  };
  const event2: Event = {
    id: uuidv4(),
    title: 'Private Dinner',
    description: 'Dinner with friends',
    date: new Date(Date.now() + 172800000).toISOString(),
    isPublic: false,
    groupId: group1.id,
    budget: 120,
    participants: [user1.id, user2.id, user3.id],
    comments: [],
  };
  group1.events = [event2.id];

  // Comments
  const comment1: Comment = {
    id: uuidv4(),
    eventId: event2.id,
    userId: user1.id,
    text: 'Looking forward to it!',
    createdAt: new Date().toISOString(),
  };
  event2.comments = [comment1.id];

  db.data.users = [user1, user2, user3];
  db.data.groups = [group1];
  db.data.events = [event1, event2];
  db.data.comments = [comment1];

  await db.write();
  console.log('Database seeded!');
}

seed(); 