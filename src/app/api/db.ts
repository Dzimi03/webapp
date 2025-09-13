import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { join } from 'path';
import { Redis } from '@upstash/redis';

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

const initialData: DB = { users: [], groups: [], events: [], comments: [], friendRequests: [], groupInvites: [], eventInvites: [], expenses: [], notifications: [] };

// Local dev still uses JSON file for convenience.
const file = join(process.cwd(), 'src', 'app', 'api', 'db.json');
const adapter = new JSONFile<DB>(file);
export const db = new Low<DB>(adapter, initialData);

// If Redis credentials are present, override read/write with Redis persistence.
// This works both locally (with env vars) and on Vercel.
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  const KEY = 'liveapp:db:v1';

  // Always fetch fresh state from Redis to avoid stale data across lambdas
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore override
  db.read = async () => {
    try {
      const stored = await redis.get<DB>(KEY);
      if (stored) {
        db.data = stored;
      } else {
        db.data = initialData;
        await redis.set(KEY, initialData);
      }
    } catch (e) {
      if (!db.data) db.data = initialData;
      // eslint-disable-next-line no-console
      console.error('Redis read error', e);
    }
  };

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore override
  db.write = async () => {
    try {
      if (!db.data) db.data = initialData;
      await redis.set(KEY, db.data);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Redis write error', e);
    }
  };
}