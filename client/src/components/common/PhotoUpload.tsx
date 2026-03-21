/**
 * Photo Upload Component
 * 
 * Handles client-side image selection, validation, and server-side upload.
 * Validates:
 * - File type (images only).
 * - File size (5MB limit).
 * Automatically updates view with the returned permanent URL.
 */
import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import api from '../../services/api';

interface PhotoUploadProps {
    value?: string;
    onChange: (url: string) => void;
    label?: string;
    uploadPath?: string;
    currentUrl?: string;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({ value, currentUrl, onChange, label = "Profile Photo", uploadPath = '/uploads/teacher-photo' }) => {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const actualValue = value || currentUrl;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation
        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setError('Image size should be less than 5MB.');
            return;
        }

        setError(null);
        setUploading(true);

        const formData = new FormData();
        formData.append('photo', file);

        try {
            const response = await api.post(uploadPath, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onChange(response.data.url);
        } catch (err: any) {
            console.error('Upload error:', err);
            setError(err.response?.data?.message || 'Failed to upload image.');
        } finally {
            setUploading(false);
        }
    };

    const triggerUpload = () => fileInputRef.current?.click();

    const clearPhoto = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="photo-upload-container" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>
                {label}
            </label>
            
            <div 
                onClick={triggerUpload}
                style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '16px',
                    border: '2px dashed var(--border-soft)',
                    background: 'var(--bg-main)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                    borderStyle: actualValue ? 'solid' : 'dashed',
                    borderColor: actualValue ? 'var(--primary-bold)' : 'var(--border-soft)'
                }}
                onMouseEnter={e => !actualValue && (e.currentTarget.style.borderColor = 'var(--primary-bold)')}
                onMouseLeave={e => !actualValue && (e.currentTarget.style.borderColor = 'var(--border-soft)')}
            >
                {actualValue ? (
                    <>
                        <img 
                            src={actualValue.startsWith('http') ? actualValue : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${actualValue}`} 
                            alt="Preview" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{
                            position: 'absolute',
                            top: 0, right: 0, bottom: 0, left: 0,
                            background: 'rgba(0,0,0,0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0,
                            transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                        >
                            <Camera color="white" size={24} />
                        </div>
                        <button 
                            onClick={clearPhoto}
                            style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: 'rgba(255,255,255,0.9)',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'var(--error)',
                                boxShadow: 'var(--shadow-sm)'
                            }}
                        >
                            <X size={14} />
                        </button>
                    </>
                ) : (
                    <>
                        {uploading ? (
                            <Loader2 className="animate-spin" size={24} color="var(--primary-bold)" />
                        ) : (
                            <>
                                <Upload size={24} color="var(--text-muted)" style={{ marginBottom: '4px' }} />
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0 8px' }}>
                                    Upload Photo
                                </span>
                            </>
                        )}
                    </>
                )}
            </div>


            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                style={{ display: 'none' }} 
            />

            {error && (
                <p style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: '6px', fontWeight: '500' }}>
                    {error}
                </p>
            )}
        </div>
    );
};

export default PhotoUpload;
