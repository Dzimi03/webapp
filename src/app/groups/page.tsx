"use client";
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function GroupsPage() {
  const { data: session } = useSession();
  const [groups, setGroups] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [memberEmails, setMemberEmails] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function fetchGroups() {
    const res = await fetch('/api/groups');
    if (res.ok) {
      setGroups(await res.json());
    }
  }

  useEffect(() => {
    fetchGroups();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    const emails = memberEmails.split(',').map(e => e.trim()).filter(Boolean);
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, memberEmails: emails }),
    });
    if (res.ok) {
      setSuccess('Group created!');
      setName('');
      setMemberEmails('');
      fetchGroups();
    } else {
      const data = await res.json();
      setError(data.error || 'Error creating group');
    }
  }

  if (!session) return <div className="mt-10 text-center">Please log in to manage groups.</div>;

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow text-gray-900">
      <h1 className="text-2xl font-bold mb-4">Groups</h1>
      <form onSubmit={handleCreate} className="flex flex-col gap-2 mb-4">
        <input
          type="text"
          placeholder="Group name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="border px-3 py-2 rounded text-gray-900"
          required
        />
        <input
          type="text"
          placeholder="Member emails (comma separated)"
          value={memberEmails}
          onChange={e => setMemberEmails(e.target.value)}
          className="border px-3 py-2 rounded text-gray-900"
        />
        <button type="submit" className="bg-blue-600 text-white py-2 rounded">Create Group</button>
      </form>
      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
      {success && <div className="text-green-600 text-sm mb-2">{success}</div>}
      <ul className="divide-y">
        {groups.map(group => (
          <li key={group.id} className="py-2">
            <div className="font-semibold text-gray-900">{group.name}</div>
            <div className="text-sm text-gray-800">Members: {group.members.length}</div>
          </li>
        ))}
      </ul>
    </div>
  );
} 