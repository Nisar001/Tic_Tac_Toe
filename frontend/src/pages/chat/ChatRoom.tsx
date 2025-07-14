import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useChatContext } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { ChatMessage } from '../../components/chat/ChatMessage';
import { ChatInput } from '../../components/chat/ChatInput';
import { ChatHeader } from '../../components/chat/ChatHeader';
import { FaSpinner } from 'react-icons/fa';

interface ChatRoomProps {
  roomId: string;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ roomId }) => {
  const { state, loadMessages, sendMessage, joinRoom } = useChatContext();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const room = state.rooms.find(r => r.id === roomId);
  const messages = useMemo(() => state.messages[roomId] || [], [state.messages, roomId]);

  useEffect(() => {
    const initializeRoom = async () => {
      setIsLoading(true);
      try {
        await joinRoom(roomId);
        await loadMessages(roomId);
      } catch (error) {
        console.error('Failed to initialize chat room:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeRoom();
  }, [roomId, joinRoom, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (content: string) => {
    try {
      await sendMessage(roomId, content);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  if (!room) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="mx-auto text-4xl text-gray-400 animate-spin mb-4" />
          <p className="text-gray-600">Loading room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <ChatHeader 
        room={room} 
        onlineUsers={state.onlineUsers[roomId] || []} 
      />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage 
              key={message.id} 
              message={message} 
              isOwn={message.userId === user?.id} 
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 bg-white">
        <ChatInput onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
};
