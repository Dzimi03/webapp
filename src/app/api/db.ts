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

// Legacy member structure (old format)
export type LegacyGroupMember = {
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
};

// New member structure
export type GroupMember = {
  userId: string;
  role: 'founder' | 'admin' | 'member';
  joinedAt: string;
};

// Union type to handle both old and new structures
export type GroupMemberUnion = GroupMember | LegacyGroupMember;

export type Group = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  members: GroupMemberUnion[];
  createdAt: string;
  createdBy?: string; // ID of the founder (optional for backward compatibility)
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
};

const file = join(process.cwd(), 'src', 'app', 'api', 'db.json');
const adapter = new JSONFile<DB>(file);
export const db = new Low<DB>(adapter, { users: [], groups: [], events: [], comments: [], friendRequests: [], groupInvites: [] });