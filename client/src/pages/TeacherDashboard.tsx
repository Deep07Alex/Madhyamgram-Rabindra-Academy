import { useState, useEffect, useCallback } from 'react';
import { useNavigate, NavLink, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { isAttendanceOpen } from '../utils/attendance';
import api from '../services/api';
import TeacherAttendance from '../components/teacher/TeacherAttendance';
import TeacherHomework from '../components/teacher/TeacherHomework';
import NoticeBoard from '../components/common/NoticeBoard';
import LiveClock from '../components/common/LiveClock';
import ThemeToggle from '../components/common/ThemeToggle';
import TeacherOverview from '../components/teacher/TeacherOverview';
import useServerEvents from '../hooks/useServerEvents';
import { useAuth } from '../context/AuthContext';
import { CheckInModal, ClockOutModal } from '../components/teacher/AttendanceModals';
import {
    LayoutDashboard,
    ClipboardCheck,
    BookType,
    LogOut,
    Menu,
    X,
    BellRing,
    Bell,
    Loader2,
    Clock
} from 'lucide-react';

// Utility moved to src/utils/attendance.ts

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
    const [todayAttendance, setTodayAttendance] = useState<any>(null);
    const [showCheckInModal, setShowCheckInModal] = useState(false);
    const [showClockOutModal, setShowClockOutModal] = useState(false);
    const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);
    const [config, setConfig] = useState({ attendance_override: 'AUTO' });

    const refreshData = useCallback(async (silent = false) => {
        if (!silent) setIsRefreshing(true);
        try {
            const res = await api.get('/dashboard/unified');
            const { 
                profile: updatedProfile, 
                stats: updatedStats, 
                notices: noticeList, 
                todayAttendance: todayAtt,
                config: systemConfig 
            } = res.data;

            // 1. Update Profile (Global Auth)
            updateUser(updatedProfile);

            // 2. Update Local Stats
            setStats(updatedStats);
            setTodayAttendance(todayAtt);
            if (systemConfig) setConfig(systemConfig);

            // 3. Show check-in modal if not marked for today
            if (!todayAtt && !silent) {
                setShowCheckInModal(true);
            } else if (todayAtt && todayAtt.status === 'ABSENT') {
                // If marked absent, we might want to still show dashboard but with a banner
                setShowCheckInModal(false);
            } else {
                setShowCheckInModal(false);
            }

            // 4. Update Unread Count
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

    // Periodically sync data and force re-render for time-based 'AUTO' transitions (every 5 seconds)
    const [, setTick] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            setTick(t => t + 1);
            refreshData(true); // Silent sync
        }, 5000);
        return () => clearInterval(interval);
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
        'class:updated': () => refreshData(true),
        'system:config_updated': (data: any) => {
            if (data.key === 'attendance_override') {
                setConfig(prev => ({ ...prev, attendance_override: data.value }));
            }
        }
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

    /**
     * Records the teacher's check-in status (Present/Absent) for the current day.
     */
    const handleCheckIn = async (data: { status: string, reason?: string }) => {
        setIsSubmittingAttendance(true);
        try {
            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            
            await api.post('/attendance/teacher', {
                status: data.status,
                arrivalTime: data.status === 'PRESENT' ? timeStr : null,
                reason: data.status === 'ABSENT' ? data.reason : null,
                date: new Date().toLocaleDateString('en-CA')
            });
            await refreshData(true);
            setShowCheckInModal(false);
        } catch (error) {
            console.error('Check-in failed:', error);
            alert('Failed to submit attendance. Please try again.');
        } finally {
            setIsSubmittingAttendance(false);
        }
    };

    const handleClockOut = async (earlyLeaveReason?: string) => {
        setIsSubmittingAttendance(true);
        try {
            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            await api.post('/attendance/teacher', {
                departureTime: timeStr,
                earlyLeaveReason,
                date: new Date().toLocaleDateString('en-CA')
            });
            await refreshData(true);
            setShowClockOutModal(false);
        } catch (error) {
            console.error('Clock-out failed:', error);
            alert('Failed to log departure.');
        } finally {
            setIsSubmittingAttendance(false);
        }
    };

    const navItems = [
        { path: '/teacher/dashboard', icon: <LayoutDashboard size={20} />, label: 'Overview' },
        { 
            path: '/teacher/attendance', 
            icon: <ClipboardCheck size={20} />, 
            label: 'Attendance',
            disabled: !isAttendanceOpen(config.attendance_override)
        },
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
                    {navItems.map((item: any) => {
                        const content = (
                            <>
                                {item.icon}
                                <span>{item.label} {item.disabled && <span style={{ fontSize: '0.6rem', color: 'var(--warning-bold)', marginLeft: '4px' }}>(Closed)</span>}</span>
                            </>
                        );

                        if (item.disabled) {
                            return (
                                <div
                                    key={item.path}
                                    className="nav-item disabled"
                                    style={{ 
                                        opacity: 0.5, 
                                        cursor: 'not-allowed', 
                                        userSelect: 'none',
                                        pointerEvents: 'none'
                                    }}
                                >
                                    {content}
                                </div>
                            );
                        }

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }: { isActive: boolean }) => `nav-item ${isActive ? 'active' : ''}`}
                                onClick={closeSidebar}
                            >
                                {content}
                            </NavLink>
                        );
                    })}
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

                        {/* Attendance Quick Control */}
                        {todayAttendance && todayAttendance.status === 'PRESENT' && !todayAttendance.departureTime && (
                            <button
                                onClick={() => setShowClockOutModal(true)}
                                className="btn-primary"
                                style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--warning-bold)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                            >
                                <LogOut size={16} />
                                Clock Out
                            </button>
                        )}
                        {todayAttendance && todayAttendance.departureTime && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Clock size={14} />
                                Day Ended: {todayAttendance.departureTime}
                            </div>
                        )}

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
                                todayAttendance={todayAttendance}
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

            {/* Attendance Lock Modal */}
            {showCheckInModal && (
                <CheckInModal
                    onCheckIn={handleCheckIn}
                    isSubmitting={isSubmittingAttendance}
                />
            )}

            {/* Clock Out Modal */}
            {showClockOutModal && (
                <ClockOutModal
                    onClockOut={handleClockOut}
                    onCancel={() => setShowClockOutModal(false)}
                    isSubmitting={isSubmittingAttendance}
                />
            )}
        </div>
    );
};

export default TeacherDashboard;
