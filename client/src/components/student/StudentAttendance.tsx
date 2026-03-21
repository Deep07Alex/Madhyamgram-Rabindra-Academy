/**
 * Student Attendance History Component
 * 
 * Allows students to track their personal attendance records and academic participation.
 * Features:
 * - Real-time statistics (Academic Days, Present, Absent, Attendance Rate).
 * - Detailed history table with subject-wise marking.
 * - Reactive updates via WebSocket when faculty/admin updates records.
 */
import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import useServerEvents from '../../hooks/useServerEvents';
import { Calendar, CheckCircle2, XCircle, BarChart3, List } from 'lucide-react';

const StudentAttendance = () => {
    const [attendanceData, setAttendanceData] = useState({ records: [] as any[], totalSessions: 0 });

    const fetchAttendance = useCallback(async () => {
        try {
            const res = await api.get('/attendance/student');
            setAttendanceData(res.data);
        } catch (error) {
            console.error('Failed to fetch attendance', error);
        }
    }, []);

    useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

    // Live updates: refresh when teacher marks or admin edits attendance
    useServerEvents({ 'attendance:updated': fetchAttendance });


    const totalDays = attendanceData.totalSessions;
    const presentDays = attendanceData.records.filter((a: any) => a.status === 'PRESENT').length;
    const absentDays = attendanceData.records.filter((a: any) => a.status === 'ABSENT').length;
    const percentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0;

    return (
        <div className="manage-section">
            <div className="stats-grid" style={{ marginBottom: '32px' }}>
                <div className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h3>{totalDays}</h3>
                            <p>Academic Days</p>
                        </div>
                        <Calendar size={24} color="var(--primary-bold)" opacity={0.5} />
                    </div>
                </div>
                <div className="stat-card" style={{ borderLeftColor: 'var(--success)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h3>{presentDays}</h3>
                            <p>Days Present</p>
                        </div>
                        <CheckCircle2 size={24} color="var(--success)" opacity={0.5} />
                    </div>
                </div>
                <div className="stat-card" style={{ borderLeftColor: '#ef4444' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h3>{absentDays}</h3>
                            <p>Days Absent</p>
                        </div>
                        <XCircle size={24} color="#ef4444" opacity={0.5} />
                    </div>
                </div>
                <div className="stat-card" style={{ borderLeftColor: 'var(--accent)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h3>{percentage}%</h3>
                            <p>Attendance Rate</p>
                        </div>
                        <BarChart3 size={24} color="var(--accent)" opacity={0.5} />
                    </div>
                </div>
            </div>

            <div className="card">
                <h3>
                    <List size={20} color="var(--primary-bold)" />
                    Detailed Attendance History
                </h3>
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Session Date</th>
                                <th>Academic Subject</th>
                                <th style={{ textAlign: 'center' }}>Participation Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {attendanceData.records.map((record: any) => {
                                const date = new Date(record.date);
                                return (
                                    <tr key={record.id}>
                                        <td style={{ fontWeight: '600' }}>
                                            {date.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                        </td>
                                        <td>
                                            {record.subject ? (
                                                <span className="badge" style={{ background: 'var(--bg-main)', color: 'var(--text-main)', border: '1px solid var(--border-soft)' }}>{record.subject}</span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Full Day Session</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                {record.status === 'PRESENT' && (
                                                    <span className="badge present" style={{ minWidth: '110px', justifyContent: 'center', gap: '6px' }}>
                                                        <CheckCircle2 size={12} /> PRESENT
                                                    </span>
                                                )}
                                                {record.status === 'ABSENT' && (
                                                    <span className="badge absent" style={{ minWidth: '110px', justifyContent: 'center', gap: '6px' }}>
                                                        <XCircle size={12} /> ABSENT
                                                    </span>
                                                )}
                                                {(!record.status || record.status === 'NOT_RECORDED') && (
                                                    <span className="badge" style={{ minWidth: '110px', justifyContent: 'center', background: 'var(--bg-soft)', color: 'var(--text-muted)' }}>
                                                        —
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {attendanceData.records.length === 0 && (
                                <tr>
                                    <td colSpan={3} style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                            <Calendar size={32} opacity={0.3} />
                                            <span>No attendance data available for the current academic period.</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StudentAttendance;
