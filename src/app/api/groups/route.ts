import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { db } from '../db';

// Helper function to migrate group members from old structure to new
function migrateGroupMembers(members: any[]) {
  return members.map(member => {
    if ('userId' in member) {
      // Old structure with roles - find the user and return full user object
      const user = db.data.users.find(u => u.id === member.userId);
      return user || { id: member.userId, name: 'Unknown User', email: 'unknown@example.com' };
    } else {
      // Already in new structure (full user object)
      return member;
    }
  });
}

// GET - Get all groups for current user
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await db.read();
    const currentUser = db.data.users.find(u => u.email === session.user!.email);
    
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get groups where current user is a member and migrate them
    const userGroups = db.data.groups
      .filter(group => {
        // Check if current user is a member (handle both old and new structures)
        return group.members.some(member => {
          if ('userId' in member) {
            return member.userId === currentUser.id;
          } else {
            return member.id === currentUser.id;
          }
        });
      })
      .map(group => ({
        ...group,
        members: migrateGroupMembers(group.members)
      }));

    return NextResponse.json({ groups: userGroups });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, description } = await req.json();
    
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    await db.read();
    const currentUser = db.data.users.find(u => u.email === session.user!.email);
    
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create new group with current user as member
    const newGroup = {
      id: Date.now().toString(),
      name: name.trim(),
      description: description?.trim() || '',
      imageUrl: undefined,
      members: [currentUser],
      createdAt: new Date().toISOString()
    };

    db.data.groups.push(newGroup);
    await db.write();

    return NextResponse.json(newGroup);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 