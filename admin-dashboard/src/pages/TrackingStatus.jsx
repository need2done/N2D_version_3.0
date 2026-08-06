import { useState, useEffect } from 'react';
import { Activity, RefreshCw, Radio, MapPin } from 'lucide-react';

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

  return (
    <div>
      {error && (
        <div className="card" style={{ borderLeft: '4px solid var(--danger)', marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--danger)', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header-container">
        <div className="page-title-group">
          <h3><Activity size={26} color="var(--primary)" /> Live Tracking Status</h3>
          <p>Real-time GPS telemetry pings and active delivery session heartbeats.</p>
        </div>
        <button className="btn btn-outline" onClick={fetchSessions}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Table Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Active GPS Telemetry Sessions</h3>
          <span className="badge active">{sessions.length} Sessions Live</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Helper Agent</th>
              <th>Service Engine</th>
              <th>Latest Coordinates</th>
              <th>Last Seen</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 && (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>No active live tracking sessions detected right now.</td></tr>
            )}
            {sessions.map(session => (
              <tr key={`${session.helper_id}-${session.order_id}`}>
                <td><strong>#{session.display_id}</strong></td>
                <td><strong>{session.helper_name}</strong> <br/><small style={{ color: 'var(--text-muted)' }}>#ID: {session.helper_id}</small></td>
                <td><span className="badge task">{session.service}</span></td>
                <td style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                  {session.lat ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={14} color="var(--primary)" />
                      {parseFloat(session.lat).toFixed(5)}, {parseFloat(session.lng).toFixed(5)}
                    </span>
                  ) : 'No data'}
                </td>
                <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(session.last_seen).toLocaleTimeString()}</td>
                <td>
                  <span className="badge active" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Radio size={12} className="animate-pulse" /> LIVE
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
