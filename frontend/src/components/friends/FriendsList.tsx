
import React, { useEffect, useState } from 'react';
import { useFriendsContext } from '../../contexts/FriendsContext';
import { FriendCard } from './FriendCard';
import { FaUsers, FaGamepad } from 'react-icons/fa';
import friendsAPI from '../../services/friends';


interface FriendsListProps {
  search?: string;
}

export const FriendsList: React.FC<FriendsListProps> = ({ search = '' }) => {
  const { state } = useFriendsContext();
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state.friends.length === 0) {
      setLoadingAll(true);
      setError(null);
      friendsAPI.getFriends()
        .then((users: any[]) => {
          setAllUsers(users || []);
          setLoadingAll(false);
        })
        .catch((err: any) => {
          setError('Failed to load suggested users.');
          setLoadingAll(false);
        });
    }
  }, [state.friends.length]);

  if (state.friends.length === 0) {
    return (
      <div className="p-8 text-center">
        <FaUsers className="mx-auto text-6xl text-gray-300 mb-4" />
        <h3 className="text-xl font-semibold text-gray-600 mb-2">
          No Friends Yet
        </h3>
        <p className="text-gray-500 mb-4">
          Add some friends to start playing together!
        </p>
        {error && (
          <div className="text-red-500 mb-2">{error}</div>
        )}
        {loadingAll ? (
          <div>Loading users...</div>
        ) : allUsers.length > 0 ? (
          <>
            <h4 className="text-lg font-semibold text-gray-700 mb-2">Suggested Users</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allUsers.map(user => (
                <FriendCard
                  key={user.id || user._id}
                  friend={{ id: user.id || user._id, user, friendSince: user.createdAt || '', status: 'offline' }}
                  isOnline={false}
                  actions={[]}
                />
              ))}
            </div>
          </>
        ) : !error && !loadingAll ? (
          <div className="text-gray-400">No users found.</div>
        ) : null}
      </div>
    );
  }


  // Filter friends by search string (case-insensitive)
  const filterBySearch = (friends: typeof state.friends) => {
    if (!search.trim()) return friends;
    return friends.filter(friend =>
      friend.user.username.toLowerCase().includes(search.trim().toLowerCase()) ||
      friend.user.email.toLowerCase().includes(search.trim().toLowerCase())
    );
  };

  const onlineFriends = filterBySearch(state.friends.filter(friend => 
    state.onlineFriends.includes(friend.id)
  ));
  const offlineFriends = filterBySearch(state.friends.filter(friend => 
    !state.onlineFriends.includes(friend.id)
  ));

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
