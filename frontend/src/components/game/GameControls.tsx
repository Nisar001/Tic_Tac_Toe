import React from 'react';
import { Game } from '../../types';
import { Flag, RotateCcw, MessageSquare, Users } from 'lucide-react';

interface GameControlsProps {
  game: Game;
  currentUserId: string;
  onForfeit: () => void;
  onRequestRematch?: () => void;
  onToggleChat?: () => void;
  onInviteSpectators?: () => void;
  isChatOpen?: boolean;
  spectatorCount?: number;
}

export const GameControls: React.FC<GameControlsProps> = ({
  game,
  currentUserId,
  onForfeit,
  onRequestRematch,
  onToggleChat,
  onInviteSpectators,
  isChatOpen = false,
  spectatorCount = 0
}) => {
  const player1Id = typeof game.players.player1 === 'string' ? game.players.player1 : game.players.player1?.id;
  const player2Id = typeof game.players.player2 === 'string' ? game.players.player2 : game.players.player2?.id;
  const isPlayerInGame = player1Id === currentUserId || player2Id === currentUserId;
  const canForfeit = game.status === 'active' && isPlayerInGame;
  const canRequestRematch = game.status === 'completed' && isPlayerInGame;
  const showSpectatorControls = game.gameType === 'custom' && isPlayerInGame;

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold mb-4">Game Controls</h3>
      
      <div className="space-y-3">
        {/* Forfeit Button */}
        {canForfeit && (
          <button
            onClick={onForfeit}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            <Flag className="w-4 h-4" />
            Forfeit Game
          </button>
        )}

        {/* Rematch Button */}
        {canRequestRematch && onRequestRematch && (
          <button
            onClick={onRequestRematch}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Request Rematch
          </button>
        )}

        {/* Chat Toggle */}
        {onToggleChat && (
          <button
            onClick={onToggleChat}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors ${
              isChatOpen
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            {isChatOpen ? 'Hide Chat' : 'Show Chat'}
          </button>
        )}

        {/* Spectator Controls */}
        {showSpectatorControls && (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">Spectators</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {spectatorCount}
              </span>
            </div>
            
            {onInviteSpectators && (
              <button
                onClick={onInviteSpectators}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 transition-colors"
              >
                <Users className="w-4 h-4" />
                Invite Spectators
              </button>
            )}
          </div>
        )}

        {/* Game Info Display */}
        <div className="pt-3 border-t border-gray-200">
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Game Type:</span>
              <span className="capitalize font-medium">{game.gameType || game.gameMode || 'Classic'}</span>
            </div>
            
            {game.gameMode && (
              <div className="flex justify-between">
                <span>Mode:</span>
                <span className="capitalize font-medium">{game.gameMode}</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span>Moves Made:</span>
              <span className="font-medium">{game.moves?.length || 0}</span>
            </div>
            
            {game.timeLimit && (
              <div className="flex justify-between">
                <span>Time Limit:</span>
                <span className="font-medium">
                  {Math.floor(game.timeLimit / 60)}:{(game.timeLimit % 60).toString().padStart(2, '0')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameControls;


