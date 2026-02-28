import { useState, useEffect } from 'react';
import api from '../../services/api';

const StudentFees = () => {
    const [fees, setFees] = useState([]);

    useEffect(() => {
        const fetchFees = async () => {
            try {
                const res = await api.get('/fees/student');
                setFees(res.data);
            } catch (error) {
                console.error('Failed to fetch fees', error);
            }
        };
        fetchFees();
    }, []);

    const totalDue = fees.filter((f: any) => f.status === 'PENDING').reduce((acc, curr: any) => acc + curr.amount, 0);

    return (
        <div className="manage-section">
            <div className="stats-grid mb-4">
                <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <h3>₹{totalDue}</h3>
                    <p>Total Outstanding Dues</p>
                </div>
            </div>

            <div className="card">
                <h3>My Fee Details</h3>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Fee Type</th>
                            <th>Amount</th>
                            <th>Due Date</th>
                            <th>Status</th>
                            <th>Paid On</th>
                            <th>Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        {fees.map((f: any) => (
                            <tr key={f.id}>
                                <td>{f.type}</td>
                                <td>₹{f.amount}</td>
                                <td>{new Date(f.dueDate).toLocaleDateString()}</td>
                                <td>
                                    <span className={`badge ${f.status.toLowerCase()}`}>
                                        {f.status}
                                    </span>
                                </td>
                                <td>{f.paidAt ? new Date(f.paidAt).toLocaleDateString() : '-'}</td>
                                <td>{f.remark || '-'}</td>
                            </tr>
                        ))}
                        {fees.length === 0 && (
                            <tr><td colSpan={6}>No fee records found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StudentFees;
