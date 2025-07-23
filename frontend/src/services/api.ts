import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_BASE_URL, STORAGE_KEYS } from '../constants';
import { ApiResponse } from '../types';

class ApiClient {
  private instance: AxiosInstance;
  private onTokenExpired?: () => void;

  constructor() {
    console.log('🔧 API Client initialized with baseURL:', API_BASE_URL);
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000, // Increased timeout for slow connections
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Important for CORS with credentials
    });

    this.setupInterceptors();
  }

  // Method to set callback for when tokens expire
  setTokenExpiredCallback(callback: () => void): void {
    this.onTokenExpired = callback;
  }

  private setupInterceptors(): void {
    // Request interceptor to add auth token
    this.instance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        console.log(`📤 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config.data);
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle common errors
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error) => {
        console.error('❌ API Response Error:', error.response?.status, error.config?.url, error.response?.data);
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
            if (refreshToken) {
              const response = await this.post('/auth/refresh-token', {
                refreshToken,
              });

              const { accessToken } = response.data;
              localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);

              // Retry the original request with new token
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return this.instance(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, call the token expired callback
            if (this.onTokenExpired) {
              this.onTokenExpired();
            } else {
              // Fallback to direct redirect if no callback is set
              this.clearTokens();
              window.location.href = '/auth/login';
            }
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private clearTokens(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  }

  // Connectivity test method
  async testConnection(): Promise<boolean> {
    try {
      // Use a simple GET request without extra headers that might trigger CORS preflight
      await this.instance.get('/health', { 
        timeout: 10000,
      });
      
      return true;
    } catch (error: any) {
      return false;
    }
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.get(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.post(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.put(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.patch(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.delete(url, config);
    return response.data;
  }

  // File upload method
  async uploadFile<T = any>(url: string, file: File, onProgress?: (progress: number) => void): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    };

    const response = await this.instance.post(url, formData, config);
    return response.data;
  }

  // Get instance for direct access if needed
  getInstance(): AxiosInstance {
    return this.instance;
  }
}

export const apiClient = new ApiClient();
export default apiClient;


