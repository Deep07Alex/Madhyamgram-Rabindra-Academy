import { useState, useEffect } from 'react';
import api from '../../services/api';

const ManageGallery = () => {
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
            alert('Please select an image file first.');
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
                <h3>Upload New Photo</h3>
                <form onSubmit={handleUpload} className="form-grid">
                    <input type="text" placeholder="Photo Title" value={title} onChange={e => setTitle(e.target.value)} required />
                    <input type="text" placeholder="Description (Optional)" value={description} onChange={e => setDescription(e.target.value)} />
                    <input type="file" accept="image/*" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} required />

                    <button type="submit" className="btn-primary">Upload to Gallery</button>
                </form>
            </div>

            <div className="card" style={{ marginTop: '24px' }}>
                <h3>Gallery Overview</h3>
                <div className="gallery-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px', marginTop: '20px' }}>
                    {images.map((img: any) => (
                        <div key={img.id} className="gallery-card" style={{ border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
                            <img src={`http://localhost:5000${img.imageUrl}`} alt={img.title} style={{ width: '100%', height: '150px', objectFit: 'cover' }} />
                            <div style={{ padding: '10px' }}>
                                <h4>{img.title}</h4>
                                <p style={{ fontSize: '12px', color: '#666' }}>{img.description}</p>
                                <button onClick={() => handleDelete(img.id)} className="btn-danger btn-sm" style={{ marginTop: '10px', width: '100%' }}>Delete Photo</button>
                            </div>
                        </div>
                    ))}
                    {images.length === 0 && <p>No images found.</p>}
                </div>
            </div>
        </div>
    );
};

export default ManageGallery;
