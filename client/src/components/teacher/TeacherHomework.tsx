import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import useServerEvents from '../../hooks/useServerEvents';
import { MAIN_SUBJECTS } from '../../utils/constants';
import FileUploadPicker from '../shared/FileUploadPicker';
import {
    BookPlus,
    Calendar,
    Type,
    FileText,
    ExternalLink,
    CheckCircle2,
    Trash2,
    LayoutList,
    GraduationCap,
    Paperclip,
    School,
    Eye
} from 'lucide-react';

const TeacherHomework = () => {
    const { showToast } = useToast();
    const [classes, setClasses] = useState([]);
    const [homeworkList, setHomeworkList] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [selectedHomework, setSelectedHomework] = useState('');
    const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
    const [newHomework, setNewHomework] = useState({
        classId: '', title: '', description: '', subject: '', dueDate: '', allowFileUpload: false
    });
    const [attachedFile, setAttachedFile] = useState<File | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const [clsRes, hwRes] = await Promise.all([
                api.get('/users/classes'),
                api.get('/homework')
            ]);
            setClasses(clsRes.data);
            setHomeworkList(hwRes.data);
        } catch (error) {
            console.error('Failed to fetch homework data:', error);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);


    const fetchSubmissions = useCallback(async () => {
        if (selectedHomework) {
            try {
                const res = await api.get(`/homework/${selectedHomework}/submissions`);
                setSubmissions(res.data);
            } catch (err) {
                console.error(err);
            }
        } else {
            setSubmissions([]);
        }
    }, [selectedHomework]);

    useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

    // Live: refresh on remote changes
    useServerEvents({
        'homework:submitted': fetchSubmissions,
        'homework:created': fetchData,
        'homework:deleted': (data: any) => {
            fetchData();
            if (data && data.id === selectedHomework) {
                setSelectedHomework('');
            }
        }
    });

    const handleCreateHomework = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('classId', newHomework.classId);
            formData.append('title', newHomework.title);
            formData.append('description', newHomework.description);
            formData.append('subject', newHomework.subject);
            formData.append('dueDate', newHomework.dueDate);
            formData.append('allowFileUpload', String(newHomework.allowFileUpload));
            if (attachedFile) formData.append('file', attachedFile);

            await api.post('/homework', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showToast('Homework assigned successfully!', 'success');
            setNewHomework({ classId: '', title: '', description: '', subject: '', dueDate: '', allowFileUpload: false });
            setAttachedFile(null);
            fetchData();
        } catch (error) {
            console.error('Failed to create homework:', error);
        }
    };

    const handleDeleteHomework = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this assignment?')) return;
        try {
            await api.delete(`/homework/${id}`);
            fetchData();
        } catch (error) {
            console.error('Failed to delete homework:', error);
        }
    };

    const handleGrade = async (submissionId: string, status: string) => {
        try {
            await api.put(`/homework/submissions/${submissionId}`, { status });
            api.get(`/homework/${selectedHomework}/submissions`)
                .then(res => setSubmissions(res.data));
        } catch (error) {
            console.error('Failed to update submission:', error);
        }
    };

    return (
        <div className="manage-section">
            <div className="card">
                <h3>
                    <BookPlus size={20} color="var(--primary-bold)" />
                    Establish New Academic Assignment
                </h3>
                <form onSubmit={handleCreateHomework} className="form-grid">
                    <div className="form-group">
                        <label>Target Grade</label>
                        <div style={{ position: 'relative' }}>
                            <School size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <select value={newHomework.classId} onChange={e => setNewHomework({ ...newHomework, classId: e.target.value })} required style={{ paddingLeft: '40px' }}>
                                <option value="">Choose Class...</option>
                                {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Subject Domain</label>
                        <select value={newHomework.subject} onChange={e => setNewHomework({ ...newHomework, subject: e.target.value })} required>
                            <option value="">Choose Subject...</option>
                            {MAIN_SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label>Assignment Objective</label>
                        <div style={{ position: 'relative' }}>
                            <Type size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                            <textarea
                                placeholder="e.g. Solve the first 10 problems of Chapter 3"
                                value={newHomework.title}
                                onChange={e => setNewHomework({ ...newHomework, title: e.target.value })}
                                required
                                rows={3}
                                style={{ width: '100%', paddingLeft: '40px', padding: '12px 12px 12px 40px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-soft)', fontSize: '0.9rem', outline: 'none', resize: 'vertical', transition: 'var(--transition-fast)', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                                onBlur={e => e.target.style.borderColor = 'var(--border-soft)'}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Submission Deadline</label>
                        <div style={{ position: 'relative' }}>
                            <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input type="date" value={newHomework.dueDate} onClick={(e) => (e.target as any).showPicker?.()} onChange={e => setNewHomework({ ...newHomework, dueDate: e.target.value })} required style={{ paddingLeft: '40px' }} />
                        </div>
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label>Detailed Guidelines & Instructions</label>
                        <textarea
                            placeholder="Specify learning outcomes and required materials..."
                            value={newHomework.description}
                            onChange={e => setNewHomework({ ...newHomework, description: e.target.value })}
                            rows={3}
                            style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-soft)', fontSize: '0.9rem', outline: 'none', transition: 'var(--transition-fast)' }}
                            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                            onBlur={e => e.target.style.borderColor = 'var(--border-soft)'}
                        ></textarea>
                    </div>
                    <div className="form-group">
                        <FileUploadPicker
                            file={attachedFile}
                            onChange={setAttachedFile}
                            label="Attach Reference File for Students (Optional)"
                            hint="Share reference materials: images, PDF, Word, Excel, PPT, ZIP — up to 50 MB"
                        />
                    </div>
                    {/* Allow student file upload toggle */}
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
                                background: newHomework.allowFileUpload ? 'var(--primary-soft)' : '#f8fafc',
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
                                    background: 'white', transition: 'left 0.2s',
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
                    <div className="form-group" style={{ alignSelf: 'end' }}>
                        <button type="submit" className="btn-primary" style={{ width: '100%', height: '48px' }}>
                            <BookPlus size={18} /> Deploy Assignment
                        </button>
                    </div>
                </form>
            </div>

            <div className="card" style={{ marginTop: '32px' }}>
                <h3>
                    <LayoutList size={20} color="var(--primary-bold)" />
                    Active Assignment Repository
                </h3>
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Grade</th>
                                <th>Subject</th>
                                <th>Topic</th>
                                <th style={{ textAlign: 'center' }}>Deadline</th>
                                <th style={{ textAlign: 'right' }}>Management</th>
                            </tr>
                        </thead>
                        <tbody>
                            {homeworkList.map((hw: any) => (
                                <tr key={hw.id}>
                                    <td><span className="badge" style={{ background: 'var(--primary-soft)', color: 'var(--primary-bold)' }}>{hw.class?.name}</span></td>
                                    <td style={{ fontWeight: '500' }}>{hw.subject}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>{hw.title}</span>
                                            {hw.fileUrl && (
                                                <a href={`http://localhost:5000${hw.fileUrl}`} target="_blank" rel="noreferrer"
                                                    title="View attached file"
                                                    style={{ color: 'var(--primary-bold)', display: 'flex', alignItems: 'center' }}>
                                                    <Paperclip size={13} />
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            <Calendar size={14} /> {new Date(hw.dueDate).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button onClick={() => handleDeleteHomework(hw.id)} className="btn-danger btn-sm" style={{ padding: '6px 12px' }}>
                                            <Trash2 size={14} /> Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {homeworkList.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No assignments currently active.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card" style={{ marginTop: '32px' }}>
                <h3>
                    <GraduationCap size={20} color="var(--primary-bold)" />
                    Student Submission Review
                </h3>
                <div className="form-group" style={{ marginBottom: '24px', maxWidth: '400px' }}>
                    <label>Select Workspace to Audit</label>
                    <select value={selectedHomework} onChange={e => setSelectedHomework(e.target.value)}>
                        <option value="">Choose Assignment...</option>
                        {homeworkList.map((hw: any) => <option key={hw.id} value={hw.id}>{hw.title} ({hw.class?.name})</option>)}
                    </select>
                </div>

                {selectedHomework && (
                    submissions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '50px', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-soft)' }}>
                            <GraduationCap size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
                            <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>No submissions recorded yet for this assignment.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {submissions.map((s: any) => {
                                return (
                                    <div key={s.id} style={{
                                        border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-md)',
                                        padding: '20px', background: 'white'
                                    }}>
                                        {/* Header row only */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.9rem', color: 'var(--primary-bold)' }}>
                                                    {s.student?.name?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <p style={{ margin: 0, fontWeight: '800', fontSize: '0.95rem' }}>{s.student?.name}</p>
                                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        Submitted {new Date(s.submittedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                {(s.content || s.fileUrl) && (
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '6px' }}>
                                                        {s.fileUrl && <Paperclip size={14} />}
                                                        {s.content && <FileText size={14} />}
                                                    </span>
                                                )}
                                                <span className={`badge ${s.status.toLowerCase()}`}>{s.status}</span>
                                                <button onClick={() => setSelectedSubmission(s)} className="btn-primary" style={{ padding: '6px 16px', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)', gap: '6px' }}>
                                                    <Eye size={14} /> Review
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                )}
                {!selectedHomework && (
                    <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-soft)' }}>
                        <FileText size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
                        <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Select an assignment profile to begin performance audit.</p>
                    </div>
                )}
            </div>

            {/* Submission Review Modal */}
            {selectedSubmission && (() => {
                const s = selectedSubmission;
                const fileUrl = s.fileUrl ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${s.fileUrl}` : null;
                const fileName = s.fileUrl ? s.fileUrl.split('/').pop() : '';
                const ext = fileName?.split('.').pop()?.toLowerCase() || '';
                const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);

                const extColors: Record<string, { bg: string; text: string; label: string }> = {
                    pdf: { bg: '#fef2f2', text: '#dc2626', label: '📄 PDF' },
                    doc: { bg: '#eff6ff', text: '#1d4ed8', label: '📝 Word' },
                    docx: { bg: '#eff6ff', text: '#1d4ed8', label: '📝 Word' },
                    xls: { bg: '#f0fdf4', text: '#15803d', label: '📊 Excel' },
                    xlsx: { bg: '#f0fdf4', text: '#15803d', label: '📊 Excel' },
                    ppt: { bg: '#fff7ed', text: '#c2410c', label: '📑 PPT' },
                    pptx: { bg: '#fff7ed', text: '#c2410c', label: '📑 PPT' },
                    zip: { bg: '#f8fafc', text: '#475569', label: '🗜 ZIP' },
                    txt: { bg: '#f8fafc', text: '#475569', label: '📃 Text' },
                    csv: { bg: '#f0fdf4', text: '#15803d', label: '📊 CSV' },
                };
                const fc = extColors[ext] || { bg: '#f8fafc', text: '#475569', label: `📎 ${ext.toUpperCase() || 'File'}` };

                return (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)',
                        backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', padding: '20px'
                    }}>
                        <div className="card" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '32px', position: 'relative', animation: 'scaleUp 0.3s var(--ease-back)' }}>
                            <button
                                onClick={() => setSelectedSubmission(null)}
                                style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--border-soft)' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1.2rem', color: 'white' }}>
                                    {s.student?.name?.charAt(0) || '?'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.4rem' }}>{s.student?.name}</h3>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        Submitted {new Date(s.submittedAt).toLocaleString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                    <span className={`badge ${s.status.toLowerCase()}`}>{s.status}</span>
                                    {s.status === 'SUBMITTED' && (
                                        <button onClick={() => {
                                            handleGrade(s.id, 'GRADED');
                                            setSelectedSubmission({ ...s, status: 'GRADED' });
                                        }}
                                            className="btn-primary"
                                            style={{ background: 'var(--success)', border: 'none', padding: '6px 16px', fontSize: '0.8rem' }}>
                                            <CheckCircle2 size={16} /> Mark Graded
                                        </button>
                                    )}
                                </div>
                            </div>

                            {s.content && s.content.trim() && (
                                <div style={{ marginBottom: fileUrl ? '24px' : '0' }}>
                                    <p style={{ margin: '0 0 8px', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                                        Written Answer
                                    </p>
                                    <div style={{
                                        background: '#f8fafc', border: '1px solid var(--border-soft)',
                                        borderRadius: 'var(--radius-md)', padding: '20px',
                                        fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.7',
                                        whiteSpace: 'pre-wrap'
                                    }}>
                                        {s.content}
                                    </div>
                                </div>
                            )}

                            {fileUrl && (
                                <div>
                                    <p style={{ margin: '0 0 8px', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                                        Attached File
                                    </p>
                                    {isImage ? (
                                        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-soft)', textAlign: 'center' }}>
                                            <a href={fileUrl} target="_blank" rel="noreferrer">
                                                <img src={fileUrl} alt="student submission" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: 'var(--radius-sm)', objectFit: 'contain' }} />
                                            </a>
                                            <p style={{ margin: '12px 0 0 0', fontSize: '0.8rem' }}>
                                                <a href={fileUrl} download style={{ color: 'var(--primary)', fontWeight: '700', textDecoration: 'none' }}>Download original image</a>
                                            </p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: fc.bg, borderRadius: 'var(--radius-md)', border: `1px solid ${fc.text}20` }}>
                                            <span style={{ fontWeight: '800', fontSize: '0.9rem', color: fc.text }}>{fc.label}</span>
                                            <span style={{ flex: 1, fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</span>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <a href={fileUrl} target="_blank" rel="noreferrer"
                                                    style={{ padding: '8px 16px', background: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <ExternalLink size={14} /> Open
                                                </a>
                                                <a href={fileUrl} download
                                                    style={{ padding: '8px 16px', background: 'white', border: '1px solid var(--border-soft)', color: 'var(--text-main)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    Download
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!s.content && !s.fileUrl && (
                                <div style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-soft)' }}>
                                    <FileText size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
                                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>Student submitted without providing text or file attachments.</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default TeacherHomework;
