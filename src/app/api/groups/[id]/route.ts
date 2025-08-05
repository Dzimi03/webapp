import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { db } from '../../db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await db.read();
    const group = db.data.groups.find(g => g.id === params.id);
    
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if current user is a member of the group
    const currentUser = db.data.users.find(u => u.email === session.user!.email);
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Handle both old and new member structures
    const currentUserMember = group.members.find(member => {
      if ('userId' in member) {
        return member.userId === currentUser.id;
      } else {
        return member.id === currentUser.id;
      }
    });
    if (!currentUserMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Enrich group with user details and current user's role
    const enrichedGroup = {
      ...group,
      members: group.members.map(member => {
        // Handle both old and new member structures
        let userId: string;
        let role: string;
        let joinedAt: string;
        
        if ('userId' in member) {
          userId = member.userId;
          role = member.role;
          joinedAt = member.joinedAt;
        } else {
          userId = member.id;
          role = 'founder'; // Default to founder for old structure
          joinedAt = group.createdAt || new Date().toISOString();
        }
        
        const user = db.data.users.find(u => u.id === userId);
        
        return {
          userId: userId,
          role: role,
          joinedAt: joinedAt,
          user: user ? {
            id: user.id,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl,
            residence: user.residence
          } : null
        };
      }),
      currentUserRole: 'role' in currentUserMember ? currentUserMember.role : 'founder'
    };

    return NextResponse.json(enrichedGroup);
  } catch (error) {
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
    const groupIndex = db.data.groups.findIndex(g => g.id === params.id);
    
    if (groupIndex === -1) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const group = db.data.groups[groupIndex];
    const currentUser = db.data.users.find(u => u.email === session.user!.email);
    
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if current user is a member of the group with appropriate role
    const currentUserMember = group.members.find(member => {
      if ('userId' in member) {
        return member.userId === currentUser.id;
      } else {
        return member.id === currentUser.id;
      }
    });
    if (!currentUserMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Only founder and admin can edit group details
    const userRole = 'role' in currentUserMember ? currentUserMember.role : 'founder'; // Default to founder for old structure
    if (userRole !== 'founder' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Only founders and admins can edit group details' }, { status: 403 });
    }

    // Update group
    db.data.groups[groupIndex] = {
      ...group,
      name: name.trim(),
      description: description?.trim() || '',
    };

    await db.write();
    return NextResponse.json(db.data.groups[groupIndex]);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 