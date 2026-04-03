import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, ArrowLeft, Loader2, BookOpen, Plus, UserPlus, Upload, FileSpreadsheet, Trash2, Edit, Eye, EyeOff, Save, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api, { getBaseUrl } from '../../../services/api';
import { useDebounce } from '../../../hooks/useDebounce';
import { useToast } from '../../../context/ToastContext';
import PhotoUpload from '../../../components/common/PhotoUpload';
import ConfirmModal from '../../../components/common/ConfirmModal';
import Modal from '../../../components/common/Modal';

export default function MobileManageStudents() {
    const navigate = useNavigate();
    const { showToast } = useToast();

    // Tabs: 'directory' | 'enroll' | 'system'
    const [activeTab, setActiveTab] = useState<'directory' | 'enroll' | 'system'>('directory');

    // Directory State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const debouncedSearch = useDebounce(searchQuery, 400);
    const [students, setStudents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalStudents, setTotalStudents] = useState(0);
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: '' });
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [editData, setEditData] = useState<any>({
        name: '', studentId: '', rollNumber: '', classId: '', banglarSikkhaId: '',
        guardianName: '', dob: '', phone: '', address: '', photo: ''
    });

    // Enroll State
    const [classes, setClasses] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newUser, setNewUser] = useState({
        name: '', email: '', password: '', studentId: '', rollNumber: '',
        classId: '', banglarSikkhaId: '', guardianName: '', dob: '', phone: '', address: '', photo: ''
    });

    const [registrationErrors, setRegistrationErrors] = useState({
        studentId: '',
        rollNumber: '',
        banglarSikkhaId: ''
    });

    const debouncedNewStudentId = useDebounce(newUser.studentId, 600);
    const debouncedNewRoll = useDebounce(newUser.rollNumber, 600);
    const debouncedNewBanglarSikkha = useDebounce(newUser.banglarSikkhaId, 600);

    // Live Validation for Student ID
    useEffect(() => {
        if (!debouncedNewStudentId) {
            setRegistrationErrors(prev => ({ ...prev, studentId: '' }));
            return;
        }
        api.get('/users/students/validate', { params: { type: 'studentId', value: debouncedNewStudentId } })
            .then(res => setRegistrationErrors(prev => ({ ...prev, studentId: res.data.exists ? res.data.message : '' })))
            .catch(() => { });
    }, [debouncedNewStudentId]);

    // Live Validation for Roll Number
    useEffect(() => {
        if (!debouncedNewRoll || !newUser.classId) {
            setRegistrationErrors(prev => ({ ...prev, rollNumber: '' }));
            return;
        }
        api.get('/users/students/validate', { params: { type: 'rollNumber', value: debouncedNewRoll, classId: newUser.classId } })
            .then(res => setRegistrationErrors(prev => ({ ...prev, rollNumber: res.data.exists ? res.data.message : '' })))
            .catch(() => { });
    }, [debouncedNewRoll, newUser.classId]);

    // Live Validation for Banglar Sikkha ID
    useEffect(() => {
        if (!debouncedNewBanglarSikkha) {
            setRegistrationErrors(prev => ({ ...prev, banglarSikkhaId: '' }));
            return;
        }
        api.get('/users/students/validate', { params: { type: 'banglarSikkhaId', value: debouncedNewBanglarSikkha } })
            .then(res => setRegistrationErrors(prev => ({ ...prev, banglarSikkhaId: res.data.exists ? res.data.message : '' })))
            .catch(() => { });
    }, [debouncedNewBanglarSikkha]);

    // System State
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isImporting, setIsImporting] = useState(false);

    const handleUpdateStudent = async () => {
        if (!selectedStudent) return;
        setIsUpdating(true);
        try {
            const { password, plainPassword, id, ...updatePayload } = editData;
            // Generate password based on Name@Last4ID
            const cleanName = (updatePayload.name || '').trim().toLowerCase().replace(/\s+/g, '');
            const capitalizedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
            const numericId = (updatePayload.studentId || '').replace(/\D/g, '');
            updatePayload.password = `${capitalizedName}@${numericId.slice(-4) || '0000'}`;

            await api.patch(`/users/students/${selectedStudent.id}`, updatePayload);
            setIsEditModalOpen(false);
            setSelectedStudent(null);
            fetchStudents();
            showToast('Student updated successfully', 'success');
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to update student', 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const fetchStudents = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/users/students', {
                params: { search: debouncedSearch, classId: selectedClassId, page: page, limit: 20 }
            });
            setStudents(res.data?.students || []);
            setTotalPages(Math.ceil((res.data?.total || 0) / 20));
            setTotalStudents(res.data?.total || 0);
        } catch (error) {
            console.error("Failed to fetch students", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'directory') fetchStudents();
    }, [debouncedSearch, selectedClassId, page, activeTab]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, selectedClassId]);

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const res = await api.get('/users/classes');
                setClasses(res.data || []);
                if (res.data?.length > 0 && !newUser.classId) {
                    setNewUser(prev => ({ ...prev, classId: res.data[0].id }));
                }
            } catch (error) {
                console.error("Failed to fetch classes", error);
            }
        };
        fetchClasses();
    }, []);

    const handleCreateStudent = async (e: React.FormEvent) => {
        e.preventDefault();

        if (registrationErrors.studentId || registrationErrors.rollNumber || registrationErrors.banglarSikkhaId) {
            const errorMsg = registrationErrors.studentId || registrationErrors.rollNumber || registrationErrors.banglarSikkhaId;
            showToast(errorMsg, 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post('/users/students/enroll', { ...newUser, role: 'STUDENT' });
            showToast('Student enrolled successfully', 'success');
            setNewUser({
                name: '', email: '', password: '', studentId: '', rollNumber: '',
                classId: classes[0]?.id || '', banglarSikkhaId: '', guardianName: '', dob: '', phone: '', address: '', photo: ''
            });
            setActiveTab('directory');
            fetchStudents();
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to create student', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteStudent = async (id: string) => {
        try {
            await api.delete(`/users/students/${id}`);
            showToast('Student deleted successfully', 'success');
            fetchStudents();
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to delete student', 'error');
        }
    };

    const togglePasswordVisibility = (id: string) => {
        const newVisible = new Set(visiblePasswords);
        if (newVisible.has(id)) newVisible.delete(id);
        else newVisible.add(id);
        setVisiblePasswords(newVisible);
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
            fetchStudents();
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Bulk import failed', 'error');
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '100%', paddingBottom: '40px' }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div onClick={() => navigate(-1)} style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', cursor: 'pointer' }}>
                    <ArrowLeft size={20} />
                </div>
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)', fontFamily: 'Outfit', margin: 0 }}>Manage Students</h1>
                    <p style={{ color: 'var(--text-muted)', fontWeight: '500', fontSize: '11px', margin: 0 }}>
                        {activeTab === 'directory' ? `${totalStudents} students registered.` : activeTab === 'enroll' ? 'Enroll new members' : 'Advanced Operations'}
                    </p>
                </div>
            </div>

            {/* Segmented Control Tabs */}
            <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '4px', borderRadius: '16px', border: '1px solid var(--border-soft)' }}>
                <div onClick={() => setActiveTab('directory')} style={{ flex: 1, padding: '10px 0', textAlign: 'center', borderRadius: '12px', background: activeTab === 'directory' ? 'var(--primary-soft)' : 'transparent', color: activeTab === 'directory' ? 'var(--primary-bold)' : 'var(--text-muted)', fontWeight: activeTab === 'directory' ? '800' : '600', fontSize: '13px', cursor: 'pointer' }}>
                    Directory
                </div>
                <div onClick={() => setActiveTab('enroll')} style={{ flex: 1, padding: '10px 0', textAlign: 'center', borderRadius: '12px', background: activeTab === 'enroll' ? 'var(--primary-soft)' : 'transparent', color: activeTab === 'enroll' ? 'var(--primary-bold)' : 'var(--text-muted)', fontWeight: activeTab === 'enroll' ? '800' : '600', fontSize: '13px', cursor: 'pointer' }}>
                    Enroll
                </div>
                <div onClick={() => setActiveTab('system')} style={{ flex: 1, padding: '10px 0', textAlign: 'center', borderRadius: '12px', background: activeTab === 'system' ? 'var(--primary-soft)' : 'transparent', color: activeTab === 'system' ? 'var(--primary-bold)' : 'var(--text-muted)', fontWeight: activeTab === 'system' ? '800' : '600', fontSize: '13px', cursor: 'pointer' }}>
                    System
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'directory' ? (
                    <motion.div key="directory" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '8px' }}>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    placeholder="Search by name or admission no..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px 14px 44px',
                                        borderRadius: '14px',
                                        border: '1px solid var(--border-soft)',
                                        backgroundColor: 'var(--bg-card)',
                                        color: 'var(--text-main)',
                                        fontSize: '14px',
                                        outline: 'none',
                                        fontWeight: '500'
                                    }}
                                />
                                <Search size={20} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#ffffff' }} />
                            </div>
                            <div style={{ position: 'relative' }}>
                                <select
                                    style={{
                                        width: '100%',
                                        padding: '14px 44px 14px 16px',
                                        borderRadius: '14px',
                                        border: '1px solid var(--border-soft)',
                                        background: 'var(--bg-card)',
                                        color: 'var(--text-main)',
                                        outline: 'none',
                                        appearance: 'none',
                                        fontWeight: '700',
                                        fontSize: '14px'
                                    }}
                                    value={selectedClassId}
                                    onChange={e => setSelectedClassId(e.target.value)}
                                >
                                    <option value="" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Filter by Academic Class</option>
                                    {classes.map(c => <option key={c.id} value={c.id} style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>{c.name}</option>)}
                                </select>
                                <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--primary-bold)', display: 'flex', alignItems: 'center' }}>
                                    <ChevronDown size={22} />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {isLoading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 className="animate-spin" color="var(--primary-bold)" /></div>
                            ) : students.length > 0 ? (
                                students.map(student => (
                                    <div key={student.id} style={{ backgroundColor: 'var(--bg-card)', padding: '16px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-soft)', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                                        <div style={{ width: '50px', height: '50px', borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {student.photo ? <img src={`${getBaseUrl()}${student.photo.startsWith('/') ? '' : '/'}${student.photo}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={24} color="var(--primary-bold)" />}
                                        </div>
                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: 'var(--text-main)' }}>{student.name.toUpperCase()}</h3>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary-bold)' }}>{student.studentId}</span>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>•</span>
                                                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Roll {student.rollNumber}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                                                <BookOpen size={12} color="var(--text-muted)" />
                                                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>{student.className}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', background: 'var(--bg-soft)', padding: '4px 8px', borderRadius: '6px' }}>
                                                    {visiblePasswords.has(student.id) ? (student.plainPassword || 'No Pass') : '••••••••'}
                                                </span>
                                                <button onClick={() => togglePasswordVisibility(student.id)} style={{ background: 'none', border: 'none', color: visiblePasswords.has(student.id) ? 'var(--primary-bold)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}>
                                                    {visiblePasswords.has(student.id) ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <button onClick={() => {
                                                setSelectedStudent(student);
                                                setEditData({ ...student });
                                                setIsEditModalOpen(true);
                                            }} style={{ background: 'var(--warning-soft)', color: 'var(--warning)', border: 'none', padding: '8px', borderRadius: '8px' }}><Edit size={14} /></button>
                                            <button onClick={() => setDeleteModal({ isOpen: true, id: student.id })} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '8px' }}><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600' }}>No students found.</div>
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
                ) : activeTab === 'enroll' ? (
                    <motion.div key="enroll" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <form onSubmit={handleCreateStudent} style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-soft)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <UserPlus size={18} color="var(--primary-bold)" />
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>Enroll New Student</h3>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Full Name *</label>
                                <input type="text" placeholder="Enter Full Name" required style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Admission No. *</label>
                                    <input type="text" placeholder="e.g. S-1042" required style={{ padding: '12px', borderRadius: '10px', border: `1px solid ${registrationErrors.studentId ? '#ef4444' : 'var(--border-soft)'}`, background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={newUser.studentId} onChange={e => setNewUser({ ...newUser, studentId: e.target.value })} />
                                    {registrationErrors.studentId && <span style={{ color: '#ef4444', fontSize: '10px', fontWeight: '700' }}>{registrationErrors.studentId}</span>}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Roll No. *</label>
                                    <input type="text" placeholder="Roll" required style={{ padding: '12px', borderRadius: '10px', border: `1px solid ${registrationErrors.rollNumber ? '#ef4444' : 'var(--border-soft)'}`, background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={newUser.rollNumber} onChange={e => setNewUser({ ...newUser, rollNumber: e.target.value })} />
                                    {registrationErrors.rollNumber && <span style={{ color: '#ef4444', fontSize: '10px', fontWeight: '700' }}>{registrationErrors.rollNumber}</span>}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Password (Optional)</label>
                                <input type="text" placeholder="Leave empty for auto-generation" style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Email (Optional)</label>
                                <input type="email" placeholder="Email Address" style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Assign Class *</label>
                                <select style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none', appearance: 'none' }} value={newUser.classId} onChange={e => setNewUser({ ...newUser, classId: e.target.value })} required>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            {(() => {
                                const selectedClass = classes.find((c: any) => c.id === newUser.classId);
                                const showBanglarSikkha = selectedClass && selectedClass.grade >= 2;
                                if (!showBanglarSikkha) return null;
                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Banglar Sikkha Portal ID</label>
                                        <input type="text" placeholder="Enter Portal ID" style={{ padding: '12px', borderRadius: '10px', border: `1px solid ${registrationErrors.banglarSikkhaId ? '#ef4444' : 'var(--border-soft)'}`, background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={newUser.banglarSikkhaId} onChange={e => setNewUser({ ...newUser, banglarSikkhaId: e.target.value })} />
                                        {registrationErrors.banglarSikkhaId && <span style={{ color: '#ef4444', fontSize: '10px', fontWeight: '700' }}>{registrationErrors.banglarSikkhaId}</span>}
                                    </div>
                                );
                            })()}

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Guardian Name</label>
                                    <input type="text" placeholder="Optional" style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={newUser.guardianName} onChange={e => setNewUser({ ...newUser, guardianName: e.target.value })} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Date of Birth</label>
                                    <input type="date" style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={newUser.dob} onChange={e => setNewUser({ ...newUser, dob: e.target.value })} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Phone Number</label>
                                <input type="tel" placeholder="Optional" style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={newUser.phone} onChange={e => setNewUser({ ...newUser, phone: e.target.value })} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Full Address</label>
                                <textarea placeholder="Optional" style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none', resize: 'vertical', minHeight: '60px' }} value={newUser.address} onChange={e => setNewUser({ ...newUser, address: e.target.value })} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>Student Photo</label>
                                <PhotoUpload value={newUser.photo} onChange={url => setNewUser({ ...newUser, photo: url })} label="Upload Photo" uploadPath="/uploads/student-photo" />
                            </div>

                            <button type="submit" disabled={isSubmitting} style={{ marginTop: '12px', padding: '14px', borderRadius: '12px', border: 'none', background: 'var(--primary-bold)', color: '#fff', fontWeight: '800', fontSize: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <><Plus size={18} /> Enroll Student</>}
                            </button>
                        </form>
                    </motion.div>
                ) : (
                    <motion.div key="system" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-soft)' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                                <div style={{ background: 'var(--primary-soft)', padding: '8px', borderRadius: '10px', color: 'var(--primary-bold)' }}><Upload size={20} /></div>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>Bulk Enrollment</h3>
                            </div>
                            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'var(--text-muted)' }}>Uploading the excel must follow the strict format given in templates.</p>

                            <div onClick={() => fileInputRef.current?.click()} style={{ border: '2px dashed var(--border-soft)', padding: '24px', textAlign: 'center', borderRadius: '12px', cursor: 'pointer', background: isImporting ? 'var(--bg-main)' : 'rgba(var(--primary-rgb), 0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                {isImporting ? (
                                    <><Loader2 className="animate-spin" color="var(--primary-bold)" size={24} /> <p style={{ margin: 0, fontWeight: 700, fontSize: '12px' }}>Processing Database...</p></>
                                ) : (
                                    <><FileSpreadsheet size={24} color="var(--primary-bold)" /> <p style={{ margin: 0, fontSize: '12px', fontWeight: '700' }}>Click to Upload Excel</p></>
                                )}
                                <input type="file" ref={fileInputRef} onChange={handleBulkImport} accept=".xlsx, .xls" style={{ display: 'none' }} />
                            </div>
                        </div>

                        <div style={{ padding: '24px', background: '#fee2e2', borderRadius: '16px', border: '1px solid #fca5a5' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                                <div style={{ background: '#fff', padding: '8px', borderRadius: '10px', color: '#ef4444' }}><Trash2 size={20} /></div>
                                <h4 style={{ margin: 0, color: '#b91c1c', fontSize: '16px', fontWeight: '800' }}>Danger Zone</h4>
                            </div>
                            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#991b1b', lineHeight: 1.5 }}>Wiping the database will remove all students permanently. It will also clear their attendance records and examination results permanently.</p>
                            <button
                                onClick={async () => {
                                    if (window.confirm('Are you absolutely sure you want to wipe all students? This cannot be undone.')) {
                                        try { await api.delete('/users/students/all'); showToast('Student database wiped', 'success'); fetchStudents(); }
                                        catch (error: any) { showToast(error.response?.data?.message || 'Failed to wipe', 'error'); }
                                    }
                                }}
                                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', color: '#fff', fontWeight: '800', fontSize: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                            >
                                <Trash2 size={18} /> Wipe Database
                            </button>
                        </div>

                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Student Profile">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Full Name</label>
                        <input type="text" style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} />
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                            <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>Admission No.</label>
                            <input type="text" style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={editData.studentId} onChange={e => setEditData({ ...editData, studentId: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                            <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>Roll No.</label>
                            <input type="text" style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={editData.rollNumber} onChange={e => setEditData({ ...editData, rollNumber: e.target.value })} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>Guardian Name</label>
                        <input type="text" style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={editData.guardianName} onChange={e => setEditData({ ...editData, guardianName: e.target.value })} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>Phone Number</label>
                        <input type="text" style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>Class</label>
                        <select style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={editData.classId} onChange={e => setEditData({ ...editData, classId: e.target.value })}>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    {(() => {
                        const selectedClass = classes.find(c => c.id === editData.classId);
                        if (!selectedClass || selectedClass.grade < 2) return null;
                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>Banglar Sikkha Portal ID</label>
                                <input type="text" style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={editData.banglarSikkhaId} onChange={e => setEditData({ ...editData, banglarSikkhaId: e.target.value })} />
                            </div>
                        );
                    })()}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>Date of Birth</label>
                        <input type="date" style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }} value={editData.dob} onChange={e => setEditData({ ...editData, dob: e.target.value })} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>Full Address</label>
                        <textarea style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none', minHeight: '80px' }} value={editData.address} onChange={e => setEditData({ ...editData, address: e.target.value })} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>Student Photo</label>
                        <PhotoUpload
                            value={editData.photo}
                            onChange={(url: string) => setEditData({ ...editData, photo: url })}
                            label="Change Photo"
                            uploadPath="/uploads/student-photo"
                        />
                    </div>

                    <button
                        onPointerDown={(e) => {
                            e.preventDefault(); // Prevents blur theft
                            handleUpdateStudent();
                        }}
                        disabled={isUpdating}
                        style={{ marginTop: '10px', padding: '14px', borderRadius: '12px', border: 'none', background: 'var(--primary-bold)', color: '#fff', fontWeight: '800', fontSize: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', opacity: isUpdating ? 0.7 : 1 }}
                    >
                        {isUpdating ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        {isUpdating ? 'Updating...' : 'Update Student Record'}
                    </button>
                </div>
            </Modal>

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, id: '' })}
                onConfirm={() => handleDeleteStudent(deleteModal.id)}
                title="Delete Student?"
                message="Are you sure you want to delete this student record? This action cannot be undone."
                confirmText="Yes, Delete"
                variant="danger"
            />
        </motion.div>
    );
}
