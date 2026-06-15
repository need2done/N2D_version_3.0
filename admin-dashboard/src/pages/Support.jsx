import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Support() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequests = async () => {
    try {
      const res = await fetch(`${API_URL}/support`);
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests);
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch support requests:', err);
      setError('Cannot connect to backend.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleResolve = async (id) => {
    try {
      const res = await fetch(`${API_URL}/support/${id}/resolve`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setRequests(requests.map(r => r.id === id ? { ...r, status: 'RESOLVED' } : r));
      } else {
        alert(data.error || 'Failed to resolve request');
      }
    } catch (err) {
      alert('Failed to resolve request');
    }
  };

  if (loading) return <div className="card"><p>Loading support requests...</p></div>;
  if (error) return <div className="card" style={{borderLeft: '4px solid var(--danger)'}}><p style={{color: 'var(--danger)'}}>{error}</p></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ margin: 0 }}>Support Requests</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Customers who requested assistance via WhatsApp
          </p>
        </div>
        <button className="btn btn-primary" onClick={fetchRequests}>🔄 Refresh</button>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer Name</th>
              <th>Phone Number</th>
              <th>Status</th>
              <th>Requested At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 && (
              <tr><td colSpan="6" style={{textAlign: 'center', padding: '2rem', color: 'var(--text-muted)'}}>No support requests yet.</td></tr>
            )}
            {requests.map(req => (
              <tr key={req.id}>
                <td><strong>#{req.id}</strong></td>
                <td>{req.customer_name}</td>
                <td>{req.customer_phone}</td>
                <td>
                  <span className={`badge ${req.status === 'PENDING' ? 'danger' : 'active'}`}>
                    {req.status}
                  </span>
                </td>
                <td>{new Date(req.created_at).toLocaleString()}</td>
                <td>
                  {req.status === 'PENDING' && (
                    <button 
                      className="btn btn-primary" 
                      style={{ fontSize: '0.8rem', padding: '4px 12px' }}
                      onClick={() => handleResolve(req.id)}
                    >
                      ✅ Resolve
                    </button>
                  )}
                  {req.status === 'RESOLVED' && (
                    <span style={{ color: 'var(--success)', fontSize: '0.9rem' }}>Done</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
