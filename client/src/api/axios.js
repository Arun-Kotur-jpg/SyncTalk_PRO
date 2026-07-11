import axios from 'axios';
import { API_URL } from '../utils/constants';
import { getAccessToken, setAccessToken, getRefreshToken, setRefreshToken } from '../context/AuthContext';
import { getCsrfToken, fetchCsrfToken } from './csrf';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach access token and CSRF token where needed
api.interceptors.request.use(async (config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Attach CSRF token for refresh and logout requests
  const csrfPaths = ['/auth/refresh', '/auth/logout'];
  if (csrfPaths.some((p) => config.url?.endsWith(p))) {
    let csrf = getCsrfToken();
    if (!csrf) {
      csrf = await fetchCsrfToken();
    }
    config.headers['X-CSRF-Token'] = csrf;
  }

  return config;
});

// Response interceptor — handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      try {
        const storedRefresh = getRefreshToken();
        if (!storedRefresh) {
          throw new Error('No refresh token');
        }
        // Ensure we have a fresh CSRF token
        await fetchCsrfToken();
        const { data } = await api.post('/auth/refresh', { refreshToken: storedRefresh });
        setAccessToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        setAccessToken(null);
        setRefreshToken(null);
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
