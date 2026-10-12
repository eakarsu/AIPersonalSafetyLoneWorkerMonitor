import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  // The client baseURL already contains /api; accept legacy call sites with that prefix.
  if (config.url?.startsWith('/api/')) config.url = config.url.slice(4);
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

export function responseRows(payload) {
  const rows = Array.isArray(payload) ? payload : payload?.data;
  return Array.isArray(rows) ? rows : [];
}
