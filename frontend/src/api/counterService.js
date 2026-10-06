import api from './axios';

export const getCounters = async (params) => api.get('/api/counters', { params });
export const createCounter = async (payload) => api.post('/api/counters', payload);
export const updateCounter = async (id, payload) => api.put(`/api/counters/${id}`, payload);
export const assignCounterStaff = async (id, assignedStaff) => api.post(`/api/counters/${id}/assign`, { assignedStaff });

export const getCounterById = async (counterId) => {
  return api.get(`/api/counters/${counterId}`);
};

export const updateCounterStatus = async (counterId, status) => {
  return api.post(`/api/counters/${counterId}/status`, { status });
};
