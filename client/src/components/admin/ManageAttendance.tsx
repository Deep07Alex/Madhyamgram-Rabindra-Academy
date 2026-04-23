/**
 * Attendance Management System (Admin)
 * 
 * The central hub for tracking and overriding attendance for all academy members.
 * Features:
 * - Daily Logging: Real-time status toggling for individual dates.
 * - Monthly Overview: Aggregated summaries of presence/absence.
 * - System Override: Global control to Force Open/Close the attendance window.
 * - Unified View: Shows everyone in the database, matching records where they exist.
 */
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import useServerEvents from '../../hooks/useServerEvents';
import CustomSelect from '../common/CustomSelect';
import {
    ClipboardCheck,
    Search,
    Pencil,
    Check,
    X,
    Users,
    UserCheck,
    CalendarDays,
    Clock,
    ShieldAlert,
    ShieldCheck,
    School,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';

type AttendanceStatus = 'PRESENT' | 'ABSENT';

interface StudentRow {
    id: string;
    name: string;
    studentId: string;
    rollNumber: string;
    classId: string;
    className: string;
    // Attendance for the selected date (null = no record)
    attendanceId: string | null;
    status: AttendanceStatus | null;
    date: string | null;
    subject: string | null;
}

interface TeacherRow {
    id: string;
    name: string;
    teacherId: string;
    attendanceId: string | null;
    status: AttendanceStatus | null;
    date: string | null;
    reason: string | null;
    arrivalTime: string | null;
    departureTime: string | null;
    earlyLeaveReason: string | null;
    designation?: string;
}

const STATUS_COLORS: Record<AttendanceStatus, string> = {
    PRESENT: '#22c55e',
    ABSENT: '#ef4444',
};

const StatusBadge = React.memo(({ status, subject }: { status: AttendanceStatus | null, subject?: string | null }) => {
    if (subject === 'BULK_ABSENT') return <span style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: '700', padding: '3px 10px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '20px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>Non-Academic Day</span>;
    if (!status) return <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '600' }}>No Record</span>;
    return (
        <span style={{
            padding: '3px 12px', borderRadius: '20px',
            background: STATUS_COLORS[status] + '20',
            color: STATUS_COLORS[status],
            fontWeight: '700', fontSize: '0.78rem',
            border: `1px solid ${STATUS_COLORS[status]}40`
        }}>
            {status}
        </span>
    );
});

