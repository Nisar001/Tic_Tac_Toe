import React from 'react';
import { BarChart3, Users, GamepadIcon, TrendingUp, Clock, Trophy, Target, Zap } from 'lucide-react';

interface AnalyticsProps {
  stats: {
    totalUsers: number;
    activeUsers: number;
    totalGames: number;
    gamesInProgress: number;
    avgGameDuration: number;
    topWinRate: number;
    dailyActiveUsers: number;
    weeklyGames: number;
  };
  isLoading?: boolean;
}

export const Analytics: React.FC<AnalyticsProps> = ({ stats, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins}m ${seconds % 60}s`;
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
    trend?: { value: number; isUp: boolean };
  }> = ({ title, value, icon, color, subtitle, trend }) => (
    <div className={`bg-gradient-to-r ${color} rounded-lg p-6 text-white`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-90">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && <p className="text-xs opacity-75">{subtitle}</p>}
        </div>
        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center">
          <TrendingUp className={`w-4 h-4 ${trend.isUp ? 'text-green-200' : 'text-red-200 rotate-180'}`} />
          <span className="text-sm ml-1">
            {trend.isUp ? '+' : ''}{trend.value}% from last week
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Analytics Dashboard
        </h2>
        <p className="text-gray-600 mt-1">
          System performance and user engagement metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          icon={<Users className="w-6 h-6" />}
          color="from-blue-500 to-blue-600"
          subtitle="Registered players"
          trend={{ value: 12, isUp: true }}
        />

        <StatCard
          title="Active Users"
          value={stats.activeUsers.toLocaleString()}
          icon={<Zap className="w-6 h-6" />}
          color="from-green-500 to-green-600"
          subtitle="Currently online"
          trend={{ value: 8, isUp: true }}
        />

        <StatCard
          title="Total Games"
          value={stats.totalGames.toLocaleString()}
          icon={<GamepadIcon className="w-6 h-6" />}
          color="from-purple-500 to-purple-600"
          subtitle="All time"
          trend={{ value: 5, isUp: true }}
        />

        <StatCard
          title="Games in Progress"
          value={stats.gamesInProgress}
          icon={<Target className="w-6 h-6" />}
          color="from-orange-500 to-orange-600"
          subtitle="Active matches"
        />

        <StatCard
          title="Avg Game Duration"
          value={formatDuration(stats.avgGameDuration)}
          icon={<Clock className="w-6 h-6" />}
          color="from-indigo-500 to-indigo-600"
          subtitle="Per game"
        />

        <StatCard
          title="Top Win Rate"
          value={`${stats.topWinRate}%`}
          icon={<Trophy className="w-6 h-6" />}
          color="from-yellow-500 to-yellow-600"
          subtitle="Best player"
        />

        <StatCard
          title="Daily Active Users"
          value={stats.dailyActiveUsers.toLocaleString()}
          icon={<Users className="w-6 h-6" />}
          color="from-teal-500 to-teal-600"
          subtitle="Last 24 hours"
          trend={{ value: 15, isUp: true }}
        />

        <StatCard
          title="Weekly Games"
          value={stats.weeklyGames.toLocaleString()}
          icon={<GamepadIcon className="w-6 h-6" />}
          color="from-pink-500 to-pink-600"
          subtitle="Last 7 days"
          trend={{ value: 23, isUp: true }}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Game Types Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Game Types Distribution</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Quick Games</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                </div>
                <span className="text-sm font-medium text-gray-900">65%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Ranked Games</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                </div>
                <span className="text-sm font-medium text-gray-900">25%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Custom Games</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '10%' }}></div>
                </div>
                <span className="text-sm font-medium text-gray-900">10%</span>
              </div>
            </div>
          </div>
        </div>

        {/* User Activity Timeline */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Activity (Last 7 Days)</h3>
          <div className="space-y-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
              const height = Math.floor(Math.random() * 60) + 20;
              return (
                <div key={day} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-8">{day}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${height}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8">
                    {Math.floor(height * 10)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-3">
              <div className="text-2xl font-bold text-green-600">99.9%</div>
            </div>
            <h4 className="font-medium text-gray-900">Uptime</h4>
            <p className="text-sm text-gray-600">Last 30 days</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <div className="text-2xl font-bold text-blue-600">45ms</div>
            </div>
            <h4 className="font-medium text-gray-900">Avg Response</h4>
            <p className="text-sm text-gray-600">API latency</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-3">
              <div className="text-2xl font-bold text-purple-600">2.1k</div>
            </div>
            <h4 className="font-medium text-gray-900">Req/min</h4>
            <p className="text-sm text-gray-600">Peak traffic</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
