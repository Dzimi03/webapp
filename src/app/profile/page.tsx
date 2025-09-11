"use client";
import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';

export default function ProfilePage() {
  const { data: session } = useSession();
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [residence, setResidence] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [likedEventDetails, setLikedEventDetails] = useState<any[]>([]);
  const [goingEventDetails, setGoingEventDetails] = useState<any[]>([]);
  // We can derive ID arrays from details, but keep quick memoized copies for PUT operations
  const likedEventIds = likedEventDetails.map(e => e.id);
  const goingEventIds = goingEventDetails.map(e => e.id);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchUser() {
      const res = await fetch('/api/user');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setName(data.name || '');
        setAvatarUrl(data.avatarUrl || '');
        setResidence(data.residence || '');
        setDescription(data.description || '');
        
        // Load liked and going events from user data
        if (data.likedEventDetails) setLikedEventDetails(data.likedEventDetails);
        if (data.goingEventDetails) setGoingEventDetails(data.goingEventDetails);
      }
    }
    fetchUser();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await fetch('/api/user/upload-avatar', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setAvatarUrl(data.avatarUrl);
        setMessage('Profile picture uploaded successfully!');
      } else {
        setMessage('Error uploading profile picture');
      }
    } catch (error) {
      setMessage('Error uploading profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    const res = await fetch('/api/user', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, avatarUrl, residence, description }),
    });
    if (res.ok) {
      setMessage('Profile updated!');
      setIsEditing(false);
    } else {
      setMessage('Error updating profile');
    }
  }

  const handleCancel = () => {
    // Reset form to original values
    setName(user?.name || '');
    setResidence(user?.residence || '');
    setDescription(user?.description || '');
    setAvatarUrl(user?.avatarUrl || '');
    setIsEditing(false);
    setMessage('');
  };

  // Toggle like from profile page
  const handleToggleLike = async (eventObj: any) => {
    const exists = likedEventDetails.some(e => e.id === eventObj.id);
    const newLikedDetails = exists
      ? likedEventDetails.filter(e => e.id !== eventObj.id)
      : [...likedEventDetails, eventObj];
    const newLikedIds = newLikedDetails.map(e => e.id);

    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          likedEvents: newLikedIds,
          likedEventDetails: newLikedDetails,
          goingEvents: goingEventIds,
          goingEventDetails
        })
      });
      if (res.ok) {
        setLikedEventDetails(newLikedDetails);
        const updated = await res.json();
        setUser(updated);
      }
    } catch (e) {
      // swallow – optional toast could be added
    }
  };

  // Toggle going from profile page
  const handleToggleGoing = async (eventObj: any) => {
    const exists = goingEventDetails.some(e => e.id === eventObj.id);
    const newGoingDetails = exists
      ? goingEventDetails.filter(e => e.id !== eventObj.id)
      : [...goingEventDetails, eventObj];
    const newGoingIds = newGoingDetails.map(e => e.id);

    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goingEvents: newGoingIds,
            goingEventDetails: newGoingDetails,
          likedEvents: likedEventIds,
          likedEventDetails
        })
      });
      if (res.ok) {
        setGoingEventDetails(newGoingDetails);
        const updated = await res.json();
        setUser(updated);
      }
    } catch (e) {
      // ignore for now
    }
  };

  if (!session) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Please Log In</h2>
        <p className="text-gray-600">You need to be logged in to view your profile.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pt-20">
      <div className="container mx-auto px-6 py-8">
        {/* Profile Header */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="relative mr-6">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="avatar" className="w-20 h-20 rounded-full object-cover" />
                    ) : (
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  {isEditing && (
                    <button
                      onClick={triggerFileUpload}
                      disabled={isUploading}
                      className="absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploading ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Profile</h1>
                  <p className="text-gray-600">{user?.email}</p>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Change Profile</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleCancel}
                      className="flex items-center space-x-2 px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-all duration-200 transform hover:scale-105 shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Cancel</span>
                    </button>
                    <button
                      onClick={handleSave}
                      className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Save Changes</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Information */}
            {user && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <svg className="w-4 h-4 inline mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Display Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full border border-gray-300 px-4 py-3 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200"
                        placeholder="Enter your display name"
                        required
                      />
                    ) : (
                      <div className="w-full border border-gray-200 px-4 py-3 rounded-lg text-gray-900 bg-gray-50">
                        {name || 'Not set'}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <svg className="w-4 h-4 inline mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Residence
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={residence}
                        onChange={e => setResidence(e.target.value)}
                        className="w-full border border-gray-300 px-4 py-3 rounded-lg text-gray-900 focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:outline-none transition-all duration-200"
                        placeholder="Enter your city, country"
                      />
                    ) : (
                      <div className="w-full border border-gray-200 px-4 py-3 rounded-lg text-gray-900 bg-gray-50">
                        {residence || 'Not set'}
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <svg className="w-4 h-4 inline mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    About Me
                  </label>
                  {isEditing ? (
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={4}
                      className="w-full border border-gray-300 px-4 py-3 rounded-lg text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all duration-200 resize-none"
                      placeholder="Tell us a bit about yourself..."
                    />
                  ) : (
                    <div className="w-full border border-gray-200 px-4 py-3 rounded-lg text-gray-900 bg-gray-50 min-h-[100px]">
                      {description || 'No description provided'}
                    </div>
                  )}
                </div>

                {isEditing && (
                  <div className="text-sm text-gray-500 bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="font-medium mb-1">Editing Mode Active</p>
                    <p>• Click the camera icon to upload a profile picture</p>
                    <p>• Supports: JPG, PNG, GIF (max 5MB)</p>
                    <p>• Click "Save Changes" to save or "Cancel" to discard changes</p>
                  </div>
                )}

                {message && (
                  <div className={`p-4 rounded-lg text-sm font-medium ${
                    message.includes('Error') 
                      ? 'bg-red-50 text-red-700 border border-red-200' 
                      : 'bg-green-50 text-green-700 border border-green-200'
                  }`}>
                    {message}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Liked Events Section */}
        {likedEventDetails.length > 0 && (
          <div className="max-w-7xl mx-auto mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Events You Liked</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {likedEventDetails.map((event: any) => (
                <div key={event.id} className="relative bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200 transform hover:scale-105">
                  <button
                    onClick={() => handleToggleLike(event)}
                    title={likedEventDetails.some(e => e.id === event.id) ? 'Remove from liked' : 'Like'}
                    className={`absolute top-2 right-2 z-10 rounded-full p-2 text-xs font-semibold shadow-md transition-colors ${
                      likedEventDetails.some(e => e.id === event.id)
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-white/80 backdrop-blur hover:bg-white text-gray-700 border'
                    }`}
                  >
                    {likedEventDetails.some(e => e.id === event.id) ? '✕' : '♥'}
                  </button>
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
                    </div>
                    <div className="mt-4">
                      <a
                        href={event.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-sm"
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
        )}

        {/* Going Events Section */}
        {goingEventDetails.length > 0 && (
          <div className="max-w-7xl mx-auto mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Events You're Going To</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {goingEventDetails.map((event: any) => (
                <div key={event.id} className="relative bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200 transform hover:scale-105">
                  <button
                    onClick={() => handleToggleGoing(event)}
                    title={goingEventDetails.some(e => e.id === event.id) ? 'Remove from going' : 'Mark going'}
                    className={`absolute top-2 right-2 z-10 rounded-full p-2 text-xs font-semibold shadow-md transition-colors ${
                      goingEventDetails.some(e => e.id === event.id)
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-white/80 backdrop-blur hover:bg-white text-gray-700 border'
                    }`}
                  >
                    {goingEventDetails.some(e => e.id === event.id) ? '✕' : '✓'}
                  </button>
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
                    </div>
                    <div className="mt-4">
                      <a
                        href={event.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 px-4 rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 transition-all duration-200 text-sm"
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
        )}

        {/* Show message if no events */}
        {likedEventDetails.length === 0 && goingEventDetails.length === 0 && (
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
              <div className="w-16 h-16 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Events Yet</h3>
              <p className="text-gray-600 mb-4">You haven't liked or marked any events as "going" yet.</p>
              <p className="text-gray-500">Visit the Events page to discover and interact with events!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 