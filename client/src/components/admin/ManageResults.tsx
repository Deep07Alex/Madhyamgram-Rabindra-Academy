/**
 * Academic Performance Ledger (Results)
 * 
 * Provides an administrative interface to log and audit examination scores.
 * Features:
 * - Cycle Management: Track performance across Unit-I, Unit-II, Unit-III.
 * - Bulk Excel Import: Upload class-wide marks in one go.
 * - Template Generation: Download pre-formatted Excel sheets for each class.
 * - Granular Records: Individual subject-wise mark entry with academic year support.
 */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import api from '../../services/api';
import { EXAMINATION_TERMS, ACADEMIC_YEARS, getFullMarks } from '../../utils/constants';
import { FilePlus, List, Trash2, Download, Upload, FileSpreadsheet, Loader2, Search, X, Calendar, GraduationCap, School } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import * as XLSX from 'xlsx';
import CustomSelect from '../common/CustomSelect';
import ConfirmModal from '../common/ConfirmModal';
import { generateResultPDF, generateRankingsPDF } from '../../utils/resultUtils';

interface Student {
    id: string;
    studentId: string;
    name: string;
    rollNumber: string;
    classId: string;
}

interface SchoolClass {
    id: string;
    name: string;
    subjects?: { id?: string, name: string, fullMarks: number | string }[];
}

