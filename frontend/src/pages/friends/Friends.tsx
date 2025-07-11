import React, { useEffect, useState } from 'react';
import { useFriendsContext } from '../../contexts/FriendsContext';
import { FriendsList } from '../../components/friends/FriendsList';
import { FriendRequests } from '../../components/friends/FriendRequests';
import { AddFriend } from '../../components/friends/AddFriend';
import { FaUsers, FaUserPlus, FaBell } from 'react-icons/fa';

export const Friends: React.FC = () => {
  const { state, loadFriends, loadFriendRequests } = useFriendsContext();
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'add'>('friends');

  useEffect(() => {
    loadFriends();
    loadFriendRequests();
  }, [loadFriends, loadFriendRequests]);

  const tabs = [
    {
      id: 'friends' as const,
      label: 'Friends',
      icon: FaUsers,
      count: state.friends.length,
    },
    {
      id: 'requests' as const,
      label: 'Requests',
      icon: FaBell,
      count: state.friendRequests.received.length,
    },
    {
      id: 'add' as const,
      label: 'Add Friend',
      icon: FaUserPlus,
    },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'friends':
        return <FriendsList />;
      case 'requests':
        return <FriendRequests />;
      case 'add':
        return <AddFriend />;
      default:
        return <FriendsList />;
    }
  };

  return (
    <div className="h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <FaUsers className="mr-3 text-blue-600" />
          Friends
        </h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-colors
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <tab.icon className="mr-2" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {state.loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : state.error ? (
          <div className="p-6 text-center text-red-600">
            <p>{state.error}</p>
            <button
              onClick={() => {
                loadFriends();
                loadFriendRequests();
              }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          renderContent()
        )}
      </div>
    </div>
  );
};
