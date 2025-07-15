import React, { useState } from 'react';
import { API_BASE_URL } from '../constants';
import toast from 'react-hot-toast';

const SocialAuthTest: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testSocialAuthEndpoints = async () => {
    addResult('Starting social auth endpoint tests...');
    
    try {
      // Test Google auth endpoint
      const googleResponse = await fetch(`${API_BASE_URL}/auth/social/google`, {
        method: 'GET',
        redirect: 'manual' // Don't follow redirects
      });
      
      addResult(`Google auth endpoint: ${googleResponse.status} ${googleResponse.statusText}`);
      if (googleResponse.status === 302) {
        const location = googleResponse.headers.get('location');
        addResult(`Google redirect URL: ${location}`);
      }
      
      // Test Facebook auth endpoint
      const facebookResponse = await fetch(`${API_BASE_URL}/auth/social/facebook`, {
        method: 'GET',
        redirect: 'manual' // Don't follow redirects
      });
      
      addResult(`Facebook auth endpoint: ${facebookResponse.status} ${facebookResponse.statusText}`);
      if (facebookResponse.status === 302) {
        const location = facebookResponse.headers.get('location');
        addResult(`Facebook redirect URL: ${location}`);
      }
      
    } catch (error) {
      addResult(`Error testing endpoints: ${error}`);
    }
  };

  const testAuthCallback = async () => {
    addResult('Testing auth callback handling...');
    
    // Simulate a successful callback
    const mockParams = new URLSearchParams({
      token: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      provider: 'google',
      success: 'true'
    });
    
    // Test the callback URL that would be called
    const callbackUrl = `/auth/callback?${mockParams.toString()}`;
    addResult(`Mock callback URL: ${callbackUrl}`);
    
    // You could navigate to this URL to test the callback handler
    // window.location.href = callbackUrl;
  };

  const handleSocialLogin = (provider: 'google' | 'facebook') => {
    addResult(`Initiating ${provider} login...`);
    
    try {
      const socialAuthUrl = `${API_BASE_URL}/auth/social/${provider}`;
      addResult(`Redirecting to: ${socialAuthUrl}`);
      
      // Store current location for redirect
      localStorage.setItem('auth_redirect_url', window.location.pathname);
      
      // Open in new tab for testing
      window.open(socialAuthUrl, '_blank');
      
    } catch (error) {
      addResult(`Error initiating ${provider} login: ${error}`);
      toast.error(`Failed to initiate ${provider} login`);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Social Auth Test Panel</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Test Controls */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
            
            <div className="space-y-4">
              <button
                onClick={testSocialAuthEndpoints}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Test Social Auth Endpoints
              </button>
              
              <button
                onClick={testAuthCallback}
                className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Test Auth Callback
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleSocialLogin('google')}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Test Google Login
                </button>
                
                <button
                  onClick={() => handleSocialLogin('facebook')}
                  className="flex-1 px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800"
                >
                  Test Facebook Login
                </button>
              </div>
              
              <button
                onClick={clearResults}
                className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Clear Results
              </button>
            </div>
          </div>
          
          {/* Configuration Info */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Configuration</h2>
            
            <div className="space-y-2 text-sm">
              <div><strong>API Base URL:</strong> {API_BASE_URL}</div>
              <div><strong>Current URL:</strong> {window.location.origin}</div>
              <div><strong>Expected Google Callback:</strong> {API_BASE_URL.replace('/api', '')}/api/auth/social/google/callback</div>
              <div><strong>Expected Facebook Callback:</strong> {API_BASE_URL.replace('/api', '')}/api/auth/social/facebook/callback</div>
              <div><strong>Frontend Callback:</strong> {window.location.origin}/auth/callback</div>
            </div>
          </div>
        </div>
        
        {/* Test Results */}
        <div className="mt-6 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          
          <div className="bg-gray-100 p-4 rounded max-h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-gray-500">No test results yet. Run some tests to see output here.</p>
            ) : (
              <div className="space-y-1">
                {testResults.map((result, index) => (
                  <div key={index} className="text-sm font-mono">
                    {result}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialAuthTest;
