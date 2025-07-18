import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { notificationsAPI } from '../services/notifications';
import { Notification } from '../types';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

type NotificationsAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_NOTIFICATIONS'; payload: { notifications: Notification[]; pagination: any; unreadCount: number } }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'MARK_READ'; payload: string }
  | { type: 'MARK_ALL_READ' }
  | { type: 'DELETE_NOTIFICATION'; payload: string }
  | { type: 'SET_UNREAD_COUNT'; payload: number };

const initialState: NotificationsState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },
};

const notificationsReducer = (state: NotificationsState, action: NotificationsAction): NotificationsState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_NOTIFICATIONS':
      return { 
        ...state, 
        notifications: action.payload.notifications,
        pagination: action.payload.pagination,
        unreadCount: action.payload.unreadCount,
        loading: false 
      };
    case 'ADD_NOTIFICATION':
      return { 
        ...state, 
        notifications: [action.payload, ...state.notifications],
        unreadCount: state.unreadCount + 1
      };
    case 'MARK_READ':
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload
            ? { ...notification, isRead: true }
            : notification
        ),
        unreadCount: Math.max(0, state.unreadCount - 1)
      };
    case 'MARK_ALL_READ':
      return {
        ...state,
        notifications: state.notifications.map(notification => ({ ...notification, isRead: true })),
        unreadCount: 0
      };
    case 'DELETE_NOTIFICATION':
      const deletedNotification = state.notifications.find(n => n.id === action.payload);
      return {
        ...state,
        notifications: state.notifications.filter(notification => notification.id !== action.payload),
        unreadCount: deletedNotification && !deletedNotification.isRead 
          ? Math.max(0, state.unreadCount - 1) 
          : state.unreadCount
      };
    case 'SET_UNREAD_COUNT':
      return { ...state, unreadCount: action.payload };
    default:
      return state;
  }
};

interface NotificationsContextType {
  state: NotificationsState;
  loadNotifications: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  getUnreadCount: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

interface NotificationsProviderProps {
  children: ReactNode;
}

export const NotificationsProvider: React.FC<NotificationsProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(notificationsReducer, initialState);
  const { socket } = useSocket();
  const { user } = useAuth();

  // Load notifications
  const loadNotifications = async (params?: { page?: number; limit?: number; unreadOnly?: boolean }) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await notificationsAPI.getNotifications(params);
      dispatch({ 
        type: 'SET_NOTIFICATIONS', 
        payload: {
          notifications: response.notifications,
          pagination: response.pagination,
          unreadCount: response.unreadCount
        }
      });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to load notifications' });
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await notificationsAPI.markAsRead(notificationId);
      dispatch({ type: 'MARK_READ', payload: notificationId });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to mark as read' });
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      dispatch({ type: 'MARK_ALL_READ' });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to mark all as read' });
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      await notificationsAPI.deleteNotification(notificationId);
      dispatch({ type: 'DELETE_NOTIFICATION', payload: notificationId });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to delete notification' });
    }
  };

  // Get unread count
  const getUnreadCount = async () => {
    try {
      const count = await notificationsAPI.getUnreadCount();
      dispatch({ type: 'SET_UNREAD_COUNT', payload: count });
    } catch (error) {
      console.error('Failed to get unread count:', error);
    }
  };

  // Socket event listeners
  useEffect(() => {
    if (socket && user) {
      // Listen for new notifications
      socket.on('notification', (notification: Notification) => {
        dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
      });

      // Listen for notification read status updates
      socket.on('notification:read', (notificationId: string) => {
        dispatch({ type: 'MARK_READ', payload: notificationId });
      });

      return () => {
        socket.off('notification');
        socket.off('notification:read');
      };
    }
  }, [socket, user]);

  // Load initial data when user is authenticated
  useEffect(() => {
    if (user) {
      loadNotifications();
      getUnreadCount();
    }
  }, [user]);

  const value: NotificationsContextType = {
    state,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadCount,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = (): NotificationsContextType => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};
