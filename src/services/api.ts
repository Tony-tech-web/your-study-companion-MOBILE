import axios from 'axios';
import { clearStoredAuthSession, getCurrentSession, isInvalidRefreshToken } from '../lib/supabase';

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use(async (config) => {
  const session = await getCurrentSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  async (error) => {
    if (error?.response?.status === 401 || isInvalidRefreshToken(error)) {
      await clearStoredAuthSession();
    }
    return Promise.reject(error);
  }
);

export default api;
