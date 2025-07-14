import React from 'react';
import { ChatRoom as ChatRoomType } from '../../types';
import { FaHashtag, FaUsers, FaCircle } from 'react-icons/fa';

interface ChatRoomListProps {
  rooms: ChatRoomType[];
  activeRoom: string | null;
  onRoomSelect: (roomId: string) => void;
  onlineUsers: { [roomId: string]: string[] };
}

export const ChatRoomList: React.FC<ChatRoomListProps> = ({
  rooms,
  activeRoom,
  onRoomSelect,
  onlineUsers,
}) => {
  const formatLastMessage = (room: ChatRoomType) => {
    if (!room.lastMessage) return { content: 'No messages yet', time: '' };
    
    const { message, timestamp } = room.lastMessage;
    const time = new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    
    return {
      content: message.length > 30 ? `${message.substring(0, 30)}...` : message,
      time,
    };
  };

  const getRoomIcon = (room: ChatRoomType) => {
    switch (room.type) {
      case 'game':
        return <FaUsers className="w-4 h-4" />;
      case 'private':
        return <FaCircle className="w-4 h-4" />;
      default:
        return <FaHashtag className="w-4 h-4" />;
    }
  };

  const getOnlineCount = (roomId: string) => {
    return onlineUsers[roomId]?.length || 0;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold text-gray-800">Chat Rooms</h3>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {rooms.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No chat rooms available
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {rooms.map((room) => {
              const isActive = activeRoom === room.id;
              const onlineCount = getOnlineCount(room.id);
              const lastMessage = formatLastMessage(room);
              
              return (
                <div
                  key={room.id}
                  onClick={() => onRoomSelect(room.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-blue-50 border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                        {getRoomIcon(room)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className={`font-medium truncate ${
                            isActive ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {room.name}
                          </h4>
                          {onlineCount > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {onlineCount}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-sm text-gray-500 truncate">
                            {lastMessage.content}
                          </p>
                          {lastMessage.time && (
                            <span className="text-xs text-gray-400 ml-2">
                              {lastMessage.time}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatRoomList;
