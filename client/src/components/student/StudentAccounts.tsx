/**
 * Student Accounts Page
 * 
 * Displays a detailed fee ledger for the student.
 * Rows: 12 months of the academic year.
 * Columns: Date Paid, Base Monthly Fee, Amount Paid, Total Due.
 */
import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Banknote, FileText, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import './StudentAccounts.css';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

const StudentAccounts = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        api.get('/fees/my-account')
            .then(res => {
                setData(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch account info:', err);
                setLoading(false);
            });
    }, []);

    if (loading) return (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--primary-bold)' }}>
            <Loader2 size={40} className="animate-spin" style={{ marginBottom: '16px' }} />
            <p style={{ fontWeight: 700 }}>Loading Account Records...</p>
        </div>
    );

    if (!data) return (
        <div style={{ padding: '40px', background: '#fee2e2', color: '#b91c1c', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertCircle size={24} />
            <span style={{ fontWeight: 700 }}>Could not load account details. Please try again later.</span>
        </div>
    );

    const { student, monthlyFees, admissionFee } = data;
    const baseFee = parseFloat(student.monthlyFee) || 0;

    // Build the ledger map: Month -> Payment Record
    const ledger: any = {};
    MONTHS.forEach(m => ledger[m] = null);

    monthlyFees.forEach((record: any) => {
        // Handle comma-separated months
        const paidMonths = record.month.split(',').map((m: string) => m.trim());
        paidMonths.forEach((m: string) => {
            if (ledger[m] === undefined) return;
            ledger[m] = record;
        });
    });

    return (
        <div className="accounts-container">
            <div className="accounts-header">
                <div className="header-info">
                    <h2><Banknote size={24} /> Student Accounts & Ledger</h2>
                    <p>Track your tuition fees and payment history for the current academic year.</p>
                </div>
                <div className="student-badge">
                    <span className="label">Class</span>
                    <span className="value">{student.className}</span>
                </div>
            </div>

            <div className="summary-cards">
                <div className="summary-card gold">
                    <div className="card-inner">
                        <div className="card-icon"><Banknote /></div>
                        <div className="card-content">
                            <h3>Fixed Monthly Fee</h3>
                            <div className="amount">₹ {baseFee.toFixed(2)}</div>
                        </div>
                    </div>
                </div>
                <div className="summary-card blue">
                    <div className="card-inner">
                        <div className="card-icon"><FileText /></div>
                        <div className="card-content">
                            <h3>Admission Fee</h3>
                            <div className="amount">₹ {admissionFee ? (parseFloat(admissionFee.totalAdmissionFee)).toFixed(2) : '0.00'}</div>
                            {admissionFee && (
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                                    <div className="status-badge cleared" style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                                        Paid: ₹{parseFloat(admissionFee.amountPaid || 0).toFixed(2)}
                                    </div>
                                    {parseFloat(admissionFee.due) > 0 && (
                                        <div className="status-badge pending" style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                                            Due: ₹{parseFloat(admissionFee.due).toFixed(2)}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="ledger-card">
                <div className="ledger-title">
                    <CheckCircle size={20} color="var(--primary-bold)" />
                    <h3>Monthly Fee Ledger</h3>
                </div>
                
                <div className="table-responsive">
                    <table className="ledger-table">
                        <thead>
                            <tr>
                                <th>Month</th>
                                <th style={{ textAlign: 'center' }}>Expected Fee</th>
                                <th style={{ textAlign: 'center' }}>Date Paid</th>
                                <th style={{ textAlign: 'center' }}>Total Paid</th>
                                <th style={{ textAlign: 'center' }}>Status</th>
                                <th style={{ textAlign: 'right' }}>Due Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {MONTHS.map(month => {
                                const record = ledger[month];
                                const paidAmount = record ? parseFloat(record.fee) : 0;
                                const due = record ? (baseFee - paidAmount) : baseFee;
                                const isCleared = record && due <= 0;

                                return (
                                    <tr key={month} className={isCleared ? 'cleared-row' : ''}>
                                        <td className="month-name">{month}</td>
                                        <td className="expected-fee" style={{ textAlign: 'center' }}>₹ {baseFee.toFixed(2)}</td>
                                        <td className="date-paid" style={{ textAlign: 'center' }}>
                                            {record ? new Date(record.date).toLocaleDateString('en-IN') : '—'}
                                        </td>
                                        <td className="total-paid" style={{ textAlign: 'center' }}>
                                            <span className={paidAmount > 0 ? 'paid-text' : ''}>
                                                ₹ {paidAmount.toFixed(2)}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {isCleared ? (
                                                <span className="status-badge cleared">CLEARED</span>
                                            ) : record ? (
                                                <span className="status-badge partial">PARTIAL</span>
                                            ) : (
                                                <span className="status-badge pending">PENDING</span>
                                            )}
                                        </td>
                                        <td className="due-amount" style={{ textAlign: 'right' }}>
                                            <span className={due > 0 ? 'due-text' : 'zero-due'}>
                                                ₹ {Math.max(0, due).toFixed(2)}
                                            </span>
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

export default StudentAccounts;
