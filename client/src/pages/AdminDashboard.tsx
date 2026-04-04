/**
 * Admin Dashboard
 * 
 * The central command center for school administrators.
 * Provides a modular interface to manage students, faculty, classes, results, and notices.
 * Features:
 * - Real-time statistics synchronization via WebSockets/SSE.
 * - Responsive sidebar navigation.
 * - Role-based route protection.
 */
import { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useNavigate, NavLink, Routes, Route, Navigate } from 'react-router-dom';
import api from '../services/api';
import { StatsSkeleton } from '../components/common/Skeleton';

// Admin Sub-modules (Lazy Loaded for performance)
const ManageStudents = lazy(() => import('../components/admin/ManageStudents'));
const ManageTeachers = lazy(() => import('../components/admin/ManageTeachers'));
const ManageClasses = lazy(() => import('../components/admin/ManageClasses'));
const ManageResults = lazy(() => import('../components/admin/ManageResults'));
const ManageAssets = lazy(() => import('../components/admin/ManageAssets'));
const ManageAttendance = lazy(() => import('../components/admin/ManageAttendance'));
const ManageNotices = lazy(() => import('../components/admin/ManageNotices'));
const ManageFees = lazy(() => import('../components/admin/ManageFees'));
const ManageHomework = lazy(() => import('../components/admin/ManageHomework'));
const AdminOverview = lazy(() => import('../components/admin/AdminOverview'));

import LiveClock from '../components/common/LiveClock';
import ThemeToggle from '../components/common/ThemeToggle';
import useServerEvents from '../hooks/useServerEvents';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    Users,
    BookOpen,
    FileText,
    Image as ImageIcon,
    ClipboardCheck,
    BellRing,
    LogOut,
    Menu,
    X,
    UserCircle,
    Loader2,
    Banknote,
    BookPlus
} from 'lucide-react';

const AdminDashboard = () => {
    const { user, logout: authLogout, updateUser } = useAuth();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        if (!user || user.role !== 'ADMIN') {
            navigate('/', { replace: true });
        }
    }, [user, navigate]);

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [stats, setStats] = useState({
        students: 0,
        teachers: 0,
        classes: 0
    });

    const fetchStats = useCallback(async (silent = false) => {
        if (!silent) setIsRefreshing(true);
        try {
            const res = await api.get('/dashboard/stats');
            setStats(res.data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const fetchUser = useCallback(async () => {
        try {
            const res = await api.get('/auth/me');
            if (res.data) {
                updateUser({ ...res.data, role: res.data.role || 'ADMIN' });
            }
        } catch (error) {
            console.error('Failed to refresh user profile:', error);
        }
    }, [updateUser]);

    // Real-time Event Handling:
    // Automatically refreshes dashboard statistics when relevant backend events occur.
    useServerEvents({
        'focus': () => fetchStats(true),
        'connected': () => { if (import.meta.env.DEV) console.log('[SSE] Admin Control: Real-time link established'); },
        'attendance:updated': () => fetchStats(true),
        'user:created': () => fetchStats(true),
        'user:deleted': () => fetchStats(true),
        'class:updated': () => fetchStats(true),
        'profile_updated': (data: any) => {
            fetchStats(true);
            if (data?.teacherId === user?.id || data?.adminId === user?.id || (!data?.teacherId && !data?.adminId)) {
                fetchUser();
            }
        },
        'new_notice': () => fetchStats(true),
        'notice_deleted': () => fetchStats(true)
    });

    const handleLogout = () => {
        authLogout();
        navigate('/');
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);

    const navItems = [
        { path: '/admin/dashboard', icon: <LayoutDashboard size={20} />, label: 'Overview' },
        { path: '/admin/students', icon: <Users size={20} />, label: 'Manage Students' },
        { path: '/admin/faculty', icon: <UserCircle size={20} />, label: 'Manage Faculty' },
        { path: '/admin/classes', icon: <BookOpen size={20} />, label: 'See Classes' },
        { path: '/admin/attendance', icon: <ClipboardCheck size={20} />, label: 'Attendance' },
        { path: '/admin/results', icon: <FileText size={20} />, label: 'Results' },
        { path: '/admin/fees', icon: <Banknote size={20} />, label: 'Fees' },
        { path: '/admin/notices', icon: <BellRing size={20} />, label: 'Notices' },
        { path: '/admin/homework', icon: <BookPlus size={20} />, label: 'Assignments' },
        { path: '/admin/assets', icon: <ImageIcon size={20} />, label: 'Manage Assets' },
    ];

    return (
        <div className="dashboard-layout">
            <header className="mobile-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src="/RABINDRA_LOGO.jpeg" alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--nav-text)' }}>Madhyamgram Rabindra Academy</span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ThemeToggle />
                    <button onClick={toggleSidebar} style={{ background: 'none', border: 'none', color: 'var(--text-main)' }}>
                        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </header>

            <div className={`sidebar-overlay ${isSidebarOpen ? 'show' : ''}`} onClick={closeSidebar}></div>

            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <img src="/RABINDRA_LOGO.jpeg" alt="Logo" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--nav-text)' }}>Madhyamgram Rabindra Academy</span>
                        <span style={{ fontSize: '0.62rem', fontWeight: 600, color: 'var(--text-muted)' }}>UDISE: 19112601311 | ESTD: 2005</span>
                    </div>
                </div>

                <div className="sidebar-user-info">
                    <span className="user-name">{user?.name}</span>
                    <span className="user-id">ID: {user?.adminId || user?.username}</span>
                    <span className="user-role">Super Admin</span>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }: { isActive: boolean }) => `nav-item ${isActive ? 'active' : ''}`}
                            onClick={closeSidebar}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <button onClick={handleLogout} className="logout-btn">
                    <LogOut size={20} />
                    <span>Log Out</span>
                </button>
            </aside>

            <main className="dashboard-content">
                <header className="content-header">
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                            <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900 }}>Admin Control Center</h2>
                            <div style={{ padding: '6px 16px', borderRadius: '100px', background: 'var(--primary-soft)', color: 'var(--primary-bold)', fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {isRefreshing ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-bold)' }}></span>
                                )}
                                {isRefreshing ? 'Syncing...' : 'Active Portal'}
                            </div>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Manage academy excellence and systems.</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div className="hide-on-mobile"><LiveClock /></div>
                        <ThemeToggle />
                        <div style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/notices')}>
                            <BellRing size={22} color="var(--primary-bold)" />
                        </div>
                    </div>
                </header>

                <div className="page-view">
                    <Suspense fallback={
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', width: '100%', color: 'var(--primary-bold)' }}>
                            <Loader2 className="animate-spin" size={32} />
                            <span style={{ marginLeft: '12px', fontWeight: '600' }}>Loading Module...</span>
                        </div>
                    }>
                        <Routes>
                            <Route path="dashboard" element={stats ? <AdminOverview user={user} stats={stats} /> : <StatsSkeleton />} />
                            <Route path="students" element={<ManageStudents />} />
                            <Route path="faculty" element={<ManageTeachers />} />
                            <Route path="classes" element={<ManageClasses />} />
                            <Route path="attendance" element={<ManageAttendance />} />
                            <Route path="results" element={<ManageResults />} />
                            <Route path="fees" element={<ManageFees />} />
                            <Route path="notices" element={<ManageNotices />} />
                            <Route path="homework" element={<ManageHomework />} />
                            <Route path="assets" element={<ManageAssets />} />
                            <Route path="/" element={<Navigate to="/admin/dashboard" />} />
                            <Route path="*" element={<Navigate to="/admin/dashboard" />} />
                        </Routes>
                    </Suspense>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
