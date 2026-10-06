import api from './axios';

export const getStaffDashboard = async () => api.get('/api/staff/dashboard');
export const getStaffQueue = async () => api.get('/api/staff/queue');
export const getStaffAppointments = async () => api.get('/api/staff/appointments');
export const getStaffStatistics = async () => api.get('/api/staff/statistics');
export const getStaffProfile = async () => api.get('/api/staff/profile');
