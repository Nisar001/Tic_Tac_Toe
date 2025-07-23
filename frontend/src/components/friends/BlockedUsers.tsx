import React, { useEffect, useState } from 'react';
import friendsAPI from '../../services/friends';
import { FaBan } from 'react-icons/fa';

export const BlockedUsers: React.FC = () => {
  const [blocked, setBlocked] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    friendsAPI.getBlockedUsers()
      .then(users => {
        setBlocked(users || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load blocked users.');
        setLoading(false);
      });
  }, []);

  const handleUnblock = async (userId: string) => {
    try {
      await friendsAPI.unblockUser(userId);
      setBlocked(blocked.filter(u => (u.id || u._id) !== userId));
    } catch {
      setError('Failed to unblock user.');
    }
  };

  if (loading) return <div className="p-6 text-center">Loading blocked users...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <FaBan className="mr-2 text-red-500" /> Blocked Users
      </h3>
      {blocked.length === 0 ? (
        <div className="text-gray-500">You have not blocked any users.</div>
      ) : (
        <ul className="space-y-4">
          {blocked.map(user => (
            <li key={user.id || user._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{user.username}</h4>
                  {user.email && <p className="text-sm text-gray-500">{user.email}</p>}
                </div>
              </div>
              <button
                onClick={() => handleUnblock(user.id || user._id)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Unblock
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};


