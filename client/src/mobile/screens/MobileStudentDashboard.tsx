import { motion } from 'framer-motion';
import { Book, Calendar, ClipboardCheck, Award } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function MobileStudentDashboard() {
    const { user } = useAuth();
    
    const actions = [
        { label: 'My Subjects', icon: Book, color: '#3b82f6' },
        { label: 'Timetable', icon: Calendar, color: '#10b981' },
        { label: 'Attendance', icon: ClipboardCheck, color: '#f59e0b' },
        { label: 'Results', icon: Award, color: '#8b5cf6' }
    ];

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
        >
            <div style={{ padding: '24px', backgroundColor: 'var(--primary-soft)', borderRadius: '24px', boxShadow: '0 10px 20px rgba(244, 211, 148, 0.2)' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--primary-rich)', fontFamily: 'Outfit' }}>
                    Hi, {user?.name.split(' ')[0] || 'Student'}! 🎓
                </h1>
                <p style={{ marginTop: '8px', color: 'var(--text-main)', opacity: 0.8, fontWeight: '500' }}>
                    Ready to learn something new today?
                </p>
            </div>

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
                                borderRadius: '24px',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '12px',
                                cursor: 'pointer'
                            }}
                        >
                            <div style={{ 
                                width: '56px', height: '56px', borderRadius: '16px', 
                                backgroundColor: `${action.color}15`,
                                display: 'flex', justifyContent: 'center', alignItems: 'center'
                            }}>
                                <Icon size={28} color={action.color} />
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }}>
                                {action.label}
                            </div>
                        </motion.div>
                    )
                })}
            </div>

            <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Upcoming Classes</h3>
                <div style={{ borderRadius: '16px', border: '1px solid var(--border-soft)', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontWeight: '700', fontSize: '16px' }}>Mathematics</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>10:30 AM - Room 4B</div>
                    </div>
                    <div style={{ width: '12px', height: '12px', borderRadius: '6px', backgroundColor: '#10b981' }} />
                </div>
            </div>
        </motion.div>
    );
}
