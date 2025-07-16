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
    apiClient.post('/auth/verify-email', data).then(res => res.data),

  resendVerification: (email: string) => 
    apiClient.post('/auth/resend-verification', { email }).then(res => res.data),

  requestPasswordReset: (data: ForgotPasswordRequest) => 
    apiClient.post('/auth/request-password-reset', data).then(res => res.data),

  resetPassword: (data: ResetPasswordRequest) => 
    apiClient.post('/auth/reset-password', data).then(res => res.data),

  refreshToken: () => 
    apiClient.post<AuthResponse>('/auth/refresh'),

  // Protected auth endpoints (require authentication)
  getProfile: () => 
    apiClient.get<{ data: { user: User } }>('/auth/profile').then(res => res.data?.data?.user),

  updateProfile: (data: UpdateProfileRequest) => 
    apiClient.patch<{ data: { user: User } }>('/auth/profile', data).then(res => res.data?.data?.user),

  changePassword: (data: ChangePasswordRequest) => 
    apiClient.post('/auth/change-password', data).then(res => res.data),

  logout: () => 
    apiClient.post('/auth/logout').then(res => res.data),

  logoutAll: () => 
    apiClient.post('/auth/logout-all').then(res => res.data),

  deleteAccount: () => 
    apiClient.delete('/auth/account').then(res => res.data),

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
