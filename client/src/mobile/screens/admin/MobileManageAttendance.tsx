import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Loader2, Search,
    ShieldCheck, ShieldAlert, Clock,
    ChevronRight, ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { useDebounce } from '../../../hooks/useDebounce';
import useServerEvents from '../../../hooks/useServerEvents';

type AttendanceStatus = 'PRESENT' | 'ABSENT';

interface StudentRow {
    id: string;
    name: string;
    studentId: string;
    rollNumber: string;
    classId: string;
    className: string;
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
    designation: string;
}

const MonthlyStrip = ({ personId, dataMap, totalSessions = 0, type = 'student', sessionDates = [] }: { personId: string, dataMap: Record<string, Record<string, any>>, totalSessions?: number, type?: 'student' | 'teacher', sessionDates?: string[] }) => {
    const dayCount = 31; // Consistent grid size
    const cells = [];
    const personData = dataMap[personId] || {};

    const records = Object.values(personData);
    const absentCount = records.filter((r: any) => r.status === 'ABSENT').length;

    /**
     * WEB CONCEPT MATCHING:
     * Student: present = totalSessions - absent (Virtual Presence)
     * Teacher: present = explicit PRESENT records count
     */
    const present = type === 'student' ? (totalSessions - absentCount) : records.filter((r: any) => r.status === 'PRESENT').length;
    
    // Sort session dates to show in order
    const sortedSessions = [...sessionDates].sort();

    // To match web exactly, we cap the sessions shown to totalSessions if it's authoritative
    // and ensure dots match the count.
    const displaySessions = sortedSessions.slice(0, Math.max(totalSessions, 0));

    for (let i = 1; i <= dayCount; i++) {
        if (i <= displaySessions.length) {
            const dateStr = displaySessions[i - 1];
            const record = personData[dateStr];
            const status = record?.status;

            // Virtual Presence for dots: for students, assume present if not marked absent
            const isEssentiallyPresent = type === 'teacher' ? (status === 'PRESENT') : (status !== 'ABSENT');

            cells.push(
                <div
                    key={i}
                    style={{
                        width: '10px', height: '10px', borderRadius: '3px',
                        background: isEssentiallyPresent ? '#16a34a' : status === 'ABSENT' ? '#dc2626' : 'var(--bg-main)',
                        border: isEssentiallyPresent || status === 'ABSENT' ? 'none' : '1px solid var(--border-soft)',
                        transition: 'all 0.3s ease'
                    }}
                />
            );
        } else {
            cells.push(
                <div key={i} style={{ width: '10px', height: '10px', borderRadius: '3px', border: '1px solid var(--border-soft)', opacity: 0.3 }} />
            );
        }
    }

    const denominator = Math.max(totalSessions, 1);
    const percentage = Math.round((present / denominator) * 100);

    return (
        <div style={{
            marginTop: '12px',
            padding: '12px',
            borderRadius: '16px',
            background: 'var(--bg-soft)',
            border: '1px solid var(--border-soft)',
            width: '100%'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                    <p style={{ margin: 0, fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Monthly Insight</p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', fontFamily: 'Outfit' }}>
                        {percentage}% 
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginLeft: '6px' }}>Attendance</span>
                    </p>
                </div>
                <div style={{ background: 'var(--primary-soft)', padding: '4px 10px', borderRadius: '8px', border: '1px solid var(--primary-bold)10' }}>
                    <span style={{ fontSize: '11px', fontWeight: '900', color: 'var(--primary-bold)' }}>
                        {present}/{denominator} <span style={{ fontSize: '9px', opacity: 0.7 }}>SESSIONS</span>
                    </span>
                </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '100%' }}>
                {cells}
            </div>
        </div>
    );
};

