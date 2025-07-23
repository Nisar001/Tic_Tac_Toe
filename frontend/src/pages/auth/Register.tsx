import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';
import { RegisterCredentials } from '../../types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { EyeIcon, EyeSlashIcon, UserIcon, LockClosedIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { FaGoogle, FaFacebook } from 'react-icons/fa';
import { API_BASE_URL } from '../../constants';

// Extended registration form data with terms acceptance
interface RegisterFormData extends RegisterCredentials {
  acceptTerms: boolean;
}

const schema = yup.object({
  username: yup
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .required('Username is required'),
  email: yup
    .string()
    .email('Please enter a valid email')
    .required('Email is required'),
  password: yup
    .string()
    .min(6, 'Password must be at least 6 characters')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/, 'Password must contain at least one letter and one number')
    .required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),
  acceptTerms: yup
    .boolean()
    .oneOf([true], 'You must accept the terms and conditions')
    .required('You must accept the terms and conditions'),
});

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register: registerUser, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: yupResolver(schema),
  });

  const password = watch('password', '');

  // Password strength validation
  const passwordChecks = {
    length: password.length >= 6,
    hasLetter: /[A-Za-z]/.test(password),
    hasNumber: /\d/.test(password),
  };

  const onSubmit = async (data: RegisterFormData) => {
    try {
      // Extract only the registration credentials (exclude acceptTerms)
      const { acceptTerms, ...credentials } = data;
      
      await registerUser(credentials);
      
      // Navigate to verify email page with email as URL parameter
      navigate(`/auth/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch (error) {
      console.error('Registration failed in component:', error);
      // Error is handled by the auth context
    }
  };

  const handleSocialSignup = (provider: 'google' | 'facebook') => {
    window.location.href = `${API_BASE_URL}/auth/social/${provider}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="card w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 gradient-text text-center">
          Create Account
        </h2>
        <div className="flex justify-center gap-4 mb-6">
          <button
            type="button"
            className="btn-secondary flex items-center gap-2 px-6 py-2 text-sm"
            onClick={() => handleSocialSignup('google')}
          >
            <FaGoogle className="text-lg" />
            Sign up with Google
          </button>
          <button
            type="button"
            className="btn-secondary flex items-center gap-2 px-6 py-2 text-sm"
            onClick={() => handleSocialSignup('facebook')}
          >
            <FaFacebook className="text-lg" />
            Sign up with Facebook
          </button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">Or continue with email</span>
          </div>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                {...register('username')}
                type="text"
                autoComplete="username"
                className={`input-field pl-10 ${errors.username ? 'border-red-300 focus:ring-red-500' : ''}`}
                placeholder="Choose a username"
              />
            </div>
            {errors.username && (
              <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <EnvelopeIcon className="h-5 w-5 text-gray-400" />
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
                autoComplete="new-password"
                className={`input-field pl-10 pr-10 ${errors.password ? 'border-red-300 focus:ring-red-500' : ''}`}
                placeholder="Create a password"
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
            
            {/* Password strength indicator */}
            {password && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-600">Password requirements:</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div className={`flex items-center ${passwordChecks.length ? 'text-green-600' : 'text-gray-400'}`}>
                    <span className="mr-1">{passwordChecks.length ? '✓' : '○'}</span>
                    At least 6 characters
                  </div>
                  <div className={`flex items-center ${passwordChecks.hasLetter ? 'text-green-600' : 'text-gray-400'}`}>
                    <span className="mr-1">{passwordChecks.hasLetter ? '✓' : '○'}</span>
                    At least one letter
                  </div>
                  <div className={`flex items-center ${passwordChecks.hasNumber ? 'text-green-600' : 'text-gray-400'}`}>
                    <span className="mr-1">{passwordChecks.hasNumber ? '✓' : '○'}</span>
                    At least one number
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LockClosedIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                {...register('confirmPassword')}
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className={`input-field pl-10 pr-10 ${errors.confirmPassword ? 'border-red-300 focus:ring-red-500' : ''}`}
                placeholder="Confirm your password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Terms and Conditions */}
          <div>
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  {...register('acceptTerms')}
                  type="checkbox"
                  className={`focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded ${errors.acceptTerms ? 'border-red-300' : ''}`}
                />
              </div>
              <div className="ml-3 text-sm">
                <label className="text-gray-700">
                  I agree to the{' '}
                  <Link
                    to="/terms"
                    className="font-medium text-primary-600 hover:text-primary-500"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Terms and Conditions
                  </Link>
                  {' '}and{' '}
                  <Link
                    to="/privacy"
                    className="font-medium text-primary-600 hover:text-primary-500"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Privacy Policy
                  </Link>
                </label>
              </div>
            </div>
            {errors.acceptTerms && (
              <p className="mt-1 text-sm text-red-600">{errors.acceptTerms.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        {/* Sign in link */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              to="/auth/login"
              className="font-medium text-primary-600 hover:text-primary-500 transition-colors duration-200"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;


