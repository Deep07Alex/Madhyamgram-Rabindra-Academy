import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';

interface Option {
    value: string;
    label: string;
    color?: string;
}

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    label?: string;
    icon?: React.ReactNode;
    className?: string;
    searchable?: boolean;
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
    value,
    onChange,
    options,
    placeholder = 'Select an option',
    label,
    icon,
    className = '',
    searchable = false,
    size = 'md',
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className={`custom-select-container ${className}`} ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            {label && <label className="custom-select-label">{label}</label>}
            
            <div 
                className={`custom-select-trigger ${isOpen ? 'active' : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: size === 'sm' ? '8px 12px' : size === 'lg' ? '14px 24px' : '12px 20px',
                    fontSize: size === 'sm' ? '0.85rem' : size === 'lg' ? '1.1rem' : '1rem',
                    opacity: disabled ? 0.6 : 1,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    pointerEvents: disabled ? 'none' : 'auto',
                    background: 'var(--bg-main)',
                    border: isOpen ? '1.5px solid var(--primary-bold)' : '1.5px solid var(--border-soft)',
                    borderRadius: 'var(--radius-md)',
                    transition: 'all 0.3s ease',
                    boxShadow: isOpen ? '0 0 0 4px var(--primary-glow)' : 'none',
                    minHeight: size === 'sm' ? '36px' : size === 'lg' ? '54px' : '48px',
                    color: 'var(--text-main)',
                    boxSizing: 'border-box'
                }}
            >
                {icon && <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', marginRight: '12px' }}>{icon}</span>}
                <span style={{ 
                    flex: 1, 
                    color: selectedOption ? (selectedOption.color || 'var(--text-main)') : 'var(--text-muted)',
                    fontSize: size === 'sm' ? '0.8rem' : '0.9rem',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                }}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown 
                    size={16} 
                    style={{ 
                        color: 'var(--text-muted)', 
                        transition: 'transform 0.3s ease',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                    }} 
                />
            </div>

            {isOpen && (
                <div 
                    className="custom-select-dropdown"
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        left: 0,
                        right: 0,
                        background: 'var(--bg-card)',
                        border: '1.5px solid var(--border-soft)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
                        zIndex: 1000,
                        maxHeight: '260px',
                        overflowY: 'auto',
                        animation: 'slideDown 0.2s ease-out'
                    }}
                >
                    {searchable && (
                        <div style={{ padding: '8px', borderBottom: '1px solid var(--border-soft)', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10 }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input 
                                    type="text" 
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    autoFocus
                                    style={{
                                        width: '100%',
                                        padding: '8px 8px 8px 32px',
                                        fontSize: '0.85rem',
                                        background: 'var(--bg-main)',
                                        border: '1px solid var(--border-soft)',
                                        borderRadius: '6px',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        </div>
                    )}
                    
                    <div className="custom-select-options">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(opt => (
                                <div 
                                    key={opt.value}
                                    className={`custom-select-option ${opt.value === value ? 'selected' : ''}`}
                                    onClick={() => handleSelect(opt.value)}
                                    style={{
                                        padding: '10px 16px',
                                        fontSize: '0.85rem',
                                        fontWeight: opt.value === value ? '700' : '600',
                                        color: opt.value === value 
                                            ? (opt.color || 'var(--primary-bold)') 
                                            : (opt.color || 'var(--text-main)'),
                                        background: opt.value === value ? 'var(--primary-soft)' : 'transparent',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={e => {
                                        if (opt.value !== value) e.currentTarget.style.background = 'var(--bg-main)';
                                    }}
                                    onMouseLeave={e => {
                                        if (opt.value !== value) e.currentTarget.style.background = 'transparent';
                                    }}
                                >
                                    {opt.label}
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                No results found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomSelect;
