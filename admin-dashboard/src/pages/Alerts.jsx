import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 🔥 PERSISTENT DISMISSAL
  const [dismissedAlerts, setDismissedAlerts] = useState(() => {
    const saved = localStorage.getItem('n2d_dismissed_alerts');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  useEffect(() => {
    localStorage.setItem('n2d_dismissed_alerts', JSON.stringify(Array.from(dismissedAlerts)));
  }, [dismissedAlerts]);

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${API_URL}/tracking/active`);
      const data = await res.json();
      if (data.success) {
        const now = new Date();
        const flagged = data.sessions.filter(session => {
          const alertId = `${session.helper_id}-${session.order_id}`;
          if (dismissedAlerts.has(alertId)) return false;
          const lastPing = new Date(session.last_seen);
          const diffMinutes = (now - lastPing) / 1000 / 60;
          return diffMinutes > 2; // Flag if no ping for > 2 mins
        });
        setAlerts(flagged);
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      setError('Cannot connect to backend.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, [dismissedAlerts]);

  const handleDismiss = (alertId) => {
    setDismissedAlerts(prev => {
        const newSet = new Set(prev);
        newSet.add(alertId);
        return newSet;
    });
  };

  if (loading) return <div className="card"><p>Checking for system alerts...</p></div>;
  if (error) return <div className="card" style={{borderLeft: '4px solid var(--danger)'}}><p style={{color: 'var(--danger)'}}>{error}</p></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'var(--danger)' }}>⚠️</span> Critical Alerts
        </h3>
        <button className="btn btn-primary" onClick={fetchAlerts}>🔄 Check Now</button>
      </div>

      <div className="card" style={{ borderLeft: alerts.length > 0 ? '4px solid var(--danger)' : '4px solid var(--secondary)' }}>
        {alerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem' }}>
            <p style={{ color: 'var(--secondary)', fontWeight: 600, fontSize: '1.2rem' }}>✅ All systems normal</p>
            <p style={{ color: 'var(--text-muted)' }}>No tracking delays or issues detected at this time.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Subject</th>
                <th>Issue</th>
                <th>Last Seen</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map(alert => {
                const alertId = `${alert.helper_id}-${alert.order_id}`;
                return (
                <tr key={alertId}>
                  <td><span className="badge pending">DELAY</span></td>
                  <td><strong>{alert.display_id}</strong> (Helper: {alert.helper_name})</td>
                  <td style={{ color: 'var(--danger)', fontWeight: 600 }}>No GPS ping for {Math.round((new Date() - new Date(alert.last_seen)) / 1000 / 60)} mins</td>
                  <td>{new Date(alert.last_seen).toLocaleTimeString()}</td>
                  <td style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>Call Helper</button>
                    <button className="btn" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', background: '#e2e8f0', color: '#475569' }} onClick={() => handleDismiss(alertId)}>Clear</button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginTop: '2rem' }}>
        <h4>Alert Logic</h4>
        <ul style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          <li><strong>Tracking Delay:</strong> Triggered when an active helper session has not sent a GPS ping for more than 2 minutes.</li>
          <li><strong>Unassigned Priority:</strong> (Planned) Triggered for orders pending approval for &gt; 15 minutes.</li>
        </ul>
      </div>
    </div>
  );
}
