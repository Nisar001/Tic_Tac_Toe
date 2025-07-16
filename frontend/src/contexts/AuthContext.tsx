import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import authAPI from '../services/auth';
import { apiClient } from '../services/api';
import { STORAGE_KEYS } from '../constants';
import {
  AuthContextType,
  User,
  AuthTokens,
  LoginCredentials,
  RegisterCredentials,
  UpdateProfileData,
  ChangePasswordCredentials,
  ResetPasswordCredentials,
} from '../types';
import toast from 'react-hot-toast';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User }
  | { type: 'SET_TOKENS'; payload: AuthTokens }
  | { type: 'CLEAR_AUTH' }
  | { type: 'UPDATE_USER'; payload: Partial<User> };

const initialState: AuthState = {
  user: null,
  tokens: null,
  isLoading: true,
  isAuthenticated: false,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return { 
        ...state, 
        user: action.payload, 
        isAuthenticated: true, 
        isLoading: false 
      };
    case 'SET_TOKENS':
      return { ...state, tokens: action.payload };
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };
    case 'CLEAR_AUTH':
      return {
        ...state,
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
      };
    default:
      return state;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Set up API client callback for token expiration
  useEffect(() => {
    apiClient.setTokenExpiredCallback(() => {
      clearAuth();
      toast.error('Session expired. Please login again.');
    });
  }, []);

  useEffect(() => {
    initializeAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const initializeAuth = async () => {
    try {
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
      const storedTokens = {
        accessToken: localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
        refreshToken: localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
      };

      if (storedUser && storedTokens.accessToken) {
        // Set loading state
        dispatch({ type: 'SET_LOADING', payload: true });
        
        try {
          // Verify token by fetching fresh user profile
          const user = await authAPI.getProfile();
          if (user) {
            // Only set user and tokens if verification succeeds
            dispatch({ type: 'SET_USER', payload: user });
            dispatch({
              type: 'SET_TOKENS',
              payload: {
                accessToken: storedTokens.accessToken,
                refreshToken: storedTokens.refreshToken || '',
                expiresIn: 3600,
              },
            });
          } else {
            console.warn('Profile verification returned null user');
            clearAuth();
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          // Check if it's a network error vs auth error
          if (error instanceof Error && error.message.includes('Network Error')) {
            // Network issue - keep tokens but show as not authenticated until network recovers
            dispatch({ type: 'SET_LOADING', payload: false });
          } else {
            // Auth error - clear everything
            clearAuth();
          }
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      clearAuth();
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await authAPI.login(credentials);
      
      // The API client returns ApiResponse<AuthResponse>
      if (response.success && response.data) {
        const { user, token, refreshToken } = response.data;
        
        const tokens = {
          accessToken: token,
          refreshToken: refreshToken || '',
          expiresIn: 3600, // Default 1 hour
        };
        
        // Store in localStorage
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
        if (refreshToken) {
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        }
        
        // Update state
        dispatch({ type: 'SET_USER', payload: user });
        dispatch({ type: 'SET_TOKENS', payload: tokens });
        
        toast.success('Successfully logged in!');
      } else {
        throw new Error(response.message || 'Invalid response format');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Login failed';
      toast.error(message);
      
      // Re-throw the error so the component can handle it too
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Send all credentials including confirmPassword (backend validation expects it)
      const registerData = {
        username: credentials.username,
        email: credentials.email,
        password: credentials.password,
        confirmPassword: credentials.confirmPassword,
      };
      
      const response = await authAPI.register(registerData);
      
      if (response.success) {
        toast.success('Account created successfully! Please check your email for verification.');
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Registration failed';
      toast.error(message);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
      toast.success('Successfully logged out!');
    }
  };

  const refreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) throw new Error('No refresh token available');

      const response = await authAPI.refreshToken();

      if (response.data) {
        const { token, refreshToken: newRefreshToken } = response.data;
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
        if (newRefreshToken) {
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
        }
        
        dispatch({
          type: 'SET_TOKENS',
          payload: {
            accessToken: token,
            refreshToken: newRefreshToken || refreshToken,
            expiresIn: 3600,
          },
        });
      }
    } catch (error) {
      clearAuth();
      throw error;
    }
  };

  const refreshUser = async () => {
    try {
      const updatedUser = await authAPI.getProfile();
      if (updatedUser) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
        dispatch({ type: 'SET_USER', payload: updatedUser });
      } else {
        throw new Error('Failed to get user profile');
      }
    } catch (error) {
      throw error;
    }
  };

  const updateProfile = async (data: UpdateProfileData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const updatedUser = await authAPI.updateProfile(data);
      if (updatedUser) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
        dispatch({ type: 'UPDATE_USER', payload: updatedUser });
        toast.success('Profile updated successfully!');
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Profile update failed';
      toast.error(message);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const changePassword = async (credentials: ChangePasswordCredentials) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await authAPI.changePassword(credentials);
      
      if (response.data) {
        toast.success('Password changed successfully!');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Password change failed';
      toast.error(message);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const verifyEmail = async (email: string, verificationCode: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await authAPI.verifyEmail({ email, verificationCode });
      
      if (response.success) {
        if (state.user) {
          dispatch({
            type: 'UPDATE_USER',
            payload: { isEmailVerified: true },
          });
        }
        toast.success('Email verified successfully!');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Email verification failed';
      toast.error(message);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const resendVerification = async (email: string) => {
    try {
      const response = await authAPI.resendVerification(email);
      
      if (response.data) {
        toast.success('Verification email sent!');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send verification email';
      toast.error(message);
      throw error;
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      const response = await authAPI.requestPasswordReset({ email });
      
      if (response.data) {
        toast.success('Password reset email sent!');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send reset email';
      toast.error(message);
      throw error;
    }
  };

  const resetPassword = async (credentials: ResetPasswordCredentials) => {
    try {
      const response = await authAPI.resetPassword(credentials);
      
      if (response.data) {
        toast.success('Password reset successfully!');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Password reset failed';
      toast.error(message);
      throw error;
    }
  };

  const clearAuth = () => {
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    dispatch({ type: 'CLEAR_AUTH' });
  };

  const value: AuthContextType = {
    user: state.user,
    tokens: state.tokens,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    login,
    register,
    logout,
    refreshToken,
    refreshUser,
    updateProfile,
    changePassword,
    verifyEmail,
    resendVerification,
    requestPasswordReset,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
