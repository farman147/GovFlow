import axios from 'axios';

const viteEnv =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env
    : {};

const getStorage = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }

  if (
    typeof globalThis !== 'undefined' &&
    globalThis.localStorage
  ) {
    return globalThis.localStorage;
  }

  return null;
};

const getBaseUrl = () => {
  if (viteEnv.VITE_API_URL) {
    if (
      typeof window !== 'undefined' &&
      window.location &&
      window.location.hostname &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      try {
        const url = new URL(viteEnv.VITE_API_URL);

        if (
          url.hostname === 'localhost' ||
          url.hostname === '127.0.0.1'
        ) {
          return `${url.protocol}//${window.location.hostname}:${
            url.port || '5000'
          }`;
        }
      } catch {
        // Ignore URL parsing error
      }
    }

    return viteEnv.VITE_API_URL;
  }

  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname || 'localhost';
    return `http://${hostname}:5000`;
  }

  return 'http://localhost:5000';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const storage = getStorage();
  const token = storage?.getItem('govflow_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    const requestUrl = error.config?.url || '';

    /*
     * Public API requests should NOT force the user to Login.
     *
     * The HomePage uses /api/services before the user is logged in.
     * If that request returns 401, simply return the error to HomePage
     * so it can display the appropriate message.
     */
    const isPublicRequest =
      requestUrl.includes('/services');

    const isAuthFailure = status === 401;

    if (isAuthFailure && !isPublicRequest) {
      const storage = getStorage();

      storage?.removeItem('govflow_token');
      storage?.removeItem('govflow_user');

      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem('govflow_token');
        window.sessionStorage.removeItem('govflow_user');
      }

      if (
        typeof window !== 'undefined' &&
        window.location &&
        window.location.pathname !== '/login'
      ) {
        window.location.href = '/login?sessionExpired=1';
      }
    }

    return Promise.reject(error);
  }
);

export const getApiErrorMessage = (
  error,
  fallback = 'Something went wrong.'
) => {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  if (
    error?.code === 'ERR_NETWORK' ||
    error?.message === 'Network Error'
  ) {
    return 'Unable to connect to the server. Please check your connection and try again.';
  }

  return error?.message || fallback;
};

export default api;