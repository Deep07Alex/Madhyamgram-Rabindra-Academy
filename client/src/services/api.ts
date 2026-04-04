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

// Helper for session-based storage (for authentication data)
export const getStorage = () => sessionStorage;

// Helper for persistent storage (for preferences like onboarding flags)
export const getPersistentStorage = () => localStorage;

// Helper to get the absolute production URL (Critical for Native Android support)
export const getBaseUrl = () => {
    if (Capacitor.isNativePlatform()) {
        return 'https://madhyamgramrabindraacademy.in';
    }
    return import.meta.env.VITE_API_URL || window.location.origin;
};

const api = axios.create({
    baseURL: getBaseUrl() + (import.meta.env.VITE_API_BASE_URL || '/api'),
    timeout: 120000,
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const storage = getStorage();
    const token = storage.getItem('token');
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error: any) => {
    return Promise.reject(error);
});

// Response Interceptor:
api.interceptors.response.use((response: AxiosResponse) => {
    return response;
}, (error: any) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');

    if (error.response && error.response.status === 401 && !isLoginRequest) {
        const storage = getStorage();
        storage.removeItem('token');
        storage.removeItem('user');
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(error);
});

export default api;
