import { useState, useEffect } from 'react';
import { useNavigate, NavLink, Routes, Route, Navigate } from 'react-router-dom';
import api from '../services/api';
import { logout } from '../services/authService';
import TeacherAttendance from '../components/teacher/TeacherAttendance';
import TeacherHomework from '../components/teacher/TeacherHomework';
import NoticeBoard from '../components/common/NoticeBoard';
import LiveClock from '../components/common/LiveClock';
import ThemeToggle from '../components/common/ThemeToggle';
import {
    LayoutDashboard,
    ClipboardCheck,
    BookType,
    LogOut,
    Menu,
    X,
    BellRing,
    UserCircle
} from 'lucide-react';

const TeacherDashboard = () => {
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [stats, setStats] = useState({
        assignedClasses: 0,
        pendingSubmissions: 0,
        attendanceRate: 0
    });
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/dashboard/stats');
                setStats(res.data);
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 30000); // Polling every 30s
        return () => clearInterval(interval);
    }, []);

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
                        <span style={{ fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', opacity: 0.8, color: 'var(--text-main)', lineHeight: 1 }}>Madhyamgram</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: '1000', textTransform: 'uppercase', color: '#5d1717', letterSpacing: '0.02em' }}>Rabindra Academy</span>
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
                        <span style={{ fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', opacity: 0.8, color: 'var(--text-main)', lineHeight: 1 }}>Madhyamgram</span>
                        <span style={{ fontSize: '1.3rem', fontWeight: '1000', textTransform: 'uppercase', color: '#5d1717' }}>Rabindra Academy</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: '600', color: 'var(--text-muted)', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>Faculty Excellence</span>
                    </div>
                </div>

                <div className="sidebar-user-info">
                    <span className="user-name">{user?.name}</span>
                    <span className="user-id">ID: {user?.teacherId}</span>
                    <span className="user-role">Faculty Member</span>
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

            {/* Main Content */}
            <main className="dashboard-content">
                <header className="content-header" style={{ animation: 'slideInRight 0.4s ease-out' }}>
                    <div>
                        <h2>Welcome, Professor {user?.name?.split(' ')[0]}</h2>
                        <p style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Manage your classroom and academic excellence.</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div className="hide-on-mobile">
                            <LiveClock />
                        </div>
                        <ThemeToggle />
                        <button 
                            onClick={() => navigate('/teacher/notices')}
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)', padding: '10px', borderRadius: '50%', cursor: 'pointer', color: 'var(--primary-bold)' }}
                        >
                            <BellRing size={20} />
                        </button>
                        <div className="teacher-info-pill hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-card)', padding: '6px 16px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-soft)' }}>
                            <UserCircle size={28} color="var(--primary-bold)" />
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '0.85rem', fontWeight: '700', margin: 0 }}>{user?.name} <span style={{ opacity: 0.5, fontWeight: '500', marginLeft: '4px' }}>({user?.teacherId})</span></p>
                                <p style={{ fontSize: '0.65rem', fontWeight: '600', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase' }}>Faculty Member</p>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="page-view">
                    <Routes>
                        <Route path="dashboard" element={
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
