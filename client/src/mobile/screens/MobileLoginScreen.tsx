import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, User, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';

export default function MobileLoginScreen() {
    const navigate = useNavigate();
    const { login, user } = useAuth();
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [role, setRole] = useState<Role>('STUDENT');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        if (user) {
            navigate('/dashboard', { replace: true });
        }
    }, [user, navigate]);

    useEffect(() => {
        setUsername('');
        setPassword('');
        setHasError(false);
    }, [role]);

    // Clear error when user changes anything
    const handleInputChange = (setter: (v: string) => void, val: string) => {
        setter(val);
        if (hasError) setHasError(false);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setHasError(false);

        try {
            const response = await api.post('/auth/login', { username, password, role });
            const { token, user: loggedInUser } = response.data;
            await login(token, loggedInUser);
            showToast('Login successful', 'success');
            navigate('/dashboard');
        } catch (error: any) {
            setHasError(true);
            showToast(error.response?.data?.message || 'Login failed', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const getPlaceholder = () => {
        if (role === 'STUDENT') return 'e.g. S-1001';
        if (role === 'TEACHER') return 'e.g. T-10922265';
        return 'e.g. A-7228273901 or Username';
    };

    const getLabel = () => {
        if (role === 'STUDENT') return 'School ID';
        if (role === 'TEACHER') return 'Faculty ID';
        return 'Admin Identifier';
    };

    const getButtonText = () => {
        if (role === 'STUDENT') return 'Access Student Portal';
        if (role === 'TEACHER') return 'Access Teacher Portal';
        return 'Access Admin Portal';
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            style={{
                minHeight: '100vh',
                width: '100vw',
                backgroundColor: 'var(--primary)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflowX: 'hidden'
            }}
        >
            {/* Top Branding Section (Native App Feel) */}
            <div style={{
                flex: "0 0 auto",
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '60px 24px 30px',
                position: 'relative'
            }}>
                <button 
                    onClick={() => navigate(-1)}
                    style={{ position: 'absolute', top: 'env(safe-area-inset-top, 40px)', left: '20px', background: 'none', border: 'none', color: '#4A453A', zIndex: 10, cursor: 'pointer' }}
                >
                    <ArrowLeft size={28} />
                </button>

                <div style={{ position: 'relative', marginBottom: '20px' }}>
                    <div style={{
                        width: '100px', height: '100px', borderRadius: '50px', overflow: 'hidden',
                        border: '4px solid #4A453A', backgroundColor: '#fff',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
                    }}>
                        <img src="/RABINDRA_LOGO.jpeg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                </div>

                <h2 style={{ color: '#4A453A', fontSize: '13px', letterSpacing: '2px', marginBottom: '4px', textAlign: 'center', fontWeight: '800' }}>
                    MADHYAMGRAM
                </h2>
                <h1 style={{ color: '#822727', fontSize: '24px', fontWeight: '800', marginBottom: '0', textAlign: 'center', fontFamily: 'Outfit' }}>
                    RABINDRA ACADEMY
                </h1>
                <p style={{ color: '#4A453A', fontSize: '10px', opacity: 0.8, fontWeight: '700', marginTop: '8px', textAlign: 'center' }}>
                    UDISE: 19112601311 &nbsp;•&nbsp; ESTD: 2005
                </p>
            </div>

            {/* Bottom Sheet Section (Expands naturally, full width) */}
            <div style={{
                flex: 1,
                backgroundColor: '#4A453A',
                borderTopLeftRadius: '40px',
                borderTopRightRadius: '40px',
                padding: '36px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxShadow: '0 -15px 40px rgba(0,0,0,0.2)'
            }}>
                
                <h2 style={{ color: '#F1D9B5', fontSize: '24px', fontWeight: '700', marginBottom: '28px', textAlign: 'center' }}>
                    Welcome Back
                </h2>

                {/* Role Switcher */}
                <div style={{
                    display: 'flex', backgroundColor: '#2C2922', borderRadius: '16px', width: '100%', maxWidth: '400px',
                    marginBottom: '32px', padding: '6px'
                }}>
                    {(['STUDENT', 'TEACHER', 'ADMIN'] as Role[]).map((r) => (
                        <div
                            key={r}
                            onClick={() => setRole(r)}
                            style={{
                                flex: 1, textAlign: 'center', padding: '12px 0', borderRadius: '12px',
                                cursor: 'pointer',
                                backgroundColor: role === r ? '#4A453A' : 'transparent',
                                color: role === r ? '#DDA76A' : '#8A867D',
                                fontSize: '14px', fontWeight: '700', transition: 'all 0.25s ease',
                                boxShadow: role === r ? '0 4px 12px rgba(0,0,0,0.2)' : 'none'
                            }}
                        >
                            {r === 'STUDENT' ? 'Student' : r === 'TEACHER' ? 'Teacher' : 'Admin'}
                        </div>
                    ))}
                </div>

                {/* Form */}
                <motion.form 
                    onSubmit={handleLogin} 
                    animate={hasError ? { x: [-10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '20px' }}
                >
                    
                    <div>
                        <label style={{ display: 'block', color: '#FFFFFF', fontSize: '13px', fontWeight: '600', marginBottom: '8px', opacity: 0.9 }}>
                            {getLabel()}
                        </label>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '16px', top: '16px', color: '#8A867D' }}>
                                <User size={20} />
                            </div>
                            <input
                                type="text"
                                placeholder={getPlaceholder()}
                                value={username}
                                onChange={(e) => handleInputChange(setUsername, e.target.value)}
                                required
                                style={{
                                    width: '100%', padding: '16px 16px 16px 48px', borderRadius: '12px',
                                    border: `2px solid ${hasError ? '#ef4444' : 'transparent'}`, 
                                    backgroundColor: '#2C2922', color: '#FFFFFF',
                                    fontSize: '15px', outline: 'none', boxSizing: 'border-box',
                                    transition: 'all 0.2s'
                                }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', color: '#FFFFFF', fontSize: '13px', fontWeight: '600', marginBottom: '8px', opacity: 0.9 }}>
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '16px', top: '16px', color: '#8A867D' }}>
                                <Lock size={20} />
                            </div>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => handleInputChange(setPassword, e.target.value)}
                                required
                                style={{
                                    width: '100%', padding: '16px 48px 16px 48px', borderRadius: '12px',
                                    border: `2px solid ${hasError ? '#ef4444' : 'transparent'}`, 
                                    backgroundColor: '#2C2922', color: '#FFFFFF',
                                    fontSize: '15px', outline: 'none', boxSizing: 'border-box',
                                    transition: 'all 0.2s'
                                }}
                            />
                            <div 
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: '16px', top: '16px', color: '#8A867D', cursor: 'pointer' }}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </div>
                        </div>
                    </div>



                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        type="submit"
                        disabled={isLoading}
                        style={{
                            marginTop: '12px',
                            backgroundColor: '#DDA76A',
                            color: '#4A453A',
                            border: 'none',
                            padding: '18px',
                            borderRadius: '12px',
                            fontSize: '16px',
                            fontWeight: '800',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '10px',
                            boxShadow: '0 8px 25px rgba(221, 167, 106, 0.3)',
                            opacity: isLoading ? 0.7 : 1,
                            cursor: 'pointer'
                        }}
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={22} /> : getButtonText()}
                    </motion.button>
                </motion.form>

                {/* Footer */}
                <div style={{ marginTop: 'auto', width: '100%', paddingTop: '30px' }}>
                    <p style={{ color: '#FFFFFF', fontSize: '10px', fontWeight: '500', opacity: 0.6, lineHeight: '1.5', textAlign: 'center' }}>
                        © 2026 MADHYAMGRAM RABINDRA ACADEMY<br/>
                        <span style={{ opacity: 0.7 }}>Secured Academic Management System</span>
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
