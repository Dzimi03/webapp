"use client";
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function FriendsPage() {
  const { data: session } = useSession();
  const [friends, setFriends] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function fetchFriends() {
    const res = await fetch('/api/friends');
    if (res.ok) {
      setFriends(await res.json());
    }
  }

  useEffect(() => {
    fetchFriends();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    const res = await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      setSuccess('Friend added!');
      setEmail('');
      fetchFriends();
    } else {
      const data = await res.json();
      setError(data.error || 'Error adding friend');
    }
  }

  async function handleRemove(id: string) {
    setError('');
    setSuccess('');
    const res = await fetch('/api/friends', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setSuccess('Friend removed');
      fetchFriends();
    } else {
      setError('Error removing friend');
    }
  }

  if (!session) return <div className="mt-10 text-center">Please log in to manage friends.</div>;

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow text-gray-900">
      <h1 className="text-2xl font-bold mb-4">Friends</h1>
      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <input
          type="email"
          placeholder="Friend's email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="border px-3 py-2 rounded flex-1 text-gray-900"
          required
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Add</button>
      </form>
      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
      {success && <div className="text-green-600 text-sm mb-2">{success}</div>}
      <ul className="divide-y">
        {friends.map(friend => (
          <li key={friend.id} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <img src={friend.avatarUrl || '/default-avatar.png'} alt="avatar" className="w-8 h-8 rounded-full border" />
              <span className="text-gray-900">{friend.name} ({friend.email})</span>
            </div>
            <button onClick={() => handleRemove(friend.id)} className="text-red-500 hover:underline text-sm">Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
} 