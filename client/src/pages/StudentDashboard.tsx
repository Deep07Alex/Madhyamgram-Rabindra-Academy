import { LogOut, LayoutDashboard, Calendar, ClipboardList, BookOpen, CreditCard } from 'lucide-react';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { logout, getCurrentUser } from '../services/authService.js';

import StudentAttendance from '../components/student/StudentAttendance.js';
import StudentHomework from '../components/student/StudentHomework.js';
import StudentFees from '../components/student/StudentFees.js';
import StudentResults from '../components/student/StudentResults.js';

const StudentOverview = () => (
    <>
        <div className="stats-grid">
            <div className="stat-card">
                <h3>Welcome</h3>
                <p>To Student Portal</p>
            </div>
        </div>
        <div className="content-placeholder">
            <p>Select an option from the sidebar to view your progress.</p>
        </div>
    </>
);

const StudentDashboard = () => {
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
                    <Link to="/student" className={`nav-item ${location.pathname === '/student' ? 'active' : ''}`}><LayoutDashboard size={20} /> Dashboard</Link>
                    <Link to="/student/attendance" className={`nav-item ${isActive('/student/attendance')}`}><Calendar size={20} /> Attendance</Link>
                    <Link to="/student/homework" className={`nav-item ${isActive('/student/homework')}`}><BookOpen size={20} /> Homework</Link>
                    <Link to="/student/fees" className={`nav-item ${isActive('/student/fees')}`}><CreditCard size={20} /> Fees</Link>
                    <Link to="/student/results" className={`nav-item ${isActive('/student/results')}`}><ClipboardList size={20} /> Results</Link>
                </nav>
                <button className="logout-btn" onClick={handleLogout}>
                    <LogOut size={20} /> Logout
                </button>
            </aside>

            <main className="dashboard-content">
                <header className="content-header">
                    <h2>Student Dashboard</h2>
                    <div className="user-profile">
                        <span>Welcome, {user?.name}</span>
                    </div>
                </header>

                <Routes>
                    <Route path="/" element={<StudentOverview />} />
                    <Route path="/attendance" element={<StudentAttendance />} />
                    <Route path="/homework" element={<StudentHomework />} />
                    <Route path="/fees" element={<StudentFees />} />
                    <Route path="/results" element={<StudentResults />} />
                </Routes>
            </main>
        </div>
    );
};

export default StudentDashboard;
