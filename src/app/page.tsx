"use client";
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';

// To use the Ticketmaster API, create a .env.local file in the webapp directory and add:
// NEXT_PUBLIC_TICKETMASTER_API_KEY=your_ticketmaster_api_key_here

export default function Home() {
  const { data: session, status } = useSession();
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

  // Function to save user preferences to database
  const saveUserPreferences = async (likedEvents: string[], goingEvents: string[], likedEventDetails: any[], goingEventDetails: any[]) => {
    try {
      await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          likedEvents,
          goingEvents,
          likedEventDetails,
          goingEventDetails
        }),
      });
    } catch (error) {
      console.error('Failed to save user preferences:', error);
    }
  };

  // Load liked and going events from database first, then fallback to localStorage
  useEffect(() => {
    if (session) {
      async function loadUserPreferences() {
        try {
          const res = await fetch('/api/user');
          if (res.ok) {
            const user = await res.json();
            if (user.likedEvents) setLikedEvents(user.likedEvents);
            if (user.goingEvents) setGoingEvents(user.goingEvents);
            if (user.likedEventDetails) setLikedEventDetails(user.likedEventDetails);
            if (user.goingEventDetails) setGoingEventDetails(user.goingEventDetails);
          }
        } catch (error) {
          console.error('Failed to load user preferences:', error);
          // Fallback to localStorage
          const savedLiked = localStorage.getItem('likedEventDetails');
          const savedGoing = localStorage.getItem('goingEventDetails');
          if (savedLiked) setLikedEventDetails(JSON.parse(savedLiked));
          if (savedGoing) setGoingEventDetails(JSON.parse(savedGoing));
          
          const savedLikedIds = localStorage.getItem('likedEvents');
          const savedGoingIds = localStorage.getItem('goingEvents');
          if (savedLikedIds) setLikedEvents(JSON.parse(savedLikedIds));
          if (savedGoingIds) setGoingEvents(JSON.parse(savedGoingIds));
        }
      }
      loadUserPreferences();
    }
  }, [session]);

  // Save to localStorage as backup
  useEffect(() => {
    if (session) {
      localStorage.setItem('likedEvents', JSON.stringify(likedEvents));
    }
  }, [likedEvents, session]);

  useEffect(() => {
    if (session) {
      localStorage.setItem('goingEvents', JSON.stringify(goingEvents));
    }
  }, [goingEvents, session]);

  const handleLikeEvent = (eventId: string, eventDetails: any) => {
    const newLiked = likedEvents.includes(eventId) 
      ? likedEvents.filter(id => id !== eventId)
      : [...likedEvents, eventId];
    
    const newLikedDetails = likedEventDetails.some(event => event.id === eventId)
      ? likedEventDetails.filter(event => event.id !== eventId)
      : [...likedEventDetails, eventDetails];

    setLikedEvents(newLiked);
    setLikedEventDetails(newLikedDetails);

    // Save to database
    saveUserPreferences(newLiked, goingEvents, newLikedDetails, goingEventDetails);
  };

  const handleGoingEvent = (eventId: string, eventDetails: any) => {
    const newGoing = goingEvents.includes(eventId) 
      ? goingEvents.filter(id => id !== eventId)
      : [...goingEvents, eventId];
    
    const newGoingDetails = goingEventDetails.some(event => event.id === eventId)
      ? goingEventDetails.filter(event => event.id !== eventId)
      : [...goingEventDetails, eventDetails];

    setGoingEvents(newGoing);
    setGoingEventDetails(newGoingDetails);

    // Save to database
    saveUserPreferences(likedEvents, newGoing, likedEventDetails, newGoingDetails);
  };

  // Save event details to localStorage as backup
  useEffect(() => {
    if (session) {
      localStorage.setItem('likedEventDetails', JSON.stringify(likedEventDetails));
    }
  }, [likedEventDetails, session]);

  useEffect(() => {
    if (session) {
      localStorage.setItem('goingEventDetails', JSON.stringify(goingEventDetails));
    }
  }, [goingEventDetails, session]);

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
    if (session) {
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
    }
  }, [session]);

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

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Landing page for non-authenticated users
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-6 py-20">
          <div className="text-center max-w-4xl mx-auto">
            {/* Hero Section */}
            <div className="mb-16">
              <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-pulse">
                LiveALittle
              </h1>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
                Discover Amazing Events
              </h2>
              <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
                Connect with friends, create unforgettable experiences, and explore events happening around you.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  href="/login"
                  className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
                >
                  Sign In
                </Link>
                <Link 
                  href="/register"
                  className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold border-2 border-blue-600 hover:bg-blue-50 transition-colors shadow-lg hover:shadow-xl"
                >
                  Create Account
                </Link>
              </div>
            </div>

            {/* Features Section */}
            <div className="grid md:grid-cols-3 gap-8 mb-16">
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect with Friends</h3>
                <p className="text-gray-600">Build your network and stay connected with people who share your interests.</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Create Events</h3>
                <p className="text-gray-600">Organize your own events and invite friends to join the fun.</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Discover Events</h3>
                <p className="text-gray-600">Find exciting events happening in your area and beyond.</p>
              </div>
            </div>

            {/* Call to Action */}
            <div className="bg-white p-8 rounded-2xl shadow-xl">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Get Started?</h2>
              <p className="text-lg text-gray-600 mb-6">
                Join thousands of users who are already creating and discovering amazing events.
              </p>
              <Link 
                href="/register"
                className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Create Your Account Now
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated user - show full events functionality
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pt-20">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Events Dashboard</h1>
          <p className="text-gray-600">Create and discover amazing events with your friends</p>
        </div>

        {/* Create Event Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8 border border-gray-200 max-w-4xl mx-auto">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Create Your Event</h2>
          </div>
          
          <form onSubmit={handleCreate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Title</label>
                <input 
                  type="text" 
                  placeholder="Enter event title" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  className="w-full border border-gray-300 px-4 py-3 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Date</label>
                <input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                  className="w-full border border-gray-300 px-4 py-3 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200" 
                  required 
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea 
                placeholder="Describe your event..." 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                className="w-full border border-gray-300 px-4 py-3 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200 h-24 resize-none" 
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Group</label>
                <select 
                  value={groupId} 
                  onChange={e => setGroupId(e.target.value)} 
                  className="w-full border border-gray-300 px-4 py-3 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200" 
                  required
                >
                  <option value="">Select a group</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Budget</label>
                <input 
                  type="number" 
                  placeholder="Enter budget" 
                  value={budget} 
                  onChange={e => setBudget(e.target.value)} 
                  className="w-full border border-gray-300 px-4 py-3 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Participants</label>
                <input 
                  type="text" 
                  placeholder="Participant IDs (comma separated)" 
                  value={participants} 
                  onChange={e => setParticipants(e.target.value)} 
                  className="w-full border border-gray-300 px-4 py-3 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200" 
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              Create Event
            </button>
          </form>
          
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="ml-3 text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}
          {success && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex">
                <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="ml-3 text-sm text-green-700">{success}</p>
              </div>
            </div>
          )}
        </div>

        {/* Events List */}
        <div className="space-y-8">
          {/* Ticketmaster Events */}
          <div>
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Events in Your Area</h2>
            </div>
            
            {tmLoading && (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-4 text-gray-600 text-lg">Loading events...</span>
              </div>
            )}
            
            {tmError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                <div className="flex">
                  <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="ml-3 text-red-700">{tmError}</p>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {tmEvents.map((event: any) => (
                <div key={event.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200 transform hover:scale-105">
                  {event.images?.[0]?.url && (
                    <div className="h-48 overflow-hidden">
                      <img 
                        src={event.images[0].url} 
                        alt={event.name}
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="font-bold text-lg text-gray-900 mb-3 line-clamp-2">{event.name}</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center text-gray-700">
                        <svg className="w-4 h-4 mr-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {event.dates?.start?.localDate} {event.dates?.start?.localTime}
                      </div>
                      {event._embedded?.venues?.[0]?.name && (
                        <div className="flex items-center text-gray-700">
                          <svg className="w-4 h-4 mr-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {event._embedded.venues[0].name}
                        </div>
                      )}
                      {event.priceRanges?.[0] && (
                        <div className="flex items-center text-gray-700">
                          <svg className="w-4 h-4 mr-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                          {event.priceRanges[0].currency} {event.priceRanges[0].min} - {event.priceRanges[0].max}
                        </div>
                      )}
                      {event.classifications?.[0]?.segment?.name && (
                        <div className="flex items-center text-gray-700">
                          <svg className="w-4 h-4 mr-3 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                          className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            likedEvents.includes(event.id)
                              ? 'bg-red-100 text-red-700 border border-red-300 hover:bg-red-200'
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
                          className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            goingEvents.includes(event.id)
                              ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200'
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
                        className="block w-full text-center bg-gradient-to-r from-orange-600 to-red-600 text-white py-2 px-4 rounded-lg font-medium hover:from-orange-700 hover:to-red-700 transition-all duration-200 text-sm"
                      >
                        View on Ticketmaster
                        <svg className="w-4 h-4 ml-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Your Events</h2>
            </div>
            
            {events.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Events Yet</h3>
                <p className="text-gray-600">Create your first event to get started!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {events.map(event => (
                  <div key={event.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200 transform hover:scale-105">
                    <div className="p-6">
                      <h3 className="font-bold text-lg text-gray-900 mb-3">{event.title}</h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center text-gray-700">
                          <svg className="w-4 h-4 mr-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {event.date?.slice(0, 10)}
                        </div>
                        <div className="text-gray-700">{event.description}</div>
                        <div className="flex items-center text-gray-700">
                          <svg className="w-4 h-4 mr-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                          Budget: ${event.budget}
                        </div>
                        <div className="flex items-center text-gray-700">
                          <svg className="w-4 h-4 mr-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
