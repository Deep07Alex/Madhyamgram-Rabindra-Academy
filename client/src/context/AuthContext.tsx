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

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();
    const timeoutRef = useRef<any>(null);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
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
            
            // Handle tab closure/exit
            const handleUnload = () => {
                // We clear storage but don't call logout() 
                // because we just want them gone when they come back
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            };
            window.addEventListener('beforeunload', handleUnload);

            return () => {
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                events.forEach(event => window.removeEventListener(event, handleActivity));
                window.removeEventListener('beforeunload', handleUnload);
            };
        }
    }, [token, resetInactivityTimer]);

    const login = useCallback((newToken: string, newUser: User) => {
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
    }, []);

    const updateUser = useCallback((newUser: User) => {
        localStorage.setItem('user', JSON.stringify(newUser));
        setUser(newUser);
    }, []);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setToken(storedToken);
                setUser(parsedUser);
            } catch (e) {
                console.error('Failed to parse stored user', e);
                logout();
            }
        }
        setLoading(false);
    }, [logout]);

    return (
        <AuthContext.Provider value={{ user, token, login, updateUser, logout, loading }}>
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
