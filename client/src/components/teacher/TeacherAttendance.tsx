import { useState, useEffect } from 'react';
import api from '../../services/api';
import { MAIN_SUBJECTS } from '../../utils/constants';

const TeacherAttendance = () => {
    const [tab, setTab] = useState<'students' | 'self'>('students');
    const [classes, setClasses] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [subject, setSubject] = useState('');

    useEffect(() => {
        // Fetch classes assigned to this teacher (for simplicity, fetching all classes they has access to)
        api.get('/users/classes').then(res => setClasses(res.data)).catch(console.error);
    }, []);

    useEffect(() => {
        if (selectedClass) {
            api.get('/users/students').then(res => {
                // Filter students by class (in real app, API should handle filtering)
                const filtered = res.data.filter((s: any) => s.classId === selectedClass);
                setStudents(filtered);
            }).catch(console.error);
        } else {
            setStudents([]);
        }
    }, [selectedClass]);

    const markStudentAttendance = async (studentId: string, status: string) => {
        try {
            await api.post('/attendance/student', {
                date,
                status,
                studentId,
                classId: selectedClass,
                subject
            });
            alert('Attendance marked!');
        } catch (error) {
            console.error('Failed to mark attendance', error);
        }
    };

    const handleSelfAttendance = async (status: string) => {
        try {
            await api.post('/attendance/teacher', {
                date: new Date().toISOString().split('T')[0],
                status
            });
            alert(`Your attendance marked as ${status}`);
        } catch (error) {
            console.error('Failed to mark self attendance', error);
        }
    };

    return (
        <div className="manage-section">
            <div className="tabs">
                <button className={`tab ${tab === 'students' ? 'active' : ''}`} onClick={() => setTab('students')}>Student Attendance</button>
                <button className={`tab ${tab === 'self' ? 'active' : ''}`} onClick={() => setTab('self')}>My Attendance</button>
            </div>

            {tab === 'students' && (
                <div className="card mt-4">
                    <h3>Mark Class Attendance</h3>
                    <div className="form-grid mb-4">
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
                        <select value={subject} onChange={e => setSubject(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                            <option value="">Select Subject (Optional)</option>
                            {MAIN_SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                        </select>
                        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                            <option value="">Select Class to Mark</option>
                            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    {selectedClass && students.length > 0 && (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Roll Number</th>
                                    <th>Name</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((s: any) => (
                                    <tr key={s.id}>
                                        <td>{s.rollNumber}</td>
                                        <td>{s.name}</td>
                                        <td>
                                            <button onClick={() => markStudentAttendance(s.id, 'PRESENT')} className="btn-success btn-sm mr-2">Present</button>
                                            <button onClick={() => markStudentAttendance(s.id, 'LATE')} className="btn-primary btn-sm mr-2" style={{ backgroundColor: '#f59e0b' }}>Late</button>
                                            <button onClick={() => markStudentAttendance(s.id, 'ABSENT')} className="btn-danger btn-sm">Absent</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    {selectedClass && students.length === 0 && <p>No students found in this class.</p>}
                </div>
            )}

            {tab === 'self' && (
                <div className="card mt-4">
                    <h3>Mark My Daily Attendance</h3>
                    <p>Date: {new Date().toLocaleDateString()}</p>
                    <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                        <button onClick={() => handleSelfAttendance('PRESENT')} className="btn-success">Mark Present</button>
                        <button onClick={() => handleSelfAttendance('LATE')} className="btn-primary" style={{ backgroundColor: '#f59e0b' }}>Mark Late</button>
                        <button onClick={() => handleSelfAttendance('ABSENT')} className="btn-danger">Mark Absent</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherAttendance;
