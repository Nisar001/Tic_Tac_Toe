import React, { useEffect, useState } from 'react';
import { useMatchmakingContext } from '../../contexts/MatchmakingContext';
import { useAPIManager } from '../../contexts/APIManagerContext';
import { QuickMatch } from '../../components/matchmaking/QuickMatch';
import { ActiveQueue } from '../../components/matchmaking/ActiveQueue';
import { MatchHistory } from '../../components/matchmaking/MatchHistory';
import { RankedMatch } from '../../components/matchmaking/RankedMatch';
import { FaGamepad, FaTrophy, FaClock, FaHistory, FaSync } from 'react-icons/fa';

export const Matchmaking: React.FC = () => {
  const { state, getStats } = useMatchmakingContext();
  const { loading, errors, retry } = useAPIManager();
  const [activeTab, setActiveTab] = useState<'quick' | 'ranked' | 'history'>('quick');

  useEffect(() => {
    getStats();
  }, [getStats]);

  const tabs = [
    {
      id: 'quick' as const,
      label: 'Quick Match',
      icon: FaGamepad,
      description: 'Find a match quickly',
    },
    {
      id: 'ranked' as const,
      label: 'Ranked',
      icon: FaTrophy,
      description: 'Competitive gameplay',
    },
    {
      id: 'history' as const,
      label: 'History',
      icon: FaHistory,
      description: 'View past matches',
    },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'quick':
        return state.status ? <ActiveQueue /> : <QuickMatch />;
      case 'ranked':
        return state.status ? <ActiveQueue /> : <RankedMatch />;
      case 'history':
        return <MatchHistory />;
      default:
        return <QuickMatch />;
    }
  };

  return (
    <div className="h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center">
                <FaGamepad className="mr-3" />
                Matchmaking
              </h1>
              <p className="text-purple-100 mt-1">
                Find opponents and test your skills
              </p>
            </div>
            {loading.getStats && (
              <div className="flex items-center text-purple-100">
                <FaSync className="animate-spin mr-2" />
                Loading...
              </div>
            )}
            {errors && Object.keys(errors).length > 0 && (
              <button
                onClick={() => {
                  Object.keys(errors).forEach(apiCall => {
                    if (apiCall === 'getStats') {
                      retry(apiCall, getStats);
                    }
                  });
                }}
                className="flex items-center gap-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                <FaSync className="w-3 h-3" />
                Retry API
              </button>
            )}
          </div>
          
          {state.status && (
            <div className="bg-black bg-opacity-20 px-4 py-2 rounded-lg flex items-center space-x-2">
              <FaClock className="animate-pulse" />
              <span>In Queue</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              disabled={!!state.status && tab.id !== activeTab}
              className={`
                flex-1 px-6 py-4 text-center border-b-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                ${activeTab === tab.id
                  ? 'border-purple-500 text-purple-600 bg-purple-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <div className="flex flex-col items-center space-y-1">
                <tab.icon className="text-lg" />
                <div className="font-medium">{tab.label}</div>
                <div className="text-xs opacity-75">{tab.description}</div>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {state.loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : (state.error || (errors && Object.keys(errors).length > 0)) ? (
          <div className="p-6 text-center">
            {state.error && (
              <div className="text-red-600 mb-4">
                <p>{state.error}</p>
                <button
                  onClick={getStats}
                  className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}
            {errors && Object.keys(errors).length > 0 && (
              <div className="space-y-2">
                {Object.entries(errors).map(([apiCall, error]) => (
                  <div key={apiCall} className="p-3 bg-red-50 border border-red-200 rounded">
                    <div className="flex items-center justify-between">
                      <span className="text-red-600">API Error ({apiCall}): {error}</span>
                      <button
                        onClick={() => retry(apiCall, getStats)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-100 rounded"
                      >
                        <FaSync className="w-3 h-3" />
                        Retry
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          renderContent()
        )}
      </div>
    </div>
  );
};


