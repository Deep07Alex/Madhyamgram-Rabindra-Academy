/**
 * Student Homework Management Portal
 * 
 * Provides pupils with a centralized view of their academic assignments.
 * Features:
 * - Real-time Updates: Uses SSE (Server-Sent Events) to notify students of new tasks.
 * - Submission Gateway: Multi-modal form supporting both written text and file attachments.
 * - Progress Tracking: Persists 'recently submitted' states to ensure UI consistency.
 * - Feedback Loop: Displays teacher critiques and grades directly on the assignment card.
 */
import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import useServerEvents from '../../hooks/useServerEvents';
import FileUploadPicker from '../shared/FileUploadPicker';
import {
    BookOpen,
    Calendar,
    FileText,
    Paperclip,
    Upload,
    CheckCircle2,
    Clock,
    ArrowRight,
    Send,
    XCircle
} from 'lucide-react';

const StudentHomework = () => {
    const { showToast } = useToast();
    const [assignments, setAssignments] = useState([]);
    const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
    const [file, setFile] = useState<File | null>(null);
    const [content, setContent] = useState('');

    const fetchAssignments = useCallback(async () => {
        try {
            const res = await api.get('/homework');
            setAssignments(res.data);
        } catch (error) {
            console.error('Failed to fetch homework assignments', error);
        }
    }, []);

    useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

    // Live: refresh on assignment changes and on own submission
    useServerEvents({
        'homework_created': fetchAssignments,
        'homework_deleted': (data: any) => {
            fetchAssignments();
            if (data && data.id === selectedAssignment?.id) {
                setSelectedAssignment(null);
                setContent('');
                setFile(null);
            }
        },
        'homework_submitted': fetchAssignments,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAssignment) return;

        const formData = new FormData();
        formData.append('homeworkId', selectedAssignment.id);
        if (content) formData.append('content', content);
        if (file) formData.append('file', file);

        try {
            await api.post('/homework/submit', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            /**
             * Dashboard Sync: 
             * Update the local 'recently_submitted_homework' registry.
             * This ensures the homepage banner reflects the change instantly
             * without a full page reload or server roundtrip.
             */
            const stored = localStorage.getItem('recently_submitted_homework');
            const submittedSet = stored ? new Set(JSON.parse(stored)) : new Set();
            submittedSet.add(selectedAssignment.id);
            localStorage.setItem('recently_submitted_homework', JSON.stringify(Array.from(submittedSet)));

            showToast('Assignment submitted successfully!', 'success');
            setSelectedAssignment(null);
            setContent('');
            setFile(null);
            fetchAssignments();
        } catch (error) {
            console.error('Failed to submit homework:', error);
            showToast('Failed to submit homework. Please try again.', 'error');
        }
    };

    return (
        <div className="manage-section">
            <div className="card">
                <h3>
                    <BookOpen size={20} color="var(--primary-bold)" />
                    Academic Tasks & Assignments
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginTop: '24px' }}>
                    {assignments.filter((hw: any) => new Date(hw.dueDate).getTime() >= new Date().getTime()).map((hw: any) => {
                        const hasSubmitted = hw.submissions?.length > 0;
                        const submission = hw.submissions?.[0];
                        const isPastDue = new Date(hw.dueDate).getTime() < new Date().getTime();
                        const canEdit = !isPastDue && submission?.status !== 'GRADED';

                        return (
                            <div key={hw.id} style={{
                                border: '1px solid var(--border-soft)',
                                padding: '24px',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--bg-card)',
                                transition: 'var(--transition-base)',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between'
                            }} className="assignment-card">
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <span className="badge" style={{ background: 'var(--primary-soft)', color: 'var(--primary-bold)', fontWeight: 800, fontSize: '0.7rem' }}>
                                            {hw.subject || 'Core Study'}
                                        </span>
                                        {hasSubmitted ? (
                                            <span className={`badge ${submission.status.toLowerCase()}`} style={{ fontSize: '0.7rem' }}>
                                                {submission.status === 'GRADED' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                                {submission.status}
                                            </span>
                                        ) : (
                                            <span className="badge" style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #ffedd5', fontSize: '0.7rem' }}>
                                                Pending Action
                                            </span>
                                        )}
                                    </div>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>{hw.title}</h4>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '20px' }}>{hw.description}</p>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Calendar size={14} /> Due: {new Date(hw.dueDate).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>

                                    {hasSubmitted && submission.status === 'GRADED' && submission.feedback && (
                                        <div style={{
                                            marginTop: '16px', background: 'var(--primary-soft)', padding: '12px 16px',
                                            borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--primary-bold)'
                                        }}>
                                            <p style={{ margin: '0 0 4px', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--primary-bold)' }}>
                                                Teacher's Feedback
                                            </p>
                                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-main)', fontStyle: 'italic', lineHeight: 1.5 }}>
                                                "{submission.feedback}"
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border-soft)' }}>
                                    {hw.fileUrl ? (
                                        <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${hw.fileUrl}`} target="_blank" rel="noreferrer" style={{
                                            fontSize: '0.75rem', color: 'var(--primary-bold)', fontWeight: 700,
                                            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px'
                                        }}>
                                            <Paperclip size={14} /> Teacher's Resource
                                        </a>
                                    ) : <div></div>}

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {isPastDue ? (
                                            <span style={{ fontSize: '0.8rem', color: 'var(--error)', fontWeight: 600, background: 'var(--error-soft)', padding: '6px 12px', borderRadius: 'var(--radius-full)' }}>Closed</span>
                                        ) : !hasSubmitted ? (
                                            <button onClick={() => {
                                                setSelectedAssignment(hw);
                                                setContent('');
                                                setFile(null);
                                            }} className="btn-primary" style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', gap: '6px' }}>
                                                Submit Assignment <ArrowRight size={14} />
                                            </button>
                                        ) : canEdit ? (
                                            <button onClick={() => {
                                                setSelectedAssignment(hw);
                                                setContent(submission.content || '');
                                                setFile(null);
                                            }} style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-soft)', fontWeight: 600 }}>
                                                Edit Submission <Send size={14} />
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {assignments.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-soft)' }}>
                            <FileText size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
                            <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>No academic tasks or assignments found for your class.</p>
                        </div>
                    )}
                </div>
            </div>

            {selectedAssignment && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(15, 23, 42, 0.4)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '32px', position: 'relative', animation: 'scaleUp 0.3s var(--ease-back)' }}>
                        <button
                            onClick={() => setSelectedAssignment(null)}
                            style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                        >
                            <XCircle size={24} />
                        </button>

                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--primary-soft)', color: 'var(--primary-bold)', padding: '6px 16px', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '16px' }}>
                            <Upload size={14} /> submission Gateway
                        </div>
                        <h3 style={{ marginBottom: '8px' }}>{selectedAssignment.title}</h3>
                        {selectedAssignment.description && (
                            <div style={{
                                background: 'var(--bg-main)', border: '1px solid var(--border-soft)',
                                borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '20px'
                            }}>
                                <p style={{ margin: '0 0 4px', fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary-bold)' }}>
                                    Teacher's Instructions
                                </p>
                                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                    {selectedAssignment.description}
                                </p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label>Research / Text Component</label>
                                <textarea
                                    placeholder="Type your findings or response here..."
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    rows={4}
                                    style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-soft)', outline: 'none', transition: 'var(--transition-fast)' }}
                                    onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                                    onBlur={e => e.target.style.borderColor = 'var(--border-soft)'}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: '32px' }}>
                                {selectedAssignment.allowFileUpload ? (
                                    <div>
                                        <FileUploadPicker
                                            file={file}
                                            onChange={setFile}
                                            label="Your Submission File (Optional)"
                                            hint="Upload photos, PDF, Word, Excel, PPT, ZIP — up to 50 MB"
                                        />
                                        {selectedAssignment.submissions?.[0]?.fileUrl && !file && (
                                            <p style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Paperclip size={12} /> You have previously attached a file. Uploading a new one will replace it.
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{
                                        padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                                        background: 'var(--bg-main)', border: '1px dashed var(--border-soft)',
                                        fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px'
                                    }}>
                                        <span>📝</span>
                                        <span>File upload is not required for this assignment. Only a written response is accepted.</span>
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="submit" className="btn-primary" style={{ flex: 1, height: '48px', fontSize: '1rem' }}>
                                    <Send size={18} /> Transmit Work
                                </button>
                                <button type="button" onClick={() => setSelectedAssignment(null)} className="btn-danger" style={{ padding: '0 24px', opacity: 0.6 }}>
                                    Discard
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes scaleUp {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .assignment-card:hover {
                    border-color: var(--primary) !important;
                    box-shadow: var(--shadow-lg);
                }
            `}</style>
        </div>
    );
};

export default StudentHomework;
