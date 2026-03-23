/**
 * ManageFees — Admin Fees Management Module
 *
 * Two tabs:
 * 1. Monthly Fee  — Record monthly fee payment per student
 * 2. Admission Fee — Record one-time admission fee with due tracking
 *
 * Both tabs support auto-filling student details by Admission ID lookup.
 */
import { useState, useCallback } from 'react';
import api from '../../services/api';
import {
    Banknote, Search, CheckCircle2, AlertCircle, Loader2,
    ReceiptText, ClipboardList, Calendar, RefreshCw
} from 'lucide-react';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

const CURRENT_YEAR = new Date().getFullYear();

// ─── Shared student lookup widget ─────────────────────────────────────────────
const StudentLookup = ({ onFound }: { onFound: (s: any) => void }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = async (val: string) => {
        setQuery(val);
        if (val.trim().length < 2) {
            setResults([]);
            setShowDropdown(false);
            return;
        }
        
        setLoading(true);
        try {
            const res = await api.get(`/fees/search?q=${encodeURIComponent(val)}`);
            setResults(res.data);
            setShowDropdown(true);
            setError('');
        } catch {
            setError('Failed to search');
        } finally {
            setLoading(false);
        }
    };

    const selectStudent = async (studentId: string) => {
        setQuery(studentId);
        setShowDropdown(false);
        setLoading(true);
        setError('');
        try {
            const res = await api.get(`/fees/lookup/${studentId}`);
            onFound(res.data);
        } catch {
            setError('Student not found.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap', position: 'relative' }}>
            <div className="form-group" style={{ flex: '1 1 250px', margin: 0, position: 'relative' }}>
                <label>Find Student (by Name or Admission ID)</label>
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Search student..."
                        value={query}
                        onChange={e => handleSearch(e.target.value)}
                        onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 200)} // delay for click
                        style={{ fontSize: '1rem', paddingLeft: '38px', width: '100%', boxSizing: 'border-box' }}
                    />
                    {loading && <Loader2 size={16} className="animate-spin" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary-bold)' }} />}
                </div>

                {/* Dropdown Results */}
                {showDropdown && results.length > 0 && (
                    <div style={{ 
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                        background: 'var(--bg-main)', border: '1px solid var(--border-color)', 
                        borderRadius: 'var(--radius-md)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
                        maxHeight: '200px', overflowY: 'auto', marginTop: '4px' 
                    }}>
                        {results.map(s => (
                            <div 
                                key={s.id}
                                onClick={() => selectStudent(s.studentId)}
                                style={{ 
                                    padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-soft)',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-soft)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-main)'}
                            >
                                <div>
                                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{s.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Class: {s.className} | Roll: {s.rollNumber}</div>
                                </div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary-bold)', background: 'var(--bg-card)', padding: '2px 8px', borderRadius: '4px' }}>
                                    {s.studentId}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {error && <p style={{ color: 'var(--danger, #ef4444)', margin: '4px 0 0 0', fontSize: '0.85rem' }}>{error}</p>}
            </div>
            
            <button
                onClick={() => selectStudent(query)}
                disabled={loading || !query.trim()}
                className="btn-primary"
                style={{ padding: '0 20px', display: 'flex', alignItems: 'center', gap: '8px', height: '44px', alignSelf: 'flex-end' }}
            >
                Confirm Selection
            </button>
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
    const [recent, setRecent] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [dueList, setDueList] = useState<any[]>([]);
    const [showDues, setShowDues] = useState(false);
    const [toast, setToast] = useState({ msg: '', type: '' });

    const showToast = (msg: string, type: string) => {
        setToast({ msg, type });
        setTimeout(() => setToast({ msg: '', type: '' }), 3500);
    };

    const total = (parseFloat(form.fee) || 0) + (parseFloat(form.fine) || 0) + (parseFloat(form.others) || 0);

    const fetchRecent = useCallback(async () => {
        try {
            const res = await api.get('/fees/monthly', { params: { month: form.month, academicYear: form.academicYear, limit: '20' } });
            setRecent(res.data.fees || []);
        } catch { /* ignore */ }
    }, [form.month, form.academicYear]);

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
            fetchRecent();
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'Failed to record fee', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchDues = async () => {
        try {
            const res = await api.get('/fees/monthly/dues', { params: { month: form.month, academicYear: form.academicYear } });
            setDueList(res.data.dues || []);
            setShowDues(true);
        } catch { showToast('Failed to load due report', 'error'); }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {toast.msg && (
                <div style={{ padding: '12px 20px', borderRadius: 'var(--radius-md)', background: toast.type === 'success' ? '#22c55e20' : '#ef444420', color: toast.type === 'success' ? '#22c55e' : '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    {toast.msg}
                </div>
            )}

            {/* Entry Form */}
            <div className="card" style={{ margin: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                    <ReceiptText size={22} color="var(--primary-bold)" />
                    <h3 style={{ margin: 0 }}>Monthly Fee Entry</h3>
                </div>

                <StudentLookup onFound={setStudent} />
                {student && <StudentCard student={student} />}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginTop: '24px' }}>
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
                        <input type="number" value={form.academicYear}
                            onChange={e => setForm(f => ({ ...f, academicYear: parseInt(e.target.value) }))} />
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ padding: '16px 28px', borderRadius: 'var(--radius-md)', background: 'var(--primary-soft)', border: '2px solid var(--primary-bold)' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-bold)', display: 'block', marginBottom: '4px' }}>TOTAL AMOUNT</span>
                        <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary-bold)' }}>₹ {total.toFixed(2)}</span>
                    </div>
                    <button onClick={handleSubmit} disabled={loading} className="btn-primary"
                        style={{ padding: '14px 32px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem' }}>
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                        Record Payment
                    </button>
                </div>
            </div>

            {/* Due Report */}
            <div className="card" style={{ margin: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <AlertCircle size={20} color="var(--primary-bold)" />
                        <h3 style={{ margin: 0 }}>Monthly Due Report — {form.month} {form.academicYear}</h3>
                    </div>
                    <button onClick={fetchDues} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}>
                        <RefreshCw size={16} /> Load Dues
                    </button>
                </div>

                {showDues && (
                    dueList.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            <CheckCircle2 size={40} color="#22c55e" style={{ marginBottom: '12px' }} />
                            <p style={{ fontWeight: 700 }}>All students have paid for {form.month}!</p>
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

            {/* Recent Payments */}
            <div className="card" style={{ margin: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ClipboardList size={20} color="var(--primary-bold)" />
                        <h3 style={{ margin: 0 }}>Recent Payments</h3>
                    </div>
                    <button onClick={fetchRecent} className="btn-secondary" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RefreshCw size={16} /> Refresh
                    </button>
                </div>
                {recent.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>No payments recorded yet. Click Refresh to load.</p>
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
    const [loading, setLoading] = useState(false);
    const [records, setRecords] = useState<any[]>([]);
    const [dueList, setDueList] = useState<any[]>([]);
    const [showDues, setShowDues] = useState(false);
    const [toast, setToast] = useState({ msg: '', type: '' });

    const showToast = (msg: string, type: string) => {
        setToast({ msg, type });
        setTimeout(() => setToast({ msg: '', type: '' }), 3500);
    };

    const due = (parseFloat(form.totalAdmissionFee) || 0) - (parseFloat(form.amountPaid) || 0);

    const fetchRecords = useCallback(async () => {
        try {
            const res = await api.get('/fees/admission');
            setRecords(res.data.fees || []);
        } catch { /* ignore */ }
    }, []);

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
            {toast.msg && (
                <div style={{ padding: '12px 20px', borderRadius: 'var(--radius-md)', background: toast.type === 'success' ? '#22c55e20' : '#ef444420', color: toast.type === 'success' ? '#22c55e' : '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    {toast.msg}
                </div>
            )}

            {/* Entry Form */}
            <div className="card" style={{ margin: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                    <Banknote size={22} color="var(--primary-bold)" />
                    <h3 style={{ margin: 0 }}>Admission Fee Entry</h3>
                </div>

                <StudentLookup onFound={setStudent} />
                {student && <StudentCard student={student} />}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '24px' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <div style={{ padding: '14px 24px', borderRadius: 'var(--radius-md)', background: 'var(--primary-soft)', border: '2px solid var(--primary-bold)' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-bold)', display: 'block' }}>AMOUNT PAID</span>
                            <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary-bold)' }}>₹ {(parseFloat(form.amountPaid) || 0).toFixed(2)}</span>
                        </div>
                        <div style={{ padding: '14px 24px', borderRadius: 'var(--radius-md)', background: due > 0 ? '#ef444415' : '#22c55e15', border: `2px solid ${due > 0 ? '#ef4444' : '#22c55e'}` }}>
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
            <div className="card" style={{ margin: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
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
            <div className="card" style={{ margin: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
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
        <div className="manage-section">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Banknote color="var(--primary-bold)" /> Student Fees
                    </h2>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontWeight: 500 }}>Record and track monthly and admission fee payments</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', padding: '6px', background: 'var(--bg-main)', borderRadius: '40px', border: '1px solid var(--border-soft)' }}>
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
