import React from 'react';
import { Notification } from '../../types';
import { useNotifications } from '../../contexts/NotificationsContext';
import { 
  FaBell, 
  FaGamepad, 
  FaUsers, 
  FaTrophy, 
  FaCog, 
  FaCheck, 
  FaTimes 
} from 'react-icons/fa';

// Simple time ago function
const timeAgo = (date: string) => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return past.toLocaleDateString();
};

interface NotificationItemProps {
  notification: Notification;
  showActions?: boolean;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ 
  notification, 
  showActions = true 
}) => {
  const { markAsRead, deleteNotification } = useNotifications();

  const getIcon = (type: string) => {
    switch (type) {
      case 'game_invite':
        return <FaGamepad className="text-blue-500" />;
      case 'friend_request':
        return <FaUsers className="text-green-500" />;
      case 'game_result':
        return <FaTrophy className="text-yellow-500" />;
      case 'achievement':
        return <FaTrophy className="text-purple-500" />;
      case 'system':
        return <FaCog className="text-gray-500" />;
      default:
        return <FaBell className="text-blue-500" />;
    }
  };

  const handleMarkAsRead = async () => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
  };

  const handleDelete = async () => {
    await deleteNotification(notification.id);
  };

  return (
    <div className={`p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${
      !notification.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
    }`}>
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className="flex-shrink-0 p-2 bg-white rounded-full shadow-sm">
          {getIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className={`text-sm font-medium ${
                !notification.isRead ? 'text-gray-900' : 'text-gray-600'
              }`}>
                {notification.title}
              </h4>
              <p className="text-sm text-gray-500 mt-1">
                {notification.message}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {timeAgo(notification.createdAt)}
              </p>
            </div>

            {/* Actions */}
            {showActions && (
              <div className="flex items-center space-x-2 ml-4">
                {!notification.isRead && (
                  <button
                    onClick={handleMarkAsRead}
                    className="p-1 text-green-600 hover:text-green-700 hover:bg-green-100 rounded transition-colors"
                    title="Mark as read"
                  >
                    <FaCheck className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  className="p-1 text-red-600 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
                  title="Delete notification"
                >
                  <FaTimes className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Unread indicator */}
          {!notification.isRead && (
            <div className="absolute right-4 top-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


