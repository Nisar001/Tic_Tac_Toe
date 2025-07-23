import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useFriendsContext } from '../../contexts/FriendsContext';
import { useAPIManager } from '../../contexts/APIManagerContext';
import { FriendsList } from '../../components/friends/FriendsList';
import { FriendRequests } from '../../components/friends/FriendRequests';
import { AddFriend } from '../../components/friends/AddFriend';
import { BlockedUsers } from '../../components/friends/BlockedUsers';
import { FaUsers, FaUserPlus, FaBell, FaBan, FaRedo } from 'react-icons/fa';

export const Friends: React.FC = () => {
  const { state, loadFriends, loadFriendRequests } = useFriendsContext();
  const { loading, errors, retryCount, retry, resetAPIState } = useAPIManager();
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'add' | 'blocked'>('friends');
  const [search, setSearch] = useState('');

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
    {
      id: 'blocked' as const,
      label: 'Blocked',
      icon: FaBan,
    },
  ];

  // Enhanced empty states
  const renderContent = () => {
    switch (activeTab) {
      case 'friends':
        if (state.friends.length === 0) {
          return <div className="p-8 text-center text-gray-400">No friends yet. Add some friends to get started!</div>;
        }
        return <FriendsList search={search} />;
      case 'requests':
        if (state.friendRequests.received.length === 0 && state.friendRequests.sent.length === 0) {
          return <div className="p-8 text-center text-gray-400">No friend requests.</div>;
        }
        return <FriendRequests />;
      case 'add':
        return <AddFriend />;
      case 'blocked':
        return <BlockedUsers />;
      default:
        return <FriendsList search={search} />;
    }
  };

  return (
    <div className="h-full bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center">
          <FaUsers className="mr-3 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Friends</h1>
        </div>
        {/* Search bar only for friends tab */}
        {activeTab === 'friends' && (
          <input
            type="text"
            placeholder="Search friends..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        )}
      </div>

      {/* API Manager Status & Retry Section */}
      {(errors.loadFriends || loading.loadFriends || errors.sendFriendRequest) && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-4">
          <div className="flex flex-wrap gap-3 items-center">
            {loading.loadFriends && (
              <div className="flex items-center text-sm text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Loading friends...
              </div>
            )}
            
            {errors.loadFriends && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-600">Failed to load friends</span>
                <button
                  onClick={() => retry('loadFriends', () => loadFriends(true))}
                  className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm"
                >
                  <FaRedo className="h-3 w-3" />
                  Retry ({retryCount.loadFriends || 0})
                </button>
              </div>
            )}
            
            {errors.sendFriendRequest && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-600">Friend request failed</span>
                <button
                  onClick={() => resetAPIState('sendFriendRequest')}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <nav className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                toast.success(tab.label + ' tab selected', { id: 'tab-toast', duration: 800 });
              }}
              className={`
                flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-all duration-200
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 bg-blue-50 shadow-sm'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
              title={tab.label}
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
      <div className="flex-1 overflow-y-auto bg-gray-50">
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