export default function MobileManageAttendance() {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [tab, setTab] = useState<'students' | 'teachers'>('students');
    const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
    const [attendanceStatus, setAttendanceStatus] = useState<'AUTO' | 'OPEN' | 'CLOSED'>('AUTO');
    const [togglingOverride, setTogglingOverride] = useState(false);

    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [classes, setClasses] = useState<any[]>([]);

    // Data
    const [studentRows, setStudentRows] = useState<StudentRow[]>([]);
    const [teacherRows, setTeacherRows] = useState<TeacherRow[]>([]);
    const [monthlyDataMap, setMonthlyDataMap] = useState<Record<string, Record<string, any>>>({});
    const [totalSessions, setTotalSessions] = useState(0);
    const [sessionDates, setSessionDates] = useState<string[]>([]);

    const [dateFilter, setDateFilter] = useState(new Date().toLocaleDateString('en-CA'));
    const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const debouncedSearch = useDebounce(search, 600);
    const limit = 15;

    // --- Performance Optimization: State Locking ---
    // Used to prevent flickering when local updates and server broadcasts collide
    const pendingUpdates = useRef<Set<string>>(new Set());

    // ── Fetch Config & Classes ──
    useEffect(() => {
        const init = async () => {
            try {
                const [confRes, clsRes] = await Promise.all([
                    api.get('/attendance/config'),
                    api.get('/users/classes')
                ]);
                setAttendanceStatus(confRes.data.attendance_override);
                setClasses(clsRes.data);
            } catch (err) {
                console.error("Initialization failed", err);
            }
        };
        init();
    }, []);

    // ── Student Data Fetching ──
    const fetchStudentData = useCallback(async (silent = false) => {
        if (tab !== 'students' || viewMode !== 'daily') return;
        if (!silent) setIsLoading(true);
        try {
            const [stuRes, attRes] = await Promise.all([
                api.get('/users/students', {
                    params: { page, limit, classId: selectedClass, search }
                }),
                api.get('/attendance/student', {
                    params: { startDate: dateFilter, endDate: dateFilter }
                })
            ]);

            const attMap: Record<string, any> = {};
            const attRecords = Array.isArray(attRes.data) ? attRes.data : (attRes.data.records || []);
            attRecords.forEach((a: any) => { if (!attMap[a.studentId]) attMap[a.studentId] = a; });

            const classLookup: Record<string, string> = {};
            classes.forEach(c => classLookup[c.id] = c.name);

            setStudentRows(stuRes.data.students.map((s: any) => ({
                id: s.id, name: s.name, studentId: s.studentId, rollNumber: s.rollNumber,
                classId: s.classId, className: classLookup[s.classId] || 'Unknown',
                attendanceId: attMap[s.id]?.id || null,
                status: attMap[s.id]?.status || 'PRESENT',
                date: attMap[s.id]?.date || null,
                subject: attMap[s.id]?.subject || null
            })));
            setTotalPages(stuRes.data.totalPages);
        } catch (err) {
            showToast('Failed to load students', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [tab, viewMode, page, selectedClass, debouncedSearch, dateFilter, classes, showToast]);

    // ── Teacher Data Fetching ──
    const fetchTeacherData = useCallback(async (silent = false) => {
        if (tab !== 'teachers' || viewMode !== 'daily') return;
        if (!silent) setIsLoading(true);
        try {
            const [teachRes, attRes] = await Promise.all([
                api.get('/users/teachers', { params: { page, limit, search } }),
                api.get('/attendance/teacher', { params: { startDate: dateFilter, endDate: dateFilter } })
            ]);

            const attMap: Record<string, any> = {};
            const attRecords = Array.isArray(attRes.data) ? attRes.data : [];
            attRecords.forEach((a: any) => { if (!attMap[a.teacherId]) attMap[a.teacherId] = a; });

            setTeacherRows(teachRes.data.teachers.map((t: any) => ({
                id: t.id, name: t.name, teacherId: t.teacherId,
                attendanceId: attMap[t.id]?.id || null,
                status: attMap[t.id]?.status || 'PRESENT',
                date: attMap[t.id]?.date || null,
                reason: attMap[t.id]?.reason || null,
                arrivalTime: attMap[t.id]?.arrivalTime || null,
                departureTime: attMap[t.id]?.departureTime || null,
                designation: t.designation || 'Faculty'
            })));
            setTotalPages(teachRes.data.totalPages);
        } catch (err) {
            showToast('Failed to load faculty', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [tab, viewMode, page, debouncedSearch, dateFilter, showToast]);

    // ── Monthly Persistence (Simplified for Mobile) ──
    const fetchMonthlyData = useCallback(async (silent = false) => {
        if (viewMode !== 'monthly') return;
        if (!silent) setIsLoading(true);
        try {
            const [year, month] = monthFilter.split('-').map(Number);
            const startDate = `${monthFilter}-01`;
            const endDay = new Date(year, month, 0).getDate();
            const endDate = `${monthFilter}-${endDay.toString().padStart(2, '0')}`;

            if (tab === 'students') {
                const [stuRes, attRes] = await Promise.all([
                    api.get('/users/students', { params: { classId: selectedClass, page, limit, search } }),
                    api.get('/attendance/student', { params: { classId: selectedClass, startDate, endDate } })
                ]);
                const matrix: Record<string, Record<string, any>> = {};
                const attRecords = Array.isArray(attRes.data) ? attRes.data : (attRes.data.records || []);
                const foundDates = new Set<string>();
                attRecords.forEach((a: any) => {
                    const d = a.date.split('T')[0];
                    foundDates.add(d);
                    if (!matrix[a.studentId]) matrix[a.studentId] = {};
                    matrix[a.studentId][d] = a;
                });
                setMonthlyDataMap(matrix);
                setTotalSessions(attRes.data.totalSessions || 0);
                setSessionDates(Array.from(foundDates));
                setStudentRows(stuRes.data.students.map((s: any) => ({ ...s, className: '' })));
                setTotalPages(stuRes.data.totalPages);
            } else {
                const [teachRes, attRes] = await Promise.all([
                    api.get('/users/teachers', { params: { page, limit, search } }),
                    api.get('/attendance/teacher', { params: { startDate, endDate } })
                ]);
                const matrix: Record<string, Record<string, any>> = {};
                const teacherAttData = Array.isArray(attRes.data) ? attRes.data : [];
                const foundDates = new Set<string>();
                teacherAttData.forEach((a: any) => {
                    const d = a.date.split('T')[0];
                    foundDates.add(d);
                    if (!matrix[a.teacherId]) matrix[a.teacherId] = {};
                    matrix[a.teacherId][d] = a;
                });
                setMonthlyDataMap(matrix);
                setTotalSessions(foundDates.size);
                setSessionDates(Array.from(foundDates));
                setTeacherRows(teachRes.data.teachers.map((t: any) => ({ ...t, attendanceId: null, status: null, date: null, reason: null })));
                setTotalPages(teachRes.data.totalPages);
            }
        } catch (err) {
            showToast('Failed to load summary', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [tab, viewMode, monthFilter, selectedClass, page, debouncedSearch, showToast]);

    useEffect(() => {
        const isFirstLoad = tab === 'students' ? studentRows.length === 0 : teacherRows.length === 0;
        if (viewMode === 'daily') {
            if (tab === 'students') fetchStudentData(!isFirstLoad);
            else fetchTeacherData(!isFirstLoad);
        } else {
            fetchMonthlyData(!isFirstLoad);
        }
    }, [tab, viewMode, dateFilter, monthFilter, selectedClass, debouncedSearch, page, fetchStudentData, fetchTeacherData, fetchMonthlyData]);

    useServerEvents({
        'attendance:updated': (data: any) => {
            const dateStr = dateFilter;
            
            // OPTIMIZATION: If this app instance is currently "Locking" this ID (waiting for its own update to finish),
            // then ignore the incoming broadcast to prevent flickering.
            if (data && (pendingUpdates.current.has(data.studentId) || pendingUpdates.current.has(data.teacherId))) {
               return; 
            }

            // Optimization: If the update is for the currently viewed date, update local state immediately
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
                        if (tab === 'students') fetchStudentData(true);
                        else fetchTeacherData(true);
                    } else {
                        fetchMonthlyData(true);
                    }
                }, 300);
            }
        },
        'system:config_updated': (data) => {
            if (data.key === 'attendance_override') setAttendanceStatus(data.value);
        }
    });

    const handleMarkAttendance = async (personId: string, currentStatus: any, attId: string | null, classId?: string) => {
        const newStatus = currentStatus === 'PRESENT' ? 'ABSENT' : 'PRESENT';

        // 🛡️ LOCK: Prevent flickering by ignoring broadcasts for this ID while we update it
        pendingUpdates.current.add(personId);

        // Optimistic UI Update - Flip status instantly on screen
        if (tab === 'students') {
            setStudentRows(prev => prev.map(s => s.id === personId ? { ...s, status: newStatus } : s));
        } else {
            setTeacherRows(prev => prev.map(t => t.id === personId ? { ...t, status: newStatus } : t));
        }

        try {
            if (tab === 'students') {
                if (attId) {
                    await api.patch(`/attendance/admin/student/${attId}`, { status: newStatus });
                } else {
                    await api.post('/attendance/student', {
                        studentId: personId, date: dateFilter, status: newStatus, subject: 'FULL DAY SESSION', classId: classId || ''
                    });
                }
            } else {
                if (attId) {
                    await api.patch(`/attendance/admin/teacher/${attId}`, { status: newStatus });
                } else {
                    await api.post('/attendance/teacher', {
                        teacherId: personId, date: dateFilter, status: newStatus
                    });
                }
            }
            showToast('Status updated', 'success');
        } catch (err) {
            // Revert on error
            if (tab === 'students') {
                setStudentRows(prev => prev.map(s => s.id === personId ? { ...s, status: currentStatus } : s));
            } else {
                setTeacherRows(prev => prev.map(t => t.id === personId ? { ...t, status: currentStatus } : t));
            }
            showToast('Update failed', 'error');
        } finally {
            // UNLOCK: Give the network/broadcasts a second to settle before re-enabling sync for this ID
            setTimeout(() => {
                pendingUpdates.current.delete(personId);
            }, 1500);
        }
    };

    const handleToggleOverride = async () => {
        const states: Array<'AUTO' | 'OPEN' | 'CLOSED'> = ['AUTO', 'OPEN', 'CLOSED'];
        const nextValue = states[(states.indexOf(attendanceStatus) + 1) % 3];
        const prevValue = attendanceStatus;

        // Optimistic UI Update
        setAttendanceStatus(nextValue);
        setTogglingOverride(true);

        try {
            await api.patch('/attendance/config', { attendance_override: nextValue });
            showToast(`System set to ${nextValue}`, 'success');
        } catch (err) {
            setAttendanceStatus(prevValue);
            showToast('Operation failed', 'error');
        } finally {
            setTogglingOverride(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div onClick={() => navigate(-1)} style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', cursor: 'pointer' }}>
                    <ArrowLeft size={20} />
                </div>
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)', fontFamily: 'Outfit', margin: 0 }}>Attendance Hub</h1>
                    <p style={{ color: 'var(--text-muted)', fontWeight: '500', fontSize: '11px', margin: 0 }}>Monitor and override academy presence.</p>
                </div>
            </div>

            {/* System Override Card */}
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '16px', borderRadius: '20px', border: '1px solid var(--border-soft)', boxShadow: 'var(--shadow-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '12px',
                        background: attendanceStatus === 'OPEN' ? '#dcfce7' : attendanceStatus === 'CLOSED' ? '#fee2e2' : 'var(--primary-soft)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: attendanceStatus === 'OPEN' ? '#16a34a' : attendanceStatus === 'CLOSED' ? '#dc2626' : 'var(--primary-bold)'
                    }}>
                        {attendanceStatus === 'CLOSED' ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />}
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>SYSTEM STATUS</p>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '900', color: 'var(--text-main)' }}>Attendance is {attendanceStatus}</p>
                    </div>
                </div>
                <button
                    onClick={handleToggleOverride}
                    disabled={togglingOverride}
                    style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-soft)', color: 'var(--text-main)', fontSize: '11px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                    {togglingOverride ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />} Override
                </button>
            </div>

            {/* Attendance Navigation Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Search Bar */}
                <div style={{ position: 'relative' }}>
                    <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder={tab === 'students' ? "Search name or admission number..." : "Search name or faculty ID..."}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ width: '100%', padding: '14px 16px 14px 46px', borderRadius: '14px', border: '1px solid var(--border-soft)', background: 'var(--bg-card)', fontSize: '14px', fontWeight: '500', outline: 'none', color: 'var(--text-main)' }}
                    />
                </div>

                {/* Sub-Filters Row */}
                <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1.2, display: 'flex', background: 'var(--bg-card)', padding: '4px', borderRadius: '14px', border: '1px solid var(--border-soft)', boxShadow: 'var(--shadow-sm)' }}>
                        <button onClick={() => setViewMode('daily')} style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: '11px', background: viewMode === 'daily' ? 'var(--bg-soft)' : 'transparent', color: viewMode === 'daily' ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: '900', fontSize: '11px', letterSpacing: '0.5px', transition: 'all 0.2s' }}>DAILY</button>
                        <button onClick={() => setViewMode('monthly')} style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: '11px', background: viewMode === 'monthly' ? 'var(--bg-soft)' : 'transparent', color: viewMode === 'monthly' ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: '900', fontSize: '11px', letterSpacing: '0.5px', transition: 'all 0.2s' }}>MONTHLY</button>
                    </div>
                    {tab === 'students' ? (
                        <select
                            value={selectedClass}
                            onChange={e => setSelectedClass(e.target.value)}
                            style={{ flex: 1, padding: '0 12px', borderRadius: '14px', border: '1px solid var(--border-soft)', background: 'var(--bg-card)', fontSize: '12px', fontWeight: '800', color: 'var(--text-main)', boxShadow: 'var(--shadow-sm)', appearance: 'none', textAlign: 'center' }}
                        >
                            <option value="">All Classes</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    ) : (
                        <div style={{ flex: 1, background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
                            <span style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)' }}>STAFF REGISTRY</span>
                        </div>
                    )}
                </div>

                {/* Registry Tab & Calendar Logic */}
                <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1, display: 'flex', background: 'var(--bg-card)', padding: '4px', borderRadius: '16px', border: '1px solid var(--border-soft)', boxShadow: 'var(--shadow-sm)' }}>
                        <button onClick={() => { setTab('students'); setSearch(''); }} style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: '12px', background: tab === 'students' ? 'var(--primary-soft)' : 'transparent', color: tab === 'students' ? 'var(--primary-bold)' : 'var(--text-muted)', fontWeight: '900', fontSize: '12px' }}>STUDENTS</button>
                        <button onClick={() => { setTab('teachers'); setSearch(''); }} style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: '12px', background: tab === 'teachers' ? 'var(--primary-soft)' : 'transparent', color: tab === 'teachers' ? 'var(--primary-bold)' : 'var(--text-muted)', fontWeight: '900', fontSize: '12px' }}>FACULTY</button>
                    </div>
                    <div style={{ position: 'relative', width: '130px' }}>
                        <Clock size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <input
                            type={viewMode === 'daily' ? 'date' : 'month'}
                            value={viewMode === 'daily' ? dateFilter : monthFilter}
                            onChange={e => viewMode === 'daily' ? setDateFilter(e.target.value) : setMonthFilter(e.target.value)}
                            style={{ width: '100%', height: '100%', padding: '10px 12px', borderRadius: '16px', border: '1px solid var(--border-soft)', background: 'var(--bg-card)', fontSize: '12px', fontWeight: '900', color: 'var(--text-main)', boxShadow: 'var(--shadow-sm)' }}
                        />
                    </div>
                </div>
            </div>

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
                {isLoading && (tab === 'students' ? studentRows.length === 0 : teacherRows.length === 0) ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                            <Loader2 className="animate-spin" size={40} color="var(--primary-bold)" />
                            <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-muted)' }}>Loading Database...</span>
                        </div>
                    </div>
                ) : (
                    <>
                        {isLoading && (
                            <div style={{ position: 'absolute', top: '-10px', left: 0, right: 0, height: '4px', background: 'var(--primary-soft)', overflow: 'hidden', borderRadius: '2px', zIndex: 10 }}>
                                <motion.div initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ width: '50%', height: '100%', background: 'var(--primary-bold)' }} />
                            </div>
                        )}
                        {tab === 'students' ? (
                            studentRows.map(row => (
                                <div key={row.id} style={{ 
                                    backgroundColor: 'var(--bg-card)', 
                                    padding: '16px', 
                                    borderRadius: '24px', 
                                    border: '1px solid var(--border-soft)', 
                                    boxShadow: 'var(--shadow-sm)', 
                                    display: 'flex', 
                                    flexDirection: viewMode === 'monthly' ? 'column' : 'row',
                                    justifyContent: 'space-between', 
                                    alignItems: viewMode === 'monthly' ? 'flex-start' : 'center',
                                    gap: viewMode === 'monthly' ? '4px' : '12px'
                                }}>
                                    <div style={{ flex: 1, width: '100%' }}>
                                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '900', color: 'var(--text-main)', fontFamily: 'Outfit' }}>{row.name}</h3>
                                        <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>Roll: {row.rollNumber} • {row.className || 'Active'}</p>
                                    </div>
                                    {viewMode === 'daily' ? (
                                        <div
                                            onClick={() => handleMarkAttendance(row.id, row.status, row.attendanceId, row.classId)}
                                            style={{
                                                padding: '8px 16px', borderRadius: '100px', fontSize: '11px', fontWeight: '900', cursor: 'pointer',
                                                background: row.status === 'PRESENT' ? '#dcfce7' : row.status === 'ABSENT' ? '#fee2e2' : 'var(--bg-soft)',
                                                color: row.status === 'PRESENT' ? '#16a34a' : row.status === 'ABSENT' ? '#dc2626' : 'var(--text-muted)',
                                                border: `1px solid ${row.status === 'PRESENT' ? '#16a34a30' : row.status === 'ABSENT' ? '#dc262630' : 'var(--border-soft)'}`
                                            }}
                                        >
                                            {row.status}
                                        </div>
                                    ) : (
                                        <MonthlyStrip personId={row.id} dataMap={monthlyDataMap} totalSessions={totalSessions} type="student" sessionDates={sessionDates} />
                                    )}
                                </div>
                            ))
                        ) : (
                            teacherRows.map(row => (
                                <div key={row.id} style={{ 
                                    backgroundColor: 'var(--bg-card)', 
                                    padding: '16px', 
                                    borderRadius: '24px', 
                                    border: '1px solid var(--border-soft)', 
                                    boxShadow: 'var(--shadow-sm)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '900', color: 'var(--text-main)', fontFamily: 'Outfit' }}>{row.name}</h3>
                                            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--primary-bold)', fontWeight: '800' }}>{row.designation}</p>
                                        </div>
                                        {viewMode === 'daily' && (
                                            <div
                                                onClick={() => handleMarkAttendance(row.id, row.status, row.attendanceId)}
                                                style={{
                                                    padding: '6px 14px', borderRadius: '100px', fontSize: '10px', fontWeight: '900', cursor: 'pointer',
                                                    background: row.status === 'PRESENT' ? '#dcfce7' : row.status === 'ABSENT' ? '#fee2e2' : 'var(--bg-soft)',
                                                    color: row.status === 'PRESENT' ? '#16a34a' : row.status === 'ABSENT' ? '#dc2626' : 'var(--text-muted)',
                                                    border: `1px solid ${row.status === 'PRESENT' ? '#16a34a30' : row.status === 'ABSENT' ? '#dc262630' : 'var(--border-soft)'}`
                                                }}
                                            >
                                                {row.status}
                                            </div>
                                        )}
                                    </div>
                                    {viewMode === 'daily' ? (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-soft)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Clock size={14} color="var(--text-muted)" />
                                                </div>
                                                <div>
                                                    <p style={{ margin: 0, fontSize: '8px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>ARRIVAL</p>
                                                    <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>{row.arrivalTime || '—:—'}</span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <div style={{ width: '12px', height: '12px', borderRadius: '4px', border: '2px solid var(--text-muted)' }} />
                                                </div>
                                                <div>
                                                    <p style={{ margin: 0, fontSize: '8px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>DEPARTURE</p>
                                                    <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>{row.departureTime || '—:—'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <MonthlyStrip personId={row.id} dataMap={monthlyDataMap} totalSessions={totalSessions} type="teacher" sessionDates={sessionDates} />
                                    )}
                                </div>
                            ))
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '20px' }}>
                                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ background: 'none', border: 'none', color: page === 1 ? 'var(--text-muted)' : 'var(--primary-bold)', cursor: 'pointer' }}><ChevronLeft /></button>
                                <span style={{ fontSize: '13px', fontWeight: '800' }}>Page {page} of {totalPages}</span>
                                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ background: 'none', border: 'none', color: page === totalPages ? 'var(--text-muted)' : 'var(--primary-bold)', cursor: 'pointer' }}><ChevronRight /></button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </motion.div>
    );
}
