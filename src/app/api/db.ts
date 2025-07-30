import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { join } from 'path';

export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  friends: string[];
  groups: string[];
  avatarUrl?: string;
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
export const db = new Low<DB>(adapter, { users: [], groups: [], events: [], comments: [] });