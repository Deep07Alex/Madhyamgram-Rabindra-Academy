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
import { MAIN_SUBJECTS, EXAMINATION_TERMS, ACADEMIC_YEARS } from '../../utils/constants';
import { FilePlus, List, Trash2, Download, Upload, FileSpreadsheet, Loader2, Search } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import * as XLSX from 'xlsx';

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

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [resRes, stuRes, classRes] = await Promise.all([
                api.get(`/results?academicYear=${selectedYear}&semester=${selectedTerm}`),
                api.get('/users/students'),
                api.get('/users/classes')
            ]);
            setResults(resRes.data);
            setStudents(stuRes.data);
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
    }, [selectedYear, selectedTerm]);

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
        if (!window.confirm('Are you sure you want to delete this record?')) return;
        try {
            await api.delete(`/results/${id}`);
            showToast('Result deleted', 'info');
            fetchData();
        } catch (error) {
            showToast('Failed to delete', 'error');
        }
    };

    const downloadTemplate = () => {
        const selectedClass = classes.find((c: any) => c.id === selectedClassId);
        if (!selectedClass) return showToast('Please select a class first', 'error');

        const classStudents = students.filter((s: any) => s.classId === selectedClassId);
        if (classStudents.length === 0) return showToast('No students found in this class', 'error');

        // Prepare Header rows (One row for subjects)
        const headers = ['Admission No', 'Roll', 'Name', ...MAIN_SUBJECTS];
        const data = classStudents.map(s => [s.studentId, s.rollNumber, s.name, ...MAIN_SUBJECTS.map(() => '')]);

        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
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
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Academic Year</label>
                    <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} style={{ width: '100%' }}>
                        {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <div className="card" style={{ margin: 0, padding: '20px 24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Examination Term</label>
                    <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)} style={{ width: '100%' }}>
                        {EXAMINATION_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div className="card" style={{ margin: 0, padding: '20px 24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Target Class</label>
                    <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} style={{ width: '100%' }}>
                        {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
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
                        onMouseOver={(e) => {
                            e.currentTarget.style.borderColor = 'var(--primary-bold)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 10px 30px -10px rgba(var(--primary-rgb), 0.2)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-soft)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
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
                        <div className="form-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Student</label>
                            <select 
                                value={newResult.studentId} 
                                onChange={e => setNewResult({ ...newResult, studentId: e.target.value })} 
                                required
                                style={{ width: '100%' }}
                            >
                                <option value="">Choose Student...</option>
                                {students.filter(s => s.classId === selectedClassId).map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.name} ({s.rollNumber})</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Subject</label>
                            <select 
                                value={newResult.subject} 
                                onChange={e => setNewResult({ ...newResult, subject: e.target.value })} 
                                required
                                style={{ width: '100%' }}
                            >
                                <option value="">Choose Subject...</option>
                                {MAIN_SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                            </select>
                        </div>
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
                    {isLoading && <Loader2 size={18} className="animate-spin" color="var(--primary-bold)" />}
                </div>
                
                <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    <table className="data-table">
                        <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                            <tr>
                                <th>Student Identity</th>
                                <th>Subject Domain</th>
                                <th style={{ textAlign: 'center' }}>Score Profile</th>
                                <th style={{ textAlign: 'center' }}>Final Grade</th>
                                <th style={{ textAlign: 'right' }}>Management</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((r: any) => (
                                <tr key={r.id}>
                                    <td style={{ fontWeight: '700' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span>{r.student?.name}</span>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>ID: {r.student?.studentId} • Roll: {r.student?.rollNumber}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 12px', background: 'var(--bg-main)', border: '1px solid var(--border-soft)', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                                            {r.subject}
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--primary-bold)' }}>{r.marks}</span>
                                            <span style={{ fontSize: '0.7rem', opacity: 0.4, fontWeight: 700 }}>OUT OF {r.totalMarks}</span>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span style={{ 
                                            display: 'inline-flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            padding: '4px 12px', 
                                            background: 'var(--primary-soft)', 
                                            color: 'var(--primary-bold)', 
                                            borderRadius: '6px', 
                                            fontSize: '0.9rem', 
                                            fontWeight: 900,
                                            minWidth: '44px' 
                                        }}>
                                            {r.grade}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button 
                                            onClick={() => handleDeleteResult(r.id)} 
                                            className="btn-danger btn-sm"
                                            style={{ width: '32px', height: '32px', borderRadius: '8px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {results.length === 0 && !isLoading && (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '100px 40px' }}>
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
        </div>
    );
};

export default ManageResults;
