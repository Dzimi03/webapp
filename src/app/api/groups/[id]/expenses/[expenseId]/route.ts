import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import { db } from '../../../../db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: groupId, expenseId } = await params;
    const body = await request.json();

    const { name, description, amount, currency, paidByUserId, splitBetweenUserIds } = body;

    // Load database
    await db.read();

    // Validate required fields
    if (!name || !amount || !paidByUserId || !splitBetweenUserIds || splitBetweenUserIds.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find the group
    const group = db.data.groups.find(g => g.id === groupId);
    
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if user is a member of the group
    const currentUser = db.data.users.find(u => u.email === session.user?.email);
    if (!currentUser || !group.members.some(member => member.id === currentUser.id)) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    // Find the expense
    const expenseIndex = db.data.expenses.findIndex(e => e.id === expenseId && e.groupId === groupId);
    if (expenseIndex === -1) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Update the expense
    db.data.expenses[expenseIndex] = {
      ...db.data.expenses[expenseIndex],
      name,
      description,
      amount: parseFloat(amount),
      currency,
      paidByUserId,
      splitBetweenUserIds
    };

    await db.write();

    return NextResponse.json({ 
      message: 'Expense updated successfully',
      expense: db.data.expenses[expenseIndex]
    });

  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: groupId, expenseId } = await params;

    // Load database
    await db.read();

    // Find the group
    const group = db.data.groups.find(g => g.id === groupId);
    
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if user is a member of the group
    const currentUser = db.data.users.find(u => u.email === session.user?.email);
    if (!currentUser || !group.members.some(member => member.id === currentUser.id)) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    // Find and remove the expense
    const expenseIndex = db.data.expenses.findIndex(e => e.id === expenseId && e.groupId === groupId);
    if (expenseIndex === -1) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const deletedExpense = db.data.expenses[expenseIndex];
    db.data.expenses.splice(expenseIndex, 1);

    await db.write();

    return NextResponse.json({ 
      message: 'Expense deleted successfully',
      deletedExpense
    });

  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 