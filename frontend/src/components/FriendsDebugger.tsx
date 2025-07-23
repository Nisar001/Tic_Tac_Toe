import React, { useState } from 'react';
import { friendsAPI } from '../services/friends';

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
}

interface TestResults {
  [key: string]: TestResult;
}

export const FriendsDebugger: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResults>({});
  const [loading, setLoading] = useState(false);

  const testEndpoint = async (name: string, testFn: () => Promise<any>) => {
    setLoading(true);
    try {
      
      const result = await testFn();
      setTestResults((prev: TestResults) => ({ ...prev, [name]: { success: true, data: result } }));
      
    } catch (error: any) {
      setTestResults((prev: TestResults) => ({ ...prev, [name]: { success: false, error: error.message } }));
      console.error(`❌ ${name} failed:`, error);
    }
    setLoading(false);
  };

  const createTestUsers = async () => {
    await testEndpoint('createTestUsers', () => friendsAPI.createTestUsers());
  };

  const runTests = async () => {

    // Test 0: Debug Info
    await testEndpoint('debugFriends', () => friendsAPI.debugFriends());
    
    // Test 1: Get Friends
    await testEndpoint('getFriends', () => friendsAPI.getFriends());
    
    // Test 2: Get Available Users
    await testEndpoint('getAvailableUsers', () => friendsAPI.getAvailableUsers(10, 1));
    
    // Test 3: Search Users
    await testEndpoint('searchUsers', () => friendsAPI.searchUsers('test'));
    
    // Test 4: Get Friend Requests
    await testEndpoint('getFriendRequests', () => friendsAPI.getFriendRequests());

  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>Friends API Debugger</h2>
      <button 
        onClick={runTests} 
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginRight: '10px'
        }}
      >
        {loading ? 'Running Tests...' : 'Run API Tests'}
      </button>
      
      <button 
        onClick={createTestUsers} 
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: loading ? '#ccc' : '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        Create Test Users
      </button>
      
      <div style={{ marginTop: '20px' }}>
        <h3>Results:</h3>
        {Object.entries(testResults).map(([name, result]: [string, any]) => (
          <div key={name} style={{ 
            marginBottom: '10px', 
            padding: '10px', 
            backgroundColor: result.success ? '#d4edda' : '#f8d7da',
            border: `1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`,
            borderRadius: '4px'
          }}>
            <strong>{name}:</strong> {result.success ? '✅ Success' : '❌ Failed'}
            {result.success && (
              <div>
                <small>Data: {JSON.stringify(result.data).substring(0, 100)}...</small>
              </div>
            )}
            {!result.success && (
              <div>
                <small style={{ color: 'red' }}>Error: {result.error}</small>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h3>Console:</h3>
        <small>Check browser console for detailed logs</small>
      </div>
    </div>
  );
};


