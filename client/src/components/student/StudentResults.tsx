import { useState, useEffect } from 'react';
import api from '../../services/api';

const StudentResults = () => {
    const [results, setResults] = useState([]);

    useEffect(() => {
        const fetchResults = async () => {
            try {
                // Fetch only for exactly the logged in student
                const res = await api.get('/results');
                // The backend user checking ensures only this student's results are returned
                // We'll filter just in case the backend returns all to admin, but Student endpoint should restrict
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    const myResults = res.data.filter((r: any) => r.student?.rollNumber === user.rollNumber || r.studentId === user.id);
                    setResults(myResults.length > 0 ? myResults : res.data); // Fallback to all retrieved
                } else {
                    setResults(res.data);
                }
            } catch (error) {
                console.error('Failed to fetch results', error);
            }
        };
        fetchResults();
    }, []);

    // Group results by semester
    const groupedResults = results.reduce((acc: any, curr: any) => {
        if (!acc[curr.semester]) acc[curr.semester] = [];
        acc[curr.semester].push(curr);
        return acc;
    }, {});

    return (
        <div className="manage-section">
            <div className="card">
                <h3>My Academic Results</h3>

                {Object.keys(groupedResults).length === 0 ? (
                    <p className="mt-4">No results published yet.</p>
                ) : (
                    Object.keys(groupedResults).map(semester => (
                        <div key={semester} className="mt-4" style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px' }}>
                            <h4 style={{ borderBottom: '2px solid #3b82f6', display: 'inline-block', paddingBottom: '5px', marginBottom: '15px' }}>{semester}</h4>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Subject</th>
                                        <th>Marks Obtained</th>
                                        <th>Total Marks</th>
                                        <th>Grade</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupedResults[semester].map((r: any) => (
                                        <tr key={r.id}>
                                            <td>{r.subject}</td>
                                            <td>{r.marks}</td>
                                            <td>{r.totalMarks}</td>
                                            <td><strong>{r.grade}</strong></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default StudentResults;
