import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import useServerEvents from '../../hooks/useServerEvents';
import {
    ClipboardCheck,
    Search,
    Pencil,
    Check,
    X,
    Users,
    UserCheck,
    ChevronDown,
    CalendarDays,
    AlertCircle
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
    // Attendance for the selected date
    attendanceId: string | null;
    status: AttendanceStatus | null;
    date: string | null;
}

const STATUS_COLORS: Record<AttendanceStatus, string> = {
    PRESENT: '#22c55e',
    ABSENT: '#ef4444',
};

const StatusBadge = ({ status }: { status: AttendanceStatus | null }) => {
    if (!status) return (
        <span style={{
            padding: '3px 12px', borderRadius: '20px',
            background: '#f1f5f9', color: '#94a3b8',
            fontWeight: '600', fontSize: '0.78rem',
            border: '1px dashed #cbd5e1', display: 'inline-flex', alignItems: 'center', gap: '4px'
        }}>
            <AlertCircle size={11} /> No Record
        </span>
    );
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
};

const InlineStatusEdit = ({
    attendanceId, currentStatus, type, personId, date, classId,
    onUpdated
}: {
    attendanceId: string | null;
    currentStatus: AttendanceStatus | null;
    type: 'student' | 'teacher';
    personId: string;
    date: string;
    classId?: string;
    onUpdated: () => void;
}) => {
    const [editing, setEditing] = useState(false);
    const [status, setStatus] = useState<AttendanceStatus | ''>(currentStatus || '');
    const { showToast } = useToast();

    const save = async () => {
        if (!status) {
            showToast('Please select a valid status', 'error');
            return;
        }
        try {
            if (attendanceId) {
                const endpoint = type === 'student'
                    ? `/attendance/admin/student/${attendanceId}`
                    : `/attendance/admin/teacher/${attendanceId}`;
                await api.patch(endpoint, { status });
            } else {
                if (type === 'student') {
                    await api.post('/attendance/student', {
                        date, status, studentId: personId,
                        classId: classId || '', subject: 'Full Day Record'
                    });
                } else {
                    await api.post('/attendance/teacher', { date, status });
                }
            }
            showToast('Attendance updated!', 'success');
            setEditing(false);
            onUpdated();
        } catch {
            showToast('Failed to update attendance.', 'error');
        }
    };

    if (!editing) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <StatusBadge status={currentStatus} />
                <button onClick={() => setEditing(true)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', padding: '2px', display: 'flex'
                }} title="Edit">
                    <Pencil size={14} />
                </button>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <select
                value={status}
                onChange={e => setStatus(e.target.value as AttendanceStatus)}
                style={{
                    border: '1px solid var(--border-soft)', borderRadius: '6px',
                    padding: '4px 8px', fontSize: '0.82rem', fontWeight: '600',
                    background: 'white', color: status ? STATUS_COLORS[status as AttendanceStatus] : 'var(--text-muted)', cursor: 'pointer'
                }}
            >
                <option value="" disabled>Select Status</option>
                <option value="PRESENT">PRESENT</option>
                <option value="ABSENT">ABSENT</option>
            </select>
            <button onClick={save} style={{ background: '#22c55e', border: 'none', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer', color: 'white', display: 'flex' }}>
                <Check size={14} />
            </button>
            <button onClick={() => { setStatus(currentStatus || ''); setEditing(false); }} style={{ background: '#ef4444', border: 'none', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer', color: 'white', display: 'flex' }}>
                <X size={14} />
            </button>
        </div>
    );
};

const thStyle: React.CSSProperties = {
    padding: '13px 20px', textAlign: 'left', fontSize: '0.72rem',
    fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em'
};

const ManageAttendance = () => {
    const { showToast } = useToast();
    const [tab, setTab] = useState<'students' | 'teachers'>('students');
    const [loading, setLoading] = useState(false);

    // Student state
    const [studentRows, setStudentRows] = useState<StudentRow[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState('');

    // Teacher state
    const [teacherRows, setTeacherRows] = useState<TeacherRow[]>([]);

    // Shared
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
    const [search, setSearch] = useState('');

    // ── Fetch students + attendance for date ──────────────────────────────
    const fetchStudentData = useCallback(async () => {
        setLoading(true);
        try {
            const [stuRes, attRes, clsRes] = await Promise.all([
                api.get('/users/students'),
                api.get('/attendance/student', {
                    params: dateFilter ? { startDate: dateFilter, endDate: dateFilter } : {}
                }),
                api.get('/users/classes'),
            ]);

            setClasses(clsRes.data);

            // Build a map: studentId → attendance record for the selected date
            const attMap: Record<string, any> = {};
            attRes.data.forEach((a: any) => {
                attMap[a.studentId] = a;
            });

            // Get class name lookup
            const classMap: Record<string, string> = {};
            clsRes.data.forEach((c: any) => { classMap[c.id] = c.name; });

            const rows: StudentRow[] = stuRes.data.map((s: any) => {
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
        } catch {
            showToast('Failed to load student data.', 'error');
        } finally {
            setLoading(false);
        }
    }, [dateFilter]);

    // ── Fetch teachers + attendance for date ──────────────────────────────
    const fetchTeacherData = useCallback(async () => {
        setLoading(true);
        try {
            const [teachRes, attRes] = await Promise.all([
                api.get('/users/teachers'),
                api.get('/attendance/teacher', {
                    params: dateFilter ? { startDate: dateFilter, endDate: dateFilter } : {}
                }),
            ]);

            const attMap: Record<string, any> = {};
            attRes.data.forEach((a: any) => {
                attMap[a.teacherId] = a;
            });

            const rows: TeacherRow[] = teachRes.data.map((t: any) => {
                const att = attMap[t.id] || null;
                return {
                    id: t.id,
                    name: t.name,
                    teacherId: t.teacherId,
                    attendanceId: att?.id || null,
                    status: att?.status || null,
                    date: att?.date || null,
                };
            });

            setTeacherRows(rows);
        } catch {
            showToast('Failed to load teacher data.', 'error');
        } finally {
            setLoading(false);
        }
    }, [dateFilter]);

    useEffect(() => {
        if (tab === 'students') fetchStudentData();
        else fetchTeacherData();
    }, [tab, dateFilter, fetchStudentData, fetchTeacherData]);

    // Live SSE updates
    useServerEvents({
        'attendance:updated': () => {
            if (tab === 'students') fetchStudentData();
            else fetchTeacherData();
        }
    });

    // Filtered rows
    const filteredStudents = studentRows.filter(r => {
        const matchClass = !selectedClass || r.classId === selectedClass;
        const matchSearch = !search ||
            r.name.toLowerCase().includes(search.toLowerCase()) ||
            r.studentId.toLowerCase().includes(search.toLowerCase()) ||
            r.rollNumber.toLowerCase().includes(search.toLowerCase());
        return matchClass && matchSearch;
    });

    const filteredTeachers = teacherRows.filter(r =>
        !search ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.teacherId.toLowerCase().includes(search.toLowerCase())
    );

    const totalRows = tab === 'students' ? filteredStudents.length : filteredTeachers.length;
    const presentCount = tab === 'students'
        ? filteredStudents.filter(r => r.status === 'PRESENT').length
        : filteredTeachers.filter(r => r.status === 'PRESENT').length;
    const noRecordCount = tab === 'students'
        ? filteredStudents.filter(r => !r.status).length
        : filteredTeachers.filter(r => !r.status).length;

    const inputStyle: React.CSSProperties = {
        padding: '10px 14px', border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-md)', fontSize: '0.875rem',
        background: 'white', outline: 'none', cursor: 'pointer'
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
                        background: 'white', border: `1px solid ${b.color}30`,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
                    }}>
                        <span style={{ fontWeight: '800', color: b.color, marginRight: '6px' }}>{b.value}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>{b.label}</span>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '6px', borderRadius: 'var(--radius-md)', width: 'fit-content', marginBottom: '24px' }}>
                {(['students', 'teachers'] as const).map(t => (
                    <button key={t} onClick={() => { setTab(t); setSearch(''); setSelectedClass(''); }}
                        style={{
                            padding: '8px 20px', borderRadius: 'calc(var(--radius-md) - 4px)',
                            border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem',
                            background: tab === t ? 'white' : 'transparent',
                            color: tab === t ? 'var(--primary-bold)' : 'var(--text-muted)',
                            boxShadow: tab === t ? 'var(--shadow-sm)' : 'none',
                            display: 'flex', alignItems: 'center', gap: '6px'
                        }}>
                        {t === 'students' ? <Users size={15} /> : <UserCheck size={15} />}
                        {t === 'students' ? 'Students' : 'Teachers'}
                    </button>
                ))}
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

                {/* Date filter */}
                <div style={{ position: 'relative' }}>
                    <CalendarDays size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
                        style={{ ...inputStyle, paddingLeft: '36px' }} />
                </div>

                {/* Class filter (students only) */}
                {tab === 'students' && (
                    <div style={{ position: 'relative' }}>
                        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                            style={{ ...inputStyle, paddingRight: '32px', appearance: 'none', fontWeight: '600', color: selectedClass ? 'var(--text-main)' : 'var(--text-muted)' }}>
                            <option value="">All Classes</option>
                            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
                    </div>
                )}

                {dateFilter && (
                    <button onClick={() => setDateFilter('')} style={{
                        padding: '8px 14px', background: '#fee2e2', border: 'none',
                        borderRadius: 'var(--radius-md)', cursor: 'pointer', color: '#dc2626',
                        fontWeight: '600', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px'
                    }}>
                        <X size={13} /> All Dates
                    </button>
                )}
            </div>

            {/* Table */}
            <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-soft)', boxShadow: 'var(--shadow-sm)', overflowX: 'auto' }}>
                {loading ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <ClipboardCheck size={32} style={{ marginBottom: '12px', opacity: 0.4 }} />
                        <p>Loading...</p>
                    </div>
                ) : tab === 'students' ? (
                    filteredStudents.length === 0 ? (
                        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <Users size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                            <p style={{ fontWeight: '600' }}>No students found</p>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border-soft)' }}>
                                    <th style={thStyle}>Student</th>
                                    <th style={thStyle}>Roll #</th>
                                    <th style={thStyle}>Class</th>
                                    <th style={thStyle}>{dateFilter ? `Status on ${new Date(dateFilter).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : 'Attendance Status'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map((row, idx) => (
                                    <tr key={row.id}
                                        style={{ borderBottom: idx < filteredStudents.length - 1 ? '1px solid var(--border-soft)' : 'none', transition: 'background 0.15s' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
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
                                            {dateFilter ? (
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
                                                <StatusBadge status={row.status} />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )
                ) : (
                    filteredTeachers.length === 0 ? (
                        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <UserCheck size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                            <p style={{ fontWeight: '600' }}>No teachers found</p>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border-soft)' }}>
                                    <th style={thStyle}>Teacher</th>
                                    <th style={thStyle}>{dateFilter ? `Status on ${new Date(dateFilter).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : 'Attendance Status'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTeachers.map((row, idx) => (
                                    <tr key={row.id}
                                        style={{ borderBottom: idx < filteredTeachers.length - 1 ? '1px solid var(--border-soft)' : 'none', transition: 'background 0.15s' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                                        <td style={{ padding: '14px 20px' }}>
                                            <p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-main)' }}>{row.name}</p>
                                            <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{row.teacherId}</p>
                                        </td>
                                        <td style={{ padding: '14px 20px' }}>
                                            {dateFilter ? (
                                                <InlineStatusEdit
                                                    attendanceId={row.attendanceId}
                                                    currentStatus={row.status}
                                                    type="teacher"
                                                    personId={row.id}
                                                    date={dateFilter}
                                                    onUpdated={fetchTeacherData}
                                                />
                                            ) : (
                                                <StatusBadge status={row.status} />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )
                )}
            </div>

            <p style={{ margin: '12px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                Showing {totalRows} {tab === 'students' ? 'student' : 'teacher'}{totalRows !== 1 ? 's' : ''}
                {dateFilter ? ` · ${new Date(dateFilter).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}` : ' · All dates'}
            </p>
        </div>
    );
};

export default ManageAttendance;
