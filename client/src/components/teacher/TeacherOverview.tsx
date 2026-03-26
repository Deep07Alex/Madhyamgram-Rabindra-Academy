/**
 * Teacher Overview Component
 * 
 * The workspace summary for faculty members.
 * Features:
 * - Real-time daily attendance status tracking.
 * - Privacy-focused Aadhar display (masked by default).
 * - Comprehensive profile details including qualifications and designation.
 * - Classroom and submission metrics.
 */
import { useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BellRing,
    UserCircle,
    Phone,
    Fingerprint,
    GraduationCap,
    Award,
    Eye,
    EyeOff
} from 'lucide-react';

export interface TeacherOverviewProps {
    user: any;
    profile?: any;
    stats: {
        assignedClasses: number;
        pendingSubmissions: number;
        attendanceRate: number;
    };
    todayAttendance?: any;
    unreadCount: number;
    onClearNotices: () => void;
}

const TeacherOverview: FC<TeacherOverviewProps> = ({
    user,
    profile,
    stats,
    todayAttendance,
    unreadCount,
    onClearNotices
}: TeacherOverviewProps) => {
    const navigate = useNavigate();
    const [showFullAadhar, setShowFullAadhar] = useState(false);

    return (
        <>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
                {unreadCount > 0 && (
                    <div
                        onClick={() => {
                            onClearNotices();
                            navigate('/teacher/notices');
                        }}
                        style={{
                            background: 'var(--primary-soft)',
                            border: '1px solid var(--primary-bold)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '16px 24px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            flex: '1',
                            minWidth: '300px',
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
                                Faculty Announcements
                            </h4>
                            <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.85rem', opacity: 0.8 }}>
                                You have {unreadCount} new update{unreadCount > 1 ? 's' : ''} waiting.
                            </p>
                        </div>
                    </div>
                )}

                {todayAttendance && (
                    <div style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-soft)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '16px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        flex: '1',
                        minWidth: '300px',
                        boxShadow: 'var(--shadow-sm)'
                    }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            background: todayAttendance.status === 'PRESENT' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: todayAttendance.status === 'PRESENT' ? '#16a34a' : '#dc2626'
                        }}>
                             <UserCircle size={20} />
                        </div>
                        <div>
                            <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: '800' }}>
                                Today: {todayAttendance.status}
                            </h4>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                {todayAttendance.status === 'PRESENT' 
                                    ? `In: ${todayAttendance.arrivalTime || '--:--'} | Out: ${todayAttendance.departureTime || '--:--'}`
                                    : `Reason: ${todayAttendance.reason || 'N/A'}`
                                }
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <h3>{stats.assignedClasses}</h3>
                    <p>Assigned Classes</p>
                </div>
                <div className="stat-card" style={{ borderLeftColor: 'var(--success)' }}>
                    <h3>{stats.attendanceRate}%</h3>
                    <p>Class Attendance</p>
                </div>
                <div className="stat-card" style={{ borderLeftColor: 'var(--accent)' }}>
                    <h3>{stats.pendingSubmissions}</h3>
                    <p>Pending Submissions</p>
                </div>
            </div>

            {(profile || user) && (
                <div className="card" style={{ marginTop: '32px', padding: '32px', borderRadius: '24px', background: 'var(--bg-card)', border: '1px solid var(--border-soft)', boxShadow: 'var(--shadow-md)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '200px', background: 'var(--primary-soft)', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.3, zIndex: 0 }}></div>

                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '0 0 160px' }}>
                            <div style={{ width: '160px', height: '160px', borderRadius: '20px', overflow: 'hidden', border: '4px solid var(--bg-main)', boxShadow: 'var(--shadow-lg)' }}>
                                {(profile?.photo || user?.photo) ? (
                                    <img src={`${import.meta.env.VITE_API_URL || ''}${profile?.photo || user?.photo}?t=${Date.now()}`} alt="Dashboard Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
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
                                    <h3 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', color: 'var(--text-main)' }}>{profile?.name || user?.name}</h3>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '1rem', fontWeight: '700', color: 'var(--primary-bold)', textTransform: 'uppercase' }}>{profile?.designation || user?.designation}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>MEMBER SINCE</p>
                                    <p style={{ margin: 0, fontWeight: '800', color: 'var(--text-main)', fontSize: '0.95rem' }}>
                                        {profile?.joiningDate || user?.joiningDate
                                            ? new Date(profile?.joiningDate || user?.joiningDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
                                            : 'N/A'}
                                    </p>
                                    <div style={{ marginTop: '8px' }}>
                                        {/* Badge Logic: Identifies if the faculty is Teaching, Non-Teaching, or Admin */}
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
                                            {['PRINCIPAL', 'HEAD MISTRESS'].includes(profile?.designation || user?.designation)
                                                ? 'ADMIN'
                                                : ((profile?.isTeaching ?? user?.isTeaching) ? 'TEACHING' : 'NON-TEACHING')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}><UserCircle size={18} /></div>
                                    <div>
                                        <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)' }}>LOGIN ID</p>
                                        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-main)' }}>{profile?.teacherId || user?.teacherId || 'N/A'}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}><Phone size={18} /></div>
                                    <div>
                                        <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)' }}>PHONE</p>
                                        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>{profile?.phone || user?.phone || 'N/A'}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}><Fingerprint size={18} /></div>
                                    <div>
                                        <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)' }}>AADHAR</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>
                                                {(profile?.aadhar || user?.aadhar)
                                                    ? (showFullAadhar ? (profile?.aadhar || user?.aadhar) : `XXXX XXXX ${(profile?.aadhar || user?.aadhar).slice(-4)}`)
                                                    : 'N/A'
                                                }
                                            </p>
                                            {(profile?.aadhar || user?.aadhar) && (
                                                <button
                                                    onClick={() => setShowFullAadhar(!showFullAadhar)}
                                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', opacity: 0.7 }}
                                                    title={showFullAadhar ? "Hide" : "Show"}
                                                >
                                                    {showFullAadhar ? <Eye size={14} /> : <EyeOff size={14} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}><GraduationCap size={18} /></div>
                                    <div>
                                        <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)' }}>QUALIFICATION</p>
                                        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>{profile?.qualification || user?.qualification || 'N/A'}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}><Award size={18} /></div>
                                    <div>
                                        <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)' }}>EXTRA CERTIFICATIONS</p>
                                        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>{profile?.extraQualification || user?.extraQualification || 'N/A'}</p>
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

export default TeacherOverview;
