import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { NotificationDropdown } from './notifications';
import { 
  Bars3Icon, 
  WifiIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user } = useAuth();
  const { isConnected } = useSocket();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side */}
          <div className="flex items-center">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            
            <div className="hidden lg:block ml-4">
              <h1 className="text-xl font-semibold text-gray-900">
                Tic Tac Toe Pro
              </h1>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Connection status */}
            <div className="flex items-center">
              {isConnected ? (
                <div className="flex items-center text-green-600">
                  <WifiIcon className="h-5 w-5 mr-1" />
                  <span className="text-sm hidden sm:block">Connected</span>
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <ExclamationTriangleIcon className="h-5 w-5 mr-1" />
                  <span className="text-sm hidden sm:block">Disconnected</span>
                </div>
              )}
            </div>

            {/* Notifications */}
            <NotificationDropdown />

            {/* User menu */}
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="ml-2 hidden sm:block">
                <div className="text-sm font-medium text-gray-900">
                  {user?.username}
                </div>
                <div className="text-xs text-gray-500">
                  Lives: {user?.lives || 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;


