import { useState, useEffect } from 'react';
import { Users, Plus, RefreshCw, UserCheck, Search, X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function Helpers() {
  const [helpers, setHelpers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedHelper, setSelectedHelper] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newHelper, setNewHelper] = useState({ name: '', phone: '', helper_code: '', category: 'BOTH' });

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

  const handleAddHelper = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/helpers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newHelper)
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setNewHelper({ name: '', phone: '', helper_code: '', category: 'BOTH' });
        fetchHelpers();
      } else {
        alert(data.error || 'Failed to add helper');
      }
    } catch (err) {
      alert('Failed to connect to backend.');
    }
  };

  const filteredHelpers = helpers.filter(h =>
    (h.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (h.phone || '').includes(searchTerm) ||
    (h.helper_code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="card"><p>Loading registered helpers...</p></div>;

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
          <h3><Users size={26} color="var(--primary)" /> Helper Management</h3>
          <p>Register, categorize, and monitor agent availability across all delivery services.</p>
        </div>
        <div className="toolbar-controls">
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={18} /> Add Helper
          </button>
          <button className="btn btn-outline" onClick={fetchHelpers}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
            <input
              type="text"
              placeholder="Search by name, phone, code..."
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
          <span className="badge task">{filteredHelpers.length} Helpers Total</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Code</th>
              <th>Name</th>
              <th>WhatsApp Phone</th>
              <th>Category</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredHelpers.length === 0 && (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>No helpers registered yet.</td></tr>
            )}
            {filteredHelpers.map(helper => (
              <tr key={helper.id}>
                <td><strong>#{helper.id}</strong></td>
                <td><span className="badge task">{helper.helper_code}</span></td>
                <td><strong>{helper.name}</strong></td>
                <td>{helper.phone}</td>
                <td>
                  <select 
                    value={helper.category || 'BOTH'} 
                    onChange={(e) => handleCategoryChange(helper.id, e.target.value)}
                    style={{ background: 'var(--border)', color: 'var(--text-main)', fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: '4px' }}
                  >
                    <option value="TASK">TASK (Groceries/etc)</option>
                    <option value="RIDE">RIDE (Bike/Auto/Car)</option>
                    <option value="FOOD">FOOD (Food Service)</option>
                    <option value="VEG_FRUITS">VEG & FRUITS (Fruits/Veg)</option>
                    <option value="MEDICINES">MEDICINES (Pharmacy)</option>
                    <option value="ANYWORK">ANYWORK (Anywork)</option>
                    <option value="HOME_SERVICES">HOME SERVICES (Home Services)</option>
                    <option value="BOTH">BOTH (All Services)</option>
                  </select>
                </td>
                <td>
                  <span className={`badge ${helper.status === 'ONLINE' ? 'active' : 'pending'}`}>
                    {helper.status === 'ONLINE' ? 'ONLINE 🟢' : helper.status}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button 
                    className="btn btn-outline" 
                    style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                    onClick={() => setSelectedHelper(helper)}
                  >
                    <UserCheck size={14} /> Profile
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Helper Profile Modal */}
      {selectedHelper && (
        <div className="modal-overlay">
          <div className="modal-card animate-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
               <h3 style={{ margin: 0 }}>Helper Profile</h3>
               <button className="btn btn-outline" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setSelectedHelper(null)}>✕</button>
            </div>
            <p style={{ marginBottom: '0.5rem' }}><strong>Code:</strong> {selectedHelper.helper_code}</p>
            <p style={{ marginBottom: '0.5rem' }}><strong>Name:</strong> {selectedHelper.name}</p>
            <p style={{ marginBottom: '0.5rem' }}><strong>Phone:</strong> {selectedHelper.phone}</p>
            <p style={{ marginBottom: '0.5rem' }}><strong>Category:</strong> {selectedHelper.category}</p>
            <p style={{ marginBottom: '0.5rem' }}><strong>Status:</strong> <span className={`badge ${selectedHelper.status === 'ONLINE' ? 'active' : 'pending'}`}>{selectedHelper.status}</span></p>
          </div>
        </div>
      )}

      {/* Add Helper Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-card animate-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
               <h3 style={{ margin: 0 }}>Add New Helper</h3>
               <button className="btn btn-outline" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddHelper} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Name</label>
                <input 
                  type="text" 
                  value={newHelper.name}
                  onChange={(e) => setNewHelper({...newHelper, name: e.target.value})}
                  style={{ width: '100%' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>WhatsApp Number (with country code)</label>
                <input 
                  type="text" 
                  value={newHelper.phone}
                  onChange={(e) => setNewHelper({...newHelper, phone: e.target.value})}
                  style={{ width: '100%' }}
                  placeholder="e.g. 919876543210"
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Category</label>
                <select
                  value={newHelper.category}
                  onChange={(e) => setNewHelper({...newHelper, category: e.target.value})}
                  style={{ width: '100%' }}
                >
                  <option value="HOME_SERVICES">HOME SERVICES (Home Services)</option>
                  <option value="BOTH">BOTH (All Services)</option>
                  <option value="TASK">TASK (Groceries/etc)</option>
                  <option value="RIDE">RIDE (Bike/Auto/Car)</option>
                  <option value="FOOD">FOOD (Food Service)</option>
                  <option value="VEG_FRUITS">VEG & FRUITS (Fruits/Veg)</option>
                  <option value="MEDICINES">MEDICINES (Pharmacy)</option>
                  <option value="ANYWORK">ANYWORK (Anywork)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Helper Code (Optional)</label>
                <input 
                  type="text" 
                  value={newHelper.helper_code}
                  onChange={(e) => setNewHelper({...newHelper, helper_code: e.target.value})}
                  style={{ width: '100%' }}
                  placeholder="Leave blank to auto-generate"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Helper</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
