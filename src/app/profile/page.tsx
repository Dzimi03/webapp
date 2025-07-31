"use client";
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function ProfilePage() {
  const { data: session } = useSession();
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [message, setMessage] = useState('');
  const [likedEventDetails, setLikedEventDetails] = useState<any[]>([]);
  const [goingEventDetails, setGoingEventDetails] = useState<any[]>([]);

  useEffect(() => {
    async function fetchUser() {
      const res = await fetch('/api/user');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setName(data.name);
        setAvatarUrl(data.avatarUrl || '');
        
        // Load liked and going events from user data
        if (data.likedEventDetails) setLikedEventDetails(data.likedEventDetails);
        if (data.goingEventDetails) setGoingEventDetails(data.goingEventDetails);
      }
    }
    fetchUser();
  }, []);



  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    const res = await fetch('/api/user', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, avatarUrl }),
    });
    if (res.ok) {
      setMessage('Profile updated!');
    } else {
      setMessage('Error updating profile');
    }
  }

  if (!session) return <div className="mt-10 text-center">Please log in to view your profile.</div>;

  return (
    <div className="w-full px-6 py-10">
      {/* Profile Form */}
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6 mb-8 border border-gray-200">
        <h1 className="text-2xl font-bold mb-4 text-gray-900">Profile</h1>
        {user && (
          <form onSubmit={handleSave} className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <img src={avatarUrl || '/default-avatar.png'} alt="avatar" className="w-16 h-16 rounded-full border" />
              <div>
                <div className="font-semibold text-gray-900">{user.email}</div>
              </div>
            </div>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="border border-gray-300 px-3 py-2 rounded text-gray-900 focus:border-blue-500 focus:outline-none transition-colors"
              required
            />
            <input
              type="text"
              value={avatarUrl}
              onChange={e => setAvatarUrl(e.target.value)}
              className="border border-gray-300 px-3 py-2 rounded text-gray-900 focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="Avatar URL"
            />
            <button type="submit" className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors">Save</button>
            {message && <div className="text-green-600 text-sm">{message}</div>}
          </form>
        )}
      </div>

      {/* Liked Events Section */}
      {likedEventDetails.length > 0 && (
        <div className="max-w-7xl mx-auto mb-8">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">Events You Liked</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {likedEventDetails.map((event: any) => (
              <div key={event.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 border border-gray-200">
                {event.images?.[0]?.url && (
                  <div className="h-48 overflow-hidden">
                    <img 
                      src={event.images[0].url} 
                      alt={event.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-900 mb-3 line-clamp-2">{event.name}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-gray-700">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {event.dates?.start?.localDate} {event.dates?.start?.localTime}
                    </div>
                    {event._embedded?.venues?.[0]?.name && (
                      <div className="flex items-center text-gray-700">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {event._embedded.venues[0].name}
                      </div>
                    )}
                    {event.priceRanges?.[0] && (
                      <div className="flex items-center text-gray-700">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                        {event.priceRanges[0].currency} {event.priceRanges[0].min} - {event.priceRanges[0].max}
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center text-blue-600 hover:text-blue-800 font-medium transition-colors text-sm"
                    >
                      View on Ticketmaster
                      <svg className="w-4 h-4 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Going Events Section */}
      {goingEventDetails.length > 0 && (
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">Events You're Going To</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {goingEventDetails.map((event: any) => (
              <div key={event.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 border border-gray-200">
                {event.images?.[0]?.url && (
                  <div className="h-48 overflow-hidden">
                    <img 
                      src={event.images[0].url} 
                      alt={event.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-900 mb-3 line-clamp-2">{event.name}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-gray-700">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {event.dates?.start?.localDate} {event.dates?.start?.localTime}
                    </div>
                    {event._embedded?.venues?.[0]?.name && (
                      <div className="flex items-center text-gray-700">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {event._embedded.venues[0].name}
                      </div>
                    )}
                    {event.priceRanges?.[0] && (
                      <div className="flex items-center text-gray-700">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                        {event.priceRanges[0].currency} {event.priceRanges[0].min} - {event.priceRanges[0].max}
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center text-blue-600 hover:text-blue-800 font-medium transition-colors text-sm"
                    >
                      View on Ticketmaster
                      <svg className="w-4 h-4 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Show message if no events */}
      {likedEventDetails.length === 0 && goingEventDetails.length === 0 && (
        <div className="max-w-4xl mx-auto text-center text-gray-600">
          <p>You haven't liked or marked any events as "going" yet.</p>
          <p className="mt-2">Visit the Events page to discover and interact with events!</p>
        </div>
      )}
    </div>
  );
} 