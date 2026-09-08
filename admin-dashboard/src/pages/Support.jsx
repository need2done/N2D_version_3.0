import { useState, useEffect } from 'react';
import { LifeBuoy, RefreshCw, CheckCircle, Check, Search, X } from 'lucide-react';
import { API_URL } from '../config';


export default function Support() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredRequests = requests.filter(r =>
    (r.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.customer_phone || '').includes(searchTerm)
  );

  if (loading) return <div className="card"><p>Loading support requests...</p></div>;

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
          <h3><LifeBuoy size={26} color="var(--primary)" /> Support Requests</h3>
          <p>Assistance and callback requests initiated by customers via WhatsApp.</p>
        </div>
        <button className="btn btn-outline" onClick={fetchRequests}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Table Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
            <input
              type="text"
              placeholder="Search customer name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', paddingLeft: '2.4rem', paddingRight: '2rem' }}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={16} />
              </button>
            )}
          </div>
          <span className="badge task">{filteredRequests.length} Support Tickets</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer Name</th>
              <th>WhatsApp Phone</th>
              <th>Status</th>
              <th>Requested At</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.length === 0 && (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>No support requests found.</td></tr>
            )}
            {filteredRequests.map(req => (
              <tr key={req.id}>
                <td><strong>#{req.id}</strong></td>
                <td><strong>{req.customer_name}</strong></td>
                <td>{req.customer_phone}</td>
                <td>
                  <span className={`badge ${req.status === 'PENDING' ? 'danger' : 'active'}`}>
                    {req.status}
                  </span>
                </td>
                <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(req.created_at).toLocaleString()}</td>
                <td style={{ textAlign: 'right' }}>
                  {req.status === 'PENDING' && (
                    <button 
                      className="btn btn-primary" 
                      style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                      onClick={() => handleResolve(req.id)}
                    >
                      <Check size={14} /> Resolve
                    </button>
                  )}
                  {req.status === 'RESOLVED' && (
                    <span style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle size={14} /> Resolved
                    </span>
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
