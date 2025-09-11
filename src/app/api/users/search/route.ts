import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import { db } from '../../db';

// GET /api/users/search?q=term
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim().toLowerCase();
  if (q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  try {
    await db.read();
    const currentUser = db.data.users.find(u => u.email === session.user!.email);
    if (!currentUser) {
      return NextResponse.json({ users: [] });
    }

    // Build helper sets for friend / request state
    const friendIds = new Set(currentUser.friends || []);
    const pendingSent = new Set(currentUser.sentFriendRequests || []); // these are request IDs; need map to user
    const pendingReceived = new Set(currentUser.receivedFriendRequests || []);

    // We need to resolve pending request target users.
    const friendRequests = db.data.friendRequests || [];
    const pendingToUserId = new Set<string>();
    const pendingFromUserId = new Set<string>();
    for (const fr of friendRequests) {
      if (fr.status === 'pending') {
        if (fr.fromUserId === currentUser.id) pendingToUserId.add(fr.toUserId);
        if (fr.toUserId === currentUser.id) pendingFromUserId.add(fr.fromUserId);
      }
    }

    const results = db.data.users
      .filter(u => u.id !== currentUser.id) // exclude self
      .filter(u => u.name?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      .slice(0, 25)
      .map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatarUrl,
        residence: u.residence,
        description: u.description,
        isFriend: friendIds.has(u.id),
        hasPendingRequest: pendingToUserId.has(u.id) || pendingFromUserId.has(u.id),
      }));

    return NextResponse.json({ users: results });
  } catch (e) {
    console.error('User search error', e);
    return NextResponse.json({ users: [] });
  }
}
