/**
 * Toast Notification Context
 * 
 * Provides a global system for displaying ephemeral messages (success, error, info, etc.).
 * Supports multi-toast queuing and automatic dismissal.
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextValue {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
};

const ICONS: Record<ToastType, React.ReactElement> = {
    success: <CheckCircle2 size={18} />,
    error: <XCircle size={18} />,
    warning: <AlertCircle size={18} />,
    info: <Info size={18} />,
};

const COLORS: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
    success: { bg: '#f0fdf4', border: '#22c55e', icon: '#16a34a', text: '#14532d' },
    error: { bg: '#fef2f2', border: '#ef4444', icon: '#dc2626', text: '#7f1d1d' },
    warning: { bg: '#fffbeb', border: '#f59e0b', icon: '#d97706', text: '#78350f' },
    info: { bg: '#eff6ff', border: '#3b82f6', icon: '#2563eb', text: '#1e3a8a' },
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => removeToast(id), 3000);
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                maxWidth: '420px',
                width: 'calc(100vw - 40px)',
                pointerEvents: 'none',
            }}>
                {toasts.map(toast => {
                    const c = COLORS[toast.type];
                    return (
                        <div
                            key={toast.id}
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px',
                                padding: '14px 16px',
                                background: c.bg,
                                border: `1px solid ${c.border}`,
                                borderLeft: `4px solid ${c.border}`,
                                borderRadius: '10px',
                                boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                                animation: 'toastSlideIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards',
                                color: c.text,
                                pointerEvents: 'auto',
                            }}
                        >
                            <span style={{ color: c.icon, flexShrink: 0, marginTop: '1px' }}>
                                {ICONS[toast.type]}
                            </span>
                            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '600', flex: 1, lineHeight: 1.4 }}>
                                {toast.message}
                            </p>
                            <button
                                onClick={() => removeToast(toast.id)}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: c.icon, padding: 0, display: 'flex', flexShrink: 0,
                                    opacity: 0.7
                                }}
                                aria-label="Dismiss"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
};
