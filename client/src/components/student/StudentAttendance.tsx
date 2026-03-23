/**
 * Student Attendance History Component
 * 
 * Allows students to track their personal attendance records and academic participation.
 * Features:
 * - Full-month calendar view with month/year navigation.
 * - Real-time statistics for the selected period.
 * - Highlights the current day while displaying status for all days.
 * - Reactive updates via WebSocket.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../services/api';
import useServerEvents from '../../hooks/useServerEvents';
import { Calendar, CheckCircle2, XCircle, BarChart3, List, ChevronLeft, ChevronRight } from 'lucide-react';

const StudentAttendance = () => {
    const now = new Date();
    const [currentMonth, setCurrentMonth] = useState(now.getMonth());
    const [currentYear, setCurrentYear] = useState(now.getFullYear());
    const [attendanceData, setAttendanceData] = useState({ records: [] as any[], totalSessions: 0 });
    const [isLoading, setIsLoading] = useState(true);

    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(currentYear, currentMonth));

    const fetchAttendance = useCallback(async () => {
        setIsLoading(true);
        try {
            const startDate = new Date(currentYear, currentMonth, 1).toLocaleDateString('en-CA');
            const endDate = new Date(currentYear, currentMonth + 1, 0).toLocaleDateString('en-CA');
            const res = await api.get(`/attendance/student`, {
                params: { startDate, endDate }
            });
            setAttendanceData(res.data);
        } catch (error) {
            console.error('Failed to fetch attendance', error);
        } finally {
            setIsLoading(false);
        }
    }, [currentMonth, currentYear]);

    useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

    // Live updates: refresh when teacher marks or admin edits attendance
    useServerEvents({ 'attendance:updated': fetchAttendance });

    const handlePrevMonth = () => {
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
        const records = attendanceData.records;
        const present = records.filter((r: any) => r.status === 'PRESENT').length;
        const absent = records.filter((r: any) => r.status === 'ABSENT').length;
        const total = records.length;
        const rate = total > 0 ? ((present / total) * 100).toFixed(1) : "0.0";
        return { present, absent, total, rate };
    }, [attendanceData.records]);

    return (
        <div className="manage-section">
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
                            <p>Days Present</p>
                        </div>
                        <CheckCircle2 size={24} color="var(--success)" opacity={0.5} />
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
                <div className="stat-card" style={{ borderLeftColor: 'var(--accent)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h3>{stats.rate}%</h3>
                            <p>Monthly Rate</p>
                        </div>
                        <BarChart3 size={24} color="var(--accent)" opacity={0.5} />
                    </div>
                </div>
            </div>

            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                    <h3 style={{ margin: 0 }}>
                        <List size={20} color="var(--primary-bold)" />
                        Attendance for {monthName} {currentYear}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-main)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-soft)' }}>
                        <button 
                            onClick={handlePrevMonth}
                            className="btn-view-details btn-sm"
                            style={{ padding: '6px', minWidth: 'auto' }}
                            title="Previous Month"
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
                            title="Next Month"
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
                                <th>Notes/Subject</th>
                            </tr>
                        </thead>
                        <tbody>
                            {daysInMonth.map((day) => {
                                const dateStr = day.toLocaleDateString('en-CA');
                                const todayStr = new Date().toLocaleDateString('en-CA');
                                const isToday = dateStr === todayStr;
                                const isFuture = dateStr > todayStr;
                                
                                const record = attendanceData.records.find((r: any) => {
                                    const rDate = new Date(r.date).toLocaleDateString('en-CA');
                                    return rDate === dateStr;
                                });

                                return (
                                    <tr 
                                        key={dateStr}
                                        style={{ 
                                            background: isToday ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
                                            opacity: isToday ? 1 : 0.7,
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
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading...</span>
                        ) : (
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                {record?.status === 'PRESENT' && (
                                    <span className="badge present" style={{ minWidth: '100px', justifyContent: 'center', gap: '6px' }}>
                                        <CheckCircle2 size={12} /> PRESENT
                                    </span>
                                )}
                                {record?.status === 'ABSENT' && (
                                    <span className="badge absent" style={{ minWidth: '100px', justifyContent: 'center', gap: '6px' }}>
                                        <XCircle size={12} /> ABSENT
                                    </span>
                                )}
                                {!record && (
                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                        {isToday ? (
                                            <span className="badge present" style={{ minWidth: '100px', justifyContent: 'center', gap: '6px', opacity: 0.8 }}>
                                                <CheckCircle2 size={12} /> PRESENT
                                            </span>
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                {isFuture ? 'Upcoming' : '—'}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                                        </td>
                                        <td>
                                            {record?.subject ? (
                                                <span className="badge" style={{ background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-soft)' }}>{record.subject}</span>
                                            ) : (
                                                record ? <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Full Day</span> : null
                                            )}
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

export default StudentAttendance;
