/**
 * Admin Overview Component
 * 
 * Displays high-level statistics for the academy management.
 * Features:
 * - Dynamic color-coding for different metrics.
 * - Currency formatting with shorthand for large amounts (e.g., ₹1.2L).
 */
interface AdminOverviewProps {
    stats: {
        students: number;
        teachers: number;
        classes: number;
    };
}

const AdminOverview = ({ stats }: AdminOverviewProps) => {
    return (
        <div className="stats-grid">
            <div className="stat-card">
                <h3>{stats.students}</h3>
                <p>Total Students</p>
            </div>
            <div className="stat-card" style={{ borderLeftColor: 'var(--success)' }}>
                <h3>{stats.teachers}</h3>
                <p>Active Faculty</p>
            </div>
            <div className="stat-card" style={{ borderLeftColor: 'var(--accent)' }}>
                <h3>{stats.classes}</h3>
                <p>Grade Levels</p>
            </div>
        </div>
    );
};

export default AdminOverview;
