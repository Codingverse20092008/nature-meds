import axios from 'axios';
import toast from 'react-hot-toast';
import { getAuthToken, useAuthStore } from '../store/authStore';

// Get base URL from env, with a rock-solid fallback to the production backend
const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://nature-meds.onrender.com';

export const api = axios.create({
  baseURL,
  withCredentials: true,
  // Increase timeout to 50 seconds to account for Render cold-starts
  timeout: 50000,
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Useful debug log
  console.log(`[API Request] ${config.method?.toUpperCase()} ${baseURL}${config.url}`);
  
  return config;
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const config = error.config;
    // Setup retry logic for Network Errors (Render cold start)
    if (!config || !config.retry) {
      config.retry = 0;
    }
    
    // Max 2 retries (with 50s timeout per retry)
    if (config.retry < 2 && (error.code === 'ECONNABORTED' || error.message === 'Network Error' || !error.response)) {
      config.retry += 1;
      console.log(`[API Retry] Retrying request due to cold start timeout... Attempt #${config.retry}`);
      // Wait 5 seconds before retrying to give Render more time to wake up
      await new Promise(resolve => setTimeout(resolve, 5000));
      return api(config);
    }

    // Extensive debug logging
    console.error('[API Error Details]:', {
      message: error.message,
      url: config?.url,
      baseURL: config?.baseURL,
      status: error.response?.status,
      data: error.response?.data
    });

    const isNetworkError = error.message === 'Network Error' || !error.response;
    let message = 'Something went wrong while contacting the API';
    
    if (isNetworkError) {
      if (error.code === 'ECONNABORTED') {
         message = 'The server is taking too long to wake up. Please refresh the page.';
      } else {
         message = 'Network error. Cannot connect to the server (blocked by CORS or sleeping).';
      }
    } else {
      message = error.response?.data?.message ?? error.message ?? message;
    }

    if (error.response?.status === 401) {
      useAuthStore.getState().clearSession();
    }

    if (isNetworkError || (error.response && error.response.status >= 500)) {
      toast.error(message, { duration: 5000 });
    }

    return Promise.reject(error);
  }
);
