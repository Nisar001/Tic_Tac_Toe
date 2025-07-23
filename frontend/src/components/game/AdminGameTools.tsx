import React, { useState } from 'react';
import { useGame } from '../../contexts/GameContext';
import { toast } from 'react-hot-toast';

const AdminGameTools: React.FC = () => {
  const { forceMatch, cleanupQueue } = useGame();
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [loading, setLoading] = useState(false);

  const handleForceMatch = async () => {
    if (!player1 || !player2) {
      toast.error('Please enter both player IDs');
      return;
    }
    setLoading(true);
    try {
      await forceMatch(player1, player2);
      toast.success('Force match successful');
    } catch (e) {
      toast.error('Force match failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupQueue = async () => {
    setLoading(true);
    try {
      await cleanupQueue();
      toast.success('Queue cleaned up');
    } catch (e) {
      toast.error('Cleanup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-6">
      <h2 className="text-lg font-bold mb-4">Admin Game Tools</h2>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Player 1 ID</label>
        <input
          type="text"
          value={player1}
          onChange={e => setPlayer1(e.target.value)}
          className="border rounded px-2 py-1 w-full mb-2"
        />
        <label className="block text-sm font-medium mb-1">Player 2 ID</label>
        <input
          type="text"
          value={player2}
          onChange={e => setPlayer2(e.target.value)}
          className="border rounded px-2 py-1 w-full mb-2"
        />
        <button
          onClick={handleForceMatch}
          className="bg-blue-600 text-white px-4 py-2 rounded mr-2"
          disabled={loading}
        >
          Force Match
        </button>
      </div>
      <div>
        <button
          onClick={handleCleanupQueue}
          className="bg-red-600 text-white px-4 py-2 rounded"
          disabled={loading}
        >
          Cleanup Queue
        </button>
      </div>
    </div>
  );
};

export default AdminGameTools;


