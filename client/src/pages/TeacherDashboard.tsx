import { useState, useEffect, useCallback } from 'react';
import { useNavigate, NavLink, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import TeacherAttendance from '../components/teacher/TeacherAttendance';
import TeacherHomework from '../components/teacher/TeacherHomework';
import NoticeBoard from '../components/common/NoticeBoard';
import LiveClock from '../components/common/LiveClock';
import ThemeToggle from '../components/common/ThemeToggle';
import TeacherOverview from '../components/teacher/TeacherOverview';
import useServerEvents from '../hooks/useServerEvents';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    ClipboardCheck,
    BookType,
    LogOut,
    Menu,
    X,
    BellRing,
    Bell,
    Loader2
} from 'lucide-react';

const TeacherDashboard = () => {
    const { user, updateUser, logout: authLogout } = useAuth();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        if (!user || user.role !== 'TEACHER') {
            navigate('/', { replace: true });
        }
    }, [user, navigate]);

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [stats, setStats] = useState({
        assignedClasses: 0,
        pendingSubmissions: 0,
        attendanceRate: 0
    });
    const [unreadCount, setUnreadCount] = useState(0);

    const refreshData = useCallback(async (silent = false) => {
        if (!silent) setIsRefreshing(true);
        try {
            const res = await api.get('/dashboard/unified');
            const { profile: updatedProfile, stats: updatedStats, notices: noticeList } = res.data;
            
            // 1. Update Profile (Global Auth)
            updateUser(updatedProfile);
            
            // 2. Update Local Stats
            setStats(updatedStats);
            
            // 3. Update Unread Count
            const lastChecked = localStorage.getItem('teacher_last_checked_notices') || '0';
            const unread = noticeList.filter((n: any) => new Date(n.createdAt).getTime() > parseInt(lastChecked));
            setUnreadCount(unread.length);

        } catch (error: any) {
            console.error('Teacher Unified Refresh Failed:', error);
            if (error.response?.status === 401) authLogout();
        } finally {
            setIsRefreshing(false);
        }
    }, [updateUser, authLogout]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    // Handle notice dismissal on navigation
    const { pathname } = useLocation();

    useEffect(() => {
        if (pathname === '/teacher/notices' && unreadCount > 0) {
            clearNotices();
        }
    }, [pathname, unreadCount]);

    useServerEvents({
        'connected': () => { if (import.meta.env.DEV) console.log('[SSE] Teacher Portal: Live sync active'); },
        'attendance:updated': () => refreshData(true),
        'homework_submitted': () => refreshData(true),
        'homework_created': () => refreshData(true),
        'homework_deleted': () => refreshData(true),
        'new_notice': () => refreshData(true),
        'notice_deleted': () => refreshData(true),
        'profile_updated': () => refreshData(true),
        'class:updated': () => refreshData(true)
    });

    const handleLogout = () => {
        authLogout();
        navigate('/');
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);

    const clearNotices = () => {
        localStorage.setItem('teacher_last_checked_notices', Date.now().toString());
        setUnreadCount(0);
    };

    const navItems = [
        { path: '/teacher/dashboard', icon: <LayoutDashboard size={20} />, label: 'Overview' },
        { path: '/teacher/attendance', icon: <ClipboardCheck size={20} />, label: 'Student Attendance' },
        { path: '/teacher/homework', icon: <BookType size={20} />, label: 'Assignments' },
        { path: '/teacher/notices', icon: <BellRing size={20} />, label: 'Notices' },
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

                <div className="sidebar-user-info" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="user-name" style={{ fontSize: '0.9rem', fontWeight: '800' }}>{user?.name}</span>
                        <span className="user-id" style={{ fontSize: '0.7rem' }}>ID: {user?.teacherId}</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }: { isActive: boolean }) => `nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => {
                                closeSidebar();
                            }}
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
                            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, margin: 0, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>Hello, {user?.name?.split(' ')[0]}!</h1>
                            <div style={{ padding: '6px 16px', borderRadius: '100px', background: 'var(--primary-soft)', color: 'var(--primary-bold)', fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {isRefreshing ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-bold)' }}></span>
                                )}
                                {isRefreshing ? 'Syncing...' : 'Active Portal'}
                            </div>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Manage your classroom and academic excellence.</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div className="hide-on-mobile"><LiveClock /></div>
                        <ThemeToggle />
                        <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => navigate('/teacher/notices')}>
                            <Bell size={22} color="var(--primary-bold)" />
                            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                        </div>
                    </div>
                </header>

                <div className="page-view">
                    <Routes>
                        <Route path="dashboard" element={
                            <TeacherOverview 
                                user={user} 
                                profile={user}
                                stats={stats} 
                                unreadCount={unreadCount} 
                                onClearNotices={clearNotices}
                            />
                        } />
                        <Route path="attendance" element={<TeacherAttendance />} />
                        <Route path="homework" element={<TeacherHomework />} />
                        <Route path="notices" element={<NoticeBoard />} />
                        <Route path="/" element={<Navigate to="/teacher/dashboard" />} />
                        <Route path="*" element={<Navigate to="/teacher/dashboard" />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
};

export default TeacherDashboard;
