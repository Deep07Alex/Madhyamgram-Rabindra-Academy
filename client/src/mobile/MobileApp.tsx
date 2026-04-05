import { HashRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { getPersistentStorage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import MainPage from '../pages/MainPage';

import MobileLoginScreen from './screens/MobileLoginScreen';
import MobileDashboardLayout from './components/MobileDashboardLayout';
import MobileAdminDashboard from './screens/admin/MobileAdminDashboard';
import MobileIntroScreen from './screens/MobileIntroScreen';
import MobileStudentDashboard from './screens/MobileStudentDashboard';
import MobileTeacherDashboard from './screens/MobileTeacherDashboard';
import MobileManageStudents from './screens/admin/MobileManageStudents';
import MobileManageTeachers from './screens/admin/MobileManageTeachers';
import MobileManageClasses from './screens/admin/MobileManageClasses';
import MobileManageAttendance from './screens/admin/MobileManageAttendance';
import MobileManageResults from './screens/admin/MobileManageResults';
import MobileManageFees from './screens/admin/MobileManageFees';
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
