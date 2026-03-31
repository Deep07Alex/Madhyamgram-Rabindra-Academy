/**
 * Unified Asset Management (CMS)
 * 
 * A centralized interface for managing all public-facing content:
 * - Hero & Festival Banners
 * - Class Toppers (Academic Excellence)
 * - School Resources (Downloadable files)
 * - School Gallery & Alumni Memories
 */
import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../common/ConfirmModal';
import {
    Image as ImageIcon,
    Trash2,
    Monitor,
    Star,
    Trophy,
    FileText,
    Users,
    Upload,
    Edit,
    X
} from 'lucide-react';

type TabType = 'hero' | 'festivals' | 'toppers' | 'resources' | 'gallery' | 'alumni';

const ManageAssets = () => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<TabType>('hero');
    const [resetKey, setResetKey] = useState(0); // Add a key to force re-mounting inputs
    const fileInputRef = useRef<HTMLInputElement>(null);


    // Common states
    const [isUploading, setIsUploading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: '', type: '' as TabType });
    const [previewUrl, setPreviewUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Data states
    const [heroBanner, setHeroBanner] = useState('');
    const [festivalBanners, setFestivalBanners] = useState([]);
    const [toppers, setToppers] = useState([]);
    const [resources, setResources] = useState([]);
    const [galleryImages, setGalleryImages] = useState([]);
    const [alumniPhotos, setAlumniPhotos] = useState([]);

    // Form states
    const [topperForm, setTopperForm] = useState({ name: '', class: '', rank: '', gender: 'boy', session: '2025-26' });
    const [resourceForm, setResourceForm] = useState({ title: '', category: 'General' });
    const [alumniForm, setAlumniForm] = useState({ batch: '', description: '' });
    const [festivalForm, setFestivalForm] = useState({ title: '' });
    const [galleryForm, setGalleryForm] = useState({ title: '' });

    const baseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || '';

    const fetchData = async () => {
        try {
            const [heroRes, festRes, toppersRes, resRes, galleryRes, alumniRes] = await Promise.all([
                api.get('/system/hero-banner'),
                api.get('/system/festival-banner/all'),
                api.get('/toppers'),
                api.get('/resources'),
                api.get('/gallery'),
                api.get('/alumni')
            ]);
            setHeroBanner(heroRes.data.url);
            setFestivalBanners(festRes.data.banners || []);
            setToppers(toppersRes.data.students || []);
            setResources(resRes.data || []);
            setGalleryImages(galleryRes.data || []);
            setAlumniPhotos(alumniRes.data || []);
        } catch (error) {
            console.error('Failed to fetch assets:', error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const resetForm = () => {
        setSelectedFile(null);
        setPreviewUrl('');
        setEditingId(null);
        setTopperForm({ name: '', class: '', rank: '', gender: 'boy', session: '2025-26' });
        setResourceForm({ title: '', category: 'General' });
        setAlumniForm({ batch: '', description: '' });
        setFestivalForm({ title: '' });
        setGalleryForm({ title: '' });
        setResetKey(prev => prev + 1);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Cleanup blob URLs to prevent memory leaks
    useEffect(() => {
        return () => {
            if (previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleEdit = (item: any) => {
        setEditingId(item.id);
        setPreviewUrl(''); // Clear new file preview

        switch (activeTab) {
            case 'festivals':
                setFestivalForm({ title: item.title });
                setPreviewUrl(`${baseUrl}${item.imageUrl}`);
                break;
            case 'toppers':
                setTopperForm({ name: item.name, class: item.class, rank: item.rank, gender: item.gender, session: item.session });
                setPreviewUrl(`${baseUrl}${item.photo}`);
                break;
            case 'resources':
                setResourceForm({ title: item.title, category: item.category });
                break;
            case 'gallery':
                setGalleryForm({ title: item.title });
                setPreviewUrl(`${baseUrl}${item.imageUrl}`);
                break;
            case 'alumni':
                setAlumniForm({ batch: item.batch, description: item.description || '' });
                setPreviewUrl(`${baseUrl}${item.imageUrl}`);
                break;
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile && !editingId && activeTab !== 'hero') {
            showToast('Please select a file to upload.', 'warning');
            return;
        }

        setIsUploading(true);
        const formData = new FormData();

        // Add file if selected
        if (selectedFile) {
            const fieldName = activeTab === 'resources' ? 'file' :
                (activeTab === 'hero' || activeTab === 'festivals' ? 'banner' :
                    (activeTab === 'toppers' ? 'photo' : 'image'));
            formData.append(fieldName, selectedFile);
        }

        // Add specific form data
        if (activeTab === 'toppers') {
            Object.entries(topperForm).forEach(([k, v]) => formData.append(k, v));
        } else if (activeTab === 'resources') {
            Object.entries(resourceForm).forEach(([k, v]) => formData.append(k, v));
        } else if (activeTab === 'alumni') {
            Object.entries(alumniForm).forEach(([k, v]) => formData.append(k, v));
        } else if (activeTab === 'festivals') {
            formData.append('title', festivalForm.title);
        } else if (activeTab === 'gallery') {
            formData.append('title', galleryForm.title);
        }

        try {
            let endpoint = '';
            switch (activeTab) {
                case 'hero': endpoint = '/system/hero-banner'; break;
                case 'festivals': endpoint = editingId ? `/system/festival-banner/${editingId}` : '/system/festival-banner/add'; break;
                case 'toppers': endpoint = editingId ? `/toppers/${editingId}` : '/toppers'; break;
                case 'resources': endpoint = editingId ? `/resources/${editingId}` : '/resources'; break;
                case 'gallery': endpoint = editingId ? `/gallery/${editingId}` : '/gallery'; break;
                case 'alumni': endpoint = editingId ? `/alumni/${editingId}` : '/alumni'; break;
            }

            if (editingId) {
                await api.patch(endpoint, formData);
                showToast('Asset updated successfully!', 'success');
            } else {
                await api.post(endpoint, formData);
                showToast('Asset published successfully!', 'success');
            }

            resetForm();
            fetchData();
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Action failed.', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteModal.id) return;
        try {
            let endpoint = '';
            switch (deleteModal.type) {
                case 'festivals': endpoint = `/system/festival-banner/${deleteModal.id}`; break;
                case 'toppers': endpoint = `/toppers/${deleteModal.id}`; break;
                case 'resources': endpoint = `/resources/${deleteModal.id}`; break;
                case 'gallery': endpoint = `/gallery/${deleteModal.id}`; break;
                case 'alumni': endpoint = `/alumni/${deleteModal.id}`; break;
            }
            await api.delete(endpoint);
            showToast('Item removed.', 'success');
            setDeleteModal({ isOpen: false, id: '', type: '' as TabType });
            fetchData();
        } catch (error) {
            showToast('Delete failed.', 'error');
        }
    };

    return (
        <div className="manage-section">
            <div className="tab-navigation" style={{ display: 'flex', gap: '8px', marginBottom: '32px', overflowX: 'auto', paddingBottom: '8px' }}>
                {[
                    { id: 'hero', icon: <Monitor size={16} />, label: 'Hero' },
                    { id: 'festivals', icon: <Star size={16} />, label: 'Festivals' },
                    { id: 'toppers', icon: <Trophy size={16} />, label: 'Toppers' },
                    { id: 'resources', icon: <FileText size={16} />, label: 'Resources' },
                    { id: 'gallery', icon: <ImageIcon size={16} />, label: 'Gallery' },
                    { id: 'alumni', icon: <Users size={16} />, label: 'Alumni' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id as TabType); resetForm(); }}
                        className={`btn-tab ${activeTab === tab.id ? 'active' : ''}`}
                        style={{
                            padding: '12px 20px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px',
                            background: activeTab === tab.id ? 'var(--primary-bold)' : 'var(--bg-card)',
                            color: activeTab === tab.id ? 'white' : 'var(--text-main)',
                            border: '1px solid var(--border-soft)', fontWeight: '700', whiteSpace: 'nowrap'
                        }}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            <div className="card-container" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ textTransform: 'capitalize' }}>{editingId ? 'Edit' : 'Manage'} {activeTab} Content</h3>
                        {editingId && (
                            <button onClick={resetForm} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                                <X size={14} /> Cancel Edit
                            </button>
                        )}
                    </div>
                    <form onSubmit={handleUpload} className="form-grid" style={{ marginTop: '20px' }}>

                        {/* Tab Specific Fields */}
                        {activeTab === 'festivals' && (
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Festival Title</label>
                                <input type="text" value={festivalForm.title} onChange={e => setFestivalForm({ title: e.target.value })} placeholder="e.g., Rabindra Jayenti" required />
                            </div>
                        )}

                        {activeTab === 'toppers' && (
                            <>
                                <div className="form-group">
                                    <label>Student Name</label>
                                    <input type="text" value={topperForm.name} onChange={e => setTopperForm({ ...topperForm, name: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Class</label>
                                    <input type="text" value={topperForm.class} onChange={e => setTopperForm({ ...topperForm, class: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Rank (e.g. 1st)</label>
                                    <input type="text" value={topperForm.rank} onChange={e => setTopperForm({ ...topperForm, rank: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Academic Session</label>
                                    <input type="text" value={topperForm.session} onChange={e => setTopperForm({ ...topperForm, session: e.target.value })} required />
                                </div>
                            </>
                        )}

                        {activeTab === 'resources' && (
                            <>
                                <div className="form-group">
                                    <label>Resource Title</label>
                                    <input type="text" value={resourceForm.title} onChange={e => setResourceForm({ ...resourceForm, title: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Category</label>
                                    <input type="text" value={resourceForm.category} onChange={e => setResourceForm({ ...resourceForm, category: e.target.value })} placeholder="e.g., Admission, Exam" />
                                </div>
                            </>
                        )}

                        {activeTab === 'alumni' && (
                            <>
                                <div className="form-group">
                                    <label>Batch (Year)</label>
                                    <input type="text" value={alumniForm.batch} onChange={e => setAlumniForm({ ...alumniForm, batch: e.target.value })} placeholder="e.g. 2024" required />
                                </div>
                                <div className="form-group">
                                    <label>Description (Optional)</label>
                                    <input type="text" value={alumniForm.description} onChange={e => setAlumniForm({ ...alumniForm, description: e.target.value })} />
                                </div>
                            </>
                        )}

                        {activeTab === 'gallery' && (
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Moment Title</label>
                                <input type="text" value={galleryForm.title} onChange={e => setGalleryForm({ title: e.target.value })} placeholder="Annual Sports 2026" required />
                            </div>
                        )}

                        {/* Common File Upload */}
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>{activeTab === 'resources' ? (editingId ? 'Replace File (Optional)' : 'Select File (PDF/Doc)') : (editingId ? 'Replace Image (Optional)' : 'Select Image')}</label>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    position: 'relative', width: '100%', aspectRatio: activeTab === 'resources' ? 'auto' : '16/9',
                                    minHeight: '100px', border: '2px dashed var(--primary-bold)', borderRadius: '12px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary-soft)',
                                    overflow: 'hidden', cursor: 'pointer'
                                }}
                            >
                                {(previewUrl || (activeTab === 'hero' && heroBanner)) && activeTab !== 'resources' ? (
                                    <img
                                        src={previewUrl ? previewUrl : (activeTab === 'hero' && heroBanner ? `${baseUrl}${heroBanner}` : '')}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
                                        alt="Current or preview"
                                    />
                                ) : (
                                    <div style={{ textAlign: 'center', pointerEvents: 'none' }}>
                                        {activeTab === 'resources' ? <Upload size={30} /> : <ImageIcon size={30} />}
                                        <p style={{ margin: '8px 0 0', fontSize: '0.8rem' }}>{selectedFile ? selectedFile.name : 'Click to Browse'}</p>
                                    </div>
                                )}
                                <input
                                    key={resetKey}
                                    ref={fileInputRef}
                                    type="file"
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                />
                            </div>
                        </div>

                        <button className="btn-primary" type="submit" disabled={isUploading} style={{ gridColumn: 'span 2', height: '48px' }}>
                            {isUploading ? 'Processing...' : (editingId ? 'Update & Save' : 'Save & Publish')}
                        </button>
                    </form>
                </div>

                {/* List Views */}
                {activeTab !== 'hero' && (
                    <div className="card" style={{ marginTop: '24px' }}>
                        <h3>Active {activeTab}</h3>
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        {activeTab === 'resources' ? (
                                            <><th>Title</th><th>Category</th></>
                                        ) : (
                                            <><th>Preview</th><th>Detail</th></>
                                        )}
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(activeTab === 'festivals' ? festivalBanners :
                                        activeTab === 'toppers' ? toppers :
                                            activeTab === 'resources' ? resources :
                                                activeTab === 'gallery' ? galleryImages :
                                                    activeTab === 'alumni' ? alumniPhotos : []).map((item: any) => (
                                                        <tr key={item.id}>
                                                            {activeTab === 'resources' ? (
                                                                <>
                                                                    <td style={{ fontWeight: 700 }}>{item.title}</td>
                                                                    <td>{item.category}</td>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <td>
                                                                        <img
                                                                            src={`${baseUrl}${item.imageUrl || item.photo}`}
                                                                            style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                                                                            alt="Preview"
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <div style={{ fontWeight: 700 }}>{item.title || item.name || `Batch ${item.batch}`}</div>
                                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.class || item.description || ''}</div>
                                                                    </td>
                                                                </>
                                                            )}
                                                            <td style={{ textAlign: 'right' }}>
                                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                                    <button onClick={() => handleEdit(item)} className="btn-primary btn-sm" style={{ background: 'var(--primary-soft)', color: 'var(--primary-bold)', border: 'none' }}><Edit size={14} /></button>
                                                                    <button onClick={() => setDeleteModal({ isOpen: true, id: item.id, type: activeTab })} className="btn-danger btn-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)', border: 'none' }}><Trash2 size={14} /></button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                onConfirm={handleDelete}
                title="Remove Item"
                message="Are you sure you want to delete this content? This action is permanent."
            />
        </div>
    );
};

export default ManageAssets;
