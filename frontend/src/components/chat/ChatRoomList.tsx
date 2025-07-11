import React from 'react';
import { ChatRoom as ChatRoomType } from '../../services/chat';
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
    if (!room.lastMessage) return 'No messages yet';
    
    const { content, createdAt } = room.lastMessage;
    const time = new Date(createdAt).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    return {
      content: content.length > 30 ? `${content.substring(0, 30)}...` : content,
      time,
    };
  };

  const getRoomTypeIcon = (type: string) => {
    switch (type) {
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

  if (rooms.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <FaUsers className="mx-auto text-4xl mb-2" />
        <p>No chat rooms available</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 p-2">
      {rooms.map((room) => {
        const isActive = room.id === activeRoom;
        const onlineCount = onlineUsers[room.id]?.length || 0;
        const lastMessage = formatLastMessage(room);
        
        return (
          <div
            key={room.id}
            onClick={() => onRoomSelect(room.id)}
            className={`
              p-3 rounded-lg cursor-pointer transition-all duration-200
              ${isActive 
                ? 'bg-blue-100 border-l-4 border-blue-500' 
                : 'hover:bg-gray-100'
              }
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                {getRoomTypeIcon(room.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className={`
                      font-medium truncate
                      ${isActive ? 'text-blue-900' : 'text-gray-900'}
                    `}>
                      {room.name}
                    </h4>
                    {typeof lastMessage === 'object' && lastMessage.time && (
                      <span className="text-xs text-gray-500 ml-2">
                        {lastMessage.time}
                      </span>
                    )}
                  </div>
                  
                  <p className={`
                    text-sm truncate mt-1
                    ${isActive ? 'text-blue-700' : 'text-gray-600'}
                  `}>
                    {typeof lastMessage === 'object' ? lastMessage.content : lastMessage}
                  </p>
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <FaUsers className="text-xs" />
                      <span>{room.participants.length}</span>
                      {onlineCount > 0 && (
                        <>
                          <span>•</span>
                          <FaCircle className="text-green-500 text-xs" />
                          <span>{onlineCount} online</span>
                        </>
                      )}
                    </div>
                    
                    {room.type === 'game' && (
                      <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        Game Chat
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
