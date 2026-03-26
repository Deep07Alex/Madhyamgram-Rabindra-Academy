import React, { useState } from 'react';
import { LogIn, LogOut, Loader2, AlertCircle } from 'lucide-react';
import CustomSelect from '../common/CustomSelect';

/**
 * Clock Out Modal Component
 * Prompted when a teacher ends their day.
 */
export const ClockOutModal = React.memo(({ onClockOut, onCancel, isSubmitting, isMandatory }: { onClockOut: (reason?: string) => void, onCancel: () => void, isSubmitting: boolean, isMandatory?: boolean }) => {
    const [reason, setReason] = useState('');

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '20px'
        }}>
            <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '32px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
                <div style={{
                    width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px'
                }}>
                    <LogOut size={32} color="#dc2626" />
                </div>

                <h2 style={{ marginBottom: '8px', fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)' }}>{isMandatory ? 'Mandatory Check Out' : 'End Your Day?'}</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.9rem' }}>
                    {isMandatory 
                        ? 'The school day has ended (3:30 PM). Please record your dispersal time to proceed.' 
                        : 'Confirm your departure time. You can optionally provide a reason if leaving before scheduled hours.'}
                </p>

                <div style={{ display: 'grid', gap: '20px', textAlign: 'left' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)' }}>EARLY LEAVE REASON (OPTIONAL)</label>
                        <textarea
                            className="form-control"
                            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-soft)', background: 'var(--bg-input)', color: 'var(--text-main)', minHeight: '80px', resize: 'none' }}
                            placeholder="Specify reason if applicable..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isMandatory ? '1fr' : '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                        {!isMandatory && (
                            <button
                                className="btn-secondary"
                                style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border-soft)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 700 }}
                                onClick={onCancel}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            className="btn-primary"
                            style={{ padding: '14px', borderRadius: '12px', background: isMandatory ? 'var(--primary-bold)' : '#dc2626', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            onClick={() => onClockOut(reason.trim() || undefined)}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <LogOut size={20} />}
                            {isSubmitting ? 'Logging...' : isMandatory ? 'Record Dispersal' : 'Check Out'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});

/**
 * Daily Check-In Modal Component
 * Mandatory popup shown to teachers upon first visit of the day.
 */
export const CheckInModal = React.memo(({ onCheckIn, isSubmitting }: { onCheckIn: (data: any) => void, isSubmitting: boolean }) => {
    const [status, setStatus] = useState('PRESENT');
    const [reason, setReason] = useState('');

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '20px'
        }}>
            <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '32px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
                <div style={{
                    width: '64px', height: '64px', borderRadius: '50%', background: 'var(--primary-soft)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px'
                }}>
                    <LogIn size={32} color="var(--primary-bold)" />
                </div>

                <h2 style={{ marginBottom: '8px', fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)' }}>Daily Check-In</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.9rem' }}>
                    Welcome to Academy Portal. Please record your entry for <strong>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</strong>.
                    <br />
                    <span style={{ fontSize: '0.75rem', color: 'var(--primary-bold)' }}>Arrival Time will be recorded automatically as of now.</span>
                </p>

                <div style={{ display: 'grid', gap: '20px', textAlign: 'left' }}>
                        <CustomSelect 
                            label="ATTENDANCE STATUS"
                            value={status}
                            onChange={val => setStatus(val)}
                            options={[
                                { value: 'PRESENT', label: 'Present at Academy', color: 'var(--success-bold)' },
                                { value: 'ABSENT', label: 'Absent Today', color: 'var(--danger-bold)' }
                            ]}
                            disabled={isSubmitting}
                        />

                    {status === 'ABSENT' && (
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)' }}>REASON FOR ABSENCE</label>
                            <textarea
                                className="form-control"
                                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-main)', background: 'var(--bg-input)', color: 'var(--text-main)', minHeight: '80px', resize: 'none' }}
                                placeholder="Please specify reason..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                disabled={isSubmitting}
                            />
                        </div>
                    )}

                    <button
                        className="btn-primary"
                        style={{ marginTop: '12px', width: '100%', padding: '14px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'var(--primary-bold)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                        onClick={() => onCheckIn({ status, reason: status === 'ABSENT' ? reason : null })}
                        disabled={isSubmitting || (status === 'ABSENT' && !reason.trim())}
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
                        {isSubmitting ? 'Submitting...' : 'Confirm Entry'}
                    </button>

                    <p style={{ fontSize: '0.7rem', color: 'var(--warning-bold)', textAlign: 'center', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                        <AlertCircle size={12} />
                        Entry record is mandatory for portal access.
                    </p>
                </div>
            </div>
        </div>
    );
});
