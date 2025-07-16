import React from 'react';

const Leaderboard: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Leaderboard</h1>
        <p className="text-gray-600 text-sm sm:text-base">See how you rank against other players</p>
      </div>
      
      <div className="card">
        <p className="text-center text-gray-500 py-8 text-sm sm:text-base">
          Leaderboard functionality coming soon...
        </p>
      </div>
    </div>
  );
};

export default Leaderboard;
