import { useState, useEffect } from 'react';
import { useNavigate, NavLink, Routes, Route, Navigate } from 'react-router-dom';
import api from '../services/api';
import { logout } from '../services/authService';
import StudentAttendance from '../components/student/StudentAttendance';
import StudentFees from '../components/student/StudentFees';
import StudentHomework from '../components/student/StudentHomework';
import StudentResults from '../components/student/StudentResults';
import LiveClock from '../components/common/LiveClock';
import {
    LayoutDashboard,
    CalendarCheck,
    Wallet,
    BookOpenCheck,
    GraduationCap,
    LogOut,
    Menu,
    X,
    Bell,
    UserCircle
} from 'lucide-react';

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
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [stats, setStats] = useState({
        attendanceRate: 0,
        averageGrade: 0,
        activeSubjects: 0
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
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);

    const navItems = [
        { path: '/student/dashboard', icon: <LayoutDashboard size={20} />, label: 'Overview' },
        { path: '/student/attendance', icon: <CalendarCheck size={20} />, label: 'My Attendance' },
        { path: '/student/fees', icon: <Wallet size={20} />, label: 'Fee Portal' },
        { path: '/student/homework', icon: <BookOpenCheck size={20} />, label: 'Class Tasks' },
        { path: '/student/results', icon: <GraduationCap size={20} />, label: 'My Academic Record' },
    ];

    return (
        <div className="dashboard-layout">
            {/* Mobile Header */}
            <header className="mobile-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src="/RABINDRA_LOGO.jpeg" alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid rgba(0,0,0,0.1)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', opacity: 0.8, color: '#1e293b', lineHeight: 1 }}>Madhyamgram</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: '1000', textTransform: 'uppercase', color: '#5d1717', letterSpacing: '0.02em' }}>Rabindra Academy</span>
                    </div>
                </div>
                <button onClick={toggleSidebar} style={{ background: 'none', border: 'none', color: '#1e293b' }}>
                    {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
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
                            color: '#1e293b',
                            cursor: 'pointer',
                            display: 'none'
                        }}
                    >
                        <X size={24} />
                    </button>
                    <img src="/RABINDRA_LOGO.jpeg" alt="Logo" style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid rgba(0,0,0,0.1)', padding: '2px', background: 'white' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', opacity: 0.8, color: '#1e293b', lineHeight: 1 }}>Madhyamgram</span>
                        <span style={{ fontSize: '1.3rem', fontWeight: '1000', textTransform: 'uppercase', color: '#5d1717' }}>Rabindra Academy</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: '600', color: '#1e293b', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>Student Learning Hub</span>
                    </div>
                </div>

                <div className="sidebar-user-info">
                    <span className="user-name">{user?.name}</span>
                    <span className="user-id">ID: {user?.studentId}</span>
                    <span className="user-role">Enrolled Student</span>
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
                        <h2>Hello, {user?.name?.split(' ')[0]}!</h2>
                        <p style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Track your academic progress and assignments.</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div className="hide-on-mobile">
                            <LiveClock />
                        </div>
                        <button style={{ background: 'white', border: '1px solid var(--border-soft)', padding: '10px', borderRadius: '50%', cursor: 'pointer', color: 'var(--text-muted)' }}>
                            <Bell size={20} />
                        </button>
                        <div className="student-info-pill hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'white', padding: '6px 16px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-soft)' }}>
                            <UserCircle size={28} color="var(--primary-bold)" />
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
                                <div style={{
                                    background: 'white',
                                    borderRadius: 'var(--radius-lg)',
                                    padding: '24px 28px',
                                    marginBottom: '24px',
                                    boxShadow: 'var(--shadow-sm)',
                                    border: '1px solid var(--border-soft)',
                                    borderLeft: '4px solid var(--primary)',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '32px',
                                    alignItems: 'center'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{
                                            width: '52px',
                                            height: '52px',
                                            borderRadius: '50%',
                                            background: 'var(--primary-soft)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '1.5rem',
                                            fontWeight: '800',
                                            color: 'var(--primary-bold)'
                                        }}>
                                            {user?.name?.charAt(0)}
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Student Name</p>
                                            <p style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>{user?.name || '—'}</p>
                                        </div>
                                    </div>
                                    <div style={{ width: '1px', height: '40px', background: 'var(--border-soft)' }} className="divider-vertical" />
                                    <div>
                                        <p style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--primary-bold)', margin: 0, fontFamily: 'monospace' }}>{user?.studentId || '—'}</p>
                                    </div>
                                    <div style={{ width: '1px', height: '40px', background: 'var(--border-soft)' }} className="divider-vertical" />
                                    <div>
                                        <p style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Roll Number</p>
                                        <p style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>{user?.rollNumber || '—'}</p>
                                    </div>
                                    <div style={{ width: '1px', height: '40px', background: 'var(--border-soft)' }} className="divider-vertical" />
                                    <div>
                                        <p style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Class</p>
                                        <StudentClassDisplay classId={user?.classId} />
                                    </div>
                                </div>
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
                        <Route path="/" element={<Navigate to="/student/dashboard" />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
};

export default StudentDashboard;
