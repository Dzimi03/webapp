import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/authOptions';
import { db } from '../../../db';

// GET - Get all expenses for a group
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
  const { id } = params;
    await db.read();
    const currentUser = db.data.users.find(u => u.email === session.user!.email);
    
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is a member of the group
    const group = db.data.groups.find(g => g.id === id);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
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

    // Get all expenses for this group
    const expenses = db.data.expenses?.filter((expense: any) => expense.groupId === id) || [];

    // Enrich expenses with user details
    const enrichedExpenses = expenses.map((expense: any) => {
      const paidByUser = db.data.users.find(u => u.id === expense.paidByUserId);
      const splitBetweenUsers = expense.splitBetweenUserIds.map((userId: string) => 
        db.data.users.find(u => u.id === userId)
      ).filter(Boolean);

      return {
        ...expense,
        paidByUser: paidByUser ? { id: paidByUser.id, name: paidByUser.name, email: paidByUser.email, avatarUrl: paidByUser.avatarUrl } : null,
        splitBetweenUsers: splitBetweenUsers.map((user: any) => ({ id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl }))
      };
    });

    return NextResponse.json({ expenses: enrichedExpenses });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new expense
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
  const { id } = params;
    const { name, description, amount, currency, paidByUserId, splitBetweenUserIds } = await req.json();
    
    if (!name || !amount || !currency || !paidByUserId || !splitBetweenUserIds || splitBetweenUserIds.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await db.read();
    const currentUser = db.data.users.find(u => u.email === session.user!.email);
    
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is a member of the group
    const group = db.data.groups.find(g => g.id === id);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
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

    // Validate that paidByUserId and splitBetweenUserIds are members of the group
    const groupMemberIds = group.members.map(member => {
      if ('userId' in member) {
        return member.userId;
      } else {
        return member.id;
      }
    });

    if (!groupMemberIds.includes(paidByUserId)) {
      return NextResponse.json({ error: 'Paid by user is not a member of the group' }, { status: 400 });
    }

    const invalidSplitUsers = splitBetweenUserIds.filter((userId: string) => !groupMemberIds.includes(userId));
    if (invalidSplitUsers.length > 0) {
      return NextResponse.json({ error: 'Some split users are not members of the group' }, { status: 400 });
    }

    // Create new expense
    const newExpense = {
      id: Date.now().toString(),
      groupId: id,
      name,
      description,
      amount: parseFloat(amount),
      currency,
      paidByUserId,
      splitBetweenUserIds,
      createdAt: new Date().toISOString()
    };

    if (!db.data.expenses) {
      db.data.expenses = [];
    }
    
    db.data.expenses.push(newExpense);
    await db.write();

    return NextResponse.json({ message: 'Expense created successfully', expense: newExpense });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 