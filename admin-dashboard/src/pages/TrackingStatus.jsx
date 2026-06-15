import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function TrackingStatus() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${API_URL}/tracking/active`);
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions);
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch tracking sessions:', err);
      setError('Cannot connect to backend.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="card"><p>Loading tracking status...</p></div>;
  if (error) return <div className="card" style={{borderLeft: '4px solid var(--danger)'}}><p style={{color: 'var(--danger)'}}>{error}</p></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3>Live Tracking Status</h3>
        <button className="btn btn-primary" onClick={fetchSessions}>🔄 Refresh</button>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Helper</th>
              <th>Service</th>
              <th>Latest Coordinates</th>
              <th>Last Seen</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 && (
              <tr><td colSpan="6" style={{textAlign: 'center', padding: '2rem', color: 'var(--text-muted)'}}>No active tracking sessions.</td></tr>
            )}
            {sessions.map(session => (
              <tr key={`${session.helper_id}-${session.order_id}`}>
                <td><strong>{session.display_id}</strong></td>
                <td>{session.helper_name} <br/><small style={{color: 'var(--text-muted)'}}>#ID: {session.helper_id}</small></td>
                <td><span className="badge task">{session.service}</span></td>
                <td style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                  {session.lat ? `${parseFloat(session.lat).toFixed(5)}, ${parseFloat(session.lng).toFixed(5)}` : 'No data'}
                </td>
                <td>{new Date(session.last_seen).toLocaleTimeString()}</td>
                <td>
                  <span className="badge active">LIVE</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
