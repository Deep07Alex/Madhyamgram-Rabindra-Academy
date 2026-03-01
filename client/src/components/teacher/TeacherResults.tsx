import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { MAIN_SUBJECTS } from '../../utils/constants';
import {
    Award,
    User,
    School,
    BookOpen,
    Calculator,
    GraduationCap,
    Save,
    ListChecks,
    History
} from 'lucide-react';

const TeacherResults = () => {
    const { showToast } = useToast();
    const [classes, setClasses] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedStudent, setSelectedStudent] = useState('');
    const [results, setResults] = useState([]);
    const [newResult, setNewResult] = useState({
        subject: '', semester: 'First Term', marks: '', totalMarks: '100', grade: ''
    });

    useEffect(() => {
        api.get('/users/classes').then(res => setClasses(res.data)).catch(console.error);
    }, []);

    useEffect(() => {
        if (selectedClass) {
            api.get(`/users/students?classId=${selectedClass}`).then(res => {
                setStudents(res.data);
            }).catch(console.error);
        } else {
            setStudents([]);
        }
    }, [selectedClass]);

    useEffect(() => {
        if (selectedStudent) {
            api.get(`/results/student/${selectedStudent}`)
                .then(res => setResults(res.data))
                .catch(console.error);
        } else {
            setResults([]);
        }
    }, [selectedStudent]);

    const handleCreateResult = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/results', { ...newResult, studentId: selectedStudent });
            showToast('Result securely recorded!', 'success');
            setNewResult({ ...newResult, subject: '', marks: '', grade: '' });
            api.get(`/results/student/${selectedStudent}`).then(res => setResults(res.data));
        } catch (error) {
            console.error('Failed to add result:', error);
        }
    };

    return (
        <div className="manage-section">
            <div className="card">
                <h3>
                    <Award size={20} color="var(--primary)" />
                    Performance Assessment Gateway
                </h3>
                <div className="form-grid" style={{ marginBottom: '24px' }}>
                    <div className="form-group">
                        <label>Target Grade</label>
                        <div style={{ position: 'relative' }}>
                            <School size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} style={{ paddingLeft: '40px' }}>
                                <option value="">Choose Class...</option>
                                {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Target Candidate</label>
                        <div style={{ position: 'relative' }}>
                            <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} disabled={!selectedClass} style={{ paddingLeft: '40px' }}>
                                <option value="">Select Student Profile...</option>
                                {students.map((s: any) => <option key={s.id} value={s.id}>{s.name} | {s.studentId} (#{s.rollNumber})</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {selectedStudent && (
                    <div style={{ borderTop: '2px dashed var(--border-soft)', paddingTop: '32px', animation: 'fadeIn 0.4s ease' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--primary-soft)', color: 'var(--primary)', padding: '6px 16px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '20px' }}>
                            <GraduationCap size={14} /> Metric Injection
                        </div>
                        <form onSubmit={handleCreateResult} className="form-grid">
                            <div className="form-group">
                                <label>Academic Session</label>
                                <select value={newResult.semester} onChange={e => setNewResult({ ...newResult, semester: e.target.value })} required>
                                    <option value="First Term">First Term Examination</option>
                                    <option value="Second Term">Second Term Examination</option>
                                    <option value="Final Term">Annual / Final Examination</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Subject Domain</label>
                                <div style={{ position: 'relative' }}>
                                    <BookOpen size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <select value={newResult.subject} onChange={e => setNewResult({ ...newResult, subject: e.target.value })} required style={{ paddingLeft: '40px' }}>
                                        <option value="">Choose Subject...</option>
                                        {MAIN_SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Score Achieved</label>
                                <div style={{ position: 'relative' }}>
                                    <Calculator size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input type="number" placeholder="e.g. 85" value={newResult.marks} onChange={e => setNewResult({ ...newResult, marks: e.target.value })} required style={{ paddingLeft: '40px' }} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Evaluation Grade</label>
                                <input type="text" placeholder="e.g. A+" value={newResult.grade} onChange={e => setNewResult({ ...newResult, grade: e.target.value })} required />
                            </div>
                            <div className="form-group" style={{ alignSelf: 'end' }}>
                                <button type="submit" className="btn-primary" style={{ width: '100%', height: '48px' }}>
                                    <Save size={18} /> Record Assessment
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            <div className="card" style={{ marginTop: '32px' }}>
                <h3>
                    <History size={20} color="var(--primary)" />
                    Established Academic Records
                </h3>
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Subject</th>
                                <th>Examination Session</th>
                                <th style={{ textAlign: 'center' }}>Quantitative Score</th>
                                <th style={{ textAlign: 'right' }}>Qualitative Grade</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((r: any) => (
                                <tr key={r.id}>
                                    <td style={{ fontWeight: '600' }}>{r.subject}</td>
                                    <td><span className="badge" style={{ background: '#f8fafc', color: 'var(--text-main)' }}>{r.semester}</span></td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{r.marks}</span>
                                        <span style={{ opacity: 0.4, fontSize: '0.8rem' }}> / {r.totalMarks}</span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <span style={{
                                            padding: '4px 12px',
                                            borderRadius: 'var(--radius-sm)',
                                            fontWeight: 900,
                                            background: 'var(--primary-soft)',
                                            color: 'var(--primary)',
                                            fontSize: '0.9rem'
                                        }}>{r.grade}</span>
                                    </td>
                                </tr>
                            ))}
                            {selectedStudent && results.length === 0 && (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                                        <ListChecks size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
                                        <p>No assessment records authenticated for this profile.</p>
                                    </td>
                                </tr>
                            )}
                            {!selectedStudent && (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                                        <User size={32} style={{ opacity: 0.1, marginBottom: '12px' }} />
                                        <p style={{ fontWeight: 600 }}>Authenticate a student profile to view performance history.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default TeacherResults;
