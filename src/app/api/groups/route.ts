import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { db, GroupMember } from '../db';

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

    // Get groups where the current user is a member (handle both old and new structures)
    const userGroups = db.data.groups.filter(group => 
      group.members.some(member => {
        if ('userId' in member) {
          return member.userId === currentUser.id;
        } else {
          return member.id === currentUser.id;
        }
      })
    );

    return NextResponse.json(userGroups);
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

    // Create new group with founder role
    const founderMember: GroupMember = {
      userId: currentUser.id,
      role: 'founder',
      joinedAt: new Date().toISOString()
    };

    const newGroup = {
      id: Date.now().toString(),
      name: name.trim(),
      description: description?.trim() || '',
      imageUrl: undefined,
      members: [founderMember],
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id
    };

    db.data.groups.push(newGroup);
    await db.write();

    return NextResponse.json(newGroup);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 