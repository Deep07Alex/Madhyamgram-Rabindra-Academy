/**
 * ManageFees — Admin Fees Management Module
 *
 * Two tabs:
 * 1. Monthly Fee  — Record monthly fee payment per student
 * 2. Admission Fee — Record one-time admission fee with due tracking
 *
 * Both tabs support auto-filling student details by Admission ID lookup.
 */
import { useState, useCallback, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
    Banknote, Search, CheckCircle2, AlertCircle, Loader2,
    ReceiptText, ClipboardList, Calendar, RefreshCw, Trash2
} from 'lucide-react';

// Responsive CSS for Fees Module
const RESPONSIVE_CSS = `
    .manage-fees-container {
        padding: 40px;
    }
    .fees-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)) !important;
    }
    @media (max-width: 768px) {
        .manage-fees-container {
            padding: 16px !important;
        }
        .fees-header {
            flex-direction: column !important;
            align-items: flex-start !important;
        }
        .fees-tabs {
            width: 100% !important;
            justify-content: center !important;
        }
        .fees-tabs button {
            flex: 1 !important;
            padding: 10px 12px !important;
            font-size: 0.8rem !important;
        }
        .selector-container {
            padding: 16px !important;
            gap: 16px !important;
        }
        .selector-item {
            min-width: 100% !important;
        }
        .fee-card {
            padding: 20px !important;
        }
        .total-amount-display {
            width: 100% !important;
        }
        .submit-btn-row {
            flex-direction: column !important;
            align-items: stretch !important;
        }
        .submit-btn-row button {
            width: 100% !important;
        }
        .fees-filter-row {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
        }
        .fees-filter-row .form-group {
            width: 100% !important;
            min-width: 100% !important;
        }
        .fees-filter-row button {
            width: 100% !important;
        }
        .recent-filter-row {
            width: 100% !important;
            display: grid !important;
            grid-template-columns: 1fr 1fr auto !important;
        }
        .recent-filter-row select {
            width: 100% !important;
        }
        .fees-header button {
            width: 100% !important;
            margin-top: 8px !important;
        }
    }
`;

import { ACADEMIC_YEARS } from '../../utils/constants';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

const CURRENT_YEAR = new Date().getFullYear();

