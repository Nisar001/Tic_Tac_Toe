import React, { createContext, useContext, useReducer, useEffect, ReactNode, useState } from 'react';
import toast from 'react-hot-toast';
import friendsAPI from '../services/friends';
import { Friend, FriendRequest } from '../types';
import { useSocket } from './SocketContext';
import { useAPIManager } from './APIManagerContext';

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

const FriendsContext = createContext<FriendsContextType | undefined>(undefined);

export const useFriendsContext = () => {
  const context = useContext(FriendsContext);
  if (!context) {
    throw new Error('useFriendsContext must be used within a FriendsProvider');
  }
  return context;
};

export interface FriendsContextType {
  state: FriendsState;
  loadFriends: (retry?: boolean) => Promise<void>;
  loadFriendRequests: (retry?: boolean) => Promise<void>;
  sendFriendRequest: (data: { receiverId: string; message?: string }) => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  rejectFriendRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  searchUsers: (query: string) => Promise<any[]>;
  getAvailableUsers: (limit?: number, page?: number) => Promise<any[]>;
}

export const FriendsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(friendsReducer, initialState);
  const { socket } = useSocket();
  const { executeAPI } = useAPIManager();
  
  // Loading flags to prevent multiple simultaneous requests
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendRequestsLoading, setFriendRequestsLoading] = useState(false);

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

  // Load friends using APIManager
  const loadFriends = async (retry = false) => {
    if (state.loading || friendsLoading) return;
    setFriendsLoading(true);
    
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const users = await executeAPI(
        'loadFriends',
        () => friendsAPI.getFriends(),
        {
          showToast: false,
          preventDuplicates: true
        }
      );

      if (users && Array.isArray(users)) {
        const friends: Friend[] = users.map(user => {
          const mappedUser = { ...user, id: user.id || user._id };
          return {
            id: mappedUser.id,
            user: mappedUser,
            friendSince: mappedUser.createdAt || new Date().toISOString(),
            status: 'offline' as const,
          };
        });
        
        dispatch({ type: 'SET_FRIENDS', payload: friends });
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to load friends';
      dispatch({ type: 'SET_ERROR', payload: message });
      if (!retry) throw new Error(message);
    } finally {
      setFriendsLoading(false);
    }
  };

  // Load friend requests from new modular endpoint
  const loadFriendRequests = async (retry = false) => {
    if (state.loading || friendRequestsLoading) return;
    setFriendRequestsLoading(true);
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const requests = await friendsAPI.getFriendRequests();
      const mapReq = (req: any) => ({
        ...req,
        id: req.id || req._id,
        sender: req.sender ? { ...req.sender, id: req.sender.id || req.sender._id } : req.sender,
        recipient: req.recipient ? { ...req.recipient, id: req.recipient.id || req.recipient._id } : req.recipient,
      });
      dispatch({
        type: 'SET_FRIEND_REQUESTS',
        payload: {
          sent: (requests.sent || []).map(mapReq),
          received: (requests.received || []).map(mapReq),
        },
      });
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to load friend requests';
      dispatch({ type: 'SET_ERROR', payload: message });
      toast.error(message);
      if (!retry) throw new Error(message);
    } finally {
      setFriendRequestsLoading(false);
    }
  };

  // Send friend request using APIManager
  const sendFriendRequest = async (data: { receiverId: string; message?: string }) => {
    try {
      const request = await executeAPI(
        'sendFriendRequest',
        () => friendsAPI.sendFriendRequest({ receiverId: data.receiverId, message: data.message }),
        {
          showToast: true,
          preventDuplicates: true
        }
      );
      
      if (request) {
        dispatch({ type: 'ADD_FRIEND_REQUEST', payload: { type: 'sent', request } });
        toast.success('Friend request sent successfully!');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send friend request';
      dispatch({ type: 'SET_ERROR', payload: message });
    }
  };

  // Accept friend request using APIManager
  const acceptFriendRequest = async (requestId: string) => {
    try {
      await executeAPI(
        `acceptFriendRequest_${requestId}`,
        () => friendsAPI.acceptFriendRequest(requestId),
        {
          showToast: true,
          preventDuplicates: true
        }
      );
      
      dispatch({ type: 'REMOVE_FRIEND_REQUEST', payload: requestId });
      toast.success('Friend request accepted!');
      // Friend will be added via socket event
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to accept friend request';
      dispatch({ type: 'SET_ERROR', payload: message });
    }
  };

  // Reject friend request using new endpoint
  const rejectFriendRequest = async (requestId: string) => {
    try {
      await friendsAPI.rejectFriendRequest(requestId);
      dispatch({ type: 'REMOVE_FRIEND_REQUEST', payload: requestId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reject friend request';
      dispatch({ type: 'SET_ERROR', payload: message });
      toast.error(message);
    }
  };

  // Remove friend using new endpoint
  const removeFriend = async (friendId: string) => {
    try {
      await friendsAPI.removeFriend(friendId);
      dispatch({ type: 'REMOVE_FRIEND', payload: friendId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove friend';
      dispatch({ type: 'SET_ERROR', payload: message });
      toast.error(message);
    }
  };

  // Search users using new endpoint
  const searchUsers = async (query: string) => {
    try {
      const users = await friendsAPI.searchUsers(query);
      return users || [];
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to search users';
      dispatch({ type: 'SET_ERROR', payload: message });
      toast.error(message);
      return [];
    }
  };

  // Get available users (not friends, not blocked)
  const getAvailableUsers = async (limit = 50, page = 1) => {
    try {
      
      const users = await friendsAPI.getAvailableUsers(limit, page);
      
      return users || [];
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get available users';
      console.error('❌ Failed to get available users:', message);
      dispatch({ type: 'SET_ERROR', payload: message });
      toast.error(message);
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
    getAvailableUsers,
  };

  return <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>;
};


