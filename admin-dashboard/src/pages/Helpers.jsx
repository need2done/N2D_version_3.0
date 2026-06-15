import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Helpers() {
  const [helpers, setHelpers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedHelper, setSelectedHelper] = useState(null);

  const fetchHelpers = async () => {
    try {
      const res = await fetch(`${API_URL}/helpers`);
      const data = await res.json();
      if (data.success) {
        setHelpers(data.helpers);
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch helpers:', err);
      setError('Cannot connect to backend.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHelpers();
  }, []);

  const handleCategoryChange = async (helperId, newCategory) => {
    try {
      const res = await fetch(`${API_URL}/helpers/${helperId}/category`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newCategory })
      });
      const data = await res.json();
      if (data.success) {
        setHelpers(helpers.map(h => h.id === helperId ? { ...h, category: newCategory } : h));
      } else {
        alert(data.error || 'Failed to update category');
      }
    } catch (err) {
      alert('Failed to update category');
    }
  };

  if (loading) return <div className="card"><p>Loading helpers...</p></div>;
  if (error) return <div className="card" style={{borderLeft: '4px solid var(--danger)'}}><p style={{color: 'var(--danger)'}}>{error}</p></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3>Helper Management</h3>
        <button className="btn btn-primary" onClick={fetchHelpers}>🔄 Refresh</button>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Code</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Category</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {helpers.length === 0 && (
              <tr><td colSpan="7" style={{textAlign: 'center', padding: '2rem', color: 'var(--text-muted)'}}>No helpers registered yet.</td></tr>
            )}
            {helpers.map(helper => (
              <tr key={helper.id}>
                <td><strong>#{helper.id}</strong></td>
                <td><span className="badge task">{helper.helper_code}</span></td>
                <td>{helper.name}</td>
                <td>{helper.phone}</td>
                <td>
                  <select 
                    value={helper.category || 'BOTH'} 
                    onChange={(e) => handleCategoryChange(helper.id, e.target.value)}
                    className="btn"
                    style={{ background: 'var(--border)', color: 'var(--text-main)', fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}
                  >
                    <option value="TASK">TASK (Groceries/etc)</option>
                    <option value="RIDE">RIDE (Bike/Auto/Car)</option>
                    <option value="BOTH">BOTH (All Services)</option>
                  </select>
                </td>
                <td>
                  <span className={`badge ${helper.status === 'ONLINE' ? 'active' : ''}`}>
                    {helper.status}
                  </span>
                </td>
                <td>
                  <button 
                    className="btn" 
                    style={{ fontSize: '0.8rem', background: 'var(--border)' }}
                    onClick={() => setSelectedHelper(helper)}
                  >
                    View Profile
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedHelper && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="card" style={{minWidth: '350px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
               <h3 style={{margin: 0}}>Helper Profile</h3>
               <button className="btn" style={{padding: '0.2rem 0.5rem', background: 'var(--border)'}} onClick={() => setSelectedHelper(null)}>✕</button>
            </div>
            <p style={{marginBottom: '0.5rem'}}><strong>Code:</strong> {selectedHelper.helper_code}</p>
            <p style={{marginBottom: '0.5rem'}}><strong>Name:</strong> {selectedHelper.name}</p>
            <p style={{marginBottom: '0.5rem'}}><strong>Phone:</strong> {selectedHelper.phone}</p>
            <p style={{marginBottom: '0.5rem'}}><strong>Category:</strong> {selectedHelper.category}</p>
            <p style={{marginBottom: '0.5rem'}}><strong>Status:</strong> <span className={`badge ${selectedHelper.status === 'ONLINE' ? 'active' : ''}`}>{selectedHelper.status}</span></p>
          </div>
        </div>
      )}
    </div>
  );
}
