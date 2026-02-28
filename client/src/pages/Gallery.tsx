import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const Gallery = () => {
    const [images, setImages] = useState([]);

    useEffect(() => {
        const fetchImages = async () => {
            try {
                // The /gallery endpoint is public
                const res = await api.get('/gallery');
                setImages(res.data);
            } catch (error) {
                console.error('Failed to fetch gallery images:', error);
            }
        };
        fetchImages();
    }, []);

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: '"Inter", sans-serif' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <img src="/RABINDRA_LOGO.jpeg" alt="Academy Logo" style={{ width: '50px', height: '50px', borderRadius: '50%' }} />
                    <h1 style={{ margin: 0, color: '#1e3a8a' }}>MRA Academy Gallery</h1>
                </div>
                <div>
                    <Link to="/login" style={{ textDecoration: 'none', color: '#3b82f6', fontWeight: 600 }}>Login Portal</Link>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '30px' }}>
                {images.map((img: any) => (
                    <div key={img.id} style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        transition: 'transform 0.2s ease',
                        cursor: 'pointer'
                    }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <img
                            src={`http://localhost:5000${img.imageUrl}`}
                            alt={img.title}
                            style={{ width: '100%', height: '220px', objectFit: 'cover' }}
                        />
                        <div style={{ padding: '20px' }}>
                            <h3 style={{ margin: '0 0 10px 0', color: '#1f2937', fontSize: '18px' }}>{img.title}</h3>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '14px', lineHeight: '1.5' }}>{img.description || 'No description provided.'}</p>
                            <span style={{ display: 'block', marginTop: '15px', fontSize: '12px', color: '#94a3b8' }}>
                                Added on {new Date(img.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {images.length === 0 && (
                <div style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>
                    <h2>No photos in the gallery yet.</h2>
                    <p>Check back soon for updates from our events!</p>
                </div>
            )}
        </div>
    );
};

export default Gallery;
