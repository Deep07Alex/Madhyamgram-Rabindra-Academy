import { useState, useEffect, useCallback } from 'react';
import { useNavigate, NavLink, Routes, Route, Navigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { logout } from '../services/authService';
import TeacherAttendance from '../components/teacher/TeacherAttendance';
import TeacherHomework from '../components/teacher/TeacherHomework';
import NoticeBoard from '../components/common/NoticeBoard';
import LiveClock from '../components/common/LiveClock';
import ThemeToggle from '../components/common/ThemeToggle';
import useServerEvents from '../hooks/useServerEvents';
import {
    LayoutDashboard,
    ClipboardCheck,
    BookType,
    LogOut,
    Menu,
    X,
    BellRing,
    UserCircle,
    Phone,
    Fingerprint,
    MapPin,
    GraduationCap,
    Eye,
    EyeOff
} from 'lucide-react';
import { socket } from '../services/socket';

const TeacherDashboard = () => {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [stats, setStats] = useState({
        assignedClasses: 0,
        pendingSubmissions: 0,
        attendanceRate: 0
    });
    const [unreadCount, setUnreadCount] = useState(0);
    const [notices, setNotices] = useState<any[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [showFullAadhar, setShowFullAadhar] = useState(false);
    const userJson = localStorage.getItem('user');
    let initialUser = null;
    try {
        initialUser = userJson && userJson !== 'undefined' ? JSON.parse(userJson) : null;
    } catch (e) {
        localStorage.removeItem('user');
    }

    const fetchStats = useCallback(async () => {
        try {
            const res = await api.get('/dashboard/stats');
            setStats(res.data);
        } catch (error: any) {
            console.error('Failed to fetch stats:', error);
            const msg = error.response?.data?.message || 'Failed to load stats.';
            showToast(msg, 'error');
        }
    }, [showToast]);

    const fetchProfile = useCallback(async () => {
        try {
            const res = await api.get('/auth/me');
            setProfile(res.data);
            // Sync with localStorage
            localStorage.setItem('user', JSON.stringify(res.data));
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        }
    }, []);

    const fetchNotices = useCallback(async () => {
        try {
            const res = await api.get('/notices');
            setNotices(res.data);
            const lastChecked = localStorage.getItem('teacher_last_checked_notices') || '0';
            const unread = res.data.filter((n: any) => new Date(n.createdAt).getTime() > parseInt(lastChecked));
            setUnreadCount(unread.length);
        } catch (error: any) {
            console.error('Failed to fetch notices:', error);
            const msg = error.response?.data?.message || 'Failed to load notices.';
            showToast(msg, 'error');
        }
    }, [showToast]);

    useEffect(() => {
        fetchStats();
        fetchNotices();
        fetchProfile();
        
        // Socket.io - Real-time updates
        if (initialUser?.id) {
            socket.emit('join_room', `teacher:${initialUser.id}`);
        }

        socket.on('profile_updated', () => {
            fetchProfile();
            fetchNotices();
            fetchStats();
        });

        socket.on('new_notice', () => {
            fetchNotices();
        });

        socket.on('homework_submitted', () => {
             fetchStats();
        });

        return () => {
            socket.off('new_notice');
            socket.off('homework_submitted');
        };
    }, [initialUser?.id, fetchStats, fetchNotices]);

    // Live events (SSE)
    useServerEvents({
        'attendance:updated': fetchStats,
        'homework_submitted': fetchStats,
        'homework_created': fetchStats,
        'homework_deleted': fetchStats
    });

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);

    const navItems = [
        { path: '/teacher/dashboard', icon: <LayoutDashboard size={20} />, label: 'Overview' },
        { path: '/teacher/attendance', icon: <ClipboardCheck size={20} />, label: 'Student Attendance' },
        { path: '/teacher/homework', icon: <BookType size={20} />, label: 'Assignments' },
        { path: '/teacher/notices', icon: <BellRing size={20} />, label: 'Notices' },
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
                        <span style={{ fontSize: '0.65rem', fontWeight: '600', color: 'var(--text-muted)', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>Faculty Excellence</span>
                    </div>
                </div>

                <div className="sidebar-user-info" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="user-name" style={{ fontSize: '0.9rem', fontWeight: '800' }}>{profile?.name || initialUser?.name}</span>
                        <span className="user-id" style={{ fontSize: '0.7rem' }}>ID: {profile?.teacherId || initialUser?.teacherId}</span>
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
                                if (item.path === '/teacher/notices') {
                                    localStorage.setItem('teacher_last_checked_notices', Date.now().toString());
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
                        <h2>Welcome, Professor {(profile?.name || initialUser?.name || 'Teacher')?.split(' ')[0]}</h2>
                        <p style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Manage your classroom and academic excellence.</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div className="hide-on-mobile">
                            <LiveClock />
                        </div>
                        <ThemeToggle />
                        <div style={{ position: 'relative' }}>
                            <button 
                                onClick={() => {
                                    localStorage.setItem('teacher_last_checked_notices', Date.now().toString());
                                    setUnreadCount(0);
                                    navigate('/teacher/notices');
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
                        <div className="teacher-info-pill hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-card)', padding: '6px 16px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-soft)' }}>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '0.85rem', fontWeight: '700', margin: 0 }}>{profile?.name || initialUser?.name} <span style={{ opacity: 0.5, fontWeight: '500', marginLeft: '4px' }}>({profile?.teacherId || initialUser?.teacherId})</span></p>
                                <p style={{ fontSize: '0.65rem', fontWeight: '600', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase' }}>{profile?.designation || initialUser?.designation}</p>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="page-view">
                    <Routes>
                        <Route path="dashboard" element={
                            <>
                                {notices.length > 0 && (
                                    <div 
                                        onClick={() => {
                                            localStorage.setItem('teacher_last_checked_notices', Date.now().toString());
                                            setUnreadCount(0);
                                            navigate('/teacher/notices');
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
                                                Important Faculty Announcements
                                            </h4>
                                            <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.85rem', opacity: 0.8 }}>
                                                There are {notices.length} active update{notices.length > 1 ? 's' : ''} in the notice board.
                                            </p>
                                        </div>
                                        <div style={{ marginLeft: 'auto', fontWeight: '700', color: 'var(--primary-bold)', fontSize: '0.85rem' }}>
                                            Review Now →
                                        </div>
                                    </div>
                                )}
                                <div className="stats-grid">
                                    <div className="stat-card">
                                        <h3>{stats.assignedClasses}</h3>
                                        <p>Assigned Classes</p>
                                    </div>
                                    <div className="stat-card" style={{ borderLeftColor: 'var(--success)' }}>
                                        <h3>{stats.attendanceRate}%</h3>
                                        <p>Class Attendance</p>
                                    </div>
                                    <div className="stat-card" style={{ borderLeftColor: 'var(--accent)' }}>
                                        <h3>{stats.pendingSubmissions}</h3>
                                        <p>Pending Submissions</p>
                                    </div>
                                </div>

                                {/* Profile Summary Card */}
                                {(profile || initialUser) && (
                                    <div className="card" style={{ marginTop: '32px', padding: '32px', borderRadius: '24px', background: 'var(--bg-card)', border: '1px solid var(--border-soft)', boxShadow: 'var(--shadow-md)', position: 'relative', overflow: 'hidden' }}>
                                        <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '200px', background: 'var(--primary-soft)', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.3, zIndex: 0 }}></div>
                                        
                                        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                                            <div style={{ flex: '0 0 160px' }}>
                                                <div style={{ width: '160px', height: '160px', borderRadius: '20px', overflow: 'hidden', border: '4px solid var(--bg-main)', boxShadow: 'var(--shadow-lg)' }}>
                                                    {(profile?.photo || initialUser?.photo) ? (
                                                        <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${profile?.photo || initialUser?.photo}`} alt="Dashboard Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
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
                                                        <h3 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', color: 'var(--text-main)' }}>{profile?.name || initialUser?.name}</h3>
                                                        <p style={{ margin: '4px 0 0 0', fontSize: '1rem', fontWeight: '700', color: 'var(--primary-bold)', textTransform: 'uppercase' }}>{profile?.designation || initialUser?.designation}</p>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>MEMBER SINCE</p>
                                                        <p style={{ margin: 0, fontWeight: '800', color: 'var(--text-main)' }}>{new Date(profile?.joiningDate || initialUser?.joiningDate).getFullYear()}</p>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '24px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}><Phone size={18} /></div>
                                                        <div>
                                                            <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)' }}>PHONE</p>
                                                            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>{profile?.phone || initialUser?.phone || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}><Fingerprint size={18} /></div>
                                                        <div>
                                                            <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)' }}>AADHAR</p>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>
                                                                    {profile?.aadhar 
                                                                        ? (showFullAadhar ? profile.aadhar : `XXXX XXXX ${profile.aadhar.slice(-4)}`) 
                                                                        : 'N/A'
                                                                    }
                                                                </p>
                                                                {profile?.aadhar && (
                                                                    <button 
                                                                        onClick={() => setShowFullAadhar(!showFullAadhar)}
                                                                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', opacity: 0.7 }}
                                                                        title={showFullAadhar ? "Hide" : "Show"}
                                                                    >
                                                                        {showFullAadhar ? <Eye size={14} /> : <EyeOff size={14} />}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}><MapPin size={18} /></div>
                                                        <div>
                                                            <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)' }}>LOCATION</p>
                                                            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.address || initialUser?.address || 'India'}</p>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}><GraduationCap size={18} /></div>
                                                        <div>
                                                            <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)' }}>QUALIFICATION</p>
                                                            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>{profile?.qualification || initialUser?.qualification || 'Graduate'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        } />
                        <Route path="attendance" element={<TeacherAttendance />} />
                        <Route path="homework" element={<TeacherHomework />} />
                        <Route path="notices" element={<NoticeBoard />} />
                        <Route path="/" element={<Navigate to="/teacher/dashboard" />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
};

export default TeacherDashboard;
