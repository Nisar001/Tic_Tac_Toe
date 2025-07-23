import React, { useState } from 'react';
import { Game } from '../../types';
import { GamepadIcon, Users, Clock, Trophy, Filter, MoreVertical, Eye, StopCircle } from 'lucide-react';

interface GameManagementProps {
  games: Game[];
  onViewGame: (gameId: string) => void;
  onEndGame: (gameId: string) => void;
  onDeleteGame: (gameId: string) => void;
  isLoading?: boolean;
}

export const GameManagement: React.FC<GameManagementProps> = ({
  games,
  onViewGame,
  onEndGame,
  onDeleteGame,
  isLoading = false
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'waiting' | 'active' | 'completed'>('all');
  const [filterType, setFilterType] = useState<'all' | 'quick' | 'ranked' | 'custom' | 'tournament'>('all');
  const [showActions, setShowActions] = useState<string | null>(null);

  const filteredGames = games.filter(game => {
    const statusMatch = filterStatus === 'all' || game.status === filterStatus;
    const typeMatch = filterType === 'all' || game.gameType === filterType;
    return statusMatch && typeMatch;
  });

  const formatDuration = (createdAt: string, endedAt?: string) => {
    const start = new Date(createdAt);
    const end = endedAt ? new Date(endedAt) : new Date();
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000 / 60); // minutes
    return `${duration}m`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      waiting: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Waiting' },
      active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
      completed: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Completed' },
      abandoned: { bg: 'bg-red-100', text: 'text-red-800', label: 'Abandoned' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.waiting;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      quick: { bg: 'bg-blue-100', text: 'text-blue-800' },
      ranked: { bg: 'bg-purple-100', text: 'text-purple-800' },
      custom: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
      tournament: { bg: 'bg-orange-100', text: 'text-orange-800' }
    };

    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.quick;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text} capitalize`}>
        {type}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <GamepadIcon className="w-5 h-5" />
            Game Management
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="waiting">Waiting</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="quick">Quick</option>
                <option value="ranked">Ranked</option>
                <option value="custom">Custom</option>
                <option value="tournament">Tournament</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {games.filter(g => g.status === 'active').length}
            </div>
            <div className="text-sm text-gray-600">Active Games</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {games.filter(g => g.status === 'waiting').length}
            </div>
            <div className="text-sm text-gray-600">Waiting</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {games.filter(g => g.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {games.length}
            </div>
            <div className="text-sm text-gray-600">Total Games</div>
          </div>
        </div>
      </div>

      {/* Games Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Game Info
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Players
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  Loading games...
                </td>
              </tr>
            ) : filteredGames.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No games found
                </td>
              </tr>
            ) : (
              filteredGames.map((game) => (
                <tr key={game.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        #{game.id?.slice(0, 8) || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        Room: {game.roomId?.slice(0, 8) || game.room?.slice(0, 8) || 'N/A'}
                      </div>
                      <div className="mt-1">
                        {getTypeBadge(game.gameType || game.gameMode || 'classic')}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <div className="text-sm text-gray-900">
                        {(game.players.player1 ? 1 : 0) + (game.players.player2 ? 1 : 0)}/2
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {[
                        typeof game.players.player1 === 'string' ? 'Player 1' : game.players.player1?.username,
                        typeof game.players.player2 === 'string' ? 'Player 2' : game.players.player2?.username
                      ].filter(Boolean).join(' vs ')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(game.status)}
                    {game.winner && (
                      <div className="flex items-center gap-1 mt-1">
                        <Trophy className="w-3 h-3 text-yellow-500" />
                        <span className="text-xs text-gray-600">
                          {(() => {
                            const player1 = game.players.player1;
                            const player2 = game.players.player2;
                            const player1Id = typeof player1 === 'string' ? player1 : player1?.id;
                            const player2Id = typeof player2 === 'string' ? player2 : player2?.id;
                            const player1Name = typeof player1 === 'string' ? 'Player 1' : player1?.username;
                            const player2Name = typeof player2 === 'string' ? 'Player 2' : player2?.username;
                            
                            if (player1Id === game.winner) return player1Name;
                            if (player2Id === game.winner) return player2Name;
                            return 'Unknown';
                          })()} won
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-sm text-gray-900">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {formatDuration(game.createdAt, game.endedAt)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {game.moves.length} moves
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative">
                      <button
                        onClick={() => setShowActions(showActions === game.id ? null : game.id || null)}
                        className="p-1 rounded-full hover:bg-gray-100"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                      </button>
                      
                      {showActions === game.id && game.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                          <div className="py-1">
                            <button
                              onClick={() => {
                                if (game.id) onViewGame(game.id);
                                setShowActions(null);
                              }}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Eye className="w-4 h-4" />
                              View Game
                            </button>
                            {game.status === 'active' && (
                              <button
                                onClick={() => {
                                  if (game.id) onEndGame(game.id);
                                  setShowActions(null);
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-orange-700 hover:bg-orange-50"
                              >
                                <StopCircle className="w-4 h-4" />
                                End Game
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (game.id) onDeleteGame(game.id);
                                setShowActions(null);
                              }}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                            >
                              <GamepadIcon className="w-4 h-4" />
                              Delete Game
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredGames.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {filteredGames.length} of {games.length} games
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameManagement;


