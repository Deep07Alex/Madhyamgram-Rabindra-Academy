import { HashRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import MobileLoginScreen from './screens/MobileLoginScreen';
import MobileDashboardLayout from './components/MobileDashboardLayout';
import MobileAdminDashboard from './screens/admin/MobileAdminDashboard';
import MobileIntroScreen from './screens/MobileIntroScreen';
import MainPage from '../pages/MainPage';
import { getStorage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';
import MobileStudentDashboard from './screens/MobileStudentDashboard';
import MobileTeacherDashboard from './screens/MobileTeacherDashboard';
import MobileManageStudents from './screens/admin/MobileManageStudents';
import MobileManageTeachers from './screens/admin/MobileManageTeachers';
import '../index.css';

const LoadingFallback = () => (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-amber-600" size={48} />
    </div>
);

const RootRedirector = () => {
    const storage = getStorage();
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
