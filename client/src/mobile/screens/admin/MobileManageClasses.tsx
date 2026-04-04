import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, ArrowLeft, Loader2, Plus, X, BookOpen, IndianRupee, Save, Trash, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import ConfirmModal from '../../../components/common/ConfirmModal';
import Modal from '../../../components/common/Modal';
import useServerEvents from '../../../hooks/useServerEvents';

export default function MobileManageClasses() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    
    const [activeTab, setActiveTab] = useState<'directory' | 'enroll'>('directory');
    
    // Directory State
    const [classes, setClasses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: '' });
    const [removeSubjectModal, setRemoveSubjectModal] = useState({ isOpen: false, subjectId: '', subjectName: '', cls: null as any });

    // Enroll State
    const [isCreating, setIsCreating] = useState(false);
    const [newClass, setNewClass] = useState({ 
        name: '', grade: '', monthlyFee: '', 
        subjects: [] as { name: string, fullMarks: string }[] 
    });

    // Subject Dialog State
    const [subjectModal, setSubjectModal] = useState({ 
        isOpen: false, 
        targetClass: null as any, 
        name: '', 
        fullMarks: '100', 
        editingSubjectId: null as string | null, 
        originalName: '' 
    });

    const fetchClasses = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/users/classes');
            setClasses(res.data || []);
        } catch (error) {
            console.error("Failed to fetch classes", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchClasses();
    }, []);

    useServerEvents({
        'class:updated': () => fetchClasses()
    });

    const handleCreateClass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClass.name || !newClass.grade) {
            showToast('Class Name and Grade are required', 'error');
            return;
        }
        setIsCreating(true);
        try {
            await api.post('/users/classes', {
                name: newClass.name,
                grade: parseInt(newClass.grade),
                monthlyFee: parseFloat(newClass.monthlyFee) || 0,
                subjects: newClass.subjects
            });
            showToast('Class created successfully!', 'success');
            setNewClass({ name: '', grade: '', monthlyFee: '', subjects: [] });
            setActiveTab('directory');
            fetchClasses();
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to create class', 'error');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteClass = async () => {
        try {
            await api.delete(`/users/classes/${deleteModal.id}`);
            showToast('Class deleted', 'success');
            setDeleteModal({ isOpen: false, id: '' });
            fetchClasses();
        } catch (error) {
            showToast('Failed to delete class', 'error');
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
            showToast('Subjects updated!', 'success');
            fetchClasses();
        } catch (err) {
            showToast('Failed to update subjects', 'error');
        }
    };

    const handleUpdateFee = async (cls: any, fee: string) => {
        try {
            await api.patch(`/users/classes/${cls.id}`, { 
                name: cls.name, 
                grade: cls.grade, 
                monthlyFee: parseFloat(fee) || 0 
            });
            showToast('Monthly fee updated!', 'success');
            fetchClasses();
        } catch (err) {
            showToast('Failed to update fee', 'error');
        }
    };

    return (
        <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '100%', paddingBottom: '40px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div onClick={() => navigate(-1)} style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', cursor: 'pointer' }}>
                    <ArrowLeft size={20} />
                </div>
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)', fontFamily: 'Outfit', margin: 0 }}>Academic Structure</h1>
                    <p style={{ color: 'var(--text-muted)', fontWeight: '500', fontSize: '11px', margin: 0 }}>
                        {activeTab === 'directory' ? `${classes.length} classes defined.` : 'Set up new academic grade'}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '4px', borderRadius: '16px', border: '1px solid var(--border-soft)' }}>
                <div onClick={() => setActiveTab('directory')} style={{ flex: 1, padding: '10px 0', textAlign: 'center', borderRadius: '12px', background: activeTab === 'directory' ? 'var(--primary-soft)' : 'transparent', color: activeTab === 'directory' ? 'var(--primary-bold)' : 'var(--text-muted)', fontWeight: activeTab === 'directory' ? '800' : '600', fontSize: '13px', cursor: 'pointer' }}>Curriculum</div>
                <div onClick={() => setActiveTab('enroll')} style={{ flex: 1, padding: '10px 0', textAlign: 'center', borderRadius: '12px', background: activeTab === 'enroll' ? 'var(--primary-soft)' : 'transparent', color: activeTab === 'enroll' ? 'var(--primary-bold)' : 'var(--text-muted)', fontWeight: activeTab === 'enroll' ? '800' : '600', fontSize: '13px', cursor: 'pointer' }}>Setup</div>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'directory' ? (
                    <motion.div key="directory" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 className="animate-spin" color="var(--primary-bold)" /></div>
                        ) : classes.length > 0 ? (
                            classes.map(cls => (
                                <div key={cls.id} style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '20px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-soft)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                                            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}>
                                                <GraduationCap size={24} />
                                            </div>
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '900', color: 'var(--text-main)' }}>{cls.name}</h3>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                                                    <span style={{ fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '6px', background: 'var(--bg-soft)', color: 'var(--text-muted)' }}>LEVEL {cls.grade}</span>
                                                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--border-soft)' }}></div>
                                                    <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-bold)', display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={12} /> {cls._count?.students || 0} Students</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => setDeleteModal({ isOpen: true, id: cls.id })} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '10px', borderRadius: '12px' }}><Trash size={18} /></button>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                                            <BookOpen size={14} />
                                            <span style={{ fontSize: '12px', fontWeight: '800' }}>Academic Subjects</span>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {cls.subjects?.map((s: any) => (
                                                <div key={s.id} onClick={() => setSubjectModal({ isOpen: true, targetClass: cls, name: s.name, fullMarks: s.fullMarks, editingSubjectId: s.id, originalName: s.name })} style={{ fontSize: '11px', background: 'var(--bg-soft)', padding: '6px 10px', borderRadius: '10px', border: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>{s.name} ({s.fullMarks})</span>
                                                    <X size={12} onClick={(e) => {
                                                        e.stopPropagation();
                                                        setRemoveSubjectModal({ isOpen: true, subjectId: s.id, subjectName: s.name, cls: cls });
                                                    }} />
                                                </div>
                                            ))}
                                            <button onClick={() => setSubjectModal({ isOpen: true, targetClass: cls, name: '', fullMarks: '100', editingSubjectId: null, originalName: '' })} style={{ padding: '6px 12px', borderRadius: '10px', border: '1px dashed var(--primary-bold)', background: 'transparent', color: 'var(--primary-bold)', fontSize: '11px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Plus size={12} /> Add
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ height: '1px', background: 'var(--border-soft)' }}></div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}>
                                                <IndianRupee size={16} />
                                            </div>
                                            <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>Monthly Tuition Fee</span>
                                        </div>
                                        <input 
                                            type="number" 
                                            value={cls.monthlyFee || 0} 
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setClasses(prev => prev.map(item => item.id === cls.id ? { ...item, monthlyFee: val } : item));
                                            }}
                                            onBlur={(e) => handleUpdateFee(cls, e.target.value)}
                                            style={{ width: '90px', padding: '8px 12px', borderRadius: '100px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--primary-bold)', textAlign: 'center', fontWeight: '900', fontSize: '14px', outline: 'none' }} 
                                        />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600' }}>No classes found. Set one up!</div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div key="enroll" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <form onSubmit={handleCreateClass} style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-card)', padding: '24px', borderRadius: '24px', border: '1px solid var(--border-soft)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>Class Name *</label>
                                <input type="text" placeholder="e.g. STD-V" required style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: '700', outline: 'none' }} value={newClass.name} onChange={e => setNewClass({...newClass, name: e.target.value})} />
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                    <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>Grade Level *</label>
                                    <input type="number" placeholder="e.g. 7" required style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: '700', outline: 'none' }} value={newClass.grade} onChange={e => setNewClass({...newClass, grade: e.target.value})} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                    <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>Monthly Fee (₹)</label>
                                    <input type="number" placeholder="0" style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', fontWeight: '700', outline: 'none' }} value={newClass.monthlyFee} onChange={e => setNewClass({...newClass, monthlyFee: e.target.value})} />
                                </div>
                            </div>

                            <div style={{ marginTop: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}><BookOpen size={16} /> Initial Subjects</label>
                                    <button type="button" onClick={() => setSubjectModal({ isOpen: true, targetClass: null, name: '', fullMarks: '100', editingSubjectId: null, originalName: '' })} style={{ background: 'var(--primary-soft)', color: 'var(--primary-bold)', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '800' }}>+ Add Subject</button>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {newClass.subjects.length === 0 ? (
                                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', margin: 0 }}>No subjects defined yet.</p>
                                    ) : (
                                        newClass.subjects.map((s, idx) => (
                                            <div key={idx} style={{ background: 'var(--bg-soft)', border: '1px solid var(--border-soft)', padding: '6px 12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span onClick={() => setSubjectModal({ isOpen: true, targetClass: null, name: s.name, fullMarks: s.fullMarks, editingSubjectId: idx.toString(), originalName: s.name })} style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-bold)' }}>{s.name} ({s.fullMarks})</span>
                                                <X size={14} color="var(--danger)" onClick={() => setNewClass(prev => ({ ...prev, subjects: prev.subjects.filter((_, i) => i !== idx) }))} />
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <button type="submit" disabled={isCreating} style={{ marginTop: '12px', padding: '16px', borderRadius: '14px', border: 'none', background: 'var(--primary-bold)', color: '#fff', fontWeight: '900', fontSize: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                                {isCreating ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} Initialize Class
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Subject Dialog */}
            <Modal
                isOpen={subjectModal.isOpen}
                onClose={() => setSubjectModal({ ...subjectModal, isOpen: false })}
                title={subjectModal.targetClass ? (subjectModal.editingSubjectId ? "Edit Subject" : "New Subject") : "Define Subject"}
                footer={
                    <button 
                        onClick={() => {
                            if (!subjectModal.name.trim()) return;
                            if (subjectModal.targetClass) {
                                let updated;
                                if (subjectModal.editingSubjectId) {
                                    updated = subjectModal.targetClass.subjects.map((x: any) => 
                                        x.id === subjectModal.editingSubjectId ? { ...x, name: subjectModal.name.trim(), fullMarks: subjectModal.fullMarks } : x
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
                            setSubjectModal({ ...subjectModal, isOpen: false });
                        }}
                        style={{ width: '100%', background: 'var(--primary-bold)', color: 'white', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: '800' }}
                    >
                        {subjectModal.editingSubjectId ? "Save Changes" : "Add Subject"}
                    </button>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>Subject Name</label>
                        <input type="text" placeholder="e.g. Mathematics" style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none', fontWeight: '700' }} value={subjectModal.name} onChange={e => setSubjectModal({...subjectModal, name: e.target.value})} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>Full Marks</label>
                        <input type="number" placeholder="100" style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none', fontWeight: '700' }} value={subjectModal.fullMarks} onChange={e => setSubjectModal({...subjectModal, fullMarks: e.target.value})} />
                    </div>
                </div>
            </Modal>

            <ConfirmModal 
                isOpen={deleteModal.isOpen} 
                onClose={() => setDeleteModal({ isOpen: false, id: '' })}
                onConfirm={handleDeleteClass}
                title="Delete Class?"
                message="This will remove this class permanently. All enrolled students will be dissociated."
                variant="danger"
            />

            <ConfirmModal 
                isOpen={removeSubjectModal.isOpen}
                onClose={() => setRemoveSubjectModal({ ...removeSubjectModal, isOpen: false })}
                onConfirm={() => {
                    const updated = removeSubjectModal.cls.subjects.filter((x: any) => x.id !== removeSubjectModal.subjectId);
                    handleUpdateClassSubjects(removeSubjectModal.cls, updated);
                    setRemoveSubjectModal({ ...removeSubjectModal, isOpen: false });
                }}
                title="Remove Subject?"
                message={`Delete "${removeSubjectModal.subjectName}" from ${removeSubjectModal.cls?.name}?`}
                variant="danger"
            />
        </motion.div>
    );
}
