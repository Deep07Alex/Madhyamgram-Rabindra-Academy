import { useState, useEffect, useCallback } from 'react';
import { useNavigate, NavLink, Routes, Route, Navigate } from 'react-router-dom';
import api from '../services/api';
import StudentAttendance from '../components/student/StudentAttendance';
import StudentFees from '../components/student/StudentFees';
import StudentHomework from '../components/student/StudentHomework';
import StudentResults from '../components/student/StudentResults';
import NoticeBoard from '../components/common/NoticeBoard';
import LiveClock from '../components/common/LiveClock';
import ThemeToggle from '../components/common/ThemeToggle';
import StudentOverview from '../components/student/StudentOverview';
import useServerEvents from '../hooks/useServerEvents';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    CalendarCheck,
    Wallet,
    BookOpenCheck,
    GraduationCap,
    LogOut,
    Menu,
    X,
    BellRing,
    Bell
} from 'lucide-react';
const StudentDashboard = () => {
    const { user, updateUser, logout: authLogout } = useAuth();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        if (!user || user.role !== 'STUDENT') {
            navigate('/', { replace: true });
        }
    }, [user, navigate]);

    const [stats, setStats] = useState({
        attendanceRate: 0,
        averageGrade: 0,
        activeSubjects: 0
    });
    const [unreadCount, setUnreadCount] = useState(0);
    const [notices, setNotices] = useState<any[]>([]);
    const [pendingAssignments, setPendingAssignments] = useState<any[]>([]);

    const fetchProfile = useCallback(async () => {
        try {
            const res = await api.get('/auth/me');
            updateUser(res.data);
        } catch (error: any) {
            console.error('Failed to fetch profile:', error);
        }
    }, [updateUser]);

    const fetchStats = useCallback(async () => {
        try {
            const res = await api.get('/dashboard/stats');
            setStats(res.data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    }, []);

    const fetchNotices = useCallback(async () => {
        try {
            const res = await api.get('/notices');
            setNotices(res.data);
            const lastChecked = localStorage.getItem('student_last_checked_notices') || '0';
            const unread = res.data.filter((n: any) => new Date(n.createdAt).getTime() > parseInt(lastChecked));
            setUnreadCount(unread.length);
        } catch (error) {
            console.error('Failed to fetch notices:', error);
        }
    }, []);

    const fetchAssignments = useCallback(async () => {
        try {
            const res = await api.get('/homework');
            const pending = res.data.filter((hw: any) => !hw.submissions || hw.submissions.length === 0);
            setPendingAssignments(pending);
        } catch (error) {
            console.error('Failed to fetch pending assignments:', error);
        }
    }, []);

    useEffect(() => {
        fetchProfile();
        fetchStats();
        fetchNotices();
        fetchAssignments();
    }, [fetchProfile, fetchStats, fetchNotices, fetchAssignments]);

    useServerEvents({
        'attendance:updated': fetchStats,
        'homework_created': fetchAssignments,
        'homework_submitted': fetchAssignments,
        'homework_deleted': fetchAssignments,
        'new_notice': fetchNotices,
        'profile_updated': fetchProfile
    });

    const handleLogout = () => {
        authLogout();
        navigate('/');
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);

    const clearNotices = () => {
        localStorage.setItem('student_last_checked_notices', Date.now().toString());
        setUnreadCount(0);
    };

    const navItems = [
        { path: '/student/dashboard', icon: <LayoutDashboard size={20} />, label: 'Overview' },
        { path: '/student/attendance', icon: <CalendarCheck size={20} />, label: 'My Attendance' },
        { path: '/student/fees', icon: <Wallet size={20} />, label: 'Fee Portal' },
        { path: '/student/homework', icon: <BookOpenCheck size={20} />, label: 'Class Tasks' },
        { path: '/student/results', icon: <GraduationCap size={20} />, label: 'My Academic Record' },
        { path: '/student/notices', icon: <BellRing size={20} />, label: 'Notices' },
    ];

    return (
        <div className="dashboard-layout">
            <header className="mobile-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src="/RABINDRA_LOGO.jpeg" alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--nav-text)' }}>Rabindra Academy</span>
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
                        <span style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--nav-text)' }}>Rabindra Academy</span>
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Student Learning Hub</span>
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
                                if (item.path === '/student/notices') clearNotices();
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
                        <h2>Hello, {user?.name?.split(' ')[0]}!</h2>
                        <p style={{ color: 'var(--text-muted)' }}>Welcome back to your academic hub.</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div className="hide-on-mobile"><LiveClock /></div>
                        <ThemeToggle />
                        <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => navigate('/student/notices')}>
                            <Bell size={22} color="var(--primary-bold)" />
                            {unreadCount > 0 && (
                                <span className="notification-badge">{unreadCount}</span>
                            )}
                        </div>
                    </div>
                </header>

                <div className="page-view">
                    <Routes>
                        <Route path="dashboard" element={
                            <StudentOverview 
                                user={user} 
                                stats={stats} 
                                notices={notices} 
                                pendingAssignments={pendingAssignments}
                                onClearNotices={clearNotices}
                            />
                        } />
                        <Route path="attendance" element={<StudentAttendance />} />
                        <Route path="fees" element={<StudentFees />} />
                        <Route path="homework" element={<StudentHomework />} />
                        <Route path="results" element={<StudentResults />} />
                        <Route path="notices" element={<NoticeBoard />} />
                        <Route path="/" element={<Navigate to="/student/dashboard" />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
};

export default StudentDashboard;
