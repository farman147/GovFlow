import api from './axios';

export const getPredictions = async () => {
  return api.get('/api/predictions');
};
