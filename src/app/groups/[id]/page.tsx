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

interface GroupEvent {
  id: string;
  name: string;
  description?: string;
  date: string;
  time?: string;
  location?: string;
  ticketmasterEventId?: string;
  ticketmasterEventUrl?: string;
  imageUrl?: string;
  createdAt: string;
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
  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isEditingExpense, setIsEditingExpense] = useState(false);
  const [isDeletingExpense, setIsDeletingExpense] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [newExpense, setNewExpense] = useState({
    name: '',
    description: '',
    amount: '',
    currency: 'PLN',
    paidByUserId: '',
    splitBetweenUserIds: [] as string[]
  });
  const [groupEvents, setGroupEvents] = useState<GroupEvent[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showEventBrowserModal, setShowEventBrowserModal] = useState(false);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({
    name: '',
    description: '',
    date: '',
    time: '',
    location: '',
    ticketmasterEventId: '',
    ticketmasterEventUrl: '',
    imageUrl: ''
  });
  
  // Event browser state (from Ticketmaster API)
  const [tmEvents, setTmEvents] = useState<any[]>([]);
  const [tmLoading, setTmLoading] = useState(false);
  const [tmError, setTmError] = useState('');
  const [selectedApiEvent, setSelectedApiEvent] = useState<any>(null);

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
      fetchGroupEvents();
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

  const fetchGroupEvents = async () => {
    if (!group) return;
    
    try {
      const response = await fetch(`/api/groups/${group.id}/events`);
      if (response.ok) {
        const data = await response.json();
        setGroupEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error fetching group events:', error);
    }
  };

  const fetchTicketmasterEvents = async () => {
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
  };

  const handleSelectApiEvent = async (event: any) => {
    if (!group) return;
    
    // Auto-fill the form with event data
    const eventData = {
      name: event.name,
      description: event.info || '',
      date: event.dates?.start?.localDate || '',
      time: event.dates?.start?.localTime || '',
      location: event._embedded?.venues?.[0]?.name || '',
      ticketmasterEventId: event.id,
      ticketmasterEventUrl: event.url,
      imageUrl: event.images?.[0]?.url || ''
    };

    setIsAddingEvent(true);
    setShowEventBrowserModal(false);
    
    try {
      const response = await fetch(`/api/groups/${group.id}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      if (response.ok) {
        await fetchGroupEvents();
      } else {
        const error = await response.json();
        alert(`Failed to add event: ${error.error}`);
      }
    } catch (error) {
      console.error('Error adding event:', error);
      alert('Failed to add event');
    } finally {
      setIsAddingEvent(false);
    }
  };

  const handleAddEvent = async () => {
    if (!group || !newEvent.name || !newEvent.date) {
      alert('Please fill in all required fields');
      return;
    }

    setIsAddingEvent(true);
    try {
      const response = await fetch(`/api/groups/${group.id}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newEvent),
      });

      if (response.ok) {
        await fetchGroupEvents();
        setShowEventModal(false);
        setNewEvent({
          name: '',
          description: '',
          date: '',
          time: '',
          location: '',
          ticketmasterEventId: '',
          ticketmasterEventUrl: '',
          imageUrl: ''
        });
      } else {
        const error = await response.json();
        alert(`Failed to add event: ${error.error}`);
      }
    } catch (error) {
      console.error('Error adding event:', error);
      alert('Failed to add event');
    } finally {
      setIsAddingEvent(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!group) return;

    try {
      const response = await fetch(`/api/groups/${group.id}/events/${eventId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchGroupEvents();
      } else {
        const error = await response.json();
        alert(`Failed to delete event: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event');
    }
  };

  const openEventModal = (event?: GroupEvent) => {
    if (event) {
      // Edit existing event - use the old modal
      setNewEvent({
        name: event.name,
        description: event.description || '',
        date: event.date,
        time: event.time || '',
        location: event.location || '',
        ticketmasterEventId: event.ticketmasterEventId || '',
        ticketmasterEventUrl: event.ticketmasterEventUrl || '',
        imageUrl: event.imageUrl || ''
      });
      setIsEditingEvent(true);
      setShowEventModal(true);
    } else {
      // Add new event - open event browser
      setShowEventBrowserModal(true);
      fetchTicketmasterEvents();
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

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setShowEditExpenseModal(true);
  };

  const handleUpdateExpense = async () => {
    if (!editingExpense || !group) return;

    setIsEditingExpense(true);
    try {
      const response = await fetch(`/api/groups/${group.id}/expenses/${editingExpense.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editingExpense.name,
          description: editingExpense.description,
          amount: editingExpense.amount,
          currency: editingExpense.currency,
          paidByUserId: editingExpense.paidByUserId,
          splitBetweenUserIds: editingExpense.splitBetweenUserIds,
        }),
      });

      if (response.ok) {
        await fetchExpenses();
        await fetchBalance();
        setShowEditExpenseModal(false);
        setEditingExpense(null);
      } else {
        const error = await response.json();
        alert(`Failed to update expense: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating expense:', error);
      alert('Failed to update expense');
    } finally {
      setIsEditingExpense(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!group) return;

    setIsDeletingExpense(expenseId);
    try {
      const response = await fetch(`/api/groups/${group.id}/expenses/${expenseId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchExpenses();
        await fetchBalance();
      } else {
        const error = await response.json();
        alert(`Failed to delete expense: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense');
    } finally {
      setIsDeletingExpense(null);
    }
  };

  const handleEditSplitUserToggle = (userId: string) => {
    if (!editingExpense) return;
    
    setEditingExpense(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        splitBetweenUserIds: prev.splitBetweenUserIds.includes(userId)
          ? prev.splitBetweenUserIds.filter(id => id !== userId)
          : [...prev.splitBetweenUserIds, userId]
      };
    });
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
              <img 
                src={group.backgroundImageUrl.startsWith('http') ? group.backgroundImageUrl : `${window.location.origin}${group.backgroundImageUrl}`}
                alt="Group background" 
                className="w-full h-full object-cover"
              />
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
          {/* Left Column - Image Upload, Description and Events */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Upload Card (moved up) */}
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

            {/* Group Event Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                             <div className="flex items-center justify-between mb-6">
                 <h2 className="text-2xl font-bold text-gray-900">Group Events</h2>
                 <button
                   onClick={() => openEventModal()}
                   className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-xl hover:from-green-700 hover:to-emerald-700 font-semibold transition-all duration-200 flex items-center space-x-2 shadow-lg"
                 >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                   </svg>
                   <span>Add Event</span>
                 </button>
               </div>
               
               {groupEvents.length > 0 ? (
                 <div className="space-y-4">
                   {groupEvents.map((event) => (
                     <div key={event.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                       <div className="flex items-stretch space-x-4">
                         {event.imageUrl && (
                           <div className="w-32 bg-gray-200 rounded-xl overflow-hidden flex-shrink-0">
                             <img src={event.imageUrl} alt="Event" className="w-full h-full object-cover" />
                           </div>
                         )}
                         <div className="flex-1">
                           <h3 className="text-xl font-bold text-gray-900 mb-2">{event.name}</h3>
                           {event.description && (
                             <p className="text-gray-600 mb-3">{event.description}</p>
                           )}
                           
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="flex items-center space-x-3">
                               <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                                 <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                 </svg>
                               </div>
                               <div>
                                 <p className="text-sm font-medium text-gray-500">Date</p>
                                 <p className="text-gray-900 font-semibold">
                                   {new Date(event.date).toLocaleDateString()}
                                   {event.time && ` at ${event.time}`}
                                 </p>
                               </div>
                             </div>
                             
                             {event.location && (
                               <div className="flex items-center space-x-3">
                                 <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                                   <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                   </svg>
                                 </div>
                                 <div>
                                   <p className="text-sm font-medium text-gray-500">Location</p>
                                   <p className="text-gray-900 font-semibold">{event.location}</p>
                                 </div>
                               </div>
                             )}
                           </div>
                           
                           {event.ticketmasterEventUrl && (
                             <div className="mt-4">
                               <a
                                 href={event.ticketmasterEventUrl}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
                               >
                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                 </svg>
                                 <span>View on Ticketmaster</span>
                               </a>
                             </div>
                           )}
                           
                           <div className="mt-4">
                             <button
                               onClick={() => handleDeleteEvent(event.id)}
                               className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-4 py-2 rounded-lg hover:from-gray-600 hover:to-gray-700 font-semibold transition-all duration-200 shadow-md hover:shadow-lg flex items-center space-x-2"
                             >
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                               </svg>
                               <span>Delete Event</span>
                             </button>
                           </div>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="text-center py-8">
                   <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                     <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                     </svg>
                   </div>
                   <h3 className="text-lg font-semibold text-gray-900 mb-2">No Events Set</h3>
                   <p className="text-gray-600">This group doesn't have any events planned yet.</p>
                 </div>
               )}
            </div>

            {/* Upload card moved above */}
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

                                     <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                     {expenses.length === 0 ? (
                       <div className="text-center py-8">
                         <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                         </svg>
                         <p className="text-gray-500">No expenses yet</p>
                       </div>
                     ) : (
                                               expenses.map((expense) => (
                          <div key={expense.id} className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleEditExpense(expense)}>
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold text-gray-900">{expense.name}</h3>
                              <div className="flex items-center space-x-2">
                                <span className="text-lg font-bold text-green-600">
                                  {expense.amount} {expense.currency}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteExpense(expense.id);
                                  }}
                                  disabled={isDeletingExpense === expense.id}
                                  className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors p-1"
                                  title="Delete expense"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
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

       {/* Edit Expense Modal */}
       {showEditExpenseModal && editingExpense && (
         <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-2xl font-bold text-gray-900">Edit Expense</h3>
               <button
                 onClick={() => {
                   setShowEditExpenseModal(false);
                   setEditingExpense(null);
                 }}
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
                   value={editingExpense.name}
                   onChange={(e) => setEditingExpense(prev => prev ? { ...prev, name: e.target.value } : null)}
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
                   value={editingExpense.description || ''}
                   onChange={(e) => setEditingExpense(prev => prev ? { ...prev, description: e.target.value } : null)}
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
                     value={editingExpense.amount}
                     onChange={(e) => setEditingExpense(prev => prev ? { ...prev, amount: parseFloat(e.target.value) || 0 } : null)}
                     className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                     placeholder="0.00"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-semibold text-gray-700 mb-2">
                     Currency
                   </label>
                   <select
                     value={editingExpense.currency}
                     onChange={(e) => setEditingExpense(prev => prev ? { ...prev, currency: e.target.value } : null)}
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
                   value={editingExpense.paidByUserId}
                   onChange={(e) => setEditingExpense(prev => prev ? { ...prev, paidByUserId: e.target.value } : null)}
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
                         checked={editingExpense.splitBetweenUserIds.includes(member.id)}
                         onChange={() => handleEditSplitUserToggle(member.id)}
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
                   onClick={() => {
                     setShowEditExpenseModal(false);
                     setEditingExpense(null);
                   }}
                   className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-colors"
                 >
                   Cancel
                 </button>
                 <button
                   onClick={handleUpdateExpense}
                   disabled={isEditingExpense}
                   className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
                 >
                   {isEditingExpense ? 'Updating...' : 'Update Expense'}
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

       {/* Event Modal */}
       {showEventModal && (
         <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-2xl font-bold text-gray-900">
                 {isEditingEvent ? 'Edit Event' : 'Add Event'}
               </h3>
               <button
                 onClick={() => setShowEventModal(false)}
                 className="text-gray-400 hover:text-gray-600 transition-colors"
               >
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
             </div>

             <div className="space-y-4">
               {/* Event Name */}
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-2">
                   Event Name *
                 </label>
                 <input
                   type="text"
                   value={newEvent.name}
                   onChange={(e) => setNewEvent(prev => ({ ...prev, name: e.target.value }))}
                   className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                   placeholder="e.g., Concert, Movie Night, Dinner"
                 />
               </div>

               {/* Description */}
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-2">
                   Description
                 </label>
                 <textarea
                   value={newEvent.description}
                   onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                   rows={3}
                   className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900"
                   placeholder="Optional description..."
                 />
               </div>

               {/* Date and Time */}
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-semibold text-gray-700 mb-2">
                     Date *
                   </label>
                   <input
                     type="date"
                     value={newEvent.date}
                     onChange={(e) => setNewEvent(prev => ({ ...prev, date: e.target.value }))}
                     className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-semibold text-gray-700 mb-2">
                     Time
                   </label>
                   <input
                     type="time"
                     value={newEvent.time}
                     onChange={(e) => setNewEvent(prev => ({ ...prev, time: e.target.value }))}
                     className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                   />
                 </div>
               </div>

               {/* Location */}
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-2">
                   Location
                 </label>
                 <input
                   type="text"
                   value={newEvent.location}
                   onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                   className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                   placeholder="e.g., Concert Hall, Restaurant, Home"
                 />
               </div>

               {/* Ticketmaster Event ID */}
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-2">
                   Ticketmaster Event ID
                 </label>
                 <input
                   type="text"
                   value={newEvent.ticketmasterEventId}
                   onChange={(e) => setNewEvent(prev => ({ ...prev, ticketmasterEventId: e.target.value }))}
                   className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                   placeholder="Optional: Ticketmaster event ID"
                 />
               </div>

               {/* Ticketmaster Event URL */}
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-2">
                   Ticketmaster Event URL
                 </label>
                 <input
                   type="url"
                   value={newEvent.ticketmasterEventUrl}
                   onChange={(e) => setNewEvent(prev => ({ ...prev, ticketmasterEventUrl: e.target.value }))}
                   className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                   placeholder="https://www.ticketmaster.com/..."
                 />
               </div>

               {/* Action Buttons */}
               <div className="flex space-x-3 pt-4">
                 <button
                   onClick={() => setShowEventModal(false)}
                   className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-colors"
                 >
                   Cancel
                 </button>
                                   <button
                    onClick={handleAddEvent}
                    disabled={isAddingEvent}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
                  >
                    {isAddingEvent ? 'Adding...' : 'Add Event'}
                  </button>
               </div>
             </div>
           </div>
         </div>
       )}

       {/* Event Browser Modal */}
       {showEventBrowserModal && (
         <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto border border-gray-200">
             {/* Modal Header */}
             <div className="flex items-center justify-between p-8 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-3xl">
               <div className="flex items-center space-x-4">
                 <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                   <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                   </svg>
                 </div>
                 <div>
                   <h2 className="text-3xl font-bold text-gray-900">Browse Events</h2>
                   <p className="text-gray-600">Select an event from Ticketmaster to add to your group</p>
                 </div>
               </div>
               <button
                 onClick={() => setShowEventBrowserModal(false)}
                 className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-2 hover:bg-gray-100 rounded-full"
               >
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
             </div>

             {/* Modal Content */}
             <div className="p-6">
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
               
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {tmEvents.map((event: any) => (
                   <div 
                     key={event.id} 
                     className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200 transform hover:scale-105 cursor-pointer"
                     onClick={() => handleSelectApiEvent(event)}
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
                                           <div className="p-6 flex flex-col h-full">
                        <h3 className="font-bold text-lg text-gray-900 mb-3 line-clamp-2">{event.name}</h3>
                        <div className="space-y-3 text-sm flex-grow">
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
                        <div className="mt-4 pt-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectApiEvent(event);
                            }}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-sm"
                          >
                            Select This Event
                          </button>
                        </div>
                      </div>
                   </div>
                 ))}
               </div>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 } 