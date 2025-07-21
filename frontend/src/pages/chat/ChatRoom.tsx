import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useChatContext } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { ChatMessage } from '../../components/chat/ChatMessage';
import { ChatInput } from '../../components/chat/ChatInput';
import { ChatHeader } from '../../components/chat/ChatHeader';
import { toast } from 'react-toastify';
import { FaSpinner } from 'react-icons/fa';

interface ChatRoomProps {
  roomId: string;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ roomId }) => {
  const { state, loadMessages, sendMessage, joinRoom, deleteChatRoom, getChatRoomUsers } = useChatContext();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [showUsers, setShowUsers] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const room = state.rooms.find(r => r.id === roomId);
  const messages = useMemo(() => state.messages[roomId] || [], [state.messages, roomId]);

  // Check if user can delete (room creator or admin)
  const canDelete = user && room && (room.createdBy === user._id || (user as any).role === 'admin');

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, joinRoom, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    try {
      await sendMessage(roomId, content);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleViewUsers = async () => {
    setShowUsers(true);
    try {
      const usersList = await getChatRoomUsers(roomId);
      setUsers(usersList);
    } catch {
      toast.error('Failed to load users');
    }
  };

  const handleDeleteRoom = async () => {
    setDeleting(true);
    try {
      await deleteChatRoom(roomId);
      toast.success('Room deleted');
    } catch {
      toast.error('Failed to delete room');
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  };

  const [retrying, setRetrying] = useState(false);

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

  if (state.error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-2">{state.error}</div>
          <button
            onClick={async () => {
              setRetrying(true);
              try {
                await joinRoom(roomId);
                await loadMessages(roomId);
              } catch (err) {}
              setRetrying(false);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            disabled={retrying}
          >
            {retrying ? 'Retrying...' : 'Retry'}
          </button>
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
        onViewUsers={handleViewUsers}
        onDeleteRoom={canDelete ? () => setShowDelete(true) : undefined}
        canDelete={!!canDelete}
      />
      {/* Users Modal */}
      {showUsers && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 min-w-[300px] max-w-[90vw]">
            <h3 className="text-lg font-bold mb-4">Room Users</h3>
            <ul className="mb-4 max-h-60 overflow-y-auto">
              {users.length === 0 ? (
                <li className="text-gray-500">No users found</li>
              ) : (
                users.map((u: any) => (
                  <li key={u._id || u.id} className="py-1 flex items-center gap-2">
                    <img src={u.avatar || u.profilePicture || '/default-avatar.png'} alt="avatar" className="w-6 h-6 rounded-full" />
                    <span>{u.username}</span>
                  </li>
                ))
              )}
            </ul>
            <button onClick={() => setShowUsers(false)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Close</button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 min-w-[300px] max-w-[90vw]">
            <h3 className="text-lg font-bold mb-4">Delete Room?</h3>
            <p className="mb-4">Are you sure you want to delete this chat room? This action cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={handleDeleteRoom} disabled={deleting} className="px-4 py-2 bg-red-600 text-white rounded-lg">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
              <button onClick={() => setShowDelete(false)} className="px-4 py-2 bg-gray-300 rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}

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
