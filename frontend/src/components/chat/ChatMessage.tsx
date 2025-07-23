import React from 'react';
import { ChatMessage as ChatMessageType } from '../../types';

interface ChatMessageProps {
  message: ChatMessageType;
  isOwn: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isOwn }) => {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMessageStyle = () => {
    if (message.type === 'system') {
      return 'bg-gray-100 text-gray-600 text-center italic';
    }
    
    if (isOwn) {
      return 'bg-blue-500 text-white ml-auto';
    }
    
    return 'bg-gray-200 text-gray-900';
  };

  const getContainerStyle = () => {
    if (message.type === 'system') {
      return 'flex justify-center';
    }
    
    return isOwn ? 'flex justify-end' : 'flex justify-start';
  };

  if (message.type === 'system') {
    return (
      <div className={getContainerStyle()}>
        <div className="max-w-xs px-3 py-2 rounded-full text-sm bg-gray-100 text-gray-600 text-center italic">
          {message.message}
        </div>
      </div>
    );
  }

  return (
    <div className={getContainerStyle()}>
      <div className="max-w-xs lg:max-w-md">
        {!isOwn && (
          <div className="text-xs text-gray-500 mb-1 px-2">
            {message.username}
          </div>
        )}
        
        <div className={`px-4 py-2 rounded-lg ${getMessageStyle()}`}>
          <p className="text-sm">{message.message}</p>
          <p className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
            {formatTime(message.timestamp)}
          </p>
        </div>
      </div>
    </div>
  );
};


