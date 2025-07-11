import React from 'react';
import { useFriendsContext } from '../../contexts/FriendsContext';
import { FriendRequestCard } from './FriendRequestCard';
import { FaBell } from 'react-icons/fa';

export const FriendRequests: React.FC = () => {
  const { state } = useFriendsContext();

  const receivedRequests = state.friendRequests.received;
  const sentRequests = state.friendRequests.sent;

  if (receivedRequests.length === 0 && sentRequests.length === 0) {
    return (
      <div className="p-8 text-center">
        <FaBell className="mx-auto text-6xl text-gray-300 mb-4" />
        <h3 className="text-xl font-semibold text-gray-600 mb-2">
          No Friend Requests
        </h3>
        <p className="text-gray-500">
          You don't have any pending friend requests.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Received Requests */}
      {receivedRequests.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Received Requests ({receivedRequests.length})
          </h3>
          <div className="space-y-4">
            {receivedRequests.map(request => (
              <FriendRequestCard
                key={request.id}
                request={request}
                type="received"
              />
            ))}
          </div>
        </div>
      )}

      {/* Sent Requests */}
      {sentRequests.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Sent Requests ({sentRequests.length})
          </h3>
          <div className="space-y-4">
            {sentRequests.map(request => (
              <FriendRequestCard
                key={request.id}
                request={request}
                type="sent"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
