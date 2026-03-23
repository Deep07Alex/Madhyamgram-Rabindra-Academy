/**
 * Student Management Component (Admin)
 * 
 * Provides tools to enroll, edit, delete, and bulk-import students.
 * Key Features:
 * - Excel (.xlsx) bulk import for rapid enrollment.
 * - Automatic password generation (Name@Last4DigitsOfID).
 * - Class-based filtering and search.
 * - Grade-specific fields (Banglar Sikkha ID for Grade 2+).
 */
import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { UserPlus, List, Eye, EyeOff, Edit, Trash2, Users, Search, Save, School, Download, Upload, FileSpreadsheet, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import PhotoUpload from '../common/PhotoUpload';
import Modal from '../common/Modal';
import { useFetch } from '../../hooks/useFetch';
import { useDebounce } from '../../hooks/useDebounce';
import useServerEvents from '../../hooks/useServerEvents';
import CustomSelect from '../common/CustomSelect';
import ConfirmModal from '../common/ConfirmModal';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const ManageStudents = () => {
    const { showToast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [page, setPage] = useState(1);
    const debouncedSearch = useDebounce(searchQuery, 500);

    const { data: studentsData, refetch: refreshStudents } = useFetch<any>('/users/students', {
        params: { 
            classId: selectedClassId, 
            search: debouncedSearch,
            page: page,
            limit: 20
        }
    });

    const { data: classesData } = useFetch<any[]>('/users/classes');
    
    // Handle new response format
    const students = studentsData?.students || [];
    const totalStudents = studentsData?.total || 0;
    const totalPages = Math.ceil(totalStudents / 20);
    const classes = classesData || [];

    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const [newUser, setNewUser] = useState({
        password: '', name: '', email: '',
        rollNumber: '',
        studentId: '',
        banglarSikkhaId: '',
        classId: '',
        photo: '',
        guardianName: '',
        dob: '',
        address: '',
        phone: ''
    });

    const [editData, setEditData] = useState<any>({
        name: '',
        studentId: '',
        rollNumber: '',
        banglarSikkhaId: '',
        email: '',
        password: '',
        photo: '',
        guardianName: '',
        dob: '',
        address: '',
        phone: ''
    });

    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: '', type: 'single' as 'single' | 'all' });
    const [isFinalWarning, setIsFinalWarning] = useState(false);

    useEffect(() => {
        if (classes.length > 0 && !newUser.classId) {
            setNewUser(prev => ({ ...prev, classId: classes[0].id }));
        }
    }, [classes]);

    useServerEvents({ 'profile_updated': refreshStudents });

    const handleCreateStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...newUser,
                role: 'STUDENT'
            };

            await api.post('/auth/register', payload);
            showToast('Student enrolled successfully', 'success');
            setNewUser({ 
                password: '', name: '', email: '', rollNumber: '', studentId: '', 
                banglarSikkhaId: '', classId: classes[0]?.id || '', photo: '',
                guardianName: '', dob: '', address: '', phone: '' 
            });
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

    const downloadTemplate = () => {
        const headers = [
            'CLASS',
            'Roll',
            'NAME',
            'STUDENT ID IN BANGLAR SHIKSHA PORTAL',
            'Admission Registration No.'
        ];
        // Sample data
        const data = [
            ['KG-I A', '2', 'SAMPLE STUDENT', '10000000000002', '901']
        ];

        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

        XLSX.writeFile(workbook, `Student_Import_Template.xlsx`);
        showToast('Template downloaded. Please fill and upload.', 'info');
    };

    const handleDeleteAll = async () => {
        try {
            await api.delete('/users/students/all');
            showToast('All student records wiped successfully', 'success');
            setDeleteModal({ ...deleteModal, isOpen: false });
            setIsFinalWarning(false);
            refreshStudents();
        } catch (error: any) {
            console.error('Failed to wipe database:', error);
            showToast(error.response?.data?.message || 'Failed to wipe database', 'error');
        }
    };

    const handleDeleteStudent = async () => {
        if (!deleteModal.id) return;
        try {
            await api.delete(`/users/students/${deleteModal.id}`);
            showToast('Student deleted successfully', 'success');
            setDeleteModal({ ...deleteModal, isOpen: false });
            refreshStudents();
        } catch (error: any) {
            console.error('Failed to delete student:', error);
            showToast(error.response?.data?.message || 'Failed to delete student', 'error');
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
            // Restore Name@1234 password generation
            const { password, plainPassword, id, ...updatePayload } = editData;
            /**
             * Password Policy:
             * Generates a password in the format: [Name]@ [Last 4 Digits of Student ID]
             * Example: Rahul@1042
             */
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

    // Reset to page 1 when search or class changes
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, selectedClassId]);

    return (
        <div className="manage-section">

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginBottom: '32px', alignItems: 'stretch' }}>
                {/* Bulk Import Column */}
                <div className="card" style={{ margin: 0, padding: '24px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}>
                                <Upload size={18} />
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Bulk Enrollment</h3>
                        </div>
                        <button onClick={downloadTemplate} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '0.75rem', fontWeight: 700 }}>
                            <Download size={14} /> Get Template
                        </button>
                    </div>

                    <div style={{ marginBottom: '20px', padding: '12px 16px', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '12px', borderLeft: '4px solid var(--primary-bold)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ color: 'var(--primary-bold)' }}>
                            <FileSpreadsheet size={18} />
                        </div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>
                            Uploading the excel must follow the rules given in templates.
                        </p>
                    </div>

                    <div
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            border: '2px dashed var(--border-soft)',
                            padding: '32px 24px',
                            textAlign: 'center',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            background: isImporting ? 'var(--bg-main)' : 'rgba(var(--primary-rgb), 0.02)',
                            transition: 'all 0.3s ease',
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}
                    >
                        {isImporting ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                <Loader2 className="animate-spin" color="var(--primary-bold)" size={32} />
                                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>Processing Database...</p>
                            </div>
                        ) : (
                            <>
                                <FileSpreadsheet size={32} style={{ marginBottom: '16px', color: 'var(--primary-bold)' }} />
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 800 }}>Click to Upload Student Excel</h4>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Only the strict template format is supported.</p>
                            </>
                        )}
                        <input type="file" ref={fileInputRef} onChange={handleBulkImport} accept=".xlsx, .xls" style={{ display: 'none' }} />
                    </div>
                </div>

                {/* Database Actions Column */}
                <div className="card" style={{ margin: 0, padding: '24px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                            <Trash2 size={18} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Danger Zone</h3>
                    </div>

                    <p style={{ margin: '0 0 24px 0', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                        Use these tools for emergency cleanup or academic year resets. These actions are destructive and permanent.
                    </p>

                    <button
                        className="btn-danger"
                        onClick={() => setDeleteModal({ isOpen: true, id: '', type: 'all' })}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                            color: 'white',
                            padding: '16px 24px',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: 800,
                            fontSize: '0.95rem',
                            width: '100%',
                            boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.2)'
                        }}
                    >
                        <Trash2 size={20} />
                        Wipe Student Database
                    </button>

                    <div style={{ marginTop: '32px', padding: '16px', background: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border-soft)', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></div>
                        <span><strong>Note:</strong> Wiping students will also clear their attendance records and examination results permanently.</span>
                    </div>
                </div>
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
                    <CustomSelect
                        label="Select Class"
                        value={newUser.classId}
                        onChange={val => setNewUser({ ...newUser, classId: val })}
                        options={classes.map((c: any) => ({ value: c.id, label: c.name }))}
                        icon={<School size={16} />}
                        placeholder={classes.length === 0 ? "Loading Classes..." : "Choose Class..."}
                    />
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
                    <div className="form-group">
                        <label>Guardian Name</label>
                        <input
                            type="text"
                            placeholder="Enter Guardian Name"
                            value={newUser.guardianName}
                            onChange={e => setNewUser({ ...newUser, guardianName: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Date of Birth</label>
                        <input
                            type="date"
                            value={newUser.dob}
                            onChange={e => setNewUser({ ...newUser, dob: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Phone Number (Optional)</label>
                        <input
                            type="tel"
                            placeholder="Enter Phone Number"
                            value={newUser.phone}
                            onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                        />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label>Full Address</label>
                        <textarea
                            placeholder="Enter Complete Address"
                            value={newUser.address}
                            onChange={e => setNewUser({ ...newUser, address: e.target.value })}
                            required
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-main)',
                                color: 'var(--text-main)',
                                minHeight: '80px',
                                outline: 'none'
                            }}
                        />
                    </div>
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
                        <CustomSelect
                            value={selectedClassId}
                            onChange={(val) => setSelectedClassId(val)}
                            options={[
                                { value: '', label: 'All Classes' },
                                ...classes.map((c: any) => ({ value: c.id, label: c.name }))
                            ]}
                            icon={<School size={16} />}
                            placeholder="All Classes"
                        />
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
                        <tbody key={page} className="animate-fade-in">
                            {students.length > 0 ? students.map((user: any) => (
                                <tr key={user.id}>
                                    <td style={{ padding: '24px 20px', verticalAlign: 'middle' }}>
                                        <div style={{ width: '45px', height: '45px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-soft)', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {user.photo ? (
                                                <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${user.photo}?t=${Date.now()}`} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                                                        photo: user.photo || '',
                                                        guardianName: user.guardianName || '',
                                                        dob: user.dob ? new Date(user.dob).toISOString().split('T')[0] : '',
                                                        address: user.address || '',
                                                        phone: user.phone || ''
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
                                                onClick={() => setDeleteModal({ isOpen: true, id: user.id, type: 'single' })}
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
                            )) : (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                        No students found matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                {totalPages > 1 && (
                    <div style={{
                        padding: '24px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '20px',
                        borderTop: '1px solid var(--border-soft)',
                        background: 'var(--bg-main)'
                    }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo(0, 0); }}
                                disabled={page === 1}
                                style={{
                                    padding: '10px 20px', borderRadius: '30px',
                                    border: '1px solid var(--border-soft)',
                                    background: 'var(--bg-card)',
                                    cursor: page === 1 ? 'not-allowed' : 'pointer',
                                    opacity: page === 1 ? 0.3 : 1,
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)',
                                    transition: 'all 0.2s',
                                    boxShadow: 'var(--shadow-sm)'
                                }}
                            >
                                <ChevronLeft size={18} /> Previous
                            </button>
                        </div>

                        <span style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: '800' }}>
                            Page <span style={{ color: 'var(--primary-bold)' }}>{page}</span> of {totalPages}
                        </span>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo(0, 0); }}
                                disabled={page === totalPages}
                                style={{
                                    padding: '10px 20px', borderRadius: '30px',
                                    border: '1px solid var(--border-soft)',
                                    background: 'var(--bg-card)',
                                    cursor: page === totalPages ? 'not-allowed' : 'pointer',
                                    opacity: page === totalPages ? 0.3 : 1,
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)',
                                    transition: 'all 0.2s',
                                    boxShadow: 'var(--shadow-sm)'
                                }}
                            >
                                Next <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
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
                        <div className="form-group">
                            <label>Guardian Name</label>
                            <input type="text" value={editData.guardianName} onChange={e => setEditData({ ...editData, guardianName: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Date of Birth</label>
                            <input type="date" value={editData.dob} onChange={e => setEditData({ ...editData, dob: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Phone Number (Optional)</label>
                            <input type="tel" value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} />
                        </div>
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label>Full Address</label>
                            <textarea
                                value={editData.address}
                                onChange={e => setEditData({ ...editData, address: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-main)',
                                    minHeight: '80px',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>
                </div>
            </Modal>

            <ConfirmModal
                isOpen={deleteModal.isOpen && deleteModal.type === 'single'}
                onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                onConfirm={handleDeleteStudent}
                title="Delete Student Record"
                message="Are you sure you want to permanently remove this student from the database? This will also delete their results and attendance history."
            />

            <ConfirmModal
                isOpen={deleteModal.isOpen && deleteModal.type === 'all'}
                onClose={() => {
                    setDeleteModal({ ...deleteModal, isOpen: false });
                    setIsFinalWarning(false);
                }}
                onConfirm={!isFinalWarning ? () => setIsFinalWarning(true) : handleDeleteAll}
                title={!isFinalWarning ? "Wipe Student Database" : "FINAL WARNING"}
                message={!isFinalWarning
                    ? "CAUTION: This will entirely delete ALL students from the database. This action is irreversible. Are you absolutely sure?"
                    : "THIS IS YOUR LAST CHANCE. Are you 100% sure you want to delete EVERY single student record from this academy?"
                }
                confirmText={!isFinalWarning ? "Continue" : "PURGE ALL RECORDS"}
                variant={!isFinalWarning ? "warning" : "danger"}
                shouldCloseOnConfirm={isFinalWarning}
            />
        </div>
    );
};

export default ManageStudents;
