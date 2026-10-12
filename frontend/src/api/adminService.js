import api from './axios';

export const getAdminDashboard = async () => {
  return api.get('/api/admin/dashboard');
};

export const getServiceStatistics = async (serviceId) => {
  return api.get(`/api/admin/services/${serviceId}/statistics`);
};

export const createServiceWithStaff = async (service, staff) =>
  api.post('/api/admin/services-with-staff', { service, staff });

export const createAdminAccount = async (payload) =>
  api.post('/api/auth/register', payload);

export const resetStaffPassword = async (userId, password) =>
  api.put(`/api/admin/users/${userId}/password`, { password });
