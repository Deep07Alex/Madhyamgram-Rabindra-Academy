import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import useServerEvents from '../../hooks/useServerEvents';
import {
    Award,
    BookOpen,
    TrendingUp,
    Calendar,
    CheckCircle2,
    GraduationCap,
    School
} from 'lucide-react';

const StudentResults = () => {
    const [results, setResults] = useState([]);

    const fetchResults = useCallback(async () => {
        try {
            const res = await api.get('/results');
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                const myResults = res.data.filter((r: any) => r.student?.rollNumber === user.rollNumber || r.studentId === user.id);
                setResults(myResults.length > 0 ? myResults : res.data);
            } else {
                setResults(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch results', error);
        }
    }, []);

    useEffect(() => { fetchResults(); }, [fetchResults]);


    // Live: refresh when teacher records a new result
    useServerEvents({ 'result:created': fetchResults });

    const groupedResults = results.reduce((acc: any, curr: any) => {
        if (!acc[curr.semester]) acc[curr.semester] = [];
        acc[curr.semester].push(curr);
        return acc;
    }, {});

    const semesters = Object.keys(groupedResults);

    return (
        <div className="manage-section">
            <div className="card">
                <h3>
                    <Award size={20} color="var(--primary)" />
                    Academic Performance Transcript
                </h3>

                {semesters.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '64px 20px', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-soft)', marginTop: '24px' }}>
                        <TrendingUp size={32} style={{ opacity: 0.1, marginBottom: '12px' }} />
                        <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>No academic results have been published for your profile yet.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '32px', marginTop: '24px' }}>
                        {semesters.map(semester => (
                            <div key={semester} style={{
                                background: 'white',
                                border: '1px solid var(--border-soft)',
                                padding: '24px',
                                borderRadius: 'var(--radius-md)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '4px',
                                    height: '100%',
                                    background: 'var(--primary)'
                                }}></div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--primary-soft)', color: 'var(--primary)', padding: '6px 16px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
                                        <School size={14} /> {semester}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                                        <Calendar size={14} style={{ marginRight: '4px' }} /> Session Period Recorded
                                    </div>
                                </div>

                                <div className="table-responsive">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Subject Domain</th>
                                                <th style={{ textAlign: 'center' }}>Academic Metric</th>
                                                <th style={{ textAlign: 'center' }}>Maximum Possible</th>
                                                <th style={{ textAlign: 'right' }}>Final Grade</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {groupedResults[semester].map((r: any) => (
                                                <tr key={r.id}>
                                                    <td style={{ fontWeight: '600' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <BookOpen size={14} color="var(--primary)" opacity={0.6} />
                                                            {r.subject}
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'center', fontWeight: '800', color: 'var(--primary)' }}>{r.marks}</td>
                                                    <td style={{ textAlign: 'center', opacity: 0.5 }}>{r.totalMarks}</td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <span style={{
                                                            padding: '4px 12px',
                                                            borderRadius: 'var(--radius-sm)',
                                                            fontWeight: 900,
                                                            background: 'var(--primary-soft)',
                                                            color: 'var(--primary)',
                                                            fontSize: '0.9rem',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px'
                                                        }}>
                                                            <GraduationCap size={14} /> {r.grade}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ marginTop: '32px', padding: '24px', background: 'rgba(255, 255, 255, 0.5)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                    <CheckCircle2 size={24} />
                </div>
                <div>
                    <h4 style={{ margin: 0, fontWeight: 800 }}>Certified Transcript</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>This is an official digital record authenticated by Rabindra Academy's Examination Board.</p>
                </div>
            </div>
        </div>
    );
};

export default StudentResults;
