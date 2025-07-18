import React, { useState } from 'react';
import { useChatContext } from '../../contexts/ChatContext';
import { FaPlus, FaUsers } from 'react-icons/fa';

const CreateChatRoom: React.FC = () => {
  const { createRoom } = useChatContext();
  const [roomName, setRoomName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateRoom = async () => {
    if (!roomName.trim()) return;
    setIsCreating(true);
    setError(null);
    try {
      await createRoom(roomName.trim());
      setRoomName('');
    } catch (err: any) {
      setError(err?.message || 'Failed to create chat room');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
      <FaUsers className="text-blue-600" />
      <input
        type="text"
        placeholder="New chat room name..."
        value={roomName}
        onChange={e => setRoomName(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg flex-1"
        disabled={isCreating}
      />
      <button
        onClick={handleCreateRoom}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        disabled={isCreating || !roomName.trim()}
      >
        <FaPlus />
      </button>
      {error && <span className="text-red-600 text-sm ml-2">{error}</span>}
    </div>
  );
};

export default CreateChatRoom;
