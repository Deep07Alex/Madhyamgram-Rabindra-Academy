import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capawesome-team/capacitor-file-opener';
import { Capacitor } from '@capacitor/core';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search,
    ArrowLeft,
    Loader2,
    Plus,
    Upload,
    FileSpreadsheet,
    Trash2,
    Download,
    GraduationCap,
    List,
    Calendar,
    ChevronDown,
    FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { EXAMINATION_TERMS, ACADEMIC_YEARS, getFullMarks } from '../../../utils/constants';
import * as XLSX from 'xlsx';
import { generateResultPDF, generateRankingsPDF } from '../../../utils/resultUtils';
import ConfirmModal from '../../../components/common/ConfirmModal';
import Modal from '../../../components/common/Modal';

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

export default function MobileManageResults() {
    const navigate = useNavigate();
    const { showToast } = useToast();

    // Tabs: 'ledger' | 'rankings' | 'marks'
    const [activeTab, setActiveTab] = useState<'ledger' | 'rankings' | 'marks'>('ledger');
    
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [students, setStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<SchoolClass[]>([]);
    const [results, setResults] = useState<any[]>([]);
    const [rankings, setRankings] = useState<Record<string, any[]>>({});
    const [marksLedger, setMarksLedger] = useState<Record<string, any[]>>({});

    // Filters
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedTerm, setSelectedTerm] = useState('Unit-I');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Manual Entry Form
    const [showManualEntry, setShowManualEntry] = useState(false);
    const [newResult, setNewResult] = useState({
        studentId: '', semester: 'Unit-I', subject: '', marks: '', totalMarks: '50', academicYear: new Date().getFullYear(), grade: ''
    });

    // Modals
    const [selectedStudentResults, setSelectedStudentResults] = useState<any>(null);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant: 'danger' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        variant: 'info'
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchInitialData = useCallback(async () => {
        try {
            const classRes = await api.get('/users/classes');
            setClasses(classRes.data);
            if (classRes.data.length > 0 && !selectedClassId) {
                setSelectedClassId(classRes.data[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch classes:', error);
        }
    }, [selectedClassId]);

    const fetchStudentsForClass = useCallback(async (classId: string) => {
        if (!classId) return;
        try {
            const stuRes = await api.get(`/users/students?classId=${classId}&limit=200`);
            setStudents(stuRes.data.students || []);
        } catch (error) {
            console.error('Failed to fetch students:', error);
        }
    }, []);

    const fetchResults = useCallback(async () => {
        if (!selectedClassId) return;
        setIsLoading(true);
        try {
            if (activeTab === 'ledger') {
                const resRes = await api.get(`/results?academicYear=${selectedYear}&semester=${selectedTerm}&classId=${selectedClassId}`);
                setResults(resRes.data);
            } else if (activeTab === 'rankings') {
                const rankRes = await api.get(`/results/rankings?academicYear=${selectedYear}&classId=${selectedClassId}`);
                setRankings(rankRes.data);
            } else if (activeTab === 'marks') {
                const marksRes = await api.get(`/results/rankings?academicYear=${selectedYear}&all=true&classId=${selectedClassId}`);
                setMarksLedger(marksRes.data);
            }
        } catch (error) {
            console.error('Failed to fetch results:', error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedYear, selectedTerm, activeTab, selectedClassId]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    useEffect(() => {
        if (selectedClassId) {
            fetchStudentsForClass(selectedClassId);
            fetchResults();
        }
    }, [selectedClassId, selectedYear, selectedTerm, activeTab, fetchStudentsForClass, fetchResults]);

    useEffect(() => {
        const backListener = App.addListener('backButton', () => {
            if (showManualEntry) {
                setShowManualEntry(false);
            } else if (selectedStudentResults) {
                setSelectedStudentResults(null);
            } else if (activeTab !== 'ledger') {
                setActiveTab('ledger');
            } else {
                navigate(-1);
            }
        });
        return () => { backListener.then(l => l.remove()); }
    }, [showManualEntry, selectedStudentResults, activeTab, navigate]);

    // Manual Entry Logic
    useEffect(() => {
        if (newResult.subject) {
            const classObj = classes.find(c => c.id === selectedClassId);
            const dynamicSubject = classObj?.subjects?.find((s: any) => s.name === newResult.subject);
            const marks = dynamicSubject ? dynamicSubject.fullMarks : getFullMarks(newResult.subject, classObj?.name);
            setNewResult(prev => ({ ...prev, totalMarks: marks.toString() }));
        }
    }, [newResult.subject, selectedTerm, selectedClassId, classes]);

    const handleCreateResult = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/results', { ...newResult, academicYear: selectedYear, semester: selectedTerm });
            showToast('Result recorded successfully', 'success');
            setNewResult({ ...newResult, subject: '', marks: '', grade: '' });
            fetchResults();
            setShowManualEntry(false);
        } catch (error) {
            showToast('Failed to add result', 'error');
        }
    };

    // Bulk Actions
    const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const selectedClass = classes.find((c: any) => c.id === selectedClassId);
        if (selectedClass) {
            const normalizedFileName = file.name.toLowerCase().replace(/[\s_-]/g, '');
            const normalizedClass = selectedClass.name.toLowerCase().replace(/[\s_-]/g, '');
            const terms = ['Unit-III', 'Unit-II', 'Unit-I'];
            const fileTerm = terms.find(t => normalizedFileName.includes(t.toLowerCase().replace(/[\s_-]/g, '')));

            if (fileTerm && fileTerm !== selectedTerm) {
                showToast(`Incorrect Term! Expected ${selectedTerm}, found ${fileTerm} in filename.`, 'error');
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }

            if (!normalizedFileName.includes(normalizedClass)) {
                showToast(`Incorrect Class! Filename does not match ${selectedClass.name}.`, 'error');
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

    const downloadTemplate = () => {
        const selectedClass = classes.find((c: any) => c.id === selectedClassId);
        if (!selectedClass) return showToast('Please select a class first', 'error');

        const classStudents = students.filter((s: any) => s.classId === selectedClassId);
        if (classStudents.length === 0) return showToast('No students in this class', 'error');

        const subjectsList = selectedClass.subjects?.map((s: any) => s.name) || [];
        if (subjectsList.length === 0) return showToast('No subjects configured for this class.', 'error');

        const headers = ['Admission No', 'Roll', 'Name', ...subjectsList];
        const fullMarksRow = ['', '', 'Full Marks', ...subjectsList.map(subName => {
            const sDef = selectedClass.subjects?.find((s: any) => s.name === subName);
            return sDef ? sDef.fullMarks : getFullMarks(subName, selectedClass.name);
        })];
        const data = classStudents.map(s => [s.studentId, s.rollNumber, s.name, ...subjectsList.map(() => '')]);

        const worksheet = XLSX.utils.aoa_to_sheet([headers, fullMarksRow, ...data]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');

        const sanitizedFileName = `${selectedClass.name}_${selectedTerm}_Template.xlsx`.replace(/[^a-zA-Z0-9._-]/g, '_');
        
        if (Capacitor.isNativePlatform()) {
            const b64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
            Filesystem.writeFile({
                path: sanitizedFileName,
                data: b64,
                directory: Directory.Cache,
                recursive: true
            }).then(savedFile => {
                FileOpener.openFile({ path: savedFile.uri });
                showToast('Template saved and opened', 'success');
            }).catch(err => {
                console.error(err);
                showToast('Failed to save file', 'error');
            });
        } else {
            XLSX.writeFile(workbook, sanitizedFileName);
        }
    };

    const handleDeleteRecord = async (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Record',
            message: 'Are you sure you want to delete this specific record?',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await api.delete(`/results/${id}`);
                    showToast('Record removed', 'info');
                    fetchResults();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    // If in details modal, refresh or close it
                    if (selectedStudentResults) {
                        const updatedMarks = selectedStudentResults.marks.filter((m: any) => m.id !== id);
                        if (updatedMarks.length === 0) setSelectedStudentResults(null);
                        else setSelectedStudentResults({ ...selectedStudentResults, marks: updatedMarks });
                    }
                } catch (error) {
                    showToast('Failed to delete', 'error');
                }
            }
        });
    };

    const handleDeleteStudentAllResults = async (studentId: string, name: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete All Results',
            message: `Delete ALL results for ${name} in ${selectedTerm} (${selectedYear})?`,
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await api.delete(`/results/student/${studentId}?semester=${selectedTerm}&academicYear=${selectedYear}`);
                    showToast(`Results cleared for ${name}`, 'info');
                    fetchResults();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    showToast('Failed to delete results', 'error');
                }
            }
        });
    };

    const handleDeleteClassAllResults = async () => {
        const selectedClass = classes.find((c: any) => c.id === selectedClassId);
        if (!selectedClass) return;

        setConfirmModal({
            isOpen: true,
            title: 'MASSIVE DELETION',
            message: `Delete ALL results for Class ${selectedClass.name}, Term ${selectedTerm}, Year ${selectedYear}?`,
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await api.delete(`/results/bulk/class/${selectedClassId}?semester=${selectedTerm}&academicYear=${selectedYear}`);
                    showToast(`Bulk deletion successful`, 'success');
                    fetchResults();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    showToast('Bulk deletion failed', 'error');
                }
            }
        });
    };

    // Data Processing (Server-side filtered results)
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

        return Object.values(grouped);
    }, [results]);

    // PDF Handlers (mirrored from web with Capacitor support)
    const handleDownloadAllRankings = async (data: any) => {
        try {
            const result = await generateRankingsPDF(data, selectedYear, true);
            if (Capacitor.isNativePlatform() && result) {
                const { doc, fileName } = result as any;
                const b64 = doc.output('datauristring').split(',')[1];
                const savedFile = await Filesystem.writeFile({
                    path: fileName.replace(/[^a-zA-Z0-9._-]/g, '_'),
                    data: b64,
                    directory: Directory.Cache,
                    recursive: true
                });
                await FileOpener.openFile({ path: savedFile.uri });
            }
            showToast('PDF Generated', 'success');
        } catch (e) {
            showToast('PDF Generation failed', 'error');
        }
    };

    const handleDownloadClassRankings = async (className: string, students: any[]) => {
        try {
            const result = await generateRankingsPDF({ [className]: students }, selectedYear);
            if (Capacitor.isNativePlatform() && result) {
                const { doc, fileName } = result as any;
                const b64 = doc.output('datauristring').split(',')[1];
                const savedFile = await Filesystem.writeFile({
                    path: fileName.replace(/[^a-zA-Z0-9._-]/g, '_'),
                    data: b64,
                    directory: Directory.Cache,
                    recursive: true
                });
                await FileOpener.openFile({ path: savedFile.uri });
            }
            showToast('PDF Generated', 'success');
        } catch (e) {
            showToast('PDF Generation failed', 'error');
        }
    };

    const handleDownloadFullReport = async (studentId: string, studentName: string) => {
        try {
            const res = await api.get(`/results/report/${studentId}?academicYear=${selectedYear}`);
            const result = await generateResultPDF({ ...res.data, targetSemester: selectedTerm });
            if (Capacitor.isNativePlatform() && result) {
                const doc = result as any;
                const fileName = `${studentName}_Report_${selectedTerm}_${selectedYear}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');
                const b64 = doc.output('datauristring').split(',')[1];
                const savedFile = await Filesystem.writeFile({
                    path: fileName,
                    data: b64,
                    directory: Directory.Cache,
                    recursive: true
                });
                await FileOpener.openFile({ path: savedFile.uri });
            }
            showToast('Report Generated', 'success');
        } catch (e) {
            showToast('Failed to generate report', 'error');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '100%', paddingBottom: '40px' }}
        >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div onClick={() => navigate(-1)} style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', cursor: 'pointer' }}>
                    <ArrowLeft size={20} />
                </div>
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)', fontFamily: 'Outfit', margin: 0 }}>Result Control</h1>
                    <p style={{ color: 'var(--text-muted)', fontWeight: '500', fontSize: '11px', margin: 0 }}>
                        Manage academic performance & rankings.
                    </p>
                </div>
            </div>

            {/* Segmented Control Tabs */}
            <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '4px', borderRadius: '16px', border: '1px solid var(--border-soft)' }}>
                <div onClick={() => setActiveTab('ledger')} style={{ flex: 1, padding: '10px 0', textAlign: 'center', borderRadius: '12px', background: activeTab === 'ledger' ? 'var(--primary-soft)' : 'transparent', color: activeTab === 'ledger' ? 'var(--primary-bold)' : 'var(--text-muted)', fontWeight: activeTab === 'ledger' ? '800' : '600', fontSize: '13px', cursor: 'pointer' }}>
                    Ledger
                </div>
                <div onClick={() => setActiveTab('rankings')} style={{ flex: 1, padding: '10px 0', textAlign: 'center', borderRadius: '12px', background: activeTab === 'rankings' ? 'var(--primary-soft)' : 'transparent', color: activeTab === 'rankings' ? 'var(--primary-bold)' : 'var(--text-muted)', fontWeight: activeTab === 'rankings' ? '800' : '600', fontSize: '13px', cursor: 'pointer' }}>
                    Rankings
                </div>
                <div onClick={() => setActiveTab('marks')} style={{ flex: 1, padding: '10px 0', textAlign: 'center', borderRadius: '12px', background: activeTab === 'marks' ? 'var(--primary-soft)' : 'transparent', color: activeTab === 'marks' ? 'var(--primary-bold)' : 'var(--text-muted)', fontWeight: activeTab === 'marks' ? '800' : '600', fontSize: '13px', cursor: 'pointer' }}>
                    Marks
                </div>
            </div>

            {/* Global Filters */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-card)', padding: '20px', borderRadius: '24px', border: '1px solid var(--border-soft)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', marginLeft: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Session</span>
                        <div style={{ position: 'relative' }}>
                            <select
                                style={{ width: '100%', padding: '12px 36px 12px 14px', borderRadius: '12px', border: '1px solid var(--border-soft)', background: 'var(--bg-soft)', color: 'var(--text-main)', outline: 'none', appearance: 'none', fontWeight: '700', fontSize: '13px' }}
                                value={selectedYear}
                                onChange={e => setSelectedYear(parseInt(e.target.value))}
                            >
                                {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', opacity: 0.7 }}><Calendar size={16} /></div>
                        </div>
                    </div>
                    {activeTab === 'ledger' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', marginLeft: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Exam Term</span>
                            <div style={{ position: 'relative' }}>
                                <select
                                    style={{ width: '100%', padding: '12px 36px 12px 14px', borderRadius: '12px', border: '1px solid var(--border-soft)', background: 'var(--bg-soft)', color: 'var(--text-main)', outline: 'none', appearance: 'none', fontWeight: '700', fontSize: '13px' }}
                                    value={selectedTerm}
                                    onChange={e => setSelectedTerm(e.target.value)}
                                >
                                    {EXAMINATION_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', opacity: 0.7 }}><GraduationCap size={16} /></div>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--primary-bold)', marginLeft: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Class</span>
                    <div style={{ position: 'relative' }}>
                        <select
                            style={{ 
                                width: '100%', 
                                padding: '16px 48px 16px 16px', 
                                borderRadius: '16px', 
                                border: '1.5px solid var(--primary-soft)', 
                                background: 'rgba(var(--primary-rgb), 0.03)', 
                                color: 'var(--text-main)', 
                                outline: 'none', 
                                appearance: 'none', 
                                fontWeight: '800', 
                                fontSize: '15px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                            }}
                            value={selectedClassId}
                            onChange={e => {
                                setSelectedClassId(e.target.value);
                                setNewResult(prev => ({ ...prev, studentId: '', subject: '' }));
                            }}
                        >
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--primary-bold)' }}><ChevronDown size={22} /></div>
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'ledger' ? (
                    <motion.div key="ledger" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        {/* Summary & Bulk Actions */}
                        <div style={{ background: 'var(--bg-card)', borderRadius: '24px', padding: '20px', border: '1px solid var(--border-soft)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}>
                                        <FileSpreadsheet size={20} />
                                    </div>
                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800' }}>Bulk Operations</h3>
                                </div>
                                <button onClick={downloadTemplate} style={{ padding: '8px 12px', borderRadius: '10px', background: 'var(--bg-soft)', border: '1px solid var(--border-soft)', fontSize: '11px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Download size={14} /> Template
                                </button>
                            </div>

                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                style={{ border: '2px dashed var(--border-soft)', borderRadius: '16px', padding: '24px', textAlign: 'center', cursor: 'pointer', background: isUploading ? 'var(--bg-soft)' : 'rgba(var(--primary-rgb), 0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="animate-spin" color="var(--primary-bold)" size={24} />
                                        <p style={{ margin: 0, fontSize: '12px', fontWeight: '700' }}>Analyzing Data...</p>
                                    </>
                                ) : (
                                    <>
                                        <Upload size={24} color="var(--primary-bold)" />
                                        <p style={{ margin: 0, fontSize: '13px', fontWeight: '700' }}>Upload Excel Results</p>
                                        <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-muted)' }}>Class & Term must match filename</p>
                                    </>
                                )}
                                <input type="file" ref={fileInputRef} onChange={handleBulkUpload} accept=".xlsx, .xls" style={{ display: 'none' }} />
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => setShowManualEntry(true)} style={{ flex: 1, padding: '14px', borderRadius: '14px', background: 'var(--primary-bold)', color: '#fff', border: 'none', fontWeight: '800', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <Plus size={18} /> Manual Entry
                                </button>
                                {filteredStudentList.length > 0 && (
                                    <button onClick={handleDeleteClassAllResults} style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#fee2e2', color: '#ef4444', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Trash2 size={20} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Results Ledger List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                                <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>Exam Ledger ({filteredStudentList.length})</span>
                                {isLoading && <Loader2 size={16} className="animate-spin" color="var(--primary-bold)" />}
                            </div>

                            {filteredStudentList.length > 0 ? (
                                filteredStudentList.map((data: any) => (
                                    <div key={data.student.id} style={{ background: 'var(--bg-card)', borderRadius: '24px', padding: '20px', border: '1px solid var(--border-soft)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                                                <div style={{ width: '52px', height: '52px', borderRadius: '15px', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)', border: '1px solid var(--border-soft)' }}>
                                                    <span style={{ fontSize: '18px', fontWeight: '900' }}>{data.student.name.charAt(0)}</span>
                                                </div>
                                                <div>
                                                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>{data.student.name}</h4>
                                                    <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>ID: {data.student.studentId} • Roll: {data.student.rollNumber}</p>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{ fontSize: '18px', fontWeight: '900', color: 'var(--primary-bold)', display: 'block' }}>{data.totalObtained}</span>
                                                <span style={{ fontSize: '9px', fontWeight: '800', opacity: 0.5, letterSpacing: '0.05em' }}>OUT OF {data.totalPossible}</span>
                                            </div>
                                        </div>
                                        
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <div style={{ flex: 1, background: 'var(--bg-soft)', padding: '8px 12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <List size={14} color="var(--text-muted)" />
                                                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>{data.marks.length} Subjects Recorded</span>
                                            </div>
                                            <button onClick={() => setSelectedStudentResults(data)} style={{ background: 'var(--primary-soft)', color: 'var(--primary-bold)', border: 'none', padding: '8px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: '800' }}>
                                                Details
                                            </button>
                                            <button onClick={() => handleDeleteStudentAllResults(data.student.id, data.student.name)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : !isLoading && (
                                <div style={{ textAlign: 'center', padding: '60px 40px', background: 'var(--bg-card)', borderRadius: '24px', border: '1px dashed var(--border-soft)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                    <Search size={40} style={{ opacity: 0.1, color: 'var(--primary-bold)' }} />
                                    <div>
                                        <p style={{ margin: 0, fontWeight: '800', fontSize: '16px' }}>No records found</p>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>Try changing the filters or upload results.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                    </motion.div>
                ) : activeTab === 'rankings' ? (
                    <motion.div key="rankings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        <div style={{ background: 'linear-gradient(135deg, var(--primary-bold) 0%, #1e1e1e 100%)', borderRadius: '24px', padding: '24px', color: '#fff', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', right: '-20px', top: '-20px', opacity: 0.1 }}><GraduationCap size={120} /></div>
                            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900' }}>Academic Standings</h3>
                            <p style={{ margin: '6px 0 20px 0', fontSize: '11px', opacity: 0.8, fontWeight: '500' }}>Global rankings for the {selectedYear} session.</p>
                            
                            <button 
                                onClick={() => handleDownloadAllRankings(rankings)}
                                disabled={Object.keys(rankings).length === 0}
                                style={{ width: '100%', padding: '14px', borderRadius: '14px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', fontWeight: '800', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                            >
                                <Download size={18} /> Download All Classes PDF
                            </button>
                        </div>

                        {(() => {
                            const selectedClassName = classes.find(c => c.id === selectedClassId)?.name;
                            const classRankingData = rankings[selectedClassName || ''];
                            
                            if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 className="animate-spin" size={32} color="var(--primary-bold)" /></div>;
                            
                            if (!classRankingData) return (
                                <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border-soft)' }}>
                                    <Search size={32} style={{ opacity: 0.1, marginBottom: '12px' }} />
                                    <p style={{ margin: 0, fontWeight: '700', fontSize: '13px', color: 'var(--text-muted)' }}>No rankings for Class {selectedClassName}</p>
                                </div>
                            );

                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '900' }}>Class {selectedClassName} Rankings</h4>
                                        <button onClick={() => handleDownloadClassRankings(selectedClassName!, classRankingData)} style={{ background: 'none', border: 'none', color: 'var(--primary-bold)', fontSize: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Download size={14} /> PDF
                                        </button>
                                    </div>

                                    {classRankingData.map((s: any) => (
                                        <div key={s.studentDbId} style={{ background: 'var(--bg-card)', borderRadius: '24px', padding: '16px', border: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
                                            <div style={{ 
                                                width: '44px', height: '44px', borderRadius: '14px', 
                                                background: s.rank === 1 ? 'gold' : s.rank === 2 ? '#C0C0C0' : s.rank === 3 ? '#CD7F32' : 'var(--bg-soft)',
                                                color: s.rank <= 3 ? '#000' : 'var(--text-muted)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '16px',
                                                boxShadow: s.rank <= 3 ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                                            }}>
                                                {s.rank}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <h5 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>{s.name}</h5>
                                                <div style={{ display: 'flex', gap: '10px', marginTop: '2px' }}>
                                                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>Roll {s.roll}</span>
                                                    <span style={{ fontSize: '10px', color: 'var(--primary-bold)', fontWeight: '800' }}>{s.grandTotal} / {s.maxGrandTotal}</span>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{ fontSize: '14px', fontWeight: '900', color: 'var(--text-main)' }}>{s.maxGrandTotal > 0 ? ((s.grandTotal / s.maxGrandTotal) * 100).toFixed(1) : 0}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        })()}

                    </motion.div>
                ) : (
                    <motion.div key="marks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        <div style={{ background: 'var(--bg-card)', borderRadius: '24px', padding: '24px', border: '1px solid var(--border-soft)', textAlign: 'center' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)', margin: '0 auto 16px' }}>
                                <FileText size={28} />
                            </div>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900' }}>Marks Ledger</h3>
                            <p style={{ margin: '6px 0 20px 0', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>Full class performance overview for {selectedYear}.</p>
                            
                            <button 
                                onClick={() => handleDownloadAllRankings(marksLedger)}
                                disabled={Object.keys(marksLedger).length === 0}
                                style={{ width: '100%', padding: '14px', borderRadius: '14px', background: 'var(--primary-bold)', color: '#fff', border: 'none', fontWeight: '800', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                            >
                                <Download size={18} /> Download All Classes Marks PDF
                            </button>
                        </div>

                        {(() => {
                            const selectedClassName = classes.find(c => c.id === selectedClassId)?.name;
                            const classMarksData = marksLedger[selectedClassName || ''];
                            
                            if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 className="animate-spin" size={32} color="var(--primary-bold)" /></div>;
                            
                            if (!classMarksData) return (
                                <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border-soft)' }}>
                                    <Search size={32} style={{ opacity: 0.1, marginBottom: '12px' }} />
                                    <p style={{ margin: 0, fontWeight: '700', fontSize: '13px', color: 'var(--text-muted)' }}>No data for Class {selectedClassName}</p>
                                </div>
                            );

                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <h4 style={{ margin: '0 0 4px 4px', fontSize: '15px', fontWeight: '900' }}>Class {selectedClassName} Detailed Ledger</h4>
                                    {classMarksData.map((s: any) => (
                                        <div key={s.studentDbId} style={{ background: 'var(--bg-card)', borderRadius: '20px', padding: '16px', border: '1px solid var(--border-soft)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                <div>
                                                    <h5 style={{ margin: 0, fontSize: '14px', fontWeight: '900' }}>{s.name.toUpperCase()}</h5>
                                                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>ADM: {s.admissionId} • ROLL: {s.roll}</span>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <span style={{ fontSize: '14px', fontWeight: '900', color: 'var(--primary-bold)' }}>{s.grandTotal}</span>
                                                    <span style={{ fontSize: '9px', display: 'block', opacity: 0.5 }}>TOTAL</span>
                                                </div>
                                            </div>
                                            
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                                <div style={{ background: 'var(--bg-soft)', padding: '8px', borderRadius: '10px', textAlign: 'center' }}>
                                                    <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', display: 'block' }}>UNIT-I</span>
                                                    <span style={{ fontSize: '13px', fontWeight: '900' }}>{s.unit1Total ?? '--'}</span>
                                                </div>
                                                <div style={{ background: 'var(--bg-soft)', padding: '8px', borderRadius: '10px', textAlign: 'center' }}>
                                                    <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', display: 'block' }}>UNIT-II</span>
                                                    <span style={{ fontSize: '13px', fontWeight: '900' }}>{s.unit2Total ?? '--'}</span>
                                                </div>
                                                <div style={{ background: 'var(--bg-soft)', padding: '8px', borderRadius: '10px', textAlign: 'center' }}>
                                                    <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-muted)', display: 'block' }}>UNIT-III</span>
                                                    <span style={{ fontSize: '13px', fontWeight: '900' }}>{s.unit3Total ?? '--'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        })()}

                    </motion.div>
                )}
            </AnimatePresence>

            {/* Manual Entry Modal */}
            <Modal isOpen={showManualEntry} onClose={() => setShowManualEntry(false)} title="Record Spot Result">
                <form onSubmit={handleCreateResult} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>Student *</label>
                        <select 
                            style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none', appearance: 'none', fontWeight: '700' }}
                            value={newResult.studentId}
                            onChange={e => setNewResult({ ...newResult, studentId: e.target.value })}
                            required
                        >
                            <option value="">Select Student...</option>
                            {students.filter(s => s.classId === selectedClassId).map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.rollNumber})</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>Subject *</label>
                        <select 
                            style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none', appearance: 'none', fontWeight: '700' }}
                            value={newResult.subject}
                            onChange={e => setNewResult({ ...newResult, subject: e.target.value })}
                            required
                        >
                            <option value="">Select Subject...</option>
                            {(classes.find(c => c.id === selectedClassId)?.subjects || []).map((sub: any) => (
                                <option key={sub.name} value={sub.name}>{sub.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>Obtained *</label>
                            <input 
                                type="number" 
                                placeholder="Score" 
                                style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none', fontWeight: '700' }}
                                value={newResult.marks}
                                onChange={e => setNewResult({ ...newResult, marks: e.target.value })}
                                required
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>Max Marks *</label>
                            <input 
                                type="number" 
                                style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none', fontWeight: '700' }}
                                value={newResult.totalMarks}
                                onChange={e => setNewResult({ ...newResult, totalMarks: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" style={{ padding: '16px', borderRadius: '14px', background: 'var(--primary-bold)', color: '#fff', border: 'none', fontWeight: '800', fontSize: '15px' }}>
                        Record Mark
                    </button>
                </form>
            </Modal>

            {/* Details Modal */}
            <Modal 
                isOpen={!!selectedStudentResults} 
                onClose={() => setSelectedStudentResults(null)} 
                title={selectedStudentResults ? `${selectedStudentResults.student.name}'s History` : 'Details'}
            >
                {selectedStudentResults && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ background: 'var(--bg-soft)', padding: '16px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Aggregate Score</span>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                    <span style={{ fontSize: '24px', fontWeight: '900', color: 'var(--primary-bold)' }}>{selectedStudentResults.totalObtained}</span>
                                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>/ {selectedStudentResults.totalPossible}</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleDownloadFullReport(selectedStudentResults.student.id, selectedStudentResults.student.name)}
                                style={{ padding: '8px 16px', borderRadius: '10px', background: 'var(--primary-bold)', color: '#fff', border: 'none', fontWeight: '800', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                <Download size={14} /> Full Report
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-main)', paddingLeft: '4px' }}>Subject-wise Breakdown</span>
                            {selectedStudentResults.marks.map((m: any) => (
                                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-soft)', borderRadius: '14px' }}>
                                    <div>
                                        <h6 style={{ margin: 0, fontSize: '13px', fontWeight: '800' }}>{m.subject}</h6>
                                        <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>Unit Marks: {m.marks} / {m.totalMarks}</p>
                                    </div>
                                    <button onClick={() => handleDeleteRecord(m.id)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fee2e2', color: '#ef4444', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </Modal>

            <ConfirmModal 
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                variant={confirmModal.variant}
            />

        </motion.div>
    );
}

