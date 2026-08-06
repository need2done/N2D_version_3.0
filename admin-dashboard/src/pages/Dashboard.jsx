import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, MapPin, Activity, Download, FileText, Calendar, RotateCcw, Filter, RefreshCw } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const StatCard = ({ title, value, Icon, color, bgColor }) => (
  <div className="card" style={{ flex: 1, margin: '0 0.5rem 1rem 0.5rem', minWidth: '220px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{title}</p>
        <h2 style={{ margin: '0.4rem 0', fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)' }}>{value}</h2>
      </div>
      <div className="stat-card-badge" style={{ backgroundColor: bgColor || 'rgba(59, 130, 246, 0.12)', color: color || 'var(--primary)' }}>
        <Icon size={24} />
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ onlineHelpers: 0, activeTrackers: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [filter, setFilter] = useState('ALL');
  const [activePreset, setActivePreset] = useState('TODAY');

  const getLocalDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const [dateFilter, setDateFilter] = useState(getLocalDate());
  const [draftDateFilter, setDraftDateFilter] = useState(getLocalDate());

  // Vendor Assignment Modal State
  const [vendors, setVendors] = useState([]);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendorTargetOrder, setVendorTargetOrder] = useState(null);
  const [selectedVendorId, setSelectedVendorId] = useState('');

  const fetchData = async () => {
    try {
      let orderUrl = `${API_URL}/orders?`;
      if (filter === 'RIDE') {
        orderUrl += `engine_type=RIDE&`;
      } else if (filter !== 'ALL') {
        let svcQuery = '';
        if (filter === 'GROCERIES') svcQuery = 'Groceries';
        else if (filter === 'VEG & FRUITS' || filter === 'VEG&FRUTE') svcQuery = 'Vegetables';
        else if (filter === 'HOME SERVICES' || filter === 'HOME SERVICE') svcQuery = 'Home';
        else if (filter === 'MEDICINES' || filter === 'MEDIC') svcQuery = 'Medic';
        else if (filter === 'FOOD') svcQuery = 'Food';
        else if (filter === 'ANYWORK') svcQuery = 'Anywork';
        if (svcQuery) orderUrl += `service=${encodeURIComponent(svcQuery)}&`;
      }
      if (dateFilter) orderUrl += `date=${dateFilter}&`;
      
      const orderRes = await fetch(orderUrl);
      const orderData = await orderRes.json();
      
      const helperRes = await fetch(`${API_URL}/helpers`);
      const helperData = await helperRes.json();
      
      const trackingRes = await fetch(`${API_URL}/tracking/active`);
      const trackingData = await trackingRes.json();

      const vendorRes = await fetch(`${API_URL}/vendors`);
      const vendorData = await vendorRes.json();
      if (vendorData.success) setVendors(vendorData.vendors);

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

  // Presets
  const applyPreset = (presetType) => {
    setActivePreset(presetType);
    const now = new Date();
    let dStr = '';

    const formatDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    if (presetType === 'TODAY') {
      dStr = formatDateStr(now);
    } else if (presetType === 'MONTH') {
      dStr = ''; // Server returns monthly/recent when date parameter is empty or broad
    } else if (presetType === 'SIX_MONTHS') {
      dStr = '';
    } else if (presetType === 'ALL') {
      dStr = '';
    }

    setDraftDateFilter(dStr);
    setDateFilter(dStr);
  };

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

  const handleRetriggerVendor = async (dbId, vendorId) => {
    if (!confirm('Re-send message to the assigned vendor?')) return;
    try {
      const res = await fetch(`${API_URL}/orders/${dbId}/assign-vendor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: parseInt(vendorId) })
      });
      const data = await res.json();
      if (data.success) {
        alert('Vendor message sent successfully!');
        fetchData();
      } else {
        alert(data.error || 'Failed to retrigger vendor');
      }
    } catch (err) {
      alert('Failed to retrigger vendor');
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
    if (reason === null) return;
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

  // Export handlers
  const handleExportExcel = () => {
    const headers = ['Order ID', 'Engine', 'Customer Name', 'Customer Phone', 'Items / Details', 'Status', 'Bill Amount (₹)', 'Assigned Helper', 'Assigned Vendor', 'Date & Time'];
    const rows = orders.map(order => [
      order.order_id,
      order.engine_type,
      order.customer_name,
      order.customer_number,
      order.engine_type === 'RIDE' ? `Vehicle: ${order.vehicle_type}` : (order.items_text || 'N/A'),
      order.ride_locked ? 'LOCKED' : order.status,
      order.total_amount || order.bill_amount || 0,
      order.helper_name || 'Unassigned',
      order.vendor_name || 'None',
      new Date(order.created_at).toLocaleString()
    ]);

    const summaryRow = [
      'TOTAL ORDERS',
      orders.length.toString(),
      '-',
      '-',
      '-',
      '-',
      orders.reduce((acc, curr) => acc + (parseFloat(curr.total_amount || curr.bill_amount) || 0), 0).toFixed(2),
      '-',
      '-',
      `Exported ${orders.length} records`
    ];

    exportToExcel(`Need2Done_Orders_Report_${filter}_${dateFilter || 'All'}`, headers, rows, summaryRow);
  };

  const handleExportPDF = () => {
    const reportTitle = `Unified Orders Report (${filter})`;
    const dateRangeText = dateFilter ? `Date: ${dateFilter}` : `Preset: ${activePreset} / Filter: ${filter}`;
    
    const summaryStats = [
      { title: 'Total Orders', value: orders.length.toString(), subtitle: 'Current View' },
      { title: 'Online Helpers', value: stats.onlineHelpers.toString(), subtitle: 'Available Now' },
      { title: 'Active Trackers', value: stats.activeTrackers.toString(), subtitle: 'Live Sessions' }
    ];

    const headers = ['Order ID', 'Engine', 'Customer', 'Details', 'Status', 'Bill', 'Helper', 'Time'];
    const rows = orders.map(order => [
      order.order_id,
      order.engine_type,
      `${order.customer_name} (${order.customer_number})`,
      order.engine_type === 'RIDE' ? `Vehicle: ${order.vehicle_type}` : (order.items_text || 'N/A').slice(0, 40),
      order.ride_locked ? 'LOCKED' : order.status,
      `₹${order.total_amount || order.bill_amount || 0}`,
      order.helper_name || 'Unassigned',
      new Date(order.created_at).toLocaleTimeString()
    ]);

    exportToPDF(reportTitle, dateRangeText, summaryStats, headers, rows);
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
        <div className="card" style={{ borderLeft: '4px solid var(--danger)', marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--danger)', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Header Container */}
      <div className="page-header-container">
        <div className="page-title-group">
          <h3><LayoutDashboard size={26} color="var(--primary)" /> Unified Dashboard</h3>
          <p>Real-time lifecycle monitoring, dispatch, and system controls.</p>
        </div>

        <div className="toolbar-controls">
          {/* Preset Buttons */}
          <div className="preset-btn-group">
            <button className={`preset-pill ${activePreset === 'TODAY' ? 'active' : ''}`} onClick={() => applyPreset('TODAY')}>Daily (Today)</button>
            <button className={`preset-pill ${activePreset === 'MONTH' ? 'active' : ''}`} onClick={() => applyPreset('MONTH')}>Monthly</button>
            <button className={`preset-pill ${activePreset === 'SIX_MONTHS' ? 'active' : ''}`} onClick={() => applyPreset('SIX_MONTHS')}>6 Months</button>
            <button className={`preset-pill ${activePreset === 'ALL' ? 'active' : ''}`} onClick={() => applyPreset('ALL')}>All Time</button>
          </div>

          {/* Export Buttons */}
          <button className="btn btn-export-excel" onClick={handleExportExcel} title="Export to Excel CSV">
            <Download size={16} /> Excel
          </button>
          <button className="btn btn-export-pdf" onClick={handleExportPDF} title="Export Printable PDF Report">
            <FileText size={16} /> PDF Report
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'flex', flexWrap: 'wrap', margin: '0 -0.5rem 1rem -0.5rem' }}>
        <StatCard title="Total Orders" value={orders.length} Icon={LayoutDashboard} color="#3B82F6" bgColor="rgba(59, 130, 246, 0.12)" />
        <StatCard title="Online Helpers" value={stats.onlineHelpers} Icon={Users} color="#10B981" bgColor="rgba(16, 185, 129, 0.12)" />
        <StatCard title="Active Trackers" value={stats.activeTrackers} Icon={MapPin} color="#F59E0B" bgColor="rgba(245, 158, 11, 0.12)" />
        <StatCard title="Platform Status" value="ONLINE ⚡" Icon={Activity} color="#8B5CF6" bgColor="rgba(139, 92, 246, 0.12)" />
      </div>

      {/* Service Filters & Date Toolbar */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
          {/* 8 Core Service Filter Pills */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {['ALL', 'GROCERIES', 'VEG & FRUITS', 'HOME SERVICES', 'RIDE', 'MEDICINES', 'FOOD', 'ANYWORK'].map(f => (
              <button
                key={f}
                className={`btn ${filter === f ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.825rem', borderRadius: '20px' }}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Date Picker & Refresh Controls */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <Calendar size={16} color="var(--text-muted)" />
            <input 
              type="date" 
              className="input" 
              value={draftDateFilter} 
              onChange={(e) => setDraftDateFilter(e.target.value)} 
              style={{ padding: '0.4rem 0.6rem' }}
              title="Filter orders by date"
              max={getLocalDate()}
            />
            <button 
              className="btn btn-primary" 
              onClick={() => { setActivePreset('CUSTOM'); setDateFilter(draftDateFilter); }}
              style={{ padding: '0.45rem 0.85rem' }}
            >
              <Filter size={15} /> Apply
            </button>
            {(dateFilter || filter !== 'ALL') && (
              <button 
                className="btn btn-outline" 
                onClick={() => {
                  setFilter('ALL');
                  setActivePreset('ALL');
                  setDraftDateFilter('');
                  setDateFilter('');
                }}
                style={{ padding: '0.45rem 0.85rem' }}
              >
                <RotateCcw size={15} /> Reset
              </button>
            )}
            <button className="btn btn-outline" onClick={fetchData} style={{ padding: '0.45rem 0.85rem' }}>
              <RefreshCw size={15} /> Refresh
            </button>
          </div>

        </div>
      </div>

      {/* Main Orders Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Master Order Stream (N2D)</h3>
            <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Live order lifecycle stream. Auto-refreshes every 15s.</p>
          </div>
          <span className="badge task">{orders.length} Active Orders</span>
        </div>

        <table>
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
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>No orders found matching the selected filter.</td></tr>
            )}
            {orders.map(order => (
              <tr key={order.id} style={order.ride_locked ? { background: '#fff5f5' } : {}}>
                <td><strong>#{order.order_id}</strong><br/><small style={{ color: 'var(--text-muted)' }}>{new Date(order.created_at).toLocaleTimeString()}</small></td>
                <td>
                  <span className={`badge ${order.engine_type === 'RIDE' ? 'ride' : 'task'}`}>
                    {order.engine_type}
                  </span>
                  {order.service && <div style={{ fontSize: '0.75rem', marginTop: '2px', color: 'var(--text-muted)' }}>{order.service}</div>}
                </td>
                <td>{order.customer_name}<br/><small style={{ color: 'var(--text-muted)' }}>{order.customer_number}</small></td>
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
                  {order.vendor_name && (
                    <div style={{ fontSize: '0.75rem', marginTop: '4px', color: 'var(--secondary)' }}>
                      🏪 {order.vendor_name} ({order.vendor_status || 'PENDING'})
                    </div>
                  )}
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
                <td style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {order.status === 'CONFIRMED' && (
                    <button className="btn btn-primary" style={{ fontSize: '0.8rem' }} onClick={() => handleAssign(order.id)}>👤 Assign</button>
                  )}
                  {['HELPER_ACCEPTED', 'BILL_IMAGE_UPLOADED', 'ADMIN_APPROVED_BILL', 'HELPER_ARRIVED', 'ITEM_PHOTO_UPLOADED'].includes(order.status) && !order.vendor_id && order.engine_type === 'TASK' && (
                    <button className="btn btn-primary" style={{ fontSize: '0.8rem', background: '#8b5cf6', borderColor: '#8b5cf6' }} onClick={() => { setVendorTargetOrder(order); setShowVendorModal(true); }}>🏪 Assign Vendor</button>
                  )}
                  {order.vendor_id && !['COMPLETED', 'CANCELLED'].includes(order.status) && (
                    <>
                      <button className="btn btn-primary" style={{ fontSize: '0.8rem', background: '#6366f1', borderColor: '#6366f1' }} onClick={() => handleRetriggerVendor(order.id, order.vendor_id)}>🔄 Retrigger Vendor</button>
                      <button className="btn" style={{ fontSize: '0.8rem', background: '#f59e0b', color: 'white', borderColor: '#f59e0b' }} onClick={() => { setVendorTargetOrder(order); setShowVendorModal(true); }}>🏪 Change Vendor</button>
                    </>
                  )}
                  {order.status === 'BILL_IMAGE_UPLOADED' && (
                    <button className="btn btn-primary" style={{ fontSize: '0.8rem' }} onClick={() => handleApprove(order.id)}>✅ Approve</button>
                  )}
                  {order.status === 'ITEM_PHOTO_UPLOADED' && (
                    <button className="btn btn-primary" style={{ fontSize: '0.8rem', background: 'var(--secondary)' }} onClick={() => handleVerifyItems(order.id)}>📸 Verify Items</button>
                  )}
                  {order.ride_locked === 1 ? (
                    <button className="btn btn-danger" style={{ fontSize: '0.8rem' }} onClick={() => handleUnlock(order.id)}>🛠 Unlock</button>
                  ) : null}
                  
                  {!['COMPLETED', 'CANCELLED'].includes(order.status) && (
                    <button 
                      className="btn" 
                      style={{ fontSize: '0.8rem', background: '#ffe4e6', color: '#e11d48', border: '1px solid #fda4af' }} 
                      onClick={() => handleCancel(order.id)}
                      title="Force cancel and remove active status"
                    >
                      ❌ Cancel
                    </button>
                  )}
                  
                  {['COMPLETED', 'CANCELLED'].includes(order.status) && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showVendorModal && (
        <div className="modal-overlay">
          <div className="modal-card animate-fade">
            <h3>Assign / Change Vendor</h3>
            <p style={{ color: 'var(--text-muted)' }}>Select a vendor to assign to Order <strong>#{vendorTargetOrder?.order_id}</strong>.</p>
            <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Current Vendor: {vendors.find(v => v.id === vendorTargetOrder?.vendor_id)?.name || 'None'}</p>
            
            <select 
              style={{ width: '100%', padding: '0.5rem', marginBottom: '1.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}
              value={selectedVendorId}
              onChange={(e) => setSelectedVendorId(e.target.value)}
            >
              <option value="">-- Select Vendor --</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name} ({v.service_category})</option>
              ))}
            </select>
            
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setShowVendorModal(false)}>Cancel</button>
              <button 
                className="btn btn-primary" 
                onClick={async () => {
                  if (!selectedVendorId) return alert('Please select a vendor');
                  setShowVendorModal(false);
                  try {
                    const res = await fetch(`${API_URL}/orders/${vendorTargetOrder.id}/assign-vendor`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ vendor_id: parseInt(selectedVendorId) })
                    });
                    const data = await res.json();
                    if (data.success) {
                      alert('Vendor assigned successfully! They will receive a WhatsApp message.');
                      fetchData();
                    } else alert(data.error || 'Failed to assign vendor');
                  } catch (err) { alert('Failed to assign vendor'); }
                }}
              >Assign Vendor</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
