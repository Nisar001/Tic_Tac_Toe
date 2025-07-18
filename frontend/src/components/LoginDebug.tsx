import React, { useState } from 'react';
import { API_BASE_URL } from '../constants';

const LoginDebug: React.FC = () => {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const testLogin = async () => {
    setLoading(true);
    setResponse('Testing...');
    
    try {
      
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      setResponse(`Status: ${response.status}\nResponse: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      console.error('Login error:', error);
      setResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const testRegister = async () => {
    setLoading(true);
    setResponse('Testing registration...');
    
    try {
      const registerData = {
        email,
        password,
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User'
      };
      
      
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
      });
      
      const data = await response.json();
      
      setResponse(`Registration Status: ${response.status}\nResponse: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      console.error('Registration error:', error);
      setResponse(`Registration Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const testBackendHealth = async () => {
    setLoading(true);
    setResponse('Testing backend health...');
    
    try {
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
      const data = await response.json();
      
      setResponse(`Health Status: ${response.status}\nResponse: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      setResponse(`Health Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Login Debug Tool</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <p><strong>API Base URL:</strong> {API_BASE_URL}</p>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label>Email: </label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '200px', padding: '5px' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Password: </label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '200px', padding: '5px' }}
          />
        </div>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={testBackendHealth} disabled={loading} style={{ marginRight: '10px', padding: '10px' }}>
          Test Backend Health
        </button>
        <button onClick={testRegister} disabled={loading} style={{ marginRight: '10px', padding: '10px' }}>
          Test Register
        </button>
        <button onClick={testLogin} disabled={loading} style={{ padding: '10px' }}>
          Test Login
        </button>
      </div>
      
      {loading && <p>Loading...</p>}
      
      <div style={{ marginTop: '20px' }}>
        <h3>Response:</h3>
        <pre style={{ 
          background: '#f5f5f5', 
          padding: '15px', 
          borderRadius: '5px', 
          overflow: 'auto',
          whiteSpace: 'pre-wrap'
        }}>
          {response}
        </pre>
      </div>
    </div>
  );
};

export default LoginDebug;
