import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../services/api';
import useServerEvents from '../../hooks/useServerEvents';
import { Calendar, CheckCircle2, XCircle, List, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

const TeacherPersonalAttendance = () => {
    const now = new Date();
    const [currentMonth, setCurrentMonth] = useState(now.getMonth());
    const [currentYear, setCurrentYear] = useState(now.getFullYear());
    const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(currentYear, currentMonth));

    const fetchAttendance = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const formatISODate = (d: Date) => {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${y}-${m}-${day}`;
            };
            const startDate = formatISODate(new Date(currentYear, currentMonth, 1));
            const endDate = formatISODate(new Date(currentYear, currentMonth + 1, 0));
            const res = await api.get(`/attendance/teacher`, {
                params: { startDate, endDate }
            });
            setAttendanceRecords(res.data || []);
        } catch (error) {
            console.error('Failed to fetch teacher attendance', error);
        } finally {
            if (!silent) setIsLoading(false);
        }
    }, [currentMonth, currentYear]);

    useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

    useServerEvents({
        'attendance:updated': () => {
            fetchAttendance(true);
        }
    });

    const handlePrevMonth = () => {
        if (currentYear === 2026 && currentMonth === 0) return;
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(prev => prev - 1);
        } else {
            setCurrentMonth(prev => prev - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(prev => prev + 1);
        } else {
            setCurrentMonth(prev => prev + 1);
        }
    };

    const daysInMonth = useMemo(() => {
        const days = [];
        const date = new Date(currentYear, currentMonth, 1);
        while (date.getMonth() === currentMonth) {
            days.push(new Date(date));
            date.setDate(date.getDate() + 1);
        }
        return days;
    }, [currentMonth, currentYear]);

    const stats = useMemo(() => {
        const present = attendanceRecords.filter((r: any) => (r.status === 'PRESENT' || r.status === 'LATE') && r.arrivalTime && r.departureTime).length;
        const partial = attendanceRecords.filter((r: any) => (r.status === 'PARTIAL') || ((r.status === 'PRESENT' || r.status === 'LATE') && (!r.arrivalTime || !r.departureTime))).length;
        const absent = attendanceRecords.filter((r: any) => r.status === 'ABSENT').length;
        const total = present + partial + absent;
        const rate = total > 0 ? (((present + partial) / total) * 100).toFixed(1) : "0.0";
        return { present, partial, absent, total, rate };
    }, [attendanceRecords]);

    return (
        <div className="teacher-personal-attendance">
            <div style={{ marginBottom: '16px' }}>
                <h4 style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Personal Attendance Statistics ({monthName})</h4>
                <div className="stats-grid" style={{ marginBottom: '32px' }}>
                    <div className="stat-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h3>{stats.total}</h3>
                                <p>Recorded Days</p>
                            </div>
                            <Calendar size={24} color="var(--primary-bold)" opacity={0.5} />
                        </div>
                    </div>
                    <div className="stat-card" style={{ borderLeftColor: 'var(--success)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h3>{stats.present}</h3>
                                <p>Full Days</p>
                            </div>
                            <CheckCircle2 size={24} color="var(--success)" opacity={0.5} />
                        </div>
                    </div>
                    <div className="stat-card" style={{ borderLeftColor: 'var(--warning-bold)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h3>{stats.partial}</h3>
                                <p>Partial Days</p>
                            </div>
                            <Clock size={24} color="var(--warning-bold)" opacity={0.5} />
                        </div>
                    </div>
                    <div className="stat-card" style={{ borderLeftColor: '#ef4444' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h3>{stats.absent}</h3>
                                <p>Days Absent</p>
                            </div>
                            <XCircle size={24} color="#ef4444" opacity={0.5} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                    <h3 style={{ margin: 0 }}>
                        <List size={20} color="var(--primary-bold)" />
                        Attendance Log for {monthName} {currentYear}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-main)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-soft)' }}>
                        <button
                            onClick={handlePrevMonth}
                            className="btn-view-details btn-sm"
                            style={{
                                padding: '6px',
                                minWidth: 'auto',
                                opacity: (currentYear === 2026 && currentMonth === 0) ? 0.3 : 1,
                                cursor: (currentYear === 2026 && currentMonth === 0) ? 'not-allowed' : 'pointer'
                            }}
                            disabled={currentYear === 2026 && currentMonth === 0}
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span style={{ fontWeight: '700', fontSize: '0.9rem', padding: '0 8px', minWidth: '120px', textAlign: 'center' }}>
                            {monthName} {currentYear}
                        </span>
                        <button
                            onClick={handleNextMonth}
                            className="btn-view-details btn-sm"
                            style={{ padding: '6px', minWidth: 'auto' }}
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Day</th>
                                <th style={{ textAlign: 'center' }}>Status</th>
                                <th style={{ textAlign: 'center' }}>Check-in</th>
                                <th style={{ textAlign: 'center' }}>Check-out</th>
                                <th>Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {daysInMonth.map((day) => {
                                const dateStr = day.toLocaleDateString('en-CA');
                                const todayStr = new Date().toLocaleDateString('en-CA');
                                const isToday = dateStr === todayStr;
                                const isFuture = dateStr > todayStr;

                                const record = attendanceRecords.find((r: any) => {
                                    const rDate = r.date.split('T')[0];
                                    return rDate === dateStr;
                                });

                                let statusLabel = "No Record";
                                let statusClass = "";

                                if (record) {
                                    if (record.status === 'ABSENT') {
                                        statusLabel = "ABSENT";
                                        statusClass = "absent";
                                    } else if (record.status === 'LATE') {
                                        statusLabel = "LATE";
                                        statusClass = "warning";
                                    } else if (record.status === 'PARTIAL') {
                                        statusLabel = "PARTIAL";
                                        statusClass = "warning";
                                    } else if (record.status === 'PRESENT') {
                                        if (record.arrivalTime && record.departureTime) {
                                            statusLabel = "PRESENT";
                                            statusClass = "present";
                                        } else {
                                            statusLabel = "PARTIAL";
                                            statusClass = "warning";
                                        }
                                    }
                                } else if (day.getDay() === 0) {
                                    statusLabel = "Sunday (Off)";
                                } else if (isFuture) {
                                    statusLabel = "Upcoming";
                                }

                                return (
                                    <tr
                                        key={dateStr}
                                        style={{
                                            background: isToday ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
                                            opacity: isToday ? 1 : (isFuture ? 0.5 : 0.8),
                                            borderLeft: isToday ? '4px solid var(--primary-bold)' : 'none'
                                        }}
                                    >
                                        <td style={{ fontWeight: '700' }}>
                                            {day.getDate().toString().padStart(2, '0')} {monthName.substring(0, 3)}
                                        </td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                            {day.toLocaleDateString(undefined, { weekday: 'long' })}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {isLoading ? (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>...</span>
                                            ) : (
                                                <span className={`badge ${statusClass}`} style={{ minWidth: '90px', justifyContent: 'center' }}>
                                                    {statusLabel}
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: '600', color: record?.arrivalTime ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                            {record?.arrivalTime ? (
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                    <Clock size={12} /> {record.arrivalTime.substring(0, 5)}
                                                </div>
                                            ) : (record && record.status !== 'ABSENT' ? '--:--' : '-')}
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: '600', color: record?.departureTime ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                            {record?.departureTime ? (
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                    <Clock size={12} /> {record.departureTime.substring(0, 5)}
                                                </div>
                                            ) : (record && record.status !== 'ABSENT' ? '--:--' : '-')}
                                        </td>
                                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            {record?.reason || record?.earlyLeaveReason || (record?.status === 'PRESENT' && !record.departureTime && isToday ? 'On-going Session' : '')}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TeacherPersonalAttendance;
