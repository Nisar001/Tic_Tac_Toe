import React from 'react';
import { useMatchmakingContext } from '../../contexts/MatchmakingContext';
import { FaGamepad, FaUsers, FaClock } from 'react-icons/fa';

export const QuickMatch: React.FC = () => {
  const { state, joinQueue } = useMatchmakingContext();

  const handleJoinQueue = async () => {
    try {
      await joinQueue();
    } catch (error) {
      console.error('Failed to join queue:', error);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <FaGamepad className="mx-auto text-6xl text-purple-600 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Quick Match</h2>
          <p className="text-gray-600">
            Jump into a game with a player of similar skill level
          </p>
        </div>

        {/* Stats Display */}
        {state.stats && (
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <FaUsers className="mx-auto text-blue-500 text-2xl mb-2" />
              <div className="text-lg font-semibold text-gray-900">{state.stats.totalPlayersInQueue}</div>
              <div className="text-sm text-gray-500">Players Online</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <FaClock className="mx-auto text-green-500 text-2xl mb-2" />
              <div className="text-lg font-semibold text-gray-900">{Math.round(state.stats.averageWaitTime)}s</div>
              <div className="text-sm text-gray-500">Avg Wait Time</div>
            </div>
          </div>
        )}

        {/* Queue Button */}
        <div className="space-y-4">
          <button
            onClick={handleJoinQueue}
            disabled={state.loading}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-opacity-50"
          >
            {state.loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Joining Queue...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <FaGamepad />
                <span>Find Match</span>
              </div>
            )}
          </button>

          <div className="text-center text-sm text-gray-500">
            <FaClock className="inline mr-1" />
            Average wait time: 30-60 seconds
          </div>
        </div>

        {/* Skill Distribution */}
        {state.stats && (
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3">Player Distribution</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-green-600">{(state.stats.skillDistribution?.beginner ?? 0)}</div>
                <div className="text-xs text-gray-500">Beginner</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-blue-600">{(state.stats.skillDistribution?.intermediate ?? 0)}</div>
                <div className="text-xs text-gray-500">Intermediate</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-purple-600">{(state.stats.skillDistribution?.advanced ?? 0)}</div>
                <div className="text-xs text-gray-500">Advanced</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
