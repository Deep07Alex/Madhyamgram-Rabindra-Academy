import { useState, useEffect } from 'react';
import api from '../../services/api';

const ManageClasses = () => {
    const [classes, setClasses] = useState([]);
    const [newClass, setNewClass] = useState({ name: '', grade: '' });

    const fetchClasses = async () => {
        try {
            const res = await api.get('/users/classes');
            setClasses(res.data);
        } catch (error) {
            console.error('Failed to fetch classes:', error);
        }
    };

    useEffect(() => {
        fetchClasses();
    }, []);

    const handleCreateClass = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/users/classes', newClass);
            setNewClass({ name: '', grade: '' });
            fetchClasses();
        } catch (error) {
            console.error('Failed to create class:', error);
        }
    };

    const handleDeleteClass = async (id: string) => {
        if (!confirm('Are you sure you want to delete this class?')) return;
        try {
            await api.delete(`/users/classes/${id}`);
            fetchClasses();
        } catch (error) {
            console.error('Failed to delete class:', error);
        }
    };

    return (
        <div className="manage-section">
            <div className="card">
                <h3>Create New Class</h3>
                <form onSubmit={handleCreateClass} className="form-grid">
                    <input
                        type="text"
                        placeholder="Class Name (e.g., Class 5A)"
                        value={newClass.name}
                        onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                        required
                    />
                    <input
                        type="number"
                        placeholder="Grade Level (e.g., 5)"
                        value={newClass.grade}
                        onChange={(e) => setNewClass({ ...newClass, grade: e.target.value })}
                        required
                    />
                    <button type="submit" className="btn-primary">Create Class</button>
                </form>
            </div>

            <div className="card" style={{ marginTop: '24px' }}>
                <h3>Existing Classes</h3>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Grade</th>
                            <th>Total Students</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {classes.map((c: any) => (
                            <tr key={c.id}>
                                <td>{c.name}</td>
                                <td>{c.grade}</td>
                                <td>{c._count?.students || 0}</td>
                                <td>
                                    <button onClick={() => handleDeleteClass(c.id)} className="btn-danger btn-sm">Delete</button>
                                </td>
                            </tr>
                        ))}
                        {classes.length === 0 && <tr><td colSpan={4}>No classes found.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ManageClasses;
