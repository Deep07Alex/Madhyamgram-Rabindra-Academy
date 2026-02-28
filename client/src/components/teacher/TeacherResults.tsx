import { useState, useEffect } from 'react';
import api from '../../services/api';

const TeacherResults = () => {
    const [classes, setClasses] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [results, setResults] = useState([]);

    useEffect(() => {
        api.get('/users/classes').then(res => setClasses(res.data)).catch(console.error);
    }, []);

    useEffect(() => {
        if (selectedClass) {
            api.get('/users/students').then(res => {
                const filtered = res.data.filter((s: any) => s.classId === selectedClass);
                setStudents(filtered);
            }).catch(console.error);
        } else {
            setStudents([]);
        }
    }, [selectedClass]);

    const fetchStudentResults = async (studentId: string) => {
        try {
            const res = await api.get(`/results?studentId=${studentId}`);
            setResults(res.data);
        } catch (error) {
            console.error('Failed to fetch results', error);
        }
    };

    return (
        <div className="manage-section">
            <div className="card">
                <h3>View Class Results</h3>
                <div className="form-grid mb-4">
                    <select value={selectedClass} onChange={e => {
                        setSelectedClass(e.target.value);
                        setResults([]);
                    }}>
                        <option value="">Select Class to View</option>
                        {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>

                    {selectedClass && (
                        <select onChange={e => fetchStudentResults(e.target.value)}>
                            <option value="">Select Student</option>
                            {students.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.rollNumber})</option>)}
                        </select>
                    )}
                </div>

                {results.length > 0 && (
                    <table className="data-table mt-4">
                        <thead>
                            <tr>
                                <th>Term</th>
                                <th>Subject</th>
                                <th>Marks</th>
                                <th>Grade</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((r: any) => (
                                <tr key={r.id}>
                                    <td>{r.semester}</td>
                                    <td>{r.subject}</td>
                                    <td>{r.marks} / {r.totalMarks}</td>
                                    <td><strong>{r.grade}</strong></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {selectedClass && students.length > 0 && results.length === 0 && <p className="mt-4">Please select a student to view their recorded results, or no results exist.</p>}
            </div>
        </div>
    );
};

export default TeacherResults;