// ─── Shared student selection widget ─────────────────────────────────────────────
const StudentSelector = ({ onFound, resetTrigger }: { onFound: (s: any) => void, resetTrigger?: any }) => {
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [students, setStudents] = useState<any[]>([]);
    const [rollNumber, setRollNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const res = await api.get('/users/classes');
                setClasses(res.data);
            } catch {
                setError('Failed to load classes.');
            }
        };
        fetchClasses();
    }, []);

    // Clear input when resetTrigger changes
    useEffect(() => {
        setRollNumber('');
    }, [resetTrigger]);

    // Load students when class changes
    useEffect(() => {
        const fetchStudents = async () => {
            if (!selectedClassId) {
                setStudents([]);
                return;
            }
            setLoading(true);
            try {
                const res = await api.get('/fees/search', { params: { classId: selectedClassId } });
                setStudents(res.data);
                setRollNumber('');
            } catch {
                setError('Failed to load students.');
            } finally {
                setLoading(false);
            }
        };
        fetchStudents();
    }, [selectedClassId]);

    // Live fetching when roll number is entered
    useEffect(() => {
        const fetchByRoll = async () => {
            // If roll number is cleared, immediately clear parent state
            if (!rollNumber) {
                onFound(null);
                setError('');
                return;
            }

            if (!selectedClassId || students.length === 0) return;
            
            // Search locally first to avoid unnecessary API calls
            const match = students.find(s => s.rollNumber.toString() === rollNumber);
            if (match) {
                setLoading(true);
                setError('');
                try {
                    const res = await api.get(`/fees/lookup/${match.studentId}`);
                    onFound(res.data);
                } catch {
                    setError('Student record not found.');
                } finally {
                    setLoading(false);
                }
            } else {
                // If no match is found, we should probably clear the parent record too
                onFound(null);
                if (rollNumber.length >= 1) setError('No student found with this roll in the selected class.');
            }
        };

        const timer = setTimeout(fetchByRoll, 300); // Small debounce
        return () => clearTimeout(timer);
    }, [rollNumber, selectedClassId, students, onFound]);

    return (
        <div className="selector-container" style={{ padding: '24px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--border-soft)', display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-end', boxShadow: 'var(--shadow-premium)', marginBottom: '16px' }}>
            <div className="form-group selector-item" style={{ flex: '1.2', minWidth: '240px', margin: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary-bold)', letterSpacing: '0.05em' }}>1. Filter by Class</label>
                <select 
                    value={selectedClassId} 
                    onChange={e => setSelectedClassId(e.target.value)}
                    style={{ width: '100%', height: '52px', marginTop: '10px', fontSize: '1.1rem', fontWeight: 700 }}
                >
                    <option value="">-- Choose Class --</option>
                    {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            <div className="form-group selector-item" style={{ flex: '1', minWidth: '180px', margin: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary-bold)', letterSpacing: '0.05em' }}>2. Enter Roll No</label>
                <div style={{ position: 'relative', marginTop: '10px' }}>
                    <input 
                        type="number" 
                        placeholder="e.g. 15"
                        value={rollNumber}
                        onChange={e => setRollNumber(e.target.value)}
                        disabled={!selectedClassId}
                        autoComplete="off"
                        style={{ width: '100%', height: '52px', fontSize: '1.2rem', fontWeight: 900, paddingLeft: '48px', border: '2px solid var(--primary-bold)' }}
                    />
                    <Search size={22} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary-bold)' }} />
                    {loading && <Loader2 className="animate-spin" size={20} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary-bold)' }} />}
                </div>
            </div>

            <div style={{ flex: '0.5', minWidth: '150px' }} className="selector-item">
                {rollNumber && students.find(s => s.rollNumber.toString() === rollNumber) && (
                    <div style={{ padding: '8px 16px', background: 'var(--primary-soft)', borderRadius: '12px', border: '1px solid var(--primary-bold)', display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeIn 0.3s ease-out' }}>
                        <CheckCircle2 size={16} color="var(--primary-bold)" />
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-bold)' }}>{students.find(s => s.rollNumber.toString() === rollNumber).name}</span>
                    </div>
                )}
            </div>

            {error && <p style={{ color: 'var(--error)', fontSize: '0.875rem', fontWeight: 700, width: '100%', marginTop: '12px' }}>{error}</p>}
        </div>
    );
};

// ─── Student info card (auto-filled) ──────────────────────────────────────────
const StudentCard = ({ student }: { student: any }) => (
    <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '16px', padding: '16px', background: 'var(--primary-soft)',
        borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-bold)',
        marginTop: '16px'
    }}>
        {[
            { label: 'Admission No', value: student.studentId },
            { label: 'Name', value: student.name },
            { label: 'Class', value: student.className },
            { label: 'Roll', value: student.rollNumber },
        ].map(f => (
            <div key={f.label}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary-bold)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>{f.value || '—'}</div>
            </div>
        ))}
    </div>
);

