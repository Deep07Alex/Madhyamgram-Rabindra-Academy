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
    Clock,
    AlertCircle
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
        try {
            const res = await api.get('/dashboard/unified');
            const {
                profile: updatedProfile,
                stats: updatedStats,
                notices: noticeList,
                todayAttendance: todayAtt,
                config: systemConfig
            } = res.data;

            updateUser(updatedProfile);
            setStats(updatedStats);
            setTodayAttendance(todayAtt);
            if (systemConfig) setConfig(systemConfig);

            // 3. Conditional Modals (Teacher specific business rules)
            const now = new Date();
            const hour = now.getHours();
            const minute = now.getMinutes();

            const totalMinutes = hour * 60 + minute;
            const checkOutStart = 15 * 60; // 3:00 PM
            const checkOutEnd = 15 * 60 + 20; // 3:20 PM

            if (!todayAtt) {
                if (!silent && hour >= 9 && hour < 11) {
                    setShowCheckInModal(true);
                } else {
                    setShowCheckInModal(false);
                }
            } else if (todayAtt && todayAtt.status === 'PRESENT' && !todayAtt.departureTime) {
                // Show clock-out modal ONLY between 3:00 PM and 3:20 PM
                if (totalMinutes >= checkOutStart && totalMinutes < checkOutEnd) {
                    setShowClockOutModal(true);
                } else {
                    setShowClockOutModal(false);
                }
            } else {
                setShowCheckInModal(false);
                setShowClockOutModal(false);
            }

            const lastChecked = localStorage.getItem('teacher_last_checked_notices') || '0';
            const unread = noticeList.filter((n: any) => new Date(n.createdAt).getTime() > parseInt(lastChecked));
            setUnreadCount(unread.length);

        } catch (error: any) {
            console.error('Teacher Unified Refresh Failed:', error);
            if (error.response?.status === 401) authLogout();
        }
    }, [updateUser, authLogout]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    useEffect(() => {
        const interval = setInterval(() => {
            refreshData(true);
        }, 3000);
        return () => clearInterval(interval);
    }, [refreshData]);

    const { pathname } = useLocation();
    useEffect(() => {
        if (pathname === '/teacher/notices' && unreadCount > 0) {
            localStorage.setItem('teacher_last_checked_notices', Date.now().toString());
            setUnreadCount(0);
        }
    }, [pathname, unreadCount]);

    useServerEvents({
        'focus': () => refreshData(true),
        'attendance:updated': () => refreshData(true),
        'new_notice': () => refreshData(true),
        'system:config_updated': (data: any) => {
            if (data.key === 'attendance_override') {
                setConfig(prev => ({ ...prev, attendance_override: data.value }));
            }
        }
    });

    const handleLogout = () => { authLogout(); navigate('/'); };
    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);

    const handleCheckIn = async (data: any) => {
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
            alert('Failed to submit attendance.');
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
            disabled: !isAttendanceOpen(config.attendance_override) && !((new Date().getHours() >= 9 && new Date().getHours() < 11))
        },
        { path: '/teacher/homework', icon: <BookType size={20} />, label: 'Assignments' },
        { path: '/teacher/notices', icon: <BellRing size={20} />, label: 'Notices' },
    ];

    return (
        <div className="dashboard-layout">
            <header className="mobile-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src="/RABINDRA_LOGO.jpeg" alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--nav-text)' }}>Madhyamgram Rabindra Academy</span>
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
                <button onClick={handleLogout} className="logout-btn"><LogOut size={20} /><span>Log Out</span></button>
            </aside>

            <main className="dashboard-content">
                <header className="content-header">
                    <div>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, margin: 0, color: 'var(--text-main)' }}>Hello, {user?.name?.split(' ')[0]}!</h1>
                        <p style={{ color: 'var(--text-muted)' }}>Manage classroom excellence.</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div className="hide-on-mobile"><LiveClock /></div>

                        {/* Attendance Lock Status */}
                        {todayAttendance && todayAttendance.status === 'PRESENT' && !todayAttendance.departureTime && (
                            (new Date().getHours() * 60 + new Date().getMinutes() < (15 * 60 + 20)) ? (
                                <button onClick={() => setShowClockOutModal(true)} className="btn-primary" style={{ background: 'var(--warning-bold)', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <LogOut size={16} /> Check Out
                                </button>
                            ) : (
                                <div style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(var(--error-rgb), 0.1)', color: 'var(--error)', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <AlertCircle size={16} /> Not Checked Out
                                </div>
                            )
                        )}

                        {todayAttendance?.departureTime && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}><Clock size={14} /> Day Ended: {todayAttendance.departureTime}</div>
                        )}
                        <ThemeToggle />
                        <div style={{ position: 'relative' }} onClick={() => navigate('/teacher/notices')}>
                            <Bell size={22} color="var(--primary-bold)" />
                            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                        </div>
                    </div>
                </header>
                <div className="page-view">
                    <Routes>
                        <Route path="dashboard" element={<TeacherOverview user={user} profile={user} stats={stats} todayAttendance={todayAttendance} unreadCount={unreadCount} onClearNotices={() => setUnreadCount(0)} />} />
                        <Route path="attendance" element={<TeacherAttendance />} />
                        <Route path="homework" element={<TeacherHomework />} />
                        <Route path="notices" element={<NoticeBoard />} />
                        <Route path="/" element={<Navigate to="/teacher/dashboard" />} />
                    </Routes>
                </div>
            </main>

            {showCheckInModal && <CheckInModal onCheckIn={handleCheckIn} isSubmitting={isSubmittingAttendance} />}
            {showClockOutModal && <ClockOutModal onClockOut={handleClockOut} onCancel={() => setShowClockOutModal(false)} isSubmitting={isSubmittingAttendance} />}
        </div>
    );
};

export default TeacherDashboard;
