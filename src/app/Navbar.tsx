"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import {
  User,
  FriendRequest,
  GroupInvite,
  EventInvite,
  Notification as AppNotification,
  Group
} from "./api/db";

type PopulatedFriendRequest = FriendRequest & { fromUser?: User; toUser?: User };
type PopulatedGroupInvite = GroupInvite & { fromUser?: User; toUser?: User; group?: Group };
type PopulatedEventInvite = EventInvite & { sender?: User };

export default function Navbar() {
  const { data: session } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [friendRequests, setFriendRequests] = useState<PopulatedFriendRequest[]>([]);
  const [groupInvites, setGroupInvites] = useState<PopulatedGroupInvite[]>([]);
  const [eventInvites, setEventInvites] = useState<PopulatedEventInvite[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const isAuthenticated = !!session;
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Fetch user data to get avatar
  useEffect(() => {
    if (session?.user?.email) {
      async function fetchUser() {
        try {
          const res = await fetch('/api/user');
          if (res.ok) {
            const data = await res.json();
            setUser(data);
          }
        } catch (error) {
          console.error('Failed to fetch user data:', error);
        }
      }
      fetchUser();
    }
  }, [session]);

  // Fetch friend requests and group invitations
  useEffect(() => {
    if (session?.user?.email) {
      async function fetchNotifications() {
        try {
          // Fetch friend requests
          const friendRes = await fetch('/api/friends/requests');
          if (friendRes.ok) {
            const friendData = await friendRes.json();
            setFriendRequests(friendData.requests || []);
          }

          // Fetch group invitations
          const groupRes = await fetch('/api/groups/invites');
          if (groupRes.ok) {
            const groupData = await groupRes.json();
            setGroupInvites(groupData.invites || []);
          }

          // Fetch event invitations
          const eventRes = await fetch('/api/events/invite');
          if (eventRes.ok) {
            const eventData = await eventRes.json();
            setEventInvites(eventData || []);
          }

          // Fetch notifications
          const notificationsRes = await fetch('/api/notifications');
          if (notificationsRes.ok) {
            const notificationsData = await notificationsRes.json();
            setNotifications(notificationsData.notifications || []);
          }
        } catch (error) {
          console.error('Failed to fetch notifications:', error);
        }
      }
      fetchNotifications();
    }
  }, [session]);

  // Handle click outside notifications
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const res = await fetch('/api/friends/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });
      if (res.ok) {
        setFriendRequests(prev => prev.filter(req => req.id !== requestId));
      }
    } catch (error) {
      console.error('Failed to accept friend request:', error);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const res = await fetch('/api/friends/requests', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });
      if (res.ok) {
        setFriendRequests(prev => prev.filter(req => req.id !== requestId));
      }
    } catch (error) {
      console.error('Failed to reject friend request:', error);
    }
  };

  const handleAcceptGroupInvite = async (inviteId: string) => {
    try {
      const res = await fetch('/api/groups/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId }),
      });
      if (res.ok) {
        setGroupInvites(prev => prev.filter(invite => invite.id !== inviteId));
      }
    } catch (error) {
      console.error('Failed to accept group invitation:', error);
    }
  };

  const handleRejectGroupInvite = async (inviteId: string) => {
    try {
      const res = await fetch('/api/groups/invites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId }),
      });
      if (res.ok) {
        setGroupInvites(prev => prev.filter(invite => invite.id !== inviteId));
      }
    } catch (error) {
      console.error('Failed to reject group invite:', error);
    }
  };

  const handleAcceptEventInvite = async (inviteId: string) => {
    try {
      const res = await fetch('/api/events/invite', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, action: 'accept' }),
      });
      if (res.ok) {
        setEventInvites(prev => prev.filter(invite => invite.id !== inviteId));
      }
    } catch (error) {
      console.error('Failed to accept event invite:', error);
    }
  };

  const handleRejectEventInvite = async (inviteId: string) => {
    try {
      const res = await fetch('/api/events/invite', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId }),
      });
      if (res.ok) {
        setEventInvites(prev => prev.filter(invite => invite.id !== inviteId));
      }
    } catch (error) {
      console.error('Failed to reject event invitation:', error);
    }
  };

  const handleMarkNotificationAsRead = async (notificationId: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => 
          n.id === notificationId ? { ...n, isRead: true } : n
        ));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleOpenNotifications = () => {
    const wasOpen = showNotifications;
    setShowNotifications(!showNotifications);
    
    // Mark notifications as read when CLOSING the dropdown (not when opening)
    if (wasOpen) {
      const unreadNotifications = notifications.filter(n => !n.isRead);
      if (unreadNotifications.length > 0) {
        unreadNotifications.forEach(notification => {
          handleMarkNotificationAsRead(notification.id);
        });
      }
    }
  };

  // Don't show navbar for non-authenticated users
  if (!isAuthenticated) {
    return null;
  }

  const totalNotifications = friendRequests.length + groupInvites.length + eventInvites.length + notifications.filter(n => !n.isRead).length;

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-gray-200 px-6 py-4 flex items-center justify-between z-50 shadow-lg">
      {/* Logo */}
      <Link href="/" className="flex items-center space-x-2 group">
        <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent group-hover:from-blue-700 group-hover:to-purple-700 transition-all duration-200">
          LiveALittle
        </span>
      </Link>
      
      {/* Navigation Links */}
      <div className="flex items-center space-x-1">
        <Link 
          href="/friends" 
          className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 group"
        >
          <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="font-medium">Friends</span>
        </Link>
        
        <Link 
          href="/groups" 
          className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-700 hover:text-green-600 hover:bg-green-50 transition-all duration-200 group"
        >
          <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span className="font-medium">Groups</span>
        </Link>
        
        <Link 
          href="/profile" 
          className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-700 hover:text-purple-600 hover:bg-purple-50 transition-all duration-200 group"
        >
          <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="font-medium">Profile</span>
        </Link>
      </div>
      
      {/* User Menu */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={handleOpenNotifications}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-700 hover:text-orange-600 hover:bg-orange-50 transition-all duration-200 group"
          >
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 8a6 6 0 0112 0c0 1.887 0 3.665.138 5.4a2 2 0 01-2 2H8a2 2 0 01-2-2c.138-1.735.138-3.513.138-5.4z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8a3 3 0 016 0v1a3 3 0 11-6 0V8z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12a3 3 0 006 0" />
            </svg>
            <span className="font-medium">Notifications</span>
            {totalNotifications > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {totalNotifications}
              </span>
            )}
          </button>
          
          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-[450px] bg-white rounded-xl shadow-2xl border border-gray-200 z-50">
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h3>
                {totalNotifications === 0 ? (
                  <div className="text-center py-4">
                    <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 8a6 6 0 0112 0c0 1.887 0 3.665.138 5.4a2 2 0 01-2 2H8a2 2 0 01-2-2c.138-1.735.138-3.513.138-5.4z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8a3 3 0 016 0v1a3 3 0 11-6 0V8z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12a3 3 0 006 0" />
                    </svg>
                    <p className="text-gray-500">No new notifications</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {friendRequests.map((request) => (
                      <div key={request.id} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 hover:shadow-md transition-all duration-200">
                        {/* Profile Picture */}
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden shadow-lg">
                            {request.fromUser?.avatarUrl ? (
                              <img 
                                src={request.fromUser.avatarUrl} 
                                alt="Profile" 
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            )}
                          </div>
                        </div>
                        
                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            <span className="font-semibold">{request.fromUser?.name}</span> sent you a friend request
                          </p>
                          <p className="text-xs text-gray-500 truncate">{request.fromUser?.email}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(request.createdAt).toLocaleDateString('pl-PL', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex flex-col space-y-2 flex-shrink-0">
                          <button
                            onClick={() => handleAcceptRequest(request.id)}
                            className="px-3 py-1.5 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 transition-colors duration-200 font-medium shadow-sm"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRejectRequest(request.id)}
                            className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors duration-200 font-medium shadow-sm"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                    {groupInvites.map((invite) => (
                      <div key={invite.id} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg border border-green-200 hover:shadow-md transition-all duration-200">
                        {/* Profile Picture */}
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center overflow-hidden shadow-lg">
                            {invite.fromUser?.avatarUrl ? (
                              <img 
                                src={invite.fromUser.avatarUrl} 
                                alt="Profile" 
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            )}
                          </div>
                        </div>
                        
                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                                                     <p className="text-sm font-medium text-gray-900">
                             <span className="font-semibold">{invite.fromUser?.name}</span> requested you to join a group: <span className="font-semibold">{invite.group?.name}</span>
                           </p>
                          <p className="text-xs text-gray-500 truncate">{invite.fromUser?.email}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(invite.createdAt).toLocaleDateString('pl-PL', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex flex-col space-y-2 flex-shrink-0">
                          <button
                            onClick={() => handleAcceptGroupInvite(invite.id)}
                            className="px-3 py-1.5 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 transition-colors duration-200 font-medium shadow-sm"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRejectGroupInvite(invite.id)}
                            className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors duration-200 font-medium shadow-sm"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                    {eventInvites.map((invite) => (
                      <div key={invite.id} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200 hover:shadow-md transition-all duration-200">
                        {/* Profile Picture */}
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center overflow-hidden shadow-lg">
                            {invite.sender?.avatarUrl ? (
                              <img 
                                src={invite.sender.avatarUrl} 
                                alt="Profile" 
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            )}
                          </div>
                        </div>
                        
                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            <span className="font-semibold">{invite.sender?.name}</span> invited you to an event: <span className="font-semibold">{invite.eventName}</span>
                          </p>
                          <p className="text-xs text-gray-500 truncate">{invite.sender?.email}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(invite.createdAt).toLocaleDateString('pl-PL', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex flex-col space-y-2 flex-shrink-0">
                          <button
                            onClick={() => handleAcceptEventInvite(invite.id)}
                            className="px-3 py-1.5 bg-orange-500 text-white text-xs rounded-lg hover:bg-orange-600 transition-colors duration-200 font-medium shadow-sm"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRejectEventInvite(invite.id)}
                            className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors duration-200 font-medium shadow-sm"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                    {notifications.filter(n => !n.isRead).map((notification) => (
                      <div key={notification.id} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200 hover:shadow-md transition-all duration-200">
                        {/* Icon */}
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                        
                        {/* Notification Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notification.createdAt).toLocaleDateString('pl-PL', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="flex items-center space-x-3 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden">
            {user?.avatarUrl ? (
              <img 
                src={user.avatarUrl} 
                alt="Profile" 
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>
          <div className="text-sm">
            <div className="font-medium text-gray-900">
              {user?.name || session?.user?.name || session?.user?.email?.split('@')[0] || 'User'}
            </div>
            <div className="text-xs text-gray-500">
              {session?.user?.email}
            </div>
          </div>
        </div>
        
        {/* Sign Out Button */}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700 transition-all duration-200 transform hover:scale-105 shadow-lg group"
        >
          <svg className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </nav>
  );
} 