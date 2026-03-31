/**
 * Application Entry Point (App.tsx)
 * 
 * The root component of the Madhyamgram Rabindra Academy web application.
 * Responsibilities:
 * - Routing: Defines public paths, dashboard routes, and role-based access control.
 * - Context Orchestration: Wraps the app in Auth, Theme, and Toast providers.
 * - Performance: Implements lazy loading and background preloading for dashboards.
 * - Global Redirects: Ensures unauthenticated users are safely returned to the landing page.
 */
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';

// Lazy load components for production optimization
const Login = React.lazy(() => import('./pages/Login'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const TeacherDashboard = React.lazy(() => import('./pages/TeacherDashboard'));
const StudentDashboard = React.lazy(() => import('./pages/StudentDashboard'));
const Gallery = React.lazy(() => import('./pages/Gallery'));
const MainPage = React.lazy(() => import('./pages/MainPage'));

// Preload utility to fetch dashboard chunks in the background
const preloadDashboard = (factory: () => Promise<any>) => {
    const component = factory();
    component.catch(() => {}); // Handle potential network errors silently
};

const LoadingFallback = () => (
    <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-main)',
        color: 'var(--primary-bold)'
    }}>
        <Loader2 className="animate-spin" size={48} />
        <p style={{ marginTop: '16px', fontWeight: '600', letterSpacing: '0.05em' }}>Loading Excellence...</p>
    </div>
);

/**
 * Access Control Guard:
 * Protects dashboard routes by checking for a valid session and matching user roles.
 * Redirects to the landing page ('/') if validation fails — meeting the security
 * requirement to avoid exposing internal paths to guests.
 */
const PrivateRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
    const { user, token, loading } = useAuth();

    if (loading) return <LoadingFallback />;

    // Redirect to login (or home) if NO session exists
    if (!token || !user) {
        return <Navigate to="/" replace />;
    }

    // Redirect to login (or home) if role is WRONG
    if (!allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

function App() {
    // Preload dashboards when the app mounts to ensure near-instant navigation
    React.useEffect(() => {
        const timer = setTimeout(() => {
            preloadDashboard(() => import('./pages/AdminDashboard'));
            preloadDashboard(() => import('./pages/TeacherDashboard'));
            preloadDashboard(() => import('./pages/StudentDashboard'));
            preloadDashboard(() => import('./pages/Login'));
        }, 2000); // Wait 2 seconds to not interfere with initial MainPage load
        return () => clearTimeout(timer);
    }, []);

    return (
        <ThemeProvider>
            <ToastProvider>
                <AuthProvider>
                    <Router>
                        <React.Suspense fallback={<LoadingFallback />}>
                            <Routes>
                                <Route path="/login" element={<Login />} />

                                <Route
                                    path="/admin/*"
                                    element={
                                        <PrivateRoute allowedRoles={['ADMIN']}>
                                            <AdminDashboard />
                                        </PrivateRoute>
                                    }
                                />

                                <Route
                                    path="/teacher/*"
                                    element={
                                        <PrivateRoute allowedRoles={['TEACHER']}>
                                            <TeacherDashboard />
                                        </PrivateRoute>
                                    }
                                />

                                <Route
                                    path="/student/*"
                                    element={
                                        <PrivateRoute allowedRoles={['STUDENT']}>
                                            <StudentDashboard />
                                        </PrivateRoute>
                                    }
                                />

                                <Route path="/" element={<MainPage />} />
                                <Route path="/gallery" element={<Gallery />} />
                            </Routes>
                        </React.Suspense>
                    </Router>
                </AuthProvider>
            </ToastProvider>
        </ThemeProvider>
    );
}

export default App;
