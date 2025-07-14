import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import authAPI from '../services/auth';
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

      if (storedUser && storedTokens.accessToken && storedTokens.refreshToken) {
        const user = JSON.parse(storedUser);
        dispatch({ type: 'SET_USER', payload: user });
        dispatch({
          type: 'SET_TOKENS',
          payload: {
            accessToken: storedTokens.accessToken,
            refreshToken: storedTokens.refreshToken,
            expiresIn: 3600, // Default value
          },
        });

        // Verify token validity by fetching user profile
        try {
          const response = await authAPI.getProfile();
          if (response.data) {
            dispatch({ type: 'SET_USER', payload: response.data });
          }
        } catch (error) {
          // Token invalid, clear auth
          clearAuth();
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await authAPI.login(credentials);
      
      if (response.data) {
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
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await authAPI.register(credentials);
      
      if (response.data) {
        toast.success('Account created successfully! Please check your email for verification.');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed';
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

  const updateProfile = async (data: UpdateProfileData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await authAPI.updateProfile(data);
      
      if (response.data) {
        const updatedUser = response.data;
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
        dispatch({ type: 'UPDATE_USER', payload: updatedUser });
        toast.success('Profile updated successfully!');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Profile update failed';
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

  const verifyEmail = async (email: string, code: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await authAPI.verifyEmail({ email, code });
      
      if (response.data) {
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
