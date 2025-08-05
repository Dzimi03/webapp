"use client";
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';

// To use the Ticketmaster API, create a .env.local file in the webapp directory and add:
// NEXT_PUBLIC_TICKETMASTER_API_KEY=your_ticketmaster_api_key_here

export default function Home() {
  const { data: session, status } = useSession();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tmEvents, setTmEvents] = useState<any[]>([]);
  const [tmLoading, setTmLoading] = useState(false);
  const [tmError, setTmError] = useState('');
  const [likedEvents, setLikedEvents] = useState<string[]>([]);
  const [goingEvents, setGoingEvents] = useState<string[]>([]);
  const [likedEventDetails, setLikedEventDetails] = useState<any[]>([]);
  const [goingEventDetails, setGoingEventDetails] = useState<any[]>([]);
  
  // Event detail modal state
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [friendsGoing, setFriendsGoing] = useState<any[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [eventDetails, setEventDetails] = useState<any>(null);
  const [isLoadingEventDetails, setIsLoadingEventDetails] = useState(false);
  
  // Friend invitation state
  const [showInviteSection, setShowInviteSection] = useState(false);
  const [inviteSearchQuery, setInviteSearchQuery] = useState('');
  const [inviteSearchResults, setInviteSearchResults] = useState<any[]>([]);
  const [isSearchingFriends, setIsSearchingFriends] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteError, setInviteError] = useState('');

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

  const handleEventClick = async (event: any) => {
    setSelectedEvent(event);
    setShowEventModal(true);
    setIsLoadingFriends(true);
    
    // Fetch detailed event information
    await fetchEventDetails(event.id);
    
    try {
      // Fetch all users to get their goingEvents data
      const res = await fetch('/api/user');
      if (res.ok) {
        const currentUser = await res.json();
        // Get friends from current user's friends array
        const friendsGoingToEvent: any[] = [];
        
        // Fetch each friend's data to check their goingEvents
        for (const friendId of currentUser.friends || []) {
          try {
            const friendRes = await fetch(`/api/users/${friendId}`);
            if (friendRes.ok) {
              const friend = await friendRes.json();
              if (friend.goingEvents && friend.goingEvents.includes(event.id)) {
                friendsGoingToEvent.push(friend);
              }
            }
          } catch (error) {
            console.error(`Failed to fetch friend ${friendId}:`, error);
          }
        }
        
        setFriendsGoing(friendsGoingToEvent);
      }
    } catch (error) {
      console.error('Failed to fetch friends going to event:', error);
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const closeEventModal = () => {
    setShowEventModal(false);
    setSelectedEvent(null);
    setFriendsGoing([]);
    setEventDetails(null);
    setShowInviteSection(false);
    setInviteSearchQuery('');
    setInviteSearchResults([]);
    setInviteSuccess('');
    setInviteError('');
  };

  const searchFriendsForInvite = async (query: string) => {
    if (!query.trim()) {
      setInviteSearchResults([]);
      return;
    }

    setIsSearchingFriends(true);
    try {
      const res = await fetch('/api/friends');
      if (res.ok) {
        const friends = await res.json();
        const filteredFriends = friends.filter((friend: any) => 
          friend.name.toLowerCase().includes(query.toLowerCase()) &&
          !friendsGoing.some(goingFriend => goingFriend.id === friend.id)
        );
        setInviteSearchResults(filteredFriends);
      }
    } catch (error) {
      console.error('Failed to search friends:', error);
    } finally {
      setIsSearchingFriends(false);
    }
  };

  const handleInviteFriend = async (friendId: string, friendName: string) => {
    try {
      const res = await fetch('/api/events/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEvent.id,
          eventName: selectedEvent.name,
          friendId: friendId
        }),
      });

      if (res.ok) {
        setInviteSuccess(`Invitation sent to ${friendName}!`);
        setInviteError('');
        setInviteSearchQuery('');
        setInviteSearchResults([]);
        // Refresh friends going list
        setTimeout(() => {
          handleEventClick(selectedEvent);
        }, 1000);
      } else {
        const error = await res.json();
        setInviteError(error.error || 'Failed to send invitation');
        setInviteSuccess('');
      }
    } catch (error) {
      setInviteError('Failed to send invitation');
      setInviteSuccess('');
    }
  };

  const fetchEventDetails = async (eventId: string) => {
    setIsLoadingEventDetails(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_TICKETMASTER_API_KEY;
      if (!apiKey) {
        console.error('Ticketmaster API key not set.');
        return;
      }
      
      const res = await fetch(
        `https://app.ticketmaster.com/discovery/v2/events/${eventId}?apikey=${apiKey}`
      );
      
      if (!res.ok) throw new Error('Failed to fetch event details');
      const data = await res.json();
      setEventDetails(data);
    } catch (error) {
      console.error('Failed to fetch event details:', error);
    } finally {
      setIsLoadingEventDetails(false);
    }
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

  // Handle click outside modal
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showEventModal && event.target instanceof Element) {
        const modal = document.querySelector('[data-event-modal]');
        if (modal && !modal.contains(event.target)) {
          closeEventModal();
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEventModal]);

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
    }
  }, [session]);

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

  // Authenticated user - show events functionality
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pt-20">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Events Dashboard</h1>
          <p className="text-gray-600">Discover amazing events in your area</p>
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
                <div 
                  key={event.id} 
                  className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200 transform hover:scale-105 cursor-pointer"
                  onClick={() => handleEventClick(event)}
                >
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLikeEvent(event.id, event);
                          }}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGoingEvent(event.id, event);
                          }}
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
                        onClick={(e) => e.stopPropagation()}
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
        </div>
      </div>

      {/* Event Detail Modal */}
      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto border border-gray-200" data-event-modal>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-8 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-3xl">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Event Details</h2>
                  <p className="text-gray-600">Discover and share amazing events</p>
                </div>
              </div>
              <button
                onClick={closeEventModal}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-2 hover:bg-gray-100 rounded-full"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="space-y-8">
                {/* Event Image */}
                <div>
                  {selectedEvent.images?.[0]?.url && (
                    <div className="h-64 lg:h-80 rounded-xl overflow-hidden mb-6">
                      <img 
                        src={selectedEvent.images[0].url} 
                        alt={selectedEvent.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>

                {/* Event Details and Friends Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column - Event Details */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-3xl font-bold text-gray-900 mb-4">{selectedEvent.name}</h3>
                      
                      <div className="space-y-4">
                        {/* Date and Time */}
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Date & Time</p>
                            <p className="text-gray-900 font-semibold">
                              {selectedEvent.dates?.start?.localDate} {selectedEvent.dates?.start?.localTime}
                            </p>
                          </div>
                        </div>

                        {/* Venue */}
                        {selectedEvent._embedded?.venues?.[0]?.name && (
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">Venue</p>
                              <p className="text-gray-900 font-semibold">{selectedEvent._embedded.venues[0].name}</p>
                            </div>
                          </div>
                        )}

                        {/* Price */}
                        {selectedEvent.priceRanges?.[0] && (
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">Price Range</p>
                              <p className="text-gray-900 font-semibold">
                                {selectedEvent.priceRanges[0].currency} {selectedEvent.priceRanges[0].min} - {selectedEvent.priceRanges[0].max}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Category */}
                        {selectedEvent.classifications?.[0]?.segment?.name && (
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">Category</p>
                              <p className="text-gray-900 font-semibold">{selectedEvent.classifications[0].segment.name}</p>
                            </div>
                          </div>
                        )}

                        {/* Additional Event Details */}
                        {isLoadingEventDetails ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            <span className="ml-3 text-gray-600 text-sm">Loading additional details...</span>
                          </div>
                        ) : eventDetails && (
                          <div className="space-y-4 pt-4 border-t border-gray-200">
                            <h4 className="text-lg font-semibold text-gray-900 mb-3">Additional Details</h4>
                            
                            {/* Event Description */}
                            {eventDetails.info && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-500">Description</p>
                                <p className="text-gray-700 text-sm leading-relaxed">{eventDetails.info}</p>
                              </div>
                            )}

                            {/* Ticket Limit */}
                            {eventDetails.ticketLimit && (
                              <div className="flex items-center space-x-3">
                                <div className="w-6 h-6 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-500">Ticket Limit</p>
                                  <p className="text-gray-900 font-semibold text-sm">{eventDetails.ticketLimit.info}</p>
                                </div>
                              </div>
                            )}

                            {/* Age Restrictions */}
                            {eventDetails.ageRestrictions && (
                              <div className="flex items-center space-x-3">
                                <div className="w-6 h-6 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-500">Age Restrictions</p>
                                  <p className="text-gray-900 font-semibold text-sm">{eventDetails.ageRestrictions.legalAgeEnforced}</p>
                                </div>
                              </div>
                            )}

                            {/* Accessibility */}
                            {eventDetails.accessibility && (
                              <div className="flex items-center space-x-3">
                                <div className="w-6 h-6 bg-gradient-to-r from-teal-500 to-teal-600 rounded-lg flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-500">Accessibility</p>
                                  <p className="text-gray-900 font-semibold text-sm">
                                    {eventDetails.accessibility.wheelchairAccessible ? 'Wheelchair Accessible' : 'Check venue for details'}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Promoter */}
                            {eventDetails.promoter && (
                              <div className="flex items-center space-x-3">
                                <div className="w-6 h-6 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-500">Promoter</p>
                                  <p className="text-gray-900 font-semibold text-sm">{eventDetails.promoter.name}</p>
                                </div>
                              </div>
                            )}

                            {/* Sales Status */}
                            {eventDetails.dates?.status && (
                              <div className="flex items-center space-x-3">
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                                  eventDetails.dates.status.code === 'onsale' 
                                    ? 'bg-gradient-to-r from-green-500 to-green-600' 
                                    : 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                                }`}>
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-500">Sales Status</p>
                                  <p className="text-gray-900 font-semibold text-sm capitalize">
                                    {eventDetails.dates.status.code.replace(/([A-Z])/g, ' $1').trim()}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleLikeEvent(selectedEvent.id, selectedEvent)}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all duration-200 ${
                            likedEvents.includes(selectedEvent.id)
                              ? 'bg-red-100 text-red-700 border border-red-300 hover:bg-red-200'
                              : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                          }`}
                        >
                          <svg className="w-5 h-5" fill={likedEvents.includes(selectedEvent.id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          {likedEvents.includes(selectedEvent.id) ? 'Liked' : 'Like Event'}
                        </button>
                        <button
                          onClick={() => handleGoingEvent(selectedEvent.id, selectedEvent)}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all duration-200 ${
                            goingEvents.includes(selectedEvent.id)
                              ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                          }`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {goingEvents.includes(selectedEvent.id) ? 'Going!' : 'Going'}
                        </button>
                      </div>
                      <a
                        href={selectedEvent.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-orange-700 hover:to-red-700 transition-all duration-200"
                      >
                        View on Ticketmaster
                        <svg className="w-5 h-5 ml-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>

                  {/* Right Column - Friends Sections */}
                  <div className="space-y-6">
                    {/* Friends Going Section */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <h4 className="text-xl font-bold text-gray-900">Friends Going</h4>
                      </div>

                      {isLoadingFriends ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                          <span className="ml-3 text-gray-600">Loading friends...</span>
                        </div>
                      ) : friendsGoing.length > 0 ? (
                        <div className="space-y-3">
                          {friendsGoing.map((friend) => (
                            <div key={friend.id} className="flex items-center space-x-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden">
                                {friend.avatarUrl ? (
                                  <img src={friend.avatarUrl} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900">{friend.name}</p>
                                <p className="text-sm text-gray-600">{friend.residence || 'No location set'}</p>
                              </div>
                              <div className="flex items-center space-x-1 text-green-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-xs font-medium">Going</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                          <h5 className="text-lg font-semibold text-gray-900 mb-2">No Friends Going Yet</h5>
                          <p className="text-gray-600 text-sm">Be the first to mark yourself as going!</p>
                        </div>
                      )}
                    </div>

                    {/* Invite Friends Section */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        <h4 className="text-xl font-bold text-gray-900">Invite Friends</h4>
                      </div>

                      {/* Search Input */}
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search friends by name..."
                          value={inviteSearchQuery}
                          onChange={(e) => {
                            setInviteSearchQuery(e.target.value);
                            searchFriendsForInvite(e.target.value);
                          }}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
                        />
                        {isSearchingFriends && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                          </div>
                        )}
                      </div>

                      {/* Success/Error Messages */}
                      {inviteSuccess && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-green-700 text-sm">{inviteSuccess}</p>
                        </div>
                      )}
                      {inviteError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-red-700 text-sm">{inviteError}</p>
                        </div>
                      )}

                      {/* Search Results */}
                      {inviteSearchResults.length > 0 && (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {inviteSearchResults.map((friend) => (
                            <div key={friend.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center overflow-hidden">
                                  {friend.avatarUrl ? (
                                    <img src={friend.avatarUrl} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
                                  ) : (
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                  )}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900">{friend.name}</p>
                                  <p className="text-sm text-gray-600">{friend.residence || 'No location set'}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleInviteFriend(friend.id, friend.name)}
                                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 font-medium text-sm"
                              >
                                Invite
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* No Results */}
                      {inviteSearchQuery && !isSearchingFriends && inviteSearchResults.length === 0 && (
                        <div className="text-center py-4">
                          <p className="text-gray-500 text-sm">No friends found matching "{inviteSearchQuery}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                onClick={closeEventModal}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
