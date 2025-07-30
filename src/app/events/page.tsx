"use client";
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

// To use the Ticketmaster API, create a .env.local file in the webapp directory and add:
// NEXT_PUBLIC_TICKETMASTER_API_KEY=your_ticketmaster_api_key_here

export default function EventsPage() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [groupId, setGroupId] = useState('');
  const [budget, setBudget] = useState('');
  const [participants, setParticipants] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tmEvents, setTmEvents] = useState<any[]>([]);
  const [tmLoading, setTmLoading] = useState(false);
  const [tmError, setTmError] = useState('');
  const [likedEvents, setLikedEvents] = useState<string[]>([]);
  const [goingEvents, setGoingEvents] = useState<string[]>([]);
  const [likedEventDetails, setLikedEventDetails] = useState<any[]>([]);
  const [goingEventDetails, setGoingEventDetails] = useState<any[]>([]);

  // Load liked and going events from localStorage
  useEffect(() => {
    const savedLiked = localStorage.getItem('likedEventDetails');
    const savedGoing = localStorage.getItem('goingEventDetails');
    if (savedLiked) setLikedEventDetails(JSON.parse(savedLiked));
    if (savedGoing) setGoingEventDetails(JSON.parse(savedGoing));
    
    // Also load the IDs for button states
    const savedLikedIds = localStorage.getItem('likedEvents');
    const savedGoingIds = localStorage.getItem('goingEvents');
    if (savedLikedIds) setLikedEvents(JSON.parse(savedLikedIds));
    if (savedGoingIds) setGoingEvents(JSON.parse(savedGoingIds));
  }, []);

  // Save liked and going events to localStorage
  useEffect(() => {
    localStorage.setItem('likedEvents', JSON.stringify(likedEvents));
  }, [likedEvents]);

  useEffect(() => {
    localStorage.setItem('goingEvents', JSON.stringify(goingEvents));
  }, [goingEvents]);

  const handleLikeEvent = (eventId: string, eventDetails: any) => {
    setLikedEvents(prev => {
      const newLiked = prev.includes(eventId) 
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId];
      return newLiked;
    });

    setLikedEventDetails(prev => {
      const isAlreadyLiked = prev.some(event => event.id === eventId);
      if (isAlreadyLiked) {
        return prev.filter(event => event.id !== eventId);
      } else {
        return [...prev, eventDetails];
      }
    });
  };

  const handleGoingEvent = (eventId: string, eventDetails: any) => {
    setGoingEvents(prev => {
      const newGoing = prev.includes(eventId) 
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId];
      return newGoing;
    });

    setGoingEventDetails(prev => {
      const isAlreadyGoing = prev.some(event => event.id === eventId);
      if (isAlreadyGoing) {
        return prev.filter(event => event.id !== eventId);
      } else {
        return [...prev, eventDetails];
      }
    });
  };

  // Save event details to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('likedEventDetails', JSON.stringify(likedEventDetails));
  }, [likedEventDetails]);

  useEffect(() => {
    localStorage.setItem('goingEventDetails', JSON.stringify(goingEventDetails));
  }, [goingEventDetails]);

  async function fetchEvents() {
    const res = await fetch('/api/events');
    if (res.ok) {
      setEvents(await res.json());
    }
  }
  async function fetchGroups() {
    const res = await fetch('/api/groups');
    if (res.ok) {
      setGroups(await res.json());
    }
  }

  // Fetch Ticketmaster events for a default area (e.g., Poland)
  useEffect(() => {
    async function fetchTicketmasterEvents() {
      setTmLoading(true);
      setTmError('');
      try {
        const apiKey = process.env.NEXT_PUBLIC_TICKETMASTER_API_KEY;
        if (!apiKey) {
          setTmError('Ticketmaster API key not set.');
          setTmLoading(false);
          return;
        }
        const res = await fetch(
          `https://app.ticketmaster.com/discovery/v2/events.json?countryCode=PL&size=30&apikey=${apiKey}`
        );
        if (!res.ok) throw new Error('Failed to fetch Ticketmaster events');
        const data = await res.json();
        setTmEvents(data._embedded?.events || []);
      } catch (err: any) {
        setTmError(err.message || 'Error fetching Ticketmaster events');
      } finally {
        setTmLoading(false);
      }
    }
    fetchTicketmasterEvents();
    fetchEvents();
    fetchGroups();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    const partArr = participants.split(',').map(e => e.trim()).filter(Boolean);
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, date, groupId, budget: Number(budget), participants: partArr }),
    });
    if (res.ok) {
      setSuccess('Event created!');
      setTitle('');
      setDescription('');
      setDate('');
      setGroupId('');
      setBudget('');
      setParticipants('');
      fetchEvents();
    } else {
      const data = await res.json();
      setError(data.error || 'Error creating event');
    }
  }

  if (!session) return <div className="mt-10 text-center">Please log in to view events.</div>;

  return (
    <div className="w-full px-6 py-10">
      {/* Create Event Form - At the top */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border border-gray-200 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Create Your Event</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input 
            type="text" 
            placeholder="Title" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            className="border border-gray-300 px-3 py-2 rounded text-gray-900 focus:border-blue-500 focus:outline-none transition-colors" 
            required 
          />
          <textarea 
            placeholder="Description" 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            className="border border-gray-300 px-3 py-2 rounded text-gray-900 focus:border-blue-500 focus:outline-none transition-colors md:col-span-2" 
          />
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)} 
            className="border border-gray-300 px-3 py-2 rounded text-gray-900 focus:border-blue-500 focus:outline-none transition-colors" 
            required 
          />
          <select 
            value={groupId} 
            onChange={e => setGroupId(e.target.value)} 
            className="border border-gray-300 px-3 py-2 rounded text-gray-900 focus:border-blue-500 focus:outline-none transition-colors" 
            required
          >
            <option value="">Select group</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <input 
            type="number" 
            placeholder="Budget" 
            value={budget} 
            onChange={e => setBudget(e.target.value)} 
            className="border border-gray-300 px-3 py-2 rounded text-gray-900 focus:border-blue-500 focus:outline-none transition-colors" 
          />
          <input 
            type="text" 
            placeholder="Participant IDs (comma separated)" 
            value={participants} 
            onChange={e => setParticipants(e.target.value)} 
            className="border border-gray-300 px-3 py-2 rounded text-gray-900 focus:border-blue-500 focus:outline-none transition-colors" 
          />
          <button 
            type="submit" 
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors font-semibold md:col-span-2"
          >
            Create Event
          </button>
        </form>
        {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
        {success && <div className="text-green-600 text-sm mt-2">{success}</div>}
      </div>

      {/* Events List - Full Width Grid */}
      <div className="space-y-8">
        {/* Ticketmaster Events */}
        <div>
          <h2 className="text-2xl font-bold mb-6 text-gray-900">Events in Your Area (Ticketmaster)</h2>
          {tmLoading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading events...</span>
            </div>
          )}
          {tmError && <div className="text-red-500 bg-red-50 p-4 rounded-lg">{tmError}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {tmEvents.map((event: any) => (
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
                    {event.classifications?.[0]?.segment?.name && (
                      <div className="flex items-center text-gray-700">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
                        </svg>
                        {event.classifications[0].segment.name}
                      </div>
                    )}
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLikeEvent(event.id, event)}
                        className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                          likedEvents.includes(event.id)
                            ? 'bg-red-100 text-red-700 border border-red-300'
                            : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        <svg className="w-4 h-4" fill={likedEvents.includes(event.id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        {likedEvents.includes(event.id) ? 'Liked' : 'Like'}
                      </button>
                      <button
                        onClick={() => handleGoingEvent(event.id, event)}
                        className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                          goingEvents.includes(event.id)
                            ? 'bg-green-100 text-green-700 border border-green-300'
                            : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {goingEvents.includes(event.id) ? 'Going!' : 'Going'}
                      </button>
                    </div>
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

        {/* User Created Events */}
        <div>
          <h2 className="text-2xl font-bold mb-6 text-gray-900">Your Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {events.map(event => (
              <div key={event.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 border border-gray-200">
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-900 mb-3">{event.title}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-gray-700">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {event.date?.slice(0, 10)}
                    </div>
                    <div className="text-gray-700">{event.description}</div>
                    <div className="flex items-center text-gray-700">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      Budget: ${event.budget}
                    </div>
                    <div className="flex items-center text-gray-700">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Participants: {event.participants.length}
                    </div>
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {event.isPublic ? 'Public' : 'Private'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 