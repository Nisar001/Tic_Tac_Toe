import { createContext, useContext, useReducer, ReactNode } from 'react';
import toast from 'react-hot-toast';

interface APICallState {
  loading: { [key: string]: boolean };
  errors: { [key: string]: string | null };
  retryCount: { [key: string]: number };
  lastCalled: { [key: string]: number };
}

type APIAction =
  | { type: 'SET_LOADING'; key: string; loading: boolean }
  | { type: 'SET_ERROR'; key: string; error: string | null }
  | { type: 'INCREMENT_RETRY'; key: string }
  | { type: 'RESET_RETRY'; key: string }
  | { type: 'SET_LAST_CALLED'; key: string; timestamp: number };

const initialState: APICallState = {
  loading: {},
  errors: {},
  retryCount: {},
  lastCalled: {},
};

const apiReducer = (state: APICallState, action: APIAction): APICallState => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: { ...state.loading, [action.key]: action.loading },
      };
    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.key]: action.error },
      };
    case 'INCREMENT_RETRY':
      return {
        ...state,
        retryCount: { 
          ...state.retryCount, 
          [action.key]: (state.retryCount[action.key] || 0) + 1 
        },
      };
    case 'RESET_RETRY':
      return {
        ...state,
        retryCount: { ...state.retryCount, [action.key]: 0 },
      };
    case 'SET_LAST_CALLED':
      return {
        ...state,
        lastCalled: { ...state.lastCalled, [action.key]: action.timestamp },
      };
    default:
      return state;
  }
};

interface APIManagerContextType {
  // State
  loading: { [key: string]: boolean };
  errors: { [key: string]: string | null };
  retryCount: { [key: string]: number };
  
  // Methods
  executeAPI: <T>(
    key: string,
    apiCall: () => Promise<T>,
    options?: {
      maxRetries?: number;
      cooldownMs?: number;
      showToast?: boolean;
      preventDuplicates?: boolean;
    }
  ) => Promise<T | null>;
  
  resetAPIState: (key: string) => void;
  isLoading: (key: string) => boolean;
  getError: (key: string) => string | null;
  canRetry: (key: string) => boolean;
  retry: (key: string, apiCall: () => Promise<any>) => Promise<any>;
}

const APIManagerContext = createContext<APIManagerContextType | undefined>(undefined);

export const useAPIManager = (): APIManagerContextType => {
  const context = useContext(APIManagerContext);
  if (!context) {
    throw new Error('useAPIManager must be used within an APIManagerProvider');
  }
  return context;
};

interface APIManagerProviderProps {
  children: ReactNode;
}

export const APIManagerProvider: React.FC<APIManagerProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(apiReducer, initialState);

  const executeAPI = async <T,>(
    key: string,
    apiCall: () => Promise<T>,
    options: {
      cooldownMs?: number;
      showToast?: boolean;
      preventDuplicates?: boolean;
    } = {}
  ): Promise<T | null> => {
    const {
      cooldownMs = 1000,
      showToast = true,
      preventDuplicates = true,
    } = options;

    // Check if already loading and prevent duplicates
    if (preventDuplicates && state.loading[key]) {
      return null;
    }

    // Check cooldown to prevent rapid successive calls
    const lastCalled = state.lastCalled[key] || 0;
    const now = Date.now();
    if (preventDuplicates && now - lastCalled < cooldownMs) {
      return null;
    }

    try {
      dispatch({ type: 'SET_LOADING', key, loading: true });
      dispatch({ type: 'SET_ERROR', key, error: null });
      dispatch({ type: 'SET_LAST_CALLED', key, timestamp: now });

      const result = await apiCall();
      
      // Reset retry count on success
      dispatch({ type: 'RESET_RETRY', key });
      
      return result;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'API call failed';
      
      dispatch({ type: 'SET_ERROR', key, error: errorMessage });
      dispatch({ type: 'INCREMENT_RETRY', key });
      
      if (showToast) {
        toast.error(errorMessage);
      }
      
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', key, loading: false });
    }
  };

  const resetAPIState = (key: string) => {
    dispatch({ type: 'SET_LOADING', key, loading: false });
    dispatch({ type: 'SET_ERROR', key, error: null });
    dispatch({ type: 'RESET_RETRY', key });
  };

  const isLoading = (key: string): boolean => {
    return state.loading[key] || false;
  };

  const getError = (key: string): string | null => {
    return state.errors[key] || null;
  };

  const canRetry = (key: string): boolean => {
    const retryCount = state.retryCount[key] || 0;
    return retryCount < 3 && !state.loading[key];
  };

  const retry = async (key: string, apiCall: () => Promise<any>): Promise<any> => {
    if (!canRetry(key)) {
      return null;
    }
    
    return executeAPI(key, apiCall, { showToast: true });
  };

  const value: APIManagerContextType = {
    loading: state.loading,
    errors: state.errors,
    retryCount: state.retryCount,
    executeAPI,
    resetAPIState,
    isLoading,
    getError,
    canRetry,
    retry,
  };

  return (
    <APIManagerContext.Provider value={value}>
      {children}
    </APIManagerContext.Provider>
  );
};
