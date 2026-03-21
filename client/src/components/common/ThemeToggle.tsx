/**
 * Theme Toggle Component
 * 
 * A simple button to switch between Light and Dark modes.
 * Utilizes the global ThemeContext for state persistence.
 */
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-soft)',
                padding: '10px',
                borderRadius: '50%',
                cursor: 'pointer',
                color: 'var(--primary-bold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all var(--transition-fast)',
                boxShadow: 'var(--shadow-sm)'
            }}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            aria-label="Toggle Theme"
        >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
    );
};

export default ThemeToggle;
