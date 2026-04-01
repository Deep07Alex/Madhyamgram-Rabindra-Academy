/**
 * Unified Login Page
 * 
 * A single entry point for Students, Teachers, and Administrators.
 * Features:
 * - Role-switching tabs
 * - Dynamic ID labeling and iconography
 * - Automatic pre-login redirection
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as loginService } from '../services/authService.js';
import { Lock, User, Eye, EyeOff, GraduationCap, ChevronRight } from 'lucide-react';

const Login = () => {
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const navigate = useNavigate();
    const { user, login } = useAuth();

    const [activeRole, setActiveRole] = useState<'STUDENT' | 'TEACHER' | 'ADMIN'>('STUDENT');

    // Auto-redirect Logic:
    // If a session already exists, push the user straight to their portal.
    useEffect(() => {
        if (user) {
            if (user.role === 'ADMIN') navigate('/admin');
            else if (user.role === 'TEACHER') navigate('/teacher');
            else navigate('/student');
        }
    }, [user, navigate]);
    
    // Cooldown timer
    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    const roleConfigs = {
        STUDENT: { label: 'School ID', placeholder: 'e.g. S-1001', icon: <GraduationCap size={20} className="input-icon" /> },
        TEACHER: { label: 'Faculty ID', placeholder: 'e.g. T-10922265', icon: <User className="input-icon" size={20} /> },
        ADMIN: { label: 'Admin Identifier', placeholder: 'e.g. A-7228273901 or Username', icon: <Lock className="input-icon" size={20} /> }
    };

    /**
     * Handles the login form submission.
     * Authenticates via AuthService and updates the global AuthContext.
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await loginService(userId, password, activeRole);
            const { token, user } = data;
            
            // Centralized login update
            login(token, user);

            if (user.role === 'ADMIN') navigate('/admin');
            else if (user.role === 'TEACHER') navigate('/teacher');
            else navigate('/student');
        } catch (err: any) {
            if (err.response?.status === 429) {
                const retryAfter = err.response.headers['retry-after'];
                const customMsg = err.response.data?.message || (typeof err.response.data === 'string' ? err.response.data : '');
                setError(customMsg || `Too many requests. ${retryAfter ? `Please wait ${retryAfter} seconds.` : 'Please try again later.'}`);
                setCooldown(30); // 30s manual cooldown behavior
            } else {
                setError(err.response?.data?.message || 'Invalid credentials. Please verify your ID and password.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-header">
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                        <img src="/RABINDRA_LOGO.jpeg" alt="Academy Logo" className="login-logo" />
                        <div style={{
                            position: 'absolute',
                            bottom: '24px',
                            right: '-10px',
                            background: 'var(--primary)',
                            color: 'var(--bg-card)',
                            padding: '6px',
                            borderRadius: '50%',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                        }}>
                            {roleConfigs[activeRole].icon}
                        </div>
                    </div>
                    <h2>Welcome Back</h2>
                    <div style={{ marginTop: '8px' }}>
                        <p className="login-subtitle-text">Madhyamgram</p>
                        <p style={{ fontSize: '1.4rem', fontWeight: '1000', textTransform: 'uppercase', color: 'var(--primary-rich)', margin: 0, letterSpacing: '-0.02em' }} className="login-academy-text">Rabindra Academy</p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '6px' }}>
                            <p className="login-identity-text">UDISE: 19112601311</p>
                            <p className="login-identity-text">ESTD: 2005</p>
                        </div>
                    </div>
                </div>

                <div className="login-tabs">
                    {(['STUDENT', 'TEACHER', 'ADMIN'] as const).map((role) => (
                        <button
                            key={role}
                            className={`tab-btn ${activeRole === role ? 'active' : ''}`}
                            onClick={() => {
                                setActiveRole(role);
                                setUserId('');
                                setPassword('');
                                setError('');
                            }}
                        >
                            {role.charAt(0) + role.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>

                {error && (
                    <div className="error-message" style={{ animation: 'fadeIn 0.3s ease', marginBottom: '20px' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="userId">{roleConfigs[activeRole].label}</label>
                        <div className="input-with-icon">
                            {roleConfigs[activeRole].icon}
                            <input
                                type="text"
                                id="userId"
                                placeholder={roleConfigs[activeRole].placeholder}
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '16px' }}>
                        <label htmlFor="password">Password</label>
                        <div className="input-with-icon">
                            <Lock className="input-icon" size={20} />
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                            >
                                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn-primary login-button"
                        disabled={loading || cooldown > 0}
                        style={{ width: '100%', height: '52px', marginTop: '32px', borderRadius: '12px', fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}
                    >
                        {loading ? 'Authenticating...' : cooldown > 0 ? `Wait ${cooldown}s` : (
                            <>
                                Access {activeRole.charAt(0) + activeRole.slice(1).toLowerCase()} Portal <ChevronRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                <div className="login-footer" style={{ borderTop: '1px solid var(--border-soft)', paddingTop: '24px' }}>
                    <p>© {new Date().getFullYear()} MADHYAMGRAM RABINDRA ACADEMY</p>
                    <p style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px' }}>Secured Academic Management System</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
