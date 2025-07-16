import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import authAPI from '../../services/auth';
import { VerifyEmailRequest } from '../../types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { EnvelopeIcon, KeyIcon } from '@heroicons/react/24/outline';

const schema = yup.object({
  email: yup
    .string()
    .email('Please enter a valid email')
    .required('Email is required'),
  verificationCode: yup
    .string()
    .min(6, 'Verification code must be 6 characters')
    .max(6, 'Verification code must be 6 characters')
    .matches(/^\d{6}$/, 'Verification code must be 6 digits')
    .required('Verification code is required'),
});

const VerifyEmail: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<VerifyEmailRequest>({
    resolver: yupResolver(schema),
  });

  // Set email from URL params if available
  useEffect(() => {
    const email = searchParams.get('email');
    if (email) {
      setValue('email', email);
    }
  }, [searchParams, setValue]);

  // Handle resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const onSubmit = async (data: VerifyEmailRequest) => {
    try {
      setIsLoading(true);
      console.log('Submitting verification data:', data);
      
      const response = await authAPI.verifyEmail(data);
      console.log('Verification response:', response);
      
      if (response.success) {
        toast.success('Email verified successfully! You can now login.');
        navigate('/auth/login');
      } else {
        toast.error(response.message || 'Email verification failed');
      }
    } catch (error: any) {
      console.error('Email verification error:', error);
      console.error('Error response:', error.response);
      
      let message = 'Verification failed. Please try again.';
      
      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.response?.data?.errors) {
        // Handle validation errors
        const errors = error.response.data.errors;
        if (Array.isArray(errors) && errors.length > 0) {
          message = errors.map(err => err.msg || err.message).join(', ');
        }
      }
      
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const email = searchParams.get('email');
    if (!email) {
      toast.error('Email address is required to resend verification');
      return;
    }

    try {
      setResendLoading(true);
      const response = await authAPI.resendVerification(email);
      
      if (response.success) {
        toast.success('Verification email sent! Please check your inbox.');
        setResendCooldown(60); // 60 seconds cooldown
      } else {
        toast.error(response.message || 'Failed to resend verification email');
      }
    } catch (error: any) {
      console.error('Resend verification error:', error);
      const message = error.response?.data?.message || 'Failed to resend verification email';
      toast.error(message);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="card w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold gradient-text">Verify Your Email</h2>
          <p className="text-gray-600 mt-2">
            We've sent a verification code to your email address. Please enter it below to activate your account.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
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
            <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-1">
              Verification Code
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <KeyIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                {...register('verificationCode')}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                className={`input-field pl-10 text-center tracking-widest ${errors.verificationCode ? 'border-red-300 focus:ring-red-500' : ''}`}
                placeholder="000000"
                onInput={(e) => {
                  // Only allow numeric input
                  const target = e.target as HTMLInputElement;
                  target.value = target.value.replace(/[^0-9]/g, '');
                }}
              />
            </div>
            {errors.verificationCode && (
              <p className="mt-1 text-sm text-red-600">{errors.verificationCode.message}</p>
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
                Verifying...
              </>
            ) : (
              'Verify Email'
            )}
          </button>
        </form>

        {/* Resend verification */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 mb-2">
            Didn't receive the code?
          </p>
          <button
            type="button"
            onClick={handleResendVerification}
            disabled={resendLoading || resendCooldown > 0}
            className="text-sm font-medium text-primary-600 hover:text-primary-500 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {resendLoading ? (
              'Sending...'
            ) : resendCooldown > 0 ? (
              `Resend in ${resendCooldown}s`
            ) : (
              'Resend verification email'
            )}
          </button>
        </div>

        {/* Back to login */}
        <div className="mt-6 text-center">
          <Link
            to="/auth/login"
            className="text-sm font-medium text-gray-600 hover:text-gray-500 transition-colors duration-200"
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
