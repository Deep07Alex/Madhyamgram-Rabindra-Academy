/**
 * Student Academic Performance Dashboard
 *
 * Displays a progressive result card matching the official yearly progress report.
 * - FM/MO columns per unit (like the PDF report card)
 * - Grand Total row
 * - Summary stats: Total, Percentage, Rank
 * - Progressively shows Unit-II and Unit-III as admin publishes them
 */
import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import useServerEvents from '../../hooks/useServerEvents';
import { generateResultPDF } from '../../utils/resultUtils';
import { ACADEMIC_YEARS } from '../../utils/constants';
import CustomSelect from '../common/CustomSelect';
import {
    Award, TrendingUp, FileText, Calendar, Target,
    BarChart3, Download, Loader2, CheckCircle2, Users
} from 'lucide-react';

function calculateGrade(marks: number, total: number) {
    if (!total || total === 0) return '-';
    const p = (marks / total) * 100;
    if (p >= 90) return 'AA';
    if (p >= 80) return 'A+';
    if (p >= 60) return 'A';
    if (p >= 50) return 'B+';
    if (p >= 30) return 'B';
    return 'C';
}

const StudentResults = () => {
    const [reportData, setReportData] = useState<any>(null);
    const [selectedYear, setSelectedYear] = useState(2025);
    const [isLoading, setIsLoading] = useState(true);

    const fetchReport = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await api.get(`/results/report?academicYear=${selectedYear}`);
            setReportData(res.data);
        } catch (error) {
            console.error('Failed to fetch consolidated report:', error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedYear]);

    useEffect(() => { fetchReport(); }, [fetchReport]);
    useServerEvents({ 'result_published': fetchReport });

    if (isLoading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
                <Loader2 className="animate-spin" size={40} color="var(--primary-bold)" />
                <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Aggregating academic data...</p>
            </div>
        );
    }

    if (!reportData || reportData.results.length === 0) {
        return (
            <div className="manage-section">
                <div className="card" style={{ textAlign: 'center', padding: '80px 40px' }}>
                    <TrendingUp size={48} style={{ opacity: 0.1, marginBottom: '20px' }} />
                    <h3 style={{ marginBottom: '12px' }}>Awaiting Performance Data</h3>
                    <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 24px' }}>
                        No results have been published for the {selectedYear} academic session yet.
                    </p>
                    <CustomSelect
                        value={selectedYear.toString()}
                        onChange={val => setSelectedYear(parseInt(val))}
                        options={ACADEMIC_YEARS.map(y => ({ value: y.toString(), label: `${y} Session` }))}
                        className="btn-secondary"
                    />
                </div>
            </div>
        );
    }

    const { student, results, attendance, rank } = reportData;

    // Build unique subject list in order of first appearance
    const subjects: string[] = Array.from(new Set(results.map((r: any) => r.subject)));

    // Helper to find a unit result for a given subject
    const getResult = (sub: string, sem: string) =>
        results.find((r: any) => r.subject === sub && r.semester === sem);

    // Determine which units have been published
    const hasUnit1 = results.some((r: any) => r.semester === 'Unit-I');
    const hasUnit2 = results.some((r: any) => r.semester === 'Unit-II');
    const hasUnit3 = results.some((r: any) => r.semester === 'Unit-III');

    // Grand totals across all units
    const grandObtained = results.reduce((a: number, r: any) => a + (r.marks || 0), 0);
    const grandFull = results.reduce((a: number, r: any) => a + (r.totalMarks || 0), 0);
    const percentage = grandFull > 0 ? ((grandObtained / grandFull) * 100).toFixed(2) : '0.00';

    // Attendance
    const totalDays = parseInt(attendance?.total_days) || 0;
    const presentDays = parseInt(attendance?.present_days) || 0;
    const attendancePct = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(0) : '0';

    const thStyle: React.CSSProperties = {
        padding: '10px 8px', textAlign: 'center', fontSize: '0.72rem', fontWeight: 800,
        color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em',
        background: 'var(--bg-main)', borderBottom: '2px solid var(--border-soft)', whiteSpace: 'nowrap'
    };
    const tdStyle: React.CSSProperties = {
        padding: '10px 8px', textAlign: 'center', fontSize: '0.85rem',
        borderBottom: '1px solid var(--border-soft)', color: 'var(--text-main)'
    };
    const emptyCell = <span style={{ color: 'var(--text-muted)', opacity: 0.35 }}>—</span>;

    return (
        <div className="manage-section">
            {/* Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900 }}>Yearly Progress</h2>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontWeight: 500 }}>
                        <Calendar size={14} style={{ marginRight: '6px' }} />Academic Session {selectedYear}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <CustomSelect
                        value={selectedYear.toString()}
                        onChange={val => setSelectedYear(parseInt(val))}
                        options={ACADEMIC_YEARS.map(y => ({ value: y.toString(), label: y.toString() }))}
                        icon={<Calendar size={16} />}
                    />
                    <button onClick={async () => await generateResultPDF(reportData)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 24px' }}>
                        <Download size={18} /> Download PDF
                    </button>
                </div>
            </header>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                <div className="card" style={{ margin: 0, padding: '24px', border: '1px solid var(--border-soft)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}><BarChart3 size={20} /></div>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Aggregate Score</span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)' }}>{grandObtained}<span style={{ fontSize: '1rem', fontWeight: 500, opacity: 0.4 }}>/{grandFull}</span></div>
                </div>

                <div className="card" style={{ margin: 0, padding: '24px', border: '1px solid var(--border-soft)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}><Target size={20} /></div>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Percentage</span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)' }}>{percentage}%</div>
                    <div style={{ height: '6px', background: 'var(--bg-main)', borderRadius: '10px', marginTop: '12px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(parseFloat(percentage), 100)}%`, height: '100%', background: 'var(--accent)', borderRadius: '10px' }}></div>
                    </div>
                </div>

                <div className="card" style={{ margin: 0, padding: '24px', border: '1px solid var(--border-soft)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}><Users size={20} /></div>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Class Rank</span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)' }}>#{rank}</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '4px' }}>in {student.className}</div>
                </div>

                <div className="card" style={{ margin: 0, padding: '24px', border: '1px solid var(--border-soft)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}><CheckCircle2 size={20} /></div>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Attendance</span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)' }}>{attendancePct}%</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '4px' }}>{presentDays} of {totalDays} days</div>
                </div>
            </div>

            {/* Progressive Marks Table */}
            <div className="card" style={{ margin: 0, padding: '0' }}>
                <div style={{ padding: '24px 24px 0', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <FileText size={22} color="var(--primary-bold)" />
                    <h3 style={{ margin: 0 }}>Yearly Progress Report</h3>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {hasUnit1 && <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40' }}>Unit-I ✓</span>}
                        {hasUnit2 && <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: '#3b82f620', color: '#3b82f6', border: '1px solid #3b82f640' }}>Unit-II ✓</span>}
                        {hasUnit3 && <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: '#a855f720', color: '#a855f7', border: '1px solid #a855f740' }}>Unit-III ✓</span>}
                        {!hasUnit2 && !hasUnit3 && <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: 'var(--bg-main)', color: 'var(--text-muted)', border: '1px solid var(--border-soft)' }}>Unit-II & III Pending</span>}
                        {hasUnit2 && !hasUnit3 && <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: 'var(--bg-main)', color: 'var(--text-muted)', border: '1px solid var(--border-soft)' }}>Unit-III Pending</span>}
                    </div>
                </div>

                <div className="table-responsive" style={{ padding: '0 0 24px' }}>
                    <table className="data-table" style={{ minWidth: '700px' }}>
                        <thead>
                            <tr>
                                <th style={{ ...thStyle, textAlign: 'left', minWidth: '140px' }}>Subject</th>
                                <th style={thStyle} colSpan={2}>UNIT - I</th>
                                <th style={thStyle} colSpan={2}>UNIT - II</th>
                                <th style={thStyle} colSpan={2}>UNIT - III</th>
                                <th style={thStyle}>Full Marks<br />(I+II+III)</th>
                                <th style={thStyle}>Obtained<br />(I+II+III)</th>
                                <th style={thStyle}>Grade</th>
                            </tr>
                            <tr>
                                <th style={{ ...thStyle, textAlign: 'left' }}></th>
                                <th style={{ ...thStyle, fontSize: '0.65rem' }}>FM</th>
                                <th style={{ ...thStyle, fontSize: '0.65rem' }}>MO</th>
                                <th style={{ ...thStyle, fontSize: '0.65rem' }}>FM</th>
                                <th style={{ ...thStyle, fontSize: '0.65rem' }}>MO</th>
                                <th style={{ ...thStyle, fontSize: '0.65rem' }}>FM</th>
                                <th style={{ ...thStyle, fontSize: '0.65rem' }}>MO</th>
                                <th style={thStyle}></th>
                                <th style={thStyle}></th>
                                <th style={thStyle}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {subjects.map((sub: string) => {
                                const u1 = getResult(sub, 'Unit-I');
                                const u2 = getResult(sub, 'Unit-II');
                                const u3 = getResult(sub, 'Unit-III');
                                const totalObt = (u1?.marks || 0) + (u2?.marks || 0) + (u3?.marks || 0);
                                const totalFM = (u1?.totalMarks || 0) + (u2?.totalMarks || 0) + (u3?.totalMarks || 0);
                                const grade = calculateGrade(totalObt, totalFM);
                                return (
                                    <tr key={sub} style={{ transition: 'background 0.15s' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-main)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = '')}>
                                        <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 700 }}>{sub}</td>
                                        {/* Unit I */}
                                        <td style={tdStyle}>{u1 ? u1.totalMarks : emptyCell}</td>
                                        <td style={{ ...tdStyle, fontWeight: 800, color: u1 ? 'var(--primary-bold)' : undefined }}>{u1 ? u1.marks : emptyCell}</td>
                                        {/* Unit II */}
                                        <td style={tdStyle}>{u2 ? u2.totalMarks : emptyCell}</td>
                                        <td style={{ ...tdStyle, fontWeight: 800, color: u2 ? 'var(--primary-bold)' : undefined }}>{u2 ? u2.marks : emptyCell}</td>
                                        {/* Unit III */}
                                        <td style={tdStyle}>{u3 ? u3.totalMarks : emptyCell}</td>
                                        <td style={{ ...tdStyle, fontWeight: 800, color: u3 ? 'var(--primary-bold)' : undefined }}>{u3 ? u3.marks : emptyCell}</td>
                                        {/* Totals */}
                                        <td style={{ ...tdStyle, fontWeight: 800 }}>{totalFM || emptyCell}</td>
                                        <td style={{ ...tdStyle, fontWeight: 900, color: 'var(--primary-bold)', fontSize: '0.95rem' }}>{totalObt || emptyCell}</td>
                                        <td style={tdStyle}>
                                            <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 800, background: 'var(--primary-soft)', color: 'var(--primary-bold)' }}>
                                                {totalFM > 0 ? grade : '—'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}

                            {/* Grand Total Row */}
                            {(() => {
                                const filter = (sem: string) => results.filter((r: any) => r.semester === sem);
                                const sum = (arr: any[], key: string) => arr.reduce((a: number, r: any) => a + (r[key] || 0), 0);
                                const u1FM = sum(filter('Unit-I'), 'totalMarks'), u1MO = sum(filter('Unit-I'), 'marks');
                                const u2FM = sum(filter('Unit-II'), 'totalMarks'), u2MO = sum(filter('Unit-II'), 'marks');
                                const u3FM = sum(filter('Unit-III'), 'totalMarks'), u3MO = sum(filter('Unit-III'), 'marks');
                                const gFM = u1FM + u2FM + u3FM, gMO = u1MO + u2MO + u3MO;
                                const rowStyle: React.CSSProperties = { ...tdStyle, fontWeight: 900, background: 'var(--bg-main)', fontSize: '0.9rem' };
                                return (
                                    <tr>
                                        <td style={{ ...rowStyle, textAlign: 'left' }}>Grand Total</td>
                                        <td style={rowStyle}>{u1FM || '—'}</td>
                                        <td style={{ ...rowStyle, color: 'var(--primary-bold)' }}>{u1MO || '—'}</td>
                                        <td style={rowStyle}>{u2FM || '—'}</td>
                                        <td style={{ ...rowStyle, color: 'var(--primary-bold)' }}>{u2MO || '—'}</td>
                                        <td style={rowStyle}>{u3FM || '—'}</td>
                                        <td style={{ ...rowStyle, color: 'var(--primary-bold)' }}>{u3MO || '—'}</td>
                                        <td style={{ ...rowStyle }}>{gFM || '—'}</td>
                                        <td style={{ ...rowStyle, color: 'var(--primary-bold)', fontSize: '1.05rem' }}>{gMO || '—'}</td>
                                        <td style={rowStyle}>
                                            {gFM > 0 && <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 800, background: 'var(--primary-soft)', color: 'var(--primary-bold)' }}>{calculateGrade(gMO, gFM)}</span>}
                                        </td>
                                    </tr>
                                );
                            })()}
                        </tbody>
                    </table>
                </div>

                {/* Summary Footer */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1px', background: 'var(--border-soft)', borderTop: '2px solid var(--border-soft)' }}>
                    {[
                        { label: 'Total Full Marks', value: grandFull },
                        { label: 'Total Obtained Marks', value: grandObtained },
                        { label: 'Percentage', value: `${percentage}%` },
                        { label: 'Class Rank', value: rank === '1' ? 'FIRST (1st)' : rank === '2' ? 'SECOND (2nd)' : rank === '3' ? 'THIRD (3rd)' : `#${rank}` }
                    ].map(item => (
                        <div key={item.label} style={{ padding: '20px 24px', background: 'var(--bg-card)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{item.label}</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)' }}>{item.value}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ marginTop: '32px', display: 'flex', gap: '12px', alignItems: 'center', padding: '16px 24px', background: 'var(--primary-soft)', borderRadius: 'var(--radius-md)', color: 'var(--primary-bold)' }}>
                <Award size={20} />
                <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>This dashboard reflects your verified cumulative performance. Results update live as each unit is published.</span>
            </div>
        </div>
    );
};

export default StudentResults;