const InlineStatusEdit = React.memo(({
    attendanceId, currentStatus, type, personId, date, classId, initialReason,
    onUpdated
}: {
    attendanceId: string | null;
    currentStatus: AttendanceStatus | null;
    type: 'student' | 'teacher';
    personId: string;
    date: string;
    classId?: string;
    initialReason?: string | null;
    onUpdated: (silent?: boolean) => void;
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        if (isSubmitting) {
            setIsSubmitting(false);
        }
    }, [currentStatus]);


    const toggle = async () => {
        // Toggle Logic: Null/Absent -> Present, Present -> Absent
        const nextStatus = currentStatus === 'PRESENT' ? 'ABSENT' : 'PRESENT';

        setIsSubmitting(true);
        try {
            if (attendanceId) {
                const endpoint = type === 'student'
                    ? `/attendance/admin/student/${attendanceId}`
                    : `/attendance/admin/teacher/${attendanceId}`;
                await api.patch(endpoint, type === 'teacher' ? { status: nextStatus, reason: initialReason } : { status: nextStatus });
            } else {
                if (type === 'student') {
                    await api.post('/attendance/student', {
                        date, status: nextStatus, studentId: personId,
                        classId: classId || '', subject: 'FULL DAY SESSION'
                    });
                } else {
                    await api.post('/attendance/teacher', { date, status: nextStatus, reason: '', teacherId: personId });
                }
            }
            showToast(`Marked as ${nextStatus}`, 'success');
            onUpdated(true);
        } catch {
            showToast('Failed to update attendance.', 'error');
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isSubmitting ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 12px', background: 'var(--bg-main)', borderRadius: '20px', border: '1px solid var(--border-soft)' }}>
                        <div className="animate-spin" style={{ width: '12px', height: '12px', border: '2px solid var(--primary-bold)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
                        <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)' }}>Updating...</span>
                    </div>
                ) : (
                    <div onClick={toggle} style={{ cursor: 'pointer', transition: 'transform 0.1s' }} onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>
                        <StatusBadge status={currentStatus} subject={initialReason} />
                    </div>
                )}
            </div>
            {type === 'teacher' && currentStatus === 'ABSENT' && initialReason && !isSubmitting && (
                <span style={{ fontSize: '0.75rem', color: '#ef4444', background: 'var(--bg-main)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    {initialReason}
                </span>
            )}
        </div>
    );
});

const InlineTimeEdit = React.memo(({
    attendanceId, personId, date, type, initialTime, currentStatus, currentReason, otherTime, onUpdated
}: {
    attendanceId: string | null;
    personId: string;
    date: string;
    type: 'arrival' | 'departure';
    initialTime: string | null;
    currentStatus: AttendanceStatus | null;
    currentReason?: string | null;
    otherTime: string | null;
    onUpdated: (silent?: boolean) => void;
}) => {
    const [editing, setEditing] = useState(false);
    const [time, setTime] = useState(initialTime || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        if (!editing && !isSubmitting) setTime(initialTime || '');
        // Sync submitting state if prop catches up (null/empty string equivalence check)
        if (isSubmitting && (initialTime === time || (!initialTime && !time))) {
            setIsSubmitting(false);
        }
    }, [initialTime, editing, isSubmitting, time]);

    const save = async () => {
        // If user cleared the input, treat as null
        const timeToSave = time.trim() || null;

        setIsSubmitting(true);
        try {
            const status = currentStatus || 'PRESENT';
            const payload = {
                status,
                reason: currentReason,
                arrivalTime: type === 'arrival' ? timeToSave : otherTime,
                departureTime: type === 'departure' ? timeToSave : otherTime
            };

            if (attendanceId) {
                await api.patch(`/attendance/admin/teacher/${attendanceId}`, payload);
            } else {
                await api.post('/attendance/teacher', {
                    date,
                    ...payload,
                    teacherId: personId
                });
            }
            showToast('Time updated!', 'success');
            setEditing(false);
            onUpdated(true);
        } catch {
            showToast('Failed to update time.', 'error');
            setIsSubmitting(false);
        }
    };

    if (!editing) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: isSubmitting ? 'default' : 'pointer', color: 'var(--text-main)', opacity: isSubmitting ? 0.6 : 1 }} onClick={() => !isSubmitting && setEditing(true)}>
                <span>{(isSubmitting ? time : initialTime) || '—'}</span>
                {!isSubmitting && <Pencil size={12} style={{ opacity: 0.5 }} />}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
                type="text"
                value={time}
                placeholder="HH:MM:SS"
                onChange={e => setTime(e.target.value)}
                autoFocus
                style={{
                    border: '1px solid var(--border-soft)', borderRadius: '4px',
                    padding: '2px 6px', fontSize: '0.8rem', width: '85px',
                    background: 'var(--bg-input)', color: 'var(--text-main)'
                }}
            />
            <button onClick={(e) => { e.stopPropagation(); save(); }} style={{ background: '#22c55e', border: 'none', borderRadius: '4px', padding: '2px 4px', cursor: 'pointer', color: 'white' }}>
                <Check size={12} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setEditing(false); }} style={{ background: '#ef4444', border: 'none', borderRadius: '4px', padding: '2px 4px', cursor: 'pointer', color: 'white' }}>
                <X size={12} />
            </button>
        </div>
    );
});


const MonthlySummaryDisplay = React.memo(({ personId, dataMap }: { personId: string; dataMap: Record<string, Record<string, any>> }) => {
    const records = dataMap[personId] || {};
    const days = Object.values(records);
    const absent = days.filter((r: any) => r.status === 'ABSENT').length;
    const present = days.filter((r: any) => r.status === 'PRESENT' || r.status === 'LATE').length;

    return (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#22c55e' }}>
                    {present} Present
                </span>
            </div>
            {absent > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#ef4444' }}>{absent} Absent</span>
                </div>
            )}
        </div>
    );
});

const StudentAttendanceRow = React.memo(({
    row,
    viewMode,
    dateFilter,
    monthlyDataMap,
    onRefresh,
    stats,
    isStatsLoading
}: {
    row: StudentRow,
    viewMode: 'daily' | 'monthly',
    dateFilter: string,
    monthlyDataMap: any,
    onRefresh: any,
    stats?: { present: number, absent: number, total: number },
    isStatsLoading?: boolean
}) => {
    return (
        <tr style={{ borderBottom: '1px solid var(--border-soft)', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-main)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-card)')}>
            <td style={{ padding: '14px 20px' }}>
                <p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-main)' }}>{row.name}</p>
                <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{row.studentId}</p>
            </td>
            <td style={{ padding: '14px 20px', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>#{row.rollNumber}</td>
            <td style={{ padding: '14px 20px' }}>
                <span style={{ padding: '3px 10px', background: 'var(--primary-soft)', color: 'var(--primary-bold)', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '700' }}>
                    {row.className}
                </span>
            </td>
            {viewMode === 'daily' && (
                <td style={{ padding: '14px 20px' }}>
                    {stats ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', opacity: isStatsLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: '900', color: 'var(--text-main)' }}>
                                    {stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(0) : '0'}%
                                </span>
                                <div style={{ height: '4px', width: '40px', background: 'var(--bg-main)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${Math.min(100, (stats.present / (stats.total || 1)) * 100)}%`,
                                        background: (stats.present / (stats.total || 1)) > 0.75 ? '#22c55e' : (stats.present / (stats.total || 1)) > 0.5 ? '#f59e0b' : '#ef4444'
                                    }}></div>
                                </div>
                            </div>
                            <span style={{ fontSize: '0.68rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                                {stats.present} of {stats.total} days
                            </span>
                        </div>
                    ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                    )}
                </td>
            )}
            <td style={{ padding: '14px 20px' }}>
                {viewMode === 'daily' ? (
                    dateFilter ? (
                        <InlineStatusEdit
                            attendanceId={row.attendanceId}
                            currentStatus={row.status}
                            type="student"
                            personId={row.id}
                            date={dateFilter}
                            classId={row.classId}
                            onUpdated={onRefresh}
                        />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                            <StatusBadge status={row.status} />
                            {row.subject && row.subject !== 'Full Day Record' && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--bg-main)', padding: '2px 6px', borderRadius: '4px' }}>
                                    {row.subject}
                                </span>
                            )}
                        </div>
                    )
                ) : (
                    <MonthlySummaryDisplay personId={row.id} dataMap={monthlyDataMap} />
                )}
            </td>
        </tr>
    );
});

