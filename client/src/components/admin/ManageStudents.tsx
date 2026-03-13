import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Users, UserPlus, Upload, X, List, Eye, EyeOff, Key, Save } from 'lucide-react';

const ManageStudents = () => {
    const { showToast } = useToast();
    const [students, setStudents] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
    const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

    const [newUser, setNewUser] = useState({
        password: '', name: '', email: '',
        rollNumber: '',
        studentId: '',
        banglarSikkhaId: '',
        classId: ''
    });

    const [editData, setEditData] = useState({
        name: '',
        studentId: '',
        rollNumber: '',
        banglarSikkhaId: '',
        password: ''
    });

    const fetchData = async () => {
        try {
            const [stuRes, clsRes] = await Promise.all([
                api.get('/users/students'),
                api.get('/users/classes')
            ]);
            setStudents(stuRes.data);
            setClasses(clsRes.data);
            if (clsRes.data.length > 0 && !newUser.classId) {
                setNewUser(prev => ({ ...prev, classId: clsRes.data[0].id }));
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...newUser,
                role: 'STUDENT'
            };

            await api.post('/auth/register', payload);
            showToast('Student enrolled successfully', 'success');
            setNewUser({ password: '', name: '', email: '', rollNumber: '', studentId: '', banglarSikkhaId: '', classId: classes[0]?.id || '' });
            fetchData();
        } catch (error: any) {
            console.error('Failed to create student:', error);
            showToast(error.response?.data?.message || 'Failed to create student', 'error');
        }
    };

    const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post('/users/students/bulk', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showToast(response.data.message, 'success');
            fetchData();
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error: any) {
            console.error('Bulk import failed:', error);
            showToast(error.response?.data?.message || 'Bulk import failed', 'error');
        } finally {
            setIsImporting(false);
        }
    };

    const handleDeleteAllStudents = async () => {
        const confirm1 = confirm("CAUTION: This will entirely delete ALL students from the database. This action is irreversible. Are you sure?");
        if (!confirm1) return;

        const confirm2 = confirm("FINAL WARNING: Are you absolutely sure you want to delete EVERY student record?");
        if (!confirm2) return;

        try {
            await api.delete('/users/students/all');
            showToast('All students deleted successfully', 'success');
            fetchData();
        } catch (error: any) {
            console.error('Failed to delete all students:', error);
            showToast(error.response?.data?.message || 'Failed to delete all students', 'error');
        }
    };

    const handleDeleteStudent = async (id: string) => {
        if (!confirm('Are you sure you want to delete this student?')) return;
        try {
            await api.delete(`/users/students/${id}`);
            showToast('Student deleted successfully', 'success');
            fetchData();
        } catch (error) {
            console.error('Failed to delete student:', error);
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

    const handleUpdateStudent = async (id: string) => {
        try {
            await api.patch(`/users/students/${id}`, editData);
            setEditingStudentId(null);
            fetchData();
            showToast('Student updated successfully', 'success');
        } catch (error: any) {
            console.error('Failed to update student:', error);
            showToast(error.response?.data?.message || 'Failed to update student', 'error');
        }
    };

    const filteredStudents = students.filter((s: any) => {
        const matchesSearch = (s.studentId || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesClass = selectedClassId ? s.classId === selectedClassId : true;
        return matchesSearch && matchesClass;
    });

    return (
        <div className="manage-section">
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
                <input
                    type="file"
                    accept=".xlsx, .xls"
                    ref={fileInputRef}
                    onChange={handleBulkImport}
                    style={{ display: 'none' }}
                />
                <button
                    className="btn-primary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: 'linear-gradient(135deg, var(--primary-bold) 0%, var(--primary-rich) 100%)',
                        color: 'white',
                        padding: '10px 24px',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-md)',
                        transition: 'var(--transition-base)',
                        minWidth: '240px'
                    }}
                >
                    <Upload size={18} />
                    {isImporting ? 'Importing...' : 'Bulk Import Students (Excel)'}
                </button>
                <button
                    className="btn-danger"
                    onClick={handleDeleteAllStudents}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                        color: 'white',
                        padding: '10px 24px',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-md)',
                        transition: 'var(--transition-base)',
                        minWidth: '240px'
                    }}
                >
                    <X size={18} />
                    Delete All Students
                </button>
            </div>

            <div className="card" style={{ marginTop: '0' }}>
                <h3>
                    <UserPlus size={20} color="var(--primary-bold)" />
                    Enroll New Student
                </h3>
                <form onSubmit={handleCreateStudent} className="form-grid">
                    <div className="form-group">
                        <label>Full Name</label>
                        <input type="text" placeholder="Enter Full Name" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label>Password (Auto-generated if empty)</label>
                        <input type="password" placeholder="Leave empty to auto-generate" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Email (Optional)</label>
                        <input type="email" placeholder="Enter Email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Admission Number (Login ID)</label>
                        <input
                            type="text"
                            placeholder="e.g. S-1042"
                            value={newUser.studentId}
                            onChange={e => setNewUser({ ...newUser, studentId: e.target.value })}
                            required
                        />
                    </div>
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
                    <div className="form-group">
                        <label>Select Class</label>
                        <select value={newUser.classId} onChange={e => setNewUser({ ...newUser, classId: e.target.value })} required>
                            {classes.length === 0 && <option value="">Loading Classes...</option>}
                            {classes.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    {(() => {
                        const selectedClass = classes.find((c: any) => c.id === newUser.classId);
                        const showBanglarSikkha = selectedClass && selectedClass.grade >= 2;
                        if (!showBanglarSikkha) return null;

                        return (
                            <div className="form-group">
                                <label>Banglar Sikkha Portal ID</label>
                                <input
                                    type="text"
                                    placeholder="Enter Portal ID"
                                    value={newUser.banglarSikkhaId}
                                    onChange={e => setNewUser({ ...newUser, banglarSikkhaId: e.target.value })}
                                />
                            </div>
                        );
                    })()}
                    <div className="form-group" style={{ alignSelf: 'end' }}>
                        <button type="submit" className="btn-primary" style={{ width: '100%', height: '42px' }}>Enroll Student</button>
                    </div>
                </form>
            </div>

            <div className="card" style={{ marginTop: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0 }}>
                        <List size={20} color="var(--primary-bold)" />
                        View Registered Students
                    </h3>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <select
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            style={{
                                padding: '10px 16px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-main)',
                                color: 'var(--text-main)',
                                fontSize: '0.9rem',
                                outline: 'none'
                            }}
                        >
                            <option value="">All Classes</option>
                            {classes.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <div style={{ position: 'relative', width: '250px' }}>
                            <input
                                type="text"
                                placeholder="Search by Admission No..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 16px 10px 40px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-main)',
                                    fontSize: '0.9rem',
                                    outline: 'none'
                                }}
                            />
                            <Users size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        </div>
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Admission No (Login ID)</th>
                                <th>Password</th>
                                <th>Roll No</th>
                                <th>Banglar Sikkha ID</th>
                                <th>Class</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map((user: any) => (
                                <tr key={user.id}>
                                    <td>
                                        {editingStudentId === user.id ? (
                                            <input
                                                type="text"
                                                value={editData.name}
                                                onChange={e => setEditData({ ...editData, name: e.target.value })}
                                                style={{ padding: '6px 8px', width: '100%', fontSize: '0.9rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                                            />
                                        ) : (
                                            <>
                                                <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{user.name}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user.email || 'No email'}</div>
                                            </>
                                        )}
                                    </td>
                                    <td>
                                        {editingStudentId === user.id ? (
                                            <input
                                                type="text"
                                                value={editData.studentId}
                                                onChange={e => setEditData({ ...editData, studentId: e.target.value })}
                                                style={{ padding: '6px 8px', width: '100%', fontSize: '0.9rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                                            />
                                        ) : (
                                            user.studentId
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {editingStudentId === user.id ? (
                                                <input
                                                    type="text"
                                                    value={editData.password}
                                                    onChange={e => setEditData({ ...editData, password: e.target.value })}
                                                    placeholder="New password"
                                                    style={{ padding: '6px 8px', width: '120px', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                                                />
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
                                    <td>
                                        {editingStudentId === user.id ? (
                                            <input
                                                type="text"
                                                value={editData.rollNumber}
                                                onChange={e => setEditData({ ...editData, rollNumber: e.target.value })}
                                                style={{ padding: '6px 8px', width: '60px', fontSize: '0.9rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                                            />
                                        ) : (
                                            user.rollNumber
                                        )}
                                    </td>
                                    <td>
                                        {editingStudentId === user.id ? (
                                            (() => {
                                                const showBanglarSikkha = user.class && user.class.grade >= 2;
                                                if (!showBanglarSikkha) return '-';
                                                return (
                                                    <input
                                                        type="text"
                                                        value={editData.banglarSikkhaId}
                                                        onChange={e => setEditData({ ...editData, banglarSikkhaId: e.target.value })}
                                                        style={{ padding: '6px 8px', width: '140px', fontSize: '0.9rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                                                    />
                                                );
                                            })()
                                        ) : (
                                            user.banglarSikkhaId || '-'
                                        )}
                                    </td>
                                    <td>{user.class?.name}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {editingStudentId === user.id ? (
                                                <>
                                                    <button onClick={() => handleUpdateStudent(user.id)} className="btn-success btn-sm" style={{ padding: '6px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Save size={14} /> Save
                                                    </button>
                                                    <button onClick={() => setEditingStudentId(null)} className="btn-secondary btn-sm" style={{ padding: '6px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', background: '#94a3b8', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                                                        <X size={14} /> Cancel
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            setEditingStudentId(user.id);
                                                            setEditData({
                                                                name: user.name,
                                                                studentId: user.studentId,
                                                                rollNumber: user.rollNumber,
                                                                banglarSikkhaId: user.banglarSikkhaId || '',
                                                                password: ''
                                                            });
                                                        }}
                                                        className="btn-primary btn-sm"
                                                        style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                                                    >
                                                        <Key size={14} /> Update
                                                    </button>
                                                    <button onClick={() => handleDeleteStudent(user.id)} className="btn-danger btn-sm" style={{ padding: '6px 10px', fontSize: '0.75rem' }}>Delete</button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredStudents.length === 0 && (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                        No students found matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ManageStudents;
