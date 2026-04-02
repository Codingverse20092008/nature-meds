import axios from 'axios';
import toast from 'react-hot-toast';
import { getAuthToken, useAuthStore } from '../store/authStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ??
      error.message ??
      'Something went wrong while contacting the API';

    if (error.response?.status === 401) {
      useAuthStore.getState().clearSession();
    }

    if (error.response?.status >= 500) {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);
