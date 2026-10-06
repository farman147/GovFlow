import api from './axios';

export const login = async (payload) => {
  return api.post('/api/auth/login', payload);
};

export const register = async (payload) => {
  return api.post('/api/auth/register', payload);
};

export const getCurrentUser = async () => {
  return api.get('/api/auth/me');
};
