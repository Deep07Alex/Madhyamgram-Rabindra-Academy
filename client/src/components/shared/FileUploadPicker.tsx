import { useState, useRef, type DragEvent } from 'react';
import {
    Upload, X, FileText, Image, File, Sheet, Presentation
} from 'lucide-react';

interface FileUploadPickerProps {
    file: File | null;
    onChange: (file: File | null) => void;
    label?: string;
    hint?: string;
}

const ACCEPTED = [
    'image/*',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'application/x-rar-compressed',
    'text/plain',
    'text/csv',
].join(',');

const getFileIcon = (file: File) => {
    const t = file.type;
    if (t.startsWith('image/')) return <Image size={20} color="#8b5cf6" />;
    if (t === 'application/pdf') return <FileText size={20} color="#ef4444" />;
    if (t.includes('word')) return <FileText size={20} color="#2563eb" />;
    if (t.includes('excel') || t.includes('spreadsheet') || t.includes('csv')) return <Sheet size={20} color="#16a34a" />;
    if (t.includes('powerpoint') || t.includes('presentation')) return <Presentation size={20} color="#f97316" />;
    return <File size={20} color="#64748b" />;
};

const getFileBg = (file: File) => {
    const t = file.type;
    if (t.startsWith('image/')) return '#f5f3ff';
    if (t === 'application/pdf') return '#fef2f2';
    if (t.includes('word')) return '#eff6ff';
    if (t.includes('excel') || t.includes('spreadsheet')) return '#f0fdf4';
    if (t.includes('powerpoint') || t.includes('presentation')) return '#fff7ed';
    return '#f8fafc';
};

const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const FileUploadPicker = ({ file, onChange, label = 'Attach File (Optional)', hint = 'Images, PDF, Word, Excel, PowerPoint, ZIP — up to 50 MB' }: FileUploadPickerProps) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragging(false);
        const dropped = e.dataTransfer.files?.[0];
        if (dropped) onChange(dropped);
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragging(true);
    };

    return (
        <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px' }}>
                {label}
            </label>

            {file ? (
                // File selected — show preview card
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 16px', borderRadius: 'var(--radius-md)',
                    background: getFileBg(file), border: '1px solid var(--border-soft)',
                    animation: 'toastIn 0.2s ease'
                }}>
                    <div style={{ flexShrink: 0 }}>{getFileIcon(file)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: '700', fontSize: '0.875rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatBytes(file.size)}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => { onChange(null); if (inputRef.current) inputRef.current.value = ''; }}
                        style={{ background: '#fee2e2', border: 'none', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer', display: 'flex', color: '#dc2626', flexShrink: 0 }}
                    >
                        <X size={14} />
                    </button>
                </div>
            ) : (
                // Drop zone
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={() => setDragging(false)}
                    onClick={() => inputRef.current?.click()}
                    style={{
                        border: `2px dashed ${dragging ? 'var(--primary)' : 'var(--border-soft)'}`,
                        borderRadius: 'var(--radius-md)',
                        padding: '28px 16px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: dragging ? 'var(--primary-soft)' : '#f8fafc',
                        transition: 'all 0.2s ease',
                    }}
                >
                    <Upload size={24} color={dragging ? 'var(--primary)' : '#94a3b8'} style={{ marginBottom: '8px' }} />
                    <p style={{ margin: '0 0 4px', fontWeight: '700', fontSize: '0.875rem', color: dragging ? 'var(--primary)' : 'var(--text-main)' }}>
                        {dragging ? 'Drop it here!' : 'Click to browse or drag & drop'}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{hint}</p>

                    {/* File type badges */}
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '12px' }}>
                        {[
                            { label: '🖼 Images', color: '#f5f3ff', text: '#7c3aed' },
                            { label: '📄 PDF', color: '#fef2f2', text: '#dc2626' },
                            { label: '📝 Word', color: '#eff6ff', text: '#1d4ed8' },
                            { label: '📊 Excel', color: '#f0fdf4', text: '#15803d' },
                            { label: '📑 PPT', color: '#fff7ed', text: '#c2410c' },
                            { label: '🗜 ZIP', color: '#fafafa', text: '#475569' },
                        ].map(b => (
                            <span key={b.label} style={{
                                padding: '2px 8px', borderRadius: '12px',
                                background: b.color, color: b.text,
                                fontSize: '0.7rem', fontWeight: '700'
                            }}>{b.label}</span>
                        ))}
                    </div>
                </div>
            )}

            <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED}
                style={{ display: 'none' }}
                onChange={e => onChange(e.target.files?.[0] || null)}
            />
        </div>
    );
};

export default FileUploadPicker;
