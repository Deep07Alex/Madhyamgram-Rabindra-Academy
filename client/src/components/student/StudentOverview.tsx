/**
 * Student Overview Component
 * 
 * The main 'Home' view for students after logging in.
 * Features:
 * - Profile summary with photo and registration details.
 * - Active assignment banners for immediate tasks.
 * - Pulse-animated announcement notification.
 * - Academic performance statistics.
 */
import { useNavigate } from 'react-router-dom';
import { 
    UserCircle, 
    IdCard, 
    Hash, 
    GraduationCap, 
    Fingerprint, 
    Calendar, 
    BookOpenCheck, 
    BellRing 
} from 'lucide-react';
import StudentClassDisplay from './StudentClassDisplay';
import AssignmentBanner from './AssignmentBanner';

interface StudentOverviewProps {
    user: any;
    stats: {
        attendanceRate: number;
        averageGrade: number;
        activeSubjects: number;
    };
    unreadCount: number;
    pendingAssignments: any[];
    onClearNotices: () => void;
}

const StudentOverview = ({ 
    user, 
    stats, 
    unreadCount, 
    pendingAssignments, 
    onClearNotices 
}: StudentOverviewProps) => {
    const navigate = useNavigate();

    return (
        <>
            <div className="card" style={{
                marginTop: '8px',
                padding: '32px',
                borderRadius: '24px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-soft)',
                boxShadow: 'var(--shadow-md)',
                position: 'relative',
                overflow: 'hidden',
                marginBottom: '32px'
            }}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '200px', background: 'var(--primary-soft)', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.3, zIndex: 0 }}></div>

                <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ flex: '0 0 160px' }}>
                        <div style={{ width: '160px', height: '160px', borderRadius: '20px', overflow: 'hidden', border: '4px solid var(--bg-main)', boxShadow: 'var(--shadow-lg)' }}>
                            {user?.photo ? (
                                <img src={`${import.meta.env.VITE_API_URL || ''}${user.photo}?t=${Date.now()}`} alt="Student Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                            ) : (
                                <div style={{ width: '100%', height: '100%', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <UserCircle size={100} color="var(--primary-bold)" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ flex: '1', minWidth: '300px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', color: 'var(--text-main)' }}>{user?.name || '—'}</h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '1rem', fontWeight: '700', color: 'var(--primary-bold)', textTransform: 'uppercase' }}>Enrolled Student</p>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginTop: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}><IdCard size={18} /></div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)' }}>REGISTRATION ID</p>
                                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', fontFamily: 'monospace' }}>{user?.studentId || '—'}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}><Hash size={18} /></div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)' }}>ROLL NUMBER</p>
                                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>{user?.rollNumber || '—'}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}><GraduationCap size={18} /></div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)' }}>CLASS</p>
                                    <div style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}><StudentClassDisplay classId={user?.classId} /></div>
                                </div>
                            </div>
                            {user?.banglarSikkhaId && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}><Fingerprint size={18} /></div>
                                    <div>
                                        <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)' }}>BANGLAR SIKKHA ID</p>
                                        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>{user.banglarSikkhaId}</p>
                                    </div>
                                </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}><Calendar size={18} /></div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)' }}>ACADEMIC YEAR</p>
                                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>{new Date().getFullYear()}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {pendingAssignments.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <BookOpenCheck size={20} color="var(--primary-bold)" /> Active Assignments
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {pendingAssignments.map(hw => (
                            <AssignmentBanner key={hw.id} assignment={hw} />
                        ))}
                    </div>
                </div>
            )}

            {unreadCount > 0 && (
                <div
                    onClick={() => {
                        onClearNotices();
                        navigate('/student/notices');
                    }}
                    style={{
                        background: 'var(--primary-soft)',
                        border: '1px solid var(--primary-bold)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '16px 24px',
                        marginBottom: '24px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        animation: 'pulse-subtle 2s infinite',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)'
                    }}>
                        <BellRing size={20} />
                    </div>
                    <div>
                        <h4 style={{ margin: 0, color: 'var(--primary-bold)', fontSize: '1rem', fontWeight: '800' }}>
                            Important Announcements!
                        </h4>
                        <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.85rem', opacity: 0.8 }}>
                            You have {unreadCount} new announcement{unreadCount > 1 ? 's' : ''} waiting for you.
                        </p>
                    </div>
                    <div style={{ marginLeft: 'auto', fontWeight: '700', color: 'var(--primary-bold)', fontSize: '0.85rem' }}>
                        View Notices →
                    </div>
                </div>
            )}

            <div className="stats-grid">
                <div className="stat-card">
                    <h3>{stats.averageGrade}%</h3>
                    <p>Overall Grade</p>
                </div>
                <div className="stat-card" style={{ borderLeftColor: 'var(--success)' }}>
                    <h3>{stats.attendanceRate}%</h3>
                    <p>Attendance Rate</p>
                </div>
                <div className="stat-card" style={{ borderLeftColor: 'var(--accent)' }}>
                    <h3>{stats.activeSubjects}</h3>
                    <p>Course Modules</p>
                </div>
            </div>
        </>
    );
};

export default StudentOverview;
