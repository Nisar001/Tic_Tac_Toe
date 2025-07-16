import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../../contexts/NotificationsContext';
import { NotificationItem } from './NotificationItem';
import { FaBell, FaCheck, FaEye } from 'react-icons/fa';

export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { state, loadNotifications, markAllAsRead } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      loadNotifications({ limit: 10 });
    }
  }, [isOpen, loadNotifications]);

  const recentNotifications = state.notifications.slice(0, 5);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
      >
        <FaBell className="h-6 w-6" />
        {state.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
            {state.unreadCount > 99 ? '99+' : state.unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="border-b border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  Notifications
                </h3>
                {state.unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                    {state.unreadCount}
                  </span>
                )}
              </div>
              
              {state.unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="p-1 text-green-600 hover:text-green-700 hover:bg-green-100 rounded transition-colors"
                  title="Mark all as read"
                >
                  <FaCheck className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {state.loading && recentNotifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Loading...
              </div>
            ) : recentNotifications.length === 0 ? (
              <div className="p-6 text-center">
                <FaBell className="mx-auto text-3xl text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">
                  No notifications yet
                </p>
              </div>
            ) : (
              <div>
                {recentNotifications.map((notification) => (
                  <div key={notification.id} className="border-b border-gray-100 last:border-b-0">
                    <NotificationItem
                      notification={notification}
                      showActions={false}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {recentNotifications.length > 0 && (
            <div className="border-t border-gray-200 p-3">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to notifications page (you'll need to implement this)
                  // navigate('/notifications');
                }}
                className="w-full flex items-center justify-center space-x-2 p-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors"
              >
                <FaEye className="w-3 h-3" />
                <span>View all notifications</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
