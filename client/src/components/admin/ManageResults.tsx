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
import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { MAIN_SUBJECTS, EXAMINATION_TERMS, ACADEMIC_YEARS, SUBJECTS_BY_CLASS, getFullMarks } from '../../utils/constants';
import { FilePlus, List, Trash2, Download, Upload, FileSpreadsheet, Loader2, Search, X, Calendar, GraduationCap, School, FileCheck } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import * as XLSX from 'xlsx';
import CustomSelect from '../common/CustomSelect';
import ConfirmModal from '../common/ConfirmModal';
import { generateResultPDF } from '../../utils/resultUtils';

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
}

const ManageResults = () => {
    const { showToast } = useToast();
    const [results, setResults] = useState<any[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<SchoolClass[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    
    // Form States
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedTerm, setSelectedTerm] = useState('Unit-I');
    const [selectedYear, setSelectedYear] = useState(2025);
    
    const [newResult, setNewResult] = useState({
        studentId: '', semester: 'Unit-I', subject: '', marks: '', totalMarks: '100', academicYear: 2025, grade: ''
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
        onConfirm: () => {},
        type: 'info'
    });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [resRes, stuRes, classRes] = await Promise.all([
                api.get(`/results?academicYear=${selectedYear}&semester=${selectedTerm}`),
                api.get('/users/students?limit=1000'),
                api.get('/users/classes')
            ]);
            setResults(resRes.data);
            setStudents(stuRes.data.students || []);
            setClasses(classRes.data);
            if (classRes.data.length > 0 && !selectedClassId) setSelectedClassId(classRes.data[0].id);
        } catch (error) {
            console.error('Failed to fetch results:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Update newResult totalMarks when term changes
        if (newResult.subject) {
            const className = classes.find(c => c.id === selectedClassId)?.name;
            setNewResult(prev => ({ ...prev, totalMarks: getFullMarks(prev.subject, selectedTerm, className).toString() }));
        }
    }, [selectedYear, selectedTerm, selectedClassId]);

    // Update totalMarks when subject changes in manual entry
    useEffect(() => {
        if (newResult.subject) {
            const className = classes.find(c => c.id === selectedClassId)?.name;
            setNewResult(prev => ({ ...prev, totalMarks: getFullMarks(prev.subject, selectedTerm, className).toString() }));
        }
    }, [newResult.subject, selectedTerm, selectedClassId]);

    const handleCreateResult = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/results', newResult);
            showToast('Result recorded successfully', 'success');
            setNewResult({ ...newResult, subject: '', marks: '', grade: '' });
            fetchData();
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
                    fetchData();
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
        const subjectsList = SUBJECTS_BY_CLASS[selectedClass.name] || MAIN_SUBJECTS;
        const headers = ['Admission No', 'Roll', 'Name', ...subjectsList];
        const fullMarksRow = ['', '', 'Full Marks', ...subjectsList.map(sub => getFullMarks(sub, selectedTerm, selectedClass.name))];
        const data = classStudents.map(s => [s.studentId, s.rollNumber, s.name, ...subjectsList.map(() => '')]);

        const worksheet = XLSX.utils.aoa_to_sheet([headers, fullMarksRow, ...data]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
        
        XLSX.writeFile(workbook, `${selectedClass.name}_${selectedTerm}_Template.xlsx`);
    };

    const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('semester', selectedTerm);
        formData.append('academicYear', selectedYear.toString());
        formData.append('classId', selectedClassId);

        try {
            const res = await api.post('/results/bulk', formData);
            showToast(res.data.message, 'success');
            fetchData();
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
                    fetchData();
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
                    showToast(`Bulk deletion successful for ${selectedClass.name}`, 'success');
                    fetchData();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    showToast('Bulk deletion failed', 'error');
                }
            }
        });
    };

    // Group results by student
    const groupedResults = results.reduce((acc: any, curr: any) => {
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
        acc[sid].totalPossible += parseFloat(curr.totalMarks || 100);
        return acc;
    }, {});

    const studentList = Object.values(groupedResults);

    return (
        <div className="manage-section">
            <header style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '8px' }}>Result Control Center</h2>
                <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Manage academy excellence and examination systems.</p>
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
                <div className="card" style={{ margin: 0, padding: '20px 24px' }}>
                    <CustomSelect 
                        label="Examination Term"
                        value={selectedTerm}
                        onChange={val => setSelectedTerm(val)}
                        options={EXAMINATION_TERMS.map(t => ({ value: t, label: t }))}
                        icon={<GraduationCap size={16} />}
                    />
                </div>
                <div className="card" style={{ margin: 0, padding: '20px 24px' }}>
                    <CustomSelect 
                        label="Target Class"
                        value={selectedClassId}
                        onChange={val => setSelectedClassId(val)}
                        options={classes.map((c: any) => ({ value: c.id, label: c.name }))}
                        icon={<School size={16} />}
                    />
                </div>
            </div>

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
                            options={(SUBJECTS_BY_CLASS[classes.find(c => c.id === selectedClassId)?.name || ''] || MAIN_SUBJECTS).map(sub => ({ value: sub, label: sub }))}
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
                        {studentList.length > 0 && (
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
                            {studentList.map((data: any) => (
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
                            {studentList.length === 0 && !isLoading && (
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
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button 
                                    onClick={async () => {
                                        try {
                                            showToast('Generating consolidated report...', 'info');
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
                                    <FileCheck size={18} /> Download Official PDF
                                </button>
                                <button onClick={() => setIsModalOpen(false)} className="btn-secondary" style={{ padding: '8px 24px' }}>Close View</button>
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
