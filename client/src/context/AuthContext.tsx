/**
 * Authentication Context
 * 
 * Manages the global authentication state, session storage, and inactivity monitoring.
 * Note: Session restoration is disabled per user request; every refresh results in a logout.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from './ToastContext';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { getStorage } from '../services/api';

interface User {
    id: string;
    role: 'ADMIN' | 'TEACHER' | 'STUDENT';
    name: string;
    [key: string]: any;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    updateUser: (newUser: User) => void;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();
    const timeoutRef = useRef<any>(null);

    // Inactivity Monitoring:
    // Automatically logs out the user after 10 minutes of no interaction (mouse/keyboard).
    const logout = useCallback(() => {
        const storage = getStorage();
        storage.removeItem('token');
        storage.removeItem('user');
        storage.removeItem('last_active_timestamp'); // Clear our grace period marker
        setToken(null);
        setUser(null);
    }, []);

    const resetInactivityTimer = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        
        if (token) {
            timeoutRef.current = setTimeout(() => {
                showToast('Session expired due to inactivity.', 'info');
                logout();
            }, INACTIVITY_TIMEOUT);
        }
    }, [token, logout, showToast]);

    useEffect(() => {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        
        const handleActivity = () => resetInactivityTimer();

        if (token) {
            resetInactivityTimer();
            events.forEach(event => window.addEventListener(event, handleActivity));

            return () => {
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                events.forEach(event => window.removeEventListener(event, handleActivity));
            };
        }
    }, [token, resetInactivityTimer]);

    const login = useCallback((newToken: string, newUser: User) => {
        const storage = getStorage();
        storage.setItem('token', newToken);
        storage.setItem('user', JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
    }, []);

    const updateUser = useCallback((newUser: User) => {
        const storage = getStorage();
        storage.setItem('user', JSON.stringify(newUser));
        setUser(newUser);
    }, []);

    useEffect(() => {
        // PLATFORM ADAPTIVE SESSION RESTORATION
        const storage = getStorage();
        const savedToken = storage.getItem('token');
        const savedUser = storage.getItem('user');

        if (savedToken && savedUser) {
            try {
                setToken(savedToken);
                setUser(JSON.parse(savedUser));
            } catch (err) {
                console.error('Failed to restore session:', err);
                logout(); 
            }
        }
        
        setLoading(false);
    }, [logout]);

    // Capacitor Native Only: Handle Background Grace Period (5 minutes)
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        const listener = App.addListener('appStateChange', ({ isActive }: { isActive: boolean }) => {
            const storage = getStorage();
            if (isActive) {
                // Moving to Foreground: Check if we've been away too long
                const lastActive = storage.getItem('last_active_timestamp');
                if (lastActive) {
                    const elapsed = Date.now() - parseInt(lastActive, 10);
                    if (elapsed > 5 * 60 * 1000) { // 5 Minute Grace Period
                        showToast('Session expired.', 'info');
                        logout();
                    }
                }
            } else {
                // Moving to Background: Record the departure time
                storage.setItem('last_active_timestamp', Date.now().toString());
            }
        });

        return () => {
            listener.then((l: any) => l.remove());
        };
    }, [logout, showToast]);

    const value = React.useMemo(() => ({
        user,
        token,
        login,
        updateUser,
        logout,
        loading
    }), [user, token, login, updateUser, logout, loading]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
