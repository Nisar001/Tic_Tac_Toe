import React from 'react';
import { useFriendsContext } from '../../contexts/FriendsContext';
import { FriendCard } from './FriendCard';
import { FaUsers, FaGamepad } from 'react-icons/fa';

export const FriendsList: React.FC = () => {
  const { state } = useFriendsContext();

  if (state.friends.length === 0) {
    return (
      <div className="p-8 text-center">
        <FaUsers className="mx-auto text-6xl text-gray-300 mb-4" />
        <h3 className="text-xl font-semibold text-gray-600 mb-2">
          No Friends Yet
        </h3>
        <p className="text-gray-500">
          Add some friends to start playing together!
        </p>
      </div>
    );
  }

  const onlineFriends = state.friends.filter(friend => 
    state.onlineFriends.includes(friend.id)
  );
  const offlineFriends = state.friends.filter(friend => 
    !state.onlineFriends.includes(friend.id)
  );

  return (
    <div className="p-6">
      {/* Online Friends */}
      {onlineFriends.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <h3 className="text-lg font-semibold text-gray-900">
              Online ({onlineFriends.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {onlineFriends.map(friend => (
              <FriendCard
                key={friend.id}
                friend={friend}
                isOnline={true}
                actions={[
                  {
                    label: 'Invite to Game',
                    icon: FaGamepad,
                    onClick: () => {
                      // TODO: Implement game invitation
                    },
                    primary: true,
                  },
                ]}
              />
            ))}
          </div>
        </div>
      )}

      {/* Offline Friends */}
      {offlineFriends.length > 0 && (
        <div>
          <div className="flex items-center mb-4">
            <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
            <h3 className="text-lg font-semibold text-gray-900">
              Offline ({offlineFriends.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {offlineFriends.map(friend => (
              <FriendCard
                key={friend.id}
                friend={friend}
                isOnline={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
