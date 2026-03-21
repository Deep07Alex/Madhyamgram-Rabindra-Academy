/**
 * Landing Page Management (CMS)
 * 
 * Allows administrators to update the public-facing content of the academy website.
 * Features:
 * - Festival Banner: Upload and deploy high-visibility institutional assets.
 * - Live Preview: Visual feedback of the new asset before final deployment.
 * - Global Sync: Changes are immediately visible to all visitors.
 */
import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Upload, Image as ImageIcon, CheckCircle } from 'lucide-react';

const ManageMainPage = () => {
    const { showToast } = useToast();
    const [currentBanner, setCurrentBanner] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');

    const fetchBanner = async () => {
        try {
            const res = await api.get('/system/festival-banner');
            setCurrentBanner(res.data.url);
        } catch (error) {
            console.error('Failed to fetch banner:', error);
        }
    };

    useEffect(() => {
        fetchBanner();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('banner', file);

        try {
            /**
             * Server-side: The 'banner' field is handled by multer on the backend,
             * which saves the file to /uploads/system and updates the database config.
             */
            const res = await api.post('/system/festival-banner', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setCurrentBanner(res.data.url);
            setFile(null);
            setPreviewUrl('');
            showToast('Festival banner updated successfully!', 'success');
        } catch (error) {
            console.error('Upload failed:', error);
            showToast('Failed to update banner.', 'error');
        } finally {
            setUploading(false);
        }
    };

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    return (
        <div className="manage-section" style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <div className="card">
                <h3>
                    <ImageIcon size={20} color="var(--primary-bold)" />
                    Manage Festival Banner
                </h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '0.95rem' }}>
                    Upload an institutional banner or festival greeting to display in the "Upcoming Festivals" section on the main landing page.
                </p>

                <div className="form-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', alignItems: 'start', gap: '40px' }}>
                    <div className="form-group">
                        <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', display: 'block' }}>Current Live Banner</label>
                        <div style={{ 
                            width: '100%', 
                            aspectRatio: '16/9', 
                            borderRadius: 'var(--radius-lg)', 
                            overflow: 'hidden', 
                            border: '1px solid var(--border-soft)',
                            background: 'var(--bg-main)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: 'var(--shadow-md)'
                        }}>
                            <img 
                                src={currentBanner.startsWith('/') ? `${baseUrl}${currentBanner}` : currentBanner} 
                                alt="Current Banner" 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/dol.png';
                                }}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', display: 'block' }}>Upload New Asset</label>
                        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', marginBottom: '24px' }}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer', zIndex: 10 }}
                            />
                            <div style={{
                                width: '100%',
                                height: '100%',
                                border: '2px dashed var(--primary-bold)',
                                borderRadius: 'var(--radius-lg)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '16px',
                                background: 'var(--primary-soft)',
                                overflow: 'hidden',
                                transition: 'all 0.3s ease'
                            }}>
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <>
                                        <div style={{ padding: '20px', background: 'white', borderRadius: '50%', boxShadow: 'var(--shadow-sm)' }}>
                                            <Upload size={32} color="var(--primary-bold)" />
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <span style={{ display: 'block', fontWeight: '700', fontSize: '1rem', color: 'var(--primary-bold)' }}>Drag or Click to Upload</span>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Optimized WebP (1200x800 recommended)</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <button 
                            className="btn-primary" 
                            disabled={!file || uploading} 
                            onClick={handleUpload}
                            style={{ 
                                width: '100%', 
                                gap: '10px', 
                                height: '50px', 
                                fontSize: '1rem',
                                boxShadow: file ? 'var(--shadow-lg)' : 'none'
                            }}
                        >
                            {uploading ? (
                                <>
                                    <div className="animate-spin" style={{ width: '18px', height: '18px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
                                    Processing Asset...
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={20} /> Deploy to Main Page
                                </>
                            )}
                        </button>
                        
                        {file && !uploading && (
                            <button 
                                onClick={() => { setFile(null); setPreviewUrl(''); }}
                                style={{ 
                                    width: '100%', 
                                    marginTop: '12px', 
                                    background: 'none', 
                                    border: 'none', 
                                    color: 'var(--error)',
                                    fontWeight: '600',
                                    fontSize: '0.9rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Remove Selection
                            </button>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="card" style={{ marginTop: '32px', background: 'linear-gradient(135deg, var(--primary-soft) 0%, #ffffff 100%)' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{ padding: '12px', background: 'var(--primary-bold)', borderRadius: '12px', color: 'white' }}>
                        <ImageIcon size={24} />
                    </div>
                    <div>
                        <h4 style={{ margin: 0, fontWeight: '800' }}>Visibility Note</h4>
                        <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            Changes made here are visible globally to all visitors immediately after deployment.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManageMainPage;
