import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, MapPin, Activity, Download, FileText, Calendar, RotateCcw, Filter, RefreshCw, Search, X, Zap, Eye, Phone, MessageSquare, ExternalLink, Clock, Store, ShieldCheck, CreditCard, Smartphone, PhoneCall, CheckCircle2 } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { formatOrderDateTime, formatDateTimeIST, formatTimeIST, formatDateIST } from '../utils/dateUtils';
import { API_URL } from '../config';


const StatCard = ({ title, value, Icon, color, bgColor, trend }) => (
  <div className="stat-card" style={{ margin: '0 0 0 0' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ flex: 1 }}>
        <p style={{
          margin: 0,
          color: '#64748b',
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          marginBottom: '8px'
        }}>{title}</p>
        <p style={{
          margin: 0,
          fontSize: '28px',
          fontWeight: 800,
          color: '#0f172a',
          letterSpacing: '-0.03em',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.1
        }}>{value}</p>
      </div>
      <div className="stat-card-badge" style={{
        backgroundColor: bgColor || 'rgba(59, 130, 246, 0.10)',
        color: color || '#2563eb'
      }}>
        <Icon size={20} strokeWidth={2} />
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

  // Message Trigger Interval State
  const [triggerInterval, setTriggerInterval] = useState('2');
  const [triggerIntervalUpdating, setTriggerIntervalUpdating] = useState(false);
  const [triggerIntervalSaved, setTriggerIntervalSaved] = useState(false);

  const fetchTriggerInterval = async () => {
    try {
      const res = await fetch(`${API_URL}/settings/trigger-interval`);
      const data = await res.json();
      if (data.success && data.intervalMinutes) {
        setTriggerInterval(String(data.intervalMinutes));
      }
    } catch (err) {
      console.error('Failed to fetch trigger interval:', err);
    }
  };

  const handleTriggerIntervalChange = async (newInterval) => {
    setTriggerInterval(newInterval);
    setTriggerIntervalUpdating(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/settings/trigger-interval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify({ intervalMinutes: newInterval })
      });
      const data = await res.json();
      if (data.success) {
        setTriggerIntervalSaved(true);
        setTimeout(() => setTriggerIntervalSaved(false), 3000);
      }
    } catch (err) {
      console.error('Error updating trigger interval:', err);
    } finally {
      setTriggerIntervalUpdating(false);
    }
  };



  // Vendor Assignment Modal State
  const [vendors, setVendors] = useState([]);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendorTargetOrder, setVendorTargetOrder] = useState(null);
  const [selectedVendorId, setSelectedVendorId] = useState('');

  // Helper Assignment & Assisted Workflow Modal State
  const [allHelpers, setAllHelpers] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTargetOrder, setAssignTargetOrder] = useState(null);
  const [selectedAssignHelperId, setSelectedAssignHelperId] = useState('');
  const [assignHelperFilter, setAssignHelperFilter] = useState('ALL'); // ALL, SMARTPHONE, KEYPAD

  // Order Details Modal State
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const openOrderDetails = async (orderIdOrDbId) => {
    setLoadingDetail(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/orders/${orderIdOrDbId}`, { headers: authHeader });
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
        else if (filter === 'CUSTOM WORK' || filter === 'ANYWORK') svcQuery = 'Custom';
        if (svcQuery) orderUrl += `service=${encodeURIComponent(svcQuery)}&`;
      }

      if (searchQuery.trim()) {
        orderUrl += `q=${encodeURIComponent(searchQuery.trim())}&`;
      } else if (statusFilter === 'ACTIVE') {
        // When active orders filter is selected, fetch across all dates so older active orders aren't hidden
      } else if (dateFilter) {
        orderUrl += `date=${dateFilter}&`;
      }
      
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};

      const orderRes = await fetch(orderUrl, { headers: authHeader });
      const orderData = await orderRes.json();
      
      const helperRes = await fetch(`${API_URL}/helpers`, { headers: authHeader });
      const helperData = await helperRes.json();
      if (helperData.success && Array.isArray(helperData.helpers)) setAllHelpers(helperData.helpers);
      
      const trackingRes = await fetch(`${API_URL}/tracking/active`, { headers: authHeader });
      const trackingData = await trackingRes.json();

      const vendorRes = await fetch(`${API_URL}/vendors`, { headers: authHeader });
      const vendorData = await vendorRes.json();
      if (vendorData.success) setVendors(vendorData.vendors);

      if (orderData.success && Array.isArray(orderData.orders)) {
        setOrders(orderData.orders);
      }
      
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
    fetchTriggerInterval();
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

  const handleAssignSmart = async (dbId, helperId) => {
    try {
      const res = await fetch(`${API_URL}/orders/${dbId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helper_id: parseInt(helperId) })
      });
      const data = await res.json();
      if (data.success) {
        alert('WhatsApp assignment offer sent to helper!');
        setShowAssignModal(false);
        fetchData();
        if (selectedOrderDetail && selectedOrderDetail.id === dbId) openOrderDetails(dbId);
      } else {
        alert(data.error || 'Failed to assign helper');
      }
    } catch (err) {
      alert('Failed to assign helper');
    }
  };

  const handleAssistedAssign = async (dbId, helperId) => {
    if (!helperId) {
      alert('Please select a helper to assign');
      return;
    }
    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
    const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};
    try {
      const res = await fetch(`${API_URL}/orders/${dbId}/assisted/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ helper_id: parseInt(helperId) })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'Keypad helper confirmed & assigned! Customer notified.');
        setShowAssignModal(false);
        fetchData();
        if (selectedOrderDetail && selectedOrderDetail.id === dbId) openOrderDetails(dbId);
      } else {
        alert(data.error || 'Failed to assign helper');
      }
    } catch (err) {
      alert('Network error assigning helper');
    }
  };

  const handleAssistedArrived = async (dbId) => {
    if (!confirm('Mark helper as ARRIVED at location? This will dispatch Start OTP to customer WhatsApp.')) return;
    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
    const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};
    try {
      const res = await fetch(`${API_URL}/orders/${dbId}/assisted/arrived`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader }
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'Helper marked arrived & Start OTP dispatched to customer WhatsApp!');
        fetchData();
        if (selectedOrderDetail && selectedOrderDetail.id === dbId) openOrderDetails(dbId);
      } else {
        alert(data.error || 'Failed to update arrival');
      }
    } catch (err) {
      alert('Error updating arrival');
    }
  };

  const handleAssistedVerifyStartOtp = async (dbId, defaultOtp = '') => {
    const otpInput = prompt('Enter 4-digit Start OTP received from customer WhatsApp:', defaultOtp || '');
    if (!otpInput) return;
    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
    const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};
    try {
      const res = await fetch(`${API_URL}/orders/${dbId}/assisted/verify-start-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ otp: otpInput.trim() })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'Start OTP verified! Service timer started.');
        fetchData();
        if (selectedOrderDetail && selectedOrderDetail.id === dbId) openOrderDetails(dbId);
      } else {
        alert(data.error || 'Failed to verify Start OTP');
      }
    } catch (err) {
      alert('Error verifying Start OTP');
    }
  };

  const handleAssistedRequestEndOtp = async (dbId) => {
    if (!confirm('Trigger End OTP to customer WhatsApp?')) return;
    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
    const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};
    try {
      const res = await fetch(`${API_URL}/orders/${dbId}/assisted/request-end-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader }
      });
      const data = await res.json();
      if (data.success) {
        alert(`End OTP (${data.end_otp}) dispatched to customer WhatsApp!`);
        fetchData();
        if (selectedOrderDetail && selectedOrderDetail.id === dbId) openOrderDetails(dbId);
      } else {
        alert(data.error || 'Failed to trigger End OTP');
      }
    } catch (err) {
      alert('Error triggering End OTP');
    }
  };

  const handleAssistedVerifyEndOtp = async (dbId, defaultOtp = '') => {
    const otpInput = prompt('Enter 4-digit End OTP received from customer WhatsApp:', defaultOtp || '');
    if (!otpInput) return;
    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
    const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};
    try {
      const res = await fetch(`${API_URL}/orders/${dbId}/assisted/verify-end-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ otp: otpInput.trim() })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'Job completed successfully! Cash payout recorded.');
        fetchData();
        if (selectedOrderDetail && selectedOrderDetail.id === dbId) openOrderDetails(dbId);
      } else {
        alert(data.error || 'Failed to verify End OTP');
      }
    } catch (err) {
      alert('Error verifying End OTP');
    }
  };

  const handleAssistedSettleCash = async (dbId) => {
    if (!confirm('Confirm that physical cash has been paid to the helper?')) return;
    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
    const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};
    try {
      const res = await fetch(`${API_URL}/orders/${dbId}/assisted/settle-cash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader }
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'Cash payout marked as settled!');
        fetchData();
        if (selectedOrderDetail && selectedOrderDetail.id === dbId) openOrderDetails(dbId);
      } else {
        alert(data.error || 'Failed to settle payout');
      }
    } catch (err) {
      alert('Error settling cash payout');
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
      formatDateTimeIST(order.created_at)
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
      formatTimeIST(order.created_at)
    ]);

    exportToPDF(reportTitle, dateRangeText, summaryStats, headers, rows);
  };

  const getStatusBadgeClass = (status, locked) => {
    if (locked) return 'CANCELLED';
    switch (status) {
      case 'CONFIRMED':             return 'DRAFT';
      case 'HELPER_ACCEPTED':
      case 'HELPER_ARRIVED':
      case 'RIDE_STARTED':
      case 'ITEM_PHOTO_UPLOADED':
      case 'BILL_IMAGE_UPLOADED':   return 'ACTIVE';
      case 'ADMIN_APPROVED_BILL':   return 'ASSIGNED';
      case 'COMPLETED':
      case 'PAID':                  return 'COMPLETED';
      case 'CANCELLED':             return 'CANCELLED';
      default:                      return 'DRAFT';
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

      {/* Stat Cards — 8px grid, card blocks */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <StatCard title="Total Orders"    value={orders.length}         Icon={LayoutDashboard} color="#2563eb" bgColor="rgba(37,99,235,0.09)" />
        <StatCard title="Online Helpers"  value={stats.onlineHelpers}   Icon={Users}           color="#059669" bgColor="rgba(5,150,105,0.09)" />
        <StatCard title="Active Trackers" value={stats.activeTrackers}  Icon={MapPin}          color="#d97706" bgColor="rgba(217,119,6,0.09)" />
        <StatCard title="Platform Status" value="Operational"            Icon={Activity}        color="#7c3aed" bgColor="rgba(124,58,237,0.09)" />
      </div>

      {/* Service Category Tabs + Date Controls */}
      <div className="card" style={{ padding: 0, marginBottom: '16px', overflow: 'hidden' }}>
        {/* Horizontal scrollable tab bar */}
        <div className="category-tabs-bar">
          {['ALL', 'GROCERIES', 'VEG & FRUITS', 'HOME SERVICES', 'RIDE', 'MEDICINES', 'FOOD', 'CUSTOM WORK'].map(f => (
            <button
              key={f}
              className={`category-tab${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Date Picker & Refresh Controls */}
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          flexWrap: 'wrap',
          padding: '10px 14px',
          borderTop: '1px solid #f1f5f9'
        }}>
          <Calendar size={14} color="#94a3b8" />
          <input
            type="date"
            className="input"
            value={draftDateFilter}
            onChange={(e) => setDraftDateFilter(e.target.value)}
            style={{ padding: '5px 10px', fontSize: '13px' }}
            title="Filter orders by date"
            max={getLocalDate()}
          />
          <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '13px' }}
            onClick={() => { setActivePreset('CUSTOM'); setDateFilter(draftDateFilter); }}>
            <Filter size={13} /> Apply
          </button>
          {(dateFilter || filter !== 'ALL') && (
            <button className="btn btn-outline" style={{ padding: '5px 12px', fontSize: '13px' }}
              onClick={() => { setFilter('ALL'); setActivePreset('ALL'); setDraftDateFilter(''); setDateFilter(''); }}>
              <RotateCcw size={13} /> Reset
            </button>
          )}
          <button className="btn btn-outline" style={{ padding: '5px 12px', fontSize: '13px' }} onClick={fetchData}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Global Search + Status Filter Toolbar */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: '16px' }}>
        {/* Search Input */}
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <Search size={15} style={{
            position: 'absolute', left: '12px', top: '50%',
            transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none'
          }} />
          <input
            type="search"
            className="input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order ID, customer name, phone, items, helper…"
            style={{ width: '100%', paddingLeft: '36px', paddingRight: searchQuery ? '36px' : '12px' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{
              position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0
            }}><X size={15} /></button>
          )}
        </div>

        {/* Status filter as tab list */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div className="category-tabs-bar" style={{ border: 'none', gap: '2px' }}>
            {[
              { key: 'ALL',       label: `All Orders`,          count: orders.length },
              { key: 'ACTIVE',    label: `Active`,              count: activeOrdersCount },
              { key: 'DRAFT',     label: `Draft`,               count: draftOrdersCount },
              { key: 'COMPLETED', label: `Completed`,           count: completedOrdersCount },
              { key: 'CANCELLED', label: `Cancelled`,           count: cancelledOrdersCount },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                className={`category-tab${statusFilter === key ? ' active' : ''}`}
                onClick={() => setStatusFilter(key)}
                style={{ padding: '6px 12px' }}
              >
                {label}
                <span style={{
                  marginLeft: '6px',
                  background: statusFilter === key ? '#dbeafe' : '#f1f5f9',
                  color: statusFilter === key ? '#1d4ed8' : '#64748b',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '1px 7px',
                  display: 'inline-block',
                  minWidth: '22px',
                  textAlign: 'center'
                }}>{count}</span>
              </button>
            ))}
          </div>
          {(searchQuery || statusFilter !== 'ALL') && (
            <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600 }}>
              {filteredOrders.length} of {orders.length} orders
            </span>
          )}
        </div>
      </div>

      {/* Main Orders Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Master Order Stream (N2D)</h3>
            <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Live order lifecycle stream. Auto-refreshes every 15s.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Helper Message Broadcast Interval Control */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(59, 130, 246, 0.08)',
              padding: '0.35rem 0.75rem',
              borderRadius: '20px',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              fontSize: '0.825rem',
              color: '#1e40af'
            }}>
              <MessageSquare size={14} style={{ color: '#2563eb' }} />
              <span style={{ fontWeight: 600 }}>Msg Trigger:</span>
              <select
                value={triggerInterval}
                onChange={(e) => handleTriggerIntervalChange(e.target.value)}
                disabled={triggerIntervalUpdating}
                style={{
                  background: '#fff',
                  border: '1px solid #93c5fd',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#1d4ed8',
                  cursor: 'pointer',
                  outline: 'none'
                }}
                title="Broadcast interval for sending WhatsApp messages for unassigned orders to helpers"
              >
                <option value="1">Every 1 min</option>
                <option value="2">Every 2 mins (Recommended)</option>
                <option value="3">Every 3 mins</option>
                <option value="5">Every 5 mins</option>
                <option value="10">Every 10 mins</option>
              </select>
              {triggerIntervalSaved && (
                <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.75rem' }}>✓ Saved</span>
              )}
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
        </div>

        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Engine</th>
              <th>Customer</th>
              <th>Details / Items</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Bill (₹)</th>
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
                  {formatOrderDateTime(order.created_at)}
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
                            ðŸ“ <a href={`https://maps.google.com/?q=${order.pickup_lat},${order.pickup_lng}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>Pickup</a>
                          </span>
                        )}
                        {order.drop_lat && (
                          <span style={{ fontSize: '0.75rem' }}>
                            ðŸ <a href={`https://maps.google.com/?q=${order.drop_lat},${order.drop_lng}`} target="_blank" rel="noreferrer" style={{ color: 'var(--secondary)' }}>Drop</a>
                          </span>
                        )}
                      </div>
                    ) : (
                      <div>
                        <span style={{ whiteSpace: 'pre-wrap' }}>
                          {(() => {
                            let pData = order.parsed_payload;
                            if (!pData && order.payload) {
                              try { pData = typeof order.payload === 'string' ? JSON.parse(order.payload) : order.payload; } catch(e){}
                            }
                            pData = pData || {};
                            const itemsFromPayload = Array.isArray(pData.items) ? pData.items.join('\n') : pData.items;
                            return order.items_text || itemsFromPayload || pData.task_description || 'No items listed';
                          })()}
                        </span>
                        {(() => {
                          let pData = order.parsed_payload;
                          if (!pData && order.payload) {
                            try { pData = typeof order.payload === 'string' ? JSON.parse(order.payload) : order.payload; } catch(e){}
                          }
                          pData = pData || {};
                          const pLoc = pData.pickup_location || pData.work_location || pData.location;
                          const dLoc = pData.drop_location;
                          if (pLoc || dLoc) {
                            return (
                              <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#94a3b8' }}>
                                {pLoc && <div style={{ color: '#38bdf8' }}>ðŸ“ <strong>Pickup:</strong> {pLoc}</div>}
                                {dLoc && <div style={{ color: '#34d399' }}>ðŸ <strong>Drop:</strong> {dLoc}</div>}
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
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
                  <span className={`status-badge ${getStatusBadgeClass(order.status, order.ride_locked)}`}>
                    {order.ride_locked ? 'LOCKED' : order.status.replace(/_/g, ' ')}
                  </span>
                  {order.helper_name && (
                    <div style={{ fontSize: '12px', marginTop: '5px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={11} /> {order.helper_name}
                    </div>
                  )}
                  {order.vendor_name && (
                    <div style={{ fontSize: '12px', marginTop: '3px', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Store size={11} /> {order.vendor_name}
                    </div>
                  )}
                </td>
                <td className="td-amount">
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                    ₹{(() => {
                      if (order.total_amount && parseFloat(order.total_amount) > 0) return Number(order.total_amount).toLocaleString('en-IN');
                      if (order.bill_amount && parseFloat(order.bill_amount) > 0) return Number(order.bill_amount).toLocaleString('en-IN');
                      let pData = order.parsed_payload;
                      if (!pData && order.payload) {
                        try { pData = typeof order.payload === 'string' ? JSON.parse(order.payload) : order.payload; } catch(e){}
                      }
                      pData = pData || {};
                      return pData.cost || pData.estimated_cost || pData.quoted_fee || '0';
                    })()}
                  </span>
                  {order.bill_media_id && (
                    <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'flex-end' }}>
                      <a href={`${API_URL.replace(/\/api$/, '')}/api/media/${order.bill_media_id}`} target="_blank" rel="noreferrer">
                        <img
                          src={`${API_URL.replace(/\/api$/, '')}/api/media/${order.bill_media_id}`}
                          alt="Bill"
                          style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #e2e8f0' }}
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
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</span>
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
                  {order.status === 'CONFIRMED' && !order.helper_id && (
                    <button 
                      className="btn btn-primary" 
                      style={{ fontSize: '0.8rem' }} 
                      onClick={() => { setAssignTargetOrder(order); setSelectedAssignHelperId(''); setShowAssignModal(true); }}
                    >
                      👤 Assign
                    </button>
                  )}
                  {order.status === 'HELPER_ASSIGNED' && (
                    <button 
                      className="btn" 
                      style={{ fontSize: '0.8rem', background: '#f59e0b', color: '#fff', border: 'none', fontWeight: 600 }} 
                      onClick={() => handleAssistedArrived(order.id)}
                      title="Helper reached location"
                    >
                      📍 Arrived
                    </button>
                  )}
                  {order.status === 'ARRIVED' && (
                    <button 
                      className="btn" 
                      style={{ fontSize: '0.8rem', background: '#3b82f6', color: '#fff', border: 'none', fontWeight: 600 }} 
                      onClick={() => {
                        let pData = {};
                        try { pData = typeof order.payload === 'string' ? JSON.parse(order.payload) : (order.payload || {}); } catch(e){}
                        handleAssistedVerifyStartOtp(order.id, pData.start_otp || order.delivery_otp);
                      }}
                      title="Verify Start OTP"
                    >
                      🔐 Start OTP
                    </button>
                  )}
                  {order.status === 'SERVICE_STARTED' && (
                    <button 
                      className="btn" 
                      style={{ fontSize: '0.8rem', background: '#10b981', color: '#fff', border: 'none', fontWeight: 600 }} 
                      onClick={() => handleAssistedRequestEndOtp(order.id)}
                      title="Request End OTP"
                    >
                      🏁 End OTP
                    </button>
                  )}
                  {order.status === 'END_OTP_REQUESTED' && (
                    <button 
                      className="btn" 
                      style={{ fontSize: '0.8rem', background: '#10b981', color: '#fff', border: 'none', fontWeight: 600 }} 
                      onClick={() => {
                        let pData = {};
                        try { pData = typeof order.payload === 'string' ? JSON.parse(order.payload) : (order.payload || {}); } catch(e){}
                        handleAssistedVerifyEndOtp(order.id, pData.end_otp);
                      }}
                      title="Verify End OTP"
                    >
                      🏁 Verify End OTP
                    </button>
                  )}
                  {order.status === 'COMPLETED' && order.payout_method === 'PHYSICAL_CASH' && (
                    order.payout_settled ? (
                      <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700, padding: '2px 6px', background: '#dcfce7', borderRadius: '4px' }}>💵 Paid</span>
                    ) : (
                      <button 
                        className="btn" 
                        style={{ fontSize: '0.8rem', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontWeight: 600 }} 
                        onClick={() => handleAssistedSettleCash(order.id)}
                        title="Mark cash paid to helper"
                      >
                        💵 Settle Cash
                      </button>
                    )
                  )}
                  {['HELPER_ACCEPTED', 'BILL_IMAGE_UPLOADED', 'ADMIN_APPROVED_BILL', 'HELPER_ARRIVED', 'ITEM_PHOTO_UPLOADED'].includes(order.status) && !order.vendor_id && order.engine_type === 'TASK' && (
                    <button className="btn btn-primary" style={{ fontSize: '0.8rem', background: '#8b5cf6', borderColor: '#8b5cf6' }} onClick={() => { setVendorTargetOrder(order); setShowVendorModal(true); }}>ðŸª Assign Vendor</button>
                  )}
                  {order.vendor_id && !['COMPLETED', 'CANCELLED'].includes(order.status) && (
                    <>
                      <button className="btn btn-primary" style={{ fontSize: '0.8rem', background: '#6366f1', borderColor: '#6366f1' }} onClick={() => handleRetriggerVendor(order.id, order.vendor_id)}>🔄 Retrigger Vendor</button>
                      <button className="btn" style={{ fontSize: '0.8rem', background: '#f59e0b', color: 'white', borderColor: '#f59e0b' }} onClick={() => { setVendorTargetOrder(order); setShowVendorModal(true); }}>ðŸª Change Vendor</button>
                    </>
                  )}
                  {order.status === 'BILL_IMAGE_UPLOADED' && (
                    <button className="btn btn-primary" style={{ fontSize: '0.8rem' }} onClick={() => handleApprove(order.id)}>✅ Approve</button>
                  )}
                  {order.status === 'ITEM_PHOTO_UPLOADED' && (
                    <button className="btn btn-primary" style={{ fontSize: '0.8rem', background: 'var(--secondary)' }} onClick={() => handleVerifyItems(order.id)}>📷 Verify Items</button>
                  )}
                  {order.ride_locked === 1 ? (
                    <button className="btn btn-danger" style={{ fontSize: '0.8rem' }} onClick={() => handleUnlock(order.id)}>ðŸ›  Unlock</button>
                  ) : null}
                  
                  {!['COMPLETED', 'CANCELLED'].includes(order.status) && (
                    <button 
                      className="btn" 
                      style={{ fontSize: '0.8rem', background: '#ffe4e6', color: '#e11d48', border: '1px solid #fda4af' }} 
                      onClick={() => handleCancel(order.id)}
                      title="Force cancel and remove active status"
                    >
                      âŒ Cancel
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

      {/* HELPER ASSIGNMENT MODAL (Smart Phone vs Keypad Phone) */}
      {showAssignModal && assignTargetOrder && (
        <div className="modal-overlay">
          <div className="modal-card animate-fade" style={{ maxWidth: '600px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                👤 Assign Helper to Order #{assignTargetOrder.order_id}
              </h3>
              <button className="btn btn-outline" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setShowAssignModal(false)}>✕</button>
            </div>

            <div style={{ marginBottom: '1.2rem', padding: '0.85rem 1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.875rem' }}>
              <div><strong>Service:</strong> <span style={{ color: '#2563eb', fontWeight: 700 }}>{assignTargetOrder.service}</span></div>
              <div style={{ marginTop: '3px' }}><strong>Customer:</strong> {assignTargetOrder.customer_name} ({assignTargetOrder.customer_number || assignTargetOrder.customer_phone})</div>
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <button 
                type="button"
                className={`btn ${assignHelperFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem' }}
                onClick={() => setAssignHelperFilter('ALL')}
              >
                All Helpers ({allHelpers.length})
              </button>
              <button 
                type="button"
                className={`btn ${assignHelperFilter === 'SMARTPHONE' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem' }}
                onClick={() => setAssignHelperFilter('SMARTPHONE')}
              >
                📱 Smart Phone ({allHelpers.filter(h => (h.device_type || 'SMARTPHONE') === 'SMARTPHONE').length})
              </button>
              <button 
                type="button"
                className={`btn ${assignHelperFilter === 'KEYPAD' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem' }}
                onClick={() => setAssignHelperFilter('KEYPAD')}
              >
                📞 Keypad / Old ({allHelpers.filter(h => h.device_type === 'KEYPAD').length})
              </button>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.875rem' }}>
                Select Helper:
              </label>
              <select 
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.9rem' }}
                value={selectedAssignHelperId}
                onChange={(e) => setSelectedAssignHelperId(e.target.value)}
              >
                <option value="">-- Choose Helper from list --</option>
                {allHelpers
                  .filter(h => {
                    if (assignHelperFilter === 'SMARTPHONE') return (h.device_type || 'SMARTPHONE') === 'SMARTPHONE';
                    if (assignHelperFilter === 'KEYPAD') return h.device_type === 'KEYPAD';
                    return true;
                  })
                  .map(h => (
                    <option key={h.id} value={h.id}>
                      {h.device_type === 'KEYPAD' ? '📞 [KEYPAD]' : '📱 [SMART]'} {h.name} ({h.phone}) — {h.status || 'ONLINE'} — {h.category}
                    </option>
                  ))
                }
              </select>
            </div>

            {/* Instruction Banner based on selected helper's device */}
            {(() => {
              const selected = allHelpers.find(h => String(h.id) === String(selectedAssignHelperId));
              if (!selected) return null;
              const isKeypad = selected.device_type === 'KEYPAD';
              return (
                <div style={{ 
                  padding: '1rem', 
                  borderRadius: '10px', 
                  marginBottom: '1.25rem',
                  background: isKeypad ? '#fef3c7' : '#eff6ff', 
                  border: `1px solid ${isKeypad ? '#fde68a' : '#bfdbfe'}`,
                  color: isKeypad ? '#92400e' : '#1e40af',
                  fontSize: '0.85rem',
                  lineHeight: 1.5
                }}>
                  <div style={{ fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isKeypad ? '📞 Keypad / Basic Phone Helper Flow' : '📱 Smart Phone Helper Flow'}
                  </div>
                  {isKeypad ? (
                    <div>
                      Call <strong>{selected.name}</strong> at <strong>{selected.phone}</strong> to confirm availability.<br/>
                      If she says <strong>"YES"</strong>, click <em>Confirm & Assign (Keypad Mode)</em>.<br/>
                      The customer will automatically receive a WhatsApp notification that {selected.name} is assigned!
                    </div>
                  ) : (
                    <div>
                      Clicking button will send an interactive WhatsApp offer to <strong>{selected.name} ({selected.phone})</strong> with Accept / Reject buttons.
                    </div>
                  )}
                </div>
              );
            })()}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowAssignModal(false)}>Cancel</button>
              {(() => {
                const selected = allHelpers.find(h => String(h.id) === String(selectedAssignHelperId));
                const isKeypad = selected?.device_type === 'KEYPAD';
                return (
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    style={{ background: isKeypad ? '#f59e0b' : '#2563eb', borderColor: isKeypad ? '#f59e0b' : '#2563eb', fontWeight: 700 }}
                    disabled={!selectedAssignHelperId}
                    onClick={() => {
                      if (isKeypad) {
                        handleAssistedAssign(assignTargetOrder.id, selectedAssignHelperId);
                      } else {
                        handleAssignSmart(assignTargetOrder.id, selectedAssignHelperId);
                      }
                    }}
                  >
                    {isKeypad ? '✅ Confirm & Assign (Keypad Mode)' : '📲 Send WhatsApp Offer (Smart Mode)'}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ORDER DETAILS MODAL â€” Light Mode */}
      {(selectedOrderDetail || loadingDetail) && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.5)',
          backdropFilter: 'blur(6px)',
          zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
          overflowY: 'auto',
        }}>
          <div style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '20px',
            maxWidth: '780px', width: '100%',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 25px 60px -12px rgba(0,0,0,0.18)',
            animation: 'slideInUp 0.3s cubic-bezier(0.16,1,0.3,1)',
          }}>

            {loadingDetail ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                <RefreshCw size={32} style={{ marginBottom: 12 }} />
                <div style={{ fontSize: '14px', fontWeight: 600 }}>Loading order details…</div>
              </div>
            ) : selectedOrderDetail && (
              <>
                {/* ── Modal Header ── */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  padding: '20px 24px',
                  borderBottom: '1px solid #f1f5f9',
                  background: '#fafbfc',
                  borderRadius: '20px 20px 0 0',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                        Order #{selectedOrderDetail.order_id}
                      </h2>
                      <span className={`status-badge ${getStatusBadgeClass(selectedOrderDetail.status, selectedOrderDetail.ride_locked)}`}>
                        {selectedOrderDetail.status?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p style={{ margin: '5px 0 0', fontSize: '13px', color: '#64748b' }}>
                      Service: <strong style={{ color: '#334155' }}>{selectedOrderDetail.service || 'General'}</strong>
                      {' '}({selectedOrderDetail.engine_type}) &nbsp;·&nbsp; Placed: {formatDateTimeIST(selectedOrderDetail.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedOrderDetail(null)}
                    style={{
                      background: '#f1f5f9', border: 'none', width: 34, height: 34,
                      borderRadius: '50%', cursor: 'pointer', color: '#64748b',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>

                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                  {/* ── Quick Action Buttons ── */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {selectedOrderDetail.customer_number && (
                      <a
                        href={`https://wa.me/${selectedOrderDetail.customer_number.replace(/\D/g, '')}`}
                        target="_blank" rel="noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          background: '#22c55e', color: '#fff', padding: '8px 14px',
                          borderRadius: '10px', fontWeight: 700, fontSize: '13px',
                          textDecoration: 'none',
                        }}
                      >
                        <MessageSquare size={14} /> Chat Customer (WhatsApp)
                      </a>
                    )}
                    <a
                      href={`${API_URL.replace(/\/api$/, '')}/track/${selectedOrderDetail.order_id}`}
                      target="_blank" rel="noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        background: '#2563eb', color: '#fff', padding: '8px 14px',
                        borderRadius: '10px', fontWeight: 700, fontSize: '13px',
                        textDecoration: 'none',
                      }}
                    >
                      <ExternalLink size={14} /> Open Live Tracking Page
                    </a>
                  </div>

                  {/* ── Customer & Location Grid ── */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>

                    {/* Customer Details */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                      <h4 style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={14} color="#2563eb" /> Customer Details
                      </h4>
                      <div style={{ fontSize: '13.5px', lineHeight: '1.75', color: '#334155' }}>
                        <div><strong>Name:</strong> {selectedOrderDetail.customer_name || 'Guest'}</div>
                        <div><strong>Phone:</strong> {selectedOrderDetail.customer_number || selectedOrderDetail.customer_phone || 'N/A'}</div>
                        {selectedOrderDetail.address_text && (
                          <div style={{ marginTop: '4px' }}><strong>Address:</strong> {selectedOrderDetail.address_text}</div>
                        )}
                      </div>
                    </div>

                    {/* Location & Delivery */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                      <h4 style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={14} color="#2563eb" /> Location &amp; Delivery
                      </h4>
                      <div style={{ fontSize: '13.5px', lineHeight: '1.75', color: '#334155' }}>
                        {selectedOrderDetail.engine_type === 'RIDE' ? (
                          <>
                            <div><strong>Vehicle:</strong> {selectedOrderDetail.vehicle_type || 'BIKE'}</div>
                            {selectedOrderDetail.pickup_lat && <div><strong>Pickup:</strong> <a href={`https://maps.google.com/?q=${selectedOrderDetail.pickup_lat},${selectedOrderDetail.pickup_lng}`} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>Google Maps</a></div>}
                            {selectedOrderDetail.drop_lat && <div><strong>Drop:</strong> <a href={`https://maps.google.com/?q=${selectedOrderDetail.drop_lat},${selectedOrderDetail.drop_lng}`} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>Google Maps</a></div>}
                          </>
                        ) : (() => {
                          let pData = selectedOrderDetail.parsed_payload;
                          if (!pData && selectedOrderDetail.payload) { try { pData = typeof selectedOrderDetail.payload === 'string' ? JSON.parse(selectedOrderDetail.payload) : selectedOrderDetail.payload; } catch(e){} }
                          pData = pData || {};
                          const pLoc = pData.pickup_location || pData.work_location || pData.location;
                          const dLoc = pData.drop_location;
                          return (
                            <>
                              {pLoc && <div><strong>Pickup / Work Site:</strong> {pLoc}</div>}
                              {dLoc && <div><strong>Drop-off:</strong> {dLoc}</div>}
                              {!pLoc && !dLoc && <div><strong>Address:</strong> {selectedOrderDetail.address_text || 'Shared via WhatsApp GPS'}</div>}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* ── Items & Description ── */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b' }}>
                      Items &amp; Task Description
                    </h4>
                    <div style={{ fontSize: '13.5px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#334155' }}>
                      {(() => {
                        let pData = selectedOrderDetail.parsed_payload;
                        if (!pData && selectedOrderDetail.payload) { try { pData = typeof selectedOrderDetail.payload === 'string' ? JSON.parse(selectedOrderDetail.payload) : selectedOrderDetail.payload; } catch(e){} }
                        pData = pData || {};
                        const itemsFromPayload = Array.isArray(pData.items) ? pData.items.join('\n') : pData.items;
                        return selectedOrderDetail.items_text || itemsFromPayload || pData.task_description || 'No items description provided.';
                      })()}
                    </div>
                    {(selectedOrderDetail.item_media_ids || selectedOrderDetail.bill_media_id) && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Media &amp; Bill Photos</div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {selectedOrderDetail.item_media_ids && selectedOrderDetail.item_media_ids.split(',').map((mId, idx) => (
                            <a key={idx} href={`${API_URL.replace(/\/api$/, '')}/api/media/${mId}`} target="_blank" rel="noreferrer">
                              <img src={`${API_URL.replace(/\/api$/, '')}/api/media/${mId}`} alt={`Item ${idx+1}`} style={{ width: '72px', height: '72px', borderRadius: '8px', objectFit: 'cover', border: '2px solid #e2e8f0' }} />
                            </a>
                          ))}
                          {selectedOrderDetail.bill_media_id && (
                            <a href={`${API_URL.replace(/\/api$/, '')}/api/media/${selectedOrderDetail.bill_media_id}`} target="_blank" rel="noreferrer">
                              <img src={`${API_URL.replace(/\/api$/, '')}/api/media/${selectedOrderDetail.bill_media_id}`} alt="Bill" style={{ width: '72px', height: '72px', borderRadius: '8px', objectFit: 'cover', border: '2px solid #10b981' }} />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Keypad / Home Service Assisted Operations Panel ── */}
                  {((selectedOrderDetail.helper_device_type === 'KEYPAD') || (selectedOrderDetail.service || '').toLowerCase().includes('home') || (selectedOrderDetail.order_id || '').startsWith('N2D_HS_')) && (() => {
                    let pData = selectedOrderDetail.parsed_payload;
                    if (!pData && selectedOrderDetail.payload) {
                      try { pData = typeof selectedOrderDetail.payload === 'string' ? JSON.parse(selectedOrderDetail.payload) : selectedOrderDetail.payload; } catch(e){}
                    }
                    pData = pData || {};

                    const isKeypadHelper = selectedOrderDetail.helper_device_type === 'KEYPAD';
                    const startOtpVal = pData.start_otp || selectedOrderDetail.start_otp;
                    const endOtpVal = pData.end_otp || selectedOrderDetail.end_otp;
                    const currentStatus = selectedOrderDetail.status;
                    const isSettled = selectedOrderDetail.payout_settled === 1;

                    return (
                      <div style={{
                        background: isKeypadHelper ? '#fffbeb' : '#f8fafc',
                        border: `1.5px solid ${isKeypadHelper ? '#fde68a' : '#e2e8f0'}`,
                        borderRadius: '14px',
                        padding: '18px 20px',
                      }}>
                        {/* Section Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '18px' }}>{isKeypadHelper ? '📞' : '🏠'}</span>
                            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: isKeypadHelper ? '#92400e' : '#1e3a8a' }}>
                              {isKeypadHelper ? 'Keypad Phone Assisted Operations' : 'Home Service Operations Panel'}
                            </h4>
                          </div>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '20px',
                            background: isKeypadHelper ? '#fef3c7' : '#e0e7ff',
                            color: isKeypadHelper ? '#b45309' : '#3730a3',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}>
                            {isKeypadHelper ? <><PhoneCall size={12} /> Keypad / Old Phone Mode</> : <><Smartphone size={12} /> Smartphone Mode</>}
                          </span>
                        </div>

                        {/* Workflow Stepper */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                          gap: '8px',
                          marginBottom: '16px',
                        }}>
                          {/* Step 1: Assign */}
                          <div style={{
                            padding: '10px',
                            borderRadius: '8px',
                            background: selectedOrderDetail.helper_id ? '#ecfdf5' : '#f1f5f9',
                            border: `1px solid ${selectedOrderDetail.helper_id ? '#a7f3d0' : '#cbd5e1'}`,
                            fontSize: '11.5px',
                          }}>
                            <div style={{ fontWeight: 800, color: selectedOrderDetail.helper_id ? '#065f46' : '#475569' }}>
                              {selectedOrderDetail.helper_id ? '✓ 1. Assigned' : '1. Assignment'}
                            </div>
                            <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                              {selectedOrderDetail.helper_name ? selectedOrderDetail.helper_name.slice(0, 15) : 'Pending'}
                            </div>
                          </div>

                          {/* Step 2: Arrived */}
                          <div style={{
                            padding: '10px',
                            borderRadius: '8px',
                            background: ['ARRIVED', 'SERVICE_STARTED', 'END_OTP_REQUESTED', 'COMPLETED', 'PAID'].includes(currentStatus) ? '#ecfdf5' : currentStatus === 'HELPER_ASSIGNED' ? '#fef3c7' : '#f1f5f9',
                            border: `1px solid ${['ARRIVED', 'SERVICE_STARTED', 'END_OTP_REQUESTED', 'COMPLETED', 'PAID'].includes(currentStatus) ? '#a7f3d0' : currentStatus === 'HELPER_ASSIGNED' ? '#fde68a' : '#cbd5e1'}`,
                            fontSize: '11.5px',
                          }}>
                            <div style={{ fontWeight: 800, color: ['ARRIVED', 'SERVICE_STARTED', 'END_OTP_REQUESTED', 'COMPLETED', 'PAID'].includes(currentStatus) ? '#065f46' : currentStatus === 'HELPER_ASSIGNED' ? '#b45309' : '#475569' }}>
                              {['ARRIVED', 'SERVICE_STARTED', 'END_OTP_REQUESTED', 'COMPLETED', 'PAID'].includes(currentStatus) ? '✓ 2. Arrived' : '2. Arrival'}
                            </div>
                            <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                              {['ARRIVED', 'SERVICE_STARTED', 'END_OTP_REQUESTED', 'COMPLETED', 'PAID'].includes(currentStatus) ? 'At Location' : currentStatus === 'HELPER_ASSIGNED' ? 'On The Way' : 'Pending'}
                            </div>
                          </div>

                          {/* Step 3: Start OTP */}
                          <div style={{
                            padding: '10px',
                            borderRadius: '8px',
                            background: ['SERVICE_STARTED', 'END_OTP_REQUESTED', 'COMPLETED', 'PAID'].includes(currentStatus) ? '#ecfdf5' : currentStatus === 'ARRIVED' ? '#eff6ff' : '#f1f5f9',
                            border: `1px solid ${['SERVICE_STARTED', 'END_OTP_REQUESTED', 'COMPLETED', 'PAID'].includes(currentStatus) ? '#a7f3d0' : currentStatus === 'ARRIVED' ? '#bfdbfe' : '#cbd5e1'}`,
                            fontSize: '11.5px',
                          }}>
                            <div style={{ fontWeight: 800, color: ['SERVICE_STARTED', 'END_OTP_REQUESTED', 'COMPLETED', 'PAID'].includes(currentStatus) ? '#065f46' : currentStatus === 'ARRIVED' ? '#1d4ed8' : '#475569' }}>
                              {['SERVICE_STARTED', 'END_OTP_REQUESTED', 'COMPLETED', 'PAID'].includes(currentStatus) ? '✓ 3. Started' : '3. Start OTP'}
                            </div>
                            <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                              {startOtpVal ? `OTP: ${startOtpVal}` : 'Not Generated'}
                            </div>
                          </div>

                          {/* Step 4: End OTP */}
                          <div style={{
                            padding: '10px',
                            borderRadius: '8px',
                            background: ['COMPLETED', 'PAID'].includes(currentStatus) ? '#ecfdf5' : currentStatus === 'END_OTP_REQUESTED' ? '#fef3c7' : '#f1f5f9',
                            border: `1px solid ${['COMPLETED', 'PAID'].includes(currentStatus) ? '#a7f3d0' : currentStatus === 'END_OTP_REQUESTED' ? '#fde68a' : '#cbd5e1'}`,
                            fontSize: '11.5px',
                          }}>
                            <div style={{ fontWeight: 800, color: ['COMPLETED', 'PAID'].includes(currentStatus) ? '#065f46' : currentStatus === 'END_OTP_REQUESTED' ? '#b45309' : '#475569' }}>
                              {['COMPLETED', 'PAID'].includes(currentStatus) ? '✓ 4. Finished' : '4. End OTP'}
                            </div>
                            <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                              {endOtpVal ? `OTP: ${endOtpVal}` : currentStatus === 'SERVICE_STARTED' ? 'In Progress' : 'Pending'}
                            </div>
                          </div>

                          {/* Step 5: Cash Payout */}
                          <div style={{
                            padding: '10px',
                            borderRadius: '8px',
                            background: isSettled ? '#ecfdf5' : (currentStatus === 'COMPLETED' ? '#fef3c7' : '#f1f5f9'),
                            border: `1px solid ${isSettled ? '#a7f3d0' : (currentStatus === 'COMPLETED' ? '#fde68a' : '#cbd5e1')}`,
                            fontSize: '11.5px',
                          }}>
                            <div style={{ fontWeight: 800, color: isSettled ? '#065f46' : (currentStatus === 'COMPLETED' ? '#b45309' : '#475569') }}>
                              {isSettled ? '✓ 5. Settled' : '5. Cash Payout'}
                            </div>
                            <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                              {isSettled ? 'Handed Over' : 'Offline Cash'}
                            </div>
                          </div>
                        </div>

                        {/* Interactive Step Actions */}
                        <div style={{
                          background: '#fff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '14px 16px',
                        }}>
                          {/* UNASSIGNED */}
                          {(!selectedOrderDetail.helper_id || currentStatus === 'CONFIRMED') && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Step 1: Assign Helper</div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>Select a Keypad Phone helper or Smartphone helper.</div>
                              </div>
                              <button
                                className="btn btn-primary"
                                style={{ fontSize: '12.5px', padding: '6px 14px' }}
                                onClick={() => {
                                  setAssignTargetOrder(selectedOrderDetail);
                                  setSelectedAssignHelperId('');
                                  setShowAssignModal(true);
                                }}
                              >
                                👤 Assign Helper
                              </button>
                            </div>
                          )}

                          {/* HELPER_ASSIGNED */}
                          {currentStatus === 'HELPER_ASSIGNED' && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Step 2: Helper Arrival at Location</div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>
                                  Helper will call when reaching customer's house. Click below to notify customer on WhatsApp & dispatch Start OTP.
                                </div>
                              </div>
                              <button
                                className="btn"
                                style={{ fontSize: '12.5px', background: '#f59e0b', color: '#fff', border: 'none', fontWeight: 700, padding: '7px 16px' }}
                                onClick={() => handleAssistedArrived(selectedOrderDetail.id)}
                              >
                                📍 Mark Helper Arrived
                              </button>
                            </div>
                          )}

                          {/* ARRIVED */}
                          {currentStatus === 'ARRIVED' && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                                  Step 3: Verify Start OTP & Start Service
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                  Customer sends OTP directly on WhatsApp (auto-verified), or read it to admin.
                                  {startOtpVal && (
                                    <span style={{ marginLeft: '6px', fontWeight: 700, color: '#2563eb' }}>
                                      Active Start OTP: <strong>{startOtpVal}</strong>
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                className="btn"
                                style={{ fontSize: '12.5px', background: '#3b82f6', color: '#fff', border: 'none', fontWeight: 700, padding: '7px 16px' }}
                                onClick={() => handleAssistedVerifyStartOtp(selectedOrderDetail.id, startOtpVal)}
                              >
                                🔐 Verify Start OTP ({startOtpVal || 'Enter'})
                              </button>
                            </div>
                          )}

                          {/* SERVICE_STARTED */}
                          {currentStatus === 'SERVICE_STARTED' && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                                  Step 4: Service In Progress
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                  Scheduled duration running. When helper finishes, click to send End OTP to customer WhatsApp.
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button
                                  className="btn"
                                  style={{ fontSize: '12.5px', background: '#10b981', color: '#fff', border: 'none', fontWeight: 700, padding: '7px 14px' }}
                                  onClick={() => handleAssistedRequestEndOtp(selectedOrderDetail.id)}
                                >
                                  🏁 Request End OTP
                                </button>
                                {endOtpVal && (
                                  <button
                                    className="btn btn-primary"
                                    style={{ fontSize: '12.5px', padding: '7px 14px' }}
                                    onClick={() => handleAssistedVerifyEndOtp(selectedOrderDetail.id, endOtpVal)}
                                  >
                                    Verify End OTP ({endOtpVal})
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {/* END_OTP_REQUESTED */}
                          {currentStatus === 'END_OTP_REQUESTED' && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                                  Step 4: Awaiting End OTP from Customer
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                  Customer can reply with End OTP on WhatsApp.
                                  {endOtpVal && (
                                    <span style={{ marginLeft: '6px', fontWeight: 700, color: '#059669' }}>
                                      Dispatched End OTP: <strong>{endOtpVal}</strong>
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                className="btn"
                                style={{ fontSize: '12.5px', background: '#10b981', color: '#fff', border: 'none', fontWeight: 700, padding: '7px 16px' }}
                                onClick={() => handleAssistedVerifyEndOtp(selectedOrderDetail.id, endOtpVal)}
                              >
                                🏁 Verify End OTP ({endOtpVal || 'Enter'})
                              </button>
                            </div>
                          )}

                          {/* COMPLETED */}
                          {(currentStatus === 'COMPLETED' || currentStatus === 'PAID') && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                                  Step 5: Physical Cash Payout
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                  {isSettled
                                    ? '✅ Helper has been physically paid in cash. Payout settlement completed.'
                                    : 'Aged helper payout is pending physical cash settlement.'}
                                </div>
                              </div>
                              {isSettled ? (
                                <span style={{ fontSize: '12.5px', color: '#16a34a', fontWeight: 800, padding: '5px 12px', background: '#dcfce7', borderRadius: '6px' }}>
                                  ✓ Cash Paid & Settled
                                </span>
                              ) : (
                                <button
                                  className="btn"
                                  style={{ fontSize: '12.5px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontWeight: 700, padding: '7px 16px' }}
                                  onClick={() => handleAssistedSettleCash(selectedOrderDetail.id)}
                                >
                                  💵 Confirm Cash Paid to Helper
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── Assignment & Financial ── */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>

                    {/* Assignment */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                      <h4 style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={14} color="#2563eb" /> Assignment Info
                      </h4>
                      <div style={{ fontSize: '13.5px', lineHeight: '1.75', color: '#334155' }}>
                        <div><strong>Helper:</strong> {selectedOrderDetail.helper_name ? `${selectedOrderDetail.helper_name} (${selectedOrderDetail.helper_phone})` : <span style={{ color: '#94a3b8' }}>Unassigned</span>}</div>
                        {selectedOrderDetail.helper_name && (
                          <div>
                            <strong>Helper Device:</strong>{' '}
                            {selectedOrderDetail.helper_device_type === 'KEYPAD' ? (
                              <span style={{ color: '#b45309', fontWeight: 700, background: '#fef3c7', padding: '1px 6px', borderRadius: '4px', fontSize: '12px' }}>
                                📞 Keypad / Old Phone
                              </span>
                            ) : (
                              <span style={{ color: '#1d4ed8', fontWeight: 700, background: '#eff6ff', padding: '1px 6px', borderRadius: '4px', fontSize: '12px' }}>
                                📱 Smartphone
                              </span>
                            )}
                          </div>
                        )}
                        <div><strong>Vendor:</strong> {selectedOrderDetail.vendor_name ? `${selectedOrderDetail.vendor_name} (${selectedOrderDetail.vendor_phone})` : <span style={{ color: '#94a3b8' }}>None</span>}</div>
                        {selectedOrderDetail.otp && (
                          <div style={{ marginTop: '6px' }}>
                            <strong>Delivery OTP:</strong>{' '}
                            <span style={{ background: '#059669', padding: '2px 10px', borderRadius: '6px', color: '#fff', fontWeight: 800, fontSize: '14px', letterSpacing: '0.1em' }}>
                              {selectedOrderDetail.otp}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Financial */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                      <h4 style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CreditCard size={14} color="#2563eb" /> Financial Breakdown
                      </h4>
                      <div style={{ fontSize: '13.5px', lineHeight: '1.75', color: '#334155' }}>
                        {(() => {
                          let pData = selectedOrderDetail.parsed_payload;
                          if (!pData && selectedOrderDetail.payload) { try { pData = typeof selectedOrderDetail.payload === 'string' ? JSON.parse(selectedOrderDetail.payload) : selectedOrderDetail.payload; } catch(e){} }
                          pData = pData || {};
                          const val = selectedOrderDetail.total_amount || selectedOrderDetail.bill_amount || pData.cost || pData.estimated_cost || pData.quoted_fee || 0;
                          return (
                            <div>
                              <strong>Quoted / Total Fee:</strong>{' '}
                              <span style={{ fontSize: '20px', fontWeight: 800, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>₹{val}</span>
                            </div>
                          );
                        })()}
                        <div>
                          <strong>Payment Status:</strong>{' '}
                          {selectedOrderDetail.status === 'COMPLETED' || selectedOrderDetail.status === 'PAID'
                            ? <span style={{ color: '#059669', fontWeight: 700 }}>PAID ✓</span>
                            : <span style={{ color: '#d97706', fontWeight: 700 }}>PENDING</span>
                          }
                        </div>
                        {selectedOrderDetail.payout_method && (
                          <div style={{ marginTop: '4px' }}>
                            <strong>Helper Payout:</strong>{' '}
                            <span style={{ fontWeight: 700, color: selectedOrderDetail.payout_settled ? '#059669' : '#d97706' }}>
                              {selectedOrderDetail.payout_method === 'PHYSICAL_CASH' ? '💵 Physical Cash' : selectedOrderDetail.payout_method}
                              {' '}({selectedOrderDetail.payout_settled ? 'Settled ✓' : 'Pending Settlement'})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Timeline ── */}
                  {selectedOrderDetail.timeline && selectedOrderDetail.timeline.length > 0 && (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                      <h4 style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} color="#2563eb" /> Order Activity Timeline
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {selectedOrderDetail.timeline.map((t, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', background: '#fff', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '8px', color: '#334155' }}>
                            <span><strong style={{ color: '#0f172a' }}>{t.event_type}:</strong> {t.event_text}</span>
                            <span style={{ color: '#94a3b8', fontSize: '11px', whiteSpace: 'nowrap', marginLeft: '12px' }}>{formatTimeIST(t.created_at)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Footer ── */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
                    <button className="btn btn-outline" onClick={() => setSelectedOrderDetail(null)}>Close</button>
                  </div>

                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
