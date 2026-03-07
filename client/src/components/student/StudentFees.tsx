import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import useServerEvents from '../../hooks/useServerEvents';
import {
    AlertCircle,
    Calendar,
    IndianRupee,
    CheckCircle2,
    Clock,
    ReceiptText,
    Activity
} from 'lucide-react';

const StudentFees = () => {
    const [fees, setFees] = useState([]);

    const fetchFees = useCallback(async () => {
        try {
            const res = await api.get('/fees/student');
            setFees(res.data);
        } catch (error) {
            console.error('Failed to fetch fees', error);
        }
    }, []);

    useEffect(() => { fetchFees(); }, [fetchFees]);

    // Live updates: refresh when admin creates or records fee payment
    useServerEvents({ 'fee:created': fetchFees, 'fee:paid': fetchFees });

    const totalDue = fees.filter((f: any) => f.status === 'PENDING').reduce((acc, curr: any) => acc + curr.amount, 0);

    return (
        <div className="manage-section">
            <div className="stats-grid" style={{ marginBottom: '32px' }}>
                <div className="stat-card" style={{ borderLeft: '4px solid var(--accent)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h3 style={{ fontSize: '1.75rem', fontWeight: 900 }}>₹{totalDue.toLocaleString('en-IN')}</h3>
                            <p style={{ fontWeight: 700, opacity: 0.7 }}>Outstanding Obligations</p>
                        </div>
                        <AlertCircle size={24} color="var(--accent)" opacity={0.6} />
                    </div>
                </div>
                <div className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h3 style={{ fontSize: '1.75rem', fontWeight: 900 }}>{fees.length}</h3>
                            <p style={{ fontWeight: 700, opacity: 0.7 }}>Historical Invoices</p>
                        </div>
                        <ReceiptText size={24} color="var(--primary-bold)" opacity={0.6} />
                    </div>
                </div>
                <div className="stat-card" style={{ borderLeft: '4px solid var(--success)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h3 style={{ fontSize: '1.75rem', fontWeight: 900 }}>{fees.filter((f: any) => f.status === 'PAID').length}</h3>
                            <p style={{ fontWeight: 700, opacity: 0.7 }}>Cleared Transactions</p>
                        </div>
                        <CheckCircle2 size={24} color="var(--success)" opacity={0.6} />
                    </div>
                </div>
            </div>

            <div className="card">
                <h3>
                    <IndianRupee size={20} color="var(--primary-bold)" />
                    Financial Ledger & Fee Details
                </h3>
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Amount</th>
                                <th style={{ textAlign: 'center' }}>Deadline</th>
                                <th style={{ textAlign: 'center' }}>Status</th>
                                <th style={{ textAlign: 'center' }}>Settled On</th>
                                <th style={{ textAlign: 'right' }}>Management Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fees.map((f: any) => (
                                <tr key={f.id}>
                                    <td style={{ fontWeight: '600' }}>{f.type}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 800, color: 'var(--text-main)' }}>
                                            <IndianRupee size={12} style={{ opacity: 0.4 }} /> {f.amount.toLocaleString('en-IN')}
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center', fontSize: '0.85rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                                            <Calendar size={14} /> {new Date(f.dueDate).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                            <span className={`badge ${f.status.toLowerCase()}`} style={{ minWidth: '100px', justifyContent: 'center', gap: '6px' }}>
                                                {f.status === 'PAID' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                                {f.status}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--success)', fontWeight: 700 }}>
                                        {f.paidAt ? new Date(f.paidAt).toLocaleDateString() : <span style={{ opacity: 0.3 }}>—</span>}
                                    </td>
                                    <td style={{ textAlign: 'right', fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{f.remark || 'N/A'}</td>
                                </tr>
                            ))}
                            {fees.length === 0 && (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                                        <Activity size={32} style={{ opacity: 0.1, marginBottom: '12px' }} />
                                        <p style={{ fontWeight: 600 }}>No financial data retrieved for the current period.</p>
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

export default StudentFees;
