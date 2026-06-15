import { useState, useEffect } from 'react';

// ==========================================
// TODO[ENV_CHANGE]: BACKEND API URL
// This reads from admin-dashboard/.env file
// ==========================================
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const StatCard = ({ title, value, icon, color }) => (
  <div className="card" style={{ flex: 1, margin: '0 0.5rem 1rem 0.5rem', minWidth: '200px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600 }}>{title}</p>
        <h2 style={{ margin: '0.5rem 0', fontSize: '1.75rem' }}>{value}</h2>
      </div>
      <div style={{ fontSize: '2rem', color: color || 'var(--primary)', opacity: 0.8 }}>{icon}</div>
    </div>
  </div>
);

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ onlineHelpers: 0, activeTrackers: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL');
  // Default to today's date in LOCAL timezone (not UTC)
  const getLocalDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };
  const [dateFilter, setDateFilter] = useState(getLocalDate());
  const [draftDateFilter, setDraftDateFilter] = useState(getLocalDate());

  const fetchData = async () => {
    try {
      let orderUrl = `${API_URL}/orders?`;
      if (filter !== 'ALL' && !['TASK', 'RIDE'].includes(filter)) orderUrl += `status=${filter}&`;
      if (filter === 'TASK' || filter === 'RIDE') orderUrl += `engine_type=${filter}&`;
      if (dateFilter) orderUrl += `date=${dateFilter}&`;
      
      const orderRes = await fetch(orderUrl);
      const orderData = await orderRes.json();
      
      const helperRes = await fetch(`${API_URL}/helpers`);
      const helperData = await helperRes.json();
      
      const trackingRes = await fetch(`${API_URL}/tracking/active`);
      const trackingData = await trackingRes.json();

      if (orderData.success) setOrders(orderData.orders);
      
      setStats({
        onlineHelpers: helperData.success ? helperData.helpers.filter(h => h.status === 'ONLINE').length : 0,
        activeTrackers: trackingData.success ? trackingData.sessions.length : 0
      });
      
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Cannot connect to backend.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [filter, dateFilter]);

  const handleAssign = async (dbId) => {
    const helperId = prompt('Enter Helper DB ID to assign:');
    if (!helperId) return;
    try {
      const res = await fetch(`${API_URL}/orders/${dbId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helper_id: parseInt(helperId) })
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || 'Failed to assign helper');
      }
    } catch (err) {
      alert('Failed to assign helper');
    }
  };

  const handleApprove = async (dbId) => {
    try {
      const res = await fetch(`${API_URL}/orders/${dbId}/approve`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || 'Failed to approve order');
      }
    } catch (err) {
      alert('Failed to approve order');
    }
  };

  const handleVerifyItems = async (dbId) => {
    try {
      const res = await fetch(`${API_URL}/orders/${dbId}/verify-items`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Items verified! Payment ₹${data.total} sent to customer.`);
        fetchData();
      } else {
        alert(data.error || 'Failed to verify items');
      }
    } catch (err) {
      alert('Failed to verify items');
    }
  };

  const handleCancel = async (dbId) => {
    const reason = window.prompt("Enter reason for cancellation:");
    if (reason === null) return; // User pressed Cancel
    if (reason.trim() === '') {
        alert("Cancellation reason is required.");
        return;
    }
    try {
      const res = await fetch(`${API_URL}/orders/${dbId}/cancel`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || 'Failed to cancel order');
      }
    } catch (err) {
      alert('Failed to cancel order');
    }
  };

  const handleUnlock = async (dbId) => {
    try {
      const res = await fetch(`${API_URL}/orders/${dbId}/unlock`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('✅ Ride unlocked successfully!');
        fetchData();
      } else {
        alert(data.error || 'Failed to unlock ride');
      }
    } catch (err) {
      alert('Failed to unlock ride');
    }
  };

  const getStatusBadgeClass = (status, locked) => {
    if (locked) return 'danger';
    switch (status) {
      case 'CONFIRMED': return 'pending';
      case 'HELPER_ACCEPTED':
      case 'HELPER_ARRIVED':
      case 'RIDE_STARTED':
      case 'BILL_IMAGE_UPLOADED': return 'active';
      case 'COMPLETED':
      case 'PAID': return 'ride'; 
      case 'CANCELLED': return 'danger';
      default: return '';
    }
  };

  return (
    <div>
      {error && (
        <div className="card" style={{borderLeft: '4px solid var(--danger)', marginBottom: '1.5rem'}}>
          <p style={{color: 'var(--danger)', margin: 0}}>{error}</p>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', margin: '0 -0.5rem 1rem -0.5rem' }}>
        <StatCard title="Total Orders" value={orders.length} icon="📋" />
        <StatCard title="Online Helpers" value={stats.onlineHelpers} icon="👤" color="var(--secondary)" />
        <StatCard title="Active Trackers" value={stats.activeTrackers} icon="📍" color="var(--warning)" />
        <StatCard title="Platform Status" value="Online" icon="🌐" color="var(--primary)" />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['ALL', 'TASK', 'RIDE', 'CONFIRMED', 'HELPER_ACCEPTED', 'COMPLETED'].map(f => (
          <button
            key={f}
            className={`btn ${filter === f ? 'btn-primary' : ''}`}
            style={filter !== f ? { background: 'var(--border)', color: 'var(--text-main)' } : {}}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input 
            type="date" 
            className="input" 
            value={draftDateFilter} 
            onChange={(e) => setDraftDateFilter(e.target.value)} 
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}
            title="Filter orders by date"
            max={getLocalDate()}
          />
          <button 
            className="btn btn-primary" 
            onClick={() => setDateFilter(draftDateFilter)}
            title="Apply Date Filter"
          >
            Go
          </button>
          <button 
            className="btn" 
            style={{ background: 'var(--border)', color: 'var(--text-main)', padding: '0.5rem 0.75rem' }} 
            onClick={() => {
                setDraftDateFilter('');
                setDateFilter('');
            }}
            title="Clear date filter (loads last 500 orders)"
          >
            Clear Date
          </button>
          <button className="btn" style={{ background: 'var(--secondary)', color: 'white' }} onClick={fetchData}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Master Order Stream (N2D)</h3>
        <p style={{color: 'var(--text-muted)'}}>Manage orders across all lifecycle stages. Auto-refreshes every 15s.</p>

        <table style={{marginTop: '1.5rem'}}>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Engine</th>
              <th>Customer</th>
              <th>Details / Items</th>
              <th>Status</th>
              <th>Bill</th>
              <th>Rating</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr><td colSpan="8" style={{textAlign: 'center', padding: '2rem', color: 'var(--text-muted)'}}>No orders in this view.</td></tr>
            )}
            {orders.map(order => (
              <tr key={order.id} style={order.ride_locked ? { background: '#fff5f5' } : {}}>
                <td><strong>{order.order_id}</strong><br/><small>{new Date(order.created_at).toLocaleTimeString()}</small></td>
                <td>
                    <span className={`badge ${order.engine_type === 'RIDE' ? 'ride' : 'task'}`}>
                        {order.engine_type}
                    </span>
                </td>
                <td>{order.customer_name}<br/><small style={{color: 'var(--text-muted)'}}>{order.customer_number}</small></td>
                <td style={{ maxWidth: '250px' }}>
                    <div style={{ fontSize: '0.85rem' }}>
                        {order.engine_type === 'RIDE' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span>🚗 Vehicle: <strong>{order.vehicle_type}</strong></span>
                                {order.pickup_lat && (
                                    <span style={{ fontSize: '0.75rem' }}>
                                        📍 <a href={`https://maps.google.com/?q=${order.pickup_lat},${order.pickup_lng}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>Pickup</a>
                                    </span>
                                )}
                                {order.drop_lat && (
                                    <span style={{ fontSize: '0.75rem' }}>
                                        🏁 <a href={`https://maps.google.com/?q=${order.drop_lat},${order.drop_lng}`} target="_blank" rel="noreferrer" style={{ color: 'var(--secondary)' }}>Drop</a>
                                    </span>
                                )}
                            </div>
                        ) : (
                            <span style={{ whiteSpace: 'pre-wrap' }}>{order.items_text || 'No items listed'}</span>
                        )}
                    </div>
                    {order.item_media_ids && (
                        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {order.item_media_ids.split(',').map((mediaId, idx) => {
                                const photoUrl = `${API_URL.replace(/\/api$/, '')}/api/media/${mediaId}`;
                                return (
                                    <a key={idx} href={photoUrl} target="_blank" rel="noreferrer">
                                        <img src={photoUrl} alt={`Item ${idx+1}`} style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--border)' }} />
                                    </a>
                                );
                            })}
                        </div>
                    )}
                </td>
                <td>
                  <span className={`badge ${getStatusBadgeClass(order.status, order.ride_locked)}`}>
                    {order.ride_locked ? '🚨 LOCKED' : order.status}
                  </span>
                  {order.helper_name && <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>👤 {order.helper_name}</div>}
                </td>
                <td>
                    <strong>₹{order.total_amount || order.bill_amount || '0'}</strong>
                    {order.bill_media_id && (
                        <div style={{ marginTop: '0.25rem' }}>
                            <a href={`${API_URL.replace(/\/api$/, '')}/api/media/${order.bill_media_id}`} target="_blank" rel="noreferrer">
                                <img 
                                    src={`${API_URL.replace(/\/api$/, '')}/api/media/${order.bill_media_id}`} 
                                    alt="Bill" 
                                    style={{ width: '35px', height: '35px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--border)' }} 
                                />
                            </a>
                        </div>
                    )}
                </td>
                <td>
                  {order.rating ? (
                    <div style={{ display: 'flex', gap: '2px', fontSize: '1rem' }}>
                      {[1,2,3,4,5].map(s => (
                        <span key={s} style={{ color: s <= order.rating ? '#f59e0b' : 'var(--border)' }}>★</span>
                      ))}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px' }}>({order.rating}/5)</span>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>–</span>
                  )}
                </td>
                <td style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {order.status === 'CONFIRMED' && (
                    <button className="btn btn-primary" style={{fontSize: '0.8rem'}} onClick={() => handleAssign(order.id)}>👤 Assign</button>
                  )}
                  {order.status === 'BILL_IMAGE_UPLOADED' && (
                    <button className="btn btn-primary" style={{fontSize: '0.8rem'}} onClick={() => handleApprove(order.id)}>✅ Approve</button>
                  )}
                  {order.status === 'ITEM_PHOTO_UPLOADED' && (
                    <button className="btn btn-primary" style={{fontSize: '0.8rem', background: 'var(--secondary)'}} onClick={() => handleVerifyItems(order.id)}>📸 Verify Items</button>
                  )}
                  {order.ride_locked === 1 ? (
                    <button className="btn btn-danger" style={{fontSize: '0.8rem'}} onClick={() => handleUnlock(order.id)}>🛠 Unlock</button>
                  ) : null}
                  
                  {!['COMPLETED', 'CANCELLED'].includes(order.status) && (
                    <button 
                      className="btn" 
                      style={{fontSize: '0.8rem', background: '#ffe4e6', color: '#e11d48', border: '1px solid #fda4af'}} 
                      onClick={() => handleCancel(order.id)}
                      title="Force cancel and remove active status"
                    >
                      ❌ Cancel
                    </button>
                  )}
                  
                  {['COMPLETED', 'CANCELLED'].includes(order.status) && (
                      <span style={{color: 'var(--text-muted)', fontSize: '0.85rem'}}>-</span>
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