const TeacherAttendanceRow = React.memo(({
    row,
    viewMode,
    dateFilter,
    monthlyDataMap,
    fetchTeacherData,
    tab
}: {
    row: TeacherRow,
    viewMode: 'daily' | 'monthly',
    dateFilter: string,
    monthlyDataMap: any,
    fetchTeacherData: any,
    tab: string
}) => {
    return (
        <tr style={{ borderBottom: '1px solid var(--border-soft)', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-main)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-card)')}>
            <td style={{ padding: '14px 20px' }}>
                <p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    {row.name} <span style={{ fontSize: '0.75rem', color: 'var(--primary-bold)', opacity: 0.8 }}>({row.designation})</span>
                </p>
                {tab === 'teachers' && (
                    <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{row.teacherId}</p>
                )}
            </td>
            <td style={{ padding: '14px 20px', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '600' }}>
                {dateFilter ? (
                    <InlineTimeEdit
                        attendanceId={row.attendanceId}
                        personId={row.id}
                        date={dateFilter}
                        type="arrival"
                        initialTime={row.arrivalTime}
                        otherTime={row.departureTime}
                        currentStatus={row.status}
                        currentReason={row.reason}
                        onUpdated={fetchTeacherData}
                    />
                ) : (
                    row.arrivalTime || '—'
                )}
            </td>
            <td style={{ padding: '14px 20px', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '600' }}>
                {dateFilter ? (
                    <InlineTimeEdit
                        attendanceId={row.attendanceId}
                        personId={row.id}
                        date={dateFilter}
                        type="departure"
                        initialTime={row.departureTime}
                        otherTime={row.arrivalTime}
                        currentStatus={row.status}
                        currentReason={row.reason}
                        onUpdated={fetchTeacherData}
                    />
                ) : (
                    row.departureTime || '—'
                )}
            </td>
            <td style={{ padding: '14px 20px' }}>
                {viewMode === 'daily' ? (
                    dateFilter ? (
                        <InlineStatusEdit
                            attendanceId={row.attendanceId}
                            currentStatus={row.status}
                            type="teacher"
                            personId={row.id}
                            date={dateFilter}
                            initialReason={row.reason}
                            onUpdated={fetchTeacherData}
                        />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                            <StatusBadge status={row.status} />
                        </div>
                    )
                ) : (
                    <MonthlySummaryDisplay personId={row.id} dataMap={monthlyDataMap} />
                )}
            </td>
            <td style={{ padding: '14px 20px' }}>
                {row.status === 'ABSENT' && row.reason && (
                    <div style={{ fontSize: '0.75rem', color: '#ef4444', background: '#fee2e2', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <strong>Absent:</strong> {row.reason}
                    </div>
                )}
                {row.earlyLeaveReason && (
                    <div style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--warning-bold)', background: 'rgba(var(--warning-rgb), 0.1)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--warning-soft)' }}>
                        <strong>Early Leave:</strong> {row.earlyLeaveReason}
                    </div>
                )}
                {!row.reason && !row.earlyLeaveReason && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>}
            </td>
        </tr>
    );
});

const thStyle: React.CSSProperties = {
    padding: '13px 20px', textAlign: 'left', fontSize: '0.72rem',
    fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em'
};

