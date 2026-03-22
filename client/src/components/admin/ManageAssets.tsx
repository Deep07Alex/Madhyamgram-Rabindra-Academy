/**
 * Unified Asset Management (CMS)
 * 
 * A centralized interface for managing all public-facing visual content:
 * - Hero Banner: The top-most visual on the landing page.
 * - Festival Image: The middle section for seasonal announcements.
 * - School Gallery: A collection of academic moments and activities.
 */
import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { 
    Upload, 
    Image as ImageIcon, 
    Plus, 
    Trash2, 
    List, 
    Monitor, 
    Star,
    Sparkles
} from 'lucide-react';

const ManageAssets = () => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'hero' | 'festival' | 'gallery'>('hero');
    
    // Banner states
    const [heroBanner, setHeroBanner] = useState('');
    const [festivalBanner, setFestivalBanner] = useState('');
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');

    // Gallery states
    const [galleryImages, setGalleryImages] = useState([]);
    const [galleryForm, setGalleryForm] = useState({ title: '', description: '' });
    const [galleryFile, setGalleryFile] = useState<File | null>(null);

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    const fetchData = async () => {
        try {
            const [heroRes, festRes, galleryRes] = await Promise.all([
                api.get('/system/hero-banner'),
                api.get('/system/festival-banner'),
                api.get('/gallery')
            ]);
            setHeroBanner(heroRes.data.url);
            setFestivalBanner(festRes.data.url);
            setGalleryImages(galleryRes.data);
        } catch (error) {
            console.error('Failed to fetch assets:', error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setBannerFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
        }
    };

    const handleBannerUpload = async (type: 'hero' | 'festival') => {
        if (!bannerFile) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('banner', bannerFile);

        try {
            const endpoint = type === 'hero' ? '/system/hero-banner' : '/system/festival-banner';
            const res = await api.post(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (type === 'hero') setHeroBanner(res.data.url);
            else setFestivalBanner(res.data.url);
            
            setBannerFile(null);
            setPreviewUrl('');
            showToast(`${type === 'hero' ? 'Hero' : 'Festival'} banner updated!`, 'success');
        } catch (error) {
            showToast('Upload failed.', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleGalleryUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!galleryFile) {
            showToast('Select an image.', 'warning');
            return;
        }

        const formData = new FormData();
        formData.append('title', galleryForm.title);
        formData.append('description', galleryForm.description);
        formData.append('image', galleryFile);

        try {
            await api.post('/gallery', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setGalleryForm({ title: '', description: '' });
            setGalleryFile(null);
            fetchData();
            showToast('Gallery image added!', 'success');
        } catch (error) {
            showToast('Gallery upload failed.', 'error');
        }
    };

    const handleGalleryDelete = async (id: string) => {
        if (!confirm('Delete this photo?')) return;
        try {
            await api.delete(`/gallery/${id}`);
            fetchData();
            showToast('Image removed.', 'success');
        } catch (error) {
            showToast('Delete failed.', 'error');
        }
    };

    return (
        <div className="manage-section">
            <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
                <button 
                    onClick={() => { setActiveTab('hero'); setBannerFile(null); setPreviewUrl(''); }}
                    className={`btn-tab ${activeTab === 'hero' ? 'active' : ''}`}
                    style={{ 
                        flex: 1, padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        background: activeTab === 'hero' ? 'var(--primary-bold)' : 'var(--bg-card)',
                        color: activeTab === 'hero' ? 'white' : 'var(--text-main)',
                        border: '1px solid var(--border-soft)', boxShadow: activeTab === 'hero' ? 'var(--shadow-lg)' : 'none', fontWeight: '700'
                    }}
                >
                    <Monitor size={18} /> Main Banner
                </button>
                <button 
                    onClick={() => { setActiveTab('festival'); setBannerFile(null); setPreviewUrl(''); }}
                    className={`btn-tab ${activeTab === 'festival' ? 'active' : ''}`}
                    style={{ 
                        flex: 1, padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        background: activeTab === 'festival' ? 'var(--primary-bold)' : 'var(--bg-card)',
                        color: activeTab === 'festival' ? 'white' : 'var(--text-main)',
                        border: '1px solid var(--border-soft)', boxShadow: activeTab === 'festival' ? 'var(--shadow-lg)' : 'none', fontWeight: '700'
                    }}
                >
                    <Star size={18} /> Festival Photo
                </button>
                <button 
                    onClick={() => setActiveTab('gallery')}
                    className={`btn-tab ${activeTab === 'gallery' ? 'active' : ''}`}
                    style={{ 
                        flex: 1, padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        background: activeTab === 'gallery' ? 'var(--primary-bold)' : 'var(--bg-card)',
                        color: activeTab === 'gallery' ? 'white' : 'var(--text-main)',
                        border: '1px solid var(--border-soft)', boxShadow: activeTab === 'gallery' ? 'var(--shadow-lg)' : 'none', fontWeight: '700'
                    }}
                >
                    <ImageIcon size={18} /> School Gallery
                </button>
            </div>

            {(activeTab === 'hero' || activeTab === 'festival') && (
                <div className="card" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    <h3>
                        {activeTab === 'hero' ? <Monitor size={20} color="var(--primary-bold)" /> : <Sparkles size={20} color="var(--primary-bold)" />}
                        {activeTab === 'hero' ? 'Manage Main Page Banner' : 'Manage Festival Photo'}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
                        {activeTab === 'hero' 
                            ? 'The hero banner is the first impression visitors get. Use a high-quality wide asset.' 
                            : 'This image appears in the middle section of the landing page for special occasions.'}
                    </p>

                    <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                        <div className="form-group">
                            <label>Currently Live</label>
                            <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-soft)', background: 'var(--bg-main)' }}>
                                <img 
                                    src={(activeTab === 'hero' ? heroBanner : festivalBanner).startsWith('/') ? `${baseUrl}${activeTab === 'hero' ? heroBanner : festivalBanner}` : (activeTab === 'hero' ? heroBanner : festivalBanner)} 
                                    alt="Live" 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Upload New</label>
                            <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', marginBottom: '16px' }}>
                                <input type="file" accept="image/*" onChange={handleBannerFileChange} style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer', zIndex: 10 }} />
                                <div style={{ width: '100%', height: '100%', border: '2px dashed var(--primary-bold)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary-soft)', overflow: 'hidden' }}>
                                    {previewUrl ? <img src={previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Upload size={32} color="var(--primary-bold)" />}
                                </div>
                            </div>
                            <button className="btn-primary" disabled={!bannerFile || uploading} onClick={() => handleBannerUpload(activeTab)} style={{ width: '100%', height: '48px' }}>
                                {uploading ? 'Processing...' : 'Deploy to Website'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'gallery' && (
                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    <div className="card" style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border)' }}>
                        <h3 style={{ marginBottom: '24px' }}><Plus size={20} color="var(--primary-bold)" /> Add New Moment to Gallery</h3>
                        <form onSubmit={handleGalleryUpload} className="form-grid" style={{ gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div className="form-group">
                                    <label>Event Title</label>
                                    <input type="text" placeholder="e.g., Annual Sports Day 2026" value={galleryForm.title} onChange={e => setGalleryForm({...galleryForm, title: e.target.value})} required style={{ height: '48px' }} />
                                </div>
                                <div className="form-group">
                                    <label>Description (Optional)</label>
                                    <textarea placeholder="Tell the story behind this photo..." value={galleryForm.description} onChange={e => setGalleryForm({...galleryForm, description: e.target.value})} style={{ minHeight: '100px', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-soft)', background: 'var(--bg-main)', resize: 'vertical' }} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Selection Photo</label>
                                <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', marginBottom: '16px' }}>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={e => {
                                            const file = e.target.files?.[0] || null;
                                            setGalleryFile(file);
                                            if (file) setPreviewUrl(URL.createObjectURL(file));
                                            else setPreviewUrl('');
                                        }} 
                                        style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer', zIndex: 10 }} 
                                    />
                                    <div style={{ 
                                        width: '100%', 
                                        height: '100%', 
                                        border: '2px dashed var(--primary-bold)', 
                                        borderRadius: '12px', 
                                        display: 'flex', 
                                        flexDirection: 'column',
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        background: 'var(--primary-soft)', 
                                        overflow: 'hidden',
                                        transition: 'all 0.2s ease'
                                    }}>
                                        {previewUrl && galleryFile ? (
                                            <img src={previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <>
                                                <Upload size={40} color="var(--primary-bold)" style={{ marginBottom: '12px', opacity: 0.7 }} />
                                                <span style={{ fontSize: '0.9rem', color: 'var(--primary-bold)', fontWeight: 700 }}>Click or Drag Photo</span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>PNG, JPG, WebP up to 5MB</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <button type="submit" className="btn-primary" style={{ width: '100%', height: '48px', fontSize: '1rem', fontWeight: 800 }}>
                                    <ImageIcon size={20} /> Publish to Gallery
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="card" style={{ marginTop: '24px' }}>
                        <h3><List size={20} color="var(--primary-bold)" /> Active Gallery</h3>
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Preview</th>
                                        <th>Title</th>
                                        <th style={{ textAlign: 'right' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {galleryImages.map((img: any) => (
                                        <tr key={img.id}>
                                            <td>
                                                <img src={`${baseUrl}${img.imageUrl}`} style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                                            </td>
                                            <td>{img.title}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button onClick={() => handleGalleryDelete(img.id)} className="btn-danger btn-sm"><Trash2 size={14} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageAssets;
