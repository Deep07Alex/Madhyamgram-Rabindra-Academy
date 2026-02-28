import { useState, useEffect } from 'react';
import { LogOut, LayoutDashboard, UserCheck, BookOpen, CreditCard, ClipboardList, TrendingUp, Users, Presentation, ScrollText } from 'lucide-react';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { logout, getCurrentUser } from '../services/authService.js';

import ManageUsers from '../components/admin/ManageUsers.js';
import ManageClasses from '../components/admin/ManageClasses.js';
import ManageFees from '../components/admin/ManageFees.js';
import ManageResults from '../components/admin/ManageResults.js';
import ManageGallery from '../components/admin/ManageGallery.js';

import api from '../services/api.js';

const AdminOverview = () => {
    const [stats, setStats] = useState({ students: 0, teachers: 0, classes: 0, pendingFees: 0 });
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        // Clock tick
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);

        // Fetch stats
        api.get('/dashboard/stats')
            .then(res => setStats(res.data))
            .catch(err => console.error('Failed to load stats', err));

        return () => clearInterval(timer);
    }, []);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>Welcome to the Admin Dashboard</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Here is what's happening at Madhyamgram Rabindra Academy today.</p>
                </div>
                <div style={{ textAlign: 'right', background: 'white', padding: '15px 25px', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                        {currentTime.toLocaleTimeString()}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ background: '#e0f2fe', padding: '15px', borderRadius: '12px', color: '#0284c7' }}>
                        <Users size={32} />
                    </div>
                    <div>
                        <p>Total Students</p>
                        <h3>{stats.students}</h3>
                    </div>
                </div>

                <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ background: '#fef3c7', padding: '15px', borderRadius: '12px', color: '#d97706' }}>
                        <Presentation size={32} />
                    </div>
                    <div>
                        <p>Total Teachers</p>
                        <h3>{stats.teachers}</h3>
                    </div>
                </div>

                <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ background: '#dcfce7', padding: '15px', borderRadius: '12px', color: '#16a34a' }}>
                        <BookOpen size={32} />
                    </div>
                    <div>
                        <p>Total Classes</p>
                        <h3>{stats.classes}</h3>
                    </div>
                </div>

                <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ background: '#fee2e2', padding: '15px', borderRadius: '12px', color: '#dc2626' }}>
                        <ScrollText size={32} />
                    </div>
                    <div>
                        <p>Pending Fees</p>
                        <h3>{stats.pendingFees}</h3>
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginTop: '30px' }}>
                <h3>System Status</h3>
                <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <p style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--success-color)', fontWeight: '600' }}>
                        <TrendingUp size={20} /> All Database & API Services are Operational
                    </p>
                    <p style={{ marginTop: '10px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Live data syncing is active. Select an option from the sidebar to manage students, teachers, fees, and system settings.
                    </p>
                </div>
            </div>
        </div>
    );
};

const AdminDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = getCurrentUser();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path: string) => location.pathname === path ? 'active' : '';

    return (
        <div className="dashboard-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <img src="/RABINDRA_LOGO.jpeg" alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                    <span>MRA Academy</span>
                </div>
                <nav className="sidebar-nav">
                    <Link to="/admin" className={`nav-item ${location.pathname === '/admin' ? 'active' : ''}`}><LayoutDashboard size={20} /> Dashboard</Link>
                    <Link to="/admin/users" className={`nav-item ${isActive('/admin/users')}`}><UserCheck size={20} /> Manage Users</Link>
                    <Link to="/admin/classes" className={`nav-item ${isActive('/admin/classes')}`}><BookOpen size={20} /> Manage Classes</Link>
                    <Link to="/admin/fees" className={`nav-item ${isActive('/admin/fees')}`}><CreditCard size={20} /> Fee Structure</Link>
                    <Link to="/admin/results" className={`nav-item ${isActive('/admin/results')}`}><ClipboardList size={20} /> Results</Link>
                    <Link to="/admin/gallery" className={`nav-item ${isActive('/admin/gallery')}`}><ClipboardList size={20} /> Gallery</Link>
                </nav>
                <button className="logout-btn" onClick={handleLogout}>
                    <LogOut size={20} /> Logout
                </button>
            </aside>

            <main className="dashboard-content">
                <header className="content-header">
                    <h2>Admin Dashboard</h2>
                    <div className="user-profile">
                        <span>Welcome, {user?.name}</span>
                    </div>
                </header>

                <Routes>
                    <Route path="/" element={<AdminOverview />} />
                    <Route path="/users" element={<ManageUsers />} />
                    <Route path="/classes" element={<ManageClasses />} />
                    <Route path="/fees" element={<ManageFees />} />
                    <Route path="/results" element={<ManageResults />} />
                    <Route path="/gallery" element={<ManageGallery />} />
                </Routes>
            </main>
        </div>
    );
};

export default AdminDashboard;
