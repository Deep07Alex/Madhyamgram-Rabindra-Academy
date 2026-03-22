/**
 * Student Dashboard
 * 
 * The primary portal for students to track their academic journey.
 * Features:
 * - Unified data fetching for profile, stats, and assignments.
 * - Real-time notifications for new homework and results.
 * - Attendance tracking.
 * - Automatic background syncing.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, NavLink, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import StudentAttendance from '../components/student/StudentAttendance';

import StudentHomework from '../components/student/StudentHomework';
import StudentResults from '../components/student/StudentResults';
import NoticeBoard from '../components/common/NoticeBoard';
import LiveClock from '../components/common/LiveClock';
import ThemeToggle from '../components/common/ThemeToggle';
import StudentOverview from '../components/student/StudentOverview';
import useServerEvents from '../hooks/useServerEvents';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
    LayoutDashboard,
    CalendarCheck,
    BookOpenCheck,
    GraduationCap,
    LogOut,
    Menu,
    X,
    BellRing,
    Bell,
    Loader2
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

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [stats, setStats] = useState({
        attendanceRate: 0,
        averageGrade: 0,
        activeSubjects: 0
    });
    const [unreadCount, setUnreadCount] = useState(0);
    const [pendingAssignments, setPendingAssignments] = useState<any[]>([]);

    /**
     * Unified Refresh:
     * Fetches student profile, academic stats, notices, and pending assignments in one call.
     * Updates global state and local states simultaneously.
     */
    const refreshData = useCallback(async (silent = false) => {
        if (!silent) setIsRefreshing(true);
        try {
            const res = await api.get('/dashboard/unified');
            const { profile, stats, notices: noticeList, assignments } = res.data;
            
            // 1. Update Profile (Global Auth)
            updateUser(profile);
            
            // 2. Update Stats
            setStats(stats);
            
            // 3. Update Unread Count
            const lastChecked = localStorage.getItem('student_last_checked_notices') || '0';
            const unread = noticeList.filter((n: any) => new Date(n.createdAt).getTime() > parseInt(lastChecked));
            setUnreadCount(unread.length);
            
            // 4. Update Pending Assignments (Exclude submitted, expired, and RECENTLY submitted)
            const now = new Date().getTime();
            
            // Bypass React state to ensure 100% accuracy during client-side navigation
            const storedString = localStorage.getItem('recently_submitted_homework');
            const localSubmittedIds = storedString ? new Set(JSON.parse(storedString)) : new Set();

            const pending = assignments.filter((hw: any) => {
                // Defensive parsing for PostgreSQL json columns
                let serverSubmissions = hw.submissions;
                if (typeof serverSubmissions === 'string') {
                    try {
                        serverSubmissions = JSON.parse(serverSubmissions);
                    } catch (e) {
                        serverSubmissions = [];
                    }
                }

                const isSubmittedOnServer = Array.isArray(serverSubmissions) && serverSubmissions.length > 0;
                const isSubmittedLocally = localSubmittedIds.has(hw.id);
                const hasSubmitted = isSubmittedOnServer || isSubmittedLocally;
                const isExpired = new Date(hw.dueDate).getTime() < now;
                return !hasSubmitted && !isExpired;
            });
            setPendingAssignments(pending);

        } catch (error: any) {
            console.error('Unified Refresh Failed:', error);
            if (error.response?.status === 401) {
                authLogout();
            }
        } finally {
            setIsRefreshing(false);
        }
    }, [updateUser, authLogout]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    // Handle dynamic navigation (Since this component doesn't unmount)
    const { pathname } = useLocation();
    
    useEffect(() => {
        // Trigger a silent refresh when arriving back at the Overview or Notices
        if (pathname === '/student/dashboard' || pathname === '/student') {
            refreshData(true);
        }
        if (pathname === '/student/notices' && unreadCount > 0) {
            clearNotices();
        }
    }, [pathname, unreadCount, refreshData]);

    // Live Auto-Refresh (Silent background polling to guarantee banner removal)
    useEffect(() => {
        const intervalId = setInterval(() => {
            refreshData(true);
        }, 30000); // 30 seconds (Fail-safe only)
        return () => clearInterval(intervalId);
    }, [refreshData]);

    const { showToast } = useToast();

    // Real-time Event Subscriptions:
    // Listens for academic updates (homework, results, notices) and triggers silent refreshes.
    useServerEvents({
        'connected': () => { if (import.meta.env.DEV) console.log('[SSE] System confirmed: Live connection established'); },
        'attendance:updated': () => refreshData(true),
        'homework_created': (_data: any) => {
            showToast('📚 New Academic Task assigned! Check your dashboard.', 'info');
            refreshData(true);
        },
        'homework_submitted': (data: any) => {
            if (data?.homeworkId) {
                const storedString = localStorage.getItem('recently_submitted_homework');
                const next = storedString ? new Set(JSON.parse(storedString)) : new Set();
                next.add(data.homeworkId);
                localStorage.setItem('recently_submitted_homework', JSON.stringify(Array.from(next)));

                setPendingAssignments(prev => prev.filter(hw => hw.id !== data.homeworkId));
            }
            refreshData(true);
        },
        'homework_deleted': () => refreshData(true),
        'new_notice': () => {
            showToast('🔔 New School Announcement posted!', 'info');
            refreshData(true);
        },
        'notice_deleted': () => refreshData(true),
        'profile_updated': () => refreshData(true),
        'result_published': () => {
            showToast('🎓 New academic record published!', 'success');
            refreshData(true);
        },
        'class:updated': () => refreshData(true)
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
                            <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900 }}>Hello, {user?.name?.split(' ')[0]}!</h2>
                            <div style={{ padding: '6px 16px', borderRadius: '100px', background: 'var(--primary-soft)', color: 'var(--primary-bold)', fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {isRefreshing ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-bold)' }}></span>
                                )}
                                {isRefreshing ? 'Syncing...' : 'Active Portal'}
                            </div>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Welcome back to your academic hub.</p>
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
                                unreadCount={unreadCount} 
                                pendingAssignments={pendingAssignments}
                                onClearNotices={clearNotices}
                            />
                        } />
                        <Route path="attendance" element={<StudentAttendance />} />
                        <Route path="homework" element={<StudentHomework />} />
                        <Route path="results" element={<StudentResults />} />
                        <Route path="notices" element={<NoticeBoard />} />
                        <Route path="/" element={<Navigate to="/student/dashboard" />} />
                        <Route path="*" element={<Navigate to="/student/dashboard" />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
};

export default StudentDashboard;
