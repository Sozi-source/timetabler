import axios, { type AxiosError } from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/',
  headers: { 'Content-Type': 'application/json' },
  timeout: 60_000, // 60 s — covers slow timetable generation
});

// Attach token on every request
api.interceptors.request.use((config) => {
  // localStorage is only available client-side
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('timetabler_token');
    if (token) config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

// Global 401 handler
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('timetabler_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;