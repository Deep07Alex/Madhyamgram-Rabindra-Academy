import { LogOut, LayoutDashboard, UserCheck, BookOpen, CreditCard, ClipboardList } from 'lucide-react';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { logout, getCurrentUser } from '../services/authService.js';

import ManageUsers from '../components/admin/ManageUsers.js';
import ManageClasses from '../components/admin/ManageClasses.js';
import ManageFees from '../components/admin/ManageFees.js';
import ManageResults from '../components/admin/ManageResults.js';
import ManageGallery from '../components/admin/ManageGallery.js';

const AdminOverview = () => (
    <>
        <div className="stats-grid">
            <div className="stat-card">
                <h3>Admin Dashboard</h3>
                <p>Select an option from the sidebar to manage the system.</p>
            </div>
        </div>
    </>
);

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
