/**
 * Live Digital Clock Component
 * 
 * Displays the current time in a 12-hour format with a ticking seconds indicator.
 * Features:
 * - Real-time updates via 1-second interval.
 * - Pulse animation synced with the clock.
 * - Responsive design for dashboard headers.
 */
import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const LiveClock = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Formatting Logic:
    // Converts 24-hour Date object to human-readable 12-hour AM/PM format.
    const hours = time.getHours();
    const minutes = time.getMinutes();
    const seconds = time.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';

    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-card)',
            padding: '8px 16px',
            borderRadius: 'var(--radius-full)',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--border-soft)',
            animation: 'slideInRight 0.5s ease-out'
        }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={18} color="var(--primary-bold)" />
                {/* Subtle pulse ring */}
                <span style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    border: '2px solid var(--primary-bold)',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    opacity: 0.2
                }}></span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{
                    fontSize: '0.95rem',
                    fontWeight: '800',
                    color: 'var(--text-main)',
                    fontVariantNumeric: 'tabular-nums'
                }}>
                    {formattedHours}:{formattedMinutes}
                </span>
                <span style={{
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    color: 'var(--text-muted)',
                    fontVariantNumeric: 'tabular-nums',
                    minWidth: '18px'
                }}>
                    :{formattedSeconds}
                </span>
                <span style={{
                    fontSize: '0.75rem',
                    fontWeight: '800',
                    color: 'var(--primary-bold)',
                    marginLeft: '2px'
                }}>
                    {ampm}
                </span>
            </div>
            <style>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 0.5; }
                    50% { transform: scale(1.6); opacity: 0; }
                    100% { transform: scale(1.6); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default LiveClock;
