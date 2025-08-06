import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { db, Notification } from '../db';

// Helper function to create notifications
export async function createNotification(userId: string, type: Notification['type'], title: string, message: string, relatedId?: string) {
  try {
    await db.read();
    
    const notification = {
      id: Date.now().toString(),
      userId,
      type,
      title,
      message,
      relatedId,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    if (!db.data.notifications) {
      db.data.notifications = [];
    }
    
    db.data.notifications.push(notification);
    await db.write();
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

// GET - Get current user's notifications
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

    // Get notifications for current user
    const notifications = db.data.notifications?.filter((notification: any) => 
      notification.userId === currentUser.id
    ) || [];

    // Sort by creation date (newest first)
    notifications.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ notifications });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Mark notification as read
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { notificationId } = await req.json();
    
    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    await db.read();
    const currentUser = db.data.users.find(u => u.email === session.user!.email);
    
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find the notification
    const notificationIndex = db.data.notifications?.findIndex((notification: any) => 
      notification.id === notificationId && notification.userId === currentUser.id
    );
    
    if (notificationIndex === -1 || notificationIndex === undefined) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Mark as read
    db.data.notifications[notificationIndex].isRead = true;
    
    await db.write();

    return NextResponse.json({ message: 'Notification marked as read' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 