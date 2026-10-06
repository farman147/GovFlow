import api from './axios';

export const getServices = async (params) => api.get('/api/services', { params });
export const createService = async (payload) => api.post('/api/services', payload);
export const updateService = async (id, payload) => api.put(`/api/services/${id}`, payload);
export const deleteService = async (id) => api.delete(`/api/services/${id}`);

export const getServiceAssistantDetails = async (serviceId) => {
  return api.get(`/api/services/${serviceId}/details`);
};
