import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (email: string, password: string, name: string, role: string) =>
    api.post('/auth/register', { email, password, name, role })
};

export const agentsAPI = {
  list: () => api.get('/agents'),
  get: (id: string) => api.get(`/agents/${id}`),
  chat: (id: string, message: string) => api.post(`/agents/${id}/chat`, { message })
};

export const adminAPI = {
  createAgent: (data: any) => api.post('/admin/agents', data),
  updateAgent: (id: string, data: any) => api.put(`/admin/agents/${id}`, data),
  deleteAgent: (id: string) => api.delete(`/admin/agents/${id}`),
  listAgents: () => api.get('/admin/agents')
};

export const decisionsAPI = {
  pending: () => api.get('/decisions/pending'),
  approve: (id: string) => api.post(`/decisions/${id}/approve`),
  reject: (id: string) => api.post(`/decisions/${id}/reject`)
};
