import { useState, useEffect } from 'react';
import { Plus, Trash2, Users as UsersIcon, GraduationCap } from 'lucide-react';
import api from '../../services/api';

interface Notice {
    id: string;
    title: string;
    content: string;
    type: 'PUBLIC' | 'INTERNAL';
    targetAudience: 'ALL' | 'TEACHER' | 'STUDENT';
    targetClassId: string | null;
    targetStudentId: string | null;
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
    
    // Form state
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        type: 'PUBLIC' as 'PUBLIC' | 'INTERNAL',
        targetAudience: 'ALL' as 'ALL' | 'TEACHER' | 'STUDENT',
        targetClassId: '',
        targetStudentId: ''
    });

    useEffect(() => {
        fetchNotices();
        fetchClasses();
        fetchStudents();
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

    const fetchClasses = async () => {
        try {
            const res = await api.get('/dashboard/classes');
            setClasses(res.data);
        } catch (error) {
            console.error('Failed to fetch classes:', error);
        }
    };

    const fetchStudents = async () => {
        try {
            const res = await api.get('/dashboard/users?role=student');
            setStudents(res.data);
        } catch (error) {
            console.error('Failed to fetch students:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this notice?')) return;
        try {
            await api.delete(`/notices/${id}`);
            setNotices(notices.filter(n => n.id !== id));
        } catch (error) {
            console.error('Failed to delete notice:', error);
            alert('Failed to delete notice.');
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
                targetStudentId: ''
            });
        } catch (error) {
            console.error('Failed to create notice:', error);
            alert('Failed to create notice.');
        }
    };

    // Filter students if a class is selected
    const filteredStudents = formData.targetClassId 
        ? students.filter(s => s.classId === formData.targetClassId)
        : students;

    if (loading) return <div className="loading-state">Loading notices...</div>;

    return (
        <div className="component-container fade-in">
            <div className="component-header">
                <h3>Notice Board Management</h3>
                <button className="primary-btn" onClick={() => setIsFormOpen(!isFormOpen)}>
                    <Plus size={18} /> {isFormOpen ? 'Cancel' : 'New Notice'}
                </button>
            </div>

            {isFormOpen && (
                <div className="form-card mb-4">
                    <h4>Create New Notice</h4>
                    <form onSubmit={handleSubmit} className="standard-form">
                        <div className="form-group">
                            <label>Notice Title</label>
                            <input 
                                type="text" 
                                required 
                                value={formData.title}
                                onChange={e => setFormData({...formData, title: e.target.value})}
                                placeholder="E.g., Holiday Announcement"
                            />
                        </div>

                        <div className="form-group">
                            <label>Notice Content</label>
                            <textarea 
                                required 
                                rows={4}
                                value={formData.content}
                                onChange={e => setFormData({...formData, content: e.target.value})}
                                placeholder="Write the notice details here..."
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Notice Type</label>
                                <select 
                                    value={formData.type}
                                    onChange={e => setFormData({...formData, type: e.target.value as 'PUBLIC' | 'INTERNAL'})}
                                >
                                    <option value="PUBLIC">Public (Landing Page)</option>
                                    <option value="INTERNAL">Internal (Dashboard Only)</option>
                                </select>
                            </div>

                            {formData.type === 'INTERNAL' && (
                                <div className="form-group">
                                    <label>Target Audience</label>
                                    <select 
                                        value={formData.targetAudience}
                                        onChange={e => setFormData({
                                            ...formData, 
                                            targetAudience: e.target.value as 'ALL' | 'TEACHER' | 'STUDENT',
                                            targetClassId: '',
                                            targetStudentId: ''
                                        })}
                                    >
                                        <option value="ALL">All Staff & Students</option>
                                        <option value="TEACHER">All Teachers</option>
                                        <option value="STUDENT">Students</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {formData.type === 'INTERNAL' && formData.targetAudience === 'STUDENT' && (
                            <div className="form-row mt-2">
                                <div className="form-group">
                                    <label>Specific Class (Optional)</label>
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
                                    <label>Specific Student (Optional)</label>
                                    <select 
                                        value={formData.targetStudentId}
                                        onChange={e => setFormData({...formData, targetStudentId: e.target.value})}
                                        disabled={!formData.targetClassId} // Often helpful to filter by class first, but not strictly required
                                    >
                                        <option value="">All Students in selection</option>
                                        {filteredStudents.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                    {!formData.targetClassId && <small style={{color:'var(--text-muted)'}}>Select a class first to pick a student</small>}
                                </div>
                            </div>
                        )}

                        <div className="form-actions mt-4">
                            <button type="button" className="secondary-btn" onClick={() => setIsFormOpen(false)}>Cancel</button>
                            <button type="submit" className="primary-btn">Publish Notice</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="data-table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Title / Type</th>
                            <th>Target</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {notices.length === 0 ? (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>No notices found.</td>
                            </tr>
                        ) : (
                            notices.map(notice => (
                                <tr key={notice.id}>
                                    <td>{new Date(notice.createdAt).toLocaleDateString('en-IN')}</td>
                                    <td>
                                        <div style={{fontWeight: 600}}>{notice.title}</div>
                                        <div style={{fontSize: '0.8rem', color: notice.type==='PUBLIC' ? 'var(--primary)' : 'var(--accent)'}}>
                                            {notice.type}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem'}}>
                                            {notice.targetAudience === 'ALL' && <UsersIcon size={14}/>}
                                            {notice.targetAudience === 'TEACHER' && <GraduationCap size={14}/>}
                                            {notice.targetAudience === 'STUDENT' && <UsersIcon size={14}/>}
                                            
                                            {notice.targetAudience === 'ALL' && 'Everyone'}
                                            {notice.targetAudience === 'TEACHER' && 'Teachers Only'}
                                            {notice.targetAudience === 'STUDENT' && (
                                                <span>
                                                    Students 
                                                    {notice.targetClassId && ` > ${classes.find(c => c.id === notice.targetClassId)?.name || 'Class'}`}
                                                    {notice.targetStudentId && ` > Spec. Student`}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <button 
                                            className="action-btn text-danger" 
                                            onClick={() => handleDelete(notice.id)}
                                            title="Delete Notice"
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
    );
};

export default ManageNotices;
