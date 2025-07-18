import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import authAPI from '../../services/auth';
import { STORAGE_KEYS } from '../../constants';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const token = searchParams.get('token');
        const refreshTokenValue = searchParams.get('refreshToken');
        const provider = searchParams.get('provider');
        const success = searchParams.get('success');
        const error = searchParams.get('error');

        if (error) {
          console.error('Social auth error:', error);
          toast.error(`Authentication failed: ${error.replace(/_/g, ' ')}`);
          navigate('/auth/login');
          return;
        }

        if (success === 'true' && token && refreshTokenValue) {
          // Store tokens in localStorage
          localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshTokenValue);
          try {
            // Use the context method to fetch and set user profile
            await refreshUser();
            // Get redirect URL or default to dashboard
            const redirectUrl = localStorage.getItem('auth_redirect_url') || '/';
            localStorage.removeItem('auth_redirect_url');
            toast.success(`Successfully logged in with ${provider || 'social provider'}!`);
            navigate(redirectUrl);
          } catch (profileError) {
            console.error('Failed to get user profile:', profileError);
            toast.error('Authentication failed: Unable to retrieve user profile');
            localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
            localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
            navigate('/auth/login');
          }
        } else {
          console.error('Missing required auth parameters');
          toast.error('Authentication failed: Missing required parameters');
          navigate('/auth/login');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        toast.error('Authentication failed. Please try again.');
        navigate('/auth/login');
      }
    };

    handleCallback();
  }, [searchParams, navigate, refreshUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Completing Authentication
          </h2>
          <p className="text-gray-600">
            Please wait while we complete your login...
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
