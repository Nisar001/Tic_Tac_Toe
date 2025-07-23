import React, { useEffect, useState } from 'react';
import { useNotifications } from '../../contexts/NotificationsContext';
import { NotificationItem } from './NotificationItem';
import { FaBell, FaCheck, FaSpinner, FaTimes } from 'react-icons/fa';

export const NotificationsList: React.FC = () => {
  const { state, loadNotifications, markAllAsRead, deleteAllRead } = useNotifications();
  const [deletingAll, setDeletingAll] = useState(false);
  const [deleteAllMsg, setDeleteAllMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const filteredNotifications = state.notifications.filter(notification => {
    if (filter === 'unread') {
      return !notification.isRead;
    }
    return true;
  });

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleDeleteAllRead = async () => {
    setDeletingAll(true);
    setDeleteAllMsg(null);
    const deleted = await deleteAllRead();
    setDeleteAllMsg(deleted > 0 ? `Deleted ${deleted} read notification${deleted > 1 ? 's' : ''}.` : 'No read notifications to delete.');
    setDeletingAll(false);
  };

  if (state.loading && state.notifications.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <FaSpinner className="animate-spin text-gray-400 text-2xl" />
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-500 mb-2">
          Error loading notifications
        </div>
        <p className="text-gray-500 text-sm mb-4">{state.error}</p>
        <button
          onClick={() => loadNotifications()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Removed duplicate function declarations and unreachable code

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FaBell className="text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Notifications
            </h2>
            {state.unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                {state.unreadCount}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Filter buttons */}
            <div className="flex bg-gray-100 rounded-md p-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                  filter === 'all'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                  filter === 'unread'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Unread ({state.unreadCount})
              </button>
            </div>

            {/* Mark all as read */}
            {state.unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="p-2 text-green-600 hover:text-green-700 hover:bg-green-100 rounded transition-colors"
                title="Mark all as read"
              >
                <FaCheck />
              </button>
            )}

            {/* Delete all read notifications */}
            <button
              onClick={handleDeleteAllRead}
              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
              title="Delete all read notifications"
              disabled={deletingAll}
            >
              {deletingAll ? <FaSpinner className="animate-spin" /> : <FaTimes />}
            </button>
          </div>
        </div>
        {deleteAllMsg && (
          <div className="mt-2 text-xs text-gray-500">{deleteAllMsg}</div>
        )}
      </div>

      {/* Notifications list */}
      <div className="max-h-96 overflow-y-auto">
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <FaBell className="mx-auto text-4xl text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
            </h3>
            <p className="text-gray-500">
              {filter === 'unread' 
                ? 'All caught up! You have no new notifications.'
                : 'You\'ll see notifications here when you receive them.'
              }
            </p>
          </div>
        ) : (
          <div>
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                showActions={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* Load more button if there are more pages */}
      {state.pagination.page < state.pagination.pages && (
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={() => loadNotifications({ 
              page: state.pagination.page + 1,
              limit: state.pagination.limit 
            })}
            disabled={state.loading}
            className="w-full py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            {state.loading ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
};


