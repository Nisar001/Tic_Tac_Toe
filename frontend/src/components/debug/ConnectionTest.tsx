import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../../services/api';
import { API_BASE_URL } from '../../constants';

interface ConnectionTestProps {
  onConnectionStatus: (isConnected: boolean) => void;
}

const ConnectionTest: React.FC<ConnectionTestProps> = ({ onConnectionStatus }) => {
  const [isTestingConnection, setIsTestingConnection] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'failed'>('testing');
  const [errorDetails, setErrorDetails] = useState<string>('');

  const testConnection = useCallback(async () => {
    setIsTestingConnection(true);
    setConnectionStatus('testing');
    setErrorDetails('');

    try {
      console.log('🔍 Testing connection to:', API_BASE_URL);
      
      // First test basic connectivity
      const isConnected = await apiClient.testConnection();
      
      if (isConnected) {
        setConnectionStatus('connected');
        onConnectionStatus(true);
        console.log('✅ Backend connection successful');
      } else {
        throw new Error('Health check failed');
      }
    } catch (error: any) {
      console.error('❌ Backend connection failed:', error);
      setConnectionStatus('failed');
      setErrorDetails(error.message || 'Unknown error');
      onConnectionStatus(false);
    } finally {
      setIsTestingConnection(false);
    }
  }, [onConnectionStatus]);

  useEffect(() => {
    testConnection();
  }, [testConnection]);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'testing': return 'text-yellow-600';
      case 'connected': return 'text-green-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'testing': return '🔄';
      case 'connected': return '✅';
      case 'failed': return '❌';
      default: return '⚪';
    }
  };

  const getStatusMessage = () => {
    switch (connectionStatus) {
      case 'testing': return 'Testing backend connection...';
      case 'connected': return 'Backend connected successfully';
      case 'failed': return `Backend connection failed: ${errorDetails}`;
      default: return 'Unknown status';
    }
  };

  return (
    <div className="mb-4 p-3 border rounded-lg bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getStatusIcon()}</span>
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusMessage()}
          </span>
        </div>
        
        {connectionStatus === 'failed' && (
          <button
            onClick={testConnection}
            disabled={isTestingConnection}
            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Retry
          </button>
        )}
      </div>
      
      {connectionStatus === 'failed' && (
        <div className="mt-2 text-xs text-gray-600">
          <div>Backend URL: {API_BASE_URL}</div>
          <div>Check console for detailed error information</div>
        </div>
      )}
    </div>
  );
};

export default ConnectionTest;
