import { useState, useEffect } from 'react';
import api from '../../services/api';

const StudentAttendance = () => {
    const [attendance, setAttendance] = useState([]);

    useEffect(() => {
        const fetchAttendance = async () => {
            try {
                // A student only sees their own attendance
                const res = await api.get('/attendance/student');
                setAttendance(res.data);
            } catch (error) {
                console.error('Failed to fetch attendance', error);
            }
        };
        fetchAttendance();
    }, []);

    // Helper to calculate percentages
    const totalDays = attendance.length;
    const presentDays = attendance.filter((a: any) => a.status === 'PRESENT').length;
    const percentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0;

    return (
        <div className="manage-section">
            <div className="stats-grid mb-4">
                <div className="stat-card">
                    <h3>{totalDays}</h3>
                    <p>Total Days Recorded</p>
                </div>
                <div className="stat-card">
                    <h3>{presentDays}</h3>
                    <p>Days Present</p>
                </div>
                <div className="stat-card">
                    <h3>{percentage}%</h3>
                    <p>Overall Attendance</p>
                </div>
            </div>

            <div className="card">
                <h3>Attendance Record Details</h3>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Subject (Optional)</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {attendance.map((record: any) => (
                            <tr key={record.id}>
                                <td>{new Date(record.date).toLocaleDateString()}</td>
                                <td>{record.subject || '-'}</td>
                                <td>
                                    <span className={`badge ${record.status.toLowerCase()}`}>
                                        {record.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {attendance.length === 0 && (
                            <tr><td colSpan={3}>No attendance records found yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StudentAttendance;
