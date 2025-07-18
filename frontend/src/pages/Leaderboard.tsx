
import React, { useEffect, useState } from 'react';
import { useGame } from '../contexts/GameContext';
import { TrophyIcon, UserIcon } from '@heroicons/react/24/outline';

const Leaderboard: React.FC = () => {
  const { getLeaderboard, isLoading } = useGame();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        setError(null);
        const data = await getLeaderboard();
        setLeaderboard(data || []);
      } catch (err: any) {
        setError(err?.message || 'Failed to load leaderboard');
      }
    };
    loadLeaderboard();
  }, [getLeaderboard]);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Leaderboard</h1>
        <p className="text-gray-600 text-sm sm:text-base">See how you rank against other players</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <TrophyIcon className="w-12 h-12 text-yellow-500 animate-bounce mr-4" />
          <span className="text-gray-500 text-lg">Loading leaderboard...</span>
        </div>
      ) : error ? (
        <div className="text-center text-red-600 py-8">
          <p>{error}</p>
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
