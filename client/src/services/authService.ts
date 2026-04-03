/**
 * Authentication Service
 * 
 * Low-level authentication utilities for interacting with the /auth API.
 * Handles the storage and retrieval of credentials in SessionStorage.
 */
import api, { getStorage } from './api';

/**
 * Logs in a user based on their ID, password, and intended Role.
 */
export const login = async (loginId: string, password: string, role: string) => {
    const response = await api.post('/auth/login', { username: loginId, password, role });
    if (response.data.token) {
        const storage = getStorage();
        storage.setItem('token', response.data.token);
        storage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
};

export const logout = () => {
    const storage = getStorage();
    storage.removeItem('token');
    storage.removeItem('user');
};

export const getCurrentUser = () => {
    const storage = getStorage();
    const user = storage.getItem('user');
    return user ? JSON.parse(user) : null;
};
