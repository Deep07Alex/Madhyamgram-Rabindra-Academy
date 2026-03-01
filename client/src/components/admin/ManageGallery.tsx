import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Upload, Image as ImageIcon, Trash2, List, FilePlus } from 'lucide-react';

const ManageGallery = () => {
    const { showToast } = useToast();
    const [images, setImages] = useState([]);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState<File | null>(null);

    const fetchImages = async () => {
        try {
            const res = await api.get('/gallery');
            setImages(res.data);
        } catch (error) {
            console.error('Failed to fetch gallery images:', error);
        }
    };

    useEffect(() => {
        fetchImages();
    }, []);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            showToast('Please select an image file first.', 'warning');
            return;
        }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('image', file);

        try {
            await api.post('/gallery', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setTitle('');
            setDescription('');
            setFile(null);
            fetchImages();
        } catch (error) {
            console.error('Failed to upload image:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this photo?')) return;
        try {
            await api.delete(`/gallery/${id}`);
            fetchImages();
        } catch (error) {
            console.error('Failed to delete image:', error);
        }
    };

    return (
        <div className="manage-section">
            <div className="card">
                <h3>
                    <FilePlus size={20} color="var(--primary)" />
                    Upload Academic Artifact
                </h3>
                <form onSubmit={handleUpload} className="form-grid">
                    <div className="form-group">
                        <label>Moment Title</label>
                        <input type="text" placeholder="e.g., Annual Sports 2024" value={title} onChange={e => setTitle(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Description Note</label>
                        <input type="text" placeholder="Briefly describe this moment" value={description} onChange={e => setDescription(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Visual Asset</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                                required
                                style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer', zIndex: 10 }}
                            />
                            <div style={{
                                border: '1px dashed var(--border-soft)',
                                padding: '10px 15px',
                                borderRadius: 'var(--radius-md)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                background: 'white',
                                color: file ? 'var(--text-main)' : 'var(--text-muted)'
                            }}>
                                <Upload size={18} color="var(--primary)" />
                                <span style={{ fontSize: '0.85rem' }}>{file ? file.name : 'Select JPG, PNG or WebP'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="form-group" style={{ alignSelf: 'end' }}>
                        <button type="submit" className="btn-primary" style={{ width: '100%', height: '42px' }}>
                            <ImageIcon size={18} /> Publish to Gallery
                        </button>
                    </div>
                </form>
            </div>

            <div className="card" style={{ marginTop: '32px' }}>
                <h3>
                    <List size={20} color="var(--primary)" />
                    Active Gallery Assets
                </h3>
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Preview</th>
                                <th>Identity</th>
                                <th>Context</th>
                                <th style={{ textAlign: 'right' }}>Management</th>
                            </tr>
                        </thead>
                        <tbody>
                            {images.map((img: any) => (
                                <tr key={img.id}>
                                    <td>
                                        <div style={{ width: '64px', height: '48px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-soft)' }}>
                                            <img src={`http://localhost:5000${img.imageUrl}`} alt={img.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: '600' }}>{img.title}</td>
                                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{img.description || 'No additional context provided.'}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button onClick={() => handleDelete(img.id)} className="btn-danger btn-sm" style={{ padding: '6px 12px' }}>
                                            <Trash2 size={14} /> Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {images.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No visual assets currently in the gallery.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ManageGallery;
