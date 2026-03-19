import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { UserCircle, UserPlus, List, Eye, EyeOff, Edit, Trash2, Users, Search, Save } from 'lucide-react';
import PhotoUpload from '../common/PhotoUpload';
import Modal from '../common/Modal';
import { useFetch } from '../../hooks/useFetch';

const ManageStudents = () => {
    const { showToast } = useToast();
    const { data: studentsData, refetch: refreshStudents } = useFetch<any[]>('/users/students');
    const { data: classesData } = useFetch<any[]>('/users/classes');
    const students = studentsData || [];
    const classes = classesData || [];
    
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const [newUser, setNewUser] = useState({
        password: '', name: '', email: '',
        rollNumber: '',
        studentId: '',
        banglarSikkhaId: '',
        classId: '',
        photo: ''
    });

    const [editData, setEditData] = useState<any>({
        name: '',
        studentId: '',
        rollNumber: '',
        banglarSikkhaId: '',
        email: '',
        password: '',
        photo: ''
    });

    useEffect(() => {
        if (classes.length > 0 && !newUser.classId) {
            setNewUser(prev => ({ ...prev, classId: classes[0].id }));
        }
    }, [classes]);

    const handleCreateStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...newUser,
                role: 'STUDENT'
            };

            await api.post('/auth/register', payload);
            showToast('Student enrolled successfully', 'success');
            setNewUser({ password: '', name: '', email: '', rollNumber: '', studentId: '', banglarSikkhaId: '', classId: classes[0]?.id || '', photo: '' });
            refreshStudents();
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
            refreshStudents();
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
            refreshStudents();
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
            refreshStudents();
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

    const handleUpdateStudent = async () => {
        if (!selectedStudent) return;
        try {
            // Prevent sending existing password hash or plain text back to the server unless explicitly changing password
            const { password, plainPassword, id, ...updatePayload } = editData;

            // Auto-generate password on update as requested
            const cleanName = (updatePayload.name || '').trim().toLowerCase().replace(/\s+/g, '');
            const capitalizedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
            const numericId = (updatePayload.studentId || '').replace(/\D/g, '');
            updatePayload.password = `${capitalizedName}@${numericId.slice(-4) || '0000'}`;

            await api.patch(`/users/students/${selectedStudent.id}`, updatePayload);
            setIsEditModalOpen(false);
            setSelectedStudent(null);
            refreshStudents();
            showToast('Student updated successfully', 'success');
        } catch (error: any) {
            console.error('Failed to update student:', error);
            showToast(error.response?.data?.message || 'Failed to update student', 'error');
        }
    };

    const filteredStudents = students.filter((s: any) => {
        const matchesSearch =
            (s.studentId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.name || '').toLowerCase().includes(searchQuery.toLowerCase());
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
                        transition: 'var(--transition-base)',
                        minWidth: '200px',
                        flex: '1 1 200px'
                    }}
                >
                    <UserCircle size={18} />
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
                        transition: 'var(--transition-base)',
                        minWidth: '200px',
                        flex: '1 1 200px'
                    }}
                >
                    <Trash2 size={18} />
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
                        <label>Password</label>
                        <input type="password" placeholder="Leave empty for auto-generation" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
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
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label>Student Photo</label>
                        <PhotoUpload
                            value={newUser.photo}
                            onChange={(url: string) => setNewUser({ ...newUser, photo: url })}
                            label="Upload Photo"
                            uploadPath="/uploads/student-photo"
                        />
                    </div>
                    <div className="form-group" style={{ alignSelf: 'end', gridColumn: '1 / -1' }}>
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
                                placeholder="Search Student"
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
                            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        </div>
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>PHOTO</th>
                                <th>NAME</th>
                                <th>ADMISSION NO (LOGIN ID)</th>
                                <th>PASSWORD</th>
                                <th>ROLL NO</th>
                                <th>BANGLAR SIKKHA ID</th>
                                <th>CLASS</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map((user: any) => (
                                <tr key={user.id}>
                                    <td style={{ padding: '24px 20px', verticalAlign: 'middle' }}>
                                        <div style={{ width: '45px', height: '45px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-soft)', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {user.photo ? (
                                                <img src={`${import.meta.env.VITE_API_URL}${user.photo}`} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <Users size={24} color="var(--text-muted)" />
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '24px 20px' }}>
                                        <div style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '0.9rem' }}>{user.name.toUpperCase()}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-main)', opacity: 0.8 }}>{user.email || 'No email'}</div>
                                    </td>
                                    <td style={{ color: 'var(--text-main)', fontWeight: '800', fontSize: '0.8rem', padding: '24px 20px' }}>
                                        {user.studentId}
                                    </td>
                                    <td style={{ padding: '24px 20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontWeight: '700', color: 'var(--text-main)', minWidth: '80px', fontSize: '0.9rem' }}>
                                                {visiblePasswords.has(user.id) ? (user.plainPassword || 'Update') : '••••••••'}
                                            </span>
                                            <button
                                                onClick={() => togglePasswordVisibility(user.id)}
                                                style={{ background: 'none', border: 'none', color: 'var(--text-main)', opacity: 0.6, cursor: 'pointer', padding: '4px' }}
                                            >
                                                {visiblePasswords.has(user.id) ? <Eye size={16} /> : <EyeOff size={16} />}
                                            </button>
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--text-main)', fontWeight: '600', padding: '24px 20px' }}>
                                        {user.rollNumber}
                                    </td>
                                    <td style={{ color: 'var(--text-main)', fontWeight: '600', padding: '24px 20px' }}>
                                        {user.banglarSikkhaId || '-'}
                                    </td>
                                    <td style={{ color: 'var(--text-main)', fontWeight: '600', padding: '24px 20px' }}>{user.class?.name}</td>
                                    <td style={{ padding: '24px 20px' }}>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button 
                                                onClick={() => {
                                                    setSelectedStudent(user);
                                                    setEditData({
                                                        name: user.name,
                                                        studentId: user.studentId,
                                                        rollNumber: user.rollNumber,
                                                        banglarSikkhaId: user.banglarSikkhaId || '',
                                                        email: user.email || '',
                                                        password: '',
                                                        photo: user.photo || ''
                                                    });
                                                    setIsEditModalOpen(true);
                                                }} 
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    background: 'none',
                                                    color: '#f4d394',
                                                    border: '1px solid #f4d394',
                                                    padding: '8px 16px',
                                                    borderRadius: '10px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    whiteSpace: 'nowrap'
                                                }}
                                                className="hover-scale"
                                            >
                                                <Edit size={14} /> Edit
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteStudent(user.id)} 
                                                style={{
                                                    background: 'none',
                                                    color: '#ef4444',
                                                    border: '1px solid #ef4444',
                                                    padding: '8px',
                                                    borderRadius: '10px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.2s'
                                                }}
                                                className="hover-scale"
                                                title="Delete Student"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={isEditModalOpen && !!selectedStudent}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedStudent(null);
                }}
                title={`Edit Student Profile: ${selectedStudent?.name || ''}`}
                maxWidth="800px"
                footer={
                    <>
                        <button 
                            onClick={() => setIsEditModalOpen(false)} 
                            className="btn-secondary" 
                            style={{ padding: '10px 24px', background: 'var(--bg-hover)', color: 'var(--text-main)', border: '1px solid var(--border-soft)' }}
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleUpdateStudent} 
                            className="btn-primary" 
                            style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Save size={18} /> Update Student
                        </button>
                    </>
                }
            >
                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', gridColumn: '1 / -1' }}>
                        <div style={{ maxWidth: '200px', margin: '0 auto' }}>
                           <PhotoUpload 
                               value={editData.photo || ''} 
                               onChange={(url: string) => setEditData({ ...editData, photo: url })} 
                               label="Update Profile Photo" 
                               uploadPath="/uploads/student-photo"
                           />
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', gridColumn: '1 / -1' }}>
                        <div className="form-group">
                            <label>Full Name</label>
                            <input type="text" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Admission Number (Login ID)</label>
                            <input type="text" value={editData.studentId} onChange={e => setEditData({ ...editData, studentId: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Email Address</label>
                            <input type="email" value={editData.email} onChange={e => setEditData({ ...editData, email: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Roll Number</label>
                            <input type="text" value={editData.rollNumber} onChange={e => setEditData({ ...editData, rollNumber: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>New Password (Optional)</label>
                            <input type="password" placeholder="Leave empty to keep current password" value={editData.password} onChange={e => setEditData({ ...editData, password: e.target.value })} />
                        </div>
                        {selectedStudent && selectedStudent.class && selectedStudent.class.grade >= 2 && (
                            <div className="form-group">
                                <label>Banglar Sikkha ID</label>
                                <input type="text" value={editData.banglarSikkhaId} onChange={e => setEditData({ ...editData, banglarSikkhaId: e.target.value })} />
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ManageStudents;
