import React, { useEffect, useState } from 'react';
import { useChatContext } from '../../contexts/ChatContext';
import { ChatRoom } from './ChatRoom';
import { ChatRoomList } from '../../components/chat/ChatRoomList';
import CreateChatRoom from '../../components/chat/CreateChatRoom';
import { FaComments, FaUsers, FaSearch } from 'react-icons/fa';

export const Chat: React.FC = () => {
  const { state, loadRooms, setActiveRoom } = useChatContext();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const filteredRooms = state.rooms.filter(room =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRoomSelect = (roomId: string) => {
    setActiveRoom(roomId);
  };

  return (
    <div className="flex h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Sidebar with room list */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <FaComments className="mr-2 text-blue-600" />
              Chat Rooms
            </h2>
            <div className="flex items-center text-sm text-gray-600">
              <FaUsers className="mr-1" />
              {state.rooms.length}
            </div>
          </div>
          {/* Search */}
          <div className="relative mb-2">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search rooms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {/* Create Chat Room */}
          <CreateChatRoom />
        </div>

        {/* Room List */}
        <div className="flex-1 overflow-y-auto">
          {state.loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : state.error ? (
            <div className="p-4 text-center text-red-600">
              <p>{state.error}</p>
              <button
                onClick={loadRooms}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <ChatRoomList
              rooms={filteredRooms}
              activeRoom={state.activeRoom}
              onRoomSelect={handleRoomSelect}
              onlineUsers={state.onlineUsers}
            />
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {state.activeRoom ? (
          <ChatRoom roomId={state.activeRoom} />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <FaComments className="mx-auto text-6xl text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                Welcome to Chat
              </h3>
              <p className="text-gray-500">
                Select a room from the sidebar to start chatting
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
