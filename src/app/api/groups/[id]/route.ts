import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { db } from '../../db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await db.read();
  const { id } = params;
    const group = db.data.groups.find(g => g.id === id);
    
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if current user is a member of the group
    const currentUser = db.data.users.find(u => u.email === session.user!.email);
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isMember = group.members.some(member => {
      if ('userId' in member) {
        return member.userId === currentUser.id;
      } else {
        return member.id === currentUser.id;
      }
    });
    if (!isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

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

    // Return group with migrated members
    const migratedGroup = {
      ...group,
      members: migrateGroupMembers(group.members)
    };

    return NextResponse.json(migratedGroup);
  } catch (error) {
    console.error('Error in GET /api/groups/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
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
  const { id } = params;
    const groupIndex = db.data.groups.findIndex(g => g.id === id);
    
    if (groupIndex === -1) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const group = db.data.groups[groupIndex];
    const currentUser = db.data.users.find(u => u.email === session.user!.email);
    
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if current user is a member of the group
    const isMember = group.members.some(member => {
      if ('userId' in member) {
        return member.userId === currentUser.id;
      } else {
        return member.id === currentUser.id;
      }
    });
    if (!isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update group details
    db.data.groups[groupIndex].name = name.trim();
    db.data.groups[groupIndex].description = description?.trim() || '';
    
    await db.write();

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

    // Return updated group with migrated members
    const updatedGroup = {
      ...db.data.groups[groupIndex],
      members: migrateGroupMembers(db.data.groups[groupIndex].members)
    };

    return NextResponse.json(updatedGroup);
  } catch (error) {
    console.error('Error in PUT /api/groups/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 