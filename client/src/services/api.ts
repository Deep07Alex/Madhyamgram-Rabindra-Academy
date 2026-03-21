/**
 * Central API Service (Axios Instance)
 * 
 * Provides a pre-configured Axios client for all backend communication.
 * Features:
 * - Automatic JWT token attachment via request interceptors.
 * - Global 401 (Unauthorized) handling via response interceptors.
 * - Base URL management from environment variables.
 */
import axios from 'axios';
import type { InternalAxiosRequestConfig, AxiosResponse } from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
    timeout: 30000,
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = sessionStorage.getItem('token');
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error: any) => {
    return Promise.reject(error);
});

// Response Interceptor:
// Checks every outgoing response. If a 401 Unauthorized error is detected,
// it means the session has expired; thus, we clear the token and redirect to login.
api.interceptors.response.use((response: AxiosResponse) => {
    return response;
}, (error: any) => {
    if (error.response && error.response.status === 401) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
            window.location.href = '/';
        }
    }
    return Promise.reject(error);
});

export default api;
