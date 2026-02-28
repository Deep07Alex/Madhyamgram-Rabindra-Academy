import { LogOut, LayoutDashboard, Calendar, ClipboardList, BookPlus, UserCheck } from 'lucide-react';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { logout, getCurrentUser } from '../services/authService.js';

// Placeholder Components
const TeacherOverview = () => (
    <>
        <div className="stats-grid">
            <div className="stat-card">
                <h3>45</h3>
                <p>Students (Class 5)</p>
            </div>
            <div className="stat-card">
                <h3>5</h3>
                <p>Homework Pending</p>
            </div>
            <div className="stat-card">
                <h3>98%</h3>
                <p>Attendance Today</p>
            </div>
        </div>
        <div className="content-placeholder">
            <p>Teacher Overview features will be implemented here.</p>
        </div>
    </>
);

const Attendance = () => <div className="content-placeholder"><p>Take and view attendance.</p></div>;
const Homework = () => <div className="content-placeholder"><p>Assign and grade homework.</p></div>;
const Results = () => <div className="content-placeholder"><p>Manage student results.</p></div>;
const Schedule = () => <div className="content-placeholder"><p>View teaching schedule.</p></div>;

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
                    <Link to="/teacher/schedule" className={`nav-item ${isActive('/teacher/schedule')}`}><Calendar size={20} /> Schedule</Link>
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
                    <Route path="/attendance" element={<Attendance />} />
                    <Route path="/homework" element={<Homework />} />
                    <Route path="/results" element={<Results />} />
                    <Route path="/schedule" element={<Schedule />} />
                </Routes>
            </main>
        </div>
    );
};

export default TeacherDashboard;