const ManageResults = () => {
    const { showToast } = useToast();
    const [results, setResults] = useState<any[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<SchoolClass[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [viewMode, setViewMode] = useState<'ledger' | 'rankings' | 'marks'>('ledger');
    const [rankings, setRankings] = useState<Record<string, any[]>>({});
    const [marksLedger, setMarksLedger] = useState<Record<string, any[]>>({});

    // Form States
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedTerm, setSelectedTerm] = useState('Unit-I');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const [newResult, setNewResult] = useState({
        studentId: '', semester: 'Unit-I', subject: '', marks: '', totalMarks: '50', academicYear: new Date().getFullYear(), grade: ''
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Grouping and Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type: 'danger' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'info'
    });

    const fetchInitialData = useCallback(async () => {
        try {
            const [stuRes, classRes] = await Promise.all([
                api.get('/users/students?limit=1000'),
                api.get('/users/classes')
            ]);
            setStudents(stuRes.data.students || []);
            setClasses(classRes.data);
            if (classRes.data.length > 0 && !selectedClassId) setSelectedClassId(classRes.data[0].id);
        } catch (error) {
            console.error('Failed to fetch initial data:', error);
        }
    }, [selectedClassId]);

    const fetchResults = useCallback(async () => {
        setIsLoading(true);
        try {
            if (viewMode === 'ledger') {
                const resRes = await api.get(`/results?academicYear=${selectedYear}&semester=${selectedTerm}`);
                setResults(resRes.data);
            } else if (viewMode === 'rankings') {
                const rankRes = await api.get(`/results/rankings?academicYear=${selectedYear}`);
                setRankings(rankRes.data);
            } else if (viewMode === 'marks') {
                const marksRes = await api.get(`/results/rankings?academicYear=${selectedYear}&all=true`);
                setMarksLedger(marksRes.data);
            }
        } catch (error) {
            console.error('Failed to fetch results:', error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedYear, selectedTerm, viewMode]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    useEffect(() => {
        fetchResults();
    }, [fetchResults]);

    // Update totalMarks when subject changes in manual entry
    useEffect(() => {
        if (newResult.subject) {
            const classObj = classes.find(c => c.id === selectedClassId);
            const dynamicSubject = classObj?.subjects?.find((s: any) => s.name === newResult.subject);
            const marks = dynamicSubject ? dynamicSubject.fullMarks : getFullMarks(newResult.subject, classObj?.name);
            setNewResult(prev => ({ ...prev, totalMarks: marks.toString() }));
        }
    }, [newResult.subject, selectedTerm, selectedClassId]);

    const handleCreateResult = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/results', newResult);
            showToast('Result recorded successfully', 'success');
            setNewResult({ ...newResult, subject: '', marks: '', grade: '' });
            fetchResults();
        } catch (error) {
            showToast('Failed to add result', 'error');
        }
    };

    const handleDeleteResult = async (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Record',
            message: 'Are you sure you want to delete this specific record?',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await api.delete(`/results/${id}`);
                    showToast('Record removed', 'info');
                    fetchResults();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    showToast('Failed to delete', 'error');
                }
            }
        });
    };

    const downloadTemplate = () => {
        const selectedClass = classes.find((c: any) => c.id === selectedClassId);
        if (!selectedClass) return showToast('Please select a class first', 'error');

        const classStudents = students.filter((s: any) => s.classId === selectedClassId);
        if (classStudents.length === 0) return showToast('No students found in this class', 'error');

        // Prepare Header rows (Subjects + Full Marks)
        const subjectsList = selectedClass.subjects?.map((s: any) => s.name) || [];
        if (subjectsList.length === 0) return showToast('No subjects are configured for this class! Assign subjects first.', 'error');

        const headers = ['Admission No', 'Roll', 'Name', ...subjectsList];

        // Use dynamic fullMarks directly from database
        const fullMarksRow = ['', '', 'Full Marks', ...subjectsList.map(subName => {
            const sDef = selectedClass.subjects?.find((s: any) => s.name === subName);
            return sDef ? sDef.fullMarks : getFullMarks(subName, selectedClass.name);
        })];
        const data = classStudents.map(s => [s.studentId, s.rollNumber, s.name, ...subjectsList.map(() => '')]);

        const worksheet = XLSX.utils.aoa_to_sheet([headers, fullMarksRow, ...data]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');

        XLSX.writeFile(workbook, `${selectedClass.name}_${selectedTerm}_Template.xlsx`);
    };

    const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation: Prevent accidental cross-class or cross-term uploads
        const selectedClass = classes.find((c: any) => c.id === selectedClassId);
        if (selectedClass) {
            const normalizedFileName = file.name.toLowerCase().replace(/[\s_-]/g, '');
            const normalizedClass = selectedClass.name.toLowerCase().replace(/[\s_-]/g, '');

            // Check for Term mismatch (Checked in reverse to prevent Unit-I matching Unit-III)
            const terms = ['Unit-III', 'Unit-II', 'Unit-I'];
            const fileTerm = terms.find(t => normalizedFileName.includes(t.toLowerCase().replace(/[\s_-]/g, '')));

            if (fileTerm && fileTerm !== selectedTerm) {
                showToast(`Incorrect Exam Term! You selected "${selectedTerm}" but the file "${file.name}" appears to be for "${fileTerm}".`, 'error');
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }

            // Check for Class mismatch
            if (!normalizedFileName.includes(normalizedClass)) {
                showToast(`Incorrect Class! You selected "${selectedClass.name}" but the file "${file.name}" belongs to another class.`, 'error');
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('semester', selectedTerm);
        formData.append('academicYear', selectedYear.toString());
        formData.append('classId', selectedClassId);

        try {
            const res = await api.post('/results/bulk', formData);
            showToast(res.data.message, 'success');
            fetchResults();
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Upload failed', 'error');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteStudentAllResults = async (studentId: string, name: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Critical Deletion',
            message: `Are you sure you want to delete ALL results for ${name} in ${selectedTerm} (${selectedYear})? This cannot be undone.`,
            type: 'danger',
            onConfirm: async () => {
                try {
                    await api.delete(`/results/student/${studentId}?semester=${selectedTerm}&academicYear=${selectedYear}`);
                    showToast(`All results for ${name} cleared`, 'info');
                    fetchResults();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    showToast('Failed to delete student results', 'error');
                }
            }
        });
    };

    const handleDeleteClassAllResults = async () => {
        const selectedClass = classes.find((c: any) => c.id === selectedClassId);
        if (!selectedClass) return;

        setConfirmModal({
            isOpen: true,
            title: 'MASSIVE DELETION WARNING',
            message: `You are about to delete ALL student results for Class: ${selectedClass.name}, Term: ${selectedTerm}, Year: ${selectedYear}. This will wipe out all marks for EVERY student in this selection. Are you absolutely certain?`,
            type: 'danger',
            onConfirm: async () => {
                try {
                    await api.delete(`/results/bulk/class/${selectedClassId}?semester=${selectedTerm}&academicYear=${selectedYear}`);
                    showToast(`Bulk Result deletion successful for ${selectedClass.name}`, 'success');
                    fetchResults();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    showToast('Bulk Result deletion failed', 'error');
                }
            }
        });
    };

    // Memoized consolidated grouping for table display
    const filteredStudentList = useMemo(() => {
        const grouped = results.reduce((acc: any, curr: any) => {
            const sid = curr.studentId;
            if (!acc[sid]) {
                acc[sid] = {
                    student: curr.student,
                    marks: [],
                    totalObtained: 0,
                    totalPossible: 0
                };
            }
            acc[sid].marks.push(curr);
            acc[sid].totalObtained += parseFloat(curr.marks || 0);
            acc[sid].totalPossible += parseFloat(curr.totalMarks || 50);
            return acc;
        }, {});

        const list = Object.values(grouped);
        return list.filter((data: any) => data.student?.classId === selectedClassId);
    }, [results, selectedClassId]);

    return (
        <div className="manage-section">
            <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '8px' }}>Result Control Center</h2>
                    <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Manage academy excellence and examination systems.</p>
                </div>
                <div style={{ display: 'flex', background: 'var(--bg-main)', padding: '6px', borderRadius: '12px', border: '1px solid var(--border-soft)' }}>
                    <button
                        onClick={() => setViewMode('ledger')}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '8px',
                            border: 'none',
                            background: viewMode === 'ledger' ? 'var(--primary-bold)' : 'transparent',
                            color: viewMode === 'ledger' ? 'white' : 'var(--text-muted)',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <List size={18} /> Entry Ledger
                    </button>
                    <button
                        onClick={() => { setViewMode('rankings'); fetchResults(); }}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '8px',
                            border: 'none',
                            background: viewMode === 'rankings' ? 'var(--accent)' : 'transparent',
                            color: viewMode === 'rankings' ? 'white' : 'var(--text-muted)',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <GraduationCap size={18} /> Classwise Rank
                    </button>
                    <button
                        onClick={() => { setViewMode('marks'); fetchResults(); }}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '8px',
                            border: 'none',
                            background: viewMode === 'marks' ? 'var(--primary-bold)' : 'transparent',
                            color: viewMode === 'marks' ? 'white' : 'var(--text-muted)',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <FileSpreadsheet size={18} /> Classwise Marks
                    </button>
                </div>
            </header>

            {/* Top Filters */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                marginBottom: '32px'
            }}>
                <div className="card" style={{ margin: 0, padding: '20px 24px' }}>
                    <CustomSelect
                        label="Academic Year"
                        value={selectedYear.toString()}
                        onChange={val => setSelectedYear(parseInt(val))}
                        options={ACADEMIC_YEARS.map(y => ({ value: y.toString(), label: y.toString() }))}
                        icon={<Calendar size={16} />}
                    />
                </div>
                {viewMode === 'ledger' && (
                    <div className="card" style={{ margin: 0, padding: '20px 24px' }}>
                        <CustomSelect
                            label="Examination Term"
                            value={selectedTerm}
                            onChange={val => setSelectedTerm(val)}
                            options={EXAMINATION_TERMS.map(t => ({ value: t, label: t }))}
                            icon={<GraduationCap size={16} />}
                        />
                    </div>
                )}
                <div className="card" style={{ margin: 0, padding: '20px 24px' }}>
                    <CustomSelect
                        label="Target Class"
                        value={selectedClassId}
                        onChange={val => {
                            setSelectedClassId(val);
                            setNewResult(prev => ({ ...prev, subject: '' }));
                        }}
                        options={classes.map((c: any) => ({ value: c.id, label: c.name }))}
                        icon={<School size={16} />}
                    />
                </div>
            </div>

            {viewMode === 'ledger' ? (
                <>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                        gap: '32px',
                        alignItems: 'start',
                        marginBottom: '32px'
                    }}>
                        {/* Bulk Import Column */}
                        <div className="card" style={{ margin: 0, padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}>
                                        <Upload size={18} />
                                    </div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Bulk Import Results</h3>
                                </div>
                                <button onClick={downloadTemplate} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '0.75rem', fontWeight: 700 }}>
                                    <Download size={14} /> Download Template
                                </button>
                            </div>

                            <div
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    border: '2px dashed var(--border-soft)',
                                    padding: '48px 24px',
                                    textAlign: 'center',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                    background: isUploading ? 'var(--bg-main)' : 'rgba(var(--primary-rgb), 0.02)',
                                    transition: 'all 0.3s ease',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                {isUploading ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                        <Loader2 className="animate-spin" color="var(--primary-bold)" size={40} />
                                        <div style={{ textAlign: 'center' }}>
                                            <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-main)' }}>Processing Academic Data</p>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Parsing sheet and validating students...</p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{
                                            width: '64px',
                                            height: '64px',
                                            borderRadius: '50%',
                                            background: 'var(--bg-main)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            margin: '0 auto 20px',
                                            border: '1px solid var(--border-soft)',
                                            color: 'var(--primary-bold)'
                                        }}>
                                            <FileSpreadsheet size={32} />
                                        </div>
                                        <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800 }}>Click to Upload Excel</h4>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Supported: .xlsx, .xls | Max 10MB</p>
                                    </>
                                )}
                                <input type="file" ref={fileInputRef} onChange={handleBulkUpload} accept=".xlsx, .xls" style={{ display: 'none' }} />
                            </div>
                        </div>

                        {/* Manual Entry Column */}
                        <div className="card" style={{ margin: 0, padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                                    <FilePlus size={18} />
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Manual Entry</h3>
                            </div>

                            <form onSubmit={handleCreateResult} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <CustomSelect
                                    label="Student"
                                    value={newResult.studentId}
                                    onChange={val => setNewResult({ ...newResult, studentId: val })}
                                    options={students.filter(s => s.classId === selectedClassId).map((s: any) => ({
                                        value: s.id,
                                        label: `${s.name} (${s.rollNumber})`
                                    }))}
                                    placeholder="Choose Student..."
                                    searchable
                                />
                                <CustomSelect
                                    label="Subject"
                                    value={newResult.subject}
                                    onChange={val => setNewResult({ ...newResult, subject: val })}
                                    options={(classes.find(c => c.id === selectedClassId)?.subjects || []).map((sub: any) => ({ value: sub.name, label: sub.name }))}
                                    placeholder="Choose Subject..."
                                />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Obtained</label>
                                        <input
                                            type="number"
                                            placeholder="Score"
                                            value={newResult.marks}
                                            onChange={e => setNewResult({ ...newResult, marks: e.target.value })}
                                            required
                                            style={{ height: '44px' }}
                                        />
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Max Marks</label>
                                        <input
                                            type="number"
                                            value={newResult.totalMarks}
                                            onChange={e => setNewResult({ ...newResult, totalMarks: e.target.value })}
                                            required
                                            style={{ height: '44px' }}
                                        />
                                    </div>
                                </div>
                                <button type="submit" className="btn-primary" style={{ height: '48px', fontWeight: 800, fontSize: '0.9rem', marginTop: '4px' }}>
                                    Record Spot Result
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="card" style={{ margin: 0, padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}>
                                    <List size={18} />
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Examination Ledger <span style={{ color: 'var(--text-muted)', fontWeight: 500, marginLeft: '8px' }}>({selectedTerm} - {selectedYear})</span></h3>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                {filteredStudentList.length > 0 && (
                                    <button
                                        onClick={handleDeleteClassAllResults}
                                        className="btn-danger"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '8px 16px',
                                            fontSize: '0.75rem',
                                            fontWeight: 700
                                        }}
                                    >
                                        <Trash2 size={14} /> Bulk Delete Class Results
                                    </button>
                                )}
                                {isLoading && <Loader2 size={18} className="animate-spin" color="var(--primary-bold)" />}
                            </div>
                        </div>

                        <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                            <table className="data-table">
                                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                    <tr>
                                        <th>Student Identity</th>
                                        <th style={{ textAlign: 'center' }}>Performance Aggregate</th>
                                        <th style={{ textAlign: 'center' }}>Subject Count</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudentList.map((data: any) => (
                                        <tr key={data.student.id}>
                                            <td style={{ fontWeight: '700' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span>{data.student.name}</span>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>ID: {data.student.studentId} • Roll: {data.student.rollNumber}</span>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--primary-bold)' }}>{data.totalObtained}</span>
                                                    <span style={{ fontSize: '0.7rem', opacity: 0.4, fontWeight: 700 }}>OUT OF {data.totalPossible}</span>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: '4px 12px',
                                                    background: 'var(--bg-main)',
                                                    border: '1px solid var(--border-soft)',
                                                    borderRadius: '6px',
                                                    fontSize: '0.9rem',
                                                    fontWeight: 800,
                                                    minWidth: '44px'
                                                }}>
                                                    {data.marks.length} Subjects
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                    <button
                                                        onClick={() => { setSelectedStudent(data); setIsModalOpen(true); }}
                                                        className="btn-view-details"
                                                    >
                                                        View Details
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteStudentAllResults(data.student.id, data.student.name)}
                                                        className="btn-danger"
                                                        title="Delete all marks for this student"
                                                        style={{ width: '38px', height: '38px', borderRadius: '10px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredStudentList.length === 0 && !isLoading && (
                                        <tr>
                                            <td colSpan={4} style={{ textAlign: 'center', padding: '100px 40px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                                    <Search size={48} style={{ opacity: 0.15, color: 'var(--primary-bold)' }} />
                                                    <div>
                                                        <p style={{ margin: 0, color: 'var(--text-main)', fontWeight: 800, fontSize: '1.2rem' }}>No performance records</p>
                                                        <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontWeight: 500 }}>Try selecting a different criteria or upload new results.</p>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : viewMode === 'rankings' ? (
                <div className="rankings-container">
                    <div className="card" style={{ padding: '32px', textAlign: 'center', marginBottom: '32px', background: 'linear-gradient(135deg, var(--bg-main) 0%, rgba(var(--primary-rgb), 0.05) 100%)' }}>
                        <GraduationCap size={48} color="var(--accent)" style={{ marginBottom: '16px' }} />
                        <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)' }}>Classwise Rank for the session {selectedYear}</h2>
                        <p style={{ color: 'var(--text-muted)', fontWeight: 500, marginBottom: '24px' }}>Consolidated performance ranking based on Unit-I, II, and III totals.</p>

                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button
                                onClick={() => generateRankingsPDF(rankings, selectedYear, true)}
                                className="btn-primary"
                                disabled={Object.keys(rankings).length === 0}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 24px', fontSize: '1rem', background: 'var(--accent)', borderColor: 'var(--accent)' }}
                            >
                                <Download size={20} /> Download All Classes Ranking PDF
                            </button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
                            <Loader2 className="animate-spin" size={48} color="var(--primary-bold)" />
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                                {(() => {
                                    const selectedClassName = classes.find(c => c.id === selectedClassId)?.name;
                                    const filteredRankings = Object.entries(rankings).filter(([name]) => name === selectedClassName);

                                    if (filteredRankings.length === 0) {
                                        return (
                                            <div style={{ textAlign: 'center', padding: '100px', background: 'var(--bg-main)', borderRadius: '16px' }}>
                                                <Search size={48} color="var(--text-muted)" style={{ opacity: 0.2, marginBottom: '16px' }} />
                                                <p style={{ fontWeight: 700, color: 'var(--text-muted)' }}>No ranking data available for CLASS-{selectedClassName} in {selectedYear}.</p>
                                            </div>
                                        );
                                    }

                                    return filteredRankings.map(([className, students]) => (
                                        <div key={className} className="card" style={{ margin: 0, overflow: 'hidden', padding: 0, border: '1px solid var(--border-soft)' }}>
                                            <div style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-soft)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <h3 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 900, color: 'var(--text-main)' }}>
                                                    CLASS - {className}
                                                </h3>
                                                <button
                                                    onClick={() => generateRankingsPDF({ [className]: students }, selectedYear)}
                                                    className="btn-secondary"
                                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', padding: '8px 16px' }}
                                                >
                                                    <Download size={16} /> Download This Class PDF
                                                </button>
                                            </div>
                                            <div className="table-responsive">
                                                <table className="data-table" style={{ margin: 0 }}>
                                                    <thead>
                                                        <tr>
                                                            <th rowSpan={2} style={{ verticalAlign: 'middle', borderRight: '1px solid var(--border-soft)' }}>Admission Regn. No.</th>
                                                            <th rowSpan={2} style={{ verticalAlign: 'middle', borderRight: '1px solid var(--border-soft)' }}>Roll</th>
                                                            <th rowSpan={2} style={{ verticalAlign: 'middle', borderRight: '1px solid var(--border-soft)' }}>NAME</th>
                                                            <th style={{ textAlign: 'center', borderRight: '1px solid var(--border-soft)' }}>Total Unit-I</th>
                                                            <th style={{ textAlign: 'center', borderRight: '1px solid var(--border-soft)' }}>Total Unit-II</th>
                                                            <th style={{ textAlign: 'center', borderRight: '1px solid var(--border-soft)' }}>Total Unit-III</th>
                                                            <th style={{ textAlign: 'center', borderRight: '1px solid var(--border-soft)' }}>Total Unit I+II+III</th>
                                                            <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid var(--border-soft)' }}>Percentage of Marks</th>
                                                            <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle' }}>Rank</th>
                                                        </tr>
                                                        <tr>
                                                            <th style={{ fontSize: '0.7rem', textAlign: 'center', borderRight: '1px solid var(--border-soft)', color: 'var(--text-muted)' }}>F.M.-{students[0]?.unit1FM || 'Varies'}</th>
                                                            <th style={{ fontSize: '0.7rem', textAlign: 'center', borderRight: '1px solid var(--border-soft)', color: 'var(--text-muted)' }}>F.M.-{students[0]?.unit2FM || 'Varies'}</th>
                                                            <th style={{ fontSize: '0.7rem', textAlign: 'center', borderRight: '1px solid var(--border-soft)', color: 'var(--text-muted)' }}>F.M.-{students[0]?.unit3FM || 'Varies'}</th>
                                                            <th style={{ fontSize: '0.7rem', textAlign: 'center', borderRight: '1px solid var(--border-soft)', color: 'var(--text-muted)' }}>F.M.-{students[0]?.maxGrandTotal || 'Varies'}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {students.map((s: any) => (
                                                            <tr key={s.studentDbId}>
                                                                <td style={{ textAlign: 'center', fontWeight: 600, borderRight: '1px solid var(--border-soft)' }}>{s.admissionId}</td>
                                                                <td style={{ textAlign: 'center', fontWeight: 600, borderRight: '1px solid var(--border-soft)' }}>{s.roll}</td>
                                                                <td style={{ fontWeight: 800, borderRight: '1px solid var(--border-soft)' }}>{s.name.toUpperCase()}</td>
                                                                <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-soft)' }}>{s.unit1Total != null ? s.unit1Total : '—'}</td>
                                                                <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-soft)' }}>{s.unit2Total != null ? s.unit2Total : '—'}</td>
                                                                <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-soft)' }}>{s.unit3Total != null ? s.unit3Total : '—'}</td>
                                                                <td style={{ textAlign: 'center', fontWeight: 800, borderRight: '1px solid var(--border-soft)', color: 'var(--primary-bold)' }}>{s.grandTotal != null ? s.grandTotal : '—'}</td>
                                                                <td style={{ textAlign: 'center', fontWeight: 800, borderRight: '1px solid var(--border-soft)' }}>
                                                                    {s.grandTotal != null && s.maxGrandTotal != null && s.maxGrandTotal > 0 ? ((s.grandTotal / s.maxGrandTotal) * 100).toFixed(2) + '%' : '—'}
                                                                </td>
                                                                <td style={{ textAlign: 'center' }}>
                                                                    {(() => {
                                                                        const r = parseInt(s.rank);
                                                                        if (!s.rank || r > 5) return null;
                                                                        const suffixes = ["th", "st", "nd", "rd"];
                                                                        const v = r % 100;
                                                                        const suffix = (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
                                                                        return (
                                                                            <span style={{
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                padding: '6px 12px',
                                                                                background: r === 1 ? 'gold' : r === 2 ? '#C0C0C0' : r === 3 ? '#CD7F32' : 'var(--primary-soft)',
                                                                                color: r === 1 || r === 2 || r === 3 ? 'black' : 'var(--primary-bold)',
                                                                                borderRadius: '8px',
                                                                                fontWeight: 900,
                                                                                fontSize: '0.9rem',
                                                                                minWidth: '50px'
                                                                            }}>
                                                                                {r}{suffix}
                                                                            </span>
                                                                        );
                                                                    })()}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <div className="rankings-container">
                    <div className="card" style={{ padding: '32px', textAlign: 'center', marginBottom: '32px', background: 'linear-gradient(135deg, var(--bg-main) 0%, rgba(var(--primary-rgb), 0.05) 100%)' }}>
                        <FileSpreadsheet size={48} color="var(--primary-bold)" style={{ marginBottom: '16px' }} />
                        <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)' }}>Classwise Marks Ledger ({selectedYear})</h2>
                        <p style={{ color: 'var(--text-muted)', fontWeight: 500, marginBottom: '24px' }}>Full class performance overview. Progressive data for all students.</p>

                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button
                                onClick={() => generateRankingsPDF(marksLedger, selectedYear, true)}
                                className="btn-primary"
                                disabled={Object.keys(marksLedger).length === 0}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 24px', fontSize: '1rem' }}
                            >
                                <Download size={20} /> Download All Classes Marks PDF
                            </button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
                            <Loader2 className="animate-spin" size={48} color="var(--primary-bold)" />
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                                {(() => {
                                    const selectedClassName = classes.find(c => c.id === selectedClassId)?.name;
                                    const filteredMarks = Object.entries(marksLedger).filter(([name]) => name === selectedClassName);

                                    if (filteredMarks.length === 0) {
                                        return (
                                            <div style={{ textAlign: 'center', padding: '100px', background: 'var(--bg-main)', borderRadius: '16px' }}>
                                                <Search size={48} color="var(--text-muted)" style={{ opacity: 0.2, marginBottom: '16px' }} />
                                                <p style={{ fontWeight: 700, color: 'var(--text-muted)' }}>No marks record found for CLASS-{selectedClassName} in {selectedYear}.</p>
                                            </div>
                                        );
                                    }

                                    return filteredMarks.map(([className, students]) => {
                                        // A class is considered 'Published' only if at least one student has marks in each of the three units
                                        const hasUnit1 = students.some(s => s.unit1Total != null);
                                        const hasUnit2 = students.some(s => s.unit2Total != null);
                                        const hasUnit3 = students.some(s => s.unit3Total != null);
                                        const isComplete = hasUnit1 && hasUnit2 && hasUnit3;

                                        if (!isComplete) {
                                            return (
                                                <div key={className} style={{ textAlign: 'center', padding: '100px', background: 'var(--bg-main)', borderRadius: '16px', border: '1px solid var(--border-soft)' }}>
                                                    <Search size={48} color="var(--text-muted)" style={{ opacity: 0.2, marginBottom: '16px' }} />
                                                    <p style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1.2rem' }}>No marks data for CLASS-{className.toUpperCase()} in {selectedYear}</p>
                                                    <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>The consolidated ledger will be available once Unit-I, II, and III results are published.</p>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={className} className="card" style={{ margin: 0, overflow: 'hidden', padding: 0, border: '1px solid var(--border-soft)' }}>
                                                <div style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-soft)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <h3 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 900, color: 'var(--text-main)' }}>
                                                        CLASS - {className}
                                                    </h3>
                                                    <button
                                                        onClick={() => generateRankingsPDF({ [className]: students }, selectedYear)}
                                                        className="btn-secondary"
                                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', padding: '8px 16px' }}
                                                    >
                                                        <Download size={16} /> Download This Class PDF
                                                    </button>
                                                </div>
                                                <div className="table-responsive">
                                                    <table className="data-table" style={{ margin: 0 }}>
                                                        <thead>
                                                            <tr>
                                                                <th rowSpan={2} style={{ verticalAlign: 'middle', borderRight: '1px solid var(--border-soft)' }}>Admission Regn. No.</th>
                                                                <th rowSpan={2} style={{ verticalAlign: 'middle', borderRight: '1px solid var(--border-soft)' }}>Roll</th>
                                                                <th rowSpan={2} style={{ verticalAlign: 'middle', borderRight: '1px solid var(--border-soft)' }}>NAME</th>
                                                                <th style={{ textAlign: 'center', borderRight: '1px solid var(--border-soft)' }}>Total Unit-I</th>
                                                                <th style={{ textAlign: 'center', borderRight: '1px solid var(--border-soft)' }}>Total Unit-II</th>
                                                                <th style={{ textAlign: 'center', borderRight: '1px solid var(--border-soft)' }}>Total Unit-III</th>
                                                                <th style={{ textAlign: 'center', borderRight: '1px solid var(--border-soft)' }}>Total Unit I+II+III</th>
                                                                <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid var(--border-soft)' }}>Percentage of Marks</th>
                                                                <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle' }}>Rank</th>
                                                            </tr>
                                                            <tr>
                                                                <th style={{ fontSize: '0.7rem', textAlign: 'center', borderRight: '1px solid var(--border-soft)', color: 'var(--text-muted)' }}>F.M.-{students[0]?.unit1FM || '—'}</th>
                                                                <th style={{ fontSize: '0.7rem', textAlign: 'center', borderRight: '1px solid var(--border-soft)', color: 'var(--text-muted)' }}>F.M.-{students[0]?.unit2FM || '—'}</th>
                                                                <th style={{ fontSize: '0.7rem', textAlign: 'center', borderRight: '1px solid var(--border-soft)', color: 'var(--text-muted)' }}>F.M.-{students[0]?.unit3FM || '—'}</th>
                                                                <th style={{ fontSize: '0.7rem', textAlign: 'center', borderRight: '1px solid var(--border-soft)', color: 'var(--text-muted)' }}>F.M.-{students[0]?.maxGrandTotal || '—'}</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {students.map((s: any) => (
                                                                <tr key={s.studentDbId}>
                                                                    <td style={{ textAlign: 'center', fontWeight: 600, borderRight: '1px solid var(--border-soft)' }}>{s.admissionId}</td>
                                                                    <td style={{ textAlign: 'center', fontWeight: 600, borderRight: '1px solid var(--border-soft)' }}>{s.roll}</td>
                                                                    <td style={{ fontWeight: 800, borderRight: '1px solid var(--border-soft)' }}>{s.name.toUpperCase()}</td>
                                                                    <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-soft)' }}>{s.unit1Total != null ? s.unit1Total : '—'}</td>
                                                                    <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-soft)' }}>{s.unit2Total != null ? s.unit2Total : '—'}</td>
                                                                    <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-soft)' }}>{s.unit3Total != null ? s.unit3Total : '—'}</td>
                                                                    <td style={{ textAlign: 'center', fontWeight: 800, borderRight: '1px solid var(--border-soft)', color: 'var(--primary-bold)' }}>{s.grandTotal != null ? s.grandTotal : '—'}</td>
                                                                    <td style={{ textAlign: 'center', fontWeight: 800, borderRight: '1px solid var(--border-soft)' }}>
                                                                        {s.grandTotal != null && s.maxGrandTotal != null && s.maxGrandTotal > 0 ? ((s.grandTotal / s.maxGrandTotal) * 100).toFixed(2) + '%' : '—'}
                                                                    </td>
                                                                    <td style={{ textAlign: 'center' }}>
                                                                        {(() => {
                                                                            const r = parseInt(s.rank);
                                                                            if (!s.rank || r > 5) return null;
                                                                            const suffixes = ["th", "st", "nd", "rd"];
                                                                            const v = r % 100;
                                                                            const suffix = (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
                                                                            return (
                                                                                <span style={{
                                                                                    display: 'inline-flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'center',
                                                                                    padding: '6px 12px',
                                                                                    background: r === 1 ? 'gold' : r === 2 ? '#C0C0C0' : r === 3 ? '#CD7F32' : 'var(--primary-soft)',
                                                                                    color: r === 1 || r === 2 || r === 3 ? 'black' : 'var(--primary-bold)',
                                                                                    borderRadius: '8px',
                                                                                    fontWeight: 900,
                                                                                    fontSize: '0.9rem',
                                                                                    minWidth: '50px'
                                                                                }}>
                                                                                    {r}{suffix}
                                                                                </span>
                                                                            );
                                                                        })()}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Marks Detail Modal */}
            {isModalOpen && selectedStudent && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    padding: '20px'
                }}>
                    <div className="card" style={{
                        margin: 0,
                        width: '100%',
                        maxWidth: '700px',
                        maxHeight: '80vh',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.4rem' }}>{selectedStudent.student.name}</h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                    {selectedTerm} Report • Roll NO: {selectedStudent.student.rollNumber}
                                </p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px' }}>
                                <X size={24} style={{ opacity: 0.5 }} />
                            </button>
                        </div>

                        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Subject</th>
                                        <th style={{ textAlign: 'center' }}>Marks</th>
                                        <th style={{ textAlign: 'center' }}>Grade</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedStudent.marks.map((m: any) => (
                                        <tr key={m.id}>
                                            <td style={{ fontWeight: 700 }}>{m.subject}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{ fontWeight: 900, color: 'var(--primary-bold)' }}>{m.marks}</span>
                                                <span style={{ fontSize: '0.7rem', opacity: 0.4, marginLeft: '4px' }}>/{m.totalMarks}</span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '4px 10px',
                                                    background: 'var(--primary-soft)',
                                                    color: 'var(--primary-bold)',
                                                    borderRadius: '6px',
                                                    fontWeight: 900,
                                                    fontSize: '0.8rem'
                                                }}>{m.grade}</span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button
                                                    onClick={() => handleDeleteResult(m.id)}
                                                    className="btn-danger"
                                                    style={{ width: '32px', height: '32px', padding: 0, borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ padding: '24px', borderTop: '1px solid var(--border-soft)', background: 'var(--bg-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                                Term Aggregate: <span style={{ color: 'var(--primary-bold)', fontSize: '1.2rem', marginLeft: '8px' }}>{selectedStudent.totalObtained}</span> / {selectedStudent.totalPossible}
                            </div>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={async () => {
                                        try {
                                            showToast(`Generating ${selectedTerm} report...`, 'info');
                                            const res = await api.get(`/results/report?studentId=${selectedStudent.student.id}&academicYear=${selectedYear}`);
                                            await generateResultPDF({ ...res.data, targetSemester: selectedTerm });
                                            showToast('Report generated successfully', 'success');
                                        } catch (err) {
                                            showToast('Failed to generate report', 'error');
                                        }
                                    }}
                                    className="btn-primary"
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'var(--accent)', borderColor: 'var(--accent)' }}
                                >
                                    <Download size={18} /> {selectedTerm} Report Only
                                </button>

                                <button
                                    onClick={async () => {
                                        try {
                                            const isYearly = selectedTerm === 'Unit-III';
                                            const title = isYearly ? 'Full Yearly' : 'Progressive';
                                            showToast(`Generating ${title} report...`, 'info');
                                            const res = await api.get(`/results/report?studentId=${selectedStudent.student.id}&academicYear=${selectedYear}`);
                                            await generateResultPDF(res.data);
                                            showToast('Report generated successfully', 'success');
                                        } catch (err) {
                                            showToast('Failed to generate report', 'error');
                                        }
                                    }}
                                    className="btn-primary"
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
                                >
                                    <Download size={18} /> Full Progress Report
                                </button>

                                <button onClick={() => setIsModalOpen(false)} className="btn-secondary" style={{ padding: '10px 20px' }}>
                                    Close View
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.type === 'danger' ? 'danger' : 'info'}
            />
        </div>
    );
};

export default ManageResults;
