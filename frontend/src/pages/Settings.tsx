import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import authAPI from '../services/auth';
import { UserPreferences } from '../types';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { 
  Cog6ToothIcon,
  BellIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  GlobeAltIcon,
  TrashIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const Settings: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);
  const handleLogoutAll = async () => {
    setLogoutAllLoading(true);
    try {
      await authAPI.logoutAll();
      toast.success('Logged out from all sessions.');
      logout();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to logout all sessions');
    } finally {
      setLogoutAllLoading(false);
    }
  };
  const [activeTab, setActiveTab] = useState<'general' | 'game' | 'account'>('general');
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isDirty },
  } = useForm<UserPreferences>({
    defaultValues: user?.preferences || {
      soundEnabled: true,
      notifications: true,
      theme: 'auto',
      language: 'en',
      autoJoinQueue: false,
    },
  });

  // Initialize form with user preferences
  useEffect(() => {
    if (user?.preferences) {
      Object.entries(user.preferences).forEach(([key, value]) => {
        setValue(key as keyof UserPreferences, value);
      });
    }
  }, [user?.preferences, setValue]);

  const preferences = watch();

  const onSubmit = async (data: UserPreferences) => {
    try {
      setIsLoading(true);
      await authAPI.updateProfile({ preferences: data });
      await refreshUser();
      toast.success('Settings updated successfully!');
    } catch (error: any) {
      console.error('Settings update error:', error);
      const message = error.response?.data?.message || 'Failed to update settings';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== user?.username) {
      toast.error('Please type your username correctly to confirm');
      return;
    }

    try {
      setIsLoading(true);
      await authAPI.deleteAccount();
      toast.success('Account deleted successfully');
      logout();
    } catch (error: any) {
      console.error('Account deletion error:', error);
      const message = error.response?.data?.message || 'Failed to delete account';
      toast.error(message);
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
    }
  };

  if (!user) {
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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Settings</h1>
        <p className="text-gray-600 text-sm sm:text-base">Customize your game experience and account preferences</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-8">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-2 px-1 border-b-2 font-medium text-sm text-left sm:text-center ${
              activeTab === 'general'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Cog6ToothIcon className="w-5 h-5 inline-block mr-2" />
            General
          </button>
          <button
            onClick={() => setActiveTab('game')}
            className={`py-2 px-1 border-b-2 font-medium text-sm text-left sm:text-center ${
              activeTab === 'game'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <GlobeAltIcon className="w-5 h-5 inline-block mr-2" />
            Game Preferences
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`py-2 px-1 border-b-2 font-medium text-sm text-left sm:text-center ${
              activeTab === 'account'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <TrashIcon className="w-5 h-5 inline-block mr-2" />
            Account
          </button>
        </nav>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* General Settings */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">General Preferences</h3>
              
              <div className="space-y-6">
                {/* Theme Setting */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Theme
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'light', label: 'Light', icon: SunIcon },
                      { value: 'dark', label: 'Dark', icon: MoonIcon },
                      { value: 'auto', label: 'Auto', icon: ComputerDesktopIcon },
                    ].map(({ value, label, icon: Icon }) => (
                      <label
                        key={value}
                        className={`relative flex items-center justify-center p-3 border rounded-lg cursor-pointer ${
                          preferences.theme === value
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          {...register('theme')}
                          type="radio"
                          value={value}
                          className="sr-only"
                        />
                        <Icon className="w-5 h-5 mr-2" />
                        <span className="text-sm font-medium">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Language Setting */}
                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                    Language
                  </label>
                  <select
                    {...register('language')}
                    className="input-field"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="ja">日本語</option>
                  </select>
                </div>

                {/* Sound Settings */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {preferences.soundEnabled ? (
                      <SpeakerWaveIcon className="w-5 h-5 text-gray-400 mr-3" />
                    ) : (
                      <SpeakerXMarkIcon className="w-5 h-5 text-gray-400 mr-3" />
                    )}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Sound Effects</h4>
                      <p className="text-sm text-gray-500">Play sounds for game actions</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      {...register('soundEnabled')}
                      type="checkbox"
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                {/* Notifications */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <BellIcon className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Notifications</h4>
                      <p className="text-sm text-gray-500">Receive game and system notifications</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      {...register('notifications')}
                      type="checkbox"
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Game Preferences */}
        {activeTab === 'game' && (
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Game Preferences</h3>
              
              <div className="space-y-6">
                {/* Auto Join Queue */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Auto Join Queue</h4>
                    <p className="text-sm text-gray-500">Automatically join matchmaking queue after game ends</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      {...register('autoJoinQueue')}
                      type="checkbox"
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                {/* Game Statistics */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Your Game Statistics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-primary-600">{user.stats.gamesPlayed}</p>
                      <p className="text-xs text-gray-600">Games</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{user.stats.wins}</p>
                      <p className="text-xs text-gray-600">Wins</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">{user.stats.losses}</p>
                      <p className="text-xs text-gray-600">Losses</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{user.stats.winRate.toFixed(1)}%</p>
                      <p className="text-xs text-gray-600">Win Rate</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Account Settings */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Account Management</h3>
              
              <div className="space-y-6">
                {/* Account Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Account Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Username:</span> {user.username}</div>
                    <div><span className="font-medium">Email:</span> {user.email}</div>
                    <div><span className="font-medium">Provider:</span> {user.provider}</div>
                    <div><span className="font-medium">Joined:</span> {new Date(user.createdAt).toLocaleDateString()}</div>
                    <div><span className="font-medium">Level:</span> {user.level}</div>
                    <div><span className="font-medium">Total XP:</span> {user.totalXP}</div>
                  </div>
                </div>

                {/* Logout All Sessions */}
                <div className="border border-yellow-200 bg-yellow-50 p-4 rounded-lg mb-6">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-yellow-900 mb-2">Logout All Sessions</h4>
                      <p className="text-sm text-yellow-700 mb-4">
                        This will log you out from all devices and browsers. You will need to log in again everywhere.
                      </p>
                      <button
                        type="button"
                        onClick={handleLogoutAll}
                        disabled={logoutAllLoading}
                        className="bg-yellow-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {logoutAllLoading ? 'Logging out...' : 'Logout All Sessions'}
                      </button>
                    </div>
                  </div>
                </div>
                {/* Delete Account */}
                <div className="border-2 border-red-200 bg-red-50 p-4 rounded-lg">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="w-6 h-6 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-red-900 mb-2">Delete Account</h4>
                      <p className="text-sm text-red-700 mb-4">
                        Once you delete your account, there is no going back. This action cannot be undone.
                      </p>
                      
                      {!showDeleteConfirm ? (
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(true)}
                          className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        >
                          Delete Account
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm text-red-700 font-medium">
                            Type "{user.username}" to confirm account deletion:
                          </p>
                          <input
                            type="text"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                            placeholder={user.username}
                          />
                          <div className="flex space-x-3">
                            <button
                              type="button"
                              onClick={handleDeleteAccount}
                              disabled={deleteConfirmText !== user.username || isLoading}
                              className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isLoading ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowDeleteConfirm(false);
                                setDeleteConfirmText('');
                              }}
                              className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Button (only show for general and game tabs) */}
        {(activeTab === 'general' || activeTab === 'game') && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!isDirty || isLoading}
              className="btn-primary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default Settings;
