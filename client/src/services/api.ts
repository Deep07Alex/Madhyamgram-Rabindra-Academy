import axios from 'axios';

// Simple in-memory cache for GET requests
const apiCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
    timeout: 30000,
});

// Add a request interceptor to include the JWT token and handle caching
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // Cache logic for GET requests
    if (config.method === 'get') {
        const cacheKey = config.url + JSON.stringify(config.params || {});
        const cached = apiCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
            // Return a resolved promise with the cached data
            // We cast to any to bypass axios config type strictness for this hack
            (config as any).adapter = () => {
                return Promise.resolve({
                    data: cached.data,
                    status: 200,
                    statusText: 'OK',
                    headers: {},
                    config,
                });
            };
        }
    }

    return config;
}, (error) => {
    return Promise.reject(error);
});

// Add a response interceptor to handle 401 errors and populate cache
api.interceptors.response.use((response) => {
    // Cache the response if it was a successful GET request
    if (response.config.method === 'get') {
        const cacheKey = response.config.url + JSON.stringify(response.config.params || {});
        apiCache.set(cacheKey, { data: response.data, timestamp: Date.now() });
    }
    
    // Invalidate cache for POST/PUT/DELETE/PATCH common patterns
    if (['post', 'put', 'delete', 'patch'].includes(response.config.method || '')) {
         apiCache.clear(); // Simple brute-force invalidation for safety
    }

    return response;
}, (error) => {
    if (error.response && error.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
            window.location.href = '/';
        }
    }
    return Promise.reject(error);
});

export default api;
