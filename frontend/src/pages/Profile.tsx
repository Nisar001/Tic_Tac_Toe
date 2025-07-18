import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import authAPI from '../services/auth';
import { UpdateProfileRequest, ChangePasswordRequest } from '../types';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { 
  UserIcon, 
  EnvelopeIcon, 
  KeyIcon, 
  EyeIcon, 
  EyeSlashIcon,
  CameraIcon,
  TrophyIcon,
  FireIcon,
  HeartIcon,
  StarIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';

const profileSchema = yup.object({
  username: yup
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .optional(),
  email: yup
    .string()
    .email('Please enter a valid email')
    .optional(),
  bio: yup
    .string()
    .max(200, 'Bio must be less than 200 characters')
    .optional(),
  profilePicture: yup
    .string()
    .optional(),
  preferences: yup
    .object()
    .optional(),
});

const passwordSchema = yup.object({
  currentPassword: yup
    .string()
    .required('Current password is required'),
  newPassword: yup
    .string()
    .min(6, 'Password must be at least 6 characters')
    .required('New password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('newPassword')], 'Passwords must match')
    .required('Please confirm your password'),
});

const Profile: React.FC = () => {
  const { user, refreshUser, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'stats'>('profile');
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    setValue: setProfileValue,
    reset: resetProfile,
  } = useForm<UpdateProfileRequest>({
    resolver: yupResolver(profileSchema),
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<ChangePasswordRequest>({
    resolver: yupResolver(passwordSchema),
  });

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setProfileValue('username', user.username);
      setProfileValue('email', user.email);
      setProfileValue('bio', user.bio || '');
    }
  }, [user, setProfileValue]);

  const onProfileSubmit = async (data: UpdateProfileRequest) => {
    try {
      setProfileLoading(true);
      const updatedUser = await authAPI.updateProfile(data);
      
      if (updatedUser) {
        await refreshUser();
        toast.success('Profile updated successfully!');
        resetProfile(data);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to update profile';
      toast.error(message);
    } finally {
      setProfileLoading(false);
    }
  };

  const onPasswordSubmit = async (data: ChangePasswordRequest) => {
    try {
      setPasswordLoading(true);
      const response = await authAPI.changePassword(data);
      
      if (response.success) {
        toast.success('Password updated successfully!');
        resetPassword();
      }
    } catch (error: any) {
      console.error('Password change error:', error);
      const message = error.response?.data?.message || 'Failed to change password';
      toast.error(message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // TODO: Implement avatar upload functionality
      toast.success('Avatar upload functionality coming soon!');
    }
  };

  if (!isAuthenticated || isLoading || !user) {
    return (
      <div className="space-y-8">
        <div className="card">
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Profile Settings</h1>
        <p className="text-gray-600 text-sm sm:text-base">Manage your account information and preferences</p>
      </div>

      {/* Profile Overview Card */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-center sm:space-x-6 space-y-4 sm:space-y-0">
          {/* Avatar */}
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <UserIcon className="w-12 h-12 text-white" />
              )}
            </div>
            <label className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <CameraIcon className="w-4 h-4 text-gray-600" />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* User Info */}
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">{user.username}</h2>
              {user.isEmailVerified && (
                <CheckBadgeIcon className="w-6 h-6 text-green-500" />
              )}
            </div>
            <p className="text-gray-600 mb-2">{user.email}</p>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span className="flex items-center">
                <TrophyIcon className="w-4 h-4 mr-1" />
                Level {user.level}
              </span>
              <span className="flex items-center">
                <StarIcon className="w-4 h-4 mr-1" />
                {user.totalXP} XP
              </span>
              <span className="flex items-center">
                <HeartIcon className="w-4 h-4 mr-1" />
                {user.lives}/{user.maxLives} Lives
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'profile'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Profile Information
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'password'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Change Password
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'stats'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Game Statistics
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Update Profile Information</h3>
          
          <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...registerProfile('username')}
                  type="text"
                  className={`input-field pl-10 ${profileErrors.username ? 'border-red-300 focus:ring-red-500' : ''}`}
                  placeholder="Enter your username"
                />
              </div>
              {profileErrors.username && (
                <p className="mt-1 text-sm text-red-600">{profileErrors.username.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...registerProfile('email')}
                  type="email"
                  className={`input-field pl-10 ${profileErrors.email ? 'border-red-300 focus:ring-red-500' : ''}`}
                  placeholder="Enter your email"
                />
              </div>
              {profileErrors.email && (
                <p className="mt-1 text-sm text-red-600">{profileErrors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                Bio (Optional)
              </label>
              <textarea
                {...registerProfile('bio')}
                rows={3}
                className={`input-field resize-none ${profileErrors.bio ? 'border-red-300 focus:ring-red-500' : ''}`}
                placeholder="Tell us about yourself..."
              />
              {profileErrors.bio && (
                <p className="mt-1 text-sm text-red-600">{profileErrors.bio.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={profileLoading}
              className="btn-primary flex items-center justify-center"
            >
              {profileLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Updating...
                </>
              ) : (
                'Update Profile'
              )}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'password' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Change Password</h3>
          
          <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-6">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...registerPassword('currentPassword')}
                  type={showCurrentPassword ? 'text' : 'password'}
                  className={`input-field pl-10 pr-10 ${passwordErrors.currentPassword ? 'border-red-300 focus:ring-red-500' : ''}`}
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {passwordErrors.currentPassword && (
                <p className="mt-1 text-sm text-red-600">{passwordErrors.currentPassword.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...registerPassword('newPassword')}
                  type={showNewPassword ? 'text' : 'password'}
                  className={`input-field pl-10 pr-10 ${passwordErrors.newPassword ? 'border-red-300 focus:ring-red-500' : ''}`}
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {passwordErrors.newPassword && (
                <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...registerPassword('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`input-field pl-10 pr-10 ${passwordErrors.confirmPassword ? 'border-red-300 focus:ring-red-500' : ''}`}
                  placeholder="Confirm new password"
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
              {passwordErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={passwordLoading}
              className="btn-primary flex items-center justify-center"
            >
              {passwordLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Changing...
                </>
              ) : (
                'Change Password'
              )}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Game Statistics</h3>
          {(() => {
            const stats = user.stats || {};
            // Fallbacks for missing fields
            const gamesPlayed = typeof stats.gamesPlayed === 'number' ? stats.gamesPlayed : 0;
            const wins = typeof stats.wins === 'number' ? stats.wins : 0;
            const losses = typeof stats.losses === 'number' ? stats.losses : 0;
            const draws = typeof stats.draws === 'number' ? stats.draws : 0;
            const winRate = typeof stats.winRate === 'number' ? stats.winRate : 0;
            const currentStreak = typeof stats.currentStreak === 'number' ? stats.currentStreak : 0;
            const level = typeof stats.level === 'number' ? stats.level : (typeof user.level === 'number' ? user.level : 0);
            const xp = typeof stats.xp === 'number' ? stats.xp : 0;
            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <TrophyIcon className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-blue-600">Games Played</p>
                        <p className="text-2xl font-bold text-blue-900">{gamesPlayed}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <FireIcon className="h-8 w-8 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-green-600">Wins</p>
                        <p className="text-2xl font-bold text-green-900">{wins}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-lg">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <StarIcon className="h-8 w-8 text-yellow-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-yellow-600">Win Rate</p>
                        <p className="text-2xl font-bold text-yellow-900">{winRate.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <HeartIcon className="h-8 w-8 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-purple-600">Current Streak</p>
                        <p className="text-2xl font-bold text-purple-900">{currentStreak}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900">{wins}</p>
                    <p className="text-sm text-gray-600">Wins</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900">{losses}</p>
                    <p className="text-sm text-gray-600">Losses</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900">{draws}</p>
                    <p className="text-sm text-gray-600">Draws</p>
                  </div>
                </div>
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-900">Level: {level}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-900">XP: {xp}</p>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default Profile;
