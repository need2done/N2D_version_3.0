import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Users, Download, FileText, Calendar, RotateCcw, Filter, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { API_URL } from '../config';


const StatCard = ({ title, value, subtitle, Icon, color, bgColor }) => (
  <div className="stat-card">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{title}</p>
        <h2 style={{ margin: '0.4rem 0', fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)' }}>{value}</h2>
        {subtitle && <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.75rem' }}>{subtitle}</p>}
      </div>
      <div className="stat-card-badge" style={{ backgroundColor: bgColor || 'rgba(59, 130, 246, 0.1)', color: color || 'var(--primary)' }}>
        <Icon size={24} />
      </div>
    </div>
  </div>
);

export default function Earnings() {
  const [data, setData] = useState({ summary: {}, recent: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [activePreset, setActivePreset] = useState('ALL');

  // Medicine Transactions Tab State
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' or 'MEDICINE'
  const [medicineData, setMedicineData] = useState({ summary: {}, transactions: [] });
  const [loadingMedicine, setLoadingMedicine] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);
  const [verifySuccessMsg, setVerifySuccessMsg] = useState(null);

  const fetchEarnings = async (fDate = fromDate, tDate = toDate) => {
    setLoading(true);
    try {
      let url = `${API_URL}/analytics/earnings`;
      const query = [];
      if (fDate) query.push(`from=${fDate}`);
      if (tDate) query.push(`to=${tDate}`);
      if (query.length) url += `?${query.join('&')}`;

      const res = await fetch(url);
      const result = await res.json();
      if (result.success) {
        setData(result);
      }
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Cannot connect to backend.');
      setLoading(false);
    }
  };

  const fetchMedicineTransactions = async () => {
    setLoadingMedicine(true);
    try {
      const res = await fetch(`${API_URL}/analytics/medicine-transactions`);
      const result = await res.json();
      if (result.success) {
        setMedicineData(result);
      }
      setLoadingMedicine(false);
    } catch (err) {
      console.error('Failed to fetch medicine transactions:', err);
      setLoadingMedicine(false);
    }
  };

  const handleVerifyMedicinePayment = async (orderId) => {
    setVerifyingId(orderId);
    try {
      const res = await fetch(`${API_URL}/analytics/verify-medicine-payment/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await res.json();
      if (result.success) {
        setVerifySuccessMsg(`Order #${orderId} payment verified in Kotak Bank!`);
        setTimeout(() => setVerifySuccessMsg(null), 4000);
        // Refresh medicine transactions
        fetchMedicineTransactions();
        fetchEarnings();
      } else {
        alert(result.error || 'Failed to verify payment');
      }
    } catch (err) {
      console.error('Error verifying payment:', err);
      alert('Network error while verifying payment');
    } finally {
      setVerifyingId(null);
    }
  };

  useEffect(() => {
    fetchEarnings();
    fetchMedicineTransactions();
  }, []);

  // Time Range Presets
  const applyPreset = (presetType) => {
    setActivePreset(presetType);
    const now = new Date();
    let fDate = '';
    let tDate = '';

    const formatDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    if (presetType === 'TODAY') {
      fDate = formatDateStr(now);
      tDate = formatDateStr(now);
    } else if (presetType === 'MONTH') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      fDate = formatDateStr(startOfMonth);
      tDate = formatDateStr(now);
    } else if (presetType === 'SIX_MONTHS') {
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      fDate = formatDateStr(sixMonthsAgo);
      tDate = formatDateStr(now);
    } else if (presetType === 'ALL') {
      fDate = '';
      tDate = '';
    }

    setFromDate(fDate);
    setToDate(tDate);
    fetchEarnings(fDate, tDate);
  };

  const handleCustomFilter = () => {
    setActivePreset('CUSTOM');
    fetchEarnings(fromDate, toDate);
  };

  const handleReset = () => {
    setActivePreset('ALL');
    setFromDate('');
    setToDate('');
    fetchEarnings('', '');
  };

  // Export handlers
  const handleExportExcel = () => {
    const headers = ['Order ID', 'Engine / Service', 'Service Name', 'Total Bill (₹)', 'Platform Fee (₹)', 'Helper Charge (₹)', 'Agent / Helper', 'Payment Method', 'Payment Status', 'Date & Time'];
    const rows = (data.recent || []).map(trx => [
      trx.order_id,
      trx.engine_type,
      trx.service,
      trx.total_amount || 0,
      trx.platform_fee || 0,
      trx.helper_charge || 0,
      trx.helper_name || 'Unassigned',
      trx.payment_method || 'TBD',
      trx.payment_status || 'PENDING',
      new Date(trx.completed_at || trx.updated_at).toLocaleString()
    ]);

    const summaryRow = [
      'SUMMARY TOTALS',
      '-',
      '-',
      data.summary.total_revenue || 0,
      data.summary.platform_profit || 0,
      data.summary.helper_payouts || 0,
      '-',
      '-',
      '-',
      `Exported ${rows.length} records`
    ];

    const periodText = fromDate && toDate ? `${fromDate}_to_${toDate}` : activePreset;
    exportToExcel(`Need2Done_Earnings_Report_${periodText}`, headers, rows, summaryRow);
  };

  const handleExportPDF = () => {
    const reportTitle = 'Payments & Earnings Report';
    const dateRangeText = fromDate || toDate ? `${fromDate || 'Start'} to ${toDate || 'Present'}` : `Preset: ${activePreset}`;
    
    const summaryStats = [
      { title: 'Total Platform Revenue', value: `₹${data.summary.total_revenue || 0}`, subtitle: 'All completed orders' },
      { title: 'Platform Profit Cut', value: `₹${data.summary.platform_profit || 0}`, subtitle: 'Total fees earned' },
      { title: 'Helper Payouts', value: `₹${data.summary.helper_payouts || 0}`, subtitle: 'Paid to helpers' }
    ];

    const headers = ['Order ID', 'Engine / Service', 'Total Bill', 'Platform Fee', 'Helper Charge', 'Agent Name', 'Method', 'Status', 'Time'];
    const rows = (data.recent || []).map(trx => [
      trx.order_id,
      `${trx.engine_type} (${trx.service})`,
      `₹${trx.total_amount}`,
      `+ ₹${trx.platform_fee || 0}`,
      `₹${trx.helper_charge || 0}`,
      trx.helper_name || 'Unassigned',
      trx.payment_method || 'TBD',
      trx.payment_status || 'PENDING',
      new Date(trx.completed_at || trx.updated_at).toLocaleString()
    ]);

    exportToPDF(reportTitle, dateRangeText, summaryStats, headers, rows);
  };

  if (loading && !data.recent.length) return <div className="card"><p>Loading financial data...</p></div>;

  const { summary, recent } = data;

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
          <h3><DollarSign size={26} color="var(--primary)" /> Payments & Earnings</h3>
          <p>Real-time platform revenue breakdown, payouts, and financial transactions.</p>
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

      {/* Date Filter Bar */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Calendar size={16} color="var(--text-muted)" />
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>From:</span>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="input" style={{ padding: '0.4rem 0.6rem' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>To:</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="input" style={{ padding: '0.4rem 0.6rem' }} />
          </div>
          <button className="btn btn-primary" onClick={handleCustomFilter} style={{ padding: '0.45rem 1rem' }}>
            <Filter size={15} /> Apply Range
          </button>
        </div>

        {(fromDate || toDate || activePreset !== 'ALL') && (
          <button className="btn btn-outline" onClick={handleReset} style={{ padding: '0.45rem 1rem' }}>
            <RotateCcw size={15} /> Reset Filters
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="stat-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <StatCard 
          title="Total Platform Revenue" 
          value={`₹${parseFloat(summary.total_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} 
          subtitle="All completed transactions"
          Icon={DollarSign} 
          color="#10B981"
          bgColor="rgba(16, 185, 129, 0.12)"
        />
        <StatCard 
          title="Platform Profit Cut" 
          value={`₹${parseFloat(summary.platform_profit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} 
          subtitle="Total system commissions earned"
          Icon={TrendingUp} 
          color="#3B82F6"
          bgColor="rgba(59, 130, 246, 0.12)"
        />
        <StatCard 
          title="Helper Payouts" 
          value={`₹${parseFloat(summary.helper_payouts || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} 
          subtitle="Total disbursed to registered helpers"
          Icon={Users} 
          color="#F59E0B"
          bgColor="rgba(245, 158, 11, 0.12)"
        />
      </div>

      {/* Earnings & Pricing Configuration Banner */}
      <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={20} className="text-primary" /> Service Pricing & Helper Earnings Configuration
            </h3>
            <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Configure helper payouts, platform fee splits, and custom rates for Home Services, Rides & Tasks
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <a href="/admin/home-services" className="btn btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#3b82f6', color: '#fff', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600 }}>
              🏠 Manage Home Services
            </a>
            <a href="/admin/settings" className="btn btn-secondary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '8px' }}>
              ⚙️ Pricing Settings
            </a>
          </div>
        </div>
      </div>

      {verifySuccessMsg && (
        <div className="card" style={{ borderLeft: '4px solid #10b981', marginBottom: '1.5rem', background: 'rgba(16, 185, 129, 0.08)' }}>
          <p style={{ color: '#10b981', margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={18} /> {verifySuccessMsg}
          </p>
        </div>
      )}

      {/* Tabs Switcher: All Transactions vs Medicine Kotak UPI */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        <button 
          onClick={() => setActiveTab('ALL')}
          style={{
            padding: '8px 18px',
            borderRadius: '10px',
            border: activeTab === 'ALL' ? '1px solid var(--primary)' : '1px solid transparent',
            background: activeTab === 'ALL' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
            color: activeTab === 'ALL' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.92rem'
          }}
        >
          📊 All Transactions ({recent.length})
        </button>
        <button 
          onClick={() => { setActiveTab('MEDICINE'); fetchMedicineTransactions(); }}
          style={{
            padding: '8px 18px',
            borderRadius: '10px',
            border: activeTab === 'MEDICINE' ? '1px solid #10b981' : '1px solid transparent',
            background: activeTab === 'MEDICINE' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
            color: activeTab === 'MEDICINE' ? '#10b981' : 'var(--text-muted)',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.92rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          💊 Medicine Direct UPI (Kotak)
          {medicineData.summary.pending_verification > 0 && (
            <span style={{ background: '#f59e0b', color: '#000', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800 }}>
              {medicineData.summary.pending_verification} Pending Check
            </span>
          )}
        </button>
      </div>

      {/* MEDICINE TAB CONTENT */}
      {activeTab === 'MEDICINE' && (
        <div>
          {/* Kotak Bank UPI Info Banner */}
          <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={22} color="#10b981" /> Medicine Direct UPI Account: 9885131080@kotakbank
                </h3>
                <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                  Customers pay directly into the owner's Kotak Bank account via dynamic UPI buttons. Razorpay is completely bypassed for medicine orders. Verify incoming credits in your Kotak Bank app/SMS and click <strong>"Confirm in Bank"</strong> below.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Medicine Volume</span>
                  <h3 style={{ margin: 0, color: '#10b981', fontSize: '1.4rem' }}>₹{parseFloat(medicineData.summary.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                </div>
              </div>
            </div>
          </div>

          {/* Medicine Transactions Table */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>💊 Medicine Orders & Bank Credit Status</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="badge task">{medicineData.transactions.length} Total Orders</span>
                {medicineData.summary.pending_verification > 0 && (
                  <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                    ⚠️ {medicineData.summary.pending_verification} Need Bank Verification
                  </span>
                )}
              </div>
            </div>

            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Medicine Bill</th>
                    <th>Delivery Fee</th>
                    <th>Total to Kotak UPI</th>
                    <th>Helper Name</th>
                    <th>Order Status</th>
                    <th>Bank Credit Verification</th>
                    <th>Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {medicineData.transactions.length === 0 && (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                        No medicine orders recorded yet.
                      </td>
                    </tr>
                  )}
                  {medicineData.transactions.map((trx) => (
                    <tr key={trx.order_id || trx.id}>
                      <td><strong>#{trx.order_id}</strong></td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{trx.customer_name || 'Customer'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{trx.customer_number || '-'}</div>
                      </td>
                      <td>₹{trx.bill_amount || 0}</td>
                      <td>₹{trx.helper_charge || 0}</td>
                      <td style={{ fontWeight: 700, color: '#10b981', fontSize: '0.98rem' }}>₹{trx.total_amount}</td>
                      <td><strong>{trx.helper_name || 'Unassigned'}</strong></td>
                      <td>
                        <span className={`badge ${trx.status === 'COMPLETED' ? 'active' : 'pending'}`}>
                          {trx.status}
                        </span>
                      </td>
                      <td>
                        {trx.verified_by_owner ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="badge active" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                              <CheckCircle size={13} /> Verified in Bank
                            </span>
                            {trx.owner_verified_at && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                {new Date(trx.owner_verified_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleVerifyMedicinePayment(trx.order_id)}
                            disabled={verifyingId === trx.order_id}
                            className="btn btn-primary"
                            style={{
                              padding: '5px 12px',
                              fontSize: '0.78rem',
                              background: '#10b981',
                              color: '#fff',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer'
                            }}
                            title="Click once you verify incoming credit in your Kotak Bank app"
                          >
                            <CheckCircle size={13} />
                            {verifyingId === trx.order_id ? 'Verifying...' : '✓ Confirm in Bank'}
                          </button>
                        )}
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {new Date(trx.created_at || trx.updated_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ALL TRANSACTIONS TAB CONTENT */}
      {activeTab === 'ALL' && (
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Recent Payouts & Transactions</h3>
          <span className="badge task">{recent.length} Records</span>
        </div>

        <div className="table-responsive">
          <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Engine / Service</th>
              <th>Total Bill</th>
              <th>Platform Fee</th>
              <th>Helper Charge</th>
              <th>Agent Name</th>
              <th>Method</th>
              <th>Payment Status</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 && (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No completed transactions found for the selected period.
                </td>
              </tr>
            )}
            {recent.map((trx, i) => (
              <tr key={trx.order_id || i}>
                <td><strong>#{trx.order_id}</strong></td>
                <td>
                  <span className={`badge ${trx.engine_type === 'RIDE' ? 'ride' : 'task'}`}>
                    {trx.engine_type}
                  </span>
                  <div style={{ fontSize: '0.75rem', marginTop: '2px', color: 'var(--text-muted)' }}>{trx.service}</div>
                </td>
                <td style={{ fontWeight: 600 }}>₹{trx.total_amount}</td>
                <td style={{ color: 'var(--secondary)', fontWeight: 600 }}>+ ₹{trx.platform_fee || 0}</td>
                <td>₹{trx.helper_charge || 0}</td>
                <td><strong>{trx.helper_name || 'Unassigned'}</strong></td>
                <td>
                  <span className="badge" style={{ background: 'var(--border)', color: 'var(--text-main)' }}>{trx.payment_method || 'TBD'}</span>
                </td>
                <td>
                  <span className={`badge ${trx.payment_status === 'PAID' ? 'active' : 'pending'}`}>
                    {trx.payment_status || 'PENDING'}
                  </span>
                </td>
                <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(trx.completed_at || trx.updated_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      )}
    </div>
  );
}
