"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Navbar from '../../Navbar';

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  residence?: string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  backgroundImageUrl?: string;
  members: User[];
  createdAt: string;
}

interface Expense {
  id: string;
  groupId: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  paidByUserId: string;
  splitBetweenUserIds: string[];
  createdAt: string;
  paidByUser?: User;
  splitBetweenUsers?: User[];
}

interface BalanceEntry {
  user: User;
  balance: number;
  currency: string;
}

export default function GroupDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [group, setGroup] = useState<Group | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRemovingMember, setIsRemovingMember] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [invitedUsers, setInvitedUsers] = useState<Set<string>>(new Set());
  const [friends, setFriends] = useState<User[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'members' | 'expenses' | 'balance'>('members');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balance, setBalance] = useState<BalanceEntry[]>([]);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({
    name: '',
    description: '',
    amount: '',
    currency: 'PLN',
    paidByUserId: '',
    splitBetweenUserIds: [] as string[]
  });

  useEffect(() => {
    if (session?.user?.email && groupId) {
      fetchGroup();
      fetchFriends();
    }
  }, [session, groupId]);

  useEffect(() => {
    if (group) {
      fetchExistingInvites();
      fetchExpenses();
      fetchBalance();
    }
  }, [group]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredFriends(friends);
    } else {
      const filtered = friends.filter(friend =>
        friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        friend.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      console.log('Filtering friends:', { searchQuery, friendsCount: friends.length, filteredCount: filtered.length });
      setFilteredFriends(filtered);
    }
  }, [searchQuery, friends]);

  const fetchGroup = async () => {
    try {
      const response = await fetch(`/api/groups/${groupId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched group data:', data);
        console.log('Background image URL:', data.backgroundImageUrl);
        setGroup(data);
        setGroupName(data.name);
        setGroupDescription(data.description || '');
      } else {
        console.error('Failed to fetch group');
      }
    } catch (error) {
      console.error('Error fetching group:', error);
    }
  };

  const fetchFriends = async () => {
    try {
      const response = await fetch('/api/friends');
      if (response.ok) {
        const data = await response.json();
        // API zwraca bezpośrednio tablicę znajomych, nie obiekt z friends
        const friendsList = Array.isArray(data) ? data : [];
        console.log('Fetched friends:', friendsList);
        setFriends(friendsList);
        setFilteredFriends(friendsList);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const fetchExistingInvites = async () => {
    if (!group) return;
    
    try {
      // Pobierz wszystkie pending zaproszenia dla tej grupy
      const response = await fetch(`/api/groups/${group.id}/invites`);
      if (response.ok) {
        const data = await response.json();
        // Dodaj ID użytkowników którzy mają pending zaproszenia do set
        const invitedUserIds = new Set<string>(data.invites?.map((invite: any) => invite.toUserId) || []);
        setInvitedUsers(invitedUserIds);
      }
    } catch (error) {
      console.error('Error fetching existing invites:', error);
    }
  };

  const fetchExpenses = async () => {
    if (!group) return;
    
    try {
      const response = await fetch(`/api/groups/${group.id}/expenses`);
      if (response.ok) {
        const data = await response.json();
        setExpenses(data.expenses || []);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const fetchBalance = async () => {
    if (!group) return;
    
    try {
      const response = await fetch(`/api/groups/${group.id}/expenses/balance`);
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance || []);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const handleSaveChanges = async () => {
    if (!group) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: groupName,
          description: groupDescription,
        }),
      });

      if (response.ok) {
        await fetchGroup();
        setIsEditing(false);
      } else {
        console.error('Failed to update group');
      }
    } catch (error) {
      console.error('Error updating group:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!group) return;

    setIsRemovingMember(memberId);
    try {
      const response = await fetch(`/api/groups/${groupId}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchGroup();
      } else {
        console.error('Failed to remove member');
      }
    } catch (error) {
      console.error('Error removing member:', error);
    } finally {
      setIsRemovingMember(null);
    }
  };

  const handleImageUpload = async (type: 'profile' | 'background') => {
    if (!selectedImage || !group) return;

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedImage);

      const endpoint = type === 'profile' 
        ? `/api/groups/${groupId}/upload-image`
        : `/api/groups/${groupId}/upload-background`;

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        await fetchGroup();
        setSelectedImage(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        alert(`${type === 'profile' ? 'Profile picture' : 'Background image'} uploaded successfully!`);
      } else {
        console.error(`Failed to upload ${type} image`);
        alert(`Failed to upload ${type === 'profile' ? 'profile picture' : 'background image'}`);
      }
    } catch (error) {
      console.error(`Error uploading ${type} image:`, error);
      alert(`Failed to upload ${type === 'profile' ? 'profile picture' : 'background image'}`);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleInviteUser = async (friendId: string) => {
    if (!group) return;

    setIsInviting(true);
    setInvitingUserId(friendId);
    try {
      const response = await fetch(`/api/groups/${groupId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: friendId,
        }),
      });

      if (response.ok) {
        setInvitedUsers(prev => new Set([...prev, friendId]));
      } else {
        const error = await response.json();
        console.error('Failed to send invitation:', error.error);
      }
    } catch (error) {
      console.error('Error inviting user:', error);
    } finally {
      setIsInviting(false);
      setInvitingUserId(null);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleAddExpense = async () => {
    if (!group || !newExpense.name || !newExpense.amount || !newExpense.paidByUserId || newExpense.splitBetweenUserIds.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    setIsAddingExpense(true);
    try {
      const response = await fetch(`/api/groups/${group.id}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newExpense),
      });

      if (response.ok) {
        await fetchExpenses();
        await fetchBalance();
        setShowAddExpenseModal(false);
        setNewExpense({
          name: '',
          description: '',
          amount: '',
          currency: 'PLN',
          paidByUserId: '',
          splitBetweenUserIds: []
        });
        alert('Expense added successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to add expense: ${error.error}`);
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('Failed to add expense');
    } finally {
      setIsAddingExpense(false);
    }
  };

  const handleSplitUserToggle = (userId: string) => {
    setNewExpense(prev => ({
      ...prev,
      splitBetweenUserIds: prev.splitBetweenUserIds.includes(userId)
        ? prev.splitBetweenUserIds.filter(id => id !== userId)
        : [...prev.splitBetweenUserIds, userId]
    }));
  };

  if (!session?.user?.email) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Please log in to view this group</h1>
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-800">Loading group...</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Hero Section with Group Image and Info */}
        <div className="relative mb-8">
          {/* Background Image */}
          <div className="h-64 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl relative overflow-hidden">
            {group.backgroundImageUrl && (
              <>
                {console.log('Full image URL:', `${window.location.origin}${group.backgroundImageUrl}`)}
                <img 
                  src={`${window.location.origin}${group.backgroundImageUrl}`}
                  alt="Group background" 
                  className="w-full h-full object-cover"
                  onError={(e) => console.error('Failed to load background image:', group.backgroundImageUrl)}
                  onLoad={() => console.log('Background image loaded successfully:', group.backgroundImageUrl)}
                />
              </>
            )}
            
            {/* Group Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
              <div className="flex items-end justify-between">
                <div className="flex items-end space-x-6">
                  {/* Group Avatar */}
                  <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-xl">
                    {group.imageUrl ? (
                      <img src={group.imageUrl} alt="Group" className="w-24 h-24 rounded-2xl object-cover" />
                    ) : (
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    )}
                  </div>
                  
                  {/* Group Details */}
                  <div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        className="text-4xl font-bold bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg px-4 py-2 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                        placeholder="Group name"
                      />
                    ) : (
                      <h1 className="text-4xl font-bold">{group.name}</h1>
                    )}
                    <p className="text-white/80 mt-2">Created on {new Date(group.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                
                {/* Edit Button */}
                <div className="flex items-center space-x-3">
                  {isEditing ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveChanges}
                        disabled={isSaving}
                        className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all duration-200 flex items-center space-x-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{isSaving ? 'Saving...' : 'Save'}</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setGroupName(group.name);
                          setGroupDescription(group.description || '');
                        }}
                        className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl hover:bg-white/30 font-semibold transition-all duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl hover:bg-white/30 font-semibold transition-all duration-200 flex items-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Edit Group</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Description and Image Upload */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">About this group</h2>
              
              {isEditing ? (
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    rows={4}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900"
                    placeholder="Tell us about this group..."
                  />
                </div>
              ) : (
                <p className="text-gray-700 leading-relaxed">
                  {group.description || 'No description provided for this group.'}
                </p>
              )}
            </div>

            {/* Image Upload Card */}
            {isEditing && (
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Group Images</h3>
                <div className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <button
                    onClick={triggerFileUpload}
                    className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-all duration-200"
                  >
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-gray-600 font-medium">Click to upload image</p>
                    <p className="text-gray-400 text-sm mt-1">PNG, JPG up to 5MB</p>
                  </button>
                  
                  {selectedImage && (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-gray-600">{selectedImage.name}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => handleImageUpload('profile')}
                          disabled={isUploadingImage}
                          className="bg-blue-600 text-white py-3 px-6 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors flex items-center justify-center space-x-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zm-4 4v7m-4-4h8m-4-4v4" />
                          </svg>
                          <span>{isUploadingImage ? 'Uploading...' : 'Upload as Profile Picture'}</span>
                        </button>
                        
                        <button
                          onClick={() => handleImageUpload('background')}
                          disabled={isUploadingImage}
                          className="bg-purple-600 text-white py-3 px-6 rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors flex items-center justify-center space-x-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{isUploadingImage ? 'Uploading...' : 'Upload as Background Image'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Members */}
          <div className="space-y-6">
            {/* Members Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              {/* Tabs */}
              <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('members')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-colors ${
                    activeTab === 'members'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Members
                </button>
                <button
                  onClick={() => setActiveTab('expenses')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-colors ${
                    activeTab === 'expenses'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Expenses
                </button>
                <button
                  onClick={() => setActiveTab('balance')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-colors ${
                    activeTab === 'balance'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Balance
                </button>
              </div>

              {/* Members Tab */}
              {activeTab === 'members' && (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Members</h2>
                    <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
                      {group.members.length}
                    </span>
                  </div>

                  <div className="space-y-3 mb-6">
                    {group.members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                            {member.avatarUrl ? (
                              <img src={member.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">{member.name}</p>
                            <p className="text-gray-500 text-xs truncate">{member.residence || member.email}</p>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={isRemovingMember === member.id}
                          className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Remove member"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="w-full bg-green-600 text-white py-3 px-6 rounded-xl hover:bg-green-700 font-semibold transition-colors flex items-center justify-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Invite Members</span>
                  </button>
                </>
              )}

              {/* Expenses Tab */}
              {activeTab === 'expenses' && (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Expenses</h2>
                    <span className="bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">
                      {expenses.length}
                    </span>
                  </div>

                  <div className="space-y-3 mb-6">
                    {expenses.length === 0 ? (
                      <div className="text-center py-8">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                        <p className="text-gray-500">No expenses yet</p>
                      </div>
                    ) : (
                      expenses.map((expense) => (
                        <div key={expense.id} className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-900">{expense.name}</h3>
                            <span className="text-lg font-bold text-green-600">
                              {expense.amount} {expense.currency}
                            </span>
                          </div>
                          {expense.description && (
                            <p className="text-sm text-gray-600 mb-3">{expense.description}</p>
                          )}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Paid by: <span className="font-medium">{expense.paidByUser?.name}</span></span>
                            <span className="text-gray-500">Split between: {expense.splitBetweenUsers?.length} people</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    onClick={() => setShowAddExpenseModal(true)}
                    className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl hover:bg-blue-700 font-semibold transition-colors flex items-center justify-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Add Expense</span>
                  </button>
                </>
              )}

              {/* Balance Tab */}
              {activeTab === 'balance' && (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Balance</h2>
                  </div>

                  <div className="space-y-3">
                    {balance.length === 0 ? (
                      <div className="text-center py-8">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <p className="text-gray-500">No balance to show</p>
                      </div>
                    ) : (
                      balance.map((entry) => (
                        <div key={entry.user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                              {entry.user.avatarUrl ? (
                                <img src={entry.user.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                              ) : (
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{entry.user.name}</p>
                            </div>
                          </div>
                          <div className={`text-lg font-bold ${entry.balance > 0 ? 'text-green-600' : entry.balance < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                            {entry.balance > 0 ? '+' : ''}{entry.balance.toFixed(2)} {entry.currency}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Invite Members</h3>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setSearchQuery('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Search friends
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredFriends.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-gray-500">
                      {searchQuery ? 'No friends found matching your search.' : 'No friends available to invite.'}
                    </p>
                  </div>
                ) : (
                  filteredFriends.map((friend) => (
                    <div key={friend.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                          {friend.avatarUrl ? (
                            <img src={friend.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{friend.name}</p>
                          <p className="text-gray-500 text-xs truncate">{friend.email}</p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleInviteUser(friend.id)}
                        disabled={isInviting || invitedUsers.has(friend.id) || group.members.some(member => member.id === friend.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          group.members.some(member => member.id === friend.id)
                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                            : invitedUsers.has(friend.id)
                            ? 'bg-green-600 text-white cursor-not-allowed'
                            : isInviting && invitingUserId === friend.id
                            ? 'bg-blue-400 text-white cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {group.members.some(member => member.id === friend.id)
                          ? 'Member'
                          : isInviting && invitingUserId === friend.id
                          ? 'Sending...'
                          : invitedUsers.has(friend.id)
                          ? 'Invited'
                          : 'Invite'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

             {/* Add Expense Modal */}
       {showAddExpenseModal && (
         <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Add New Expense</h3>
              <button
                onClick={() => setShowAddExpenseModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Expense Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Expense Name *
                </label>
                <input
                  type="text"
                  value={newExpense.name}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="e.g., Dinner, Gas, Rent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newExpense.description}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900"
                  placeholder="Optional description..."
                />
              </div>

              {/* Amount and Currency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
                    value={newExpense.currency}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, currency: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  >
                    <option value="PLN">PLN</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>

              {/* Paid By */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Paid By *
                </label>
                <select
                  value={newExpense.paidByUserId}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, paidByUserId: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="">Select who paid</option>
                  {group.members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Split Between */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Split Between *
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {group.members.map((member) => (
                    <label key={member.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newExpense.splitBetweenUserIds.includes(member.id)}
                        onChange={() => handleSplitUserToggle(member.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                          {member.avatarUrl ? (
                            <img src={member.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{member.name}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowAddExpenseModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddExpense}
                  disabled={isAddingExpense}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
                >
                  {isAddingExpense ? 'Adding...' : 'Add Expense'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 