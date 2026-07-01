import axios from 'axios';

const getBaseUrl = () => {
  const url = import.meta.env.VITE_API_URL;
  if (!url) return '/api';
  if (url.endsWith('/api')) return url;
  if (url.endsWith('/')) return `${url}api`;
  return `${url}/api`;
};

const api = axios.create({ baseURL: getBaseUrl() });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('pp_token');
      localStorage.removeItem('pp_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;