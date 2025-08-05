import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import { db } from '../../../../db';

// PUT - Update member role
export async function PUT(req: NextRequest, { params }: { params: { id: string; memberId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { role } = await req.json();
    
    if (!role || !['founder', 'admin', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Valid role is required' }, { status: 400 });
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

    // Only founder and admin can change roles
    const userRole = 'role' in currentUserMember ? currentUserMember.role : 'founder'; // Default to founder for old structure
    if (userRole !== 'founder' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Only founders and admins can change roles' }, { status: 403 });
    }

    // Find the target member
    const targetMemberIndex = group.members.findIndex(member => {
      if ('userId' in member) {
        return member.userId === params.memberId;
      } else {
        return member.id === params.memberId;
      }
    });
    if (targetMemberIndex === -1) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const targetMember = group.members[targetMemberIndex];

    // Only founder can change founder role
    const targetRole = 'role' in targetMember ? targetMember.role : 'founder';
    if (targetRole === 'founder' && userRole !== 'founder') {
      return NextResponse.json({ error: 'Only founder can change founder role' }, { status: 403 });
    }

    // Founder cannot change their own role
    const targetUserId = 'userId' in targetMember ? targetMember.userId : targetMember.id;
    if (targetUserId === currentUser.id && targetRole === 'founder') {
      return NextResponse.json({ error: 'Founder cannot change their own role' }, { status: 400 });
    }

    // Update member role - only works for new structure members
    if ('userId' in db.data.groups[groupIndex].members[targetMemberIndex]) {
      (db.data.groups[groupIndex].members[targetMemberIndex] as any).role = role;
    } else {
      return NextResponse.json({ error: 'Cannot change role for legacy members' }, { status: 400 });
    }
    
    await db.write();
    return NextResponse.json({ message: 'Member role updated successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove member from group
export async function DELETE(req: NextRequest, { params }: { params: { id: string; memberId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
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

    // Only founder and admin can remove members
    const userRole = 'role' in currentUserMember ? currentUserMember.role : 'founder'; // Default to founder for old structure
    if (userRole !== 'founder' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Only founders and admins can remove members' }, { status: 403 });
    }

    // Find the target member
    const targetMemberIndex = group.members.findIndex(member => {
      if ('userId' in member) {
        return member.userId === params.memberId;
      } else {
        return member.id === params.memberId;
      }
    });
    if (targetMemberIndex === -1) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const targetMember = group.members[targetMemberIndex];

    // Only founder can remove founder
    const targetRole = 'role' in targetMember ? targetMember.role : 'founder';
    if (targetRole === 'founder' && userRole !== 'founder') {
      return NextResponse.json({ error: 'Only founder can remove founder' }, { status: 403 });
    }

    // Founder cannot remove themselves
    const targetUserId = 'userId' in targetMember ? targetMember.userId : targetMember.id;
    if (targetUserId === currentUser.id && targetRole === 'founder') {
      return NextResponse.json({ error: 'Founder cannot remove themselves' }, { status: 400 });
    }

    // Remove member from group
    db.data.groups[groupIndex].members.splice(targetMemberIndex, 1);
    
    await db.write();
    return NextResponse.json({ message: 'Member removed successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 