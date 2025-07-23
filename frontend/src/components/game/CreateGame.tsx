import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { useGame } from '../../contexts/GameContext';
import { CreateGameRequest } from '../../types';
import LoadingSpinner from '../ui/LoadingSpinner';
import toast from 'react-hot-toast';

const CreateGame: React.FC = () => {
  const navigate = useNavigate();
  const { createGame, isLoading } = useGame();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formData, setFormData] = useState<CreateGameRequest>({
    gameMode: 'classic',
    isPrivate: false,
    timeLimit: 300, // 5 minutes
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const game = await createGame(formData);
      toast.success('Game created successfully!');
      navigate(`/game/${game.room || game.roomId || game.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create game');
    }
  };
  const handleInputChange = (field: keyof CreateGameRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
        <PlusIcon className="w-6 h-6 mr-2 text-blue-600" />
        Create New Game
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Game Mode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Game Mode
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'quick', label: 'Quick Match', desc: 'Fast-paced game' },
              { value: 'ranked', label: 'Ranked', desc: 'Competitive match' },
            ].map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => handleInputChange('gameMode', type.value)}
                className={`p-4 text-left border-2 rounded-lg transition-colors ${
                  formData.gameMode === type.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-gray-900">{type.label}</div>
                <div className="text-sm text-gray-500">{type.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Settings Toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-sm text-blue-600 hover:text-blue-700"
          >
            <Cog6ToothIcon className="w-4 h-4 mr-1" />
            Advanced Settings
          </button>
        </div>

        {/* Advanced Settings */}
        {showAdvanced && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            {/* Private Game */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPrivate"
                checked={formData.isPrivate || false}
                onChange={(e) => handleInputChange('isPrivate', e.target.checked)}
                className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isPrivate" className="text-sm text-gray-700">
                Private game (invite only)
              </label>
            </div>

            {/* Time Limit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Limit (seconds)
              </label>
              <input
                type="number"
                min="60"
                max="3600"
                step="60"
                value={formData.timeLimit || 300}
                onChange={(e) => handleInputChange('timeLimit', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Time each player has to make all moves
              </p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <LoadingSpinner />
              <span className="ml-2">Creating Game...</span>
            </div>
          ) : (
            'Create Game'
          )}
        </button>
      </form>
    </div>
  );
};

export default CreateGame;


