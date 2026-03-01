import { useState, useEffect } from 'react';
import api from '../../services/api';
import { BookPlus, GraduationCap, School, Trash2, Link, ChevronDown } from 'lucide-react';

const ManageClasses = () => {
    const [classes, setClasses] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [newClass, setNewClass] = useState({ name: '', grade: '' });
    const [selectedTeachers, setSelectedTeachers] = useState<{ [key: string]: string }>({});

    const fetchData = async () => {
        try {
            const [clsRes, teachRes] = await Promise.all([
                api.get('/users/classes'),
                api.get('/users/teachers')
            ]);
            setClasses(clsRes.data);
            setTeachers(teachRes.data);
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

    const handleAssignTeacher = async (classId: string) => {
        const teacherId = selectedTeachers[classId];
        if (!teacherId) return;
        try {
            await api.post(`/users/classes/${classId}/teachers`, { teacherId });
            fetchData();
        } catch (error) {
            console.error('Failed to assign teacher:', error);
        }
    };

    const handleRemoveTeacher = async (classId: string, teacherId: string) => {
        try {
            await api.delete(`/users/classes/${classId}/teachers/${teacherId}`);
            fetchData();
        } catch (error) {
            console.error('Failed to remove teacher:', error);
        }
    };

    return (
        <div className="manage-section">
            <div className="card">
                <h3>
                    <BookPlus size={20} color="var(--primary)" />
                    Initialize Academic Grade
                </h3>
                <form onSubmit={handleCreateClass} className="form-grid">
                    <div className="form-group">
                        <label>Grade Designation</label>
                        <input
                            type="text"
                            placeholder="e.g., Class 5A"
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
                    <GraduationCap size={20} color="var(--primary)" />
                    Academic Grade & Faculty Management
                </h3>
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th style={{ textAlign: 'center' }}>Total Students</th>
                                <th>Linked Faculty</th>
                                <th>Assign Teacher</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {classes.map((c: any) => (
                                <tr key={c.id}>
                                    <td style={{ fontWeight: '600', color: 'var(--primary)' }}>
                                        {c.name}
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Level {c.grade}</div>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span style={{ fontWeight: '700' }}>{c._count?.students || 0}</span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                            {c.teachers?.map((t: any) => (
                                                <span key={t.id} className="badge" style={{
                                                    background: 'var(--primary-soft)',
                                                    color: 'var(--primary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '2px 8px'
                                                }}>
                                                    {t.name}
                                                    <button
                                                        onClick={() => handleRemoveTeacher(c.id, t.id)}
                                                        style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: 0, display: 'flex' }}
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </span>
                                            ))}
                                            {(!c.teachers || c.teachers.length === 0) && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unassigned</span>}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                                                <select
                                                    value={selectedTeachers[c.id] || ''}
                                                    onChange={(e) => setSelectedTeachers({ ...selectedTeachers, [c.id]: e.target.value })}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px 12px',
                                                        paddingRight: '30px', /* space for icon */
                                                        borderRadius: 'var(--radius-md)',
                                                        border: '1px solid var(--border-soft)',
                                                        fontSize: '0.85rem',
                                                        color: 'var(--text-main)',
                                                        outline: 'none',
                                                        appearance: 'none',
                                                        background: 'white',
                                                        boxShadow: 'var(--shadow-sm)',
                                                        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                                                        cursor: 'pointer'
                                                    }}
                                                    onFocus={(e) => {
                                                        e.target.style.borderColor = 'var(--primary)';
                                                        e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                                                    }}
                                                    onBlur={(e) => {
                                                        e.target.style.borderColor = 'var(--border-soft)';
                                                        e.target.style.boxShadow = 'var(--shadow-sm)';
                                                    }}
                                                >
                                                    <option value="" disabled hidden>Select Teacher...</option>
                                                    {teachers.filter((t: any) => !c.teachers?.some((ct: any) => ct.id === t.id)).map((t: any) => (
                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                    ))}
                                                </select>
                                                <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>
                                                    <ChevronDown size={14} />
                                                </div>
                                            </div>
                                            <button
                                                className="btn-primary btn-sm"
                                                onClick={() => handleAssignTeacher(c.id)}
                                                disabled={!selectedTeachers[c.id]}
                                                style={{
                                                    padding: '8px 16px',
                                                    borderRadius: 'var(--radius-md)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    opacity: !selectedTeachers[c.id] ? 0.6 : 1,
                                                    boxShadow: !selectedTeachers[c.id] ? 'none' : 'var(--shadow-md)',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                <Link size={14} /> Link
                                            </button>
                                        </div>
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
