import React from 'react';
import { ClockIcon, UserIcon, TrophyIcon } from '@heroicons/react/24/outline';
import { Game, User } from '../../types';

interface GameInfoProps {
  game: Game;
  currentUser: User;
  onForfeit?: () => void;
}

const GameInfo: React.FC<GameInfoProps> = ({ game, currentUser, onForfeit }) => {
  const player1 = game.players.player1;
  const player2 = game.players.player2;
  
  const formatDuration = (timeLimit: number) => {
    const mins = Math.floor(timeLimit / 60);
    const secs = timeLimit % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-800">Game Info</h2>
      
      {/* Game Status */}
      <div className="flex items-center space-x-2">
        <TrophyIcon className="w-5 h-5 text-yellow-500" />
        <span className="font-medium">Status:</span>
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          game.status === 'in_progress' ? 'bg-green-100 text-green-800' :
          game.status === 'completed' ? 'bg-blue-100 text-blue-800' :
          game.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {game.status.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      {/* Game Time Limit */}
      {game.timeLimit && (
        <div className="flex items-center space-x-2">
          <ClockIcon className="w-5 h-5 text-blue-500" />
          <span className="font-medium">Time Limit:</span>
          <span className="text-gray-600">{formatDuration(game.timeLimit)}</span>
        </div>
      )}

      {/* Players */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-700">Players</h3>
        
        {player1 && (
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <UserIcon className="w-5 h-5 text-blue-600" />
              <span className="font-medium">{player1.username}</span>
              <span className="text-sm text-gray-600">(X)</span>
            </div>
            {game.currentPlayer === 'X' && (
              <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                Current Turn
              </span>
            )}
          </div>
        )}

        {player2 ? (
          <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <UserIcon className="w-5 h-5 text-red-600" />
              <span className="font-medium">{player2.username}</span>
              <span className="text-sm text-gray-600">(O)</span>
            </div>
            {game.currentPlayer === 'O' && (
              <span className="px-2 py-1 bg-red-600 text-white text-xs rounded-full">
                Current Turn
              </span>
            )}
          </div>
        ) : (
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <span className="text-gray-500">Waiting for second player...</span>
          </div>
        )}
      </div>

      {/* Winner */}
      {game.winner && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <TrophyIcon className="w-6 h-6 text-green-600" />
            <span className="font-semibold text-green-800">
              Winner: {game.winner === currentUser.id ? 'You!' : 'Opponent'}
            </span>
          </div>
        </div>
      )}

      {/* Draw */}
      {game.status === 'completed' && !game.winner && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-center">
            <span className="font-semibold text-gray-700">It's a draw!</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {game.status === 'in_progress' && onForfeit && (
        <div className="pt-4 border-t">
          <button
            onClick={onForfeit}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Forfeit Game
          </button>
        </div>
      )}
    </div>
  );
};

export default GameInfo;
