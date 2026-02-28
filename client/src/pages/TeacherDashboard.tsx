import { LogOut, LayoutDashboard, ClipboardList, BookPlus, UserCheck } from 'lucide-react';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { logout, getCurrentUser } from '../services/authService.js';

import TeacherAttendance from '../components/teacher/TeacherAttendance.js';
import TeacherHomework from '../components/teacher/TeacherHomework.js';
import TeacherResults from '../components/teacher/TeacherResults.js';

const TeacherOverview = () => (
    <>
        <div className="stats-grid">
            <div className="stat-card">
                <h3>Welcome</h3>
                <p>To Teacher Portal</p>
            </div>
        </div>
        <div className="content-placeholder">
            <p>Select an option from the sidebar to manage your classes.</p>
        </div>
    </>
);

const TeacherDashboard = () => {
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
                    <Link to="/teacher" className={`nav-item ${location.pathname === '/teacher' ? 'active' : ''}`}><LayoutDashboard size={20} /> Dashboard</Link>
                    <Link to="/teacher/attendance" className={`nav-item ${isActive('/teacher/attendance')}`}><UserCheck size={20} /> Attendance</Link>
                    <Link to="/teacher/homework" className={`nav-item ${isActive('/teacher/homework')}`}><BookPlus size={20} /> Homework</Link>
                    <Link to="/teacher/results" className={`nav-item ${isActive('/teacher/results')}`}><ClipboardList size={20} /> Results</Link>
                </nav>
                <button className="logout-btn" onClick={handleLogout}>
                    <LogOut size={20} /> Logout
                </button>
            </aside>

            <main className="dashboard-content">
                <header className="content-header">
                    <h2>Teacher Dashboard</h2>
                    <div className="user-profile">
                        <span>Welcome, {user?.name}</span>
                    </div>
                </header>

                <Routes>
                    <Route path="/" element={<TeacherOverview />} />
                    <Route path="/attendance" element={<TeacherAttendance />} />
                    <Route path="/homework" element={<TeacherHomework />} />
                    <Route path="/results" element={<TeacherResults />} />
                </Routes>
            </main>
        </div>
    );
};

export default TeacherDashboard;
