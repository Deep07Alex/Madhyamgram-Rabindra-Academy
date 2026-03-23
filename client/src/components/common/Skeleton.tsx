import React from 'react';

interface SkeletonProps {
    width?: string | number;
    height?: string | number;
    borderRadius?: string | number;
    className?: string;
    style?: React.CSSProperties;
}

const Skeleton: React.FC<SkeletonProps> = ({ width, height, borderRadius, className = '', style }) => {
    return (
        <div 
            className={`skeleton-loader ${className}`}
            style={{
                width: width || '100%',
                height: height || '20px',
                borderRadius: borderRadius || '8px',
                background: 'linear-gradient(90deg, var(--bg-soft) 25%, var(--bg-hover) 50%, var(--bg-soft) 75%)',
                backgroundSize: '200% 100%',
                animation: 'skeleton-loading 1.5s infinite linear',
                ...style
            }}
        />
    );
};

export const StatsSkeleton = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {[1, 2, 3, 4].map(i => (
            <div key={i} className="card" style={{ margin: 0, padding: '24px' }}>
                <Skeleton width="40px" height="40px" borderRadius="12px" style={{ marginBottom: '16px' }} />
                <Skeleton width="60%" height="14px" style={{ marginBottom: '12px' }} />
                <Skeleton width="40%" height="24px" />
            </div>
        ))}
    </div>
);

export const TableSkeleton = ({ rows = 5, cols = 5 }) => (
    <div className="card" style={{ padding: '24px' }}>
        <div style={{ marginBottom: '20px' }}>
            <Skeleton width="200px" height="24px" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[...Array(rows)].map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: '16px' }}>
                    {[...Array(cols)].map((_, j) => (
                        <Skeleton key={j} height="40px" />
                    ))}
                </div>
            ))}
        </div>
    </div>
);

export default Skeleton;
