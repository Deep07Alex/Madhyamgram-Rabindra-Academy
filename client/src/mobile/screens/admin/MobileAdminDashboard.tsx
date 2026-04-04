import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserCircle, ShieldCheck, Mail, Loader2, Users, BookOpen, ClipboardCheck, FileText, Banknote, BellRing, BookPlus, ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api, { getBaseUrl } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';


export default function MobileAdminDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [stats, setStats] = useState({
        students: 0,
        teachers: 0,
        classes: 0
    });
    const [isLoading, setIsLoading] = useState(true);

    const [isScrollRestored, setIsScrollRestored] = useState(false);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/dashboard/stats');
                setStats(res.data);
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, []);

    // Dedicated scroll restoration for Dashboard Index
    useEffect(() => {
        if (!isLoading) {
            const container = document.getElementById('mobile-scroll-container');
            const saved = sessionStorage.getItem('dashboard-scroll-pos');
            
            if (container && saved) {
                container.scrollTop = parseInt(saved, 10);
            }
            
            // Once we have set the scroll (even if 0), mark as restored to trigger animation
            setIsScrollRestored(true);
        }
    }, [isLoading]);

    const handleNavigation = (path: string) => {
        const container = document.getElementById('mobile-scroll-container');
        if (container) {
            sessionStorage.setItem('dashboard-scroll-pos', container.scrollTop.toString());
        }
        navigate(path);
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: '16px' }}>
                <Loader2 size={32} className="animate-spin" color="var(--primary-bold)" />
                <p style={{ fontWeight: '600', color: 'var(--text-muted)' }}>Syncing Control Center...</p>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ 
                opacity: isScrollRestored ? 1 : 0, 
                y: isScrollRestored ? 0 : 10 
            }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
        >
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                    <h1 style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', fontFamily: 'Outfit', margin: 0 }}>
                        Admin Control Center
                    </h1>
                    <div style={{ padding: '4px 10px', borderRadius: '100px', background: 'var(--primary-soft)', color: 'var(--primary-bold)', fontSize: '10px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary-bold)' }}></span>
                        Active
                    </div>
                </div>
                <p style={{ color: 'var(--text-muted)', fontWeight: '500', fontSize: '13px', margin: 0 }}>
                    Manage academy excellence and systems.
                </p>
            </div>

            {/* Glowing Statistics Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <StatsCard value={stats.students} label="TOTAL STUDENTS" color="var(--primary-bold)" />
                <StatsCard value={stats.teachers} label="ACTIVE FACULTY" color="var(--success)" />
                <StatsCard value={stats.classes} label="GRADE LEVELS" color="var(--warning)" />
            </div>

            {/* Profile Card */}
            {user && (
                <div style={{
                    backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '24px',
                    boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-soft)',
                    position: 'relative', overflow: 'hidden'
                }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '24px' }}>
                        <div style={{
                            width: '70px', height: '70px', borderRadius: '16px', overflow: 'hidden',
                            border: '3px solid var(--bg-main)', background: 'var(--bg-soft)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            {user.photo ? (
                                <img src={`${getBaseUrl()}${user.photo.startsWith('/') ? '' : '/'}${user.photo}`} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <UserCircle size={50} color="var(--primary-bold)" />
                            )}
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: 'var(--text-main)' }}>{user.name}</h3>
                            <p style={{ margin: '2px 0 0 0', fontSize: '11px', fontWeight: '800', color: 'var(--primary-bold)', textTransform: 'uppercase' }}>Administrator</p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <InfoBlock icon={ShieldCheck} label="LOGIN ID" value={user.adminId || user.username} />
                        <InfoBlock icon={Mail} label="EMAIL" value={user.email || 'N/A'} />
                    </div>

                    <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p style={{ margin: 0, fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)' }}>MEMBER SINCE</p>
                            <p style={{ margin: 0, fontWeight: '800', color: 'var(--text-main)', fontSize: '12px' }}>
                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                            </p>
                        </div>
                        <span style={{
                            padding: '4px 10px', borderRadius: '8px', fontSize: '9px', fontWeight: '800',
                            background: 'var(--primary-soft)', color: 'var(--primary-bold)', border: '1px solid var(--primary-bold)'
                        }}>
                            SUPER ADMIN
                        </span>
                    </div>
                </div>
            )}

            {/* Quick Actions Grid */}
            <div style={{ marginTop: '10px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '16px', fontFamily: 'Outfit' }}>Management Modules</h3>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px'
                }}>
                    <QuickAction icon={Users} label="Manage Students" color="#3B82F6" onClick={() => handleNavigation('/dashboard/students')} />
                    <QuickAction icon={UserCircle} label="Manage Faculty" color="#10B981" onClick={() => handleNavigation('/dashboard/faculty')} />
                    <QuickAction icon={BookOpen} label="See Classes" color="#F59E0B" onClick={() => handleNavigation('/dashboard/classes')} />
                    <QuickAction icon={ClipboardCheck} label="Attendance" color="#8B5CF6" onClick={() => handleNavigation('/dashboard/attendance')} />
                    <QuickAction icon={FileText} label="Results" color="#EC4899" onClick={() => alert('Results module will open natively in the next sprint.')} />
                    <QuickAction icon={Banknote} label="Fees" color="#14B8A6" onClick={() => alert('Fees module will open natively in the next sprint.')} />
                    <QuickAction icon={BellRing} label="Notices" color="#EF4444" onClick={() => alert('Notices module will open natively in the next sprint.')} />
                    <QuickAction icon={BookPlus} label="Assignments" color="#6366F1" onClick={() => alert('Assignments module will open natively in the next sprint.')} />
                    <QuickAction icon={ImageIcon} label="Manage Assets" color="#F97316" onClick={() => alert('Manage Assets module will open natively in the next sprint.')} />
                </div>
            </div>
        </motion.div>
    );
}

const StatsCard = ({ value, label, color }: { value: number | string, label: string, color: string }) => (
    <div style={{
        backgroundColor: 'var(--bg-card)',
        padding: '24px',
        borderRadius: '20px',
        boxShadow: 'var(--shadow-md)',
        border: '1px solid var(--border-soft)',
        borderLeft: `4px solid ${color}`,
        position: 'relative'
    }}>
        <h3 style={{ margin: 0, fontSize: '32px', fontWeight: '900', color: color, fontFamily: 'Outfit' }}>{value}</h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {label}
        </p>
    </div>
);

const InfoBlock = ({ icon: Icon, label, value }: { icon: any, label: string, value: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}>
            <Icon size={16} />
        </div>
        <div style={{ overflow: 'hidden' }}>
            <p style={{ margin: 0, fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)' }}>{label}</p>
            <p style={{ margin: 0, fontSize: '12px', fontWeight: '800', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</p>
        </div>
    </div>
);

const QuickAction = ({ icon: Icon, label, color, onClick }: { icon: any, label: string, color: string, onClick?: () => void }) => {
    return (
        <motion.div
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            style={{
                backgroundColor: 'var(--bg-card)',
                padding: '16px 12px',
                borderRadius: '16px',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--border-soft)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer'
            }}
        >
            <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: `${color}15`,
                color: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <Icon size={20} strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', textAlign: 'center' }}>
                {label}
            </span>
        </motion.div>
    );
};
