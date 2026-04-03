import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

import { useAuth } from '../../context/AuthContext';

export default function MobileDashboardLayout() {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const handleLogout = () => {
        logout();
        navigate('/');
    };



    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-main)' }}>
            {/* Header */}
            <div style={{ 
                padding: '20px 24px', 
                backgroundColor: 'var(--primary)', 
                borderBottomLeftRadius: '24px',
                borderBottomRightRadius: '24px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                margin: '0',
                paddingTop: 'calc(env(safe-area-inset-top, 40px) + 12px)', // For notch and status bar
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--primary-rich)', backgroundColor: '#fff' }}>
                        <img src="/RABINDRA_LOGO.jpeg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <h2 style={{ fontSize: '13px', fontWeight: '900', color: 'var(--primary-rich)', margin: 0, fontFamily: 'Outfit', lineHeight: 1.1, letterSpacing: '0.5px' }}>MADHYAMGRAM</h2>
                        <h2 style={{ fontSize: '14px', fontWeight: '900', color: 'var(--primary-rich)', margin: 0, fontFamily: 'Outfit', lineHeight: 1.1 }}>RABINDRA ACADEMY</h2>
                        <span style={{ fontSize: '9px', fontWeight: '700', color: 'var(--primary-rich)', opacity: 0.8, marginTop: '2px' }}>
                            UDISE: 19112601311 | ESTD: 2005
                        </span>
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div 
                        onClick={toggleTheme}
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            width: '44px',
                            height: '44px',
                            borderRadius: '12px',
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                            cursor: 'pointer'
                        }}
                    >
                        {theme === 'light' ? <Moon size={22} color="var(--primary-rich)" strokeWidth={2.5} /> : <Sun size={22} color="var(--primary-rich)" strokeWidth={2.5} />}
                    </div>

                    <div 
                        onClick={handleLogout}
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            width: '44px',
                            height: '44px',
                            borderRadius: '12px',
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                            cursor: 'pointer'
                        }}
                    >
                        <LogOut size={22} color="var(--primary-rich)" strokeWidth={2.5} />
                    </div>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                <Outlet />
            </div>
        </div>
    );
}
