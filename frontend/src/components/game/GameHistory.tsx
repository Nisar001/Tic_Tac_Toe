import React, { useState, useEffect } from 'react';
import { ClockIcon, TrophyIcon, UserIcon } from '@heroicons/react/24/outline';
import { useGame } from '../../contexts/GameContext';
import { Game } from '../../types';
import LoadingSpinner from '../ui/LoadingSpinner';

const GameHistory: React.FC = () => {
  const { getActiveGames, isLoading } = useGame();
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    loadGameHistory();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadGameHistory = async () => {
    try {
      const gameList = await getActiveGames();
      setGames(gameList);
    } catch (error) {
      console.error('Failed to load game history:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getGameResultText = (game: Game, currentUserId: string) => {
    if (game.status !== 'completed') {
      return game.status.replace('_', ' ').toUpperCase();
    }

    if (!game.winner) {
      return 'DRAW';
    }

    return game.winner === currentUserId ? 'WIN' : 'LOSS';
  };

  const getGameResultColor = (game: Game, currentUserId: string) => {
    if (game.status !== 'completed') {
      return 'bg-yellow-100 text-yellow-800';
    }

    if (!game.winner) {
      return 'bg-gray-100 text-gray-800';
    }

    return game.winner === currentUserId 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <ClockIcon className="w-6 h-6 mr-2" />
        Game History
      </h2>

      {games.length === 0 ? (
        <div className="text-center py-8">
          <TrophyIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No games played yet</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {games.map((game) => (
            <div
              key={game.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="font-medium text-gray-900">
                      Room: {game.room || game.roomId}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      getGameResultColor(game, 'current-user-id') // You'd get this from auth context
                    }`}>
                      {getGameResultText(game, 'current-user-id')}
                    </span>
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <UserIcon className="w-4 h-4" />
                      <span>{(game.players.player2 ? 2 : 1)}/2 players</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <ClockIcon className="w-4 h-4" />
                      <span>{formatDate(game.createdAt)}</span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center space-x-2">
                    <span className="text-xs text-gray-500">Players:</span>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {game.players.player1?.username} (X)
                    </span>
                    {game.players.player2 && (
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {game.players.player2.username} (O)
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {game.gameType || game.gameMode || 'Classic'}
                  </div>
                  {game.moves && game.moves.length > 0 && (
                    <div className="text-xs text-gray-500">
                      {game.moves.length} moves
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t">
        <button
          onClick={loadGameHistory}
          className="w-full px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
        >
          Refresh History
        </button>
      </div>
    </div>
  );
};

export default GameHistory;
