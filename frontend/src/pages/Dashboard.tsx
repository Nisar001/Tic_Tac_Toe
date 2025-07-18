import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { useNavigate } from 'react-router-dom';
import { 
  PlusIcon, 
  PlayIcon, 
  TrophyIcon, 
  UserGroupIcon,
  ClockIcon,
  FireIcon 
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Game, UserStats } from '../types';

const Dashboard: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { getActiveGames, createGame, getUserStats, isLoading: gameLoading } = useGame();
  const { joinQueue } = require('../contexts/MatchmakingContext').useMatchmakingContext();
  const navigate = useNavigate();
  const [activeGames, setActiveGames] = useState<Game[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  const handleRefreshStats = () => {
    if (isAuthenticated && !authLoading) {
      loadDashboardData();
    }
  };

  const loadDashboardData = useCallback(async () => {
    setStatsError(null);
    try {
      // Load games and stats separately to avoid one failure breaking the other
      const gamesPromise = getActiveGames().catch(error => {
        return { games: [], totalActiveGames: 0 };
      });

      let stats: UserStats | null = null;
      try {
        const apiStats = await getUserStats();
        if (
          apiStats &&
          apiStats.gamesPlayed === 0 &&
          apiStats.wins === 0 &&
          apiStats.losses === 0 &&
          apiStats.draws === 0 &&
          apiStats.winRate === 0 &&
          user?.stats && user.stats.gamesPlayed > 0
        ) {
          stats = user.stats;
        } else {
          stats = apiStats;
        }
      } catch (error: any) {
        setStatsError(error?.message || 'Failed to load user stats');
        if (user?.stats && user.stats.gamesPlayed > 0) {
          stats = user.stats;
        } else {
          stats = {
            level: 0,
            xp: 0,
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            winRate: 0,
            currentStreak: 0,
          };
        }
      }

      const gamesResponse = await gamesPromise;
      const games = gamesResponse?.games || [];
      setActiveGames(Array.isArray(games) ? games : []);
      setUserStats(stats);
    } catch (error) {
      setActiveGames([]);
      setUserStats({
        level: 0,
        xp: 0,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        currentStreak: 0,
      });
      setStatsError('Failed to load dashboard data');
    }
  }, [getActiveGames, getUserStats, user]);

  useEffect(() => {
    setUserStats(null); // Reset stats on auth change
    if (isAuthenticated && !authLoading) {
      loadDashboardData();
    }
  }, [isAuthenticated, authLoading, loadDashboardData]);

  const handleCreateGame = async () => {
    try {
      const game = await createGame({
        gameConfig: {
          gameMode: 'classic',
          isPrivate: false,
        }
      });
      navigate(`/game/${game.roomId || game.room || game.id}`);
    } catch (error) {
      // Error handled by context
    }
  };

  const handleJoinQueue = () => {
    // Join matchmaking queue and navigate to matchmaking page
    joinQueue();
    navigate('/matchmaking');
  };

  if (authLoading || gameLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 lg:p-8 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="mb-4 lg:mb-0">
            <h1 className="text-2xl lg:text-3xl font-bold mb-2">
              Welcome back, {user?.username}!
            </h1>
            <p className="text-primary-100 text-base lg:text-lg">
              Ready for another game? Let's see what you've got!
            </p>
          </div>
          <div className="flex justify-center lg:block">
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mb-2">
                  <FireIcon className="w-6 h-6" />
                </div>
                <p className="text-sm text-primary-100">Lives</p>
                <p className="text-xl font-bold">{user?.lives || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <div 
          className="card hover:shadow-xl transition-shadow duration-200 cursor-pointer group"
          onClick={handleCreateGame}
        >
          <div className="flex items-center">
            <div className="flex items-center justify-center w-12 h-12 bg-primary-100 rounded-lg group-hover:bg-primary-200 transition-colors duration-200">
              <PlusIcon className="w-6 h-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Create Game</h3>
              <p className="text-gray-600">Start a new game room</p>
            </div>
          </div>
        </div>

        <div 
          className="card hover:shadow-xl transition-shadow duration-200 cursor-pointer group"
          onClick={handleJoinQueue}
        >
          <div className="flex items-center">
            <div className="flex items-center justify-center w-12 h-12 bg-success-100 rounded-lg group-hover:bg-success-200 transition-colors duration-200">
              <PlayIcon className="w-6 h-6 text-success-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Quick Match</h3>
              <p className="text-gray-600">Find an opponent</p>
            </div>
          </div>
        </div>

        <div 
          className="card hover:shadow-xl transition-shadow duration-200 cursor-pointer group sm:col-span-2 lg:col-span-1"
          onClick={() => navigate('/leaderboard')}
        >
          <div className="flex items-center">
            <div className="flex items-center justify-center w-12 h-12 bg-warning-100 rounded-lg group-hover:bg-warning-200 transition-colors duration-200">
              <TrophyIcon className="w-6 h-6 text-warning-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Leaderboard</h3>
              <p className="text-gray-600">View rankings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">Game Statistics</h2>
          <button
            className="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
            onClick={handleRefreshStats}
            title="Refresh Stats"
          >
            Refresh
          </button>
        </div>
        {statsError && (
          <div className="text-red-600 text-sm mb-2">{statsError}</div>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <div className="card text-center">
            <div className="text-2xl lg:text-3xl font-bold text-primary-600 mb-2">
              {userStats?.gamesPlayed ?? 0}
            </div>
            <p className="text-gray-600 text-sm lg:text-base">Games Played</p>
          </div>
          <div className="card text-center">
            <div className="text-2xl lg:text-3xl font-bold text-success-600 mb-2">
              {userStats?.wins ?? 0}
            </div>
            <p className="text-gray-600 text-sm lg:text-base">Games Won</p>
          </div>
          <div className="card text-center">
            <div className="text-2xl lg:text-3xl font-bold text-warning-600 mb-2">
              {userStats?.winRate ? `${userStats.winRate.toFixed(1)}%` : '0%'}
            </div>
            <p className="text-gray-600 text-sm lg:text-base">Win Rate</p>
          </div>
          <div className="card text-center">
            <div className="text-2xl lg:text-3xl font-bold text-error-600 mb-2">
              {userStats?.currentStreak ?? 0}
            </div>
            <p className="text-gray-600 text-sm lg:text-base">Current Streak</p>
          </div>
        </div>
      </div>

      {/* Active Games */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Active Games</h2>
          <UserGroupIcon className="w-6 h-6 text-gray-400" />
        </div>
        
        {!Array.isArray(activeGames) || activeGames.length === 0 ? (
          <div className="text-center py-8">
            <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No active games at the moment</p>
            <p className="text-sm text-gray-400 mt-1">Create a game or join the matchmaking queue to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeGames.map((game) => (
              <div 
                key={game.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                onClick={() => navigate(`/game/${game.roomId}`)}
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-4">
                    <PlayIcon className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Game #{(game.roomId || game.room).slice(0, 8)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {(game.players.player2 ? 2 : 1)}/2 players • {game.status}
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
    </div>
  );
};

export default Dashboard;
