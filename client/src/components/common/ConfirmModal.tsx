import React from 'react';
import Modal from './Modal';
import { AlertTriangle, Trash2, Info } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    shouldCloseOnConfirm?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Yes, Proceed',
    cancelText = 'Cancel',
    variant = 'danger',
    shouldCloseOnConfirm = true
}) => {
    const getIcon = () => {
        switch (variant) {
            case 'danger': return <Trash2 size={32} />;
            case 'warning': return <AlertTriangle size={32} />;
            case 'info': return <Info size={32} />;
            default: return <Trash2 size={32} />;
        }
    };

    const getIconBg = () => {
        switch (variant) {
            case 'danger': return '#fef2f2';
            case 'warning': return '#fffbeb';
            case 'info': return 'var(--primary-soft)';
            default: return '#fef2f2';
        }
    };

    const getIconColor = () => {
        switch (variant) {
            case 'danger': return '#ef4444';
            case 'warning': return '#f59e0b';
            case 'info': return 'var(--primary-bold)';
            default: return '#ef4444';
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            maxWidth="450px"
            footer={
                <>
                    <button 
                        className="btn-secondary" 
                        onClick={onClose} 
                        style={{ padding: '10px 24px', borderRadius: '12px' }}
                    >
                        {cancelText}
                    </button>
                    <button 
                        className={variant === 'danger' ? 'btn-danger' : 'btn-primary'} 
                        onClick={() => {
                            onConfirm();
                            if (shouldCloseOnConfirm) onClose();
                        }}
                        style={{ 
                            padding: '10px 32px', 
                            borderRadius: '12px',
                            backgroundColor: variant === 'danger' ? '#ef4444' : undefined,
                            color: variant === 'danger' ? 'white' : undefined,
                            border: 'none',
                            fontWeight: '700',
                            cursor: 'pointer'
                        }}
                    >
                        {confirmText}
                    </button>
                </>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '20px', padding: '10px 0' }}>
                <div style={{ 
                    width: '72px', 
                    height: '72px', 
                    borderRadius: '20px', 
                    background: getIconBg(),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: getIconColor(),
                    marginBottom: '8px',
                    transform: 'rotate(-5deg)',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.05)'
                }}>
                    {getIcon()}
                </div>
                <div>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1.4rem', fontWeight: '900', color: 'var(--text-main)' }}>{title}</h3>
                    <p style={{ margin: 0, fontSize: '1rem', fontWeight: '500', color: 'var(--text-muted)', lineHeight: '1.6' }}>{message}</p>
                    {variant === 'danger' && (
                        <div style={{ 
                            marginTop: '20px', 
                            padding: '12px', 
                            background: '#fef2f2', 
                            borderRadius: '12px', 
                            color: '#991b1b', 
                            fontSize: '0.75rem', 
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}>
                            <AlertTriangle size={14} /> THIS ACTION CANNOT BE UNDONE
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmModal;
