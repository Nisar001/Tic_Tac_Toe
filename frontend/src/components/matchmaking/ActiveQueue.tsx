import React from 'react';
import { useMatchmakingContext } from '../../contexts/MatchmakingContext';
import { FaClock, FaUsers, FaTimes } from 'react-icons/fa';

export const ActiveQueue: React.FC = () => {
  const { state, leaveQueue } = useMatchmakingContext();

  const handleLeaveQueue = async () => {
    try {
      await leaveQueue();
    } catch (error) {
      console.error('Failed to leave queue:', error);
    }
  };

  if (!state.status) {
    return null;
  }

  return (
    <div className="p-8">
      <div className="max-w-md mx-auto text-center">
        <div className="mb-8">
          <div className="animate-pulse">
            <FaUsers className="mx-auto text-6xl text-purple-600 mb-4" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Finding Match</h2>
          <p className="text-gray-600">Please wait while we find you an opponent</p>
        </div>

        {/* Queue Info */}
        <div className="space-y-4 mb-8">
          {state.status.queuePosition && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">#{state.status.queuePosition}</div>
              <div className="text-sm text-blue-700">Position in queue</div>
            </div>
          )}

          {state.status.estimatedWaitTime && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-center space-x-2">
              <FaClock className="text-green-600" />
              <div>
                <div className="font-semibold text-green-900">~{Math.round(state.status.estimatedWaitTime)}s</div>
                <div className="text-sm text-green-700">Estimated wait</div>
              </div>
            </div>
          )}
        </div>

        {/* Loading Animation */}
        <div className="mb-8">
          <div className="flex justify-center space-x-1">
            <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>

        {/* Leave Queue Button */}
        <button
          onClick={handleLeaveQueue}
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2 mx-auto"
        >
          <FaTimes />
          <span>Leave Queue</span>
        </button>
      </div>
    </div>
  );
};
