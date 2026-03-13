import { useState, useEffect } from 'react';
import { BellRing, Calendar, Globe, Lock, Megaphone } from 'lucide-react';
import api from '../../services/api';

interface Notice {
    id: string;
    title: string;
    content: string;
    type: 'PUBLIC' | 'INTERNAL';
    createdAt: string;
}

const NoticeBoard = () => {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotices();
    }, []);

    const fetchNotices = async () => {
        try {
            const res = await api.get('/notices');
            setNotices(res.data);
        } catch (error) {
            console.error('Failed to fetch notices:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="animate-pulse" style={{ color: 'var(--primary-bold)', opacity: 0.5 }}>
                        <Megaphone size={32} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="manage-section fade-in">
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                marginBottom: '28px' 
            }}>
                <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '10px', 
                    background: 'var(--primary-soft)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                }}>
                    <BellRing size={20} color="var(--primary-bold)" />
                </div>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', fontFamily: 'Outfit' }}>Official Notifications</h2>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>Stay updated with the latest academy announcements</p>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {notices.length === 0 ? (
                    <div style={{ 
                        padding: '48px 20px', 
                        textAlign: 'center', 
                        background: 'var(--bg-card)', 
                        borderRadius: 'var(--radius-lg)',
                        border: '1px dashed var(--border-soft)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '16px'
                    }}>
                        <Megaphone size={32} style={{ opacity: 0.1 }} />
                        <p style={{ color: 'var(--text-muted)', fontWeight: '600', margin: 0 }}>No announcements currently published.</p>
                    </div>
                ) : (
                    notices.map((notice, idx) => (
                        <div key={notice.id} style={{ 
                            background: 'var(--bg-card)', 
                            padding: '24px', 
                            borderRadius: 'var(--radius-lg)',
                            boxShadow: 'var(--shadow-sm)',
                            border: '1px solid var(--border-soft)',
                            borderLeft: `5px solid ${notice.type === 'PUBLIC' ? 'var(--primary-bold)' : 'var(--accent)'}`,
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                            animation: `fadeIn 0.4s ease-out ${idx * 0.05}s`,
                            cursor: 'default'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '16px' }}>
                                <div>
                                    <h4 style={{ 
                                        margin: '0 0 8px 0', 
                                        fontSize: '1.15rem', 
                                        fontWeight: '700', 
                                        fontFamily: 'Outfit',
                                        color: 'var(--text-main)',
                                        lineHeight: '1.3'
                                    }}>
                                        {notice.title}
                                    </h4>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        <span style={{ 
                                            fontSize: '0.7rem', 
                                            fontWeight: '700', 
                                            padding: '2px 10px', 
                                            borderRadius: '20px', 
                                            background: 'var(--bg-main)', 
                                            color: 'var(--text-muted)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            border: '1px solid var(--border-soft)'
                                        }}>
                                            <Calendar size={10} />
                                            {new Date(notice.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                        <span style={{ 
                                            fontSize: '0.7rem', 
                                            fontWeight: '700', 
                                            padding: '2px 10px', 
                                            borderRadius: '20px', 
                                            background: notice.type === 'PUBLIC' ? 'var(--primary-soft)' : '#fef3c7', 
                                            color: notice.type === 'PUBLIC' ? 'var(--primary-bold)' : '#b45309',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            {notice.type === 'PUBLIC' ? <Globe size={10} /> : <Lock size={10} />}
                                            {notice.type === 'PUBLIC' ? 'PUBLIC' : 'INTERNAL'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <p style={{ 
                                margin: 0, 
                                color: 'var(--text-main)', 
                                lineHeight: '1.7', 
                                fontSize: '0.95rem',
                                whiteSpace: 'pre-wrap',
                                opacity: 0.9
                            }}>
                                {notice.content}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default NoticeBoard;
