/**
 * Student Academic Performance Dashboard
 * 
 * Provides a comprehensive, consolidated view of a student's performance over the year.
 * Features:
 * - Unified Lifecycle View: Side-by-side comparison of Unit I, II, and III.
 * - Key Performance Indicators: Total marks, percentage, and class rank.
 * - Official Documentation: One-click generation of the Yearly Progress Report (PDF).
 * - Live Synchronization: Auto-updates when new marks are published.
 */
import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import useServerEvents from '../../hooks/useServerEvents';
import { generateResultPDF } from '../../utils/resultUtils';
import { ACADEMIC_YEARS } from '../../utils/constants';
import CustomSelect from '../common/CustomSelect';
import {
    Award,
    TrendingUp,
    FileText,
    Calendar,
    Target,
    BarChart3,
    Download,
    Loader2,
    CheckCircle2,
    Users
} from 'lucide-react';

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
    const subjects = Array.from(new Set(results.map((r: any) => r.subject)));
    
    // Performance Calculations
    const totalObtained = results.reduce((acc: number, r: any) => acc + r.marks, 0);
    const totalFull = results.reduce((acc: number, r: any) => acc + (r.totalMarks || 100), 0);
    const percentage = ((totalObtained / totalFull) * 100).toFixed(1);

    return (
        <div className="manage-section">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900 }}>Yearly Progress</h2>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontWeight: 500 }}>
                        <Calendar size={14} style={{ marginRight: '6px' }} /> Academic Session {selectedYear}
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
                        <Download size={18} /> Download official PDF
                    </button>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                <div className="card" style={{ margin: 0, padding: '24px', border: '1px solid var(--border-soft)', background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-main) 100%)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}>
                            <BarChart3 size={20} />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Aggregate Score</span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)' }}>{totalObtained}<span style={{ fontSize: '1rem', fontWeight: 500, opacity: 0.4 }}>/{totalFull}</span></div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--success)', marginTop: '4px' }}>Top Performance Zone</div>
                </div>

                <div className="card" style={{ margin: 0, padding: '24px', border: '1px solid var(--border-soft)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                            <Target size={20} />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Success Rate</span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)' }}>{percentage}%</div>
                    <div style={{ height: '6px', background: 'var(--bg-main)', borderRadius: '10px', marginTop: '12px', overflow: 'hidden' }}>
                        <div style={{ width: `${percentage}%`, height: '100%', background: 'var(--accent)', borderRadius: '10px' }}></div>
                    </div>
                </div>

                <div className="card" style={{ margin: 0, padding: '24px', border: '1px solid var(--border-soft)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}>
                            <Users size={20} />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Class Rank</span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)' }}>#{rank}</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '4px' }}>in {student.className}</div>
                </div>

                <div className="card" style={{ margin: 0, padding: '24px', border: '1px solid var(--border-soft)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-bold)' }}>
                            <CheckCircle2 size={20} />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Attendance</span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)' }}>
                        {parseInt(attendance?.total_days) > 0 ? ((parseInt(attendance.present_days) / parseInt(attendance.total_days)) * 100).toFixed(0) : 0}%
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '4px' }}>
                        {attendance?.present_days || 0} of {attendance?.total_days || 0} days
                    </div>
                </div>
            </div>

            <div className="card" style={{ margin: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <FileText size={22} color="var(--primary-bold)" />
                    <h3 style={{ margin: 0 }}>Progress Detail Worksheet</h3>
                </div>
                
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left' }}>Subject</th>
                                <th style={{ textAlign: 'center' }}>Unit - I</th>
                                <th style={{ textAlign: 'center' }}>Unit - II</th>
                                <th style={{ textAlign: 'center' }}>Unit - III</th>
                                <th style={{ textAlign: 'center' }}>Agg. Score</th>
                                <th style={{ textAlign: 'right' }}>Grade</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subjects.map((sub: any) => {
                                const u1 = results.find((r: any) => r.subject === sub && r.semester === 'Unit-I');
                                const u2 = results.find((r: any) => r.subject === sub && r.semester === 'Unit-II');
                                const u3 = results.find((r: any) => r.subject === sub && r.semester === 'Unit-III');
                                const subTotal = (u1?.marks || 0) + (u2?.marks || 0) + (u3?.marks || 0);
                                const subFull = (u1?.totalMarks || 0) + (u2?.totalMarks || 0) + (u3?.totalMarks || 0);

                                return (
                                    <tr key={sub}>
                                        <td style={{ fontWeight: '700' }}>{sub}</td>
                                        <td style={{ textAlign: 'center' }}>{u1 ? `${u1.marks}/${u1.totalMarks}` : '-'}</td>
                                        <td style={{ textAlign: 'center' }}>{u2 ? `${u2.marks}/${u2.totalMarks}` : '-'}</td>
                                        <td style={{ textAlign: 'center' }}>{u3 ? `${u3.marks}/${u3.totalMarks}` : '-'}</td>
                                        <td style={{ textAlign: 'center', fontWeight: '800', color: 'var(--primary-bold)' }}>{subTotal}/{subFull}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <span style={{ 
                                                padding: '4px 12px', 
                                                borderRadius: '6px', 
                                                fontSize: '0.8rem', 
                                                fontWeight: 800, 
                                                background: 'var(--primary-soft)', 
                                                color: 'var(--primary-bold)' 
                                            }}>
                                                {u3?.grade || calculateGrade(subTotal, subFull)}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={{ marginTop: '32px', display: 'flex', gap: '12px', alignItems: 'center', padding: '16px 24px', background: 'var(--primary-soft)', borderRadius: 'var(--radius-md)', color: 'var(--primary-bold)' }}>
                <Award size={20} />
                <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>This dashboard reflects your verified cumulative performance for the current academic session.</span>
            </div>
        </div>
    );
};

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

export default StudentResults;
