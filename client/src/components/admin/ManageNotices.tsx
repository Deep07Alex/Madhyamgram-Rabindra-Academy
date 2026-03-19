import { useState, useEffect } from 'react';
import { 
    Plus, 
    Trash2, 
    Users as UsersIcon, 
    GraduationCap, 
    Megaphone, 
    X, 
    Send, 
    Globe, 
    Lock,
    Calendar,
    Target,
    User
} from 'lucide-react';
import api from '../../services/api';

interface Notice {
    id: string;
    title: string;
    content: string;
    type: 'PUBLIC' | 'INTERNAL';
    targetAudience: 'ALL' | 'TEACHER' | 'STUDENT';
    targetClassId: string | null;
    targetStudentId: string | null;
    expiresAt: string | null;
    createdAt: string;
}

interface Class {
    id: string;
    name: string;
}

interface Student {
    id: string;
    name: string;
    classId: string;
}

const ManageNotices = () => {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        type: 'PUBLIC' as 'PUBLIC' | 'INTERNAL',
        targetAudience: 'ALL' as 'ALL' | 'TEACHER' | 'STUDENT',
        targetClassId: '',
        targetStudentId: '',
        expiresAt: ''
    });

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [noticesRes, classesRes, studentsRes] = await Promise.all([
                    api.get('/notices'),
                    api.get('/users/classes'),
                    api.get('/users/students')
                ]);
                setNotices(noticesRes.data);
                setClasses(classesRes.data);
                // The students API returns full student objects, so we need to map the ID if necessary
                // or just ensure we're using the 'id' field for filtering.
                setStudents(studentsRes.data);
            } catch (error) {
                console.error('Failed to fetch initial data:', error);
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this notice?')) return;
        try {
            await api.delete(`/notices/${id}`);
            setNotices(notices.filter(n => n.id !== id));
        } catch (error) {
            console.error('Failed to delete notice:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = { ...formData };
            if (payload.type === 'PUBLIC') {
                payload.targetAudience = 'ALL';
                payload.targetClassId = '';
                payload.targetStudentId = '';
            }
            if (payload.targetAudience !== 'STUDENT') {
                payload.targetClassId = '';
                payload.targetStudentId = '';
            }

            const res = await api.post('/notices', payload);
            setNotices([res.data, ...notices]);
            setIsFormOpen(false);
            setFormData({
                title: '',
                content: '',
                type: 'PUBLIC',
                targetAudience: 'ALL',
                targetClassId: '',
                targetStudentId: '',
                expiresAt: ''
            });
        } catch (error) {
            console.error('Failed to create notice:', error);
        }
    };

    const filteredStudents = formData.targetClassId 
        ? students.filter(s => s.classId === formData.targetClassId)
        : students;

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                <div style={{ textAlign: 'center' }}>
                    <Megaphone size={40} className="animate-pulse" style={{ color: 'var(--primary-bold)', opacity: 0.5 }} />
                    <p style={{ marginTop: '16px', color: 'var(--text-muted)', fontWeight: '600' }}>Loading announcements...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="manage-section fade-in">
            {/* Header Section */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '40px',
                background: 'var(--bg-card)',
                padding: '24px',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--border-soft)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '12px', 
                        background: 'var(--primary-soft)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                    }}>
                        <Megaphone size={24} color="var(--primary-bold)" />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', fontFamily: 'Outfit' }}>Notice Board</h2>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Broadcast announcements to your academy community</p>
                    </div>
                </div>
                {!isFormOpen && (
                    <button 
                        className="btn-primary" 
                        onClick={() => setIsFormOpen(true)}
                        style={{ padding: '12px 24px', gap: '10px' }}
                    >
                        <Plus size={18} /> New Announcement
                    </button>
                )}
            </div>

            {/* Creation Form Section */}
            {isFormOpen && (
                <div className="card" style={{ 
                    animation: 'fadeIn 0.3s ease-out',
                    background: 'var(--glass-bg)',
                    backdropFilter: 'var(--glass-blur)',
                    border: '1px solid var(--glass-border)',
                    boxShadow: 'var(--shadow-premium)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                        <h3 style={{ margin: 0 }}>Create New Announcement</h3>
                        <button 
                            onClick={() => setIsFormOpen(false)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="form-grid">
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Notice Title</label>
                            <input 
                                type="text" 
                                required 
                                value={formData.title}
                                onChange={e => setFormData({...formData, title: e.target.value})}
                                placeholder="E.g., Special Holiday Announcement"
                            />
                        </div>

                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Announcement Details</label>
                            <textarea 
                                required 
                                rows={4}
                                value={formData.content}
                                onChange={e => setFormData({...formData, content: e.target.value})}
                                placeholder="Provide the detailed content of the notice..."
                                style={{ minHeight: '120px' }}
                            />
                        </div>

                        <div className="form-group">
                            <label>Visibility Type</label>
                            <div style={{ position: 'relative' }}>
                                <select 
                                    value={formData.type}
                                    onChange={e => setFormData({...formData, type: e.target.value as 'PUBLIC' | 'INTERNAL'})}
                                    style={{ paddingLeft: '40px' }}
                                >
                                    <option value="PUBLIC">Public (Landing Page)</option>
                                    <option value="INTERNAL">Internal (Dashboard Only)</option>
                                </select>
                                {formData.type === 'PUBLIC' ? (
                                    <Globe size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary-bold)' }} />
                                ) : (
                                    <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary-bold)' }} />
                                )}
                            </div>
                        </div>

                        {formData.type === 'INTERNAL' && (
                            <div className="form-group">
                                <label>Target Audience</label>
                                <div style={{ position: 'relative' }}>
                                    <select 
                                        value={formData.targetAudience}
                                        onChange={e => setFormData({
                                            ...formData, 
                                            targetAudience: e.target.value as 'ALL' | 'TEACHER' | 'STUDENT',
                                            targetClassId: '',
                                            targetStudentId: ''
                                        })}
                                        style={{ paddingLeft: '40px' }}
                                    >
                                        <option value="ALL">Everyone</option>
                                        <option value="TEACHER">Teaching Staff</option>
                                        <option value="STUDENT">Students</option>
                                    </select>
                                    <Target size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary-bold)' }} />
                                </div>
                            </div>
                        )}

                        {formData.type === 'INTERNAL' && formData.targetAudience === 'STUDENT' && (
                            <>
                                <div className="form-group">
                                    <label>Filter by Class (Optional)</label>
                                    <select 
                                        value={formData.targetClassId}
                                        onChange={e => setFormData({...formData, targetClassId: e.target.value, targetStudentId: ''})}
                                    >
                                        <option value="">All Classes</option>
                                        {classes.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Individual Student (Optional)</label>
                                    <select 
                                        value={formData.targetStudentId}
                                        onChange={e => setFormData({...formData, targetStudentId: e.target.value})}
                                        disabled={!formData.targetClassId}
                                    >
                                        <option value="">All Students in Class</option>
                                        {filteredStudents.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}

                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Auto-Expiration Date & Time (Optional)</label>
                            <div style={{ position: 'relative' }}>
                                <input 
                                    type="datetime-local" 
                                    value={formData.expiresAt}
                                    onChange={e => setFormData({...formData, expiresAt: e.target.value})}
                                    style={{ paddingLeft: '40px' }}
                                />
                                <Calendar size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary-bold)' }} />
                            </div>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Notice will be automatically hidden from students/teachers after this time. Leave empty for manual deletion.</p>
                        </div>

                        <div style={{ gridColumn: 'span 2', display: 'flex', gap: '16px', marginTop: '16px', justifyContent: 'flex-end' }}>
                            <button 
                                type="button" 
                                className="btn-danger" 
                                style={{ background: 'var(--bg-main)', border: '1px solid var(--border-soft)', color: 'var(--text-muted)' }}
                                onClick={() => setIsFormOpen(false)}
                            >
                                <X size={16} /> Discard Draft
                            </button>
                            <button type="submit" className="btn-primary" style={{ minWidth: '180px' }}>
                                <Send size={16} /> Broadcast Notice
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Notices Table Section */}
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Archived Announcements</h3>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <span className="badge" style={{ background: 'var(--bg-main)', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                            {notices.length} Total
                        </span>
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ paddingLeft: '32px' }}>Broadcast Date</th>
                                <th>Subject & Access</th>
                                <th>Destination</th>
                                <th style={{ textAlign: 'right', paddingRight: '32px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {notices.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                                        <Megaphone size={40} style={{ opacity: 0.2, marginBottom: '16px' }} />
                                        <p style={{ fontWeight: 600 }}>No announcements found in the database.</p>
                                    </td>
                                </tr>
                            ) : (
                                notices.map((notice, idx) => (
                                    <tr key={notice.id} style={{ animation: `fadeIn 0.4s ease-out ${idx * 0.05}s` }}>
                                        <td style={{ paddingLeft: '32px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                <Calendar size={14} />
                                                {new Date(notice.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-main)', marginBottom: '4px' }}>{notice.title}</div>
                                            <span style={{ 
                                                display: 'inline-flex', 
                                                alignItems: 'center', 
                                                gap: '6px', 
                                                fontSize: '0.7rem', 
                                                fontWeight: '700',
                                                padding: '2px 8px',
                                                borderRadius: '20px',
                                                background: notice.type === 'PUBLIC' ? 'var(--primary-soft)' : '#fef3c7',
                                                color: notice.type === 'PUBLIC' ? 'var(--primary-bold)' : '#b45309'
                                            }}>
                                                {notice.type === 'PUBLIC' ? <Globe size={10} /> : <Lock size={10} />}
                                                {notice.type === 'PUBLIC' ? 'PUBLIC DOMAIN' : 'INTERNAL NETWORK'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ 
                                                    width: '32px', 
                                                    height: '32px', 
                                                    borderRadius: '8px', 
                                                    background: 'var(--bg-main)', 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center',
                                                    color: 'var(--primary-bold)'
                                                }}>
                                                    {notice.targetAudience === 'ALL' && <UsersIcon size={16}/>}
                                                    {notice.targetAudience === 'TEACHER' && <GraduationCap size={16}/>}
                                                    {notice.targetAudience === 'STUDENT' && <User size={16}/>}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                                                        {notice.targetAudience === 'ALL' && 'Academy-wide'}
                                                        {notice.targetAudience === 'TEACHER' && 'Faculty Members'}
                                                        {notice.targetAudience === 'STUDENT' && 'Students Portfolio'}
                                                    </div>
                                                    {notice.targetAudience === 'STUDENT' && (
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                            {notice.targetClassId 
                                                                ? `${classes.find(c => c.id === notice.targetClassId)?.name || 'Class'}` 
                                                                : 'All Classes'}
                                                            {notice.targetStudentId && ` • Individual Alert`}
                                                        </div>
                                                    )}
                                                    {notice.expiresAt && (
                                                        <div style={{ 
                                                            fontSize: '0.7rem', 
                                                            marginTop: '4px',
                                                            color: new Date(notice.expiresAt) < new Date() ? 'var(--danger)' : 'var(--success)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            fontWeight: '700'
                                                        }}>
                                                            <Calendar size={10} />
                                                            {new Date(notice.expiresAt) < new Date() 
                                                                ? `Expired: ${new Date(notice.expiresAt).toLocaleString()}` 
                                                                : `Expires: ${new Date(notice.expiresAt).toLocaleString()}`}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right', paddingRight: '32px' }}>
                                            <button 
                                                className="btn-danger btn-sm" 
                                                onClick={() => handleDelete(notice.id)}
                                                style={{ padding: '8px', borderRadius: '8px' }}
                                                title="Remove Announcement"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ManageNotices;
