import { useState, useEffect } from 'react';
import { useNavigate, NavLink, Routes, Route, Navigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { logout } from '../services/authService';
import ManageStudents from '../components/admin/ManageStudents';
import ManageTeachers from '../components/admin/ManageTeachers';
import ManageClasses from '../components/admin/ManageClasses';
import ManageFees from '../components/admin/ManageFees';
import ManageResults from '../components/admin/ManageResults';
import ManageGallery from '../components/admin/ManageGallery';
import ManageAttendance from '../components/admin/ManageAttendance';
import ManageNotices from '../components/admin/ManageNotices';
import LiveClock from '../components/common/LiveClock';
import ThemeToggle from '../components/common/ThemeToggle';
import {
    LayoutDashboard,
    Users,
    BookOpen,
    CreditCard,
    FileText,
    Image as ImageIcon,
    ClipboardCheck,
    BellRing,
    LogOut,
    Menu,
    X,
    UserCircle
} from 'lucide-react';
import { socket } from '../services/socket';

const AdminDashboard = () => {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [stats, setStats] = useState({
        students: 0,
        teachers: 0,
        classes: 0,
        projectedFees: 0
    });
    const userJson = localStorage.getItem('user');
    let user = null;
    try {
        user = userJson && userJson !== 'undefined' ? JSON.parse(userJson) : null;
    } catch (e) {
        localStorage.removeItem('user');
    }

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/dashboard/stats');
                setStats(res.data);
            } catch (error: any) {
                console.error('Failed to fetch stats:', error);
                const msg = error.response?.data?.message || 'Failed to load dashboard stats.';
                showToast(msg, 'error');
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 30000); // Update every 30 seconds

        // Socket.io - Real-time updates
        socket.emit('join_room', 'admin_room');

        socket.on('fee_paid', () => {
            fetchStats();
        });

        socket.on('attendance_marked', () => {
            fetchStats();
        });

        return () => {
            clearInterval(interval);
            socket.off('fee_paid');
            socket.off('attendance_marked');
        };
    }, []);

    const handleLogout = () => {
        logout();
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
        { path: '/admin/fees', icon: <CreditCard size={20} />, label: 'Fee Records' },
        { path: '/admin/results', icon: <FileText size={20} />, label: 'Results' },
        { path: '/admin/notices', icon: <BellRing size={20} />, label: 'Notices' },
        { path: '/admin/gallery', icon: <ImageIcon size={20} />, label: 'Manage Gallery' },
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
                    <button
                        onClick={toggleSidebar}
                        style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '4px' }}
                    >
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
                            display: 'none' // Hidden by default, shown via CSS on mobile
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
                        <span style={{ fontSize: '0.65rem', fontWeight: '600', color: 'var(--text-muted)', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>Administrative Portal</span>
                    </div>
                </div>

                <div className="sidebar-user-info">
                    <span className="user-name">{user?.name}</span>
                    <span className="user-id">ID: {user?.adminId || user?.username || user?.teacherId}</span>
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

            {/* Main Content */}
            <main className="dashboard-content">
                <header className="content-header" style={{ animation: 'slideInRight 0.4s ease-out' }}>
                    <div>
                        <h2>Admin Control Center</h2>
                        <p style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Manage academy excellence and systems.</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div className="hide-on-mobile">
                            <LiveClock />
                        </div>
                        <ThemeToggle />
                        <button 
                            onClick={() => navigate('/admin/notices')}
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)', padding: '10px', borderRadius: '50%', cursor: 'pointer', color: 'var(--primary-bold)' }}
                        >
                            <BellRing size={20} />
                        </button>
                        <div className="admin-info-pill hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-card)', padding: '6px 16px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-soft)' }}>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '0.85rem', fontWeight: '700', margin: 0 }}>{user?.name} <span style={{ opacity: 0.5, fontWeight: '500', marginLeft: '4px' }}>({user?.adminId || user?.username || user?.teacherId})</span></p>
                                <p style={{ fontSize: '0.65rem', fontWeight: '600', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase' }}>Super Admin</p>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="page-view">
                    <Routes>
                        <Route path="dashboard" element={
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <h3>{stats.students}</h3>
                                    <p>Total Students</p>
                                </div>
                                <div className="stat-card" style={{ borderLeftColor: 'var(--success)' }}>
                                    <h3>{stats.teachers}</h3>
                                    <p>Active Faculty</p>
                                </div>
                                <div className="stat-card" style={{ borderLeftColor: 'var(--accent)' }}>
                                    <h3>{stats.classes}</h3>
                                    <p>Grade Levels</p>
                                </div>
                                <div className="stat-card" style={{ borderLeftColor: '#8b5cf6' }}>
                                    <h3>
                                        {stats.projectedFees >= 100000
                                            ? `₹${(stats.projectedFees / 100000).toFixed(1)}L`
                                            : `₹${stats.projectedFees.toLocaleString('en-IN')}`}
                                    </h3>
                                    <p>Fees Projected</p>
                                </div>
                            </div>
                        } />
                        <Route path="students" element={<ManageStudents />} />
                        <Route path="faculty" element={<ManageTeachers />} />
                        <Route path="classes" element={<ManageClasses />} />
                        <Route path="attendance" element={<ManageAttendance />} />
                        <Route path="fees" element={<ManageFees />} />
                        <Route path="results" element={<ManageResults />} />
                        <Route path="notices" element={<ManageNotices />} />
                        <Route path="gallery" element={<ManageGallery />} />
                        <Route path="/" element={<Navigate to="/admin/dashboard" />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
