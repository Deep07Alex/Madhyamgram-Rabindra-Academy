/**
 * Teacher Attendance Workcenter
 * 
 * The primary interface for faculty to manage classroom attendance and mark their own presence.
 * Tabs:
 * - Mark Attendance: Mark/edit student records for a specific class and subject.
 * - View Class Roster: Historical overview of attendance.
 * - Personal Check-in: Daily self-validation (Present/Absent).
 * 
 * Features:
 * - Automatic session eviction if the attendance window is closed by Admin.
 * - Real-time status toggling.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { isAttendanceOpen } from '../../utils/attendance';
import { useToast } from '../../context/ToastContext';

import useServerEvents from '../../hooks/useServerEvents';
import CustomSelect from '../common/CustomSelect';
import {
    Users,
    UserCheck,
    Calendar,
    ClipboardCheck,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Search,
    BarChart3,
    GraduationCap,
    School,
    Clock,
    LogOut
} from 'lucide-react';
import TeacherPersonalAttendance from './TeacherPersonalAttendance';

type AttendanceStatus = 'PRESENT' | 'ABSENT';

const STATUS_COLORS: Record<AttendanceStatus, { bg: string; text: string; border: string }> = {
    PRESENT: { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
    ABSENT: { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
};

const StatusBadge = ({ status }: { status: AttendanceStatus | null }) => {
    if (!status) return (
        <span style={{ padding: '3px 10px', borderRadius: '20px', background: '#f1f5f9', color: '#94a3b8', fontWeight: '600', fontSize: '0.75rem', border: '1px dashed #cbd5e1' }}>
            No Record
        </span>
    );
    const c = STATUS_COLORS[status];
    return (
        <span style={{ padding: '3px 12px', borderRadius: '20px', background: c.bg, color: c.text, fontWeight: '700', fontSize: '0.75rem', border: `1px solid ${c.border}` }}>
            {status}
        </span>
    );
};

// ── Inline status toggle buttons ──────────────────────────────────────────────
const StatusToggle = ({ studentId, selected, onChange }: { studentId: string; selected: string; onChange: (id: string, status: string) => void }) => (
    <div className="status-toggle-group" style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '8px' }}>
        {(['PRESENT', 'ABSENT'] as const).map(s => {
            const isSel = selected === s;
            const c = STATUS_COLORS[s];
            return (
                <button key={s} onClick={() => onChange(studentId, s)}
                    className="status-btn"
                    style={{
                        padding: '6px 14px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800',
                        border: isSel ? `1px solid ${c.border}` : '1px solid var(--border-soft)',
                        background: isSel ? c.bg : 'var(--bg-card)',
                        color: isSel ? c.text : 'var(--text-muted)',
                        transition: 'all 0.2s', cursor: 'pointer',
                        boxShadow: isSel ? 'var(--shadow-sm)' : 'none'
                    }}>
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
            );
        })}
    </div>
);

const TeacherAttendance = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [tab, setTab] = useState<'mark' | 'history' | 'self'>('mark');
    const [classes, setClasses] = useState<any[]>([]);

    // ── Mark Attendance tab ───────────────────────────────────────────────────
    const [markClass, setMarkClass] = useState('');
    const [markDate, setMarkDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [markSubject, setMarkSubject] = useState('');
    const [students, setStudents] = useState<any[]>([]);
    const [attendanceData, setAttendanceData] = useState<Record<string, string>>({});
    const [attendanceStats, setAttendanceStats] = useState<Record<string, any>>({});
    const [cumulativeStats, setCumulativeStats] = useState<Record<string, any>>({});
    const [isStatsLoading, setIsStatsLoading] = useState(false);

    // ── History tab ──────────────────────────────────────────────────────────
    const [histClass, setHistClass] = useState('');
    const [histDate, setHistDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [histSearch, setHistSearch] = useState('');
    const [histRows, setHistRows] = useState<Array<{
        id: string; name: string; studentId: string; rollNumber: string;
        attendanceId: string | null; status: AttendanceStatus | null;
    }>>([]);
    const [histLoading, setHistLoading] = useState(false);

    // ── Self Attendance tab ──────────────────────────────────────────────────
    const [showAbsentForm, setShowAbsentForm] = useState(false);
    const [absentReason, setAbsentReason] = useState('');
    const [lastConfig, setLastConfig] = useState('AUTO');
    const [todayAttendance, setTodayAttendance] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    /**
     * Session Guard:
     * Kicks the teacher back to the dashboard if the admin forces the window closed
     * or if the AUTO window (8 AM - 5 PM) expires.
     */
    const checkEviction = useCallback((status?: string) => {
        const currentStatus = status || lastConfig;
        if (!isAttendanceOpen(currentStatus)) {
            showToast('Attendance system is closed by admin', 'info');
            navigate('/teacher/dashboard');
        }
    }, [navigate, showToast, lastConfig]);

    // Update config and check
    const updateConfigAndCheck = useCallback((status: string) => {
        setLastConfig(status);
        checkEviction(status);
    }, [checkEviction]);

    // Initial check
    useEffect(() => {
        api.get('/attendance/config').then(res => {
            updateConfigAndCheck(res.data.attendance_override);
        }).catch(() => { });
    }, [updateConfigAndCheck]);

    useServerEvents({
        'system:config_updated': (data: any) => {
            if (data.key === 'attendance_override') {
                updateConfigAndCheck(data.value);
            }
        }
    });

    // Check time-based AUTO closure or Admin override every 2 minutes as a fallback
    // (SSE provides real-time updates, so this is just a safety measure)
    useEffect(() => {
        const interval = setInterval(() => {
            api.get('/attendance/config').then(res => {
                updateConfigAndCheck(res.data.attendance_override);
            }).catch(() => {
                // Fallback to time-based check if API fails
                checkEviction();
            });
        }, 120000); // 2 minutes
        return () => clearInterval(interval);
    }, [checkEviction, updateConfigAndCheck]);

    const fetchTodayAttendance = useCallback(async () => {
        try {
            const today = new Date().toLocaleDateString('en-CA');
            const res = await api.get('/attendance/teacher', {
                params: { startDate: today, endDate: today }
            });
            if (res.data && res.data.length > 0) {
                setTodayAttendance(res.data[0]);
            } else {
                setTodayAttendance(null);
            }
        } catch (err) {
            console.error('Failed to fetch today attendance:', err);
        }
    }, []);

    useEffect(() => {
        api.get('/users/classes').then(res => setClasses(res.data)).catch(console.error);
        fetchTodayAttendance();
    }, [fetchTodayAttendance]);

    const fetchStudentStats = useCallback(async () => {
        if (!markClass) return;
        setIsStatsLoading(true);
        try {
            const [y, m] = markDate.split('-').map(Number);
            const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
            const endDate = `${y}-${String(m).padStart(2, '0')}-${new Date(y, m, 0).getDate()}`;

            const [monthlyRes, cumulativeRes] = await Promise.all([
                api.get('/attendance/stats/students', { params: { classId: markClass, startDate, endDate } }),
                api.get('/attendance/stats/students', { params: { classId: markClass, startDate: '2026-01-01', endDate: new Date().toLocaleDateString('en-CA') } })
            ]);

            setAttendanceStats(monthlyRes.data.stats || {});
            setCumulativeStats(cumulativeRes.data.stats || {});
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        } finally {
            setIsStatsLoading(false);
        }
    }, [markClass, markDate]);

    // Load students for mark tab
    const loadRegister = useCallback(async () => {
        if (!markClass) {
            setStudents([]);
            setAttendanceData({});
            return;
        }

        try {
            const [stuRes, attRes] = await Promise.all([
                api.get(`/users/students?classId=${markClass}&limit=200`),
                api.get('/attendance/student', {
                    params: { classId: markClass, startDate: markDate, endDate: markDate }
                })
            ]);

            setStudents(stuRes.data.students || []);
            fetchStudentStats();

            // Prefill existing attendance status, default to PRESENT if none
            const init: Record<string, string> = {};
            const attMap: Record<string, string> = {};
            const attRecords = Array.isArray(attRes.data) ? attRes.data : (attRes.data.records || []);

            attRecords.forEach((a: any) => {
                if (!attMap[a.studentId]) attMap[a.studentId] = a.status;
            });

            (stuRes.data.students || []).forEach((s: any) => {
                init[s.id] = attMap[s.id] || '';
            });

            setAttendanceData(init);
        } catch (err) {
            console.error(err);
            showToast('Failed to load class register.', 'error');
        }
    }, [markClass, markDate, showToast, fetchStudentStats]);

    useEffect(() => {
        loadRegister();
    }, [loadRegister]);

    // Load history
    const fetchHistory = useCallback(async (silent = false) => {
        if (!histClass) { setHistRows([]); return; }
        if (!silent) setHistLoading(true);
        try {
            const [stuRes, attRes] = await Promise.all([
                api.get(`/users/students?classId=${histClass}&limit=200`),
                api.get('/attendance/student', {
                    params: { classId: histClass, startDate: histDate, endDate: histDate }
                }),
            ]);

            const attMap: Record<string, any> = {};
            const attRecords = Array.isArray(attRes.data) ? attRes.data : (attRes.data.records || []);
            attRecords.forEach((a: any) => { if (!attMap[a.studentId]) attMap[a.studentId] = a; });

            setHistRows((stuRes.data.students || []).map((s: any) => {
                const att = attMap[s.id] || null;
                return {
                    id: s.id,
                    name: s.name,
                    studentId: s.studentId,
                    rollNumber: s.rollNumber,
                    attendanceId: att?.id || null,
                    status: att?.status || null,
                };
            }));
        } catch {
            showToast('Failed to load attendance history.', 'error');
        } finally {
            if (!silent) setHistLoading(false);
        }
    }, [histClass, histDate]);

    useEffect(() => { 
        fetchHistory(); 
        if (histClass && histDate) {
            const [y, m] = histDate.split('-').map(Number);
            const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
            const endDate = `${y}-${String(m).padStart(2, '0')}-${new Date(y, m, 0).getDate()}`;
            Promise.all([
                api.get('/attendance/stats/students', { params: { classId: histClass, startDate, endDate } }),
                api.get('/attendance/stats/students', { params: { classId: histClass, startDate: '2026-01-01', endDate: new Date().toLocaleDateString('en-CA') } })
            ]).then(([monthlyRes, cumulativeRes]) => {
                setAttendanceStats(prev => ({ ...prev, ...monthlyRes.data.stats }));
                setCumulativeStats(prev => ({ ...prev, ...cumulativeRes.data.stats }));
            }).catch(() => {});
        }
    }, [fetchHistory, histClass, histDate]);

    // Live: refresh everything when attendance is updated
    useServerEvents({
        'attendance:updated': () => {
            loadRegister();
            fetchHistory(true);
        }
    });


    const handleStatusChange = async (studentId: string, status: string) => {
        setAttendanceData(prev => ({ ...prev, [studentId]: status }));

        try {
            await api.post('/attendance/student', {
                date: markDate,
                status: status,
                studentId,
                classId: markClass,
                subject: markSubject
            });
            showToast(`Status updated to ${status.charAt(0) + status.slice(1).toLowerCase()}`, 'success');
            if (histClass === markClass && histDate === markDate) fetchHistory(true);
        } catch {
            showToast('Failed to update attendance.', 'error');
        }
    };


    const handleSelfAttendance = async (status: string, reason?: string, type: 'check-in' | 'check-out' | 'mark' = 'mark') => {
        if (status === 'ABSENT' && !reason?.trim()) {
            showToast('Please provide a reason for being absent.', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            
            const payload: any = {
                date: now.toLocaleDateString('en-CA'),
                status
            };

            if (type === 'check-in') {
                payload.arrivalTime = timeStr;
            } else if (type === 'check-out') {
                payload.departureTime = timeStr;
                if (reason) payload.earlyLeaveReason = reason;
                // If checking out, we assume status is PRESENT unless already marked otherwise
                payload.status = todayAttendance?.status || 'PRESENT';
            } else {
                payload.reason = reason;
            }

            await api.post('/attendance/teacher', payload);
            
            let msg = `Attendance marked as ${status}`;
            if (type === 'check-in') msg = "Successfully checked in!";
            if (type === 'check-out') msg = "Successfully checked out!";
            
            showToast(msg, 'success');
            setShowAbsentForm(false);
            setAbsentReason('');
            fetchTodayAttendance();
        } catch (error) {
            showToast('Failed to update attendance.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Summary for history tab
    const filteredHist = histRows.filter(r =>
        !histSearch ||
        r.name.toLowerCase().includes(histSearch.toLowerCase()) ||
        r.studentId.toLowerCase().includes(histSearch.toLowerCase()) ||
        r.rollNumber.includes(histSearch)
    );
    const presentCount = filteredHist.filter(r => r.status === 'PRESENT').length;
    const absentCount = filteredHist.filter(r => r.status === 'ABSENT').length;
    const noRecordCount = filteredHist.filter(r => !r.status).length;

    const tabBtn = (t: typeof tab, label: string, Icon: any) => (
        <button onClick={() => setTab(t)} style={{
            padding: '10px 18px', borderRadius: 'calc(var(--radius-md) - 4px)',
            border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem',
            display: 'flex', alignItems: 'center', gap: '7px',
            background: tab === t ? 'var(--bg-card)' : 'transparent',
            color: tab === t ? 'var(--primary-bold)' : 'var(--text-muted)',
            boxShadow: tab === t ? 'var(--shadow-sm)' : 'none',
            transition: 'var(--transition-fast)',
        }}>
            <Icon size={16} /> {label}
        </button>
    );

    return (
        <div className="manage-section">
            {/* Tab bar */}
            <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-main)', padding: '6px', borderRadius: 'var(--radius-md)', width: 'fit-content', marginBottom: '32px' }}>
                {tabBtn('mark', 'Mark Attendance', ClipboardCheck)}
                {tabBtn('history', 'View Class Roster', BarChart3)}
                {tabBtn('self', 'Personal Check-in', UserCheck)}
            </div>

            {/* ── MARK ATTENDANCE ──────────────────────────────────────────────── */}
            {tab === 'mark' && (
                <div className="card">
                    <h3><ClipboardCheck size={20} color="var(--primary-bold)" /> Mark Class Attendance</h3>
                    <div className="form-grid" style={{ marginBottom: '32px' }}>
                        <CustomSelect
                            label="Target Class"
                            value={markClass}
                            onChange={val => {
                                setMarkClass(val);
                                setMarkSubject('');
                            }}
                            options={classes.map((c: any) => ({ value: c.id, label: c.name }))}
                            icon={<School size={16} />}
                            placeholder="Select Class"
                        />
                        <div className="form-group">
                            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Session Date</label>
                            <input type="date" value={markDate} onChange={e => setMarkDate(e.target.value)} />
                        </div>
                        <CustomSelect
                            label="Academic Subject"
                            value={markSubject}
                            onChange={val => setMarkSubject(val)}
                            options={(classes.find((c: any) => c.id === markClass)?.subjects || []).map((s: any) => ({ value: s.name, label: s.name }))}
                            icon={<GraduationCap size={16} />}
                            placeholder="Select Subject"
                        />
                    </div>

                    {markClass && students.length > 0 && (
                        <div style={{ marginTop: '32px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h4 style={{ margin: 0, fontWeight: '800' }}>Student Register</h4>
                                <span style={{ fontSize: '0.8rem', color: 'var(--primary-bold)', fontWeight: '700', padding: '4px 12px', background: 'var(--primary-soft)', borderRadius: '20px' }}>
                                    {students.length} Students
                                </span>
                            </div>
                            <div style={{ border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
                                <table className="data-table" style={{ minWidth: '400px' }}>
                                    <thead>
                                        <tr>
                                            <th>Student</th>
                                            <th style={{ textAlign: 'center' }}>Roll #</th>
                                            <th style={{ textAlign: 'left' }}>Performance Summary</th>
                                            <th style={{ textAlign: 'right' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students.map((stu: any) => (
                                            <tr key={stu.id}>
                                                <td>
                                                    <p style={{ margin: 0, fontWeight: '700' }}>{stu.name}</p>
                                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{stu.studentId}</p>
                                                </td>
                                                <td style={{ textAlign: 'center', fontWeight: '700', opacity: 0.6 }}>#{stu.rollNumber}</td>
                                                <td style={{ textAlign: 'left' }}>
                                                    {attendanceStats[stu.id] ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', opacity: isStatsLoading ? 0.5 : 1 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-main)' }}>
                                                                    M: {attendanceStats[stu.id].total > 0 ? ((attendanceStats[stu.id].present / attendanceStats[stu.id].total) * 100).toFixed(0) : '0'}%
                                                                </span>
                                                                <span style={{ fontSize: '0.68rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                                                                    ({attendanceStats[stu.id].present}/{attendanceStats[stu.id].total}d)
                                                                </span>
                                                            </div>
                                                            {cumulativeStats[stu.id] && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--primary-bold)' }}>
                                                                        O: {cumulativeStats[stu.id].total > 0 ? ((cumulativeStats[stu.id].present / cumulativeStats[stu.id].total) * 100).toFixed(0) : '0'}%
                                                                    </span>
                                                                    <span style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-muted)', opacity: 0.8 }}>
                                                                        ({cumulativeStats[stu.id].present}/{cumulativeStats[stu.id].total}d)
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>}
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <StatusToggle studentId={stu.id} selected={attendanceData[stu.id] || ''} onChange={handleStatusChange} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {markClass && students.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            <AlertCircle size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                            <p>No students enrolled in this class.</p>
                        </div>
                    )}
                    {!markClass && (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-soft)', marginTop: '24px' }}>
                            <Users size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
                            <p style={{ fontWeight: '600' }}>Select a class above to begin marking attendance</p>
                        </div>
                    )}
                </div>
            )}

            {/* ── HISTORY / ROSTER VIEW ─────────────────────────────────────────── */}
            {tab === 'history' && (
                <div className="card">
                    <h3><BarChart3 size={20} color="var(--primary-bold)" /> Class Attendance Roster</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 20px' }}>
                        Select a class and date to see the full attendance picture for every student.
                    </p>

                    {/* Filters */}
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
                        <CustomSelect
                            value={histClass}
                            onChange={val => { setHistClass(val); setHistSearch(''); }}
                            options={classes.map((c: any) => ({ value: c.id, label: c.name }))}
                            icon={<School size={16} />}
                            placeholder="Select Class"
                        />

                        <div style={{ position: 'relative' }}>
                            <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                            <input type="date" value={histDate} onChange={e => setHistDate(e.target.value)}
                                style={{ padding: '10px 14px 10px 36px', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', background: 'var(--bg-card)', color: 'var(--text-main)', cursor: 'pointer', outline: 'none' }} />
                        </div>

                        {histClass && (
                            <div style={{ position: 'relative', flex: 1, minWidth: '160px' }}>
                                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input type="text" placeholder="Search student..." value={histSearch} onChange={e => setHistSearch(e.target.value)}
                                    style={{ width: '100%', padding: '10px 14px 10px 36px', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                        )}
                    </div>

                    {histClass && !histLoading && histRows.length > 0 && (
                        <>
                            {/* Summary bar */}
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                                {[
                                    { label: 'Present', count: presentCount, color: '#15803d', bg: '#dcfce7' },
                                    { label: 'Absent', count: absentCount, color: '#dc2626', bg: '#fee2e2' },
                                    { label: 'No Record', count: noRecordCount, color: '#64748b', bg: '#f1f5f9' },
                                ].map(b => (
                                    <div key={b.label} style={{ padding: '6px 16px', borderRadius: '20px', background: b.bg, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontWeight: '800', fontSize: '1rem', color: b.color }}>{b.count}</span>
                                        <span style={{ fontSize: '0.78rem', color: b.color, fontWeight: '600' }}>{b.label}</span>
                                    </div>
                                ))}
                                <div style={{ padding: '6px 16px', borderRadius: '20px', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                                    <span style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--primary-bold)' }}>{histRows.length}</span>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--primary-bold)', fontWeight: '600' }}>Total Students</span>
                                </div>
                            </div>

                            {/* Table */}
                            <div style={{ border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--bg-main)', borderBottom: '2px solid var(--border-soft)' }}>
                                            <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Student</th>
                                            <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Roll #</th>
                                            <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Performance Summary</th>
                                            <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                {histDate
                                                    ? `Status on ${new Date(histDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`
                                                    : 'Attendance Status'}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredHist.map((row, idx) => (
                                            <tr key={row.id}
                                                style={{ borderBottom: idx < filteredHist.length - 1 ? '1px solid var(--border-soft)' : 'none', transition: 'background 0.15s' }}
                                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-main)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-card)')}>
                                                <td style={{ padding: '13px 20px' }}>
                                                    <p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem' }}>{row.name}</p>
                                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{row.studentId}</p>
                                                </td>
                                                <td style={{ padding: '13px 20px', textAlign: 'center', fontWeight: '700', color: 'var(--text-muted)' }}>#{row.rollNumber}</td>
                                                <td style={{ padding: '13px 20px', textAlign: 'left' }}>
                                                    {attendanceStats[row.id] ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--text-main)' }}>
                                                                    M: {attendanceStats[row.id].total > 0 ? ((attendanceStats[row.id].present / attendanceStats[row.id].total) * 100).toFixed(0) : '0'}%
                                                                </span>
                                                                <span style={{ fontSize: '0.68rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                                                                    ({attendanceStats[row.id].present}/{attendanceStats[row.id].total}d)
                                                                </span>
                                                            </div>
                                                            {cumulativeStats[row.id] && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--primary-bold)' }}>
                                                                        O: {cumulativeStats[row.id].total > 0 ? ((cumulativeStats[row.id].present / cumulativeStats[row.id].total) * 100).toFixed(0) : '0'}%
                                                                    </span>
                                                                    <span style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-muted)', opacity: 0.8 }}>
                                                                        ({cumulativeStats[row.id].present}/{cumulativeStats[row.id].total}d)
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>}
                                                </td>
                                                <td style={{ padding: '13px 20px', textAlign: 'right' }}>
                                                    <StatusBadge status={row.status} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {histClass && histLoading && (
                        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
                            <BarChart3 size={28} style={{ opacity: 0.3, marginBottom: '10px' }} />
                            <p>Loading attendance data...</p>
                        </div>
                    )}

                    {!histClass && (
                        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-soft)' }}>
                            <BarChart3 size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
                            <p style={{ fontWeight: '600' }}>Select a class above to view the attendance roster</p>
                            <p style={{ fontSize: '0.85rem' }}>Each student is shown — including those with no record for the selected date</p>
                        </div>
                    )}
                </div>
            )}

            {/* ── SELF CHECK-IN & REPORTING ────────────────────────────────────────── */}
            {tab === 'self' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ margin: 0 }}><UserCheck size={20} color="var(--success)" /> Faculty Daily Validation</h3>
                            {todayAttendance && (
                                <span className={`badge ${todayAttendance.status === 'PRESENT' ? 'present' : 'absent'}`} style={{ fontSize: '0.8rem', fontWeight: '800' }}>
                                    Current Status: {todayAttendance.status}
                                </span>
                            )}
                        </div>

                        <div style={{ padding: '24px', background: 'var(--bg-main)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-soft)', textAlign: 'center', marginBottom: '32px' }}>
                            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px' }}>Today's Date</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)' }}>
                                {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                        </div>

                        {todayAttendance && todayAttendance.status === 'PRESENT' ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
                                <div style={{ padding: '20px', background: 'var(--success-soft)', borderRadius: 'var(--radius-md)', border: '1px solid var(--success)', textAlign: 'center' }}>
                                    <p style={{ margin: '0 0 8px 0', fontSize: '0.7rem', fontWeight: '800', color: 'var(--success)', textTransform: 'uppercase' }}>Check-in Time</p>
                                    <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900', color: 'var(--text-main)' }}>{todayAttendance.arrivalTime ? todayAttendance.arrivalTime.substring(0, 5) : '--:--'}</p>
                                </div>
                                <div style={{ padding: '20px', background: todayAttendance.departureTime ? 'var(--primary-soft)' : 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: `1px solid ${todayAttendance.departureTime ? 'var(--primary-bold)' : 'var(--border-soft)'}`, textAlign: 'center' }}>
                                    <p style={{ margin: '0 0 8px 0', fontSize: '0.7rem', fontWeight: '800', color: todayAttendance.departureTime ? 'var(--primary-bold)' : 'var(--text-muted)', textTransform: 'uppercase' }}>Check-out Time</p>
                                    <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900', color: 'var(--text-main)' }}>{todayAttendance.departureTime ? todayAttendance.departureTime.substring(0, 5) : '--:--'}</p>
                                </div>
                            </div>
                        ) : null}

                        {!showAbsentForm ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                {!todayAttendance?.arrivalTime && (
                                    <button 
                                        onClick={() => handleSelfAttendance('PRESENT', undefined, 'check-in')} 
                                        disabled={isSubmitting}
                                        className="btn-primary" 
                                        style={{ height: '80px', flexDirection: 'column', gap: '8px', background: 'var(--success)' }}
                                    >
                                        <Clock size={24} /> <span>{isSubmitting ? 'Processing...' : 'Mark Check-in'}</span>
                                    </button>
                                )}
                                
                                {todayAttendance?.arrivalTime && !todayAttendance?.departureTime && (
                                    <button 
                                        onClick={() => handleSelfAttendance('PRESENT', undefined, 'check-out')} 
                                        disabled={isSubmitting}
                                        className="btn-primary" 
                                        style={{ height: '80px', flexDirection: 'column', gap: '8px', background: 'var(--primary-bold)' }}
                                    >
                                        <LogOut size={24} /> <span>{isSubmitting ? 'Processing...' : 'Mark Check-out'}</span>
                                    </button>
                                )}

                                {!todayAttendance && (
                                    <button 
                                        onClick={() => setShowAbsentForm(true)} 
                                        disabled={isSubmitting}
                                        className="btn-primary" 
                                        style={{ height: '80px', flexDirection: 'column', gap: '8px', background: 'var(--error)' }}
                                    >
                                        <XCircle size={24} /> <span>Mark Absent</span>
                                    </button>
                                )}

                                {todayAttendance && (
                                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '12px', background: 'var(--bg-main)', borderRadius: '12px', fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', border: '1px dashed var(--border-soft)' }}>
                                        <CheckCircle2 size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                                        Your attendance for today has been successfully recorded.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ padding: '24px', background: 'rgba(var(--error-rgb), 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid var(--error)' }}>
                                <h4 style={{ margin: '0 0 16px 0', color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <AlertCircle size={20} /> Please provide a reason for absence
                                </h4>
                                <textarea
                                    value={absentReason}
                                    onChange={e => setAbsentReason(e.target.value)}
                                    placeholder="E.g., Sick leave, Personal emergency, etc."
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-soft)', background: 'var(--bg-card)', color: 'var(--text-main)', minHeight: '100px', marginBottom: '16px', fontSize: '0.9rem', outline: 'none', resize: 'vertical' }}
                                    autoFocus
                                />
                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                    <button onClick={() => { setShowAbsentForm(false); setAbsentReason(''); }} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--text-muted)', color: 'var(--text-muted)', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                                    <button onClick={() => handleSelfAttendance('ABSENT', absentReason)} disabled={isSubmitting} style={{ padding: '8px 16px', background: 'var(--error)', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{isSubmitting ? 'Submitting...' : 'Submit Absence'}</button>
                                </div>
                            </div>
                        )}
                    </div>

                    <TeacherPersonalAttendance />
                </div>
            )}
        </div>
    );
};

export default TeacherAttendance;
