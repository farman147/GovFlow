import api from './axios';

export const queryAssistant = async ({ query, serviceId = null }) => {
  return api.post('/api/assistant/query', { query, serviceId });
};

export const getAssistantInsights = async () => {
  return api.get('/api/assistant/insights');
};
