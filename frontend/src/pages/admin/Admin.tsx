import React from 'react';
import { FaShieldAlt, FaUsers, FaGamepad, FaChartBar } from 'react-icons/fa';

export const Admin: React.FC = () => {
  return (
    <div className="h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-6">
        <h1 className="text-2xl font-bold flex items-center">
          <FaShieldAlt className="mr-3" />
          Admin Dashboard
        </h1>
        <p className="text-red-100 mt-1">
          Manage users, games, and system settings
        </p>
      </div>

      {/* Content */}
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <FaUsers className="mx-auto text-4xl text-blue-600 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">User Management</h3>
            <p className="text-gray-600 text-sm">Manage user accounts and permissions</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <FaGamepad className="mx-auto text-4xl text-green-600 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Game Management</h3>
            <p className="text-gray-600 text-sm">Monitor active games and tournaments</p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 text-center">
            <FaChartBar className="mx-auto text-4xl text-purple-600 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics</h3>
            <p className="text-gray-600 text-sm">View system statistics and reports</p>
          </div>
        </div>

        <div className="mt-8 text-center text-gray-500">
          <p>Admin features are in development. More functionality coming soon!</p>
        </div>
      </div>
    </div>
  );
};
