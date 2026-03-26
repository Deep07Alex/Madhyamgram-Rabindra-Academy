/**
 * Interactive Assignment Alert Banner
 * 
 * A high-visibility component displayed on the student dashboard for pending assignments.
 * Features:
 * - Countdown Timer: Real-time update of remaining time until the deadline.
 * - Status Colorization: Switches to an 'expired' state if the deadline is missed.
 * - Navigation: Clickable area that leads directly to the homework submission portal.
 */
import { useState, useEffect } from 'react';
import { BookOpen, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Assignment {
    id: string;
    title: string;
    dueDate: string;
    subject?: string;
}

const AssignmentBanner = ({ assignment }: { assignment: Assignment }) => {
    const navigate = useNavigate();
    const [timeLeft, setTimeLeft] = useState('');
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const calculateTime = () => {
            if (!assignment.dueDate) {
                setTimeLeft('NO DEADLINE');
                return;
            }
            const now = new Date().getTime();
            const due = new Date(assignment.dueDate).getTime();
            const diff = due - now;

            if (diff <= 0) {
                setTimeLeft('EXPIRED');
                setIsExpired(true);
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            let timeStr = '';
            if (days > 0) timeStr += `${days}d `;
            if (hours > 0 || days > 0) timeStr += `${hours}h `;
            timeStr += `${minutes}m ${seconds}s`;

            setTimeLeft(timeStr);
            setIsExpired(false);
        };

        calculateTime();
        const timer = setInterval(calculateTime, 1000);
        return () => clearInterval(timer);
    }, [assignment.dueDate]);

    return (
        <div
            onClick={() => navigate('/student/homework')}
            style={{
                background: isExpired ? 'rgba(239, 68, 68, 0.1)' : 'var(--primary-soft)',
                border: `1px solid ${isExpired ? '#ef4444' : 'var(--primary-bold)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '16px 24px',
                marginBottom: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.2s ease',
                boxShadow: 'var(--shadow-sm)'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
            <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                background: isExpired ? '#ef4444' : 'var(--primary-bold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                flexShrink: 0,
                boxShadow: `0 8px 16px -4px ${isExpired ? 'rgba(239, 68, 68, 0.4)' : 'rgba(var(--primary-rgb), 0.3)'}`
            }}>
                {isExpired ? <AlertCircle size={22} /> : <BookOpen size={22} />}
            </div>

            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <h4 style={{ margin: 0, color: '#1e293b', fontSize: '1.05rem', fontWeight: '800' }}>
                        {assignment.title}
                    </h4>
                    <span style={{ 
                        fontSize: '0.65rem', 
                        fontWeight: '800', 
                        background: 'rgba(239, 68, 68, 0.15)', 
                        color: '#ef4444', 
                        padding: '2px 8px', 
                        borderRadius: '6px',
                        textTransform: 'uppercase'
                    }}>
                        Not Submitted
                    </span>
                </div>
                <p style={{ margin: 0, color: '#475569', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} /> 
                    <span style={{ color: isExpired ? '#ef4444' : 'var(--primary-bold)' }}>{timeLeft}</span>
                    {isExpired ? ' ago' : ' remaining to submit'}
                </p>
            </div>

            <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'flex-end', 
                gap: '4px',
                marginLeft: 'auto' 
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#1e293b', fontWeight: '800', fontSize: '0.9rem' }}>
                    Complete Now <ArrowRight size={16} />
                </div>
                {assignment.subject && (
                    <span style={{ fontSize: '0.7rem', color: '#475569', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>
                        Subject: {assignment.subject}
                    </span>
                )}
            </div>
            
            {!isExpired && (
               <div style={{
                   position: 'absolute',
                   bottom: 0,
                   left: 0,
                   height: '3px',
                   background: 'var(--primary-bold)',
                   width: '100%',
                   opacity: 0.2
               }}></div>
            )}
        </div>
    );
};

export default AssignmentBanner;
