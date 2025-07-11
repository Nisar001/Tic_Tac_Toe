import React from 'react';
import { Friend } from '../../services/friends';
import { useFriendsContext } from '../../contexts/FriendsContext';
import { FaCircle, FaEllipsisV, FaComments, FaUserMinus } from 'react-icons/fa';

interface FriendAction {
  label: string;
  icon: React.ComponentType<any>;
  onClick: () => void;
  primary?: boolean;
  danger?: boolean;
}

interface FriendCardProps {
  friend: Friend;
  isOnline: boolean;
  actions?: FriendAction[];
}

export const FriendCard: React.FC<FriendCardProps> = ({ 
  friend, 
  isOnline, 
  actions = [] 
}) => {
  const { removeFriend } = useFriendsContext();

  const defaultActions: FriendAction[] = [
    {
      label: 'Message',
      icon: FaComments,
      onClick: () => {
        // TODO: Implement messaging
        console.log('Message friend:', friend.id);
      },
    },
    {
      label: 'Remove Friend',
      icon: FaUserMinus,
      onClick: () => removeFriend(friend.id),
      danger: true,
    },
  ];

  const allActions = [...actions, ...defaultActions];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
              {friend.username.charAt(0).toUpperCase()}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
              isOnline ? 'bg-green-500' : 'bg-gray-400'
            }`}></div>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900">{friend.username}</h4>
            <div className="flex items-center text-sm text-gray-500">
              <FaCircle className={`w-2 h-2 mr-1 ${isOnline ? 'text-green-500' : 'text-gray-400'}`} />
              {isOnline ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>

        <div className="relative group">
          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
            <FaEllipsisV />
          </button>
          
          {/* Actions Dropdown */}
          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
            {allActions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={`
                  w-full px-4 py-2 text-left text-sm flex items-center space-x-2 transition-colors
                  ${action.danger
                    ? 'text-red-600 hover:bg-red-50'
                    : action.primary
                    ? 'text-blue-600 hover:bg-blue-50'
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                  ${index === 0 ? 'rounded-t-lg' : ''}
                  ${index === allActions.length - 1 ? 'rounded-b-lg' : ''}
                `}
              >
                <action.icon className="w-4 h-4" />
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Friend Stats */}
      <div className="grid grid-cols-2 gap-4 text-center text-sm">
        <div>
          <div className="font-semibold text-gray-900">{Math.round(friend.winRate * 100)}%</div>
          <div className="text-gray-500">Win Rate</div>
        </div>
        <div>
          <div className="font-semibold text-gray-900">{friend.gamesPlayed}</div>
          <div className="text-gray-500">Games</div>
        </div>
      </div>

      {/* Primary Actions */}
      {actions.filter(action => action.primary).length > 0 && (
        <div className="mt-4 space-y-2">
          {actions.filter(action => action.primary).map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <action.icon className="w-4 h-4" />
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
