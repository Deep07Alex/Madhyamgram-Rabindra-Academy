/**
 * Grade & Class Management (Admin)
 * 
 * Provides an interface for administrators to define and manage academic classes.
 * Features:
 * - Dynamic Listing: Shows all classes with their respective grade levels.
 * - Population Tracking: Displays total students currently enrolled in each class.
 * - Resource Safety: Uses AbortController to prevent memory leaks during data fetching.
 */
import { useState, useEffect } from 'react';
import axios from 'axios';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../common/ConfirmModal';
import { GraduationCap, Trash2, Plus, Loader2, BookOpen, X } from 'lucide-react';
import useServerEvents from '../../hooks/useServerEvents';

const ManageClasses = () => {
    const [classes, setClasses] = useState<any[]>([]);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: '' });
    const [newClass, setNewClass] = useState({ 
        name: '', 
        grade: '', 
        monthlyFee: '', 
        subjects: [] as { name: string, fullMarks: string }[] 
    });
    const [subjectModal, setSubjectModal] = useState({ isOpen: false, targetClass: null as any, name: '', fullMarks: '100', editingSubjectId: null as string | null, originalName: '' });
    const [removeSubjectModal, setRemoveSubjectModal] = useState({ isOpen: false, subjectId: '', subjectName: '', cls: null as any });
    const [isCreating, setIsCreating] = useState(false);

    const { showToast } = useToast();

    const fetchData = async (signal?: AbortSignal) => {
        try {
            const clsRes = await api.get('/users/classes', { signal });
            setClasses(clsRes.data);
        } catch (error: any) {
            if (axios.isCancel(error)) return;
            console.error('Failed to fetch data:', error);
        }
    };

    /**
     * Data Lifecycle: 
     * Uses AbortController to cancel any pending requests if the component unmounts
     * before the API responds, ensuring stability.
     */
    useEffect(() => {
        const controller = new AbortController();
        fetchData(controller.signal);
        return () => controller.abort();
    }, []);

    useServerEvents({
        'class:updated': () => fetchData()
    });

    const handleCreateClass = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (classes.some(c => c.name.toLowerCase() === newClass.name.toLowerCase())) {
            showToast('Class name already exists', 'error');
            return;
        }
        if (classes.some(c => c.grade.toString() === newClass.grade)) {
            showToast('Grade level already exists', 'error');
            return;
        }

        if (!newClass.name || !newClass.grade) {
            showToast('Name and Grade level are required', 'error');
            return;
        }
        setIsCreating(true);
        try {
            await api.post('/users/classes', {
                name: newClass.name,
                grade: parseInt(newClass.grade),
                monthlyFee: parseFloat(newClass.monthlyFee) || 0,
                subjects: newClass.subjects.filter(s => s.name)
            });
            showToast(`Class ${newClass.name} created successfully!`, 'success');
            setNewClass({ name: '', grade: '', monthlyFee: '', subjects: [] });
            fetchData();
        } catch (error: any) {
            console.error('Failed to create class:', error);
            const msg = error.response?.data?.message || 'Failed to create class';
            showToast(msg, 'error');
        } finally {
            setIsCreating(false);
        }
    };

    const handleUpdateClassSubjects = async (cls: any, subjects: any[]) => {
        try {
            await api.patch(`/users/classes/${cls.id}`, {
                name: cls.name,
                grade: cls.grade,
                monthlyFee: cls.monthlyFee,
                subjects: subjects
            });
            showToast(`Subjects updated for ${cls.name}`, 'success');
            fetchData();
        } catch (err) {
            showToast('Failed to update subjects', 'error');
        }
    };

    const handleDeleteClass = async () => {
        if (!deleteModal.id) return;
        try {
            await api.delete(`/users/classes/${deleteModal.id}`);
            setClasses(classes.filter(c => c.id !== deleteModal.id));
            setDeleteModal({ isOpen: false, id: '' });
            showToast('Class deleted', 'success');
        } catch (error) {
            console.error('Failed to delete class:', error);
            showToast('Failed to delete class', 'error');
        }
    };

    const gradeExists = classes.some(c => c.grade.toString() === newClass.grade);
    const nameExists = classes.some(c => c.name.toLowerCase() === newClass.name.toLowerCase());

    return (
        <div className="manage-section">            
            <div className="card" style={{ marginTop: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                <h3 style={{ margin: 0 }}>
                    <GraduationCap size={20} color="var(--primary-bold)" style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    Academic Grade & Faculty Management
                </h3>
            </div>

            {/* Add New Class Form */}
            <form onSubmit={handleCreateClass} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', background: 'var(--primary-soft)', padding: '20px', borderRadius: '12px', border: '1px solid var(--primary-bold)', marginBottom: '24px', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ margin: 0, flex: 2, minWidth: '200px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary-bold)' }}>New Class Name</label>
                    <input type="text" placeholder="e.g. STD-V" value={newClass.name} onChange={e => setNewClass({...newClass, name: e.target.value})} style={{ borderColor: nameExists ? 'var(--danger)' : undefined }} required />
                    {nameExists && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', fontWeight: 700, animation: 'fadeIn 0.2s ease' }}>Class name already exists!</p>}
                </div>
                <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '120px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary-bold)' }}>Grade Level</label>
                    <input type="number" placeholder="e.g. 7" value={newClass.grade} onChange={e => setNewClass({...newClass, grade: e.target.value})} onWheel={e => e.currentTarget.blur()} style={{ borderColor: gradeExists ? 'var(--danger)' : undefined }} required />
                    {gradeExists && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', fontWeight: 700, animation: 'fadeIn 0.2s ease' }}>Grade level already exists!</p>}
                </div>
                <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '150px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary-bold)' }}>Monthly Fee (₹)</label>
                    <input type="number" placeholder="0" value={newClass.monthlyFee} onChange={e => setNewClass({...newClass, monthlyFee: e.target.value})} onWheel={e => e.currentTarget.blur()} />
                </div>
                <button type="submit" disabled={isCreating || gradeExists || nameExists} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '44px', padding: '0 24px' }}>
                    {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    Add Class
                </button>
            </form>

            {/* Subject Builder for New Class */}
            <div style={{ padding: '0 20px 20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BookOpen size={16} /> Define Subjects:
                </span>
                {newClass.subjects.map((s, idx) => (
                    <div key={idx} style={{ background: 'var(--bg-main)', border: '1px solid var(--border-soft)', padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span 
                            style={{ fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', transition: 'color 0.2s' }}
                            title="Click to Edit"
                            onClick={() => setSubjectModal({ isOpen: true, targetClass: null, name: s.name, fullMarks: s.fullMarks, editingSubjectId: idx.toString(), originalName: s.name })}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--primary-bold)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'inherit'}
                        >
                            {s.name} <span style={{ color: 'var(--text-muted)' }}>({s.fullMarks})</span>
                        </span>
                        <X size={14} style={{ cursor: 'pointer', color: 'var(--danger)' }} onClick={() => {
                            setNewClass(prev => ({ ...prev, subjects: prev.subjects.filter((_, i) => i !== idx) }));
                        }} />
                    </div>
                ))}
                <button 
                    type="button"
                    onClick={() => setSubjectModal({ isOpen: true, targetClass: null, name: '', fullMarks: '100', editingSubjectId: null, originalName: '' })}
                    style={{ background: 'none', border: '1px dashed var(--primary-bold)', color: 'var(--primary-bold)', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                >
                    <Plus size={14} /> Add Subject
                </button>
            </div>
            <div className="table-responsive">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th style={{ textAlign: 'center' }}>Total Students</th>
                            <th style={{ textAlign: 'left' }}>Subjects</th>
                            <th style={{ textAlign: 'center' }}>Monthly Fee (₹)</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {classes.map((c: any) => (
                            <tr key={c.id}>
                                <td style={{ fontWeight: '600', color: 'var(--primary-bold)', minWidth: '120px' }}>
                                    {c.name}
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Level {c.grade}</div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <span style={{ fontWeight: '700' }}>{c._count?.students || 0}</span>
                                </td>
                                <td style={{ textAlign: 'left', minWidth: '200px' }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                        {c.subjects?.map((s: any) => (
                                            <div 
                                                key={s.id} 
                                                style={{ fontSize: '0.75rem', background: 'var(--primary-soft)', padding: '4px 6px 4px 10px', borderRadius: '14px', border: '1px solid var(--border-soft)', color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                                            >
                                                <span 
                                                    onClick={() => setSubjectModal({ isOpen: true, targetClass: c, name: s.name, fullMarks: s.fullMarks, editingSubjectId: s.id, originalName: s.name })}
                                                    title="Click to Edit"
                                                    style={{ cursor: 'pointer', fontWeight: 700 }}
                                                    onMouseEnter={e => e.currentTarget.style.color = 'var(--primary-bold)'}
                                                    onMouseLeave={e => e.currentTarget.style.color = 'inherit'}
                                                >
                                                    {s.name} <span style={{ opacity: 0.6, fontSize: '0.7rem' }}>({s.fullMarks})</span>
                                                </span>
                                                <X size={12} 
                                                    style={{ cursor: 'pointer', padding: '2px', borderRadius: '50%', background: 'rgba(0,0,0,0.05)', color: 'inherit' }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger)'; e.currentTarget.style.color = 'white'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; e.currentTarget.style.color = 'inherit'; }}
                                                    onClick={() => setRemoveSubjectModal({ isOpen: true, subjectId: s.id, subjectName: s.name, cls: c })}
                                                />
                                            </div>
                                        ))}
                                        <button 
                                            onClick={() => setSubjectModal({ isOpen: true, targetClass: c, name: '', fullMarks: '100', editingSubjectId: null, originalName: '' })}
                                            style={{ padding: '4px 12px', borderRadius: '14px', border: '1px dashed var(--primary-bold)', background: 'none', color: 'var(--primary-bold)', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s' }}
                                        >
                                            <Plus size={12} /> Add
                                        </button>
                                    </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <input 
                                            type="number" 
                                            value={c.monthlyFee || 0} 
                                            onWheel={e => e.currentTarget.blur()}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setClasses(prev => prev.map(item => item.id === c.id ? { ...item, monthlyFee: val } : item));
                                            }}
                                            onBlur={async (e) => {
                                                const fee = e.target.value;
                                                try {
                                                    await api.patch(`/users/classes/${c.id}`, { 
                                                        name: c.name, 
                                                        grade: c.grade, 
                                                        monthlyFee: parseFloat(fee) || 0 
                                                    });
                                                    showToast(`Fee for ${c.name} updated!`, 'success');
                                                    fetchData();
                                                } catch (err) {
                                                    showToast('Failed to update fee', 'error');
                                                    fetchData(); // Rollback to server state
                                                }
                                            }}
                                            style={{ width: '80px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', textAlign: 'center', fontWeight: '800' }}
                                        />
                                    </div>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <button onClick={() => setDeleteModal({ isOpen: true, id: c.id })} className="btn-danger btn-sm" style={{ padding: '6px 12px' }} title="Delete Class">
                                        <Trash2 size={14} /> Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <ConfirmModal 
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                onConfirm={handleDeleteClass}
                title="Delete Class"
                message="Are you sure you want to permanently remove this class? This will dissociate all students currently enrolled in it."
            />
            <ConfirmModal 
                isOpen={removeSubjectModal.isOpen}
                onClose={() => setRemoveSubjectModal({ ...removeSubjectModal, isOpen: false })}
                onConfirm={() => {
                    if (!removeSubjectModal.cls) return;
                    const updated = removeSubjectModal.cls.subjects.filter((x: any) => x.id !== removeSubjectModal.subjectId);
                    handleUpdateClassSubjects(removeSubjectModal.cls, updated);
                    setRemoveSubjectModal({ ...removeSubjectModal, isOpen: false });
                }}
                title="Remove Subject"
                message={`Are you sure you want to remove "${removeSubjectModal.subjectName}" from ${removeSubjectModal.cls?.name}?`}
            />

            {/* Custom Subject Dialog Modal */}
            {subjectModal.isOpen && (
                <div className="modal-overlay" onClick={() => setSubjectModal({ ...subjectModal, isOpen: false })}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h3>{subjectModal.targetClass ? (subjectModal.editingSubjectId ? `Edit ${subjectModal.originalName} in ${subjectModal.targetClass.name}` : `Add Subject to ${subjectModal.targetClass.name}`) : (subjectModal.editingSubjectId ? `Edit ${subjectModal.originalName}` : "Define New Subject")}</h3>
                            <button className="close-btn" onClick={() => setSubjectModal({ ...subjectModal, isOpen: false })}><X size={20} /></button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px' }}>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 800 }}>Subject Name</label>
                                <input type="text" placeholder="e.g. Mathematics" value={subjectModal.name} onChange={e => setSubjectModal({...subjectModal, name: e.target.value})} autoFocus style={{ marginTop: '6px' }} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 800 }}>Full Marks (Default: 100)</label>
                                <input type="number" value={subjectModal.fullMarks} onChange={e => setSubjectModal({...subjectModal, fullMarks: e.target.value})} style={{ marginTop: '6px' }} />
                            </div>
                        </div>
                        <div className="modal-footer" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button className="btn-secondary" onClick={() => setSubjectModal({ ...subjectModal, isOpen: false })}>Cancel</button>
                            <button className="btn-primary" onClick={() => {
                                if (!subjectModal.name.trim()) {
                                    showToast("Subject name is required", "error");
                                    return;
                                }
                                if (subjectModal.targetClass) {
                                    let updated;
                                    if (subjectModal.editingSubjectId) {
                                        updated = subjectModal.targetClass.subjects.map((x: any) => 
                                            x.id === subjectModal.editingSubjectId 
                                                ? { ...x, name: subjectModal.name.trim(), fullMarks: subjectModal.fullMarks }
                                                : x
                                        );
                                    } else {
                                        updated = [...(subjectModal.targetClass.subjects || []), { name: subjectModal.name.trim(), fullMarks: subjectModal.fullMarks }];
                                    }
                                    handleUpdateClassSubjects(subjectModal.targetClass, updated);
                                } else {
                                    if (subjectModal.editingSubjectId) {
                                        setNewClass(prev => ({ 
                                            ...prev, 
                                            subjects: prev.subjects.map((x, i) => i.toString() === subjectModal.editingSubjectId ? { name: subjectModal.name.trim(), fullMarks: subjectModal.fullMarks } : x) 
                                        }));
                                    } else {
                                        setNewClass(prev => ({ 
                                            ...prev, 
                                            subjects: [...prev.subjects, { name: subjectModal.name.trim(), fullMarks: subjectModal.fullMarks }] 
                                        }));
                                    }
                                }
                                setSubjectModal({ isOpen: false, targetClass: null, name: '', fullMarks: '100', editingSubjectId: null, originalName: '' });
                            }}>{subjectModal.editingSubjectId ? "Update Subject" : "Save Subject"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </div>
    );
};

export default ManageClasses;
