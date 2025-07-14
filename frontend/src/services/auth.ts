import { apiClient } from './api';
import { 
  LoginRequest, 
  RegisterRequest, 
  User, 
  AuthResponse,
  VerifyEmailRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  UpdateProfileRequest
} from '../types';

// Authentication API methods
export const authAPI = {
  // Public auth endpoints
  register: (data: RegisterRequest) => 
    apiClient.post<AuthResponse>('/auth/register', data),

  login: (data: LoginRequest) => 
    apiClient.post<AuthResponse>('/auth/login', data),

  verifyEmail: (data: VerifyEmailRequest) => 
    apiClient.post('/auth/verify-email', data),

  resendVerification: (email: string) => 
    apiClient.post('/auth/resend-verification', { email }),

  requestPasswordReset: (data: ForgotPasswordRequest) => 
    apiClient.post('/auth/request-password-reset', data),

  resetPassword: (data: ResetPasswordRequest) => 
    apiClient.post('/auth/reset-password', data),

  refreshToken: () => 
    apiClient.post<AuthResponse>('/auth/refresh-token'),

  // Protected auth endpoints (require authentication)
  getProfile: () => 
    apiClient.get<User>('/auth/profile'),

  updateProfile: (data: UpdateProfileRequest) => 
    apiClient.patch<User>('/auth/profile', data),

  changePassword: (data: ChangePasswordRequest) => 
    apiClient.post('/auth/change-password', data),

  logout: () => 
    apiClient.post('/auth/logout'),

  logoutAll: () => 
    apiClient.post('/auth/logout-all'),

  deleteAccount: () => 
    apiClient.delete('/auth/account'),

  // Social authentication
  googleAuth: () => 
    apiClient.get('/auth/social/google'),

  facebookAuth: () => 
    apiClient.get('/auth/social/facebook'),

  twitterAuth: () => 
    apiClient.get('/auth/social/twitter'),

  instagramAuth: () => 
    apiClient.get('/auth/social/instagram'),
};

export default authAPI;
