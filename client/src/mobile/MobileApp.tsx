import { lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { getPersistentStorage } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Lazy load screens for performance optimization
const MainPage = lazy(() => import('../pages/MainPage'));
const MobileLoginScreen = lazy(() => import('./screens/MobileLoginScreen'));
const MobileDashboardLayout = lazy(() => import('./components/MobileDashboardLayout'));
const MobileAdminDashboard = lazy(() => import('./screens/admin/MobileAdminDashboard'));
const MobileIntroScreen = lazy(() => import('./screens/MobileIntroScreen'));
const MobileStudentDashboard = lazy(() => import('./screens/MobileStudentDashboard'));
const MobileTeacherDashboard = lazy(() => import('./screens/MobileTeacherDashboard'));
const MobileManageStudents = lazy(() => import('./screens/admin/MobileManageStudents'));
const MobileManageTeachers = lazy(() => import('./screens/admin/MobileManageTeachers'));
const MobileManageClasses = lazy(() => import('./screens/admin/MobileManageClasses'));
const MobileManageAttendance = lazy(() => import('./screens/admin/MobileManageAttendance'));
const MobileManageResults = lazy(() => import('./screens/admin/MobileManageResults'));
const MobileManageFees = lazy(() => import('./screens/admin/MobileManageFees'));

import '../index.css';

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
        <p style={{ marginTop: '16px', fontWeight: '600', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
            Loading...
        </p>
    </div>
);

const RootRedirector = () => {
    const storage = getPersistentStorage();
    if (!storage.getItem('has_seen_onboarding')) {
        return <Navigate to="/intro" replace />;
    }
    return <MainPage />;
};

const DashboardIndex = () => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;

    const role = user?.role?.toUpperCase();
    if (role === 'ADMIN') return <MobileAdminDashboard />;
    if (role === 'STUDENT') return <MobileStudentDashboard />;
    if (role === 'TEACHER') return <MobileTeacherDashboard />;

    return <div style={{ padding: '40px', color: 'red' }}>ERROR: Unrecognized role: {role}</div>;
};

const AnimatedRoutes = () => {
    const location = useLocation();
    const { loading } = useAuth();

    if (loading) return <LoadingFallback />;

    return (
        <Suspense fallback={<LoadingFallback />}>
            <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                    <Route path="/" element={<RootRedirector />} />
                    <Route path="/intro" element={<MobileIntroScreen />} />
                    <Route path="/login" element={<MobileLoginScreen />} />

                    {/* Protected Dashboard Routes nested inside MobileDashboardLayout */}
                    <Route path="/dashboard" element={<MobileDashboardLayout />}>
                        <Route index element={<DashboardIndex />} />
                        <Route path="students" element={<MobileManageStudents />} />
                        <Route path="faculty" element={<MobileManageTeachers />} />
                        <Route path="classes" element={<MobileManageClasses />} />
                        <Route path="attendance" element={<MobileManageAttendance />} />
                        <Route path="results" element={<MobileManageResults />} />
                        <Route path="fees" element={<MobileManageFees />} />
                    </Route>
                </Routes>
            </AnimatePresence>
        </Suspense>
    );
};

export default function MobileApp() {
    return (
        <div style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh', width: '100vw', overflowX: 'hidden' }}>
            <Router>
                <AnimatedRoutes />
            </Router>
        </div>
    );
}
