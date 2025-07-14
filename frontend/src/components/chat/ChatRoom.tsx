import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage as ChatMessageType } from '../../types';
import { ChatHeader } from './ChatHeader';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';

interface ChatRoomProps {
  roomId: string;
  roomName: string;
  roomType: string;
  messages: ChatMessageType[];
  onlineUsers: string[];
  typingUsers: string[];
  onSendMessage: (content: string) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  currentUserId: string;
  isLoading?: boolean;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({
  roomId,
  roomName,
  roomType,
  messages,
  onlineUsers,
  typingUsers,
  onSendMessage,
  onTyping,
  onStopTyping,
  currentUserId,
  isLoading = false,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleTyping = () => {
    onTyping();
  };

  const handleStopTyping = () => {
    onStopTyping();
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <ChatHeader
        roomName={roomName}
        roomType={roomType}
        onlineUsers={onlineUsers}
      />
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-32 text-gray-500">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              isOwn={msg.userId === currentUserId}
            />
          ))
        )}
        
        {typingUsers.length > 0 && (
          <TypingIndicator users={typingUsers} />
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <ChatInput
        value={message}
        onChange={setMessage}
        onSend={handleSendMessage}
        onTyping={handleTyping}
        onStopTyping={handleStopTyping}
        disabled={isLoading}
      />
    </div>
  );
};
