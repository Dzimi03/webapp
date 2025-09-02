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
  residence?: string;
  description?: string;
  likedEvents?: string[];
  goingEvents?: string[];
  likedEventDetails?: any[];
  goingEventDetails?: any[];
  sentFriendRequests?: string[];
  receivedFriendRequests?: string[];
  sentGroupInvites?: string[];
  receivedGroupInvites?: string[];
  sentEventInvites?: string[];
  receivedEventInvites?: string[];
};

export type FriendRequest = {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
};

export type GroupInvite = {
  id: string;
  fromUserId: string;
  toUserId: string;
  groupId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
};

export type EventInvite = {
  id: string;
  fromUserId: string;
  toUserId: string;
  eventId: string;
  eventName: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
};

export type Expense = {
  id: string;
  groupId: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  paidByUserId: string;
  splitBetweenUserIds: string[];
  createdAt: string;
};

export type Notification = {
  id: string;
  userId: string;
  type: 'group_invite_accepted' | 'group_invite_rejected' | 'friend_request_accepted' | 'event_invite_accepted' | 'event_invite_rejected';
  title: string;
  message: string;
  relatedId?: string; // groupId, eventId, etc.
  isRead: boolean;
  createdAt: string;
};

export type Group = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  backgroundImageUrl?: string;
  members: User[];
  createdAt: string;
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
  friendRequests: FriendRequest[];
  groupInvites: GroupInvite[];
  eventInvites: EventInvite[];
  expenses: Expense[];
  notifications: Notification[];
};

const file = join(process.cwd(), 'src', 'app', 'api', 'db.json');
const adapter = new JSONFile<DB>(file);
export const db = new Low<DB>(adapter, { users: [], groups: [], events: [], comments: [], friendRequests: [], groupInvites: [], eventInvites: [], expenses: [], notifications: [] });

// In serverless (e.g. Vercel) the filesystem is read-only; writing causes EROFS errors.
// Quick workaround: turn db.write() into a no-op so API routes don't hang or throw.
// NOTE: Data mutations will NOT persist between requests/deploys. Migrate to a real DB soon.
if (process.env.VERCEL) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore override for convenience
  db.write = (async () => { /* no-op on Vercel (read-only FS) */ }) as any;
}