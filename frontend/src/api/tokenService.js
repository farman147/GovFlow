import api from './axios';

export const createToken = async (payload) => {
  return api.post('/api/tokens', payload);
};

export const getMyTokens = async () => {
  return api.get('/api/tokens/my');
};

export const getTokenById = async (id) => {
  return api.get(`/api/tokens/${id}`);
};

export const getTokenStatus = async (id) => {
  return api.get(`/api/tokens/${id}/status`);
};

export const getQueueByService = async (serviceId) => {
  return api.get(`/api/tokens/queue/${serviceId}`);
};

export const callNextToken = async (serviceId, payload = {}) => {
  return api.post(`/api/tokens/queue/${serviceId}/call-next`, payload);
};

export const callToken = async (tokenId, payload = {}) => {
  return api.post(`/api/tokens/${tokenId}/call`, payload);
};

export const startToken = async (tokenId, payload = {}) => {
  return api.post(`/api/tokens/${tokenId}/start`, payload);
};

export const completeToken = async (tokenId, payload = {}) => {
  return api.post(`/api/tokens/${tokenId}/complete`, payload);
};

export const skipToken = async (tokenId, payload = {}) => {
  return api.post(`/api/tokens/${tokenId}/skip`, payload);
};

export const cancelToken = async (id) => {
  return api.post(`/api/tokens/${id}/cancel`);
};
