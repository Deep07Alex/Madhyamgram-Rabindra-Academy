import { useState, useEffect } from 'react';
import api from '../../services/api';

const ManageUsers = () => {
    const [tab, setTab] = useState<'students' | 'teachers'>('students');
    const [students, setStudents] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [classes, setClasses] = useState([]);

    const [newUser, setNewUser] = useState({
        password: '', name: '', email: '',
        rollNumber: '', // for student
        classId: '' // only for students
    });

    const fetchData = async () => {
        try {
            const [stuRes, teachRes, clsRes] = await Promise.all([
                api.get('/users/students'),
                api.get('/users/teachers'),
                api.get('/users/classes')
            ]);
            setStudents(stuRes.data);
            setTeachers(teachRes.data);
            setClasses(clsRes.data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const endpoint = '/auth/register';
            // In a real app we might have a specific endpoint for admins to create users, 
            // but the /auth/register endpoint can handle this for now.
            const payload = {
                name: newUser.name,
                email: newUser.email,
                password: newUser.password,
                role: tab === 'teachers' ? 'TEACHER' : 'STUDENT',
                rollNumber: tab === 'students' ? newUser.rollNumber : undefined,
                classId: tab === 'students' ? newUser.classId : undefined
            };

            await api.post(endpoint, payload);
            setNewUser({ password: '', name: '', email: '', rollNumber: '', classId: '' });
            fetchData();
        } catch (error) {
            console.error('Failed to create user:', error);
            alert('Failed to create user');
        }
    };

    const handleDeleteUser = async (id: string, role: string) => {
        if (!confirm(`Are you sure you want to delete this ${role}?`)) return;
        try {
            await api.delete(`/users/${role}s/${id}`);
            fetchData();
        } catch (error) {
            console.error(`Failed to delete ${role}:`, error);
        }
    };

    return (
        <div className="manage-section">
            <div className="tabs" style={{ marginBottom: '20px' }}>
                <button className={`tab ${tab === 'students' ? 'active' : ''}`} onClick={() => setTab('students')}>
                    Students
                </button>
                <button className={`tab ${tab === 'teachers' ? 'active' : ''}`} onClick={() => setTab('teachers')}>
                    Teachers
                </button>
            </div>

            <div className="card" style={{ marginTop: '24px' }}>
                <h3>Create New {tab === 'students' ? 'Student' : 'Teacher'}</h3>
                <form onSubmit={handleCreateUser} className="form-grid">
                    <input type="text" placeholder="Full Name" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} required />
                    <input type="password" placeholder="Password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required />
                    <input type="email" placeholder="Email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />

                    {tab === 'students' && (
                        <input
                            type="text"
                            placeholder="Roll Number"
                            value={newUser.rollNumber}
                            onChange={e => setNewUser({ ...newUser, rollNumber: e.target.value })}
                            required
                        />
                    )}

                    {tab === 'students' && (
                        <select value={newUser.classId} onChange={e => setNewUser({ ...newUser, classId: e.target.value })} required>
                            <option value="">Select Class</option>
                            {classes.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    )}

                    <button type="submit" className="btn-primary">Create {tab === 'students' ? 'Student' : 'Teacher'}</button>
                </form>
            </div>

            <div className="card" style={{ marginTop: '24px' }}>
                <h3>Existing {tab === 'students' ? 'Students' : 'Teachers'}</h3>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>{tab === 'students' ? 'Student ID' : 'Teacher ID'}</th>
                            {tab === 'students' && <th>Roll No</th>}
                            {tab === 'students' && <th>Class</th>}
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(tab === 'students' ? students : teachers).map((user: any) => (
                            <tr key={user.id}>
                                <td>{user.name}</td>
                                <td>{tab === 'students' ? user.studentId : user.teacherId}</td>
                                {tab === 'students' && <td>{user.rollNumber}</td>}
                                {tab === 'students' && <td>{user.class?.name}</td>}
                                <td>
                                    <button onClick={() => handleDeleteUser(user.id, tab === 'students' ? 'student' : 'teacher')} className="btn-danger btn-sm">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ManageUsers;
