import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, CartesianGrid
} from 'recharts';
import { API_URL } from '../config';


const COLORS = ['#3b82f6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];

export default function Analysis() {
  const [data, setData] = useState({ statusDistribution: [], dailyVolume: [], engineDistribution: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/analytics/orders`;
      if (fromDate || toDate) {
         url += `?from=${fromDate}&to=${toDate}`;
      }
      const res = await fetch(url);
      const result = await res.json();
      if (result.success) {
        
        // Format dates for the bar chart
        const formattedVolume = result.dailyVolume.map(d => ({
            ...d,
            shortDate: new Date(d.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})
        }));

        setData({
            ...result,
            dailyVolume: formattedVolume
        });
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Cannot connect to backend.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading && data.dailyVolume.length === 0) return <div className="card"><p>Loading analytics...</p></div>;
  if (error) return <div className="card" style={{borderLeft: '4px solid var(--danger)'}}><p style={{color: 'var(--danger)'}}>{error}</p></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h3>Platform Analytics</h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>From:</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="input" style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
          <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>To:</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="input" style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
          <button className="btn btn-primary" onClick={fetchAnalytics} style={{ marginLeft: '0.5rem' }}>🔄 Filter & Refresh</button>
        </div>
      </div>

      <div className="card">
        <h3>Orders Volume {fromDate || toDate ? '(Filtered)' : 'Last 7 Days'}</h3>
        <div style={{ width: '100%', height: 300, marginTop: '1rem' }}>
          <ResponsiveContainer>
            <BarChart data={data.dailyVolume} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="shortDate" />
              <YAxis />
              <Tooltip cursor={{fill: 'rgba(59, 130, 246, 0.1)'}} />
              <Bar dataKey="orders" name="Total Orders" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="card" style={{ flex: '1 1 45%', minWidth: '300px' }}>
          <h3>Order Status Distribution</h3>
          <div style={{ width: '100%', height: 250, marginTop: '1rem' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data.statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="status"
                >
                  {data.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ flex: '1 1 45%', minWidth: '300px' }}>
          <h3>Service Usage (Task vs Ride)</h3>
          <div style={{ width: '100%', height: 250, marginTop: '1rem' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data.engineDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="count"
                  nameKey="engine_type"
                >
                  {data.engineDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--primary)' : 'var(--secondary)'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
