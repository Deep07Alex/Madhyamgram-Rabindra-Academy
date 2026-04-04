import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserCircle, ArrowLeft, Loader2, Phone, Plus, UserPlus, Trash2, Edit, Eye, EyeOff, Save, Fingerprint, MapPin, GraduationCap, Calendar, Users as UsersIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api, { getBaseUrl } from '../../../services/api';
import { useDebounce } from '../../../hooks/useDebounce';
import { useToast } from '../../../context/ToastContext';
import PhotoUpload from '../../../components/common/PhotoUpload';
import ConfirmModal from '../../../components/common/ConfirmModal';
import Modal from '../../../components/common/Modal';
import useServerEvents from '../../../hooks/useServerEvents';

const DESIGNATIONS = ['PRINCIPAL', 'HEAD MISTRESS', 'A. TEACHER', 'KARATE TEACHER', 'DANCE TEACHER', 'NON-TEACHING STAFF'];
const CASTES = ['GENERAL', 'SC', 'ST', 'OBC-A', 'OBC-B'];

export default function MobileManageTeachers() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    
    const [activeTab, setActiveTab] = useState<'directory' | 'enroll'>('directory');
    
    // Directory State
    const [searchQuery, setSearchQuery] = useState('');
    const [teachers, setTeachers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalTeachers, setTotalTeachers] = useState(0);
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: '' });
    const [selectedTeacher, setSelectedTeacher] = useState<any | null>(null);
    const [editData, setEditData] = useState<any>({});
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    // Live Updates
    useServerEvents({ 
        'profile_updated': (data: any) => {
            fetchTeachers();
            if (isEditModalOpen && selectedTeacher?.id === data.teacherId && data.updatedUser) {
                const u = data.updatedUser;
                setEditData({
                    ...u,
                    password: '', 
                    joiningDate: u.joiningDate ? new Date(u.joiningDate).toISOString().split('T')[0] : '',
                    email: u.email || '',
                    phone: u.phone || '',
                    aadhar: u.aadhar || '',
                    address: u.address || '',
                    qualification: u.qualification || '',
                    extraQualification: u.extraQualification || ''
                });
            }
        }
    });

    // Enroll State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newUser, setNewUser] = useState({
        name: '', email: '', teacherId: '', password: '', phone: '', aadhar: '', 
        designation: 'A. TEACHER', joiningDate: new Date().toLocaleDateString('en-CA'),
        isTeaching: true, photo: '', address: '', qualification: '', extraQualification: '', caste: 'GENERAL'
    });

    const [validationErrors, setValidationErrors] = useState({ teacherId: '', aadhar: '' });
    const debouncedTeacherId = useDebounce(newUser.teacherId, 500);
    const debouncedAadhar = useDebounce(newUser.aadhar, 500);

    // Real-time validation for Teacher ID
    useEffect(() => {
        if (debouncedTeacherId && debouncedTeacherId.length > 2) {
            api.get('/users/teachers/validate', { params: { type: 'teacherId', value: debouncedTeacherId } })
                .then(res => setValidationErrors(prev => ({ ...prev, teacherId: res.data.message })))
                .catch(() => {});
        } else {
            setValidationErrors(prev => ({ ...prev, teacherId: '' }));
        }
    }, [debouncedTeacherId]);

    // Real-time validation for Aadhar
    useEffect(() => {
        if (debouncedAadhar && debouncedAadhar.length >= 12) {
            api.get('/users/teachers/validate', { params: { type: 'aadhar', value: debouncedAadhar } })
                .then(res => setValidationErrors(prev => ({ ...prev, aadhar: res.data.message })))
                .catch(() => {});
        } else {
            setValidationErrors(prev => ({ ...prev, aadhar: '' }));
        }
    }, [debouncedAadhar]);

    const fetchTeachers = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/users/teachers', { params: { search: searchQuery, page: page, limit: 20 } });
            setTeachers(res.data?.teachers || []);
            setTotalPages(Math.ceil((res.data?.total || 0) / 20));
            setTotalTeachers(res.data?.total || 0);
        } catch (error) {
            console.error("Failed to fetch faculty", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'directory') fetchTeachers();
    }, [searchQuery, activeTab, page]);

    useEffect(() => {
        setPage(1);
    }, [searchQuery]);

    const handleUpdateTeacher = async () => {
        if (!selectedTeacher) return;
        setIsUpdating(true);
        try {
            const { password, plainPassword, id, ...updatePayload } = editData;
            
            // Auto-generate password on update as requested
            const cleanName = (updatePayload.name || '').trim().toLowerCase().replace(/\s+/g, '');
            const capitalizedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
            const aadhar = updatePayload.aadhar || '';
            const teacherId = updatePayload.teacherId || '';
            const suffixDigits = (aadhar && aadhar.length >= 4) ? aadhar.slice(-4) : teacherId.replace(/\D/g, '').slice(-4);
            updatePayload.password = `${capitalizedName}@${suffixDigits || '0000'}`;

            await api.patch(`/users/teachers/${selectedTeacher.id}`, updatePayload);
            showToast('Faculty member updated successfully', 'success');
            setIsEditModalOpen(false);
            setSelectedTeacher(null);
            fetchTeachers();
        } catch (error: any) {
            console.error('Failed to update faculty:', error);
            showToast(error.response?.data?.message || 'Failed to update faculty', 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleCreateTeacher = async (e: React.FormEvent) => {
        e.preventDefault();

        if (validationErrors.teacherId || validationErrors.aadhar) {
            showToast(validationErrors.teacherId || validationErrors.aadhar, 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            let finalUser = { ...newUser, role: 'TEACHER' };
            if (['PRINCIPAL', 'HEAD MISTRESS'].includes(newUser.designation) && newUser.teacherId && !newUser.teacherId.toUpperCase().startsWith('A-')) {
                finalUser.teacherId = `A-${newUser.teacherId}`;
            }
            await api.post('/auth/register', finalUser);
            showToast('Faculty member enrolled successfully', 'success');
            setNewUser({
                name: '', email: '', teacherId: '', password: '', phone: '', aadhar: '', designation: 'A. TEACHER', 
                joiningDate: new Date().toLocaleDateString('en-CA'), isTeaching: true, photo: '', address: '', 
                qualification: '', extraQualification: '', caste: 'GENERAL'
            });
            setActiveTab('directory');
            fetchTeachers();
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to create faculty', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteTeacher = async (id: string) => {
        try {
            await api.delete(`/users/teachers/${id}`);
            showToast('Faculty deleted successfully', 'success');
            fetchTeachers();
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to delete', 'error');
        }
    };

    const togglePasswordVisibility = (id: string) => {
        const newVisible = new Set(visiblePasswords);
        if (newVisible.has(id)) newVisible.delete(id);
        else newVisible.add(id);
        setVisiblePasswords(newVisible);
    };

    return (
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '100%', paddingBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div onClick={() => navigate(-1)} style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', cursor: 'pointer' }}>
                    <ArrowLeft size={20} />
                </div>
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)', fontFamily: 'Outfit', margin: 0 }}>Manage Faculty</h1>
                    <p style={{ color: 'var(--text-muted)', fontWeight: '500', fontSize: '11px', margin: 0 }}>
                        {activeTab === 'directory' ? `${totalTeachers} faculty registered.` : 'Enroll new faculty'}
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '4px', borderRadius: '16px', border: '1px solid var(--border-soft)' }}>
                <div onClick={() => setActiveTab('directory')} style={{ flex: 1, padding: '10px 0', textAlign: 'center', borderRadius: '12px', background: activeTab === 'directory' ? 'var(--primary-soft)' : 'transparent', color: activeTab === 'directory' ? 'var(--primary-bold)' : 'var(--text-muted)', fontWeight: activeTab === 'directory' ? '800' : '600', fontSize: '13px', cursor: 'pointer' }}>Directory</div>
                <div onClick={() => setActiveTab('enroll')} style={{ flex: 1, padding: '10px 0', textAlign: 'center', borderRadius: '12px', background: activeTab === 'enroll' ? 'var(--primary-soft)' : 'transparent', color: activeTab === 'enroll' ? 'var(--primary-bold)' : 'var(--text-muted)', fontWeight: activeTab === 'enroll' ? '800' : '600', fontSize: '13px', cursor: 'pointer' }}>Enroll</div>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'directory' ? (
                    <motion.div key="directory" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ position: 'relative', marginBottom: '8px' }}>
                            <input 
                                type="text" 
                                placeholder="Search by name or ID..." 
                                value={searchQuery} 
                                onChange={(e) => setSearchQuery(e.target.value)} 
                                style={{ 
                                    width: '100%', 
                                    padding: '12px 16px 12px 42px', 
                                    borderRadius: '12px', 
                                    border: '1px solid var(--border-soft)', 
                                    backgroundColor: 'var(--bg-card)', 
                                    color: 'var(--text-main)', 
                                    fontSize: '14px', 
                                    outline: 'none', 
                                    fontWeight: '600' 
                                }} 
                            />
                            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#ffffff' }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {isLoading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 className="animate-spin" color="var(--primary-bold)" /></div>
                            ) : teachers.length > 0 ? (
                                teachers.map(teacher => (
                                    <div key={teacher.id} style={{ backgroundColor: 'var(--bg-card)', padding: '16px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-soft)', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                                        <div style={{ width: '50px', height: '50px', borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {teacher.photo ? <img src={`${getBaseUrl()}${teacher.photo.startsWith('/') ? '' : '/'}${teacher.photo}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserCircle size={28} color="var(--primary-bold)" />}
                                        </div>
                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: 'var(--text-main)' }}>{teacher.name.toUpperCase()}</h3>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: '800', padding: '2px 6px', borderRadius: '6px', backgroundColor: 'var(--primary-soft)', color: 'var(--primary-bold)' }}>{teacher.designation}</span>
                                                <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>{teacher.teacherId || 'N/A'}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                                                <Phone size={12} color="var(--text-muted)" />
                                                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>{teacher.phone || 'No phone'}</span>
                                            </div>
                                            {teacher.isTeaching && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                                                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', background: 'var(--bg-soft)', padding: '4px 8px', borderRadius: '6px' }}>
                                                        {visiblePasswords.has(teacher.id) ? (teacher.plainPassword || 'No Pass') : '••••••••'}
                                                    </span>
                                                    <button onClick={() => togglePasswordVisibility(teacher.id)} style={{ background: 'none', border: 'none', color: visiblePasswords.has(teacher.id) ? 'var(--primary-bold)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}>
                                                        {visiblePasswords.has(teacher.id) ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <button onClick={() => {
                                                setSelectedTeacher(teacher);
                                                setEditData({ ...teacher });
                                                setIsEditModalOpen(true);
                                            }} style={{ background: 'var(--warning-soft)', color: 'var(--warning)', border: 'none', padding: '8px', borderRadius: '8px' }}><Edit size={14} /></button>
                                            <button onClick={() => setDeleteModal({ isOpen: true, id: teacher.id })} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '8px' }}><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600' }}>No faculty found.</div>
                            )}
                        </div>

                        {totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '16px 0', marginTop: '8px' }}>
                                <button 
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-card)', color: page === 1 ? 'var(--text-muted)' : 'var(--text-main)', fontSize: '12px', fontWeight: '700', opacity: page === 1 ? 0.5 : 1 }}
                                >
                                    Previous
                                </button>
                                <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>
                                    Page <span style={{ color: 'var(--primary-bold)' }}>{page}</span> of {totalPages}
                                </span>
                                <button 
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-card)', color: page === totalPages ? 'var(--text-muted)' : 'var(--text-main)', fontSize: '12px', fontWeight: '700', opacity: page === totalPages ? 0.5 : 1 }}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div key="enroll" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <form onSubmit={handleCreateTeacher} style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-soft)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <UserPlus size={18} color="var(--primary-bold)" />
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>Faculty Details</h3>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Faculty Photo</label>
                                <PhotoUpload value={newUser.photo} onChange={url => setNewUser({ ...newUser, photo: url })} label="Upload Photo" uploadPath="/uploads/teacher-photo" />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Full Name *</label>
                                <input type="text" placeholder="Enter Full Name" required style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Designation *</label>
                                    <select style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={newUser.designation} onChange={e => {
                                        const val = e.target.value;
                                        const isAdminRole = ['PRINCIPAL', 'HEAD MISTRESS'].includes(val);
                                        const isNonTeaching = val === 'NON-TEACHING STAFF';
                                        let newTeacherId = '';
                                        if (isAdminRole && newUser.phone) newTeacherId = `A-${newUser.phone}`;
                                        else if (!isAdminRole && newUser.aadhar && newUser.aadhar.length >= 8) newTeacherId = `${isNonTeaching ? '' : 'T-'}${newUser.aadhar.slice(-8)}`;
                                        setNewUser({ ...newUser, designation: val, isTeaching: isAdminRole || val === 'A. TEACHER', teacherId: newTeacherId });
                                    }}>
                                        {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Caste</label>
                                    <select style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={newUser.caste} onChange={e => setNewUser({...newUser, caste: e.target.value})}>
                                        {CASTES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Phone Number *</label>
                                <input type="text" placeholder="Phone Number" required style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={newUser.phone} onChange={e => {
                                    const phone = e.target.value;
                                    const isAdminRole = ['PRINCIPAL', 'HEAD MISTRESS'].includes(newUser.designation);
                                    setNewUser({ ...newUser, phone: phone, teacherId: isAdminRole ? `A-${phone}` : newUser.teacherId });
                                }} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Aadhar Number</label>
                                <input type="text" placeholder="12-digit Aadhar" style={{ padding: '12px', borderRadius: '10px', border: `1px solid ${validationErrors.aadhar ? '#ef4444' : 'var(--border-soft)'}`, background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={newUser.aadhar} onChange={e => {
                                    const aadhar = e.target.value;
                                    const isAdminRole = ['PRINCIPAL', 'HEAD MISTRESS'].includes(newUser.designation);
                                    let teacherId = '';
                                    if (aadhar.length >= 8 && newUser.designation !== 'NON-TEACHING STAFF') teacherId = `${isAdminRole ? 'A-' : 'T-'}${aadhar.slice(-8)}`;
                                    setNewUser({ ...newUser, aadhar: aadhar, teacherId: teacherId });
                                }} />
                                {validationErrors.aadhar && <span style={{ color: '#ef4444', fontSize: '10px', fontWeight: '700' }}>{validationErrors.aadhar}</span>}
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Qualification</label>
                                    <input type="text" placeholder="e.g. M.Sc" style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={newUser.qualification} onChange={e => setNewUser({...newUser, qualification: e.target.value})} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Date of Joining</label>
                                    <input type="date" style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={newUser.joiningDate} onChange={e => setNewUser({...newUser, joiningDate: e.target.value})} />
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Full Address</label>
                                <textarea placeholder="Optional" style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none', resize: 'vertical', minHeight: '60px' }} value={newUser.address} onChange={e => setNewUser({...newUser, address: e.target.value})} />
                            </div>

                            {newUser.isTeaching && !['NON-TEACHING STAFF', 'KARATE TEACHER', 'DANCE TEACHER'].includes(newUser.designation) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Teacher/Admin ID</label>
                                    <input type="text" placeholder="e.g. T-101" required style={{ padding: '12px', borderRadius: '10px', border: `1px solid ${validationErrors.teacherId ? '#ef4444' : 'var(--border-soft)'}`, background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={newUser.teacherId} onChange={e => setNewUser({...newUser, teacherId: e.target.value})} />
                                    {validationErrors.teacherId && <span style={{ color: '#ef4444', fontSize: '10px', fontWeight: '700' }}>{validationErrors.teacherId}</span>}
                                </div>
                            )}

                            <button type="submit" disabled={isSubmitting} style={{ marginTop: '12px', padding: '14px', borderRadius: '12px', border: 'none', background: 'var(--primary-bold)', color: '#fff', fontWeight: '800', fontSize: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <><Plus size={18} /> Enroll Faculty</>}
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <Modal
                isOpen={isEditModalOpen && !!selectedTeacher}
                onClose={() => { setIsEditModalOpen(false); setSelectedTeacher(null); }}
                title="Edit Faculty Profile"
                footer={<button onClick={handleUpdateTeacher} disabled={isUpdating} style={{ width: '100%', background: 'var(--primary-bold)', color: 'white', padding: '16px', borderRadius: '12px', border: 'none', fontWeight: '800', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', fontSize: '15px' }}>{isUpdating ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Update Profile</button>}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px' }}>
                    <div style={{ background: 'var(--bg-soft)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-soft)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <PhotoUpload value={editData.photo || ''} onChange={(url: string) => setEditData({ ...editData, photo: url })} label="Change Photo" uploadPath="/uploads/teacher-photo" />
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>{editData.name}</div>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary-bold)', marginTop: '2px' }}>{editData.teacherId}</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-bold)' }}>
                            <UsersIcon size={16} />
                            <span style={{ fontSize: '13px', fontWeight: '800' }}>Personal & Professional</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Full Name *</label>
                            <input type="text" style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={editData.name || ''} onChange={e => setEditData({ ...editData, name: e.target.value })} required />
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Email Address</label>
                                <input type="email" style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={editData.email || ''} onChange={e => setEditData({ ...editData, email: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Contact No *</label>
                                <input type="tel" style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={editData.phone || ''} onChange={e => setEditData({ ...editData, phone: e.target.value })} required />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><Fingerprint size={12} /> Aadhar No</label>
                                <input type="text" style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={editData.aadhar || ''} onChange={e => setEditData({ ...editData, aadhar: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Designation *</label>
                                <select style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={editData.designation || ''} onChange={e => setEditData({ ...editData, designation: e.target.value })}>
                                    {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Caste Category</label>
                                <select style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={editData.caste || 'GENERAL'} onChange={e => setEditData({ ...editData, caste: e.target.value })}>
                                    {CASTES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={12} /> Joining Date</label>
                                <input type="date" style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={editData.joiningDate ? new Date(editData.joiningDate).toISOString().split('T')[0] : ''} onChange={e => setEditData({ ...editData, joiningDate: e.target.value })} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} /> Residential Address</label>
                            <textarea style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none', minHeight: '80px', resize: 'none' }} value={editData.address || ''} onChange={e => setEditData({ ...editData, address: e.target.value })} />
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><GraduationCap size={12} /> Academic Qual.</label>
                                <input type="text" style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={editData.qualification || ''} onChange={e => setEditData({ ...editData, qualification: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Extra Certs</label>
                                <input type="text" style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={editData.extraQualification || ''} onChange={e => setEditData({ ...editData, extraQualification: e.target.value })} />
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            <ConfirmModal 
                isOpen={deleteModal.isOpen} 
                onClose={() => setDeleteModal({ isOpen: false, id: '' })}
                onConfirm={() => handleDeleteTeacher(deleteModal.id)}
                title="Delete Faculty?"
                message="Are you sure you want to delete this faculty member? This action cannot be undone."
                confirmText="Yes, Delete"
                variant="danger"
            />
        </motion.div>
    );
}
