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
import axios from 'axios';
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
    ChevronRight,
    Loader2
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

const StatusBadge = React.memo(({ status }: { status: AttendanceStatus | null }) => {
    const displayStatus = status || 'PRESENT';
    return (
        <span style={{
            padding: '3px 12px', borderRadius: '20px',
            background: STATUS_COLORS[displayStatus] + '20',
            color: STATUS_COLORS[displayStatus],
            fontWeight: '700', fontSize: '0.78rem',
            border: `1px solid ${STATUS_COLORS[displayStatus]}40`
        }}>
            {displayStatus}
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
    const [editing, setEditing] = useState(false);
    const [status, setStatus] = useState<AttendanceStatus | ''>(currentStatus || '');
    const [reason, setReason] = useState(initialReason || '');
    const { showToast } = useToast();

    useEffect(() => {
        if (!editing) {
            setStatus(currentStatus || '');
            setReason(initialReason || '');
        }
    }, [currentStatus, initialReason, editing]);

    const save = async () => {
        if (!status) {
            showToast('Please select a valid status', 'error');
            return;
        }
        if (type === 'teacher' && status === 'ABSENT' && !reason.trim()) {
            showToast('Please provide an absent reason for the teacher.', 'error');
            return;
        }
        try {
            if (attendanceId) {
                const endpoint = type === 'student'
                    ? `/attendance/admin/student/${attendanceId}`
                    : `/attendance/admin/teacher/${attendanceId}`;
                await api.patch(endpoint, type === 'teacher' ? { status, reason } : { status });
            } else {
                if (type === 'student') {
                    await api.post('/attendance/student', {
                        date, status, studentId: personId,
                        classId: classId || '', subject: 'Full Day Record'
                    });
                } else {
                    await api.post('/attendance/teacher', { date, status, reason, teacherId: personId });
                }
            }
            showToast('Attendance updated!', 'success');
            setEditing(false);
            onUpdated(true);
        } catch {
            showToast('Failed to update attendance.', 'error');
        }
    };

    if (!editing) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <StatusBadge status={currentStatus} />
                    <button onClick={() => setEditing(true)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', padding: '2px', display: 'flex'
                    }} title="Edit">
                        <Pencil size={14} />
                    </button>
                </div>
                {type === 'teacher' && currentStatus === 'ABSENT' && reason && (
                    <span style={{ fontSize: '0.75rem', color: '#ef4444', background: 'var(--bg-main)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        {reason}
                    </span>
                )}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CustomSelect
                value={status}
                onChange={val => setStatus(val as AttendanceStatus)}
                options={[
                    { value: 'PRESENT', label: 'PRESENT', color: '#22c55e' },
                    { value: 'ABSENT', label: 'ABSENT', color: '#ef4444' }
                ]}
                placeholder="Status"
                size="sm"
                className="compact-status-select"
                containerStyle={{ width: '140px' }}
            />
            {type === 'teacher' && status === 'ABSENT' && (
                <input
                    type="text"
                    placeholder="Reason..."
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    style={{
                        border: '1px solid var(--border-soft)', borderRadius: '6px',
                        padding: '4px 8px', fontSize: '0.82rem', width: '120px'
                    }}
                />
            )}
            <button onClick={save} style={{ background: '#22c55e', border: 'none', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer', color: 'white', display: 'flex' }}>
                <Check size={14} />
            </button>
            <button onClick={() => { setStatus(currentStatus || ''); setReason(initialReason || ''); setEditing(false); }} style={{ background: '#ef4444', border: 'none', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer', color: 'white', display: 'flex' }}>
                <X size={14} />
            </button>
        </div>
    );
});

const MonthlySummaryDisplay = React.memo(({ personId, dataMap }: { personId: string; dataMap: Record<string, Record<string, any>> }) => {
    const records = dataMap[personId] || {};
    const days = Object.values(records);
    const absent = days.filter((r: any) => r.status === 'ABSENT').length;
    const present = days.filter((r: any) => r.status === 'PRESENT').length;

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
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-main)', padding: '2px 8px', borderRadius: '4px' }}>
                {days.length} markings
            </span>
        </div>
    );
});

const StudentAttendanceRow = React.memo(({
    row,
    viewMode,
    dateFilter,
    monthlyDataMap,
    fetchStudentData
}: {
    row: StudentRow,
    viewMode: 'daily' | 'monthly',
    dateFilter: string,
    monthlyDataMap: any,
    fetchStudentData: any
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
                            onUpdated={fetchStudentData}
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
                {row.arrivalTime || '—'}
            </td>
            <td style={{ padding: '14px 20px', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '600' }}>
                {row.departureTime || '—'}
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
    const [loading, setLoading] = useState(false);
    const [attendanceStatus, setAttendanceStatus] = useState<'AUTO' | 'OPEN' | 'CLOSED'>('AUTO');
    const [togglingOverride, setTogglingOverride] = useState(false);

    // Pagination state
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const limit = 20;

    // Student state
    const [studentRows, setStudentRows] = useState<StudentRow[]>([]);
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

    // Use SSE for real-time sync
    useServerEvents({
        'system:config_updated': (data: any) => {
            if (data.key === 'attendance_override') {
                setAttendanceStatus(data.value);
            }
        }
    });

    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState('');

    // Teacher state
    const [teacherRows, setTeacherRows] = useState<TeacherRow[]>([]);

    // Shared
    const [dateFilter, setDateFilter] = useState(new Date().toLocaleDateString('en-CA'));
    const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [search, setSearch] = useState('');

    // ── Fetch students + attendance for date ──────────────────────────────
    const fetchStudentData = useCallback(async (silent = false) => {
        if (viewMode !== 'daily') return;
        if (!silent) setLoading(true);
        try {
            const [stuRes, attRes, clsRes] = await Promise.all([
                api.get('/users/students', {
                    params: {
                        page,
                        limit,
                        classId: selectedClass,
                        search: search
                    }
                }),
                api.get('/attendance/student', {
                    params: dateFilter ? { startDate: dateFilter, endDate: dateFilter } : {}
                }),
                api.get('/users/classes'),
            ]);

            setClasses(clsRes.data);

            // Build a map: studentId → attendance record for the selected date
            const attMap: Record<string, any> = {};
            const attRecords = Array.isArray(attRes.data) ? attRes.data : (attRes.data.records || []);
            attRecords.forEach((a: any) => {
                // Ensure we keep the newest record if multiple are returned (e.g. when All Dates is selected)
                if (!attMap[a.studentId]) attMap[a.studentId] = a;
            });

            // Get class name lookup
            const classMap: Record<string, string> = {};
            clsRes.data.forEach((c: any) => { classMap[c.id] = c.name; });

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
                    status: att?.status || 'PRESENT',
                    date: att?.date || null,
                    subject: att?.subject || null,
                };
            });

            setStudentRows(rows);
        } catch (err: any) {
            if (axios.isCancel(err)) return;
            console.error('Error loading student data:', err);
            showToast('Failed to load student data.', 'error');
        } finally {
            setLoading(false);
        }
    }, [dateFilter, viewMode, showToast, page, limit, selectedClass, search]);

    // ── Fetch teachers + attendance for date ──────────────────────────────
    const fetchTeacherData = useCallback(async (silent = false) => {
        if (viewMode !== 'daily') return;
        if (!silent) setLoading(true);
        try {
            const [teachRes, attRes] = await Promise.all([
                api.get('/users/teachers', {
                    params: {
                        page,
                        limit,
                        search: search,
                        filter: tab === 'teachers' ? 'teachers' : (tab === 'staff' ? 'staff' : '')
                    }
                }),
                api.get('/attendance/teacher', {
                    params: dateFilter ? { startDate: dateFilter, endDate: dateFilter } : {}
                }),
            ]);

            const attMap: Record<string, any> = {};
            attRes.data.forEach((a: any) => {
                attMap[a.teacherId] = a;
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
                    status: att?.status || 'PRESENT',
                    date: att?.date || null,
                    reason: att?.reason || null,
                    arrivalTime: att?.arrivalTime || null,
                    departureTime: att?.departureTime || null,
                    earlyLeaveReason: att?.earlyLeaveReason || null,
                    designation: t.designation
                };
            });

            setTeacherRows(rows);
        } catch (err: any) {
            if (axios.isCancel(err)) return;
            showToast('Failed to load teacher data.', 'error');
        } finally {
            setLoading(false);
        }
    }, [dateFilter, viewMode, showToast, page, limit, search]);

    // ── Fetch Monthly Data ────────────────────────────────────────────────────
    const [monthlyDataMap, setMonthlyDataMap] = useState<Record<string, Record<string, any>>>({}); // personId -> { dateStr -> record }

    const fetchMonthlyData = useCallback(async (silent = false) => {
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

        if (!silent) setLoading(true);
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
                            search: search
                        }
                    }),
                    api.get('/attendance/student', { params: { classId: selectedClass, startDate, endDate } })
                ]);

                // Map records
                const matrix: Record<string, Record<string, any>> = {};
                const attRecords = Array.isArray(attRes.data) ? attRes.data : (attRes.data.records || []);
                attRecords.forEach((a: any) => {
                    const d = a.date.split('T')[0];
                    if (!matrix[a.studentId]) matrix[a.studentId] = {};
                    matrix[a.studentId][d] = a;
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
                            search: search
                        }
                    }),
                    api.get('/attendance/teacher', { params: { startDate, endDate } })
                ]);

                const matrix: Record<string, Record<string, any>> = {};
                const teacherAttData = Array.isArray(attRes.data) ? attRes.data : [];
                teacherAttData.forEach((a: any) => {
                    const d = a.date.split('T')[0];
                    if (!matrix[a.teacherId]) matrix[a.teacherId] = {};
                    matrix[a.teacherId][d] = a;
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
            if (!silent) setLoading(false);
        }
    }, [viewMode, tab, monthFilter, selectedClass, classes.length, showToast, page, limit, search]);

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
            fetchMonthlyData(true);
            if (viewMode === 'daily') {
                if (tab === 'students') fetchStudentData(true);
                else fetchTeacherData(true);
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
                        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
                            style={{ ...inputStyle, paddingLeft: '36px', width: '160px' }} />
                    </div>
                ) : (
                    <div style={{ position: 'relative' }}>
                        <CalendarDays size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
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
                        <X size={13} /> All Dates
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
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-main)', borderBottom: '2px solid var(--border-soft)' }}>
                                {tab === 'students' ? (
                                    <>
                                        <th style={thStyle}>Student</th>
                                        <th style={thStyle}>Roll #</th>
                                        <th style={thStyle}>Class</th>
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
                        <tbody>
                            {!loading && (tab === 'students' ? filteredStudents : filteredTeachers).map((row: any) => (
                                tab === 'students' ? (
                                    <StudentAttendanceRow
                                        key={row.id}
                                        row={row}
                                        viewMode={viewMode}
                                        dateFilter={dateFilter}
                                        monthlyDataMap={monthlyDataMap}
                                        fetchStudentData={fetchStudentData}
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
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Empty State */}
                {!loading && (tab === 'students' ? filteredStudents.length === 0 : filteredTeachers.length === 0) && (
                    <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Users size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
                        <p style={{ fontWeight: '600', fontSize: '1.1rem' }}>No records matches your criteria</p>
                        <p style={{ fontSize: '0.85rem' }}>Try adjusting your filters or search query</p>
                    </div>
                )}

                {/* Loading Overlay */}
                {loading && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(2px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <Loader2 className="animate-spin" size={32} color="var(--primary-bold)" />
                            <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--primary-bold)' }}>Syncing Records...</span>
                        </div>
                    </div>
                )}

                {/* Pagination Footer */}
                {!loading && totalPages > 1 && (
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
