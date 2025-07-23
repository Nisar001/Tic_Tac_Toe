import React from 'react';
import { FaHistory } from 'react-icons/fa';

export const MatchHistory: React.FC = () => {
  // Placeholder component for match history
  return (
    <div className="p-8">
      <div className="text-center">
        <FaHistory className="mx-auto text-6xl text-gray-300 mb-4" />
        <h3 className="text-xl font-semibold text-gray-600 mb-2">
          Match History
        </h3>
        <p className="text-gray-500">
          Your recent matches will appear here
        </p>
      </div>
    </div>
  );
};


