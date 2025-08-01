import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface Child {
    id: number;
    username: string;
}

interface BlockedSearch {
    id: number;
    search_query: string;
    timestamp: string;
}

const Dashboard: React.FC = () => {
    const [children, setChildren] = useState<Child[]>([]);
    const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
    const [searches, setSearches] = useState<BlockedSearch[]>([]);
    const [newChildUsername, setNewChildUsername] = useState('');
    const [newChildPassword, setNewChildPassword] = useState('');
    const [error, setError] = useState('');
    
    const navigate = useNavigate();
    const apiUrl = import.meta.env.VITE_API_URL;
    const token = localStorage.getItem('authToken');

    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    const fetchChildren = useCallback(async () => {
        try {
            const response = await axios.get(`${apiUrl}/children/`, authHeaders);
            setChildren(response.data);
            if(response.data.length > 0 && !selectedChildId) {
                setSelectedChildId(response.data[0].id);
            }
        } catch (err) {
            console.error("Failed to fetch children", err);
            if (axios.isAxiosError(err) && err.response?.status === 401) {
                localStorage.removeItem('authToken');
                navigate('/login');
            }
        }
    }, [apiUrl, token, navigate, selectedChildId]);


    useEffect(() => {
        fetchChildren();
    }, [fetchChildren]);

    useEffect(() => {
        const fetchSearches = async () => {
            if (selectedChildId) {
                try {
                    const response = await axios.get(`${apiUrl}/searches/${selectedChildId}`, authHeaders);
                    setSearches(response.data);
                } catch (err) {
                    console.error(`Failed to fetch searches for child ${selectedChildId}`, err);
                }
            } else {
                setSearches([]); 
            }
        };
        fetchSearches();
    }, [selectedChildId, apiUrl, token]);

    const handleAddChild = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!newChildUsername || !newChildPassword) {
            setError("Username and password are required.");
            return;
        }
        try {
            await axios.post(`${apiUrl}/children/`, {
                username: newChildUsername,
                password: newChildPassword
            }, authHeaders);
            setNewChildUsername('');
            setNewChildPassword('');
            fetchChildren(); 
        } catch (err) {
            setError("Failed to create child. Username might be taken.");
            console.error(err);
        }
    };
    
    const handleLogout = () => {
        localStorage.removeItem('authToken');
        navigate('/login');
    };

    return (
        <div className="dashboard-container">
            <h1>Parent Dashboard</h1>
            <button onClick={handleLogout} style={{position: 'absolute', top: '20px', right: '20px'}}>Logout</button>
            
            <div className="child-management">
                <h2>Manage Children</h2>
                <form onSubmit={handleAddChild}>
                    <input type="text" value={newChildUsername} onChange={e => setNewChildUsername(e.target.value)} placeholder="New Child's Username"/>
                    <input type="password" value={newChildPassword} onChange={e => setNewChildPassword(e.target.value)} placeholder="New Child's Password"/>
                    <button type="submit">Add Child</button>
                    {error && <p className="error">{error}</p>}
                </form>
            </div>

            <hr style={{margin: '2rem 0'}}/>
            
            <h2>View Activity</h2>
            <div className="child-list">
                {children.map(child => (
                    <button 
                        key={child.id}
                        className={selectedChildId === child.id ? 'selected' : ''}
                        onClick={() => setSelectedChildId(child.id)}
                    >
                        {child.username}
                    </button>
                ))}
            </div>

            {searches.length > 0 ? (
                <table className="search-table">
                    <thead>
                        <tr>
                            <th>Blocked Search Term</th>
                            <th>Date & Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {searches.map(search => (
                            <tr key={search.id}>
                                <td>{search.search_query}</td>
                                <td>{new Date(search.timestamp).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p>{selectedChildId ? `No blocked activity found for this child.` : 'Select a child to view their activity.'}</p>
            )}
        </div>
    );
};

export default Dashboard;