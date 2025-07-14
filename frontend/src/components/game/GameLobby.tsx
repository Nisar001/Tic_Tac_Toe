import React, { useState } from 'react';
import { Game, User } from '../../types';
import { Users, Clock, Settings, Copy, Check, Play, X, Crown } from 'lucide-react';

interface GameLobbyProps {
  game: Game;
  currentUser: User;
  isHost: boolean;
  onStartGame: () => void;
  onLeaveGame: () => void;
  onKickPlayer?: (playerId: string) => void;
  onUpdateSettings?: (settings: any) => void;
  inviteLink?: string;
}

export const GameLobby: React.FC<GameLobbyProps> = ({
  game,
  currentUser,
  isHost,
  onStartGame,
  onLeaveGame,
  onKickPlayer,
  onUpdateSettings,
  inviteLink
}) => {
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const canStartGame = game.players.player2 && isHost;
  const isWaitingForPlayers = !game.players.player2;

  const handleCopyInvite = async () => {
    if (inviteLink) {
      try {
        await navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy invite link:', err);
      }
    }
  };

  const formatTimeLimit = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Game Lobby</h1>
            <p className="text-gray-600">Room: {game.roomId}</p>
          </div>
          
          <div className="flex items-center gap-3">
            {isHost && onUpdateSettings && (
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
            )}
            
            <button
              onClick={onLeaveGame}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <X className="w-4 h-4" />
              Leave
            </button>
          </div>
        </div>

        {/* Game Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">Game Type</div>
              <div className="text-sm text-gray-600 capitalize">{game.gameType || game.gameMode || 'Classic'}</div>
            </div>
          </div>

          {game.gameMode && (
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Crown className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">Game Mode</div>
                <div className="text-sm text-gray-600 capitalize">{game.gameMode}</div>
              </div>
            </div>
          )}

          {game.timeLimit && (
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">Time Limit</div>
                <div className="text-sm text-gray-600">{formatTimeLimit(game.timeLimit)}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Players Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" />
              Players ({(game.players.player2 ? 2 : 1)}/2)
            </h2>
          </div>

          <div className="space-y-3">
            {game.players.player1 && (
              <div
                key={game.players.player1.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold bg-blue-500">
                    X
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      {game.players.player1.username}
                      {isHost && game.players.player1.id === currentUser.id && (
                        <span title="Host">
                          <Crown className="w-4 h-4 text-yellow-500" />
                        </span>
                      )}
                      {game.players.player1.id === currentUser.id && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      Connected
                    </div>
                  </div>
                </div>

                {isHost && game.players.player1.id !== currentUser.id && onKickPlayer && (
                  <button
                    onClick={() => onKickPlayer(game.players.player1.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    title="Kick player"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {game.players.player2 ? (
              <div
                key={game.players.player2.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold bg-red-500">
                    O
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      {game.players.player2.username}
                      {game.players.player2.id === currentUser.id && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      Connected
                    </div>
                  </div>
                </div>

                {isHost && onKickPlayer && (
                  <button
                    onClick={() => onKickPlayer(game.players.player2!.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    title="Kick player"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-center text-gray-500">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="font-medium">Waiting for player...</p>
                  <p className="text-sm">Share the invite link to get started</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions Section */}
        <div className="space-y-6">
          {/* Invite Section */}
          {inviteLink && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Invite Players</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                  />
                  <button
                    onClick={handleCopyInvite}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      copied 
                        ? 'bg-green-600 text-white' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-600">
                  Share this link with friends to invite them to your game
                </p>
              </div>
            </div>
          )}

          {/* Start Game Button */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Ready to Play?</h3>
            
            {isWaitingForPlayers ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 mx-auto mb-3 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <p className="text-gray-600 mb-2">Waiting for more players...</p>
                <p className="text-sm text-gray-500">
                  Need {game.players.player2 ? 0 : 1} more player(s) to start
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {canStartGame ? (
                  <button
                    onClick={onStartGame}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-lg font-semibold"
                  >
                    <Play className="w-5 h-5" />
                    Start Game
                  </button>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-600">
                      {isHost ? 'All players ready! You can start the game.' : 'Waiting for host to start the game...'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Tips */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Tips</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>Make sure all players are connected before starting</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>The host can adjust game settings before starting</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>Share the invite link to get more players</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameLobby;
