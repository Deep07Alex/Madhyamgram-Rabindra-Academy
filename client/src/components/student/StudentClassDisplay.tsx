/**
 * Dynamic Class Name Display
 * 
 * A utility component that resolves a Class ID into its human-readable name.
 * Benefit: Reduces database load by relying on the global class list if already fetched.
 */
import { useState, useEffect } from 'react';
import api from '../../services/api';

interface StudentClassDisplayProps {
    classId?: string;
}

const StudentClassDisplay = ({ classId }: StudentClassDisplayProps) => {
    const [className, setClassName] = useState('—');

    useEffect(() => {
        if (!classId) return;
        
        // This call will be cached by our api service after the first load
        api.get('/users/classes')
            .then(res => {
                const cls = res.data.find((c: any) => c.id === classId);
                if (cls) setClassName(cls.name);
            })
            .catch(() => { });
    }, [classId]);

    return (
        <p style={{ 
            fontSize: '0.95rem', 
            fontWeight: '700', 
            color: 'var(--text-main)', 
            margin: 0 
        }}>
            {className}
        </p>
    );
};

export default StudentClassDisplay;
