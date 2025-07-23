import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import authAPI from '../services/auth';
import { apiClient } from '../services/api';
import { STORAGE_KEYS } from '../constants';
import {
  AuthContextType,
  User,
  UserStats,
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
        dispatch({ type: 'SET_LOADING', payload: true });
        let profileResponse;
        try {
          profileResponse = await authAPI.getProfile();
        } catch (error: any) {
          // If token expired, try to refresh
          if (error.response?.status === 401 && storedTokens.refreshToken) {
            try {
              const refreshResponse = await authAPI.refreshToken(storedTokens.refreshToken);
              if (
                refreshResponse &&
                refreshResponse.success &&
                refreshResponse.data &&
                refreshResponse.data.data &&
                refreshResponse.data.data.tokens
              ) {
                const { accessToken, refreshToken } = refreshResponse.data.data.tokens;
                localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
                if (refreshToken) {
                  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
                }
                // Retry profile fetch with new token
                profileResponse = await authAPI.getProfile();
              } else {
                clearAuth();
                dispatch({ type: 'SET_LOADING', payload: false });
                return;
              }
            } catch (refreshError) {
              clearAuth();
              dispatch({ type: 'SET_LOADING', payload: false });
              return;
            }
          } else {
            clearAuth();
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
          }
        }
        // Set user and tokens if profile fetch succeeded
        if (profileResponse && profileResponse.success && profileResponse.data && profileResponse.data.user) {
          const user = profileResponse.data.user;
          dispatch({ type: 'SET_USER', payload: user });
          dispatch({
            type: 'SET_TOKENS',
            payload: {
              accessToken: localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || '',
              refreshToken: localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) || '',
              expiresIn: 3600,
            },
          });
        } else {
          clearAuth();
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
      
      // Check if login was successful
      if (response && response.success && response.data) {
        const { user, tokens } = response.data as any;
        const { accessToken, refreshToken } = tokens;
        
        const tokenData = {
          accessToken,
          refreshToken: refreshToken || '',
          expiresIn: 3600, // Default 1 hour
        };
        
        // Store in localStorage
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        if (refreshToken) {
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        }
        
        // Update state
        dispatch({ type: 'SET_USER', payload: user });
        dispatch({ type: 'SET_TOKENS', payload: tokenData });
        
        toast.success('Successfully logged in!');
      } else {
        throw new Error(response?.message || 'Login failed');
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
      const registerData = {
        username: credentials.username,
        email: credentials.email,
        password: credentials.password,
        confirmPassword: credentials.confirmPassword,
      };
      const response = await authAPI.register(registerData);
      // The API client wraps the backend response: ApiResponse<RegisterResponse>
      if (response && response.data && response.data.success) {
        const message = response.data.message || 'Account created successfully!';
        toast.success(message);
        // If backend returns user and tokens, store them (rare for register, but possible)
        if (response.data.data && response.data.data.user) {
          // Optionally store user info for immediate login after registration
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.data.data.user));
          // If tokens are present (auto-login), store them
          if (response.data.data.tokens) {
            const { accessToken, refreshToken } = response.data.data.tokens;
            localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
            if (refreshToken) {
              localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
            }
            dispatch({ type: 'SET_TOKENS', payload: response.data.data.tokens });
            dispatch({ type: 'SET_USER', payload: response.data.data.user });
          }
        }
        // If verification is required, show info toast
        if (response.data.data && response.data.data.verificationRequired) {
          toast('Please verify your email to activate your account.', { icon: '📧' });
        }
      } else {
        throw new Error(response?.data?.message || response?.message || 'Registration failed');
      }
    } catch (error: any) {
      let message = 'Registration failed';
      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        message = error.response.data.errors.map((err: any) => err.msg || err.message).join(', ');
      } else if (error.message) {
        message = error.message;
      }
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
      const storedRefreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!storedRefreshToken) throw new Error('No refresh token available');

      const response = await authAPI.refreshToken(storedRefreshToken);

      // The API client wraps the backend response: ApiResponse<AuthResponse>
      if (response && response.success && response.data && response.data.success) {
        const { user, tokens } = response.data.data;
        const { accessToken, refreshToken: newRefreshToken } = tokens;
        
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        if (newRefreshToken) {
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
        }
        
        dispatch({
          type: 'SET_TOKENS',
          payload: {
            accessToken,
            refreshToken: newRefreshToken || storedRefreshToken,
            expiresIn: 3600,
          },
        });
        
        if (user) {
          dispatch({ type: 'SET_USER', payload: user });
        }
      }
    } catch (error) {
      clearAuth();
      throw error;
    }
  };

  const refreshUser = async () => {
    try {
      const response = await authAPI.getProfile();
      // The backend returns { success, message, data: { user: ... } }
      const user = response?.data?.user;
      if (user && user._id) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        dispatch({ type: 'SET_USER', payload: user });
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
      
      const response = await authAPI.updateProfile(data);
      if (response && response.success && response.data && response.data.success) {
        const user = response.data.user;
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        dispatch({ type: 'UPDATE_USER', payload: user });
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

  const updateUserStats = (newStats: Partial<UserStats>) => {
    if (state.user) {
      const updatedUser = {
        ...state.user,
        stats: {
          ...state.user.stats,
          ...newStats,
        },
      };
      
      // Update localStorage
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
      
      // Update state
      dispatch({ type: 'UPDATE_USER', payload: { stats: updatedUser.stats } });
    }
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
    updateUserStats,
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


