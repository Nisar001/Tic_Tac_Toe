import React from 'react';
import { FriendRequest } from '../../types';
import { useFriendsContext } from '../../contexts/FriendsContext';
import { FaCheck, FaTimes, FaClock } from 'react-icons/fa';

interface FriendRequestCardProps {
  request: FriendRequest;
  type: 'sent' | 'received';
}

export const FriendRequestCard: React.FC<FriendRequestCardProps> = ({ 
  request, 
  type 
}) => {
  const { acceptFriendRequest, rejectFriendRequest } = useFriendsContext();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleAccept = () => {
    acceptFriendRequest(request.id);
  };

  const handleReject = () => {
    rejectFriendRequest(request.id);
  };

  const handleCancel = () => {
    // For sent requests, we can reject them on our end
    rejectFriendRequest(request.id);
  };

  const displayUser = type === 'received' 
    ? request.sender 
    : request.recipient;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
            {displayUser.username.charAt(0).toUpperCase()}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h4 className="font-semibold text-gray-900">{displayUser.username}</h4>
              {type === 'sent' && (
                <div className="flex items-center text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                  <FaClock className="w-3 h-3 mr-1" />
                  Pending
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500">{displayUser.email}</p>
            <p className="text-xs text-gray-400 mt-1">
              {formatDate(request.sentAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {type === 'received' ? (
            <>
              <button
                onClick={handleAccept}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <FaCheck className="w-4 h-4" />
                <span>Accept</span>
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
              >
                <FaTimes className="w-4 h-4" />
                <span>Reject</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
            >
              <FaTimes className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


