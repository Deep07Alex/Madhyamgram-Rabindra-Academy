import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import useServerEvents from '../../hooks/useServerEvents';
import { Calendar, CheckCircle2, XCircle, BarChart3, List } from 'lucide-react';

const StudentAttendance = () => {
    const [attendance, setAttendance] = useState([]);

    const fetchAttendance = useCallback(async () => {
        try {
            const res = await api.get('/attendance/student');
            setAttendance(res.data);
        } catch (error) {
            console.error('Failed to fetch attendance', error);
        }
    }, []);

    useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

    // Live updates: refresh when teacher marks or admin edits attendance
    useServerEvents({ 'attendance:updated': fetchAttendance });

    const totalDays = attendance.length;
    const presentDays = attendance.filter((a: any) => a.status === 'PRESENT').length;
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
                            {attendance.map((record: any) => (
                                <tr key={record.id}>
                                    <td style={{ fontWeight: '600' }}>
                                        {new Date(record.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                    </td>
                                    <td>
                                        {record.subject ? (
                                            <span className="badge" style={{ background: 'var(--bg-main)', color: 'var(--text-main)' }}>{record.subject}</span>
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Full Day Session</span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                            <span className={`badge ${(record.status || 'PRESENT').toLowerCase()}`} style={{ minWidth: '100px', justifyContent: 'center', gap: '6px' }}>
                                                {(record.status === 'PRESENT' || !record.status) && <CheckCircle2 size={12} />}
                                                {record.status === 'ABSENT' && <XCircle size={12} />}
                                                {record.status || 'PRESENT'}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {attendance.length === 0 && (
                                <tr>
                                    <td colSpan={3} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                                        No attendance data available for the current period.
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
