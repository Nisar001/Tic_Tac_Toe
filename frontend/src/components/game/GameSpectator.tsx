import React, { useState, useEffect } from 'react';
import { Game, User } from '../../types';
import { Eye, Users, MessageSquare, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';
import TicTacToeBoard from './TicTacToeBoard';
import GameInfo from './GameInfo';

interface GameSpectatorProps {
  game: Game;
  spectator: User;
  spectatorCount: number;
  onLeaveSpectator: () => void;
  onToggleChat?: () => void;
  isChatOpen?: boolean;
}

export const GameSpectator: React.FC<GameSpectatorProps> = ({
  game,
  spectator,
  spectatorCount,
  onLeaveSpectator,
  onToggleChat,
  isChatOpen = false
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showMoveHistory, setShowMoveHistory] = useState(false);

  useEffect(() => {
    // Play sound for moves if enabled
    if (soundEnabled && game.moves.length > 0) {
      // You would implement actual sound playing here
    }
  }, [game.moves.length, soundEnabled]);

  const handleFullscreenToggle = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const getLastMove = () => {
    if (game.moves.length === 0) return null;
    return game.moves[game.moves.length - 1];
  };

  const lastMove = getLastMove();
  const getCurrentPlayerName = () => {
    if (game.currentPlayer === 'X') {
      const player1 = game.players.player1;
      return typeof player1 === 'string' ? 'Player 1' : player1?.username;
    }
    if (game.currentPlayer === 'O') {
      const player2 = game.players.player2;
      return typeof player2 === 'string' ? 'Player 2' : player2?.username;
    }
    return null;
  };
  const currentPlayerName = getCurrentPlayerName();

  return (
    <div className={`spectator-view ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Spectator Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="w-6 h-6" />
            <div>
              <h1 className="text-xl font-bold">Spectating Game</h1>
              <p className="text-purple-100 text-sm">
                Room: {game.roomId} • {spectatorCount} watching
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            {/* Chat Toggle */}
            {onToggleChat && (
              <button
                onClick={onToggleChat}
                className={`p-2 rounded-lg transition-colors ${
                  isChatOpen ? 'bg-white/20' : 'bg-white/10 hover:bg-white/20'
                }`}
                title={isChatOpen ? 'Hide chat' : 'Show chat'}
              >
                <MessageSquare className="w-5 h-5" />
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              onClick={handleFullscreenToggle}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>

            {/* Leave Button */}
            <button
              onClick={onLeaveSpectator}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              Leave
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 bg-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Game Board Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="text-center mb-6">
                  {game.status === 'active' && currentPlayerName && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                      <span className="font-medium">{currentPlayerName}'s turn</span>
                    </div>
                  )}
                  
                  {game.status === 'completed' && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full">
                      <span className="font-medium">
                        {game.winner 
                          ? `${
                              (() => {
                                const player1 = game.players.player1;
                                const player2 = game.players.player2;
                                const player1Id = typeof player1 === 'string' ? player1 : player1?.id;
                                
                                if (game.winner === player1Id) {
                                  return typeof player1 === 'string' ? 'Player 1' : player1?.username;
                                } else {
                                  return typeof player2 === 'string' ? 'Player 2' : player2?.username;
                                }
                              })()
                            } wins!`
                          : 'Game ended in a draw'
                        }
                      </span>
                    </div>
                  )}
                </div>

                {/* Game Board */}
                <div className="flex justify-center">
                  <TicTacToeBoard
                    board={game.board.map(row => row.map(cell => cell || ''))}
                    currentPlayer={game.currentPlayer}
                    onCellClick={() => {}} // Spectators can't interact
                    isMyTurn={false}
                    gameStatus={game.status}
                    disabled={true}
                  />
                </div>

                {/* Last Move Indicator */}
                {lastMove && (
                  <div className="mt-4 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                      <span>Last move:</span>
                      <span className="font-medium">
                        {lastMove.symbol} at ({lastMove.position.row + 1}, {lastMove.position.col + 1})
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Move History Toggle */}
              <div className="mt-4">
                <button
                  onClick={() => setShowMoveHistory(!showMoveHistory)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-center"
                >
                  {showMoveHistory ? 'Hide' : 'Show'} Move History ({game.moves.length} moves)
                </button>
                
                {showMoveHistory && (
                  <div className="mt-2 bg-white rounded-lg border border-gray-300 p-4 max-h-60 overflow-y-auto">
                    <h4 className="font-semibold text-gray-800 mb-2">Move History</h4>
                    <div className="space-y-1">
                      {game.moves.map((move, index) => {
                        const player1 = game.players.player1;
                        const player1Id = typeof player1 === 'string' ? player1 : player1?.id;
                        const player = move.player === player1Id 
                          ? player1 
                          : game.players.player2;
                        const playerName = typeof player === 'string' ? 'Player' : player?.username;
                        return (
                          <div key={move.id || index} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">#{index + 1}</span>
                            <span className="font-medium">{playerName || 'Unknown'}</span>
                            <span className="font-mono">{move.symbol}</span>
                            <span className="text-gray-500">
                              ({move.position.row + 1}, {move.position.col + 1})
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(move.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        );
                      })}
                      {game.moves.length === 0 && (
                        <p className="text-gray-500 text-center py-2">No moves yet</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Side Panel */}
            <div className="space-y-6">
              {/* Game Info */}
              <GameInfo
                game={game}
                currentUser={spectator}
                onForfeit={() => {}} // Spectators can't forfeit
              />

              {/* Spectator Info */}
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Spectators
                </h3>
                <div className="flex items-center justify-center p-6 text-center">
                  <div>
                    <div className="text-3xl font-bold text-purple-600">{spectatorCount}</div>
                    <div className="text-sm text-gray-600">watching this game</div>
                  </div>
                </div>
              </div>

              {/* Spectator Tips */}
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="text-lg font-semibold mb-3">Spectator Tips</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500">•</span>
                    <span>Use fullscreen mode for better viewing</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500">•</span>
                    <span>Toggle sound effects on/off</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500">•</span>
                    <span>View move history to analyze gameplay</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500">•</span>
                    <span>Chat with other spectators</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameSpectator;


