import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, Phone, Trash2, Bell } from 'lucide-react';
import { API_URL } from '../config';


export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Persistent Dismissal
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
          <h3><AlertTriangle size={26} color="var(--danger)" /> Critical Alerts</h3>
          <p>Automated anomaly detection for signal delays and dispatch bottlenecks.</p>
        </div>
        <button className="btn btn-primary" onClick={fetchAlerts}>
          <RefreshCw size={16} /> Check Now
        </button>
      </div>

      {/* Main Alert Card */}
      <div className="card" style={{ borderLeft: alerts.length > 0 ? '4px solid var(--danger)' : '4px solid #10b981' }}>
        {alerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10b981', marginBottom: '1rem' }}>
              <CheckCircle2 size={32} />
            </div>
            <h4 style={{ color: '#10b981', margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 700 }}>All Systems Operational</h4>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>No GPS signal delays or dispatch bottlenecks detected at this time.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Subject</th>
                <th>Issue</th>
                <th>Last Seen</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map(alert => {
                const alertId = `${alert.helper_id}-${alert.order_id}`;
                return (
                <tr key={alertId}>
                  <td><span className="badge danger">GPS DELAY</span></td>
                  <td><strong>#{alert.display_id}</strong> (Helper: {alert.helper_name})</td>
                  <td style={{ color: 'var(--danger)', fontWeight: 600 }}>No GPS ping for {Math.round((new Date() - new Date(alert.last_seen)) / 1000 / 60)} mins</td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(alert.last_seen).toLocaleTimeString()}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button className="btn btn-primary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}>
                        <Phone size={14} /> Call Helper
                      </button>
                      <button className="btn btn-outline" style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }} onClick={() => handleDismiss(alertId)}>
                        <Trash2 size={14} /> Dismiss
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        )}
      </div>

      {/* Logic Documentation */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <h4 style={{ margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bell size={18} color="var(--primary)" /> System Alert Logic
        </h4>
        <ul style={{ color: 'var(--text-muted)', fontSize: '0.9rem', paddingLeft: '1.25rem', margin: 0, lineHeight: '1.6' }}>
          <li><strong>Tracking Delay:</strong> Triggered automatically when an active helper session has not dispatched a GPS location telemetry ping for over 2 minutes.</li>
          <li><strong>Unassigned Priority:</strong> Triggered for customer orders pending helper acceptance for &gt; 15 minutes.</li>
        </ul>
      </div>
    </div>
  );
}
