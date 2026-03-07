import { useState, useEffect } from 'react';
import api from '../../services/api';
import { BookPlus, GraduationCap, School, Trash2 } from 'lucide-react';

const ManageClasses = () => {
    const [classes, setClasses] = useState([]);
    const [newClass, setNewClass] = useState({ name: '', grade: '' });

    const fetchData = async () => {
        try {
            const clsRes = await api.get('/users/classes');
            setClasses(clsRes.data);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateClass = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/users/classes', newClass);
            setNewClass({ name: '', grade: '' });
            fetchData();
        } catch (error) {
            console.error('Failed to create class:', error);
        }
    };

    const handleDeleteClass = async (id: string) => {
        if (!confirm('Are you sure you want to delete this class?')) return;
        try {
            await api.delete(`/users/classes/${id}`);
            fetchData();
        } catch (error) {
            console.error('Failed to delete class:', error);
        }
    };


    return (
        <div className="manage-section">
            <div className="card">
                <h3>
                    <BookPlus size={20} color="var(--primary-bold)" />
                    Initialize Academic Grade
                </h3>
                <form onSubmit={handleCreateClass} className="form-grid">
                    <div className="form-group">
                        <label>Grade Designation</label>
                        <input
                            type="text"
                            placeholder="e.g., STD-V"
                            value={newClass.name}
                            onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Numeric Level</label>
                        <input
                            type="number"
                            placeholder="e.g., 5"
                            value={newClass.grade}
                            onChange={(e) => setNewClass({ ...newClass, grade: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group" style={{ alignSelf: 'end' }}>
                        <button type="submit" className="btn-primary" style={{ width: '100%', height: '42px' }}>
                            <School size={18} /> Establish Class
                        </button>
                    </div>
                </form>
            </div>

            <div className="card" style={{ marginTop: '32px' }}>
                <h3>
                    <GraduationCap size={20} color="var(--primary-bold)" />
                    Academic Grade & Faculty Management
                </h3>
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th style={{ textAlign: 'center' }}>Total Students</th>
                                <th style={{ textAlign: 'center' }}>Teacher</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {classes.map((c: any) => (
                                <tr key={c.id}>
                                    <td style={{ fontWeight: '600', color: 'var(--primary-bold)' }}>
                                        {c.name}
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Level {c.grade}</div>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span style={{ fontWeight: '700' }}>{c._count?.students || 0}</span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span style={{ fontWeight: '700' }}>{c.teachers?.length || 0}</span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button onClick={() => handleDeleteClass(c.id)} className="btn-danger btn-sm" style={{ padding: '6px 12px' }}>
                                            <Trash2 size={14} /> Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ManageClasses;
