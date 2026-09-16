import React, { useState, useEffect } from 'react';
import { Wrench, Plus, Edit2, Trash2, CheckCircle2, XCircle, Search, Filter, RefreshCw, Zap, Droplet, Wind, Sparkles, Hammer, ShieldCheck, DollarSign, Clock } from 'lucide-react';
import { API_URL } from '../config';

export default function HomeServicesPage() {
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    category_id: '1',
    title: '',
    description: '',
    rate: '',
    helper_charge: '',
    platform_fee: '5',
    duration: '1 Hour',
    icon: 'Wrench',
    is_active: 1
  });

  const fetchHomeServices = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/home-services/admin/services`, { headers });
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories || []);
        setServices(data.services || []);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch home services');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Cannot connect to backend server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomeServices();
  }, []);

  const openAddModal = () => {
    setEditingService(null);
    setFormData({
      category_id: categories.length > 0 ? categories[0].id : '1',
      title: '',
      description: '',
      rate: '',
      helper_charge: '',
      platform_fee: '5',
      duration: '1 Hour',
      icon: 'Wrench',
      is_active: 1
    });
    setIsModalOpen(true);
  };

  const openEditModal = (service) => {
    setEditingService(service);
    setFormData({
      category_id: service.category_id || '1',
      title: service.title || '',
      description: service.description || '',
      rate: service.rate || '',
      helper_charge: service.helper_charge || '',
      platform_fee: service.platform_fee || '5',
      duration: service.duration || '1 Hour',
      icon: service.icon || 'Wrench',
      is_active: service.is_active === 1 ? 1 : 0
    });
    setIsModalOpen(true);
  };

  const handleToggle = async (id) => {
    try {
      const res = await fetch(`${API_URL}/home-services/admin/services/${id}/toggle`, {
        method: 'PUT'
      });
      const data = await res.json();
      if (data.success) {
        setServices(services.map(s => s.id === id ? { ...s, is_active: data.is_active } : s));
      } else {
        alert(data.error || 'Toggle failed');
      }
    } catch (err) {
      alert('Network error while toggling service status.');
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      const res = await fetch(`${API_URL}/home-services/admin/services/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setServices(services.filter(s => s.id !== id));
      } else {
        alert(data.error || 'Delete failed');
      }
    } catch (err) {
      alert('Network error while deleting service.');
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.rate) {
      alert('Please fill title and customer rate');
      return;
    }

    try {
      const url = editingService
        ? `${API_URL}/home-services/admin/services/${editingService.id}`
        : `${API_URL}/home-services/admin/services`;
      
      const method = editingService ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchHomeServices();
      } else {
        alert(data.error || 'Operation failed');
      }
    } catch (err) {
      alert('Network error submitting form.');
    }
  };

  // Filtered Services
  const filteredServices = services.filter(service => {
    const matchesCategory = selectedCategory === 'ALL' || String(service.category_id) === String(selectedCategory);
    const matchesSearch = service.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (service.description && service.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || 
                         (statusFilter === 'ACTIVE' && service.is_active === 1) ||
                         (statusFilter === 'INACTIVE' && service.is_active === 0);
    return matchesCategory && matchesSearch && matchesStatus;
  });

  const activeCount = services.filter(s => s.is_active === 1).length;

  return (
    <div className="home-services-page" style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Wrench className="text-primary" size={28} />
            Home Services Management
          </h1>
          <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Configure home service offerings, pricing, helper payouts, and availability
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchHomeServices} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={openAddModal} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#3b82f6', color: '#fff', padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={18} /> Add New Service
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>TOTAL SERVICES</p>
              <h2 style={{ margin: '0.3rem 0 0 0', fontSize: '1.8rem', fontWeight: 700 }}>{services.length}</h2>
            </div>
            <div style={{ padding: '0.6rem', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <Wrench size={24} />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>ACTIVE SERVICES</p>
              <h2 style={{ margin: '0.3rem 0 0 0', fontSize: '1.8rem', fontWeight: 700, color: '#10b981' }}>{activeCount}</h2>
            </div>
            <div style={{ padding: '0.6rem', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <CheckCircle2 size={24} />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>CATEGORIES</p>
              <h2 style={{ margin: '0.3rem 0 0 0', fontSize: '1.8rem', fontWeight: 700 }}>{categories.length || 5}</h2>
            </div>
            <div style={{ padding: '0.6rem', borderRadius: '50%', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
              <Zap size={24} />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>AVG HELPER PAYOUT</p>
              <h2 style={{ margin: '0.3rem 0 0 0', fontSize: '1.8rem', fontWeight: 700, color: '#f59e0b' }}>85%</h2>
            </div>
            <div style={{ padding: '0.6rem', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              <DollarSign size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Category Pills & Search Controls */}
      <div className="card" style={{ padding: '1.2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', pb: '0.75rem' }}>
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`btn ${selectedCategory === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '20px', padding: '0.4rem 1rem', fontSize: '0.85rem' }}
          >
            All Categories ({services.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(String(cat.id))}
              className={`btn ${String(selectedCategory) === String(cat.id) ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: '20px', padding: '0.4rem 1rem', fontSize: '0.85rem' }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search home service title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '2.4rem', width: '100%', borderRadius: '8px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-control"
              style={{ borderRadius: '8px', minWidth: '140px' }}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Services Table */}
      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading Home Services...</p>
        </div>
      ) : error ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
          <p>{error}</p>
          <button onClick={fetchHomeServices} className="btn btn-secondary" style={{ marginTop: '0.5rem' }}>Try Again</button>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>No home services found matching criteria.</p>
          <button onClick={openAddModal} className="btn btn-primary" style={{ marginTop: '0.75rem' }}>Add New Home Service</button>
        </div>
      ) : (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-muted)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '1rem 1.2rem' }}>Service</th>
                <th style={{ padding: '1rem 1.2rem' }}>Category</th>
                <th style={{ padding: '1rem 1.2rem' }}>Customer Rate</th>
                <th style={{ padding: '1rem 1.2rem' }}>Helper Earning</th>
                <th style={{ padding: '1rem 1.2rem' }}>Platform Fee</th>
                <th style={{ padding: '1rem 1.2rem' }}>Duration</th>
                <th style={{ padding: '1rem 1.2rem' }}>Status</th>
                <th style={{ padding: '1rem 1.2rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.map(service => (
                <tr key={service.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem 1.2rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{service.title}</div>
                    {service.description && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{service.description}</div>
                    )}
                  </td>
                  <td style={{ padding: '1rem 1.2rem' }}>
                    <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '12px', padding: '0.2rem 0.6rem', fontSize: '0.78rem' }}>
                      {service.category_name || 'Home Service'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.2rem', fontWeight: 700, color: '#10b981' }}>
                    ₹{parseFloat(service.rate).toFixed(2)}
                  </td>
                  <td style={{ padding: '1rem 1.2rem', fontWeight: 700, color: '#3b82f6' }}>
                    ₹{parseFloat(service.helper_charge || (service.rate - (service.platform_fee || 5))).toFixed(2)}
                  </td>
                  <td style={{ padding: '1rem 1.2rem', color: 'var(--text-muted)' }}>
                    ₹{parseFloat(service.platform_fee || 5).toFixed(2)}
                  </td>
                  <td style={{ padding: '1rem 1.2rem', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={14} /> {service.duration || '1 Hour'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.2rem' }}>
                    <button
                      onClick={() => handleToggle(service.id)}
                      style={{
                        border: 'none',
                        background: service.is_active === 1 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: service.is_active === 1 ? '#10b981' : '#ef4444',
                        padding: '0.3rem 0.75rem',
                        borderRadius: '20px',
                        fontWeight: 600,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      {service.is_active === 1 ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                      {service.is_active === 1 ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                  </td>
                  <td style={{ padding: '1rem 1.2rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => openEditModal(service)}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                        title="Edit Service"
                      >
                        <Edit2 size={14} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(service.id, service.title)}
                        className="btn btn-danger"
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                        title="Delete Service"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div className="card animate-fade" style={{ width: '100%', maxWidth: '540px', padding: '1.8rem', borderRadius: '12px', background: 'var(--bg-card)', color: 'var(--text-main)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }}>
            <h2 style={{ margin: '0 0 1.2rem 0', fontSize: '1.4rem', fontWeight: 700 }}>
              {editingService ? 'Edit Home Service' : 'Add New Home Service'}
            </h2>

            <form onSubmit={handleFormSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Category</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="form-control"
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px' }}
                  required
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Service Title</label>
                <input
                  type="text"
                  placeholder="e.g. Tap & Pipe Leakage Repair"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="form-control"
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Description</label>
                <textarea
                  placeholder="Brief explanation of work done..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="form-control"
                  rows={2}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Customer Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="199.00"
                    value={formData.rate}
                    onChange={(e) => {
                      const rateVal = parseFloat(e.target.value || 0);
                      const pfVal = parseFloat(formData.platform_fee || 5);
                      const calculatedHC = rateVal > 0 ? (rateVal - pfVal) : 0;
                      setFormData({ 
                        ...formData, 
                        rate: e.target.value,
                        helper_charge: calculatedHC > 0 ? calculatedHC : formData.helper_charge
                      });
                    }}
                    className="form-control"
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Helper Earning (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="175.00"
                    value={formData.helper_charge}
                    onChange={(e) => setFormData({ ...formData, helper_charge: e.target.value })}
                    className="form-control"
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Platform Fee (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.platform_fee}
                    onChange={(e) => setFormData({ ...formData, platform_fee: e.target.value })}
                    className="form-control"
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Duration</label>
                  <input
                    type="text"
                    placeholder="1 Hour"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="form-control"
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="active_check"
                  checked={formData.is_active === 1}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="active_check" style={{ fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer' }}>
                  Enable Service for Customer Booking
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '8px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '0.6rem 1.4rem', borderRadius: '8px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                >
                  {editingService ? 'Save Changes' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
