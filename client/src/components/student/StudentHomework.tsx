import { useState, useEffect } from 'react';
import api from '../../services/api';

const StudentHomework = () => {
    const [assignments, setAssignments] = useState([]);
    const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
    const [file, setFile] = useState<File | null>(null);
    const [content, setContent] = useState('');

    const fetchAssignments = async () => {
        try {
            const res = await api.get('/homework');
            setAssignments(res.data);
        } catch (error) {
            console.error('Failed to fetch homework assignments', error);
        }
    };

    useEffect(() => {
        fetchAssignments();
    }, []);

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
            alert('Homework submitted successfully!');
            setSelectedAssignment(null);
            setContent('');
            setFile(null);
            fetchAssignments(); // Refresh list to get updated submission status
        } catch (error) {
            console.error('Failed to submit homework:', error);
            alert('Failed to submit homework');
        }
    };

    return (
        <div className="manage-section">
            <div className="card">
                <h3>My Homework Assignments</h3>
                <div style={{ display: 'grid', gap: '20px', marginTop: '20px' }}>
                    {assignments.map((hw: any) => {
                        const hasSubmitted = hw.submissions?.length > 0;
                        const submission = hw.submissions?.[0]; // Get the student's own submission

                        return (
                            <div key={hw.id} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h4>{hw.title}</h4>
                                        <p style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--primary-color)' }}>{hw.subject || 'General'}</p>
                                        <p style={{ fontSize: '13px', color: '#666', marginTop: '5px' }}>{hw.description}</p>
                                        <p style={{ fontSize: '12px', marginTop: '10px' }}>
                                            <strong>Due Date:</strong> {new Date(hw.dueDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        {hw.fileUrl && (
                                            <a href={`http://localhost:5000${hw.fileUrl}`} target="_blank" rel="noreferrer" className="btn-primary btn-sm mb-2" style={{ display: 'inline-block' }}>
                                                View Attachment
                                            </a>
                                        )}
                                        {hasSubmitted ? (
                                            <div>
                                                <span className={`badge ${submission.status.toLowerCase()}`}>{submission.status}</span>
                                            </div>
                                        ) : (
                                            <div>
                                                <button onClick={() => setSelectedAssignment(hw)} className="btn-success btn-sm mt-3">
                                                    Submit Work
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {assignments.length === 0 && <p>No homework assignments found.</p>}
                </div>
            </div>

            {selectedAssignment && (
                <div className="card mt-4" style={{ border: '2px solid #3b82f6' }}>
                    <h3>Submit Assignment: {selectedAssignment.title}</h3>
                    <form onSubmit={handleSubmit} className="mt-4">
                        <div className="mb-4">
                            <label>Text Answer (Optional):</label>
                            <textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                rows={4}
                                style={{ width: '100%', padding: '10px', marginTop: '5px', border: '1px solid #ccc', borderRadius: '4px' }}
                            />
                        </div>
                        <div className="mb-4">
                            <label>File Upload (Optional):</label>
                            <input type="file" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} style={{ display: 'block', marginTop: '5px' }} />
                        </div>
                        <div>
                            <button type="submit" className="btn-primary mr-2">Submit</button>
                            <button type="button" onClick={() => setSelectedAssignment(null)} className="btn-danger">Cancel</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default StudentHomework;
