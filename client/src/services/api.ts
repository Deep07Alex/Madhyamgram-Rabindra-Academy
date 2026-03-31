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
import { Capacitor } from '@capacitor/core';

// Helper to determine storage type
// Native: Use localStorage for persistence across app switches
// Web: Use sessionStorage for security (logout on refresh)
export const getStorage = () => (Capacitor.isNativePlatform() ? localStorage : sessionStorage);

const api = axios.create({
    baseURL: Capacitor.isNativePlatform() ? 'https://madhyamgramrabindraacademy.in/api' : (import.meta.env.VITE_API_BASE_URL || '/api'),
    timeout: 120000, // 2 minutes (Needed for large media uploads)
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
