
import React, { useEffect, useState } from 'react';
import { useGame } from '../contexts/GameContext';
import { useAPIManager } from '../contexts/APIManagerContext';
import { TrophyIcon, UserIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const Leaderboard: React.FC = () => {
  const { getLeaderboard, isLoading } = useGame();
  const { loading, errors, retry } = useAPIManager();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadLeaderboard = React.useCallback(async () => {
    try {
      setError(null);
      const data = await getLeaderboard();
      setLeaderboard(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load leaderboard');
    }
  }, [getLeaderboard]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-2">
          Leaderboard
          {(loading.getLeaderboard || isLoading) && (
            <ArrowPathIcon className="w-6 h-6 animate-spin text-yellow-500" />
          )}
        </h1>
        <p className="text-gray-600 text-sm sm:text-base">See how you rank against other players</p>
      </div>

      {/* API Manager Errors */}
      {errors && Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="space-y-2">
            {Object.entries(errors).map(([apiCall, errorMsg]) => (
              <div key={apiCall} className="flex items-center justify-between">
                <span className="text-red-600">API Error ({apiCall}): {errorMsg}</span>
                <button
                  onClick={() => retry(apiCall, getLeaderboard)}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-100 rounded"
                >
                  <ArrowPathIcon className="w-3 h-3" />
                  Retry
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <TrophyIcon className="w-12 h-12 text-yellow-500 animate-bounce mr-4" />
          <span className="text-gray-500 text-lg">Loading leaderboard...</span>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">
            <p>{error}</p>
          </div>
          <button
            onClick={loadLeaderboard}
            className="flex items-center gap-2 mx-auto px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Retry
          </button>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center py-8">
          <TrophyIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No leaderboard data available</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg shadow-md">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Rank</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Player</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Wins</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Games Played</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, idx) => (
                <tr key={entry.userId || entry.id} className={idx === 0 ? 'bg-yellow-50' : ''}>
                  <td className="px-4 py-2 font-bold text-lg text-primary-600">{idx + 1}</td>
                  <td className="px-4 py-2 flex items-center">
                    <UserIcon className="w-5 h-5 text-blue-500 mr-2" />
                    {entry.username || entry.name || 'Unknown'}
                  </td>
                  <td className="px-4 py-2">{entry.wins ?? 0}</td>
                  <td className="px-4 py-2">{entry.gamesPlayed ?? 0}</td>
                  <td className="px-4 py-2">{entry.winRate ? `${entry.winRate.toFixed(1)}%` : '0%'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;


