import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, MapPin, Activity, Download, FileText, Calendar, RotateCcw, Filter, RefreshCw, Search, X, Zap, Eye, Phone, MessageSquare, ExternalLink, Clock, Store, ShieldCheck } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { API_URL } from '../config';


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
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ACTIVE, DRAFT, COMPLETED, CANCELLED
  const [searchQuery, setSearchQuery] = useState('');
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

  // Order Details Modal State
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const openOrderDetails = async (orderIdOrDbId) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`${API_URL}/orders/${orderIdOrDbId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedOrderDetail(data.order);
      } else {
        alert(data.error || 'Could not fetch order details');
      }
    } catch (err) {
      console.error('Error fetching order detail:', err);
      alert('Error connecting to server for order details');
    } finally {
      setLoadingDetail(false);
    }
  };

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

      if (searchQuery.trim()) {
        orderUrl += `q=${encodeURIComponent(searchQuery.trim())}&`;
      } else if (statusFilter === 'ACTIVE') {
        // When active orders filter is selected, fetch across all dates so older active orders aren't hidden
      } else if (dateFilter) {
        orderUrl += `date=${dateFilter}&`;
      }
      
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
  }, [filter, statusFilter, searchQuery, dateFilter]);

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
  // Dynamic order filtering (Global Search + Status Filter)
  const filteredOrders = orders.filter(order => {
    // Status Filter
    if (statusFilter === 'ACTIVE') {
      if (order.status === 'COMPLETED' || order.status === 'CANCELLED') return false;
    } else if (statusFilter === 'DRAFT') {
      if (order.status !== 'DRAFT') return false;
    } else if (statusFilter === 'COMPLETED') {
      if (order.status !== 'COMPLETED' && order.status !== 'PAID') return false;
    } else if (statusFilter === 'CANCELLED') {
      if (order.status !== 'CANCELLED') return false;
    }

    // Global Search Query Filter
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase().trim();
    const cleanQ = q.replace(/^#/, '');
    const strippedQ = cleanQ.replace(/[^a-zA-Z0-9]/g, '');

    const orderIdRaw = (order.order_id || '').toLowerCase();
    const orderIdStripped = orderIdRaw.replace(/[^a-zA-Z0-9]/g, '');

    const orderIdMatch = orderIdRaw.includes(cleanQ) || (strippedQ.length > 0 && orderIdStripped.includes(strippedQ));
    const custNameMatch = (order.customer_name || '').toLowerCase().includes(q);
    const custPhoneMatch = (order.customer_number || '').includes(q);
    const itemsMatch = (order.items_text || '').toLowerCase().includes(q);
    const statusMatch = (order.status || '').toLowerCase().includes(q);
    const helperNameMatch = (order.helper_name || '').toLowerCase().includes(q);
    const helperPhoneMatch = (order.helper_phone || '').includes(q);
    const vendorNameMatch = (order.vendor_name || '').toLowerCase().includes(q);
    const serviceMatch = (order.service || '').toLowerCase().includes(q);
    const engineMatch = (order.engine_type || '').toLowerCase().includes(q);

    return orderIdMatch || custNameMatch || custPhoneMatch || itemsMatch || statusMatch || helperNameMatch || helperPhoneMatch || vendorNameMatch || serviceMatch || engineMatch;
  });

  const activeOrdersCount = orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length;
  const draftOrdersCount = orders.filter(o => o.status === 'DRAFT').length;
  const completedOrdersCount = orders.filter(o => o.status === 'COMPLETED' || o.status === 'PAID').length;
  const cancelledOrdersCount = orders.filter(o => o.status === 'CANCELLED').length;

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

      {/* 🔍 GLOBAL SEARCH & STATUS FILTER TOOLBAR */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', background: 'var(--surface-card, #1e293b)' }}>
        {/* Search Input Bar */}
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <Search size={20} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary, #3b82f6)' }} />
          <input 
            type="text"
            className="input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Global Search: Type Order ID (#N2D...), Customer Name, Phone, Items, Helper, or Status..."
            style={{
              width: '100%',
              padding: '0.75rem 2.75rem 0.75rem 2.8rem',
              fontSize: '0.95rem',
              borderRadius: '12px',
              border: searchQuery ? '2px solid var(--primary, #3b82f6)' : '1px solid var(--border, #334155)',
              background: 'var(--background, #0f172a)',
              color: 'var(--text-main, #f8fafc)',
              boxShadow: searchQuery ? '0 0 12px rgba(59, 130, 246, 0.25)' : 'none',
              transition: 'all 0.2s'
            }}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted, #94a3b8)',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Status Filter Tabs & Counts */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: '0.25rem' }}>
              Status Filter:
            </span>

            <button
              className={`btn ${statusFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.825rem', borderRadius: '20px' }}
              onClick={() => setStatusFilter('ALL')}
            >
              ALL ({orders.length})
            </button>

            <button
              className={`btn ${statusFilter === 'ACTIVE' ? 'btn-primary' : 'btn-outline'}`}
              style={{ 
                padding: '0.4rem 0.85rem', 
                fontSize: '0.825rem', 
                borderRadius: '20px',
                background: statusFilter === 'ACTIVE' ? '#10b981' : 'transparent',
                borderColor: '#10b981',
                color: statusFilter === 'ACTIVE' ? '#ffffff' : '#34d399',
                fontWeight: '700'
              }}
              onClick={() => setStatusFilter('ACTIVE')}
            >
              <Zap size={14} style={{ marginRight: '4px' }} />
              ACTIVE ORDERS ({activeOrdersCount})
            </button>

            <button
              className={`btn ${statusFilter === 'DRAFT' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.825rem', borderRadius: '20px' }}
              onClick={() => setStatusFilter('DRAFT')}
            >
              DRAFT ({draftOrdersCount})
            </button>

            <button
              className={`btn ${statusFilter === 'COMPLETED' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.825rem', borderRadius: '20px' }}
              onClick={() => setStatusFilter('COMPLETED')}
            >
              COMPLETED ({completedOrdersCount})
            </button>

            <button
              className={`btn ${statusFilter === 'CANCELLED' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.825rem', borderRadius: '20px' }}
              onClick={() => setStatusFilter('CANCELLED')}
            >
              CANCELLED ({cancelledOrdersCount})
            </button>
          </div>

          {(searchQuery || statusFilter !== 'ALL') && (
            <div style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 600 }}>
              Showing {filteredOrders.length} of {orders.length} orders
            </div>
          )}
        </div>
      </div>

      {/* Main Orders Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Master Order Stream (N2D)</h3>
            <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Live order lifecycle stream. Auto-refreshes every 15s.</p>
          </div>
          <button 
            className="btn btn-outline"
            style={{
              padding: '0.4rem 0.85rem',
              fontSize: '0.825rem',
              borderRadius: '20px',
              border: '1px solid #10b981',
              color: '#34d399',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onClick={() => setStatusFilter(statusFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')}
          >
            <Zap size={14} /> {activeOrdersCount} ACTIVE ORDERS
          </button>
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
            {filteredOrders.length === 0 && (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>No orders found matching the search or selected filter.</td></tr>
            )}
            {filteredOrders.map(order => (
              <tr key={order.id} style={order.ride_locked ? { background: '#fff5f5' } : {}}>
                <td>
                  <button 
                    onClick={() => openOrderDetails(order.id)}
                    style={{ background: 'none', border: 'none', color: '#38bdf8', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem', padding: 0, textDecoration: 'underline' }}
                    title="Click to view full order details"
                  >
                    #{order.order_id}
                  </button>
                  <br/>
                  <small style={{ color: 'var(--text-muted)' }}>{new Date(order.created_at).toLocaleTimeString()}</small>
                </td>
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
                  <button 
                    className="btn btn-outline" 
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.6rem', display: 'flex', alignItems: 'center', gap: '4px' }} 
                    onClick={() => openOrderDetails(order.id)}
                    title="View full order details modal"
                  >
                    <Eye size={13} /> View Details
                  </button>
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

      {/* 📋 ORDER DETAILS MODAL */}
      {(selectedOrderDetail || loadingDetail) && (
        <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="modal-card animate-fade" style={{ maxWidth: '750px', width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', color: '#f8fafc', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            
            {loadingDetail ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                <RefreshCw className="spin" size={32} style={{ marginBottom: '12px' }} />
                <div>Loading complete order details...</div>
              </div>
            ) : selectedOrderDetail && (
              <div>
                {/* Modal Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #334155', paddingBottom: '16px', marginBottom: '20px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#38bdf8' }}>
                        Order #{selectedOrderDetail.order_id}
                      </h2>
                      <span className={`badge ${getStatusBadgeClass(selectedOrderDetail.status, selectedOrderDetail.ride_locked)}`}>
                        {selectedOrderDetail.status}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                      Service: <strong>{selectedOrderDetail.service || 'General'}</strong> ({selectedOrderDetail.engine_type}) | Placed: {new Date(selectedOrderDetail.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedOrderDetail(null)} 
                    style={{ background: '#334155', border: 'none', color: '#94a3b8', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    ✕
                  </button>
                </div>

                {/* Quick Action Links Bar */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px', background: '#0f172a', padding: '12px', borderRadius: '10px', border: '1px solid #334155' }}>
                  {selectedOrderDetail.customer_number && (
                    <a 
                      href={`https://wa.me/${selectedOrderDetail.customer_number.replace(/\D/g, '')}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="btn"
                      style={{ background: '#25D366', color: '#fff', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px' }}
                    >
                      <MessageSquare size={14} /> Chat Customer (WhatsApp)
                    </a>
                  )}
                  <a 
                    href={`${API_URL.replace(/\/api$/, '')}/track/${selectedOrderDetail.order_id}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="btn"
                    style={{ background: '#3b82f6', color: '#fff', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px' }}
                  >
                    <ExternalLink size={14} /> Open Live Tracking Page
                  </a>
                </div>

                {/* Grid Layout: Customer Info & Locations */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  
                  {/* Customer Card */}
                  <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#38bdf8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={16} /> Customer Details
                    </h4>
                    <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                      <div>👤 <strong>Name:</strong> {selectedOrderDetail.customer_name || 'Guest'}</div>
                      <div>📞 <strong>Phone:</strong> {selectedOrderDetail.customer_number || selectedOrderDetail.customer_phone || 'N/A'}</div>
                      {selectedOrderDetail.address_text && (
                        <div style={{ marginTop: '6px' }}>📍 <strong>Address:</strong> {selectedOrderDetail.address_text}</div>
                      )}
                    </div>
                  </div>

                  {/* Locations / Engine Info */}
                  <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#38bdf8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={16} /> Location & Delivery
                    </h4>
                    <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                      {selectedOrderDetail.engine_type === 'RIDE' ? (
                        <>
                          <div>🚗 <strong>Vehicle Type:</strong> {selectedOrderDetail.vehicle_type || selectedOrderDetail.ride_vehicle || 'BIKE'}</div>
                          {selectedOrderDetail.pickup_lat && (
                            <div style={{ marginTop: '4px' }}>
                              📍 <strong>Pickup:</strong> <a href={`https://maps.google.com/?q=${selectedOrderDetail.pickup_lat},${selectedOrderDetail.pickup_lng}`} target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>Google Maps</a>
                            </div>
                          )}
                          {selectedOrderDetail.drop_lat && (
                            <div style={{ marginTop: '4px' }}>
                              🏁 <strong>Dropoff:</strong> <a href={`https://maps.google.com/?q=${selectedOrderDetail.drop_lat},${selectedOrderDetail.drop_lng}`} target="_blank" rel="noreferrer" style={{ color: '#34d399' }}>Google Maps</a>
                            </div>
                          )}
                        </>
                      ) : (
                        <div>📍 <strong>Address / Location:</strong> {selectedOrderDetail.address_text || 'Shared via WhatsApp GPS'}</div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Items & Description Section */}
                <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155', marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#38bdf8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📦 Items & Task Description
                  </h4>
                  <div style={{ fontSize: '14px', background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                    {selectedOrderDetail.items_text || 'No items description provided.'}
                  </div>

                  {/* Media Gallery */}
                  {(selectedOrderDetail.item_media_ids || selectedOrderDetail.bill_media_id) && (
                    <div style={{ marginTop: '14px' }}>
                      <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', marginBottom: '6px' }}>ORDER MEDIA & BILL PHOTOS:</div>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {selectedOrderDetail.item_media_ids && selectedOrderDetail.item_media_ids.split(',').map((mId, idx) => (
                          <a key={idx} href={`${API_URL.replace(/\/api$/, '')}/api/media/${mId}`} target="_blank" rel="noreferrer">
                            <img src={`${API_URL.replace(/\/api$/, '')}/api/media/${mId}`} alt={`Item ${idx+1}`} style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #38bdf8' }} />
                          </a>
                        ))}
                        {selectedOrderDetail.bill_media_id && (
                          <a href={`${API_URL.replace(/\/api$/, '')}/api/media/${selectedOrderDetail.bill_media_id}`} target="_blank" rel="noreferrer">
                            <img src={`${API_URL.replace(/\/api$/, '')}/api/media/${selectedOrderDetail.bill_media_id}`} alt="Bill" style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover', border: '2px solid #10b981' }} />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Assignment & Financial Breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  
                  {/* Assigned Helper & Vendor */}
                  <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#38bdf8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={16} /> Assignment Info
                    </h4>
                    <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                      <div>👤 <strong>Assigned Helper:</strong> {selectedOrderDetail.helper_name ? `${selectedOrderDetail.helper_name} (${selectedOrderDetail.helper_phone})` : 'Unassigned'}</div>
                      <div>🏪 <strong>Assigned Vendor:</strong> {selectedOrderDetail.vendor_name ? `${selectedOrderDetail.vendor_name} (${selectedOrderDetail.vendor_phone})` : 'None'}</div>
                      {selectedOrderDetail.otp && <div>🔑 <strong>Delivery OTP:</strong> <span style={{ background: '#059669', padding: '2px 8px', borderRadius: '4px', color: '#fff', fontWeight: 'bold' }}>{selectedOrderDetail.otp}</span></div>}
                    </div>
                  </div>

                  {/* Financials */}
                  <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#38bdf8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      💳 Financial Breakdown
                    </h4>
                    <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                      <div>💰 <strong>Total Amount:</strong> <span style={{ fontSize: '18px', fontWeight: '800', color: '#34d399' }}>₹{selectedOrderDetail.total_amount || selectedOrderDetail.bill_amount || 0}</span></div>
                      <div>💳 <strong>Payment Status:</strong> {selectedOrderDetail.status === 'COMPLETED' || selectedOrderDetail.status === 'PAID' ? 'PAID ✅' : 'PENDING ⏳'}</div>
                    </div>
                  </div>

                </div>

                {/* Order Timeline Log */}
                {selectedOrderDetail.timeline && selectedOrderDetail.timeline.length > 0 && (
                  <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#38bdf8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={16} /> Order Activity Timeline
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedOrderDetail.timeline.map((t, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', background: '#1e293b', padding: '8px 12px', borderRadius: '6px' }}>
                          <span><strong>{t.event_type}:</strong> {t.event_text}</span>
                          <span style={{ color: '#94a3b8', fontSize: '11px' }}>{new Date(t.created_at).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer Buttons */}
                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button className="btn btn-outline" onClick={() => setSelectedOrderDetail(null)}>Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
