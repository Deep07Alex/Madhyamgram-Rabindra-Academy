/**
 * Financial Management Center (Fees)
 * 
 * Centralized interface for issuing fee requirements and recording manual collections.
 * 
 * Operations:
 * - Generation: Issue fees to an entire class (batch) or a specific student.
 * - Collection: Manually record cash/bank payments with internal verification notes.
 * - Ledger: Comprehensive table tracking payment statuses (PENDING/PAID).
 */
import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { PlusCircle, CreditCard, CheckCircle } from 'lucide-react';

const ManageFees = () => {
    const { showToast } = useToast();
    const [fees, setFees] = useState([]);
    const [classes, setClasses] = useState([]);
    const [students, setStudents] = useState([]);

    const [newFee, setNewFee] = useState({ amount: '', dueDate: '', type: '', classId: '', studentId: '' });
    const [payment, setPayment] = useState({ feeId: '', amountPaid: '', method: 'Cash', remark: '' });

    const fetchData = async () => {
        try {
            const [feeRes, clsRes, stuRes] = await Promise.all([
                api.get('/fees'),
                api.get('/users/classes'),
                api.get('/users/students')
            ]);
            setFees(feeRes.data);
            setClasses(clsRes.data);
            setStudents(stuRes.data);
        } catch (error) {
            console.error('Failed to fetch fees data:', error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateFee = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (newFee.classId) {
                /**
                 * Batch Mode: Backend iterates through all students in the class
                 * and creates individual fee records for each.
                 */
                await api.post('/fees/batch', {
                    amount: newFee.amount, dueDate: newFee.dueDate, type: newFee.type, classId: newFee.classId
                });
            } else if (newFee.studentId) {
                await api.post('/fees', {
                    amount: newFee.amount, dueDate: newFee.dueDate, type: newFee.type, studentId: newFee.studentId
                });
            } else {
                showToast('Please select a Class or Student first.', 'warning');
                return;
            }
            setNewFee({ amount: '', dueDate: '', type: '', classId: '', studentId: '' });
            fetchData();
        } catch (error) {
            console.error('Failed to create fee:', error);
        }
    };

    const handleRecordPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.patch(`/fees/${payment.feeId}/pay`, {
                amountPaid: payment.amountPaid,
                paymentMethod: payment.method,
                remark: payment.remark,
                status: 'PAID'
            });
            setPayment({ feeId: '', amountPaid: '', method: 'Cash', remark: '' });
            fetchData();
        } catch (error) {
            console.error('Failed to record payment:', error);
        }
    };

    return (
        <div className="manage-section">
            <div className="card">
                <h3>
                    <PlusCircle size={20} color="var(--primary-bold)" />
                    Generate Academic Fee Requirement
                </h3>
                <form onSubmit={handleCreateFee} className="form-grid">
                    <div className="form-group">
                        <label>Fee Amount (₹)</label>
                        <input type="number" placeholder="Enter Amount" value={newFee.amount} onChange={e => setNewFee({ ...newFee, amount: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label>Due Date</label>
                        <input type="date" value={newFee.dueDate} onChange={e => setNewFee({ ...newFee, dueDate: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label>Fee Type</label>
                        <input type="text" placeholder="e.g., Monthly Tuition" value={newFee.type} onChange={e => setNewFee({ ...newFee, type: e.target.value })} required />
                    </div>

                    <div className="form-group">
                        <label>Apply to Class</label>
                        <select value={newFee.classId} onChange={e => setNewFee({ ...newFee, classId: e.target.value, studentId: '' })}>
                            <option value="">-- No Class Selected --</option>
                            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Apply to Single Student</label>
                        <select value={newFee.studentId} onChange={e => setNewFee({ ...newFee, studentId: e.target.value, classId: '' })}>
                            <option value="">-- No Student Selected --</option>
                            {students.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.rollNumber})</option>)}
                        </select>
                    </div>

                    <div className="form-group" style={{ alignSelf: 'end' }}>
                        <button type="submit" className="btn-primary" style={{ width: '100%', height: '42px' }}>Assign Fee</button>
                    </div>
                </form>
            </div>

            <div className="card" style={{ marginTop: '32px' }}>
                <h3>
                    <CreditCard size={20} color="var(--primary-bold)" />
                    Process Manual Collection
                </h3>
                <form onSubmit={handleRecordPayment} className="form-grid">
                    <div className="form-group">
                        <label>Target Fee Record</label>
                        <select value={payment.feeId} onChange={e => setPayment({ ...payment, feeId: e.target.value })} required>
                            <option value="">Select Pending Fee</option>
                            {fees.filter((f: any) => f.status === 'PENDING').map((f: any) => (
                                <option key={f.id} value={f.id}>
                                    {f.student.name} - {f.type} (₹{f.amount})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Collection Amount</label>
                        <input type="number" placeholder="₹ 0.00" value={payment.amountPaid} onChange={e => setPayment({ ...payment, amountPaid: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label>Internal Note</label>
                        <input type="text" placeholder="Optional remark" value={payment.remark} onChange={e => setPayment({ ...payment, remark: e.target.value })} />
                    </div>

                    <div className="form-group" style={{ alignSelf: 'end' }}>
                        <button type="submit" className="btn-primary" style={{ width: '100%', height: '42px', background: 'var(--success)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}>
                            <CheckCircle size={18} /> Verify & Record
                        </button>
                    </div>
                </form>
            </div>

            <div className="card" style={{ marginTop: '24px' }}>
                <h3>Fee Records</h3>
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Type</th>
                                <th>Amount</th>
                                <th>Due Date</th>
                                <th>Status</th>
                                <th>Paid At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fees.map((f: any) => (
                                <tr key={f.id}>
                                    <td>{f.student.name} ({f.student.class?.name})</td>
                                    <td>{f.type}</td>
                                    <td>₹{f.amount}</td>
                                    <td>{new Date(f.dueDate).toLocaleDateString()}</td>
                                    <td><span className={`badge ${f.status.toLowerCase()}`}>{f.status}</span></td>
                                    <td>{f.paidAt ? new Date(f.paidAt).toLocaleDateString() : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ManageFees;
