import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { Loader2 } from 'lucide-react';

// Lazy load components for production optimization
const Login = React.lazy(() => import('./pages/Login'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const TeacherDashboard = React.lazy(() => import('./pages/TeacherDashboard'));
const StudentDashboard = React.lazy(() => import('./pages/StudentDashboard'));
const Gallery = React.lazy(() => import('./pages/Gallery'));
const MainPage = React.lazy(() => import('./pages/MainPage'));

const LoadingFallback = () => (
  <div style={{ 
    height: '100vh', 
    width: '100vw', 
    display: 'flex', 
    flexDirection: 'column',
    alignItems: 'center', 
    justifyContent: 'center',
    background: 'var(--bg-main)',
    color: 'var(--primary-bold)'
  }}>
    <Loader2 className="animate-spin" size={48} />
    <p style={{ marginTop: '16px', fontWeight: '600', letterSpacing: '0.05em' }}>Loading Excellence...</p>
  </div>
);

const PrivateRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;
  const token = localStorage.getItem('token');

  if (!token || !user) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Router>
          <React.Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route
                path="/admin/*"
                element={
                  <PrivateRoute allowedRoles={['ADMIN']}>
                    <AdminDashboard />
                  </PrivateRoute>
                }
              />

              <Route
                path="/teacher/*"
                element={
                  <PrivateRoute allowedRoles={['TEACHER']}>
                    <TeacherDashboard />
                  </PrivateRoute>
                }
              />

              <Route
                path="/student/*"
                element={
                  <PrivateRoute allowedRoles={['STUDENT']}>
                    <StudentDashboard />
                  </PrivateRoute>
                }
              />

              <Route path="/gallery" element={<Gallery />} />
              <Route path="/" element={<MainPage />} />
            </Routes>
          </React.Suspense>
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
