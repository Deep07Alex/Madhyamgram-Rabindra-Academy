import { useState, useCallback, useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { 
    Banknote, AlertCircle, Loader2,
    Plus, Filter, Info, ArrowLeft, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { ACADEMIC_YEARS } from '../../../utils/constants';
import Modal from '../../../components/common/Modal';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

const CURRENT_YEAR = new Date().getFullYear();

export default function MobileManageFees() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    
    // Tabs: 'monthly' | 'admission'
    const [activeTab, setActiveTab] = useState<'monthly' | 'admission'>('monthly');
    const [isLoading, setIsLoading] = useState(false);
    
    // Global Data
    const [classes, setClasses] = useState<any[]>([]);

    // Monthly Fee State
    const [monthlyFilter, setMonthlyFilter] = useState({
        month: MONTHS[new Date().getMonth()],
        year: CURRENT_YEAR
    });
    const [recentMonthly, setRecentMonthly] = useState<any[]>([]);
    const [monthlyDues, setMonthlyDues] = useState<any[]>([]);
    const [selectedDueClass, setSelectedDueClass] = useState('');
    const [isDueLoading, setIsDueLoading] = useState(false);

    // Admission Fee State
    const [recentAdmission, setRecentAdmission] = useState<any[]>([]);
    const [admissionDues, setAdmissionDues] = useState<any[]>([]);

    // Modals
    const [showMonthlyEntry, setShowMonthlyEntry] = useState(false);
    const [showAdmissionEntry, setShowAdmissionEntry] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Entry Forms
    const [monthlyForm, setMonthlyForm] = useState({
        classId: '',
        rollNumber: '',
        student: null as any,
        date: new Date().toISOString().split('T')[0],
        months: [MONTHS[new Date().getMonth()]],
        academicYear: CURRENT_YEAR,
        fee: '', fine: '', others: ''
    });

    const [admissionForm, setAdmissionForm] = useState({
        classId: '',
        rollNumber: '',
        student: null as any,
        date: new Date().toISOString().split('T')[0],
        totalAdmissionFee: '',
        amountPaid: ''
    });

    const fetchInitialData = useCallback(async () => {
        try {
            const res = await api.get('/users/classes');
            setClasses(res.data);
            if (res.data.length > 0) setSelectedDueClass(res.data[0].id);
        } catch (error) {
            showToast('Failed to fetch classes', 'error');
        }
    }, [showToast]);

    const fetchMonthlyData = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/fees/monthly', { 
                params: { month: monthlyFilter.month, academicYear: monthlyFilter.year, limit: '100' } 
            });
            setRecentMonthly(res.data.fees || []);
        } catch (error) {
            showToast('Failed to fetch monthly fees', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [monthlyFilter, showToast]);

    const fetchAdmissionData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [recordsRes, duesRes] = await Promise.all([
                api.get('/fees/admission', { params: { limit: '100' } }),
                api.get('/fees/admission/dues')
            ]);
            setRecentAdmission(recordsRes.data.fees || []);
            setAdmissionDues(duesRes.data.dues || []);
        } catch (error) {
            showToast('Failed to fetch admission fees', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    const fetchMonthlyDues = async () => {
        if (!selectedDueClass) return;
        setIsDueLoading(true);
        try {
            const res = await api.get('/fees/monthly/dues', { 
                params: { 
                    month: monthlyFilter.month, 
                    academicYear: monthlyFilter.year, 
                    classId: selectedDueClass 
                } 
            });
            setMonthlyDues(res.data.dues || []);
        } catch (error) {
            showToast('Failed to fetch dues', 'error');
        } finally {
            setIsDueLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    // Hardware Back Button Integration: 
    // Fixes the issue where back button closes the whole page/app instead of just the modal.
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        const backListener = App.addListener('backButton', () => {
            if (showMonthlyEntry) {
                setShowMonthlyEntry(false);
            } else if (showAdmissionEntry) {
                setShowAdmissionEntry(false);
            } else if (showFilters) {
                setShowFilters(false);
            } else {
                // If no modals are open, perform standard navigation
                navigate(-1);
            }
        });

        return () => {
            backListener.then(l => l.remove());
        };
    }, [showMonthlyEntry, showAdmissionEntry, showFilters, navigate]);

    useEffect(() => {
        if (activeTab === 'monthly') fetchMonthlyData();
        else fetchAdmissionData();
    }, [activeTab, fetchMonthlyData, fetchAdmissionData]);

    // Student Lookup Logic
    const lookupStudent = async (type: 'monthly' | 'admission', classId: string, roll: string) => {
        if (!classId || !roll) return;
        try {
            const searchRes = await api.get('/fees/search', { params: { classId } });
            const match = searchRes.data.find((s: any) => s.rollNumber.toString() === roll);
            if (match) {
                const res = await api.get(`/fees/lookup/${match.studentId}`);
                if (type === 'monthly') {
                    setMonthlyForm(prev => ({ ...prev, student: res.data, fee: res.data.className ? (classes.find(c => c.name === res.data.className)?.monthlyFee || '') : '' }));
                } else {
                    setAdmissionForm(prev => ({ ...prev, student: res.data, totalAdmissionFee: res.data.totalAdmissionFee || '' }));
                }
            } else {
                if (type === 'monthly') setMonthlyForm(prev => ({ ...prev, student: null }));
                else setAdmissionForm(prev => ({ ...prev, student: null }));
            }
        } catch (error) {
            console.error('Student lookup failed');
        }
    };

    const handleMonthlySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!monthlyForm.student) return showToast('Select a valid student', 'info');
        setIsLoading(true);
        try {
            await api.post('/fees/monthly', {
                studentId: monthlyForm.student.studentId,
                date: monthlyForm.date,
                month: monthlyForm.months.join(', '),
                academicYear: monthlyForm.academicYear,
                fee: monthlyForm.fee,
                fine: monthlyForm.fine || 0,
                others: monthlyForm.others || 0
            });
            showToast('Payment recorded', 'success');
            setShowMonthlyEntry(false);
            setMonthlyForm({ ...monthlyForm, rollNumber: '', student: null, fee: '', fine: '', others: '' });
            fetchMonthlyData();
        } catch (error) {
            showToast('Transaction failed', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdmissionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!admissionForm.student) return showToast('Select a valid student', 'info');
        setIsLoading(true);
        try {
            await api.post('/fees/admission', {
                studentId: admissionForm.student.studentId,
                date: admissionForm.date,
                totalAdmissionFee: admissionForm.totalAdmissionFee,
                amountPaid: admissionForm.amountPaid
            });
            showToast('Admission fee recorded', 'success');
            setShowAdmissionEntry(false);
            setAdmissionForm({ ...admissionForm, rollNumber: '', student: null, amountPaid: '' });
            fetchAdmissionData();
        } catch (error) {
            showToast('Transaction failed', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteRecord = async (type: 'monthly' | 'admission', id: string) => {
        if (!window.confirm('Delete this record permanently?')) return;
        try {
            await api.delete(`/fees/${type}/${id}`);
            showToast('Record deleted', 'info');
            if (type === 'monthly') fetchMonthlyData();
            else fetchAdmissionData();
        } catch (error) {
            showToast('Delete failed', 'error');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '100%', paddingBottom: '30px' }}
        >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div onClick={() => navigate(-1)} style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)' }}>
                    <ArrowLeft size={20} />
                </div>
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>Fee Ledger</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: 0, fontWeight: '500' }}>Track sessions, dues & billing.</p>
                </div>
            </div>

            {/* Segmented Control */}
            <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '4px', borderRadius: '16px', border: '1px solid var(--border-soft)' }}>
                {(['monthly', 'admission'] as const).map(tab => (
                    <div key={tab} 
                        onClick={() => setActiveTab(tab)}
                        style={{ 
                            flex: 1, padding: '10px 0', textAlign: 'center', borderRadius: '12px', 
                            background: activeTab === tab ? 'var(--primary-soft)' : 'transparent', 
                            color: activeTab === tab ? 'var(--primary-bold)' : 'var(--text-muted)', 
                            fontWeight: '800', fontSize: '13px', textTransform: 'capitalize', cursor: 'pointer' 
                        }}
                    >
                        {tab === 'monthly' ? 'Monthly Tuition' : 'Admission Feed'}
                    </div>
                ))}
            </div>

            {/* View Stats / Summary Card */}
            <div style={{ background: 'linear-gradient(135deg, var(--primary-bold) 0%, #1e1e1e 100%)', borderRadius: '24px', padding: '24px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: '-20px', top: '-10px', opacity: 0.1 }}><Banknote size={100} /></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <span style={{ fontSize: '10px', fontWeight: '800', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue Period</span>
                        <h2 style={{ margin: '4px 0 0 0', fontSize: '22px', fontWeight: '900' }}>{activeTab === 'monthly' ? `${monthlyFilter.month} ${monthlyFilter.year}` : 'Admission Session'}</h2>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '10px', fontWeight: '800', opacity: 0.8, textTransform: 'uppercase' }}>Total Records</span>
                        <div style={{ fontSize: '22px', fontWeight: '900' }}>{activeTab === 'monthly' ? recentMonthly.length : recentAdmission.length}</div>
                    </div>
                </div>
                
                <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                    <button 
                        onClick={() => activeTab === 'monthly' ? setShowMonthlyEntry(true) : setShowAdmissionEntry(true)}
                        style={{ flex: 1, height: '48px', borderRadius: '14px', background: '#fff', color: 'var(--primary-bold)', border: 'none', fontWeight: '800', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                        <Plus size={18} /> Record New
                    </button>
                    <button onClick={() => setShowFilters(true)} style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Filter size={20} />
                    </button>
                </div>
            </div>

            {/* Data Feed */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '900', margin: 0 }}>Recent Activity</h3>
                    {isLoading && <Loader2 size={16} className="animate-spin" color="var(--primary-bold)" />}
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'monthly' ? (
                        <motion.div key="monthly-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {recentMonthly.map((r: any) => (
                                <div key={r.id} style={{ background: 'var(--bg-card)', borderRadius: '20px', padding: '16px', border: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800' }}>{r.studentName}</h4>
                                        <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>{r.className} • Roll {r.rollNumber} • {r.month}</p>
                                    </div>
                                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div>
                                            <span style={{ fontSize: '16px', fontWeight: '900', color: 'var(--primary-bold)', display: 'block' }}>₹{r.total}</span>
                                            <span style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)' }}>{new Date(r.date).toLocaleDateString()}</span>
                                        </div>
                                        <button onClick={() => handleDeleteRecord('monthly', r.id)} style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {recentMonthly.length === 0 && !isLoading && <EmptyState text="No payments found for this period." />}
                        </motion.div>
                    ) : (
                        <motion.div key="admission-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {recentAdmission.map((r: any) => (
                                <div key={r.id} style={{ background: 'var(--bg-card)', borderRadius: '20px', padding: '16px', border: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800' }}>{r.name}</h4>
                                        <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>{r.className} • ID {r.studentId}</p>
                                    </div>
                                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div>
                                            <span style={{ fontSize: '16px', fontWeight: '900', color: 'var(--primary-bold)', display: 'block' }}>₹{r.amountPaid}</span>
                                            <span style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)' }}>{new Date(r.date).toLocaleDateString()}</span>
                                        </div>
                                        <button onClick={() => handleDeleteRecord('admission', r.id)} style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {recentAdmission.length === 0 && !isLoading && <EmptyState text="No admission records found." />}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Dues Report Section */}
            <div style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <AlertCircle size={18} color="#ef4444" />
                    <h3 style={{ fontSize: '16px', fontWeight: '900', margin: 0 }}>Outstanding Dues</h3>
                </div>
                
                {activeTab === 'monthly' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px' }}>
                            <select 
                                value={selectedDueClass} 
                                onChange={e => setSelectedDueClass(e.target.value)}
                                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-soft)', background: 'var(--bg-card)', fontWeight: '700', fontSize: '13px' }}
                            >
                                <option value="">Select Class...</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <button onClick={fetchMonthlyDues} style={{ padding: '0 20px', borderRadius: '12px', background: 'var(--primary-bold)', color: '#fff', border: 'none', fontWeight: '800', fontSize: '13px' }}>
                                View
                            </button>
                        </div>
                        
                        <div style={{ minHeight: '100px' }}>
                            {isDueLoading ? <Loader2 className="animate-spin" style={{ margin: '20px auto', display: 'block' }} /> : (
                                monthlyDues.map((s: any) => (
                                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid #ef444420', borderRadius: '14px', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: '800' }}>{s.name} (Roll: {s.rollNumber})</span>
                                        <span style={{ fontSize: '13px', fontWeight: '900', color: '#ef4444' }}>UNPAID</span>
                                    </div>
                                ))
                            )}
                            {monthlyDues.length === 0 && !isDueLoading && selectedDueClass && <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>All caught up for this class!</p>}
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {admissionDues.map((s: any) => (
                            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid #ef444420', borderRadius: '14px' }}>
                                <div>
                                    <span style={{ fontSize: '13px', fontWeight: '800', display: 'block' }}>{s.name}</span>
                                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>Class {s.className}</span>
                                </div>
                                <span style={{ fontSize: '14px', fontWeight: '900', color: '#ef4444' }}>₹{s.due} Due</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Monthly Entry Modal */}
            <Modal isOpen={showMonthlyEntry} onClose={() => setShowMonthlyEntry(false)} title="Monthly Fee Entry">
                <form onSubmit={handleMonthlySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px' }}>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>Class</label>
                            <select 
                                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: '700' }}
                                value={monthlyForm.classId}
                                onChange={e => {
                                    setMonthlyForm({ ...monthlyForm, classId: e.target.value, student: null });
                                    lookupStudent('monthly', e.target.value, monthlyForm.rollNumber);
                                }}
                            >
                                <option value="">Select...</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>Roll No</label>
                            <input 
                                type="number"
                                placeholder="#"
                                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: '800' }}
                                value={monthlyForm.rollNumber}
                                onChange={e => {
                                    setMonthlyForm({ ...monthlyForm, rollNumber: e.target.value });
                                    lookupStudent('monthly', monthlyForm.classId, e.target.value);
                                }}
                            />
                        </div>
                    </div>

                    {monthlyForm.student && (
                        <div style={{ padding: '14px', background: 'var(--primary-soft)', borderRadius: '12px', border: '1px solid var(--primary-bold)' }}>
                            <div style={{ fontSize: '13px', fontWeight: '900', color: 'var(--primary-bold)' }}>{monthlyForm.student.name}</div>
                            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--primary-bold)', opacity: 0.8 }}>ID: {monthlyForm.student.studentId} • Paid till now: ₹{monthlyForm.student.monthlyFeePaidTotal || 0}</div>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>Date</label>
                            <input type="date" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: '700' }} value={monthlyForm.date} onChange={e => setMonthlyForm({...monthlyForm, date: e.target.value})} />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>Academic Year</label>
                            <select style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: '700' }} value={monthlyForm.academicYear} onChange={e => setMonthlyForm({...monthlyForm, academicYear: parseInt(e.target.value)})}>
                                {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>Select Month(s)</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                            {MONTHS.map(m => (
                                <div 
                                    key={m}
                                    onClick={() => {
                                        const newMonths = monthlyForm.months.includes(m) ? monthlyForm.months.filter(x => x !== m) : [...monthlyForm.months, m];
                                        setMonthlyForm({ ...monthlyForm, months: newMonths });
                                    }}
                                    style={{ 
                                        padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700',
                                        background: monthlyForm.months.includes(m) ? 'var(--primary-bold)' : 'var(--bg-main)',
                                        color: monthlyForm.months.includes(m) ? '#fff' : 'var(--text-muted)',
                                        border: '1px solid var(--border-soft)'
                                    }}
                                >
                                    {m.slice(0,3)}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                        <div>
                            <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }}>Fee</label>
                            <input type="number" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: '700' }} value={monthlyForm.fee} onChange={e => setMonthlyForm({...monthlyForm, fee: e.target.value})} />
                        </div>
                        <div>
                            <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }}>Fine</label>
                            <input type="number" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: '700' }} value={monthlyForm.fine} onChange={e => setMonthlyForm({...monthlyForm, fine: e.target.value})} />
                        </div>
                        <div>
                            <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }}>Other</label>
                            <input type="number" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: '700' }} value={monthlyForm.others} onChange={e => setMonthlyForm({...monthlyForm, others: e.target.value})} />
                        </div>
                    </div>

                    <div style={{ background: 'var(--bg-soft)', padding: '16px', borderRadius: '14px', textAlign: 'center', marginTop: '10px' }}>
                        <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Amount</div>
                        <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--primary-bold)' }}>₹{(parseFloat(monthlyForm.fee)||0) + (parseFloat(monthlyForm.fine)||0) + (parseFloat(monthlyForm.others)||0)}</div>
                    </div>

                    <button type="submit" disabled={isLoading} style={{ padding: '16px', borderRadius: '14px', background: 'var(--primary-bold)', color: '#fff', border: 'none', fontWeight: '900', fontSize: '15px', marginTop: '10px' }}>
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Confirm Payment'}
                    </button>
                </form>
            </Modal>

            {/* Admission Entry Modal */}
            <Modal isOpen={showAdmissionEntry} onClose={() => setShowAdmissionEntry(false)} title="Admission Fee Entry">
                <form onSubmit={handleAdmissionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px' }}>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>Class</label>
                            <select 
                                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: '700' }}
                                value={admissionForm.classId}
                                onChange={e => {
                                    setAdmissionForm({ ...admissionForm, classId: e.target.value, student: null });
                                    lookupStudent('admission', e.target.value, admissionForm.rollNumber);
                                }}
                            >
                                <option value="">Select...</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>Roll No</label>
                            <input 
                                type="number"
                                placeholder="#"
                                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: '800' }}
                                value={admissionForm.rollNumber}
                                onChange={e => {
                                    setAdmissionForm({ ...admissionForm, rollNumber: e.target.value });
                                    lookupStudent('admission', admissionForm.classId, e.target.value);
                                }}
                            />
                        </div>
                    </div>

                    {admissionForm.student && (
                        <div style={{ padding: '16px', background: 'var(--primary-soft)', borderRadius: '14px', border: '1.5px solid var(--primary-bold)' }}>
                            <div style={{ fontSize: '14px', fontWeight: '900', color: 'var(--primary-bold)' }}>{admissionForm.student.name}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                                <div>
                                    <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--primary-bold)', opacity: 0.7, display: 'block' }}>TOTAL ADMISSION</span>
                                    <span style={{ fontSize: '14px', fontWeight: '900', color: 'var(--primary-bold)' }}>₹{admissionForm.student.totalAdmissionFee || 0}</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontSize: '9px', fontWeight: '800', color: '#ef4444', opacity: 0.8, display: 'block' }}>PENDING DUE</span>
                                    <span style={{ fontSize: '14px', fontWeight: '900', color: '#ef4444' }}>₹{admissionForm.student.due || 0}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>Payment Date</label>
                        <input type="date" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: '700' }} value={admissionForm.date} onChange={e => setAdmissionForm({...admissionForm, date: e.target.value})} />
                    </div>

                    <div>
                        <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>Admission Amount (₹)</label>
                        <input type="number" placeholder="Total expected" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: '700' }} value={admissionForm.totalAdmissionFee} onChange={e => setAdmissionForm({...admissionForm, totalAdmissionFee: e.target.value})} />
                    </div>

                    <div>
                        <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>Amount Paid Now (₹)</label>
                        <input type="number" placeholder="0" style={{ width: '100%', padding: '16px', borderRadius: '14px', border: '2px solid var(--primary-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: '900', fontSize: '18px' }} value={admissionForm.amountPaid} onChange={e => setAdmissionForm({...admissionForm, amountPaid: e.target.value})} />
                    </div>

                    <button type="submit" disabled={isLoading} style={{ padding: '16px', borderRadius: '14px', background: 'var(--primary-bold)', color: '#fff', border: 'none', fontWeight: '900', fontSize: '15px', marginTop: '10px' }}>
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Record Admission'}
                    </button>
                </form>
            </Modal>

            {/* Global Filter Modal */}
            <Modal isOpen={showFilters} onClose={() => setShowFilters(false)} title="View Period">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>Select Month</label>
                        <select 
                            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: '700', marginTop: '6px' }}
                            value={monthlyFilter.month}
                            onChange={e => setMonthlyFilter({ ...monthlyFilter, month: e.target.value })}
                        >
                            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>Select Year</label>
                        <select 
                            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: '700', marginTop: '6px' }}
                            value={monthlyFilter.year}
                            onChange={e => setMonthlyFilter({ ...monthlyFilter, year: parseInt(e.target.value) })}
                        >
                            {ACADEMIC_YEARS.slice().reverse().map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <button onClick={() => setShowFilters(false)} style={{ padding: '14px', borderRadius: '12px', background: 'var(--primary-bold)', color: '#fff', border: 'none', fontWeight: '800' }}>
                        Apply Filters
                    </button>
                </div>
            </Modal>

        </motion.div>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-card)', borderRadius: '24px', border: '1px dashed var(--border-soft)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <div style={{ opacity: 0.1 }}><Info size={40} /></div>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>{text}</p>
        </div>
    );
}
