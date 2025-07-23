import React, { useEffect, useState, useCallback } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useAPIManager } from '../../contexts/APIManagerContext';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, PlayIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const Game: React.FC = () => {
  const { getActiveGames, createGame, isLoading } = useGame();
  const { loading, errors } = useAPIManager();
  const [games, setGames] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const navigate = useNavigate();

  const loadGames = useCallback(async () => {
    setError(null);
    setRetrying(false);
    try {
      const games = await getActiveGames();
      setGames(games);
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
        gameMode: 'classic',
        isPrivate: false,
        maxPlayers: 2,
        timeLimit: 300, // seconds
        gameName: 'Quick Match',
        password: '',
      });
      navigate(`/game/${game.roomId || game.room || game.id}`);
    } catch (error) {
      setError('Failed to create game');
    }
  };
// ...existing code...
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

      {/* API Manager Status */}
      {(Object.keys(loading).length > 0 || Object.keys(errors).length > 0) && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">API Status</h3>
          <div className="space-y-2">
            {Object.entries(loading).map(([key, isLoading]) => 
              isLoading && (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-gray-600">Loading {key}...</span>
                </div>
              )
            )}
            {Object.entries(errors).map(([key, error]) => 
              error && (
                <div key={key} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-red-600">{key}: {error}</span>
                  </div>
                  <button
                    onClick={() => loadGames()}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  >
                    <ArrowPathIcon className="w-3 h-3" />
                    Retry
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      )}
      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="text-center text-red-600 py-8">
          {error}
          <br />
          <button
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            onClick={loadGames}
            disabled={retrying}
          >
            {retrying ? 'Retrying...' : 'Retry'}
          </button>
        </div>
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
                    Game #{(game.roomId || game.room || game.id).slice(0, 8)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {(game.players?.player2 ? 2 : 1)}/2 players • {game.status}
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
}

export default Game;


