/**
 * Admin Homework/Assignment Control Center
 * 
 * Provides oversight and management of all academic assignments across the academy.
 * Features:
 * - Assignment Monitoring: See which homework is assigned to which class and by which teacher.
 * - Centralized Management: Edit or delete any assignment globally.
 * - Compliance Audit: Review student submissions and grading status for all work.
 * - Real-time Synchronization: Updates instantly when teachers post or students submit.
 */
import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import useServerEvents from '../../hooks/useServerEvents';
import { 
    BookPlus, 
    Calendar, 
    Trash2, 
    Edit, 
    GraduationCap, 
    Users, 
    Search,
    BookOpen,
    User,
    Eye,
    X,
    Paperclip,
    ExternalLink
} from 'lucide-react';
import CustomSelect from '../common/CustomSelect';
import ConfirmModal from '../common/ConfirmModal';
import FileUploadPicker from '../shared/FileUploadPicker';
import { MAIN_SUBJECTS, SUBJECTS_BY_CLASS } from '../../utils/constants';
import { School, Type } from 'lucide-react';

const ManageHomework = () => {
    const { showToast } = useToast();
    const [homeworkList, setHomeworkList] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterClass, setFilterClass] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modals state
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: '' });
    const [editModal, setEditModal] = useState({ isOpen: false, homework: null as any });
    const [viewTaskModal, setViewTaskModal] = useState({ isOpen: false, homework: null as any });
    const [viewSubmissionsModal, setViewSubmissionsModal] = useState({ isOpen: false, homework: null as any });
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [gradingFeedback, setGradingFeedback] = useState('');
    
    // Creation state
    const [newHomework, setNewHomework] = useState({
        classId: '', title: '', description: '', subject: '', dueDate: '', allowFileUpload: false, isSubmissionRequired: true
    });
    const [attachedFile, setAttachedFile] = useState<File | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const [hwRes, clsRes] = await Promise.all([
                api.get('/homework'),
                api.get('/users/classes')
            ]);
            setHomeworkList(hwRes.data);
            setClasses(clsRes.data);
        } catch (error) {
            console.error('Failed to fetch data:', error);
            showToast('Failed to load homework repository.', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Live sync
    useServerEvents({
        'homework_created': fetchData,
        'homework_deleted': fetchData,
        'homework_updated': fetchData,
        'homework_submitted': () => {
            if (viewSubmissionsModal.isOpen && viewSubmissionsModal.homework) {
                api.get(`/homework/${viewSubmissionsModal.homework.id}/submissions`)
                    .then(res => setSubmissions(res.data));
            }
        }
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('classId', newHomework.classId);
            formData.append('title', newHomework.title);
            formData.append('description', newHomework.description);
            formData.append('subject', newHomework.subject);
            formData.append('dueDate', newHomework.isSubmissionRequired ? newHomework.dueDate : '');
            formData.append('allowFileUpload', String(newHomework.allowFileUpload));
            formData.append('isSubmissionRequired', String(newHomework.isSubmissionRequired));
            if (attachedFile) formData.append('file', attachedFile);

            await api.post('/homework', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showToast('Assignment deployed successfully!', 'success');
            setNewHomework({ classId: '', title: '', description: '', subject: '', dueDate: '', allowFileUpload: false, isSubmissionRequired: true });
            setAttachedFile(null);
            fetchData();
        } catch (error) {
            console.error('Failed to create homework:', error);
            showToast('Failed to deploy assignment.', 'error');
        }
    };

    const handleDelete = async () => {
        if (!deleteModal.id) return;
        try {
            await api.delete(`/homework/${deleteModal.id}`);
            showToast('Assignment successfully removed.', 'success');
            setDeleteModal({ isOpen: false, id: '' });
            fetchData();
        } catch (error) {
            showToast('Failed to remove assignment.', 'error');
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        const hw = editModal.homework;
        try {
            const formData = new FormData();
            formData.append('title', hw.title);
            formData.append('description', hw.description);
            formData.append('subject', hw.subject);
            formData.append('dueDate', hw.isSubmissionRequired ? hw.dueDate : '');
            formData.append('classId', hw.classId);
            formData.append('isSubmissionRequired', String(hw.isSubmissionRequired));
            formData.append('allowFileUpload', String(hw.allowFileUpload));
            if (hw.newFile) {
                formData.append('file', hw.newFile);
            }
            
            await api.patch(`/homework/${hw.id}`, formData);
            showToast('Assignment updated successfully.', 'success');
            setEditModal({ isOpen: false, homework: null });
            fetchData();
        } catch (error) {
            showToast('Failed to update assignment.', 'error');
        }
    };

    const openSubmissions = async (hw: any) => {
        setViewSubmissionsModal({ isOpen: true, homework: hw });
        try {
            const res = await api.get(`/homework/${hw.id}/submissions`);
            setSubmissions(res.data);
        } catch (err) {
            showToast('Failed to load submissions.', 'error');
        }
    };

    const handleGrade = async (submissionId: string, status: string) => {
        try {
            await api.patch(`/homework/submissions/${submissionId}/grade`, { status, feedback: gradingFeedback });
            showToast('Submission status updated.', 'success');
            const res = await api.get(`/homework/${viewSubmissionsModal.homework.id}/submissions`);
            setSubmissions(res.data);
            setGradingFeedback('');
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Failed to update submission.';
            showToast(msg, 'error');
        }
    };

    const filteredHomework = homeworkList.filter(hw => {
        const matchesClass = !filterClass || hw.classId === filterClass;
        const matchesSearch = !searchTerm || 
            hw.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
            hw.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            hw.teacher?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesClass && matchesSearch;
    });

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                <div style={{ textAlign: 'center' }}>
                    <BookOpen size={40} className="animate-pulse" style={{ color: 'var(--primary-bold)', opacity: 0.5 }} />
                    <p style={{ marginTop: '16px', color: 'var(--text-muted)', fontWeight: '600' }}>Accessing centralized assignment repository...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="manage-section fade-in">
            <div className="card" style={{ marginBottom: '32px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)' }}>
                    <BookPlus size={20} color="var(--primary-bold)" />
                    Establish New Administrative Assignment
                </h3>
                <form onSubmit={handleCreate} className="form-grid">
                    <CustomSelect 
                        label="Target Grade"
                        value={newHomework.classId}
                        onChange={val => setNewHomework({ ...newHomework, classId: val, subject: '' })}
                        options={classes.map((c: any) => ({ value: c.id, label: c.name }))}
                        icon={<School size={16} />}
                        placeholder={classes.length === 0 ? "Loading Classes..." : "Choose Class..."}
                    />
                    <CustomSelect 
                        label="Subject Domain"
                        value={newHomework.subject}
                        onChange={val => setNewHomework({ ...newHomework, subject: val })}
                        options={(SUBJECTS_BY_CLASS[classes.find((c: any) => c.id === newHomework.classId)?.name || ''] || MAIN_SUBJECTS).map(sub => ({ value: sub, label: sub }))}
                        icon={<GraduationCap size={16} />}
                    />
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label>Assignment Objective</label>
                        <div style={{ position: 'relative' }}>
                            <Type size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                            <textarea
                                placeholder="e.g. Solve the first 10 problems of Chapter 3"
                                value={newHomework.title}
                                onChange={e => setNewHomework({ ...newHomework, title: e.target.value })}
                                required
                                rows={2}
                                style={{ width: '100%', paddingLeft: '40px', padding: '12px 12px 12px 40px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-soft)', fontSize: '0.9rem', outline: 'none', resize: 'vertical', transition: 'var(--transition-fast)', boxSizing: 'border-box', fontFamily: 'inherit' }}
                            />
                        </div>
                    </div>
                    
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label
                            onClick={() => setNewHomework(p => ({ ...p, isSubmissionRequired: !p.isSubmissionRequired }))}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '14px 18px', borderRadius: 'var(--radius-md)',
                                border: `2px solid ${newHomework.isSubmissionRequired ? 'var(--primary)' : 'var(--border-soft)'}`,
                                background: newHomework.isSubmissionRequired ? 'var(--primary-soft)' : 'var(--bg-main)',
                                cursor: 'pointer', transition: 'all 0.2s',
                            }}
                        >
                            <div style={{
                                width: '42px', height: '24px', borderRadius: '12px',
                                background: newHomework.isSubmissionRequired ? 'var(--primary)' : '#cbd5e1',
                                position: 'relative', transition: 'background 0.2s', flexShrink: 0
                            }}>
                                <div style={{
                                    position: 'absolute', top: '3px',
                                    left: newHomework.isSubmissionRequired ? '21px' : '3px',
                                    width: '18px', height: '18px', borderRadius: '50%',
                                    background: 'var(--bg-card)', transition: 'left 0.2s',
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                                }} />
                            </div>
                            <div>
                                <p style={{ margin: 0, fontWeight: '800', fontSize: '0.875rem', color: newHomework.isSubmissionRequired ? 'var(--primary)' : 'var(--text-main)' }}>
                                    Requires Student Answer/Submission
                                </p>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {newHomework.isSubmissionRequired
                                        ? 'Students must provide an answer or file. Includes a deadline and grading.'
                                        : 'Informational only. Students just view materials, no submission or grading.'}
                                </p>
                            </div>
                        </label>
                    </div>

                    {newHomework.isSubmissionRequired && (
                        <div className="form-group">
                            <label>Submission Deadline</label>
                            <div style={{ position: 'relative' }}>
                                <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input type="date" value={newHomework.dueDate} onClick={(e) => (e.target as any).showPicker?.()} onChange={e => setNewHomework({ ...newHomework, dueDate: e.target.value })} required style={{ paddingLeft: '40px' }} />
                            </div>
                        </div>
                    )}

                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label>Detailed Guidelines & Instructions</label>
                        <textarea
                            placeholder="Specify learning outcomes and required materials..."
                            value={newHomework.description}
                            onChange={e => setNewHomework({ ...newHomework, description: e.target.value })}
                            rows={3}
                            style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-soft)', fontSize: '0.9rem', outline: 'none', transition: 'var(--transition-fast)' }}
                        ></textarea>
                    </div>
                    <div className="form-group">
                        <FileUploadPicker
                            file={attachedFile}
                            onChange={setAttachedFile}
                            label="Attach Reference File for Students (Optional)"
                            hint="Select reference materials — up to 50 MB"
                        />
                    </div>
                    {newHomework.isSubmissionRequired && (
                        <div className="form-group">
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'transparent', marginBottom: '8px', userSelect: 'none' }}>
                                Spacing Label
                            </label>
                            <label
                                onClick={() => setNewHomework(p => ({ ...p, allowFileUpload: !p.allowFileUpload }))}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    padding: '14px 18px', borderRadius: 'var(--radius-md)',
                                    border: `2px solid ${newHomework.allowFileUpload ? 'var(--primary)' : 'var(--border-soft)'}`,
                                    background: newHomework.allowFileUpload ? 'var(--primary-soft)' : 'var(--bg-main)',
                                    cursor: 'pointer', transition: 'all 0.2s',
                                }}
                            >
                                <div style={{
                                    width: '42px', height: '24px', borderRadius: '12px',
                                    background: newHomework.allowFileUpload ? 'var(--primary)' : '#cbd5e1',
                                    position: 'relative', transition: 'background 0.2s', flexShrink: 0
                                }}>
                                    <div style={{
                                        position: 'absolute', top: '3px',
                                        left: newHomework.allowFileUpload ? '21px' : '3px',
                                        width: '18px', height: '18px', borderRadius: '50%',
                                        background: 'var(--bg-card)', transition: 'left 0.2s',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                                    }} />
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontWeight: '800', fontSize: '0.875rem', color: newHomework.allowFileUpload ? 'var(--primary)' : 'var(--text-main)' }}>
                                        Allow Students to Upload Files
                                    </p>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {newHomework.allowFileUpload
                                            ? 'Students will see a file upload option in their submission form'
                                            : 'Students can only submit a written text response'}
                                    </p>
                                </div>
                            </label>
                        </div>
                    )}
                    <div className="form-group" style={{ alignSelf: 'end' }}>
                        <button type="submit" className="btn-primary" style={{ width: '100%', height: '48px' }}>
                            <BookPlus size={18} /> Deploy Assignment
                        </button>
                    </div>
                </form>
            </div>

            {/* Header */}
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
                        <BookPlus size={24} color="var(--primary-bold)" />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', fontFamily: 'Outfit' }}>Assignment Management</h2>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>See and control all academic tasks across the academy</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Search Repository</label>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input 
                                type="text" 
                                placeholder="Search by title, subject, or teacher..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ paddingLeft: '40px' }}
                            />
                        </div>
                    </div>
                    <CustomSelect 
                        label="Filter by Grade"
                        value={filterClass}
                        onChange={setFilterClass}
                        options={[
                            { value: '', label: 'All Classes' },
                            ...classes.map(c => ({ value: c.id, label: c.name }))
                        ]}
                        icon={<Users size={16} />}
                        placeholder="All Classes"
                    />
                </div>
            </div>

            {/* Content Table */}
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ paddingLeft: '32px' }}>Topic & Subject</th>
                                <th>Grade & Teacher</th>
                                <th style={{ textAlign: 'center' }}>Requirement</th>
                                <th style={{ textAlign: 'center' }}>Deadline</th>
                                <th style={{ textAlign: 'right', paddingRight: '32px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredHomework.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>
                                        <BookOpen size={40} style={{ opacity: 0.2, marginBottom: '16px' }} />
                                        <p style={{ fontWeight: 600 }}>No matching assignments found.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredHomework.map((hw, idx) => (
                                    <tr key={hw.id} style={{ animation: `fadeIn 0.4s ease-out ${idx * 0.05}s` }}>
                                        <td style={{ paddingLeft: '32px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ fontWeight: '800', fontSize: '1rem' }}>{hw.title}</div>
                                                {hw.fileUrl && (
                                                    <a href={`${import.meta.env.VITE_API_URL || ''}${hw.fileUrl}`} target="_blank" rel="noreferrer" title="View teacher attachment" style={{ color: 'var(--primary-bold)' }}>
                                                        <Paperclip size={14} />
                                                    </a>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                                <GraduationCap size={12} /> {hw.subject}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span className="badge" style={{ background: 'var(--primary-soft)', color: 'var(--primary-bold)' }}>{hw.class?.name}</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                    <User size={12} /> {hw.teacher?.name}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{ 
                                                fontSize: '0.65rem', 
                                                fontWeight: '800', 
                                                padding: '4px 10px', 
                                                borderRadius: '20px',
                                                background: hw.isSubmissionRequired ? '#eff6ff' : '#f0fdf4',
                                                color: hw.isSubmissionRequired ? '#1d4ed8' : '#15803d',
                                                textTransform: 'uppercase'
                                            }}>
                                                {hw.isSubmissionRequired ? 'Submission Required' : 'Informational Only'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {hw.isSubmissionRequired ? (
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                    <Calendar size={14} /> {new Date(hw.dueDate).toLocaleDateString()}
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>—</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right', paddingRight: '32px', whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button onClick={() => setViewTaskModal({ isOpen: true, homework: hw })} className="btn-primary btn-sm" style={{ padding: '8px', borderRadius: '10px', background: 'var(--bg-main)', color: 'var(--primary-bold)', border: '1px solid var(--border-soft)' }} title="View Task Details">
                                                    <BookOpen size={16} />
                                                </button>
                                                {hw.isSubmissionRequired && (
                                                    <button onClick={() => openSubmissions(hw)} className="btn-primary btn-sm" style={{ padding: '8px', borderRadius: '10px', background: 'var(--bg-main)', color: 'var(--primary-bold)', border: '1px solid var(--primary-soft)' }} title="Audit Submissions">
                                                        <Eye size={16} />
                                                    </button>
                                                )}
                                                <button onClick={() => setEditModal({ isOpen: true, homework: { ...hw, classId: hw.classId || '' } })} className="btn-primary btn-sm" style={{ padding: '8px', borderRadius: '10px' }} title="Modify Assignment">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => setDeleteModal({ isOpen: true, id: hw.id })} className="btn-danger btn-sm" style={{ padding: '8px', borderRadius: '10px' }} title="Purge Record">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {editModal.isOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="card" style={{ maxWidth: '600px', width: '100%', animation: 'scaleUp 0.3s ease-out' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ margin: 0 }}>Modify Assignment</h3>
                            <button onClick={() => setEditModal({ isOpen: false, homework: null })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20}/></button>
                        </div>
                        <form onSubmit={handleUpdate} className="form-grid">
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Topic Title</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={editModal.homework.title}
                                    onChange={e => setEditModal({ ...editModal, homework: { ...editModal.homework, title: e.target.value } })}
                                />
                            </div>
                            <CustomSelect 
                                label="Modify Grade"
                                value={editModal.homework.classId}
                                onChange={val => setEditModal({ ...editModal, homework: { ...editModal.homework, classId: val } })}
                                options={classes.map(c => ({ value: c.id, label: c.name }))}
                                icon={<Users size={16}/>}
                            />
                             <div className="form-group">
                                <label>Module / Subject</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={editModal.homework.subject}
                                    onChange={e => setEditModal({ ...editModal, homework: { ...editModal.homework, subject: e.target.value } })}
                                />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Instructions</label>
                                <textarea 
                                    rows={4}
                                    value={editModal.homework.description}
                                    onChange={e => setEditModal({ ...editModal, homework: { ...editModal.homework, description: e.target.value } })}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={editModal.homework.isSubmissionRequired} 
                                        onChange={e => setEditModal({ ...editModal, homework: { ...editModal.homework, isSubmissionRequired: e.target.checked } })}
                                    />
                                    <span>Requires Submission</span>
                                </label>
                            </div>
                            {editModal.homework.isSubmissionRequired && (
                                <div className="form-group">
                                    <label>Adjust Deadline</label>
                                    <input 
                                        type="date" 
                                        value={editModal.homework.dueDate ? editModal.homework.dueDate.split('T')[0] : ''}
                                        onChange={e => setEditModal({ ...editModal, homework: { ...editModal.homework, dueDate: e.target.value } })}
                                    />
                                </div>
                            )}
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Replace Reference Document (Optional)</label>
                                <div style={{ 
                                    border: '2px dashed var(--border-soft)', 
                                    padding: '20px', 
                                    borderRadius: '12px', 
                                    textAlign: 'center',
                                    background: editModal.homework.newFile ? 'var(--primary-soft)' : 'transparent',
                                    transition: 'all 0.3s ease'
                                }}>
                                    <input 
                                        type="file" 
                                        id="edit-file-upload"
                                        style={{ display: 'none' }}
                                        onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (file) setEditModal({ ...editModal, homework: { ...editModal.homework, newFile: file } });
                                        }}
                                    />
                                    <label htmlFor="edit-file-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                        <Paperclip size={24} color={editModal.homework.newFile ? 'var(--primary-bold)' : 'var(--text-muted)'} />
                                        <span style={{ fontWeight: '700', color: editModal.homework.newFile ? 'var(--primary-bold)' : 'var(--text-main)' }}>
                                            {editModal.homework.newFile ? editModal.homework.newFile.name : 'Click to select new document'}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PDF, Images or Documents supported</span>
                                    </label>
                                    {editModal.homework.fileUrl && !editModal.homework.newFile && (
                                        <div style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            Current: {editModal.homework.fileUrl.split('/').pop()}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                                <button type="button" onClick={() => setEditModal({ isOpen: false, homework: null })} className="btn-secondary">Cancel</button>
                                <button type="submit" className="btn-primary">Update Repository</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* View Task Modal */}
            {viewTaskModal.isOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="card" style={{ maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto', animation: 'scaleUp 0.3s ease-out', padding: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}>
                                    <BookOpen size={20} />
                                </div>
                                <h3 style={{ margin: 0 }}>Assignment Specifications</h3>
                            </div>
                            <button onClick={() => setViewTaskModal({ isOpen: false, homework: null })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20}/></button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>Assignment Objective</label>
                                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)', background: 'var(--bg-main)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-soft)' }}>
                                    {viewTaskModal.homework.title}
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>Detailed Guidelines & Instructions</label>
                                <div style={{ fontSize: '1rem', lineHeight: '1.6', color: 'var(--text-main)', background: 'var(--bg-main)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-soft)', whiteSpace: 'pre-wrap' }}>
                                    {viewTaskModal.homework.description || "No detailed instructions provided."}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>Teacher / Instructor</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--primary-bold)' }}>
                                            {viewTaskModal.homework.teacher?.name?.charAt(0)}
                                        </div>
                                        {viewTaskModal.homework.teacher?.name}
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>Target Group</label>
                                    <div style={{ fontWeight: '700' }}>Class: {viewTaskModal.homework.class?.name}</div>
                                </div>
                            </div>

                            {viewTaskModal.homework.fileUrl && (
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>Teacher Attachment</label>
                                    <a 
                                        href={`${import.meta.env.VITE_API_URL || ''}${viewTaskModal.homework.fileUrl}`} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        style={{ 
                                            display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', 
                                            background: 'var(--primary-soft)', color: 'var(--primary-bold)', 
                                            borderRadius: '12px', textDecoration: 'none', fontWeight: '800',
                                            border: '1px solid var(--primary-bold)', transition: 'transform 0.2s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        <Paperclip size={20} />
                                        <span>Download Reference Document</span>
                                        <div style={{ marginLeft: 'auto' }}><ExternalLink size={18} /></div>
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Submissions Modal */}
            {viewSubmissionsModal.isOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="card" style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto', animation: 'scaleUp 0.3s ease-out' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1, paddingBottom: '16px' }}>
                            <div>
                                <h3 style={{ margin: 0 }}>Submission Audit: {viewSubmissionsModal.homework.title}</h3>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Class: {viewSubmissionsModal.homework.class?.name}</p>
                            </div>
                            <button onClick={() => setViewSubmissionsModal({ isOpen: false, homework: null })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20}/></button>
                        </div>
                        
                        {submissions.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-soft)' }}>
                                <GraduationCap size={40} style={{ opacity: 0.2, marginBottom: '16px' }} />
                                <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>No entries recorded for this task yet.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {submissions.map(s => (
                                    <div key={s.id} style={{ border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-md)', padding: '20px', background: 'var(--bg-main)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: 'var(--primary-bold)' }}>{s.student?.name?.charAt(0)}</div>
                                                <div>
                                                    <div style={{ fontWeight: '800' }}>{s.student?.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        Submitted {new Date(s.submittedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {s.status === 'GRADED' && <span className="badge success" style={{ fontSize: '0.7rem' }}>GRADED</span>}
                                                {s.status === 'SUBMITTED' && (
                                                    <button onClick={() => handleGrade(s.id, 'GRADED')} className="btn-primary" style={{ padding: '6px 16px', fontSize: '0.8rem', background: 'var(--success)', border: 'none', borderRadius: '8px' }}>
                                                        Mark as Checked
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {s.content && (
                                            <div style={{ marginTop: '16px', padding: '16px', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-soft)', fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
                                                {s.content}
                                            </div>
                                        )}

                                        {s.fileUrl && (
                                            <div style={{ marginTop: '12px' }}>
                                                <a 
                                                    href={`${import.meta.env.VITE_API_URL || ''}${s.fileUrl}`} 
                                                    target="_blank" 
                                                    rel="noreferrer" 
                                                    style={{ 
                                                        display: 'inline-flex', alignItems: 'center', gap: '8px', 
                                                        padding: '10px 16px', background: 'var(--bg-card)', 
                                                        color: 'var(--primary-bold)', borderRadius: '8px', 
                                                        border: '1px solid var(--border-soft)', fontSize: '0.85rem', 
                                                        fontWeight: '700', textDecoration: 'none' 
                                                    }}
                                                >
                                                    <Paperclip size={14}/> Student Attachment
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <ConfirmModal 
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                onConfirm={handleDelete}
                title="Purge Assignment"
                message="Are you sure you want to permanently delete this assignment? All student submissions and grades will be destroyed. This action cannot be undone."
            />
        </div>
    );
};

export default ManageHomework;
