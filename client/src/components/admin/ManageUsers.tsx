import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Users, UserCircle, UserPlus, List, Eye, EyeOff, Key, Save, X } from 'lucide-react';

const ManageUsers = () => {
    const { showToast } = useToast();
    const [tab, setTab] = useState<'students' | 'teachers'>('students');
    const [students, setStudents] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [classes, setClasses] = useState([]);

    const [newUser, setNewUser] = useState({
        password: '', name: '', email: '',
        rollNumber: '', // for student
        classId: '' // only for students
    });

    const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
    const [editingPasswordId, setEditingPasswordId] = useState<string | null>(null);
    const [tempPassword, setTempPassword] = useState('');

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
            if (clsRes.data.length > 0) {
                setNewUser(prev => ({ ...prev, classId: clsRes.data[0].id }));
            }
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
        } catch (error: any) {
            console.error('Failed to create user:', error);
            const errorMessage = error.response?.data?.message || 'Failed to create user. Please check the details.';
            showToast(errorMessage, 'error');
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

    const togglePasswordVisibility = (id: string) => {
        const newVisible = new Set(visiblePasswords);
        if (newVisible.has(id)) {
            newVisible.delete(id);
        } else {
            newVisible.add(id);
        }
        setVisiblePasswords(newVisible);
    };

    const handleUpdatePassword = async (id: string, type: 'student' | 'teacher') => {
        if (!tempPassword) return;
        try {
            await api.patch(`/users/${id}/password`, {
                password: tempPassword,
                type: type
            });
            setEditingPasswordId(null);
            setTempPassword('');
            fetchData();
        } catch (error) {
            console.error('Failed to update password:', error);
            showToast('Failed to update password. Please try again.', 'error');
        }
    };

    return (
        <div className="manage-section">
            <div className="tabs" style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '6px', borderRadius: 'var(--radius-md)', width: 'fit-content', marginBottom: '32px' }}>
                <button
                    className={`tab ${tab === 'students' ? 'active' : ''}`}
                    onClick={() => setTab('students')}
                    style={{
                        padding: '10px 24px',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: tab === 'students' ? 'white' : 'transparent',
                        color: tab === 'students' ? 'var(--primary-bold)' : 'var(--text-muted)',
                        boxShadow: tab === 'students' ? 'var(--shadow-sm)' : 'none',
                        transition: 'var(--transition-fast)'
                    }}
                >
                    <Users size={18} /> Students
                </button>
                <button
                    className={`tab ${tab === 'teachers' ? 'active' : ''}`}
                    onClick={() => setTab('teachers')}
                    style={{
                        padding: '10px 24px',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: tab === 'teachers' ? 'white' : 'transparent',
                        color: tab === 'teachers' ? 'var(--primary-bold)' : 'var(--text-muted)',
                        boxShadow: tab === 'teachers' ? 'var(--shadow-sm)' : 'none',
                        transition: 'var(--transition-fast)'
                    }}
                >
                    <UserCircle size={18} /> Teachers
                </button>
            </div>

            <div className="card" style={{ marginTop: '0' }}>
                <h3>
                    <UserPlus size={20} color="var(--primary-bold)" />
                    Enroll New {tab === 'students' ? 'Student' : 'Faculty'}
                </h3>
                <form onSubmit={handleCreateUser} className="form-grid">
                    <div className="form-group">
                        <label>Full Name</label>
                        <input type="text" placeholder="Enter Full Name" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input type="password" placeholder="Enter Password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label>Email (Optional)</label>
                        <input type="email" placeholder="Enter Email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                    </div>

                    {tab === 'students' && (
                        <div className="form-group">
                            <label>Roll Number</label>
                            <input
                                type="text"
                                placeholder="Enter Roll Number"
                                value={newUser.rollNumber}
                                onChange={e => setNewUser({ ...newUser, rollNumber: e.target.value })}
                                required
                            />
                        </div>
                    )}

                    {tab === 'students' && (
                        <div className="form-group">
                            <label>Select Class</label>
                            <select value={newUser.classId} onChange={e => setNewUser({ ...newUser, classId: e.target.value })} required>
                                {classes.length === 0 && <option value="">Loading Classes...</option>}
                                {classes.map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="form-group" style={{ alignSelf: 'end' }}>
                        <button type="submit" className="btn-primary" style={{ width: '100%', height: '42px' }}>Create {tab === 'students' ? 'Student' : 'Teacher'}</button>
                    </div>
                </form>
            </div>

            <div className="card" style={{ marginTop: '32px' }}>
                <h3>
                    <List size={20} color="var(--primary-bold)" />
                    Registered {tab === 'students' ? 'Students' : 'Faculty'}
                </h3>
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>{tab === 'students' ? 'Student ID' : 'Teacher ID'}</th>
                                <th>Password</th>
                                {tab === 'students' && <th>Roll No</th>}
                                {tab === 'students' && <th>Class</th>}
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(tab === 'students' ? students : teachers).map((user: any) => (
                                <tr key={user.id}>
                                    <td>
                                        <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{user.name}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{tab === 'students' ? user.studentId : user.teacherId}</div>
                                    </td>
                                    <td>{tab === 'students' ? user.studentId : user.teacherId}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {editingPasswordId === user.id ? (
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    <input
                                                        type="text"
                                                        value={tempPassword}
                                                        onChange={e => setTempPassword(e.target.value)}
                                                        placeholder="New password"
                                                        style={{ padding: '4px 8px', width: '120px', fontSize: '0.85rem' }}
                                                    />
                                                    <button onClick={() => handleUpdatePassword(user.id, tab === 'students' ? 'student' : 'teacher')} style={{ background: 'var(--success)', border: 'none', color: 'white', borderRadius: '4px', padding: '4px', cursor: 'pointer' }}>
                                                        <Save size={16} />
                                                    </button>
                                                    <button onClick={() => setEditingPasswordId(null)} style={{ background: '#94a3b8', border: 'none', color: 'white', borderRadius: '4px', padding: '4px', cursor: 'pointer' }}>
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span style={{ fontWeight: '600', color: user.plainPassword ? 'var(--text-main)' : 'var(--error)', minWidth: '80px', fontSize: user.plainPassword ? 'inherit' : '0.8rem' }}>
                                                        {visiblePasswords.has(user.id) ? (user.plainPassword || 'Please update') : '********'}
                                                    </span>
                                                    <button
                                                        onClick={() => togglePasswordVisibility(user.id)}
                                                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                                                    >
                                                        {visiblePasswords.has(user.id) ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    {tab === 'students' && <td>{user.rollNumber}</td>}
                                    {tab === 'students' && <td>{user.class?.name}</td>}
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => {
                                                    setEditingPasswordId(user.id);
                                                    setTempPassword('');
                                                }}
                                                className="btn-primary btn-sm"
                                                style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                                            >
                                                <Key size={14} /> Update
                                            </button>
                                            <button onClick={() => handleDeleteUser(user.id, tab === 'students' ? 'student' : 'teacher')} className="btn-danger btn-sm" style={{ padding: '6px 10px', fontSize: '0.75rem' }}>Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ManageUsers;
