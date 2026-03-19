import { useState, useEffect, useCallback } from 'react';
import { useNavigate, NavLink, Routes, Route, Navigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { logout } from '../services/authService';
import StudentAttendance from '../components/student/StudentAttendance';
import StudentFees from '../components/student/StudentFees';
import StudentHomework from '../components/student/StudentHomework';
import StudentResults from '../components/student/StudentResults';
import AssignmentBanner from '../components/student/AssignmentBanner';
import NoticeBoard from '../components/common/NoticeBoard';
import LiveClock from '../components/common/LiveClock';
import ThemeToggle from '../components/common/ThemeToggle';
import useServerEvents from '../hooks/useServerEvents';
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
    UserCircle,
    Hash,
    Fingerprint,
    Calendar,
    IdCard
} from 'lucide-react';
import { socket } from '../services/socket';

// Sub-component to fetch and display the class name from classId
const StudentClassDisplay = ({ classId }: { classId?: string }) => {
    const [className, setClassName] = useState('—');
    useEffect(() => {
        if (!classId) return;
        api.get('/users/classes').then(res => {
            const cls = res.data.find((c: any) => c.id === classId);
            if (cls) setClassName(cls.name);
        }).catch(() => { });
    }, [classId]);
    return <p style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>{className}</p>;
};

