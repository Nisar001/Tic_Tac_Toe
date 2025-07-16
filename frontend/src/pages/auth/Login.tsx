import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';
import { LoginCredentials } from '../../types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ConnectionTest from '../../components/debug/ConnectionTest';
import { EyeIcon, EyeSlashIcon, UserIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { FaGoogle, FaFacebook } from 'react-icons/fa';
import { API_BASE_URL } from '../../constants';
import toast from 'react-hot-toast';

const schema = yup.object({
  email: yup
    .string()
    .email('Please enter a valid email')
    .required('Email is required'),
  password: yup
    .string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
});

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [searchParams] = useSearchParams();
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginCredentials>({
    resolver: yupResolver(schema),
  });

  // Handle error messages from URL params (social auth failures)
  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      switch (error) {
        case 'google_auth_failed':
          toast.error('Google authentication failed. Please try again.');
          break;
        case 'facebook_auth_failed':
          toast.error('Facebook authentication failed. Please try again.');
          break;
        case 'authentication_failed':
          toast.error('Authentication failed. Please try again.');
          break;
        case 'invalid_user_data':
          toast.error('Invalid user data received. Please try again.');
          break;
        case 'token_generation_failed':
          toast.error('Failed to generate authentication tokens. Please try again.');
          break;
        case 'callback_processing_failed':
          toast.error('Authentication processing failed. Please try again.');
          break;
        default:
          toast.error('Authentication failed. Please try again.');
      }
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [searchParams]);

  const onSubmit = async (data: LoginCredentials) => {
    if (!isBackendConnected) {
      toast.error('Cannot login: Backend is not reachable. Please check your connection.');
      return;
    }

    try {
      console.log('Attempting login with:', { email: data.email, passwordLength: data.password.length });
      console.log('API_BASE_URL:', API_BASE_URL);
      
      await login(data);
      toast.success('Login successful! Redirecting...');
      navigate('/');
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Enhanced error handling
      if (error.response?.status === 401) {
        toast.error('Invalid email or password. Please check your credentials.');
      } else if (error.response?.status === 429) {
        toast.error('Too many login attempts. Please try again later.');
      } else if (error.response?.status >= 500) {
        toast.error('Server error. Please try again later.');
      } else if (error.message === 'Network Error') {
        toast.error('Network error. Please check your internet connection.');
      } else {
        const message = error.response?.data?.message || error.message || 'Login failed';
        toast.error(message);
      }
    }
  };

  const handleSocialLogin = (provider: 'google' | 'facebook') => {
    try {
      // Construct the proper social auth URL - Note: /social/ is required
      const socialAuthUrl = `${API_BASE_URL}/auth/social/${provider}`;
      console.log('Redirecting to:', socialAuthUrl);
      
      // Store the current location for redirect after auth
      localStorage.setItem('auth_redirect_url', window.location.pathname);
      
      // Redirect to the social auth provider
      window.location.href = socialAuthUrl;
    } catch (error) {
      console.error(`Error initiating ${provider} login:`, error);
      toast.error(`Failed to initiate ${provider} login. Please try again.`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="card w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 gradient-text text-center">Sign In</h2>
        {/* Social Login Buttons */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            type="button"
            className="btn-secondary flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
            onClick={() => handleSocialLogin('google')}
            disabled={isLoading}
          >
            <FaGoogle className="text-lg text-red-500" /> Continue with Google
          </button>
          <button
            type="button"
            className="btn-secondary flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
            onClick={() => handleSocialLogin('facebook')}
            disabled={isLoading}
          >
            <FaFacebook className="text-lg text-blue-600" /> Continue with Facebook
          </button>
        </div>

        {/* Connection Test */}
        <ConnectionTest onConnectionStatus={setIsBackendConnected} />

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gradient-to-br from-primary-50 via-white to-secondary-50 text-gray-500">Or continue with email</span>
          </div>
        </div>

        {/* Login Form */}
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                className={`input-field pl-10 ${errors.email ? 'border-red-300 focus:ring-red-500' : ''}`}
                placeholder="Enter your email"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LockClosedIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className={`input-field pl-10 pr-10 ${errors.password ? 'border-red-300 focus:ring-red-500' : ''}`}
                placeholder="Enter your password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link
                to="/auth/forgot-password"
                className="font-medium text-primary-600 hover:text-primary-500 transition-colors duration-200"
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        {/* Sign up link */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link
              to="/auth/register"
              className="font-medium text-primary-600 hover:text-primary-500 transition-colors duration-200"
            >
              Sign up now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
