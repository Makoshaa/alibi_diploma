import axios from 'axios';

// Используем VITE_API_BASE_URL если доступен (для работы в локальной сети),
// иначе используем относительный путь (для dev с localhost)
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor для добавления JWT токена из sessionStorage (для мобильных устройств)
api.interceptors.request.use(
  (config) => {
    const mobileJwt = sessionStorage.getItem('mobile_jwt');
    if (mobileJwt) {
      config.headers.Authorization = `Bearer ${mobileJwt}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
