import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Users, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { login } from '../services/authService.js';

const Login = () => {
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'STUDENT' | 'TEACHER' | 'ADMIN'>('STUDENT');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const data = await login(loginId, password);
            const userRole = data.user.role;

            // Optional: Verify if the logged-in user matches the selected role
            if (userRole !== role) {
                // You might want to handle this, e.g., show an error or just proceed
                console.warn(`User logged in as ${userRole} but selected ${role}`);
            }

            // Redirect based on role
            if (userRole === 'ADMIN') navigate('/admin');
            else if (userRole === 'TEACHER') navigate('/teacher');
            else navigate('/student');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getRoleLabel = () => {
        switch (role) {
            case 'ADMIN': return 'Administrator ID / Username';
            case 'TEACHER': return 'Teacher ID';
            case 'STUDENT': return 'Student ID';
            default: return 'Login ID';
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="logo-badge">
                        <img src="/RABINDRA_LOGO.jpeg" alt="MRA Logo" className="logo-img" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }} />
                    </div>
                    <h1>Madhyamgram Rabindra Academy</h1>
                    <p>Centralized Academic Management Platform</p>
                </div>

                <div className="role-selector">
                    <button
                        className={`role-chip ${role === 'ADMIN' ? 'active' : ''}`}
                        onClick={() => setRole('ADMIN')}
                        type="button"
                    >
                        <span className="role-icon">🛡️</span>
                        Admin
                    </button>
                    <button
                        className={`role-chip ${role === 'TEACHER' ? 'active' : ''}`}
                        onClick={() => setRole('TEACHER')}
                        type="button"
                    >
                        <span className="role-icon">👨‍🏫</span>
                        Teacher
                    </button>
                    <button
                        className={`role-chip ${role === 'STUDENT' ? 'active' : ''}`}
                        onClick={() => setRole('STUDENT')}
                        type="button"
                    >
                        <span className="role-icon">🎓</span>
                        Student
                    </button>
                </div>

                <form onSubmit={handleLogin} className="login-form">
                    <div className="input-group">
                        <label htmlFor="loginId">{getRoleLabel()}</label>
                        <div className="input-with-icon">
                            <Users size={18} className="field-icon" />
                            <input
                                id="loginId"
                                type="text"
                                placeholder={role === 'ADMIN' ? 'Enter Admin ID or Username' : `Enter your ${role.toLowerCase()} ID`}
                                value={loginId}
                                onChange={(e) => setLoginId(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <div className="input-with-icon" style={{ position: 'relative' }}>
                            <ShieldCheck size={18} className="field-icon" />
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{ paddingRight: '40px' }}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#64748b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '5px'
                                }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? 'Logging in...' : (
                            <>
                                <LogIn size={18} style={{ marginRight: '8px' }} />
                                Sign In
                            </>
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    <p>Forgot password? Contact your administrator.</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
