/**
 * Academic Performance Ledger (Results)
 * 
 * Provides an administrative interface to log and audit examination scores.
 * Features:
 * - Cycle Management: Track performance across First Term, Second Term, and Final Term.
 * - Granular Records: Individual subject-wise mark entry with automatic grade calculation (on backend).
 * - History Audit: Search and manage historical examination records.
 */
import { useState, useEffect } from 'react';
import api from '../../services/api';
import { MAIN_SUBJECTS } from '../../utils/constants';
import { FilePlus, List, Trash2 } from 'lucide-react';

const ManageResults = () => {
    const [results, setResults] = useState([]);
    const [students, setStudents] = useState([]);
    const [newResult, setNewResult] = useState({
        studentId: '', semester: 'First Term', subject: '', marks: '', totalMarks: '100', grade: ''
    });

    const fetchData = async () => {
        try {
            const [resRes, stuRes] = await Promise.all([
                api.get('/results'),
                api.get('/users/students')
            ]);
            setResults(resRes.data);
            setStudents(stuRes.data);
        } catch (error) {
            console.error('Failed to fetch results:', error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateResult = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/results', newResult);
            setNewResult({
                ...newResult, subject: '', marks: '', grade: ''
            });
            fetchData();
        } catch (error) {
            console.error('Failed to add result:', error);
        }
    };

    const handleDeleteResult = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this result?')) return;
        try {
            await api.delete(`/results/${id}`);
            fetchData();
        } catch (error) {
            console.error('Failed to delete result:', error);
        }
    };

    return (
        <div className="manage-section">
            <div className="card">
                <h3>
                    <FilePlus size={20} color="var(--primary-bold)" />
                    Update Academic Performance
                </h3>
                <form onSubmit={handleCreateResult} className="form-grid">
                    <div className="form-group">
                        <label>Target Student</label>
                        <select value={newResult.studentId} onChange={e => setNewResult({ ...newResult, studentId: e.target.value })} required>
                            <option value="">Choose Student...</option>
                            {students.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.rollNumber})</option>)}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Examination Cycle</label>
                        <select value={newResult.semester} onChange={e => setNewResult({ ...newResult, semester: e.target.value })} required>
                            <option value="First Term">First Term</option>
                            <option value="Second Term">Second Term</option>
                            <option value="Final Term">Final Term</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Subject Category</label>
                        <select value={newResult.subject} onChange={e => setNewResult({ ...newResult, subject: e.target.value })} required>
                            <option value="">Choose Subject...</option>
                            {MAIN_SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Marks Scored</label>
                        <input type="number" placeholder="e.g. 85" value={newResult.marks} onChange={e => setNewResult({ ...newResult, marks: e.target.value })} required />
                    </div>

                    <div className="form-group">
                        <label>Maximum Marks</label>
                        <input type="number" placeholder="e.g. 100" value={newResult.totalMarks} onChange={e => setNewResult({ ...newResult, totalMarks: e.target.value })} required />
                    </div>

                    <div className="form-group">
                        <label>Letter Grade</label>
                        <input type="text" placeholder="e.g. A+" value={newResult.grade} onChange={e => setNewResult({ ...newResult, grade: e.target.value })} required />
                    </div>

                    <div className="form-group" style={{ alignSelf: 'end' }}>
                        <button type="submit" className="btn-primary" style={{ width: '100%', height: '42px' }}>
                            <FilePlus size={18} /> Commit Result
                        </button>
                    </div>
                </form>
            </div>

            <div className="card" style={{ marginTop: '32px' }}>
                <h3>
                    <List size={20} color="var(--primary-bold)" />
                    Examination Ledger
                </h3>
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Student Identity</th>
                                <th>Subject</th>
                                <th>Cycle</th>
                                <th style={{ textAlign: 'center' }}>Score Profile</th>
                                <th style={{ textAlign: 'center' }}>Grade</th>
                                <th style={{ textAlign: 'right' }}>Management</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((r: any) => (
                                <tr key={r.id}>
                                    <td style={{ fontWeight: '500' }}>{r.student?.name}</td>
                                    <td>
                                        <span className="badge" style={{ background: 'var(--bg-main)', color: 'var(--text-main)', border: '1px solid var(--border-soft)' }}>{r.subject}</span>
                                    </td>
                                    <td>{r.semester}</td>
                                    <td style={{ textAlign: 'center', fontWeight: '700' }}>{r.marks} <span style={{ fontWeight: '400', color: 'var(--text-muted)', fontSize: '0.8rem' }}>/ {r.totalMarks}</span></td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className="badge" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', minWidth: '40px', justifyContent: 'center' }}>{r.grade}</span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button onClick={() => handleDeleteResult(r.id)} className="btn-danger btn-sm" style={{ padding: '6px 12px' }}>
                                            <Trash2 size={14} /> Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {results.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No performance records found.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ManageResults;
