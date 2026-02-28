import { useState, useEffect } from 'react';
import api from '../../services/api';

const TeacherHomework = () => {
    const [tab, setTab] = useState<'create' | 'submissions'>('create');
    const [classes, setClasses] = useState([]);
    const [homeworks, setHomeworks] = useState([]);

    // Create state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [classId, setClassId] = useState('');
    const [file, setFile] = useState<File | null>(null);

    // Submissions state
    const [selectedHomework, setSelectedHomework] = useState('');
    const [submissions, setSubmissions] = useState([]);

    useEffect(() => {
        api.get('/users/classes').then(res => setClasses(res.data)).catch(console.error);
        fetchHomeworks();
    }, []);

    const fetchHomeworks = async () => {
        try {
            const res = await api.get('/homework');
            setHomeworks(res.data);
        } catch (error) {
            console.error('Failed to fetch homeworks', error);
        }
    };

    const handleCreateHomework = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('dueDate', dueDate);
        formData.append('classId', classId);
        if (file) formData.append('file', file);

        try {
            await api.post('/homework', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert('Homework created successfully!');
            setTitle(''); setDescription(''); setDueDate(''); setClassId(''); setFile(null);
            fetchHomeworks();
        } catch (error) {
            console.error('Error creating homework', error);
        }
    };

    const fetchSubmissions = async (hwId: string) => {
        setSelectedHomework(hwId);
        if (!hwId) return;
        try {
            const res = await api.get(`/homework/submissions?homeworkId=${hwId}`);
            setSubmissions(res.data);
        } catch (error) {
            console.error('Error fetching submissions', error);
        }
    };

    const handleGrade = async (subId: string, status: string) => {
        try {
            await api.patch(`/homework/submissions/${subId}/grade`, { status });
            fetchSubmissions(selectedHomework);
        } catch (error) {
            console.error('Error grading submission', error);
        }
    };

    return (
        <div className="manage-section">
            <div className="tabs">
                <button className={`tab ${tab === 'create' ? 'active' : ''}`} onClick={() => setTab('create')}>Assign Homework</button>
                <button className={`tab ${tab === 'submissions' ? 'active' : ''}`} onClick={() => setTab('submissions')}>View Submissions</button>
            </div>

            {tab === 'create' && (
                <div className="card mt-4">
                    <h3>Create New Assignment</h3>
                    <form onSubmit={handleCreateHomework} className="form-grid">
                        <input type="text" placeholder="Assignment Title" value={title} onChange={e => setTitle(e.target.value)} required />
                        <select value={classId} onChange={e => setClassId(e.target.value)} required>
                            <option value="">Select Class</option>
                            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <input type="date" placeholder="Due Date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
                        <div style={{ gridColumn: '1 / -1' }}>
                            <textarea placeholder="Description & Instructions" value={description} onChange={e => setDescription(e.target.value)} required rows={4} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label>Attachment (Optional): </label>
                            <input type="file" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} />
                        </div>
                        <button type="submit" className="btn-primary">Assign to Class</button>
                    </form>
                </div>
            )}

            {tab === 'submissions' && (
                <div className="card mt-4">
                    <h3>Review Submissions</h3>
                    <select value={selectedHomework} onChange={e => fetchSubmissions(e.target.value)} style={{ marginBottom: '20px', padding: '10px', width: '100%' }}>
                        <option value="">Select Homework Assignment...</option>
                        {homeworks.map((h: any) => <option key={h.id} value={h.id}>{h.title} ({h.class?.name})</option>)}
                    </select>

                    {selectedHomework && (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Submitted At</th>
                                    <th>Status</th>
                                    <th>Content/File</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {submissions.map((s: any) => (
                                    <tr key={s.id}>
                                        <td>{s.student?.name}</td>
                                        <td>{new Date(s.submittedAt).toLocaleString()}</td>
                                        <td><span className={`badge ${s.status.toLowerCase()}`}>{s.status}</span></td>
                                        <td>
                                            {s.content && <p style={{ fontSize: '12px', margin: 0 }}>{s.content}</p>}
                                            {s.fileUrl && <a href={`http://localhost:5000${s.fileUrl}`} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: 'blue' }}>View Attachment</a>}
                                        </td>
                                        <td>
                                            {s.status === 'SUBMITTED' && (
                                                <button onClick={() => handleGrade(s.id, 'GRADED')} className="btn-success btn-sm">Mark as Graded</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {submissions.length === 0 && <tr><td colSpan={5}>No submissions yet.</td></tr>}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
};

export default TeacherHomework;
