import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const StatCard = ({ title, value, subtitle, icon, color }) => (
  <div className="card" style={{ flex: 1, margin: '0 0.5rem 1rem 0.5rem', minWidth: '200px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600 }}>{title}</p>
        <h2 style={{ margin: '0.5rem 0', fontSize: '1.75rem' }}>{value}</h2>
        {subtitle && <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.75rem' }}>{subtitle}</p>}
      </div>
      <div style={{ fontSize: '2rem', color: color || 'var(--primary)', opacity: 0.8 }}>{icon}</div>
    </div>
  </div>
);

export default function Earnings() {
  const [data, setData] = useState({ summary: {}, recent: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/analytics/earnings`;
      if (fromDate || toDate) {
        url += `?from=${fromDate}&to=${toDate}`;
      }
      const res = await fetch(url);
      const result = await res.json();
      if (result.success) {
        setData(result);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Cannot connect to backend.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  if (loading && !data.recent.length) return <div className="card"><p>Loading financial data...</p></div>;
  if (error) return <div className="card" style={{borderLeft: '4px solid var(--danger)'}}><p style={{color: 'var(--danger)'}}>{error}</p></div>;

  const { summary, recent } = data;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h3>Payments & Earnings</h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>From:</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="input" style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
          <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>To:</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="input" style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
          <button className="btn btn-primary" onClick={fetchEarnings} style={{ marginLeft: '0.5rem' }}>🔄 Filter</button>
        </div>
      </div>


      <div style={{ display: 'flex', flexWrap: 'wrap', margin: '0 -0.5rem 1rem -0.5rem' }}>
        <StatCard 
          title="Total Platform Revenue" 
          value={`₹${summary.total_revenue || 0}`} 
          subtitle="All completed orders"
          icon="💰" 
          color="var(--primary)" 
        />
        <StatCard 
          title="Platform Profit Cut" 
          value={`₹${summary.platform_profit || 0}`} 
          subtitle="Total fees earned"
          icon="📈" 
          color="var(--secondary)" 
        />
        <StatCard 
          title="Helper Payouts" 
          value={`₹${summary.helper_payouts || 0}`} 
          subtitle="Paid to helpers"
          icon="👷" 
          color="var(--warning)" 
        />
      </div>

      <div className="card">
        <h3>Recent Payouts & Transactions</h3>
        <br/>
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
              <tr><td colSpan="7" style={{textAlign: 'center', padding: '2rem', color: 'var(--text-muted)'}}>No completed transactions found.</td></tr>
            )}
            {recent.map((trx, i) => (
              <tr key={i}>
                <td><strong>{trx.order_id}</strong></td>
                <td>
                    <span className={`badge ${trx.engine_type === 'RIDE' ? 'ride' : 'task'}`}>
                        {trx.engine_type}
                    </span>
                    <div style={{fontSize: '0.75rem', marginTop: '2px'}}>{trx.service}</div>
                </td>
                <td>₹{trx.total_amount}</td>
                <td style={{color: 'var(--secondary)'}}>+ ₹{trx.platform_fee || 0}</td>
                <td>₹{trx.helper_charge || 0}</td>
                <td><strong>{trx.helper_name || 'Unassigned'}</strong></td>
                <td>
                    <span className="badge" style={{background: 'var(--border)', color: 'var(--text-main)'}}>{trx.payment_method || 'TBD'}</span>
                </td>
                <td>
                    <span className={`badge ${trx.payment_status === 'PAID' ? 'ride' : 'pending'}`}>
                        {trx.payment_status || 'PENDING'}
                    </span>
                </td>
                <td>{new Date(trx.completed_at || trx.updated_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
