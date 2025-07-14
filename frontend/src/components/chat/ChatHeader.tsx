import React from 'react';
import { FaCircle, FaUsers, FaHashtag } from 'react-icons/fa';
import { ChatRoom } from '../../types';

interface ChatHeaderProps {
  room?: ChatRoom;
  roomName?: string;
  roomType?: string;
  onlineUsers: string[];
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  room,
  roomName,
  roomType,
  onlineUsers,
}) => {
  const displayName = room?.name || roomName || 'Chat Room';
  const displayType = room?.type || roomType || 'group';

  const getRoomIcon = () => {
    switch (displayType) {
      case 'game':
        return <FaCircle className="text-green-500" />;
      case 'direct':
        return <FaCircle className="text-blue-500" />;
      case 'group':
        return <FaHashtag className="text-purple-500" />;
      default:
        return <FaHashtag className="text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (displayType) {
      case 'game':
        return `Game Chat • ${onlineUsers.length} online`;
      case 'direct':
        return onlineUsers.length > 1 ? 'Online' : 'Offline';
      case 'group':
        return `${onlineUsers.length} members online`;
      default:
        return `${onlineUsers.length} online`;
    }
  };

  return (
    <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {getRoomIcon()}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{displayName}</h2>
            <p className="text-sm text-gray-500">{getStatusText()}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <FaUsers className="text-gray-400" />
          <span className="text-sm text-gray-600">{onlineUsers.length}</span>
        </div>
      </div>
    </div>
  );
};
