import api from './axios';

export const getMyAppointments = async () => {
  return api.get('/api/appointments/my');
};

export const createAppointment = async (payload) => {
  return api.post('/api/appointments', payload);
};

export const getAppointmentById = async (id) => {
  return api.get(`/api/appointments/${id}`);
};

export const cancelAppointment = async (id) => {
  return api.put(`/api/appointments/${id}/cancel`);
};

export const checkInAppointment = async (id, payload = {}) => {
  return api.post(`/api/appointments/${id}/check-in`, payload);
};

export const completeAppointment = async (id, payload = {}) => {
  return api.put(`/api/appointments/${id}/complete`, payload);
};

