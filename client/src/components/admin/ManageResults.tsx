import { useState, useEffect } from 'react';
import api from '../../services/api';

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

    return (
        <div className="manage-section">
            <div className="card">
                <h3>Add Student Result</h3>
                <form onSubmit={handleCreateResult} className="form-grid">
                    <select value={newResult.studentId} onChange={e => setNewResult({ ...newResult, studentId: e.target.value })} required>
                        <option value="">Select Student</option>
                        {students.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.rollNumber})</option>)}
                    </select>

                    <select value={newResult.semester} onChange={e => setNewResult({ ...newResult, semester: e.target.value })} required>
                        <option value="First Term">First Term</option>
                        <option value="Second Term">Second Term</option>
                        <option value="Final Term">Final Term</option>
                    </select>

                    <input type="text" placeholder="Subject (e.g., Mathematics)" value={newResult.subject} onChange={e => setNewResult({ ...newResult, subject: e.target.value })} required />
                    <input type="number" placeholder="Marks Obtained" value={newResult.marks} onChange={e => setNewResult({ ...newResult, marks: e.target.value })} required />
                    <input type="number" placeholder="Total Marks" value={newResult.totalMarks} onChange={e => setNewResult({ ...newResult, totalMarks: e.target.value })} required />
                    <input type="text" placeholder="Grade (e.g., A+)" value={newResult.grade} onChange={e => setNewResult({ ...newResult, grade: e.target.value })} required />

                    <button type="submit" className="btn-primary">Add Result</button>
                </form>
            </div>

            <div className="card" style={{ marginTop: '24px' }}>
                <h3>All Results</h3>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Term</th>
                            <th>Subject</th>
                            <th>Marks</th>
                            <th>Grade</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map((r: any) => (
                            <tr key={r.id}>
                                <td>{r.student?.name}</td>
                                <td>{r.semester}</td>
                                <td>{r.subject}</td>
                                <td>{r.marks} / {r.totalMarks}</td>
                                <td><strong>{r.grade}</strong></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ManageResults;
