import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import { db } from '../../../../db';

// GET - Get expense balance for a group
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
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

    // Calculate balance for each user
    const balanceMap = new Map<string, { user: any; balance: number; currency: string }>();

    // Initialize balance for all group members
    group.members.forEach(member => {
      const userId = 'userId' in member ? member.userId : member.id;
      const user = db.data.users.find(u => u.id === userId);
      if (user) {
        balanceMap.set(userId, {
          user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl },
          balance: 0,
          currency: 'PLN' // Default currency, you might want to make this dynamic
        });
      }
    });

    // Calculate balances based on expenses
    expenses.forEach((expense: any) => {
      const paidByUserId = expense.paidByUserId;
      const amount = expense.amount;
      const splitCount = expense.splitBetweenUserIds.length;
      const amountPerPerson = amount / splitCount;

      // Add the full amount to the person who paid
      if (balanceMap.has(paidByUserId)) {
        const currentBalance = balanceMap.get(paidByUserId)!;
        currentBalance.balance += amount;
        currentBalance.currency = expense.currency;
      }

      // Subtract the split amount from each person who should pay
      expense.splitBetweenUserIds.forEach((userId: string) => {
        if (balanceMap.has(userId)) {
          const currentBalance = balanceMap.get(userId)!;
          currentBalance.balance -= amountPerPerson;
          currentBalance.currency = expense.currency;
        }
      });
    });

    // Convert map to array
    const balanceArray = Array.from(balanceMap.values());

    return NextResponse.json({ balance: balanceArray });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 