// ─── Tab: Monthly Fee ─────────────────────────────────────────────────────────
const MonthlyFeeTab = () => {
    const [student, setStudent] = useState<any>(null);
    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        month: MONTHS[new Date().getMonth()],
        academicYear: CURRENT_YEAR,
        fee: '', fine: '', others: ''
    });
    // Separate filter state to avoid accidental recording for wrong month/year
    const [viewFilter, setViewFilter] = useState({
        month: MONTHS[new Date().getMonth()],
        academicYear: CURRENT_YEAR
    });
    const [recent, setRecent] = useState<any[]>([]);
    const [dueList, setDueList] = useState<any[]>([]);
    const [dueClassId, setDueClassId] = useState('');
    const [dueMonth, setDueMonth] = useState(MONTHS[new Date().getMonth()]);
    const [dueYear, setDueYear] = useState(CURRENT_YEAR);
    const [classes, setClasses] = useState<any[]>([]);
    const [showDues, setShowDues] = useState(false);
    const [resetCounter, setResetCounter] = useState(0);
    const { showToast } = useToast();

    // Load classes on mount (for dues filter)
    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const res = await api.get('/users/classes');
                setClasses(res.data);
            } catch { 
                showToast('Failed to load classes', 'error');
            }
        };
        fetchClasses();
    }, []);

    const [loading, setLoading] = useState(false);


    const total = (parseFloat(form.fee) || 0) + (parseFloat(form.fine) || 0) + (parseFloat(form.others) || 0);

    const fetchRecent = useCallback(async () => {
        try {
            const res = await api.get('/fees/monthly', { params: { month: viewFilter.month, academicYear: viewFilter.academicYear, limit: '50' } });
            setRecent(res.data.fees || []);
        } catch { 
            showToast('Failed to load recent payments', 'error');
        }
    }, [viewFilter.month, viewFilter.academicYear]);

    // Auto-fetch on mount and when month/year changes
    useEffect(() => {
        fetchRecent();
    }, [fetchRecent]);

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this fee record?')) return;
        try {
            await api.delete(`/fees/monthly/${id}`);
            showToast('Fee record deleted', 'success');
            fetchRecent();
        } catch {
            showToast('Failed to delete fee record', 'error');
        }
    };

    const handleSubmit = async () => {
        if (!student) return showToast('Please find a student first', 'error');
        if (!form.fee) return showToast('Fee amount is required', 'error');
        setLoading(true);
        try {
            await api.post('/fees/monthly', {
                studentId: student.studentId,
                ...form
            });
            showToast('Monthly fee recorded successfully!', 'success');
            setStudent(null);
            setForm(f => ({ ...f, fee: '', fine: '', others: '' }));
            setResetCounter(c => c + 1); // Trigger roll number clear
            fetchRecent();
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'Failed to record fee', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchDues = async () => {
        if (!dueClassId) return showToast('Please select a class to load dues', 'error');
        try {
            const res = await api.get('/fees/monthly/dues', { params: { month: dueMonth, academicYear: dueYear, classId: dueClassId } });
            setDueList(res.data.dues || []);
            setShowDues(true);
        } catch { showToast('Failed to load due report', 'error'); }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Entry Form */}
            <div className="card fee-card" style={{ margin: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                    <ReceiptText size={22} color="var(--primary-bold)" />
                    <h3 style={{ margin: 0 }}>Monthly Fee Entry</h3>
                </div>

                <StudentSelector onFound={setStudent} resetTrigger={resetCounter} />
                {student && <StudentCard student={student} />}

                <div className="fees-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginTop: '24px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label>Date</label>
                        <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label>Month</label>
                        <select value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label>Academic Year</label>
                        <select
                            value={form.academicYear}
                            onChange={e => setForm(f => ({ ...f, academicYear: parseInt(e.target.value) }))}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                        >
                            {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label>Fee (₹)</label>
                        <input type="number" min="0" placeholder="0" value={form.fee}
                            onChange={e => setForm(f => ({ ...f, fee: e.target.value }))} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label>Fine (₹)</label>
                        <input type="number" min="0" placeholder="0" value={form.fine}
                            onChange={e => setForm(f => ({ ...f, fine: e.target.value }))} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label>Others (₹)</label>
                        <input type="number" min="0" placeholder="0" value={form.others}
                            onChange={e => setForm(f => ({ ...f, others: e.target.value }))} />
                    </div>
                </div>

                {/* Total + Submit */}
                <div className="submit-btn-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px', flexWrap: 'wrap', gap: '12px' }}>
                    <div className="total-amount-display" style={{ padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'var(--primary-soft)', border: '2px solid var(--primary-bold)' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-bold)', display: 'block' }}>TOTAL AMOUNT</span>
                        <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary-bold)' }}>₹ {total.toFixed(2)}</span>
                    </div>
                    <button onClick={handleSubmit} disabled={loading} className="btn-primary"
                        style={{ padding: '14px 32px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem' }}>
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                        Record Payment
                    </button>
                </div>
            </div>

            {/* Dues Report Section */}
            <div className="card fee-card" style={{ margin: 0 }}>
                <div className="fees-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <AlertCircle size={20} color="var(--primary-bold)" />
                        <h3 style={{ margin: 0 }}>Monthly Due Report — {dueMonth} {dueYear}</h3>
                    </div>
                </div>

                <div className="fees-filter-row" style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', marginBottom: '32px', padding: '20px', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-soft)', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: '150px', margin: 0 }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Filter by Month</label>
                        <select 
                            value={dueMonth} 
                            onChange={e => setDueMonth(e.target.value)}
                            style={{ width: '100%', height: '44px', marginTop: '6px' }}
                        >
                            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>

                    <div className="form-group" style={{ flex: 0.5, minWidth: '100px', margin: 0 }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Year</label>
                        <select 
                            value={dueYear} 
                            onChange={e => setDueYear(parseInt(e.target.value))}
                            style={{ width: '100%', height: '44px', marginTop: '6px' }}
                        >
                            {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>

                    <div className="form-group" style={{ flex: 1.5, minWidth: '200px', margin: 0 }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Filter by Class</label>
                        <select 
                            value={dueClassId} 
                            onChange={e => setDueClassId(e.target.value)}
                            style={{ width: '100%', height: '44px', marginTop: '6px' }}
                        >
                            <option value="">-- Choose Class --</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <button onClick={fetchDues} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 24px', height: '44px' }}>
                        <RefreshCw size={16} /> Load Dues
                    </button>
                </div>

                {showDues && (
                    dueList.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            <CheckCircle2 size={40} color="#22c55e" style={{ marginBottom: '12px' }} />
                            <p style={{ fontWeight: 700 }}>All students have paid for {dueMonth}!</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left' }}>Admission No</th>
                                        <th style={{ textAlign: 'left' }}>Name</th>
                                        <th>Class</th>
                                        <th>Roll</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dueList.map((s: any) => (
                                        <tr key={s.id}>
                                            <td style={{ fontWeight: 700 }}>{s.admissionNo}</td>
                                            <td>{s.name}</td>
                                            <td style={{ textAlign: 'center' }}>{s.className}</td>
                                            <td style={{ textAlign: 'center' }}>{s.rollNumber}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </div>

            {/* Recent Payments Section */}
            <div className="card fee-card" style={{ margin: 0 }}>
                <div className="fees-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ClipboardList size={20} color="var(--primary-bold)" />
                        <h3 style={{ margin: 0 }}>Recent Payments — {viewFilter.month} {viewFilter.academicYear}</h3>
                    </div>
                    
                    <div className="recent-filter-row" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <select 
                            value={viewFilter.month} 
                            onChange={e => setViewFilter(f => ({ ...f, month: e.target.value }))}
                            style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid var(--border-soft)', background: 'var(--bg-card)', fontWeight: 700, cursor: 'pointer' }}
                        >
                            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select 
                            value={viewFilter.academicYear} 
                            onChange={e => setViewFilter(f => ({ ...f, academicYear: parseInt(e.target.value) }))}
                            style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid var(--border-soft)', background: 'var(--bg-card)', fontWeight: 700, cursor: 'pointer' }}
                        >
                            {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR+1].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <button onClick={fetchRecent} className="btn-secondary" style={{ height: '38px', width: '38px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Reload latest">
                            <RefreshCw size={16} />
                        </button>
                    </div>
                </div>
                {recent.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px' }}>No payments found for the selected period.</p>
                ) : (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left' }}>Date</th>
                                    <th style={{ textAlign: 'left' }}>Student</th>
                                    <th>Class</th>
                                    <th>Roll</th>
                                    <th>Month</th>
                                    <th>Fee</th>
                                    <th>Fine</th>
                                    <th>Others</th>
                                    <th>Total</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recent.map((r: any) => (
                                    <tr key={r.id}>
                                        <td>{new Date(r.date).toLocaleDateString('en-IN')}</td>
                                        <td style={{ fontWeight: 700 }}>{r.studentName}</td>
                                        <td style={{ textAlign: 'center' }}>{r.className}</td>
                                        <td style={{ textAlign: 'center' }}>{r.rollNumber}</td>
                                        <td style={{ textAlign: 'center' }}>{r.month}</td>
                                        <td style={{ textAlign: 'center' }}>₹{r.fee}</td>
                                        <td style={{ textAlign: 'center' }}>₹{r.fine}</td>
                                        <td style={{ textAlign: 'center' }}>₹{r.others}</td>
                                        <td style={{ textAlign: 'center', fontWeight: 900, color: 'var(--primary-bold)' }}>₹{r.total}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button 
                                                onClick={() => handleDelete(r.id)}
                                                style={{ padding: '4px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                                title="Delete record"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Tab: Admission Fee ───────────────────────────────────────────────────────
const AdmissionFeeTab = () => {
    const [student, setStudent] = useState<any>(null);
    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        totalAdmissionFee: '',
        amountPaid: ''
    });
    const [resetCounter, setResetCounter] = useState(0);
    const [loading, setLoading] = useState(false);
    const [records, setRecords] = useState<any[]>([]);
    const [dueList, setDueList] = useState<any[]>([]);
    const [showDues, setShowDues] = useState(false);
    const { showToast } = useToast();

    const due = (parseFloat(form.totalAdmissionFee) || 0) - (parseFloat(form.amountPaid) || 0);

    const fetchRecords = useCallback(async () => {
        try {
            const res = await api.get('/fees/admission');
            setRecords(res.data.fees || []);
        } catch { 
            showToast('Failed to load admission records', 'error');
        }
    }, []);

    // Auto-fetch on mount
    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this admission record?')) return;
        try {
            await api.delete(`/fees/admission/${id}`);
            showToast('Admission fee record deleted', 'success');
            fetchRecords();
        } catch {
            showToast('Failed to delete admission fee record', 'error');
        }
    };

    const handleSubmit = async () => {
        if (!student) return showToast('Please find a student first', 'error');
        if (!form.totalAdmissionFee) return showToast('Total admission fee is required', 'error');
        setLoading(true);
        try {
            await api.post('/fees/admission', {
                studentId: student.studentId,
                ...form
            });
            showToast('Admission fee recorded!', 'success');
            setStudent(null);
            setForm(f => ({ ...f, totalAdmissionFee: '', amountPaid: '' }));
            setResetCounter(c => c + 1); // Trigger roll number clear
            fetchRecords();
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'Failed to record admission fee', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchDues = async () => {
        try {
            const res = await api.get('/fees/admission/dues');
            setDueList(res.data.dues || []);
            setShowDues(true);
        } catch { showToast('Failed to load due report', 'error'); }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Entry Form */}
            <div className="card fee-card" style={{ margin: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                    <Banknote size={22} color="var(--primary-bold)" />
                    <h3 style={{ margin: 0 }}>Admission Fee Entry</h3>
                </div>

                <StudentSelector onFound={setStudent} resetTrigger={resetCounter} />
                {student && <StudentCard student={student} />}

                <div className="fees-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '24px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label>Date</label>
                        <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label>Total Admission Fee (₹)</label>
                        <input type="number" min="0" placeholder="0" value={form.totalAdmissionFee}
                            onChange={e => setForm(f => ({ ...f, totalAdmissionFee: e.target.value }))} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label>Amount Paid (₹)</label>
                        <input type="number" min="0" placeholder="0" value={form.amountPaid}
                            onChange={e => setForm(f => ({ ...f, amountPaid: e.target.value }))} />
                    </div>
                </div>

                {/* Due preview + Submit */}
                <div className="submit-btn-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }} className="total-amount-display">
                        <div style={{ padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'var(--primary-soft)', border: '2px solid var(--primary-bold)', flex: 1 }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-bold)', display: 'block' }}>AMOUNT PAID</span>
                            <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary-bold)' }}>₹ {(parseFloat(form.amountPaid) || 0).toFixed(2)}</span>
                        </div>
                        <div style={{ padding: '14px 24px', borderRadius: 'var(--radius-md)', background: due > 0 ? '#ef444415' : '#22c55e15', border: `2px solid ${due > 0 ? '#ef4444' : '#22c55e'}`, flex: 1 }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: due > 0 ? '#ef4444' : '#22c55e', display: 'block' }}>DUE AMOUNT</span>
                            <span style={{ fontSize: '1.8rem', fontWeight: 900, color: due > 0 ? '#ef4444' : '#22c55e' }}>₹ {Math.max(due, 0).toFixed(2)}</span>
                        </div>
                    </div>
                    <button onClick={handleSubmit} disabled={loading} className="btn-primary"
                        style={{ padding: '14px 32px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem' }}>
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                        Record Payment
                    </button>
                </div>
            </div>

            {/* Dues Report */}
            <div className="card fee-card" style={{ margin: 0 }}>
                <div className="fees-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <AlertCircle size={20} color="#ef4444" />
                        <h3 style={{ margin: 0 }}>Admission Fee Due Report</h3>
                    </div>
                    <button onClick={fetchDues} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}>
                        <RefreshCw size={16} /> Load Dues
                    </button>
                </div>

                {showDues && (
                    dueList.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            <CheckCircle2 size={40} color="#22c55e" style={{ marginBottom: '12px' }} />
                            <p style={{ fontWeight: 700 }}>No outstanding admission fee dues!</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left' }}>Admission No</th>
                                        <th style={{ textAlign: 'left' }}>Name</th>
                                        <th>Class</th>
                                        <th>Roll</th>
                                        <th>Total Fee</th>
                                        <th>Paid</th>
                                        <th>Due</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dueList.map((s: any) => (
                                        <tr key={s.admissionNo}>
                                            <td style={{ fontWeight: 700 }}>{s.admissionNo}</td>
                                            <td>{s.name}</td>
                                            <td style={{ textAlign: 'center' }}>{s.className}</td>
                                            <td style={{ textAlign: 'center' }}>{s.rollNumber}</td>
                                            <td style={{ textAlign: 'center' }}>₹{parseFloat(s.totalFee).toFixed(2)}</td>
                                            <td style={{ textAlign: 'center', color: '#22c55e', fontWeight: 700 }}>₹{parseFloat(s.totalPaid).toFixed(2)}</td>
                                            <td style={{ textAlign: 'center', color: '#ef4444', fontWeight: 900 }}>₹{parseFloat(s.totalDue).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </div>

            {/* All Records */}
            <div className="card fee-card" style={{ margin: 0 }}>
                <div className="fees-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ClipboardList size={20} color="var(--primary-bold)" />
                        <h3 style={{ margin: 0 }}>All Admission Fee Records</h3>
                    </div>
                    <button onClick={fetchRecords} className="btn-secondary" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RefreshCw size={16} /> Refresh
                    </button>
                </div>
                {records.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>No records yet. Click Refresh to load.</p>
                ) : (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left' }}>Date</th>
                                    <th style={{ textAlign: 'left' }}>Name</th>
                                    <th>Class</th>
                                    <th>Total Fee</th>
                                    <th>Paid</th>
                                    <th>Due</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((r: any) => (
                                    <tr key={r.id}>
                                        <td>{new Date(r.date).toLocaleDateString('en-IN')}</td>
                                        <td style={{ fontWeight: 700 }}>{r.studentName} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({r.admissionNo})</span></td>
                                        <td style={{ textAlign: 'center' }}>{r.className}</td>
                                        <td style={{ textAlign: 'center' }}>₹{parseFloat(r.totalAdmissionFee).toFixed(2)}</td>
                                        <td style={{ textAlign: 'center', color: '#22c55e', fontWeight: 700 }}>₹{parseFloat(r.amountPaid).toFixed(2)}</td>
                                        <td style={{ textAlign: 'center', color: parseFloat(r.due) > 0 ? '#ef4444' : '#22c55e', fontWeight: 900 }}>₹{parseFloat(r.due).toFixed(2)}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button 
                                                onClick={() => handleDelete(r.id)}
                                                style={{ padding: '4px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                                title="Delete record"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ManageFees = () => {
    const [tab, setTab] = useState<'monthly' | 'admission'>('monthly');

    const tabStyle = (active: boolean): React.CSSProperties => ({
        padding: '10px 28px',
        borderRadius: '30px',
        border: 'none',
        cursor: 'pointer',
        fontWeight: 800,
        fontSize: '0.9rem',
        transition: 'all 0.2s',
        background: active ? 'var(--primary-bold)' : 'var(--bg-card)',
        color: active ? 'white' : 'var(--text-muted)',
        boxShadow: active ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'
    });

    return (
        <div className="manage-fees-container" style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <style>{RESPONSIVE_CSS}</style>
            <header className="fees-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Banknote color="var(--primary-bold)" /> Student Fees
                    </h2>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontWeight: 500 }}>Record and track monthly and admission fee payments</p>
                </div>
                <div className="fees-tabs" style={{ display: 'flex', gap: '8px', padding: '6px', background: 'var(--bg-main)', borderRadius: '40px', border: '1px solid var(--border-soft)', flexWrap: 'wrap' }}>
                    <button style={tabStyle(tab === 'monthly')} onClick={() => setTab('monthly')}>
                        <Calendar size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                        Monthly Fee
                    </button>
                    <button style={tabStyle(tab === 'admission')} onClick={() => setTab('admission')}>
                        <ReceiptText size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                        Admission Fee
                    </button>
                </div>
            </header>

            {tab === 'monthly' ? <MonthlyFeeTab /> : <AdmissionFeeTab />}
        </div>
    );
};

export default ManageFees;
