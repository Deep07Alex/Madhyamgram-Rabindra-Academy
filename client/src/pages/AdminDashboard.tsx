import { LogOut, LayoutDashboard, UserCheck, BookOpen, CreditCard, ClipboardList } from 'lucide-react';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { logout, getCurrentUser } from '../services/authService.js';

// Placeholder Components
const AdminOverview = () => (
    <>
        <div className="stats-grid">
            <div className="stat-card">
                <h3>400</h3>
                <p>Total Students</p>
            </div>
            <div className="stat-card">
                <h3>25</h3>
                <p>Total Teachers</p>
            </div>
            <div className="stat-card">
                <h3>7</h3>
                <p>Total Classes</p>
            </div>
        </div>
        <div className="content-placeholder">
            <p>Admin Overview features will be implemented here.</p>
        </div>
    </>
);

const ManageStaff = () => <div className="content-placeholder"><p>Manage Staff interface.</p></div>;
const ManageClasses = () => <div className="content-placeholder"><p>Manage Classes interface.</p></div>;
const FeeStructure = () => <div className="content-placeholder"><p>Fee Structure interface.</p></div>;
const Reports = () => <div className="content-placeholder"><p>Reports interface.</p></div>;

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
                    <Link to="/admin/staff" className={`nav-item ${isActive('/admin/staff')}`}><UserCheck size={20} /> Manage Staff</Link>
                    <Link to="/admin/classes" className={`nav-item ${isActive('/admin/classes')}`}><BookOpen size={20} /> Manage Classes</Link>
                    <Link to="/admin/fees" className={`nav-item ${isActive('/admin/fees')}`}><CreditCard size={20} /> Fee Structure</Link>
                    <Link to="/admin/reports" className={`nav-item ${isActive('/admin/reports')}`}><ClipboardList size={20} /> Reports</Link>
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
                    <Route path="/staff" element={<ManageStaff />} />
                    <Route path="/classes" element={<ManageClasses />} />
                    <Route path="/fees" element={<FeeStructure />} />
                    <Route path="/reports" element={<Reports />} />
                </Routes>
            </main>
        </div>
    );
};

export default AdminDashboard;
