import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface Child {
    id: string;
    username: string;
}

interface BlockedSearch {
    id: string;
    search_query: string;
    timestamp: string;
}

const Dashboard: React.FC = () => {
    const [children, setChildren] = useState<Child[]>([]);
    const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
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
            } else if (response.data.length === 0) {
                setSelectedChildId(null);
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

    const fetchSearches = useCallback(async () => {
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
    }, [selectedChildId, apiUrl, token]);

    useEffect(() => {
        fetchSearches();
    }, [fetchSearches]);

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
    
    const handleDeleteChild = async (childId: string, childUsername: string) => {
        if (window.confirm(`Are you sure you want to delete the account for "${childUsername}"? This action is permanent.`)) {
            try {
                await axios.delete(`${apiUrl}/children/${childId}`, authHeaders);
                fetchChildren();
            } catch (err) {
                setError("Failed to delete the child account. Please try again.");
                console.error(`Failed to delete child ${childId}`, err);
            }
        }
    };

    const handleClearLog = async () => {
        if (!selectedChildId) return;

        const childUsername = children.find(c => c.id === selectedChildId)?.username || 'this child';

        if (window.confirm(`Are you sure you want to clear the entire search log for "${childUsername}"? This action cannot be undone.`)) {
            try {
                await axios.delete(`${apiUrl}/searches/clear/${selectedChildId}`, authHeaders);
                setSearches([]); // Clear searches from state for an immediate UI update
            } catch (err) {
                setError("Failed to clear search log. Please try again.");
                console.error("Failed to clear search log", err);
            }
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
            <img src="/logo.jpg" alt="Logo" style={{position: 'absolute', top: '20px', left: '20px', width: '60px', height: '60px', borderRadius: '8px'}} />

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
                    <div key={child.id} style={{ display: 'flex', alignItems: 'center', margin: '0.5rem' }}>
                        <button 
                            className={selectedChildId === child.id ? 'selected' : ''}
                            onClick={() => setSelectedChildId(child.id)}
                            style={{
                                backgroundColor: selectedChildId === child.id ? '#030067ff' : '#f8f9fa01',
                                border: '2px solid #030067ff',
                                padding: '0.5rem 1rem',
                                flexGrow: 1,
                            }}
                        >
                            {child.username}
                        </button>
                        <button
                            onClick={() => handleDeleteChild(child.id, child.username)}
                            title="Delete Child Account"
                            style={{
                                marginLeft: '10px',
                                padding: '1px 7px 2px 7px',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '100%',
                                cursor: 'pointer',
                                transform: 'translate(-28px, -15px)',
                                scale: '0.8'
                            }}
                        >
                            X
                        </button>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
                <h3>Blocked Searches</h3>
                {searches.length > 0 && (
                    <button onClick={handleClearLog} style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#ffc107',
                        color: 'black',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}>
                        Clear Log
                    </button>
                )}
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
                                <td style={{overflowX: 'scroll', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '20px'}}>{search.search_query}</td>
                                <td>{new Date(search.timestamp).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p>{selectedChildId ? `No blocked activity found for this child.` : children.length > 0 ? 'Select a child to view their activity.' : 'Add a child to get started.'}</p>
            )}
        </div>
    );
};

export default Dashboard;