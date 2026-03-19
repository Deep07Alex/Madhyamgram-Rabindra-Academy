import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Image as ImageIcon, ArrowRight, UserCircle, Calendar } from 'lucide-react';

const Gallery = () => {
    const [images, setImages] = useState([]);

    useEffect(() => {
        const fetchImages = async () => {
            try {
                const res = await api.get('/gallery');
                setImages(res.data);
            } catch (error) {
                console.error('Failed to fetch gallery images:', error);
            }
        };
        fetchImages();
    }, []);

    return (
        <div className="modern-page" style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            paddingBottom: '80px'
        }}>
            {/* Dynamic Navbar */}
            <nav style={{
                padding: '20px 5%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(12px)',
                position: 'sticky',
                top: 0,
                zIndex: 100,
                borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="logo-container" style={{ position: 'relative' }}>
                        <img src="/RABINDRA_LOGO.jpeg" alt="Logo" style={{ width: '42px', height: '42px', borderRadius: '50%', border: '2px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} />
                        <div style={{ position: 'absolute', bottom: -2, right: -2, width: '12px', height: '12px', background: 'var(--success)', borderRadius: '50%', border: '2px solid white' }}></div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase', color: 'var(--nav-text)', lineHeight: 1 }}>Madhyamgram</span>
                        <span style={{ fontWeight: 950, fontSize: '1.25rem', color: 'var(--nav-text)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Rabindra Academy</span>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '0.5rem', fontWeight: '800', color: 'var(--nav-text)' }}>
                            <span>UDISE: 19112601311</span>
                            <span>ESTD: 2005</span>
                        </div>
                    </div>
                </div>
                <Link to="/login" className="btn-primary" style={{
                    padding: '10px 24px',
                    borderRadius: 'var(--radius-full)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    fontWeight: 700
                }}>
                    <UserCircle size={18} /> Student Portal <ArrowRight size={16} />
                </Link>
            </nav>

            {/* Hero Section */}
            <div style={{ padding: '80px 5% 40px', textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--primary-soft)', color: 'var(--primary-bold)', padding: '6px 16px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>
                    <ImageIcon size={14} /> Academic Archive
                </div>
                <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 900, color: 'var(--text-main)', marginBottom: '16px', letterSpacing: '-2px' }}>Memory <span style={{ color: 'var(--primary-bold)' }}>Gallery</span></h1>
                <p style={{ maxWidth: '600px', margin: '0 auto', color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: 1.6 }}>Witness the vibrant life and excellence at MADHYAMGRAM RABINDRA ACADEMY through our curated visual journey.</p>
            </div>

            {/* Gallery Grid */}
            <div style={{ padding: '0 5%', maxWidth: '1400px', margin: '0 auto' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '32px'
                }}>
                    {images.map((img: any) => (
                        <div key={img.id} className="card" style={{
                            padding: 0,
                            overflow: 'hidden',
                            position: 'relative',
                            transition: 'var(--transition-base)',
                            border: '1px solid rgba(255, 255, 255, 0.4)'
                        }}>
                            <div style={{ overflow: 'hidden', height: '240px' }}>
                                <img
                                    src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${img.imageUrl}`}
                                    alt={img.title}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                                    className="gallery-img"
                                    loading="lazy"
                                />
                            </div>
                            <div style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                    <Calendar size={14} /> {new Date(img.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                </div>
                                <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-main)', fontSize: '1.25rem', fontWeight: 800 }}>{img.title}</h3>
                                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>{img.description || 'Captured moments from our academic excellence events.'}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {images.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '100px 20px', background: 'rgba(255,255,255,0.5)', borderRadius: 'var(--radius-lg)', border: '2px dashed var(--border-soft)' }}>
                        <div style={{ background: 'var(--primary-soft)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--primary-bold)' }}>
                            <ImageIcon size={32} />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>No moments captured yet.</h2>
                        <p style={{ color: 'var(--text-muted)' }}>Stay tuned while we curate our gallery of achievements.</p>
                    </div>
                )}
            </div>

            {/* Visual enhancements for index.css (these would usually go there, but I'll add inline classes for hover) */}
            <style>{`
                .card:hover .gallery-img {
                    transform: scale(1.1);
                }
                .card:hover {
                    transform: translateY(-8px);
                    box-shadow: var(--shadow-xl);
                }
            `}</style>
        </div>
    );
};

export default Gallery;