const ManageAttendance = () => {
    const { showToast } = useToast();
    const [tab, setTab] = useState<'students' | 'teachers' | 'staff'>('students');
    const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
    const [attendanceStatus, setAttendanceStatus] = useState<'AUTO' | 'OPEN' | 'CLOSED'>('AUTO');
    const [togglingOverride, setTogglingOverride] = useState(false);
    const [markingBulkAbsent, setMarkingBulkAbsent] = useState(false);

    // Pagination state
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const limit = 20;
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 350);
        return () => clearTimeout(timer);
    }, [search]);

    // Student state
    const [studentRows, setStudentRows] = useState<StudentRow[]>([]);
    const [attendanceStats, setAttendanceStats] = useState<Record<string, any>>({});
    const [isStatsLoading, setIsStatsLoading] = useState(false);
    const fetchConfig = useCallback(async () => {
        try {
            const res = await api.get('/attendance/config');
            setAttendanceStatus(res.data.attendance_override);
        } catch (err) {
            console.error('Failed to fetch attendance config');
        }
    }, []);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    /**
     * System Override Logic:
     * Cycles through 3 states:
     * 1. AUTO: Respects the default timing (e.g., 8 AM - 5 PM).
     * 2. OPEN: Forces the portal to be accessible regardless of time.
     * 3. CLOSED: Locks the portal completely.
     */
    const handleToggleOverride = async () => {
        setTogglingOverride(true);
        try {
            const states: Array<'AUTO' | 'OPEN' | 'CLOSED'> = ['AUTO', 'OPEN', 'CLOSED'];
            const currentIndex = states.indexOf(attendanceStatus);
            const nextValue = states[(currentIndex + 1) % states.length];

            await api.patch('/attendance/config', { attendance_override: nextValue });
            setAttendanceStatus(nextValue);
            showToast(`System set to ${nextValue}.`, 'success');
        } catch (err) {
            showToast('Failed to update system config.', 'error');
        } finally {
            setTogglingOverride(false);
        }
    };

    const handleBulkMarkAbsent = async () => {
        if (!dateFilter) {
            showToast('Please select a date first', 'error');
            return;
        }

        setMarkingBulkAbsent(true);
        try {
            await api.post('/attendance/bulk-absent', {
                date: dateFilter,
                classId: selectedClass || null
            });
            showToast('Bulk attendance update successful!', 'success');

            // Refresh data
            if (viewMode === 'daily') {
                if (tab === 'students') {
                    refreshStudentView();
                }
            } else {
                fetchMonthlyData();
            }
        } catch (err) {
            console.error('Bulk absent error:', err);
            showToast('Failed to mark bulk absent.', 'error');
        } finally {
            setMarkingBulkAbsent(false);
        }
    };

    // Use SSE for real-time sync
    useServerEvents({
        'system:config_updated': (data: any) => {
            if (data.key === 'attendance_override') {
                setAttendanceStatus(data.value);
            }
        },
        'attendance:updated': (data: any) => {
            const dateStr = dateFilter;

            // Optimization: If update is for the currently viewed date, update local state immediately
            if (data && data.status && data.date === dateStr) {
                if (data.studentId) {
                    setStudentRows(prev => prev.map(s => s.id === data.studentId ? { ...s, status: data.status, attendanceId: data.attendanceId || s.attendanceId } : s));
                } else if (data.teacherId) {
                    setTeacherRows(prev => prev.map(t => t.id === data.teacherId ? { ...t, status: data.status, attendanceId: data.attendanceId || t.attendanceId } : t));
                }
            } else {
                // Fallback: silent re-fetch with stabilization delay if needed
                setTimeout(() => {
                    if (viewMode === 'daily') {
                        if (tab === 'students') {
                            refreshStudentView();
                        }
                        else fetchTeacherData();
                    } else {
                        fetchMonthlyData();
                    }
                }, 300);
            }
        },
        'attendance:bulk_updated': (data: any) => {
            const dateStr = dateFilter;
            if (data && data.date === dateStr) {
                if (viewMode === 'daily') {
                    if (tab === 'students') fetchStudentData();
                    else fetchTeacherData();
                } else {
                    fetchMonthlyData();
                }
            }
        }
    });

    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState('');

    // Teacher state
    const [teacherRows, setTeacherRows] = useState<TeacherRow[]>([]);

    // Shared
    const [dateFilter, setDateFilter] = useState(new Date().toLocaleDateString('en-CA'));
    const [monthFilter, setMonthFilter] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    const fetchClasses = useCallback(async () => {
        try {
            const res = await api.get('/users/classes');
            setClasses(res.data);
        } catch (err) {
            console.error('Failed to fetch classes');
        }
    }, []);

    useEffect(() => {
        fetchClasses();
    }, [fetchClasses]);

    // ── Fetch Student Stats (Separated from pagination) ──
    const fetchStudentStats = useCallback(async () => {
        if (tab !== 'students') return;
        setIsStatsLoading(true);
        try {
            const formatISODate = (d: Date) => {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${y}-${m}-${day}`;
            };

            let startDate, endDate;
            if (viewMode === 'daily') {
                // Get full month range for the selected day
                const [y, m] = dateFilter.split('-').map(Number);
                const firstDay = new Date(y, m - 1, 1);
                const lastDay = new Date(y, m, 0);
                startDate = formatISODate(firstDay);
                endDate = formatISODate(lastDay);
            } else {
                // Use the month filter
                const [y, m] = monthFilter.split('-').map(Number);
                startDate = formatISODate(new Date(y, m - 1, 1));
                endDate = formatISODate(new Date(y, m, 0));
            }

            const statsRes = await api.get('/attendance/stats/students', {
                params: {
                    classId: selectedClass || null,
                    startDate,
                    endDate
                }
            });
            setAttendanceStats(statsRes.data.stats || {});
        } catch (err) {
            console.error('Failed to fetch attendance stats:', err);
        } finally {
            setIsStatsLoading(false);
        }
    }, [selectedClass, viewMode, tab, dateFilter, monthFilter]);

    useEffect(() => {
        fetchStudentStats();
    }, [fetchStudentStats]);

    // ── Fetch students + attendance for date
    const fetchStudentData = useCallback(async () => {
        if (viewMode !== 'daily') return;
        setIsLoading(true);
        try {
            const [stuRes, attRes] = await Promise.all([
                api.get('/users/students', {
                    params: {
                        page,
                        limit,
                        classId: selectedClass,
                        search: debouncedSearch
                    }
                }),
                api.get('/attendance/student', {
                    params: dateFilter ? {
                        startDate: dateFilter,
                        endDate: dateFilter,
                        classId: selectedClass || undefined
                    } : {}
                })
            ]);

            const attMap: Record<string, any> = {};
            const attRecords = Array.isArray(attRes.data) ? attRes.data : (attRes.data.records || []);
            attRecords.forEach((a: any) => {
                const sid = a.studentId || a.studentid;
                if (sid && !attMap[sid]) attMap[sid] = a;
            });

            const classMap: Record<string, string> = {};
            classes.forEach((c: any) => { classMap[c.id] = c.name; });

            const studentData = stuRes.data.students || [];
            setTotalCount(stuRes.data.total || 0);
            setTotalPages(stuRes.data.totalPages || 1);

            const rows: StudentRow[] = studentData.map((s: any) => {
                const att = attMap[s.id] || null;
                return {
                    id: s.id,
                    name: s.name,
                    studentId: s.studentId,
                    rollNumber: s.rollNumber,
                    classId: s.classId,
                    className: classMap[s.classId] || '—',
                    attendanceId: att?.id || null,
                    status: att?.status || null,
                    date: att?.date || null,
                    subject: att?.subject || null,
                };
            });

            setStudentRows(rows);
        } catch (err) {
            console.error('Failed to fetch student data:', err);
            showToast('Failed to sync student attendance records', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [dateFilter, viewMode, page, limit, selectedClass, debouncedSearch, classes, showToast]);

    const refreshStudentView = useCallback(() => {
        fetchStudentData();
        fetchStudentStats();
    }, [fetchStudentData, fetchStudentStats]);


    // ── Fetch teachers + attendance for date ──────────────────────────────
    const fetchTeacherData = useCallback(async () => {
        if (viewMode !== 'daily') return;
        try {
            const [teachRes, attRes] = await Promise.all([
                api.get('/users/teachers', {
                    params: {
                        page,
                        limit,
                        search: debouncedSearch,
                        filter: tab === 'teachers' ? 'teachers' : (tab === 'staff' ? 'staff' : '')
                    }
                }),
                api.get('/attendance/teacher', {
                    params: dateFilter ? {
                        startDate: dateFilter,
                        endDate: dateFilter
                    } : {}
                }),
            ]);

            const attMap: Record<string, any> = {};
            const teacherAttData = Array.isArray(attRes.data) ? attRes.data : [];
            teacherAttData.forEach((a: any) => {
                const tid = a.teacherId || a.teacherid;
                if (tid) attMap[tid] = a;
            });

            const teacherData = teachRes.data.teachers || [];
            setTotalCount(teachRes.data.total || 0);
            setTotalPages(teachRes.data.totalPages || 1);

            const rows: TeacherRow[] = teacherData.map((t: any) => {
                const att = attMap[t.id] || null;
                return {
                    id: t.id,
                    name: t.name,
                    teacherId: t.teacherId,
                    attendanceId: att?.id || null,
                    status: att?.status || null,
                    date: att?.date || null,
                    reason: att?.reason || null,
                    arrivalTime: att?.arrivalTime || null,
                    departureTime: att?.departureTime || null,
                    earlyLeaveReason: att?.earlyLeaveReason || null,
                    designation: t.designation
                };
            });

            setTeacherRows(rows);
        } finally {
        }
    }, [dateFilter, viewMode, showToast, page, limit, debouncedSearch]);

    // ── Fetch Monthly Data ────────────────────────────────────────────────────
    const [monthlyDataMap, setMonthlyDataMap] = useState<Record<string, Record<string, any>>>({}); // personId -> { dateStr -> record }

    const fetchMonthlyData = useCallback(async () => {
        if (viewMode !== 'monthly' || !monthFilter) return;

        // If students tab but no class selected, we only fetch classes list if needed and return
        if (tab === 'students' && !selectedClass) {
            if (classes.length === 0) {
                api.get('/users/classes').then(res => setClasses(res.data)).catch(err => {
                    console.error(err);
                });
            }
            setMonthlyDataMap({});
            setStudentRows([]);
            return;
        }

        try {
            // Calculate start and end dates
            let startDate = `${monthFilter}-01`;
            const [year, month] = monthFilter.split('-').map(Number);
            const endDay = new Date(year, month, 0).getDate(); // Last day of month
            let endDate = `${monthFilter}-${endDay.toString().padStart(2, '0')}`;

            if (tab === 'students') {
                const [stuRes, attRes] = await Promise.all([
                    api.get('/users/students', {
                        params: {
                            classId: selectedClass,
                            page,
                            limit,
                            search: debouncedSearch
                        }
                    }),
                    api.get('/attendance/student', { params: { classId: selectedClass, startDate, endDate } })
                ]);

                // Map records
                const matrix: Record<string, Record<string, any>> = {};
                const attRecords = Array.isArray(attRes.data) ? attRes.data : (attRes.data.records || []);
                attRecords.forEach((a: any) => {
                    const d = a.date.split('T')[0];
                    const sid = a.studentId || a.studentid;
                    if (sid) {
                        if (!matrix[sid]) matrix[sid] = {};
                        matrix[sid][d] = a;
                    }
                });

                const studentData = stuRes.data.students || [];
                setTotalCount(stuRes.data.total || 0);
                setTotalPages(stuRes.data.totalPages || 1);

                setMonthlyDataMap(matrix);
                setStudentRows(studentData.map((s: any) => ({
                    id: s.id, name: s.name, studentId: s.studentId, rollNumber: s.rollNumber,
                    classId: s.classId, className: '', attendanceId: null, status: null, date: null, subject: null
                })));
            } else {
                const [teachRes, attRes] = await Promise.all([
                    api.get('/users/teachers', {
                        params: {
                            page,
                            limit,
                            search: debouncedSearch
                        }
                    }),
                    api.get('/attendance/teacher', { params: { startDate, endDate } })
                ]);

                const matrix: Record<string, Record<string, any>> = {};
                const teacherAttData = Array.isArray(attRes.data) ? attRes.data : [];
                teacherAttData.forEach((a: any) => {
                    const d = a.date.split('T')[0];
                    const tid = a.teacherId || a.teacherid;
                    if (tid) {
                        if (!matrix[tid]) matrix[tid] = {};
                        matrix[tid][d] = a;
                    }
                });

                const teacherData = teachRes.data.teachers || [];
                setTotalCount(teachRes.data.total || 0);
                setTotalPages(teachRes.data.totalPages || 1);

                setMonthlyDataMap(matrix);
                setTeacherRows(teacherData.map((t: any) => ({
                    id: t.id, name: t.name, teacherId: t.teacherId, attendanceId: null, status: null, date: null, reason: null, designation: t.designation
                })));
            }
        } catch (err: any) {
            console.error('Monthly fetch error:', err);
            showToast('Failed to load monthly data.', 'error');
        } finally {
        }
    }, [viewMode, tab, monthFilter, selectedClass, classes.length, showToast, page, limit, debouncedSearch]);

    useEffect(() => {
        setPage(1);
    }, [tab, viewMode, selectedClass, search]);

    useEffect(() => {
        if (viewMode === 'daily') {
            if (tab === 'students') fetchStudentData();
            else fetchTeacherData();
        } else {
            fetchMonthlyData();
        }
    }, [tab, viewMode, dateFilter, monthFilter, selectedClass, fetchStudentData, fetchTeacherData, fetchMonthlyData]);

    // Live real-time updates
    useServerEvents({
        'attendance:updated': () => {
            fetchMonthlyData();
            if (viewMode === 'daily') {
                if (tab === 'students') fetchStudentData();
                else fetchTeacherData();
            }
        }
    });


    // Filtered rows
    const filteredStudents = studentRows;

    const filteredTeachers = teacherRows;

    const totalRows = totalCount;
    const presentCount = tab === 'students'
        ? filteredStudents.filter(r => r.status === 'PRESENT').length
        : filteredTeachers.filter(r => r.status === 'PRESENT').length;
    const noRecordCount = tab === 'students'
        ? filteredStudents.filter(r => !r.status).length
        : filteredTeachers.filter(r => !r.status).length;

    const inputStyle: React.CSSProperties = {
        padding: '10px 14px', border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-md)', fontSize: '0.875rem',
        background: 'var(--bg-card)', outline: 'none', cursor: 'pointer'
    };

    return (
        <div className="manage-section">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ClipboardCheck size={22} color="var(--primary-bold)" />
                </div>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main)' }}>Attendance Registry</h2>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>View and edit attendance for all students and teachers — everyone is shown even with no record</p>
                </div>

                <button
                    onClick={handleToggleOverride}
                    disabled={togglingOverride}
                    style={{
                        marginLeft: 'auto',
                        padding: '10px 20px',
                        borderRadius: '12px',
                        border: `1px solid ${attendanceStatus === 'OPEN' ? '#22c55e' :
                            attendanceStatus === 'CLOSED' ? '#ef4444' :
                                'var(--border-soft)'
                            }`,
                        background:
                            attendanceStatus === 'OPEN' ? '#22c55e10' :
                                attendanceStatus === 'CLOSED' ? '#ef444410' :
                                    'var(--bg-card)',
                        color:
                            attendanceStatus === 'OPEN' ? '#22c55e' :
                                attendanceStatus === 'CLOSED' ? '#ef4444' :
                                    'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                >
                    {attendanceStatus === 'OPEN' && <ShieldCheck size={18} />}
                    {attendanceStatus === 'CLOSED' && <ShieldAlert size={18} />}
                    {attendanceStatus === 'AUTO' && <Clock size={18} />}
                    {attendanceStatus === 'AUTO' && 'System: AUTO (8AM-5PM)'}
                    {attendanceStatus === 'OPEN' && 'System: FORCE OPEN'}
                    {attendanceStatus === 'CLOSED' && 'System: FORCE CLOSED'}
                </button>
            </div>

            {/* Summary badges */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {[
                    { label: 'Total', value: totalRows, color: 'var(--primary-bold)' },
                    { label: 'Present', value: presentCount, color: '#22c55e' },
                    { label: 'No Record', value: noRecordCount, color: '#94a3b8' },
                ].map(b => (
                    <div key={b.label} style={{
                        padding: '6px 16px', borderRadius: '20px',
                        background: 'var(--bg-card)', border: `1px solid ${b.color}30`,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
                    }}>
                        <span style={{ fontWeight: '800', color: b.color, marginRight: '6px' }}>{b.value}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>{b.label}</span>
                    </div>
                ))}
            </div>

            {/* Tabs & View Mode */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-main)', padding: '6px', borderRadius: 'var(--radius-md)' }}>
                    {(['students', 'teachers', 'staff'] as const).map(t => (
                        <button key={t} onClick={() => { setTab(t); setSearch(''); setSelectedClass(''); }}
                            style={{
                                padding: '8px 20px', borderRadius: 'calc(var(--radius-md) - 4px)',
                                border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem',
                                background: tab === t ? 'var(--bg-card)' : 'transparent',
                                color: tab === t ? 'var(--primary-bold)' : 'var(--text-muted)',
                                boxShadow: tab === t ? 'var(--shadow-sm)' : 'none',
                                display: 'flex', alignItems: 'center', gap: '6px'
                            }}>
                            {t === 'students' ? <Users size={15} /> : <UserCheck size={15} />}
                            {t === 'students' ? 'Students' : t === 'teachers' ? 'Teachers' : 'Staff'}
                        </button>
                    ))}
                </div>

                <div style={{ borderLeft: '2px solid var(--border-soft)', height: '24px' }} />

                <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-main)', padding: '6px', borderRadius: 'var(--radius-md)' }}>
                    <button onClick={() => setViewMode('daily')}
                        style={{
                            padding: '8px 20px', borderRadius: 'calc(var(--radius-md) - 4px)',
                            border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem',
                            background: viewMode === 'daily' ? 'var(--bg-card)' : 'transparent',
                            color: viewMode === 'daily' ? 'var(--primary-bold)' : 'var(--text-muted)',
                            boxShadow: viewMode === 'daily' ? 'var(--shadow-sm)' : 'none',
                        }}>
                        Daily Logging
                    </button>
                    <button onClick={() => setViewMode('monthly')}
                        style={{
                            padding: '8px 20px', borderRadius: 'calc(var(--radius-md) - 4px)',
                            border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem',
                            background: viewMode === 'monthly' ? 'var(--bg-card)' : 'transparent',
                            color: viewMode === 'monthly' ? 'var(--primary-bold)' : 'var(--text-muted)',
                            boxShadow: viewMode === 'monthly' ? 'var(--shadow-sm)' : 'none',
                        }}>
                        Monthly Overview
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px', alignItems: 'center' }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input type="text"
                        placeholder={tab === 'students' ? 'Search name, ID or roll number...' : 'Search teacher name or ID...'}
                        value={search} onChange={e => setSearch(e.target.value)}
                        style={{ ...inputStyle, width: '100%', paddingLeft: '38px', boxSizing: 'border-box' }}
                    />
                </div>

                {/* Date/Month filter */}
                {viewMode === 'daily' ? (
                    <div style={{ position: 'relative' }}>
                        <CalendarDays size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <input type="date" value={dateFilter}
                            min="2026-01-01"
                            onChange={e => {
                                const val = e.target.value;
                                if (val && val < '2026-01-01') {
                                    setDateFilter('2026-01-01');
                                } else {
                                    setDateFilter(val);
                                }
                            }}
                            style={{ ...inputStyle, paddingLeft: '36px', width: '160px' }} />
                    </div>
                ) : (
                    <div style={{ position: 'relative' }}>
                        <CalendarDays size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <input type="month" value={monthFilter}
                            min="2026-01"
                            onChange={e => {
                                const val = e.target.value;
                                if (val && val < '2026-01') {
                                    setMonthFilter('2026-01');
                                } else {
                                    setMonthFilter(val);
                                }
                            }}
                            style={{ ...inputStyle, paddingLeft: '36px', width: '160px' }} />
                    </div>
                )}

                {/* Class filter (students only) */}
                {tab === 'students' && (
                    <div style={{ width: '220px' }}>
                        <CustomSelect
                            value={selectedClass}
                            onChange={val => setSelectedClass(val)}
                            options={[
                                ...(viewMode === 'daily' ? [{ value: '', label: 'All Classes' }] : []),
                                ...classes.map((c: any) => ({ value: c.id, label: c.name }))
                            ]}
                            icon={<School size={16} />}
                            placeholder="Select Class"
                        />
                    </div>
                )}

                {viewMode === 'daily' && dateFilter && (
                    <button onClick={() => setDateFilter('')} style={{
                        padding: '8px 14px', background: '#fee2e2', border: 'none',
                        borderRadius: 'var(--radius-md)', cursor: 'pointer', color: '#dc2626',
                        fontWeight: '600', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                        <X size={13} /> Clear Date
                    </button>
                )}

                {viewMode === 'daily' && dateFilter && tab === 'students' && (
                    <button
                        onClick={handleBulkMarkAbsent}
                        disabled={markingBulkAbsent}
                        style={{
                            padding: '8px 16px',
                            background: '#ef4444',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            color: 'white',
                            fontWeight: '700',
                            fontSize: '0.82rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#dc2626'}
                        onMouseLeave={e => e.currentTarget.style.background = '#ef4444'}
                    >
                        {markingBulkAbsent ? (
                            <div className="animate-spin" style={{ width: '14px', height: '14px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
                        ) : (
                            <Users size={14} />
                        )}
                        Mark {selectedClass ? 'Class' : 'Everyone'} Absent (Non Academic Days)
                    </button>
                )}
            </div>

            {/* Table Container */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-soft)',
                boxShadow: 'var(--shadow-sm)',
                overflow: 'hidden',
                position: 'relative',
                minHeight: '400px'
            }}>
                {/* Table Header/Body */}
                {isLoading && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(2px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
                    }}>
                        <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid var(--primary-bold)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
                    </div>
                )}
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr style={{ background: 'var(--bg-main)', borderBottom: '2px solid var(--border-soft)' }}>
                                {tab === 'students' ? (
                                    <>
                                        <th style={thStyle}>Student</th>
                                        <th style={thStyle}>Roll #</th>
                                        <th style={thStyle}>Class</th>
                                        {viewMode === 'daily' && <th style={thStyle}>Attendance Stats</th>}
                                    </>
                                ) : (
                                    <>
                                        <th style={thStyle}>Teacher/Staff</th>
                                        <th style={thStyle}>Arrival</th>
                                        <th style={thStyle}>Departure</th>
                                    </>
                                )}
                                <th style={thStyle}>
                                    {viewMode === 'daily'
                                        ? (dateFilter ? `Status on ${new Date(dateFilter).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : 'Attendance Status')
                                        : 'Monthly Summary'
                                    }
                                </th>
                                {tab !== 'students' && <th style={thStyle}>Leave Info</th>}
                            </tr>
                        </thead>
                        <tbody key={page} className="animate-fade-in">
                            {(tab === 'students' ? filteredStudents : filteredTeachers).length > 0 ?
                                (tab === 'students' ? filteredStudents : filteredTeachers).map((row: any) => (
                                    tab === 'students' ? (
                                        <StudentAttendanceRow
                                            key={row.id}
                                            row={row}
                                            viewMode={viewMode}
                                            dateFilter={dateFilter}
                                            monthlyDataMap={monthlyDataMap}
                                            onRefresh={refreshStudentView}
                                            stats={attendanceStats[row.id]}
                                            isStatsLoading={isStatsLoading}
                                        />
                                    ) : (
                                        <TeacherAttendanceRow
                                            key={row.id}
                                            row={row}
                                            viewMode={viewMode}
                                            dateFilter={dateFilter}
                                            monthlyDataMap={monthlyDataMap}
                                            fetchTeacherData={fetchTeacherData}
                                            tab={tab}
                                        />
                                    )
                                )) : (
                                    <tr>
                                        <td colSpan={tab === 'students' ? 4 : 5} style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                                <Users size={48} style={{ opacity: 0.1 }} />
                                                <div>
                                                    <p style={{ fontWeight: '600', fontSize: '1.1rem', margin: 0 }}>No records matches your criteria</p>
                                                    <p style={{ fontSize: '0.85rem', margin: '4px 0 0' }}>Try adjusting your filters or search query</p>
                                                </div>
                                            </div>
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

            <p style={{ margin: '16px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                Showing {totalCount} {tab === 'students' ? 'student' : 'teacher'}{totalCount !== 1 ? 's' : ''}
                {dateFilter ? ` · ${new Date(dateFilter).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}` : ' · All dates'}
            </p>
        </div>
    );
};

export default ManageAttendance;