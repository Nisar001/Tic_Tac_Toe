import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import friendsAPI from '../services/friends';
import { Friend, FriendRequest } from '../types';
import { useSocket } from './SocketContext';

interface FriendsState {
  friends: Friend[];
  friendRequests: {
    sent: FriendRequest[];
    received: FriendRequest[];
  };
  onlineFriends: string[];
  loading: boolean;
  error: string | null;
}

type FriendsAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_FRIENDS'; payload: Friend[] }
  | { type: 'SET_FRIEND_REQUESTS'; payload: { sent: FriendRequest[]; received: FriendRequest[] } }
  | { type: 'ADD_FRIEND'; payload: Friend }
  | { type: 'REMOVE_FRIEND'; payload: string }
  | { type: 'ADD_FRIEND_REQUEST'; payload: { type: 'sent' | 'received'; request: FriendRequest } }
  | { type: 'REMOVE_FRIEND_REQUEST'; payload: string }
  | { type: 'SET_ONLINE_FRIENDS'; payload: string[] }
  | { type: 'FRIEND_ONLINE'; payload: string }
  | { type: 'FRIEND_OFFLINE'; payload: string };

const initialState: FriendsState = {
  friends: [],
  friendRequests: {
    sent: [],
    received: [],
  },
  onlineFriends: [],
  loading: false,
  error: null,
};

const friendsReducer = (state: FriendsState, action: FriendsAction): FriendsState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_FRIENDS':
      return { ...state, friends: action.payload, loading: false };
    case 'SET_FRIEND_REQUESTS':
      return { ...state, friendRequests: action.payload, loading: false };
    case 'ADD_FRIEND':
      return {
        ...state,
        friends: [...state.friends, action.payload],
      };
    case 'REMOVE_FRIEND':
      return {
        ...state,
        friends: state.friends.filter(friend => friend.id !== action.payload),
      };
    case 'ADD_FRIEND_REQUEST':
      return {
        ...state,
        friendRequests: {
          ...state.friendRequests,
          [action.payload.type]: [...state.friendRequests[action.payload.type], action.payload.request],
        },
      };
    case 'REMOVE_FRIEND_REQUEST':
      return {
        ...state,
        friendRequests: {
          sent: state.friendRequests.sent.filter(req => req.id !== action.payload),
          received: state.friendRequests.received.filter(req => req.id !== action.payload),
        },
      };
    case 'SET_ONLINE_FRIENDS':
      return { ...state, onlineFriends: action.payload };
    case 'FRIEND_ONLINE':
      return {
        ...state,
        onlineFriends: [...state.onlineFriends.filter(id => id !== action.payload), action.payload],
        friends: state.friends.map(friend =>
          friend.id === action.payload ? { ...friend, isOnline: true } : friend
        ),
      };
    case 'FRIEND_OFFLINE':
      return {
        ...state,
        onlineFriends: state.onlineFriends.filter(id => id !== action.payload),
        friends: state.friends.map(friend =>
          friend.id === action.payload ? { ...friend, isOnline: false } : friend
        ),
      };
    default:
      return state;
  }
};

interface FriendsContextType {
  state: FriendsState;
  loadFriends: () => Promise<void>;
  loadFriendRequests: () => Promise<void>;
  sendFriendRequest: (data: { receiverEmail?: string; receiverUsername?: string; message?: string }) => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  rejectFriendRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  searchUsers: (query: string) => Promise<any[]>;
}

const FriendsContext = createContext<FriendsContextType | undefined>(undefined);

export const useFriendsContext = () => {
  const context = useContext(FriendsContext);
  if (!context) {
    throw new Error('useFriendsContext must be used within a FriendsProvider');
  }
  return context;
};

interface FriendsProviderProps {
  children: ReactNode;
}

export const FriendsProvider: React.FC<FriendsProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(friendsReducer, initialState);
  const { socket } = useSocket();

  useEffect(() => {
    if (socket) {
      // Listen for friend status updates
      socket.on('friend:online', (data: { friendId: string }) => {
        dispatch({ type: 'FRIEND_ONLINE', payload: data.friendId });
      });

      socket.on('friend:offline', (data: { friendId: string }) => {
        dispatch({ type: 'FRIEND_OFFLINE', payload: data.friendId });
      });

      // Listen for new friend requests
      socket.on('friend_request:new', (data: { request: FriendRequest }) => {
        dispatch({ type: 'ADD_FRIEND_REQUEST', payload: { type: 'received', request: data.request } });
      });

      // Listen for friend request responses
      socket.on('friend_request:accepted', (data: { requestId: string; friend: Friend }) => {
        dispatch({ type: 'REMOVE_FRIEND_REQUEST', payload: data.requestId });
        dispatch({ type: 'ADD_FRIEND', payload: data.friend });
      });

      socket.on('friend_request:rejected', (data: { requestId: string }) => {
        dispatch({ type: 'REMOVE_FRIEND_REQUEST', payload: data.requestId });
      });

      return () => {
        socket.off('friend:online');
        socket.off('friend:offline');
        socket.off('friend_request:new');
        socket.off('friend_request:accepted');
        socket.off('friend_request:rejected');
      };
    }
  }, [socket]);

  const loadFriends = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await friendsAPI.getFriends();
      if (response.data) {
        // Transform User[] to Friend[] 
        const friends: Friend[] = response.data.map(user => ({
          id: user.id || user._id,
          user: user,
          friendSince: user.createdAt || new Date().toISOString(),
          status: 'offline' as const,
        }));
        dispatch({ type: 'SET_FRIENDS', payload: friends });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load friends' });
    }
  };

  const loadFriendRequests = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await friendsAPI.getFriendRequests();
      if (response.data) {
        dispatch({ type: 'SET_FRIEND_REQUESTS', payload: response.data });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load friend requests' });
    }
  };

  const sendFriendRequest = async (data: { receiverEmail?: string; receiverUsername?: string; message?: string }) => {
    try {
      const response = await friendsAPI.sendFriendRequest({ 
        username: data.receiverUsername || data.receiverEmail || '' 
      });
      if (response.data) {
        dispatch({ type: 'ADD_FRIEND_REQUEST', payload: { type: 'sent', request: response.data } });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to send friend request' });
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    try {
      await friendsAPI.acceptFriendRequest(requestId);
      dispatch({ type: 'REMOVE_FRIEND_REQUEST', payload: requestId });
      // Friend will be added via socket event
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to accept friend request' });
    }
  };

  const rejectFriendRequest = async (requestId: string) => {
    try {
      await friendsAPI.rejectFriendRequest(requestId);
      dispatch({ type: 'REMOVE_FRIEND_REQUEST', payload: requestId });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to reject friend request' });
    }
  };

  const removeFriend = async (friendId: string) => {
    try {
      await friendsAPI.removeFriend(friendId);
      dispatch({ type: 'REMOVE_FRIEND', payload: friendId });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to remove friend' });
    }
  };

  const searchUsers = async (query: string) => {
    try {
      const response = await friendsAPI.searchUsers(query);
      return response.data || [];
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to search users' });
      return [];
    }
  };

  const value: FriendsContextType = {
    state,
    loadFriends,
    loadFriendRequests,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    searchUsers,
  };

  return <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>;
};
