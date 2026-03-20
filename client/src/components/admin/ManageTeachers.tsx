import { useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { UserCircle, UserPlus, List, Eye, EyeOff, Save, Phone, Fingerprint, MapPin, GraduationCap, Calendar, Users as UsersIcon } from 'lucide-react';
import PhotoUpload from '../common/PhotoUpload';
import Modal from '../common/Modal';
import { useFetch } from '../../hooks/useFetch';
import useServerEvents from '../../hooks/useServerEvents';

const ManageTeachers = () => {
    const { showToast } = useToast();
    const { data: teachersData, refetch: refreshTeachers } = useFetch<any[]>('/users/teachers');
    const teachers = teachersData || [];
    
    const [searchQuery, setSearchQuery] = useState('');
    const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
    const [editData, setEditData] = useState<any>({});
    const [selectedTeacher, setSelectedTeacher] = useState<any | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    useServerEvents({ 'profile_updated': refreshTeachers });

    const [newUser, setNewUser] = useState({
        name: '', email: '', teacherId: '', password: '',
        phone: '', aadhar: '', designation: 'A. TEACHER', joiningDate: new Date().toISOString().split('T')[0],
        isTeaching: true,
        photo: '', address: '', dob: '', qualification: '', extraQualification: '', caste: 'GENERAL'
    });

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
                isTeaching: true,
                photo: '', address: '', dob: '', qualification: '', extraQualification: '', caste: 'GENERAL'
            });
            refreshTeachers();
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
            refreshTeachers();
        } catch (error) {
            console.error('Failed to delete faculty:', error);
        }
    };

    const handleUpdateTeacher = async () => {
        if (!selectedTeacher) return;
        try {
            // Prevent sending existing password hash or plain text back to the server unless explicitly changing password via another method 
            const { password, plainPassword, id, ...updatePayload } = editData;

            // Auto-generate password on update as requested
            const cleanName = (updatePayload.name || '').trim().toLowerCase().replace(/\s+/g, '');
            const capitalizedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
            const aadhar = updatePayload.aadhar || '';
            const teacherId = updatePayload.teacherId || '';
            const suffixDigits = (aadhar && aadhar.length >= 4) ? aadhar.slice(-4) : teacherId.replace(/\D/g, '').slice(-4);
            updatePayload.password = `${capitalizedName}@${suffixDigits || '0000'}`;

            await api.patch(`/users/teachers/${selectedTeacher.id}`, updatePayload);
            setIsEditModalOpen(false);
            setSelectedTeacher(null);
            setEditData({});
            refreshTeachers();
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
                <PhotoUpload 
                    value={newUser.photo} 
                    onChange={url => setNewUser({ ...newUser, photo: url })} 
                    label="Teacher Photo" 
                    uploadPath="/uploads/teacher-photo"
                />
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
                            const shouldHaveLogin = isAdminRole || isCoreTeacher;

                            let newTeacherId = '';
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
                    <div className="form-group">
                        <label>Date of Birth</label>
                        <input type="date" value={newUser.dob} onChange={e => setNewUser({ ...newUser, dob: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Caste</label>
                        <select value={newUser.caste} onChange={e => setNewUser({ ...newUser, caste: e.target.value })}>
                            <option value="GENERAL">GENERAL</option>
                            <option value="SC">SC</option>
                            <option value="ST">ST</option>
                            <option value="OBC-A">OBC-A</option>
                            <option value="OBC-B">OBC-B</option>
                        </select>
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label>Address</label>
                        <textarea 
                            placeholder="Enter Full Address" 
                            value={newUser.address} 
                            onChange={e => setNewUser({ ...newUser, address: e.target.value })}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', resize: 'vertical', minHeight: '60px' }}
                        />
                    </div>
                    <div className="form-group">
                        <label>Qualification</label>
                        <input type="text" placeholder="e.g. M.Sc, B.Ed" value={newUser.qualification} onChange={e => setNewUser({ ...newUser, qualification: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Extra Qualification (Optional)</label>
                        <input type="text" placeholder="e.g. Computer Diploma" value={newUser.extraQualification} onChange={e => setNewUser({ ...newUser, extraQualification: e.target.value })} />
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

                    <div className="form-group" style={{ alignSelf: 'end', gridColumn: '1 / -1' }}>
                        <button type="submit" className="btn-primary" style={{ width: '100%', height: '42px', marginTop: '10px' }}>Enroll Faculty</button>
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
                            className="input-search"
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
                        <List size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>SL. NO.</th>
                                <th>PHOTO</th>
                                <th>NAME</th>
                                <th>CONTACTS</th>
                                <th>DESIGNATION</th>
                                <th>STAFF TYPE</th>
                                <th>DATE OF JOINING</th>
                                <th>LOGIN INFO</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTeachers.map((user: any, index: number) => (
                                <tr key={user.id}>
                                    <td style={{ fontWeight: '500', color: 'var(--text-main)', padding: '24px 20px' }}>{index + 1}</td>
                                    <td style={{ padding: '24px 20px', verticalAlign: 'middle' }}>
                                         <div style={{ width: '45px', height: '45px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-soft)', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {user.photo ? (
                                                <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${user.photo}?t=${Date.now()}`} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <UserCircle size={24} color="var(--primary-bold)" />
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '24px 20px' }}>
                                        <div style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '0.9rem' }}>{user.name.toUpperCase()}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-main)', fontWeight: '700', opacity: 0.8 }}>({user.designation})</div>
                                    </td>
                                    <td style={{ padding: '24px 20px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-main)', fontWeight: '600' }}><Phone size={12} /> {user.phone || '—'}</span>
                                            <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-main)', fontWeight: '600' }}><Fingerprint size={12} /> {user.aadhar || '—'}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '24px 20px' }}>
                                        <span style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '0.8rem' }}>{user.designation.toUpperCase()}</span>
                                    </td>
                                    <td style={{ padding: '24px 20px' }}>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: '12px',
                                            fontSize: '0.7rem',
                                            fontWeight: '800',
                                            background: 'none',
                                            color: 'var(--text-main)',
                                            border: '1px solid var(--text-main)',
                                            opacity: 0.8
                                        }}>
                                            {['PRINCIPAL', 'HEAD MISTRESS'].includes(user.designation) ? 'ADMIN' : (user.isTeaching ? 'TEACHING' : 'NON-TEACHING')}
                                        </span>
                                    </td>
                                    <td style={{ padding: '24px 20px' }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)' }}>{user.joiningDate ? new Date(user.joiningDate).toLocaleDateString() : '—'}</span>
                                    </td>
                                    <td style={{ padding: '24px 20px' }}>
                                        {user.isTeaching ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-main)' }}>{user.teacherId}</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontWeight: '600', color: 'var(--text-main)', minWidth: '60px', fontSize: '0.75rem' }}>
                                                        {visiblePasswords.has(user.id) ? (user.plainPassword || 'No Password') : '••••••••'}
                                                    </span>
                                                    <button onClick={() => togglePasswordVisibility(user.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0' }}>
                                                        {visiblePasswords.has(user.id) ? <Eye size={14} /> : <EyeOff size={14} />}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No Login Access</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '24px 20px' }}>
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            <button 
                                                onClick={() => {
                                                    setSelectedTeacher(user);
                                                    setEditData({ ...user });
                                                    setIsEditModalOpen(true);
                                                }} 
                                                style={{ 
                                                    background: 'none', 
                                                    border: '1px solid #f4d394', 
                                                    padding: '8px 18px', 
                                                    borderRadius: '12px', 
                                                    color: '#f4d394', 
                                                    fontSize: '0.75rem', 
                                                    fontWeight: '700', 
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    whiteSpace: 'nowrap'
                                                }}
                                                className="hover-scale"
                                                title="View/Edit Profile"
                                            >
                                                View Profile
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteTeacher(user.id)} 
                                                style={{
                                                    background: 'none',
                                                    color: '#ef4444',
                                                    border: '1px solid #ef4444',
                                                    padding: '8px 16px',
                                                    borderRadius: '10px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                className="hover-scale"
                                            >
                                                Delete
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
                isOpen={isEditModalOpen && !!selectedTeacher}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedTeacher(null);
                }}
                title={`Faculty Profile: ${selectedTeacher?.name || ''}`}
                maxWidth="900px"
                footer={
                    <>
                        <button 
                            onClick={() => setIsEditModalOpen(false)} 
                            className="btn-secondary"
                            style={{ padding: '12px 24px' }}
                        >
                            Discard Changes
                        </button>
                        <button 
                            onClick={handleUpdateTeacher} 
                            className="btn-primary"
                            style={{ padding: '12px 40px', display: 'flex', alignItems: 'center', gap: '10px' }}
                        >
                            <Save size={20} /> Save Profile
                        </button>
                    </>
                }
            >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '40px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', gridColumn: '1 / -1' }}>
                        <div style={{ background: 'var(--bg-soft)', padding: '24px', borderRadius: '24px', border: '1px solid var(--border-soft)', maxWidth: '400px', margin: '0 auto', width: '100%' }}>
                            <PhotoUpload 
                                value={editData.photo} 
                                onChange={url => setEditData({ ...editData, photo: url })} 
                                label="Update Photo" 
                                uploadPath="/uploads/teacher-photo"
                            />
                            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                                <div style={{ fontWeight: '800', fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '4px' }}>{selectedTeacher?.name}</div>
                                <div style={{ color: 'var(--primary-bold)', fontWeight: '700', fontSize: '0.85rem', letterSpacing: '0.5px' }}>{selectedTeacher?.teacherId}</div>
                                <div style={{ marginTop: '12px' }}>
                                    <span style={{ 
                                        display: 'inline-block',
                                        marginTop: '6px',
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        fontSize: '0.75rem',
                                        fontWeight: '700',
                                        background: selectedTeacher?.isTeaching ? 'var(--success-soft)' : 'var(--bg-soft)',
                                        color: selectedTeacher?.isTeaching ? 'var(--success-bold)' : 'var(--text-muted)'
                                    }}>
                                        {selectedTeacher?.isTeaching ? 'Active Teaching' : 'Non-Teaching'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                        <h4 style={{ fontSize: '0.9rem', color: 'var(--primary-bold)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <UsersIcon size={16} /> Personal & Professional Details
                        </h4>
                        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><UserCircle size={14} /> Full Name</label>
                                <input type="text" value={editData.name || ''} onChange={e => setEditData({ ...editData, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Email Address</label>
                                <input type="email" value={editData.email || ''} onChange={e => setEditData({ ...editData, email: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} /> Contact Number</label>
                                <input type="text" value={editData.phone || ''} onChange={e => setEditData({ ...editData, phone: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Fingerprint size={14} /> Aadhar Number</label>
                                <input type="text" value={editData.aadhar || ''} onChange={e => setEditData({ ...editData, aadhar: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Designation</label>
                                <select value={editData.designation || ''} onChange={e => setEditData({ ...editData, designation: e.target.value })}>
                                    <option value="PRINCIPAL">PRINCIPAL</option>
                                    <option value="HEAD MISTRESS">HEAD MISTRESS</option>
                                    <option value="A. TEACHER">A. TEACHER</option>
                                    <option value="KARATE TEACHER">KARATE TEACHER</option>
                                    <option value="DANCE TEACHER">DANCE TEACHER</option>
                                    <option value="NON-TEACHING STAFF">NON-TEACHING STAFF</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} /> Date of Birth</label>
                                <input type="date" value={editData.dob ? editData.dob.split('T')[0] : ''} onChange={e => setEditData({ ...editData, dob: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Caste Category</label>
                                <select value={editData.caste || 'GENERAL'} onChange={e => setEditData({ ...editData, caste: e.target.value })}>
                                    <option value="GENERAL">GENERAL</option>
                                    <option value="SC">SC</option>
                                    <option value="ST">ST</option>
                                    <option value="OBC-A">OBC-A</option>
                                    <option value="OBC-B">OBC-B</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} /> Date of Joining</label>
                                <input type="date" value={editData.joiningDate ? editData.joiningDate.split('T')[0] : ''} onChange={e => setEditData({ ...editData, joiningDate: e.target.value })} />
                            </div>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> Residential Address</label>
                                <textarea 
                                    value={editData.address || ''} 
                                    onChange={e => setEditData({ ...editData, address: e.target.value })}
                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', resize: 'vertical', minHeight: '80px' }}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><GraduationCap size={14} /> Academic Qualification</label>
                                <input type="text" value={editData.qualification || ''} onChange={e => setEditData({ ...editData, qualification: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Extra Certifications</label>
                                <input type="text" value={editData.extraQualification || ''} onChange={e => setEditData({ ...editData, extraQualification: e.target.value })} />
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ManageTeachers;
