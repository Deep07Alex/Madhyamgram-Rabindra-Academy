/**
 * Authentication Context
 * 
 * Manages the global authentication state, session storage, and inactivity monitoring.
 * Note: Session restoration is disabled per user request; every refresh results in a logout.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from './ToastContext';

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
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
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
        sessionStorage.setItem('token', newToken);
        sessionStorage.setItem('user', JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
    }, []);

    const updateUser = useCallback((newUser: User) => {
        sessionStorage.setItem('user', JSON.stringify(newUser));
        setUser(newUser);
    }, []);

    useEffect(() => {
        // PER USER REQUEST: SECURITY ENFORCEMENT
        // Session restoration on page reload is explicitly disabled.
        // Every refresh or hard reload will clear the session and force a re-login.
        logout(); 
        setLoading(false);
    }, [logout]);

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
