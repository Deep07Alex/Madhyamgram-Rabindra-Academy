import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { UserCircle, UserPlus, List, Eye, EyeOff, Save, X, Phone, Fingerprint } from 'lucide-react';

const ManageTeachers = () => {
    const { showToast } = useToast();
    const [teachers, setTeachers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
    const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
    const [editData, setEditData] = useState<any>({});


    const [newUser, setNewUser] = useState({
        name: '', email: '', teacherId: '', password: '',
        phone: '', aadhar: '', designation: 'A. TEACHER', joiningDate: new Date().toISOString().split('T')[0],
        isTeaching: true
    });

    const fetchData = async () => {
        try {
            const teachRes = await api.get('/users/teachers');
            setTeachers(teachRes.data);
        } catch (error) {
            console.error('Failed to fetch teachers:', error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateTeacher = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let finalUser = { ...newUser, role: 'TEACHER' };
            if (['PRINCIPAL', 'HEAD MISTRESS'].includes(newUser.designation) && newUser.teacherId && !newUser.teacherId.toUpperCase().startsWith('A-')) {
                finalUser.teacherId = `A-${newUser.teacherId}`;
            }
            await api.post('/auth/register', finalUser);
            showToast('Faculty member enrolled successfully', 'success');
            setNewUser({
                name: '', email: '', teacherId: '', password: '',
                phone: '', aadhar: '', designation: 'A. TEACHER', joiningDate: new Date().toISOString().split('T')[0],
                isTeaching: true
            });
            fetchData();
        } catch (error: any) {
            console.error('Failed to create faculty:', error);
            showToast(error.response?.data?.message || 'Failed to create faculty', 'error');
        }
    };

    const handleDeleteTeacher = async (id: string) => {
        if (!confirm('Are you sure you want to delete this faculty member?')) return;
        try {
            await api.delete(`/users/teachers/${id}`);
            showToast('Faculty member deleted successfully', 'success');
            fetchData();
        } catch (error) {
            console.error('Failed to delete faculty:', error);
        }
    };

    const handleUpdateTeacher = async (id: string) => {
        try {
            await api.patch(`/users/teachers/${id}`, editData);
            setEditingTeacherId(null);
            setEditData({});
            fetchData();
            showToast('Faculty member updated successfully', 'success');
        } catch (error) {
            console.error('Failed to update faculty:', error);
            showToast('Failed to update faculty', 'error');
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

    const filteredTeachers = teachers.filter((t: any) =>
        (t.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.teacherId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.designation || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="manage-section">
            <div className="card" style={{ marginTop: '0' }}>
                <h3>
                    <UserPlus size={20} color="var(--primary-bold)" />
                    Enroll New Faculty & Staff
                </h3>
                <form onSubmit={handleCreateTeacher} className="form-grid">
                    <div className="form-group">
                        <label>Full Name</label>
                        <input type="text" placeholder="Enter Full Name" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label>Designation</label>
                        <select value={newUser.designation} onChange={e => {
                            const val = e.target.value;
                            const isAdminRole = ['PRINCIPAL', 'HEAD MISTRESS'].includes(val);
                            const isCoreTeacher = val === 'A. TEACHER';
                            const isNonTeaching = val === 'NON-TEACHING STAFF';

                            // Logic: Admin and Core Teachers get login access by default. 
                            // Specialist and Non-Teaching do NOT.
                            const shouldHaveLogin = isAdminRole || isCoreTeacher;

                            let newTeacherId = '';
                            
                            // Only preserve or update ID if we have enough info
                            if (isAdminRole && newUser.phone) {
                                newTeacherId = `A-${newUser.phone}`;
                            } else if (!isAdminRole && newUser.aadhar && newUser.aadhar.length >= 8) {
                                const prefix = isNonTeaching ? '' : 'T-';
                                if (prefix) {
                                    newTeacherId = `${prefix}${newUser.aadhar.slice(-8)}`;
                                }
                            }

                            setNewUser({
                                ...newUser,
                                designation: val,
                                isTeaching: shouldHaveLogin,
                                teacherId: newTeacherId
                            });
                        }} required>
                            <option value="PRINCIPAL">PRINCIPAL</option>
                            <option value="HEAD MISTRESS">HEAD MISTRESS</option>
                            <option value="A. TEACHER">A. TEACHER</option>
                            <option value="KARATE TEACHER">KARATE TEACHER</option>
                            <option value="DANCE TEACHER">DANCE TEACHER</option>
                            <option value="NON-TEACHING STAFF">NON-TEACHING STAFF</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Phone Number</label>
                        <input 
                            type="text" 
                            placeholder="e.g. 9830XXXXXX" 
                            value={newUser.phone} 
                            onChange={e => {
                                const phone = e.target.value;
                                const isAdminRole = ['PRINCIPAL', 'HEAD MISTRESS'].includes(newUser.designation);
                                setNewUser({ 
                                    ...newUser, 
                                    phone: phone,
                                    teacherId: isAdminRole ? `A-${phone}` : newUser.teacherId 
                                });
                            }} 
                        />
                    </div>
                    <div className="form-group">
                        <label>Aadhar Number</label>
                        <input 
                            type="text" 
                            placeholder="12-digit Aadhar" 
                            value={newUser.aadhar} 
                            onChange={e => {
                                const aadhar = e.target.value;
                                const isAdminRole = ['PRINCIPAL', 'HEAD MISTRESS'].includes(newUser.designation);
                                const isNonTeaching = newUser.designation === 'NON-TEACHING STAFF';
                                let teacherId = '';
                                
                                if (aadhar.length >= 8 && !isNonTeaching) {
                                    const prefix = isAdminRole ? 'A-' : 'T-';
                                    teacherId = `${prefix}${aadhar.slice(-8)}`;
                                }
                                
                                setNewUser({ 
                                    ...newUser, 
                                    aadhar: aadhar,
                                    teacherId: teacherId
                                });
                            }} 
                        />
                    </div>
                    <div className="form-group">
                        <label>Date of Joining</label>
                        <input type="date" value={newUser.joiningDate} onChange={e => setNewUser({ ...newUser, joiningDate: e.target.value })} />
                    </div>
                    {!['NON-TEACHING STAFF', 'KARATE TEACHER', 'DANCE TEACHER'].includes(newUser.designation) && (
                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '10px' }}>
                            <input type="checkbox" id="isTeaching" checked={newUser.isTeaching} onChange={e => setNewUser({ ...newUser, isTeaching: e.target.checked })} />
                            <label htmlFor="isTeaching" style={{ margin: 0 }}>Teaching Staff (Login Access)</label>
                        </div>
                    )}

                    {newUser.isTeaching && !['NON-TEACHING STAFF', 'KARATE TEACHER', 'DANCE TEACHER'].includes(newUser.designation) && (
                        <>
                            <div className="form-group">
                                <label>{['PRINCIPAL', 'HEAD MISTRESS'].includes(newUser.designation) ? 'Admin ID (Login ID)' : 'Teacher ID (Login ID)'}</label>
                                <input 
                                    type="text" 
                                    placeholder={['PRINCIPAL', 'HEAD MISTRESS'].includes(newUser.designation) ? 'e.g. A-101' : 'e.g. T-101'} 
                                    value={newUser.teacherId} 
                                    onChange={e => setNewUser({ ...newUser, teacherId: e.target.value })} 
                                    required={newUser.isTeaching} 
                                />
                            </div>
                            <div className="form-group">
                                <label>Password (Auto-generated if empty)</label>
                                <input type="password" placeholder="Leave empty to auto-generate" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required={false} />
                            </div>
                        </>
                    )}

                    <div className="form-group" style={{ alignSelf: 'end' }}>
                        <button type="submit" className="btn-primary" style={{ width: '100%', height: '42px' }}>Enroll Faculty</button>
                    </div>
                </form>
            </div>

            <div className="card" style={{ marginTop: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0 }}>
                        <List size={20} color="var(--primary-bold)" />
                        Registered Faculty & Staff
                    </h3>
                    <div style={{ position: 'relative', width: '300px' }}>
                        <input
                            type="text"
                            placeholder="Search by Name, ID or Designation..."
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
                        <UserCircle size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Sl. No.</th>
                                <th>Name</th>
                                <th>Contacts</th>
                                <th>Designation</th>
                                <th>Staff Type</th>
                                <th>Date of Joining</th>
                                <th>Login Info</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTeachers.map((user: any, index: number) => (
                                <tr key={user.id}>
                                    <td>{index + 1}</td>
                                    <td>
                                        {editingTeacherId === user.id ? (
                                            <input type="text" value={editData.name || user.name} onChange={e => setEditData({ ...editData, name: e.target.value })} style={{ padding: '4px', width: '120px' }} />
                                        ) : (
                                            <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                                                {user.name} <span style={{ fontSize: '0.8rem', color: 'var(--primary-bold)', opacity: 0.8 }}>({user.designation})</span>
                                            </div>
                                        )}
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user.email}</div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            {editingTeacherId === user.id ? (
                                                <>
                                                    <input type="text" placeholder="Phone" value={editData.phone !== undefined ? editData.phone : (user.phone || '')} onChange={e => setEditData({ ...editData, phone: e.target.value })} style={{ padding: '4px', fontSize: '0.8rem' }} />
                                                    <input type="text" placeholder="Aadhar" value={editData.aadhar !== undefined ? editData.aadhar : (user.aadhar || '')} onChange={e => setEditData({ ...editData, aadhar: e.target.value })} style={{ padding: '4px', fontSize: '0.8rem' }} />
                                                </>
                                            ) : (
                                                <>
                                                    <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} /> {user.phone || '—'}</span>
                                                    <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Fingerprint size={12} /> {user.aadhar || '—'}</span>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        {editingTeacherId === user.id ? (
                                            <select value={editData.designation || user.designation} onChange={e => setEditData({ ...editData, designation: e.target.value })} style={{ padding: '4px' }}>
                                                <option value="PRINCIPAL">PRINCIPAL</option>
                                                <option value="HEAD MISTRESS">HEAD MISTRESS</option>
                                                <option value="A. TEACHER">A. TEACHER</option>
                                                <option value="KARATE TEACHER">KARATE TEACHER</option>
                                                <option value="DANCE TEACHER">DANCE TEACHER</option>
                                                <option value="NON-TEACHING STAFF">NON-TEACHING STAFF</option>
                                            </select>
                                        ) : (
                                            <span style={{ fontWeight: '600', color: 'var(--primary-bold)' }}>{user.designation}</span>
                                        )}
                                    </td>
                                    <td>
                                        <span style={{
                                            padding: '4px 8px',
                                            borderRadius: '12px',
                                            fontSize: '0.7rem',
                                            fontWeight: '700',
                                            background: user.isTeaching ? 'var(--primary-soft)' : '#f1f5f9',
                                            color: user.isTeaching ? 'var(--primary-bold)' : '#475569'
                                        }}>
                                            {['PRINCIPAL', 'HEAD MISTRESS'].includes(user.designation) ? 'ADMIN' : (user.isTeaching ? 'TEACHING' : 'NON-TEACHING')}
                                        </span>
                                    </td>
                                    <td>
                                        {editingTeacherId === user.id ? (
                                            <input type="date" value={editData.joiningDate || (user.joiningDate ? user.joiningDate.split('T')[0] : '')} onChange={e => setEditData({ ...editData, joiningDate: e.target.value })} style={{ padding: '4px' }} />
                                        ) : (
                                            <span style={{ fontSize: '0.85rem' }}>{user.joiningDate ? new Date(user.joiningDate).toLocaleDateString() : '—'}</span>
                                        )}
                                    </td>
                                    <td>
                                        {user.isTeaching ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>{user.teacherId}</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontWeight: '600', color: user.plainPassword ? 'var(--text-main)' : 'var(--error)', minWidth: '60px', fontSize: '0.75rem' }}>
                                                        {visiblePasswords.has(user.id) ? (user.plainPassword || 'No Password') : '********'}
                                                    </span>
                                                    <button onClick={() => togglePasswordVisibility(user.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0' }}>
                                                        {visiblePasswords.has(user.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No Login Access</span>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {editingTeacherId === user.id ? (
                                                <>
                                                    <button onClick={() => handleUpdateTeacher(user.id)} className="btn-primary btn-sm" style={{ background: 'var(--success)', border: 'none' }}><Save size={14} /></button>
                                                    <button onClick={() => { setEditingTeacherId(null); setEditData({}); }} className="btn-danger btn-sm" style={{ background: '#94a3b8', border: 'none' }}><X size={14} /></button>
                                                </>
                                            ) : (
                                                <button onClick={() => { setEditingTeacherId(user.id); setEditData({}); }} className="btn-primary btn-sm" style={{ padding: '6px 10px', fontSize: '0.75rem' }}>Edit</button>
                                            )}
                                            <button onClick={() => handleDeleteTeacher(user.id)} className="btn-danger btn-sm" style={{ padding: '6px 10px', fontSize: '0.75rem' }}>Delete</button>
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

export default ManageTeachers;
