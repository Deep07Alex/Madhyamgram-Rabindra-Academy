import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService.js';
import { Lock, User, Eye, EyeOff, GraduationCap, ChevronRight } from 'lucide-react';

const Login = () => {
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const [activeRole, setActiveRole] = useState<'STUDENT' | 'TEACHER' | 'ADMIN'>('STUDENT');

    const roleConfigs = {
        STUDENT: { label: 'Scholar ID', placeholder: 'e.g. S-1302487085', icon: <GraduationCap size={20} className="input-icon" /> },
        TEACHER: { label: 'Faculty ID', placeholder: 'e.g. T-8100474669', icon: <User className="input-icon" size={20} /> },
        ADMIN: { label: 'Admin Identifier', placeholder: 'Username or Admin ID', icon: <Lock className="input-icon" size={20} /> }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await login(userId, password, activeRole); // Pass activeRole to the login service
            const user = data.user;

            if (user.role === 'ADMIN') navigate('/admin');
            else if (user.role === 'TEACHER') navigate('/teacher');
            else navigate('/student');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid credentials. Please verify your ID and password.');
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
                            color: 'white',
                            padding: '6px',
                            borderRadius: '50%',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                        }}>
                            {roleConfigs[activeRole].icon}
                        </div>
                    </div>
                    <h2>Welcome Back</h2>
                    <div style={{ marginTop: '8px' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', opacity: 0.8, color: 'var(--text-main)', letterSpacing: '0.05em', margin: 0 }}>Madhyamgram</p>
                        <p style={{ fontSize: '1.4rem', fontWeight: '1000', textTransform: 'uppercase', color: '#5d1717', margin: 0, letterSpacing: '-0.02em' }}>Rabindra Academy</p>
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
                        <label htmlFor="password">Security Password</label>
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
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn-primary login-button"
                        disabled={loading}
                        style={{ width: '100%', height: '52px', marginTop: '32px', borderRadius: '12px', fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}
                    >
                        {loading ? 'Authenticating...' : (
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
