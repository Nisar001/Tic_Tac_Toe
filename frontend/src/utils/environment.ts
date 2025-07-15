// Environment configuration utilities
export const getEnvironment = () => {
  return process.env.REACT_APP_ENV || 'development';
};

export const isProduction = () => {
  return getEnvironment() === 'production';
};

export const isDevelopment = () => {
  return getEnvironment() === 'development';
};

export const getFrontendUrl = () => {
  if (typeof window !== 'undefined') {
    // Use current window location origin
    return window.location.origin;
  }
  
  // Fallback to environment variable or default
  return process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000';
};

export const getBackendUrl = () => {
  return process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
};

export const getSocketUrl = () => {
  return process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
};
