import { useState, useEffect } from 'react';
import api from '../../services/api';
import { GraduationCap, Trash2 } from 'lucide-react';

const ManageClasses = () => {
    const [classes, setClasses] = useState([]);

    const fetchData = async (signal?: AbortSignal) => {
        try {
            const clsRes = await api.get('/users/classes', { signal });
            setClasses(clsRes.data);
        } catch (error: any) {
            if (error.name === 'CanceledError') return;
            console.error('Failed to fetch data:', error);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        fetchData(controller.signal);
        return () => controller.abort();
    }, []);

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
        <div className="manage-section">            <div className="card" style={{ marginTop: '32px' }}>
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
