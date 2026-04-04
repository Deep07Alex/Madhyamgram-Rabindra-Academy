import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { getPersistentStorage } from '../../services/api';

export default function MobileIntroScreen() {
    const navigate = useNavigate();

    useEffect(() => {
        const storage = getPersistentStorage();
        if (storage.getItem('has_seen_onboarding')) {
            navigate('/', { replace: true });
        }
    }, [navigate]);

    const handleGetStarted = () => {
        const storage = getPersistentStorage();
        storage.setItem('has_seen_onboarding', 'true');
        navigate('/', { replace: true });
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'var(--primary)',
                padding: '40px 24px',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {/* Background design elements */}
            <div style={{
                position: 'absolute',
                top: '-10%', left: '-10%', width: '120%', height: '120%',
                backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(0, 0, 0, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(0, 0, 0, 0.05) 0%, transparent 50%)',
                zIndex: 0
            }} />

            <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, type: 'spring' }}
                style={{ zIndex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
                <div style={{
                    width: '120px', height: '120px', borderRadius: '60px',
                    backgroundColor: 'var(--glass-bg)',
                    backdropFilter: 'var(--glass-blur)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    marginBottom: '32px', border: '2px solid var(--glass-border)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                    overflow: 'hidden'
                }}>
                    <img src="/RABINDRA_LOGO.jpeg" alt="Academy Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>

                <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--primary-rich)', fontFamily: 'Outfit', marginBottom: '16px', lineHeight: '1.2' }}>
                    Madhyamgram<br />Rabindra Academy
                </h1>
                
                <p style={{ color: 'var(--primary-rich)', opacity: 0.8, fontSize: '16px', marginBottom: '48px', fontWeight: '500' }}>
                    Empowering minds, shaping the future.
                </p>

                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleGetStarted}
                    style={{
                        backgroundColor: 'var(--primary-rich)',
                        color: 'white',
                        border: 'none',
                        padding: '16px 32px',
                        borderRadius: '30px',
                        fontSize: '18px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        boxShadow: '0 10px 20px rgba(93, 23, 23, 0.3)',
                        cursor: 'pointer'
                    }}
                >
                    Get Started <ArrowRight size={20} />
                </motion.button>
            </motion.div>
        </motion.div>
    );
}
