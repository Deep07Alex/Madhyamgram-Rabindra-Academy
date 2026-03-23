import { UserCircle, Mail, ShieldCheck } from 'lucide-react';

interface AdminOverviewProps {
    user: any;
    stats: {
        students: number;
        teachers: number;
        classes: number;
    };
}

const AdminOverview = ({ user, stats }: AdminOverviewProps) => {
    return (
        <>
            <div className="stats-grid">
                <div className="stat-card">
                    <h3>{stats.students}</h3>
                    <p>Total Students</p>
                </div>
                <div className="stat-card" style={{ borderLeftColor: 'var(--success)' }}>
                    <h3>{stats.teachers}</h3>
                    <p>Active Faculty</p>
                </div>
                <div className="stat-card" style={{ borderLeftColor: 'var(--accent)' }}>
                    <h3>{stats.classes}</h3>
                    <p>Grade Levels</p>
                </div>
            </div>

            {user && (
                <div className="card" style={{ marginTop: '32px', padding: '32px', borderRadius: '24px', background: 'var(--bg-card)', border: '1px solid var(--border-soft)', boxShadow: 'var(--shadow-md)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '200px', background: 'var(--primary-soft)', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.3, zIndex: 0 }}></div>

                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '0 0 160px' }}>
                            <div style={{ width: '160px', height: '160px', borderRadius: '20px', overflow: 'hidden', border: '4px solid var(--bg-main)', boxShadow: 'var(--shadow-lg)', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {user.photo ? (
                                    <img 
                                        src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${user.photo}?t=${Date.now()}`} 
                                        alt={user.name} 
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                    />
                                ) : (
                                    <UserCircle size={100} color="var(--primary-bold)" />
                                )}
                            </div>
                        </div>

                        <div style={{ flex: '1', minWidth: '300px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', color: 'var(--text-main)' }}>{user.name}</h3>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '1rem', fontWeight: '700', color: 'var(--primary-bold)', textTransform: 'uppercase' }}>Administrator</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>MEMBER SINCE</p>
                                    <p style={{ margin: 0, fontWeight: '800', color: 'var(--text-main)', fontSize: '0.95rem' }}>
                                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                                    </p>
                                    <div style={{ marginTop: '8px' }}>
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            fontSize: '0.65rem',
                                            fontWeight: '800',
                                            background: 'var(--primary-soft)',
                                            color: 'var(--primary-bold)',
                                            border: '1px solid var(--primary-bold)',
                                            letterSpacing: '0.05em'
                                        }}>
                                            SUPER ADMIN
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}>
                                        <ShieldCheck size={18} />
                                    </div>
                                    <div>
                                        <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)' }}>LOGIN ID</p>
                                        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-main)' }}>{user.adminId || user.username}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}>
                                        <Mail size={18} />
                                    </div>
                                    <div>
                                        <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)' }}>EMAIL ADDRESS</p>
                                        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>{user.email || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AdminOverview;