const StudentDashboard = () => {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [stats, setStats] = useState({
        attendanceRate: 0,
        averageGrade: 0,
        activeSubjects: 0
    });
    const [unreadCount, setUnreadCount] = useState(0);
    const [notices, setNotices] = useState<any[]>([]);
    const [pendingAssignments, setPendingAssignments] = useState<any[]>([]);
    const [user, setUser] = useState<any>(() => {
        const userJson = localStorage.getItem('user');
        let initialUser = null;
        try {
            initialUser = userJson && userJson !== 'undefined' ? JSON.parse(userJson) : null;
        } catch (e) {
            localStorage.removeItem('user');
        }
        return initialUser;
    });

    const fetchProfile = useCallback(async () => {
        try {
            const res = await api.get('/auth/me');
            const freshUser = res.data;
            setUser(freshUser);
            localStorage.setItem('user', JSON.stringify(freshUser));

            // Join rooms if ID changed or just joining for the first time
            if (freshUser.id) {
                socket.emit('join_room', `student:${freshUser.id}`);
                if (freshUser.classId) socket.emit('join_room', `class:${freshUser.classId}`);
            }
        } catch (error: any) {
            console.error('Failed to fetch profile:', error);
            const msg = error.response?.data?.message || 'Failed to load student data.';
            showToast(msg, 'error');
        }
    }, []);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

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
    }, [showToast]);

    const fetchAssignments = useCallback(async () => {
        try {
            const res = await api.get('/homework');
            // Filter unsubmitted assignments
            const pending = res.data.filter((hw: any) => !hw.submissions || hw.submissions.length === 0);
            setPendingAssignments(pending);
        } catch (error) {
            console.error('Failed to fetch pending assignments:', error);
        }
    }, []);

    useEffect(() => {
        fetchStats();
        fetchNotices();
        fetchAssignments();
    }, [fetchStats, fetchNotices, fetchAssignments]);

    // Live updates
    useServerEvents({
        'attendance:updated': fetchStats,
        'homework_created': fetchAssignments,
        'homework_submitted': (data: any) => {
            if (data?.homeworkId) {
                setPendingAssignments(prev => prev.filter(hw => hw.id !== data.homeworkId));
            }
            fetchAssignments();
        },
        'homework_deleted': (data: any) => {
            if (data?.id) {
                setPendingAssignments(prev => prev.filter(hw => hw.id !== data.id));
            }
            fetchAssignments();
        }
    });

    useEffect(() => {
        const statsInterval = setInterval(fetchStats, 30000); // Polling every 30s
        const noticesInterval = setInterval(fetchNotices, 60000); // Polling every 1m

        // Socket.io - Real-time updates
        if (user?.id) {
            socket.emit('join_room', `student:${user.id}`);
            if (user?.classId) socket.emit('join_room', `class:${user.classId}`);
        }

        socket.on('new_notice', () => {
            fetchNotices();
        });

        socket.on('result_published', () => {
            fetchStats();
        });

        socket.on('fee_generated', () => {
            fetchStats();
        });

        socket.on('profile_updated', () => {
            fetchProfile();
        });

        socket.on('attendance_update', () => {
            fetchStats();
        });

        socket.on('homework_created', () => {
            fetchAssignments();
            showToast('New academic assignment received!', 'info');
        });

        socket.on('homework_submitted', (data: any) => {
            if (data?.homeworkId) {
                setPendingAssignments(prev => prev.filter(hw => hw.id !== data.homeworkId));
            }
            fetchAssignments();
        });

        socket.on('homework_deleted', (data: any) => {
            if (data?.id) {
                setPendingAssignments(prev => prev.filter(hw => hw.id !== data.id));
            }
            fetchAssignments();
        });

        return () => {
            clearInterval(statsInterval);
            clearInterval(noticesInterval);
            socket.off('new_notice');
            socket.off('result_published');
            socket.off('fee_created');
            socket.off('profile_updated');
            socket.off('attendance_marked');
            socket.off('homework_created');
            socket.off('homework_submitted');
            socket.off('homework_deleted');
        };
    }, [user?.id, user?.classId]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);

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
            {/* Mobile Header */}
            <header className="mobile-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src="/RABINDRA_LOGO.jpeg" alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid var(--border-soft)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.6rem', fontWeight: '900', textTransform: 'uppercase', color: 'var(--nav-text)', lineHeight: 1 }}>Madhyamgram</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: '1000', textTransform: 'uppercase', color: 'var(--nav-text)', letterSpacing: '0.02em' }}>Rabindra Academy</span>
                        <div style={{ display: 'flex', gap: '6px', fontSize: '0.45rem', fontWeight: '800', color: 'var(--nav-text)' }}>
                            <span>UDISE: 19112601311</span>
                            <span>ESTD: 2005</span>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ThemeToggle />
                    <button onClick={toggleSidebar} style={{ background: 'none', border: 'none', color: 'var(--text-main)' }}>
                        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </header>

            {/* Sidebar Overlay */}
            <div className={`sidebar-overlay ${isSidebarOpen ? 'show' : ''}`} onClick={closeSidebar}></div>

            {/* Sidebar */}
            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header" style={{ paddingBottom: '40px', borderBottom: '1px solid rgba(0,0,0,0.05)', marginBottom: '24px', position: 'relative' }}>
                    <button
                        className="sidebar-close-btn"
                        onClick={closeSidebar}
                        style={{
                            position: 'absolute',
                            top: '-10px',
                            right: '0',
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-main)',
                            cursor: 'pointer',
                            display: 'none'
                        }}
                    >
                        <X size={24} />
                    </button>
                    <img src="/RABINDRA_LOGO.jpeg" alt="Logo" style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid var(--border-soft)', padding: '2px', background: 'var(--primary-soft)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase', color: 'var(--nav-text)', lineHeight: 1 }}>Madhyamgram</span>
                        <span style={{ fontSize: '1.3rem', fontWeight: '1000', textTransform: 'uppercase', color: 'var(--nav-text)' }}>Rabindra Academy</span>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '0.55rem', fontWeight: '800', color: 'var(--nav-text)', marginTop: '2px' }}>
                            <span>UDISE: 19112601311</span>
                            <span>ESTD: 2005</span>
                        </div>
                        <span style={{ fontSize: '0.65rem', fontWeight: '600', color: 'var(--text-muted)', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>Student Learning Hub</span>
                    </div>
                </div>

                <div className="sidebar-user-info" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <span className="user-name" style={{ fontSize: '0.9rem', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</span>
                        <span className="user-id" style={{ fontSize: '0.7rem' }}>ID: {user?.studentId}</span>
                        <span className="user-role" style={{ fontSize: '0.65rem' }}>Enrolled Student</span>
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
                                if (item.path === '/student/notices') {
                                    localStorage.setItem('student_last_checked_notices', Date.now().toString());
                                    setUnreadCount(0);
                                }
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

            {/* Main Content */}
            <main className="dashboard-content">
                <header className="content-header" style={{ animation: 'slideInRight 0.4s ease-out' }}>
                    <div>
                        <h2>Hello, {user?.name?.split(' ')[0]}!</h2>
                        <p style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Track your academic progress and assignments.</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div className="hide-on-mobile">
                            <LiveClock />
                        </div>
                        <ThemeToggle />
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => {
                                    localStorage.setItem('student_last_checked_notices', Date.now().toString());
                                    setUnreadCount(0);
                                    navigate('/student/notices');
                                }}
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)', padding: '10px', borderRadius: '50%', cursor: 'pointer', color: 'var(--primary-bold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <BellRing size={20} />
                            </button>
                            {unreadCount > 0 && (
                                <span style={{
                                    position: 'absolute',
                                    top: '-4px',
                                    right: '-4px',
                                    background: '#ef4444',
                                    color: 'white',
                                    fontSize: '0.65rem',
                                    fontWeight: '800',
                                    padding: '2px 6px',
                                    borderRadius: '10px',
                                    border: '2px solid var(--bg-main)',
                                    minWidth: '20px',
                                    textAlign: 'center'
                                }}>
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        <div className="student-info-pill hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-card)', padding: '6px 16px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-soft)' }}>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '0.85rem', fontWeight: '700', margin: 0 }}>{user?.name} <span style={{ opacity: 0.5, fontWeight: '500', marginLeft: '4px' }}>({user?.studentId})</span></p>
                                <p style={{ fontSize: '0.65rem', fontWeight: '600', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase' }}>Enrolled Student</p>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="page-view">
                    <Routes>
                        <Route path="dashboard" element={
                            <>
                                <div className="card" style={{
                                    marginTop: '8px',
                                    padding: '32px',
                                    borderRadius: '24px',
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border-soft)',
                                    boxShadow: 'var(--shadow-md)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    marginBottom: '32px'
                                }}>
                                    <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '200px', background: 'var(--primary-soft)', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.3, zIndex: 0 }}></div>

                                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'center' }}>
                                        <div style={{ flex: '0 0 160px' }}>
                                            <div style={{ width: '160px', height: '160px', borderRadius: '20px', overflow: 'hidden', border: '4px solid var(--bg-main)', boxShadow: 'var(--shadow-lg)' }}>
                                                {user?.photo ? (
                                                    <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${user.photo}`} alt="Student Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <UserCircle size={100} color="var(--primary-bold)" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ flex: '1', minWidth: '300px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                                <div>
                                                    <h3 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', color: 'var(--text-main)' }}>{user?.name || '—'}</h3>
                                                    <p style={{ margin: '4px 0 0 0', fontSize: '1rem', fontWeight: '700', color: 'var(--primary-bold)', textTransform: 'uppercase' }}>Enrolled Student</p>
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginTop: '24px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}><IdCard size={18} /></div>
                                                    <div>
                                                        <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)' }}>REGISTRATION ID</p>
                                                        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', fontFamily: 'monospace' }}>{user?.studentId || '—'}</p>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}><Hash size={18} /></div>
                                                    <div>
                                                        <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)' }}>ROLL NUMBER</p>
                                                        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>{user?.rollNumber || '—'}</p>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}><GraduationCap size={18} /></div>
                                                    <div>
                                                        <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)' }}>CLASS</p>
                                                        <div style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}><StudentClassDisplay classId={user?.classId} /></div>
                                                    </div>
                                                </div>
                                                {user?.banglarSikkhaId && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}><Fingerprint size={18} /></div>
                                                        <div>
                                                            <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)' }}>BANGLAR SIKKHA ID</p>
                                                            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>{user.banglarSikkhaId}</p>
                                                        </div>
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}><Calendar size={18} /></div>
                                                    <div>
                                                        <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)' }}>ACADEMIC YEAR</p>
                                                        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>{new Date().getFullYear()}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {pendingAssignments.length > 0 && (
                                    <div style={{ marginBottom: '32px' }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <BookOpenCheck size={20} color="var(--primary-bold)" /> Active Assignments
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {pendingAssignments.map(hw => (
                                                <AssignmentBanner key={hw.id} assignment={hw} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {notices.length > 0 && (
                                    <div
                                        onClick={() => {
                                            localStorage.setItem('student_last_checked_notices', Date.now().toString());
                                            setUnreadCount(0);
                                            navigate('/student/notices');
                                        }}
                                        style={{
                                            background: 'var(--primary-soft)',
                                            border: '1px solid var(--primary-bold)',
                                            borderRadius: 'var(--radius-lg)',
                                            padding: '16px 24px',
                                            marginBottom: '24px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '16px',
                                            animation: 'pulse-subtle 2s infinite',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            background: '#ef4444',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)'
                                        }}>
                                            <BellRing size={20} />
                                        </div>
                                        <div>
                                            <h4 style={{ margin: 0, color: 'var(--primary-bold)', fontSize: '1rem', fontWeight: '800' }}>
                                                Important Announcements!
                                            </h4>
                                            <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.85rem', opacity: 0.8 }}>
                                                You have {notices.length} active notice{notices.length > 1 ? 's' : ''} in your notice board.
                                            </p>
                                        </div>
                                        <div style={{ marginLeft: 'auto', fontWeight: '700', color: 'var(--primary-bold)', fontSize: '0.85rem' }}>
                                            View Notices →
                                        </div>
                                    </div>
                                )}

                                <div className="stats-grid">
                                    <div className="stat-card">
                                        <h3>{stats.averageGrade}%</h3>
                                        <p>Overall Grade</p>
                                    </div>
                                    <div className="stat-card" style={{ borderLeftColor: 'var(--success)' }}>
                                        <h3>{stats.attendanceRate}%</h3>
                                        <p>Attendance Rate</p>
                                    </div>
                                    <div className="stat-card" style={{ borderLeftColor: 'var(--accent)' }}>
                                        <h3>{stats.activeSubjects}</h3>
                                        <p>Course Modules</p>
                                    </div>
                                </div>
                            </>
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
