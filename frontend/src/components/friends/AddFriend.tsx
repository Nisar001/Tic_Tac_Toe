import React, { useState } from 'react';
import { useFriendsContext } from '../../contexts/FriendsContext';
import { FaUserPlus, FaSearch, FaEnvelope, FaUser } from 'react-icons/fa';

export const AddFriend: React.FC = () => {
  const { searchUsers, sendFriendRequest } = useFriendsContext();
  const [searchType, setSearchType] = useState<'email' | 'username'>('username');
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await searchUsers(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async (user: any) => {
    setIsSending(true);
    try {
      await sendFriendRequest({
        [searchType === 'email' ? 'receiverEmail' : 'receiverUsername']: 
          searchType === 'email' ? user.email : user.username,
        message: message.trim() || undefined,
      });
      
      // Clear form
      setSearchQuery('');
      setMessage('');
      setSearchResults([]);
    } catch (error) {
      console.error('Failed to send friend request:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center mb-6">
          <FaUserPlus className="mx-auto text-4xl text-blue-600 mb-3" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Add New Friend</h2>
          <p className="text-gray-600">
            Search for users by email or username to send friend requests.
          </p>
        </div>

        {/* Search Type Toggle */}
        <div className="flex rounded-lg border border-gray-300 mb-4">
          <button
            onClick={() => setSearchType('username')}
            className={`flex-1 px-4 py-2 rounded-l-lg transition-colors flex items-center justify-center space-x-2 ${
              searchType === 'username'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <FaUser className="w-4 h-4" />
            <span>Username</span>
          </button>
          <button
            onClick={() => setSearchType('email')}
            className={`flex-1 px-4 py-2 rounded-r-lg transition-colors flex items-center justify-center space-x-2 ${
              searchType === 'email'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <FaEnvelope className="w-4 h-4" />
            <span>Email</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <input
              type={searchType === 'email' ? 'email' : 'text'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Enter ${searchType}...`}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!searchQuery.trim() || isSearching}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <FaSearch className="w-4 h-4" />
            <span>{isSearching ? 'Searching...' : 'Search'}</span>
          </button>
        </div>

        {/* Optional Message */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Optional Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a personal message to your friend request..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Search Results</h3>
            {searchResults.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{user.username}</h4>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleSendRequest(user)}
                  disabled={isSending}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  <FaUserPlus className="w-4 h-4" />
                  <span>{isSending ? 'Sending...' : 'Add Friend'}</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {searchResults.length === 0 && searchQuery && !isSearching && (
          <div className="text-center py-8">
            <p className="text-gray-500">No users found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};
