import { useState, useEffect } from 'react';
import { BellRing } from 'lucide-react';
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

    if (loading) return <div className="loading-state">Loading notices...</div>;

    return (
        <div className="component-container fade-in">
            <div className="component-header">
                <h3><BellRing size={20} style={{marginRight: '8px', verticalAlign: 'middle'}}/> Notice Board</h3>
                <p style={{color: 'var(--text-muted)'}}>Stay updated with the latest announcements</p>
            </div>

            <div className="notice-list mt-4" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {notices.length === 0 ? (
                    <div className="empty-state" style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-main)', borderRadius: '12px' }}>
                        No notices available at this time.
                    </div>
                ) : (
                    notices.map(notice => (
                        <div key={notice.id} style={{ 
                            background: 'var(--bg-card)', 
                            padding: '1.5rem', 
                            borderRadius: '12px',
                            borderLeft: `4px solid ${notice.type === 'PUBLIC' ? 'var(--primary)' : 'var(--accent)'}`,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-bold)' }}>{notice.title}</h4>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                    {new Date(notice.createdAt).toLocaleDateString('en-IN')}
                                </span>
                            </div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-main)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', marginBottom: '12px' }}>
                                {notice.type === 'PUBLIC' ? 'Public Announcement' : 'Internal Circular'}
                            </div>
                            <p style={{ margin: 0, color: 'var(--text-medium)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
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
