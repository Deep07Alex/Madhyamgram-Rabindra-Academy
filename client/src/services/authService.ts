/**
 * Authentication Service
 * 
 * Low-level authentication utilities for interacting with the /auth API.
 * Handles the storage and retrieval of credentials in SessionStorage.
 */
import api from './api.js';

/**
 * Logs in a user based on their ID, password, and intended Role.
 */
export const login = async (loginId: string, password: string, role: string) => {
    const response = await api.post('/auth/login', { username: loginId, password, role });
    if (response.data.token) {
        sessionStorage.setItem('token', response.data.token);
        sessionStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
};

export const logout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
};

export const getCurrentUser = () => {
    const user = sessionStorage.getItem('user');
    return user ? JSON.parse(user) : null;
};
