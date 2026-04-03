import { motion } from 'framer-motion';
import { Users, BookOpen, Clock, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function MobileTeacherDashboard() {
    const { user } = useAuth();
    
    const actions = [
        { label: 'My Classes', icon: Users, color: '#3b82f6' },
        { label: 'Assignments', icon: FileText, color: '#10b981' },
        { label: 'Schedule', icon: Clock, color: '#f59e0b' },
        { label: 'Resources', icon: BookOpen, color: '#8b5cf6' }
    ];

    return (
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
        >
            <div style={{ padding: '24px', backgroundColor: 'var(--primary)', borderRadius: '24px', boxShadow: '0 10px 20px rgba(244, 211, 148, 0.3)' }}>
                <h1 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--primary-rich)', fontFamily: 'Outfit' }}>
                    Welcome, {user?.name.split(' ')[0]}
                </h1>
                <p style={{ marginTop: '8px', color: 'var(--primary-rich)', opacity: 0.9, fontWeight: '600' }}>
                    You have 3 classes today.
                </p>
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: '700', marginTop: '8px' }}>Teacher Hub</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {actions.map((action, i) => {
                    const Icon = action.icon;
                    return (
                        <motion.div 
                            key={i}
                            whileTap={{ scale: 0.95 }}
                            style={{
                                backgroundColor: 'var(--bg-card)',
                                padding: '20px',
                                borderRadius: '20px',
                                border: '1px solid var(--border-soft)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px',
                                cursor: 'pointer'
                            }}
                        >
                            <div style={{ 
                                width: '48px', height: '48px', borderRadius: '14px', 
                                backgroundColor: `${action.color}15`,
                                display: 'flex', justifyContent: 'center', alignItems: 'center'
                            }}>
                                <Icon size={24} color={action.color} />
                            </div>
                            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>
                                {action.label}
                            </div>
                        </motion.div>
                    )
                })}
            </div>
        </motion.div>
    );
}
