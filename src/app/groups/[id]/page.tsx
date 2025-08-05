"use client";
import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';

export default function GroupDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  
  const [group, setGroup] = useState<any>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form states
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Invite members states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  // Role management states
  const [isChangingRole, setIsChangingRole] = useState(false);

  useEffect(() => {
    if (session?.user?.email && groupId) {
      fetchGroup();
    }
  }, [session, groupId]);

  // Handle click outside search results
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Search friends as user types
  useEffect(() => {
    const searchFriends = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      setIsSearching(true);
      try {
        const res = await fetch(`/api/friends`);
        if (res.ok) {
          const friends = await res.json();
          const filteredFriends = friends.filter((friend: any) => 
            friend.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !group?.members?.some((member: any) => member.userId === friend.id)
          );
          setSearchResults(filteredFriends);
          setShowSearchResults(true);
        }
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchFriends, 300); // Debounce search
    return () => clearTimeout(timeoutId);
  }, [searchQuery, group?.members]);

  const fetchGroup = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      if (res.ok) {
        const data = await res.json();
        setGroup(data);
        setCurrentUserRole(data.currentUserRole);
        setGroupName(data.name);
        setGroupDescription(data.description || '');
      } else {
        setError('Group not found');
      }
    } catch (error) {
      setError('Failed to load group');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName.trim(),
          description: groupDescription.trim(),
        }),
      });

      if (res.ok) {
        setSuccess('Group updated successfully!');
        setIsEditing(false);
        fetchGroup();
      } else {
        const data = await res.json();
        setError(data.error || 'Error updating group');
      }
    } catch (error) {
      setError('Error updating group');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setGroupName(group?.name || '');
    setGroupDescription(group?.description || '');
    setIsEditing(false);
  };

  const handleInviteMember = async (friendId: string) => {
    setIsInviting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/groups/${groupId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: friendId }),
      });

      if (res.ok) {
        setSuccess('Group invitation sent successfully!');
        setSearchQuery('');
        setShowSearchResults(false);
        fetchGroup();
      } else {
        const data = await res.json();
        setError(data.error || 'Error sending invitation');
      }
    } catch (error) {
      setError('Error sending invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/groups/${groupId}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSuccess('Member removed successfully!');
        fetchGroup();
      } else {
        const data = await res.json();
        setError(data.error || 'Error removing member');
      }
    } catch (error) {
      setError('Error removing member');
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      setIsChangingRole(true);
      const res = await fetch(`/api/groups/${groupId}/members/${memberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        setSuccess('Member role updated successfully');
        fetchGroup(); // Refresh group data
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to update member role');
      }
    } catch (error) {
      setError('Failed to update member role');
    } finally {
      setIsChangingRole(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError('Image size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch(`/api/groups/${groupId}/upload-image`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setSuccess('Group image updated successfully!');
        fetchGroup();
      } else {
        const data = await res.json();
        setError(data.error || 'Error uploading image');
      }
    } catch (error) {
      setError('Error uploading image');
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  if (!session) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
      <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-8 text-center border border-white/20">
        <div className="w-20 h-20 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">Please Log In</h2>
        <p className="text-gray-600 text-lg">You need to be logged in to view group details.</p>
      </div>
    </div>
  );

  if (isLoading) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pt-20">
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-6 text-gray-600 text-xl font-semibold">Loading group...</p>
        </div>
      </div>
    </div>
  );

  if (error && !group) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pt-20">
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/20">
            <div className="w-20 h-20 bg-gradient-to-r from-red-500 via-pink-500 to-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-red-600 via-pink-600 to-rose-600 bg-clip-text text-transparent mb-4">Error</h2>
            <p className="text-gray-600 text-lg mb-6">{error}</p>
            <button
              onClick={() => router.back()}
              className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-xl"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (!group) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pt-20">
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-3 text-gray-600 hover:text-gray-900 transition-all duration-300 transform hover:scale-105 font-semibold text-lg"
            >
              <div className="w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </div>
              <span>Back to Groups</span>
            </button>
          </div>

          {/* Group Header */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200 mb-8">
            <div className="flex items-start space-x-8">
              {/* Group Image - Larger */}
              <div className="flex-shrink-0">
                <div className="w-32 h-32 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg relative group">
                  {group.imageUrl ? (
                    <img 
                      src={group.imageUrl} 
                      alt="Group" 
                      className="w-32 h-32 rounded-2xl object-cover"
                    />
                  ) : (
                    <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  )}
                  {isEditing && (currentUserRole === 'founder' || currentUserRole === 'admin') && (
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
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Group Info */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    {isEditing && (currentUserRole === 'founder' || currentUserRole === 'admin') ? (
                      <input
                        type="text"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        className="text-2xl font-bold text-gray-900 bg-transparent border-b-2 border-blue-500 focus:outline-none focus:border-blue-600 transition-all duration-300"
                        placeholder="Group name"
                      />
                    ) : (
                      <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
                    )}
                    <p className="text-gray-600 text-base mt-2 font-medium">
                      {group.members?.length || 0} members • Created {new Date(group.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center space-x-3">
                    {/* Show edit buttons only for founder and admin */}
                    {(currentUserRole === 'founder' || currentUserRole === 'admin') && (
                      !isEditing ? (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span>Edit Group</span>
                        </button>
                      ) : (
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={handleCancelEdit}
                            className="flex items-center space-x-2 px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-all duration-200 transform hover:scale-105 shadow-lg"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span>Cancel</span>
                          </button>
                          <button
                            onClick={handleSaveChanges}
                            disabled={isSaving}
                            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                          </button>
                        </div>
                      )
                    )}
                    
                    {/* Show role badge */}
                    <div className="px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                      {currentUserRole === 'founder' ? 'Founder' : currentUserRole === 'admin' ? 'Admin' : 'Member'}
                    </div>
                  </div>
                </div>

                {/* Group Description */}
                <div className="space-y-4">
                  {isEditing && (currentUserRole === 'founder' || currentUserRole === 'admin') ? (
                    <div>
                      <label className="block text-base font-semibold text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={groupDescription}
                        onChange={(e) => setGroupDescription(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200 resize-none"
                        placeholder="Tell us what this group is about..."
                      />
                    </div>
                  ) : (
                    group.description && (
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mt-1 shadow-md">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-500 mb-1">About</p>
                          <p className="text-gray-900 text-sm leading-relaxed">{group.description}</p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Invite Members - Only for founder and admin */}
          {(currentUserRole === 'founder' || currentUserRole === 'admin') && (
            <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Invite Members</h2>
            
            <div className="relative" ref={searchRef}>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search friends by name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSearchResults(true)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200"
                />
                {isSearching && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <svg className="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}
              </div>
              
              {/* Search Results Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-2xl border border-gray-200 max-h-96 overflow-y-auto">
                  {searchResults.map((friend) => (
                    <div 
                      key={friend.id} 
                      className="flex items-center justify-between p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-all duration-200"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden">
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
                          <p className="text-sm text-gray-600">{friend.residence || friend.email || 'No location'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleInviteMember(friend.id)}
                        disabled={isInviting}
                        className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-sm font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50"
                      >
                        {isInviting ? 'Inviting...' : 'Invite'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          )}

          {/* Members List */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Members ({group.members?.length || 0})</h2>
            
            {!group.members || group.members.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-r from-gray-400 to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-lg font-semibold mb-2">No members yet</p>
                <p className="text-gray-400 text-base">
                  {(currentUserRole === 'founder' || currentUserRole === 'admin') 
                    ? 'Invite members using the search above! 👥' 
                    : 'This group is empty. Contact the founder to invite members.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.members.map((member: any, index: number) => (
                  <div 
                    key={member.userId} 
                    className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 hover:border-blue-300 hover:shadow-md transition-all duration-300 transform hover:scale-105"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                        {member.user?.avatarUrl ? (
                          <img src={member.user.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">{member.user?.name}</p>
                        <p className="text-gray-600 font-medium text-xs truncate">{member.user?.residence || member.user?.email}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            member.role === 'founder' 
                              ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white' 
                              : member.role === 'admin' 
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' 
                              : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
                          }`}>
                            {member.role === 'founder' ? 'Founder' : member.role === 'admin' ? 'Admin' : 'Member'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Action buttons - only for founder and admin */}
                      {(currentUserRole === 'founder' || currentUserRole === 'admin') && (
                        <div className="flex items-center space-x-1">
                          {/* Role change dropdown - only for founder and admin, not for founder changing founder */}
                          {(currentUserRole === 'founder' || (currentUserRole === 'admin' && member.role !== 'founder')) && (
                            <select
                              value={member.role}
                              onChange={(e) => handleChangeRole(member.userId, e.target.value)}
                              disabled={isChangingRole}
                              className="text-xs bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                            >
                              <option value="member">Member</option>
                              <option value="admin">Admin</option>
                              {currentUserRole === 'founder' && <option value="founder">Founder</option>}
                            </select>
                          )}
                          
                          {/* Remove button - only for founder and admin, not for founder removing founder */}
                          {(currentUserRole === 'founder' || (currentUserRole === 'admin' && member.role !== 'founder')) && (
                            <button
                              onClick={() => handleRemoveMember(member.userId)}
                              className="text-red-500 hover:text-red-700 transition-all duration-300 p-1 hover:bg-red-50 rounded-md"
                              title="Remove member"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Messages */}
          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center mr-3">
                  <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-red-700 font-semibold text-sm">{error}</p>
              </div>
            </div>
          )}
          {success && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-3">
                  <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-green-700 font-semibold text-sm">{success}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 