/**
 * Reusable Modal Component
 * 
 * Provides a consistent overlay for forms and confirmations.
 * Features:
 * - Keyboard accessibility (Close on Escape).
 * - Background scroll locking when open.
 * - Backdrop blurring and animated entry.
 */
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    maxWidth?: string;
}

const Modal: React.FC<ModalProps> = ({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    footer,
    maxWidth = '600px'
}) => {
    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden'; // Prevent scrolling
        }
        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div 
            className="modal-overlay"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '20px',
                animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={onClose}
        >
            <div 
                className="modal-content"
                style={{
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: '20px',
                    width: '100%',
                    maxWidth: maxWidth,
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    boxShadow: 'var(--shadow-xl)',
                    border: '1px solid var(--border-soft)',
                    animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid var(--border-soft)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <h2 style={{ 
                        margin: 0, 
                        fontSize: '1.25rem', 
                        fontWeight: '800',
                        color: 'var(--text-main)' 
                    }}>{title}</h2>
                    <button 
                        onClick={onClose}
                        style={{
                            background: 'var(--bg-soft)',
                            border: 'none',
                            borderRadius: '12px',
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                        onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div style={{
                    padding: '24px',
                    overflowY: 'auto',
                    flex: 1
                }}>
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div style={{
                        padding: '16px 24px',
                        borderTop: '1px solid var(--border-soft)',
                        backgroundColor: 'rgba(var(--primary-rgb), 0.02)',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '12px',
                        borderBottomLeftRadius: '20px',
                        borderBottomRightRadius: '20px'
                    }}>
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
