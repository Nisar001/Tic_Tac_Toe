import React, { useEffect, useState, useCallback } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, PlayIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const Game: React.FC = () => {
  const { getActiveGames, createGame, isLoading } = useGame();
  const [games, setGames] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // ...existing code...

  const loadGames = useCallback(async () => {
    setError(null);
    try {
      const response = await getActiveGames();
      setGames(response?.games || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load games');
    }
  }, [getActiveGames]);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  const handleCreateGame = async () => {
    try {
      const game = await createGame({
        gameConfig: {
          gameMode: 'classic',
          isPrivate: false,
        }
      });
      navigate(`/game/${game.roomId || game.room || game.id}`);
    } catch (error) {
      setError('Failed to create game');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Play Game</h1>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          onClick={handleCreateGame}
        >
          <PlusIcon className="w-5 h-5" />
          Create Game
        </button>
      </div>
      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="text-center text-red-600 py-8">{error}</div>
      ) : games.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No active games. Create one to get started!</div>
      ) : (
        <div className="space-y-4">
          {games.map((game) => (
            <div
              key={game.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors duration-200"
              onClick={() => navigate(`/game/${game.roomId || game.room || game.id}`)}
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-4">
                  <PlayIcon className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    Game #{(game.roomId || game.room).slice(0, 8)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {(game.players.player2 ? 2 : 1)}/2 players • {game.status}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  game.status === 'waiting'
                    ? 'bg-yellow-100 text-yellow-800'
                    : game.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {game.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Game;
