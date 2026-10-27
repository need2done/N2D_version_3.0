import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, CheckCircle2, XCircle, Search, Filter, 
  RefreshCw, Sparkles, DollarSign, Clock, Utensils, Shirt, 
  Layers, Home, CheckSquare, X, Percent, AlertCircle
} from 'lucide-react';
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
  const [submitting, setSubmitting] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [formData, setFormData] = useState({
    category_id: '1',
    title: '',
    description: '',
    rate: '',
    helper_charge: '',
    platform_fee: '39',
    duration: '1.5 - 2 Hours',
    icon: 'Utensils',
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
    setNewCategoryName('');
    setFormData({
      category_id: categories.length > 0 ? String(categories[0].id) : '1',
      title: '',
      description: '',
      rate: '',
      helper_charge: '',
      platform_fee: '39',
      duration: '1.5 - 2 Hours',
      icon: 'Utensils',
      is_active: 1
    });
    setIsModalOpen(true);
  };

  const openEditModal = (service) => {
    setEditingService(service);
    setNewCategoryName('');
    setFormData({
      category_id: String(service.category_id || (categories[0]?.id || '1')),
      title: service.title || '',
      description: service.description || '',
      rate: service.rate || '',
      helper_charge: service.helper_charge || '',
      platform_fee: service.platform_fee || '39',
      duration: service.duration || '1.5 - 2 Hours',
      icon: service.icon || 'Utensils',
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
    if (!formData.title || !formData.title.trim()) {
      alert('Please enter the Service Name');
      return;
    }
    if (!formData.rate) {
      alert('Please enter Customer Rate (₹)');
      return;
    }
    if (formData.category_id === 'NEW' && !newCategoryName.trim()) {
      alert('Please enter the new category name');
      return;
    }

    setSubmitting(true);
    try {
      const url = editingService
        ? `${API_URL}/home-services/admin/services/${editingService.id}`
        : `${API_URL}/home-services/admin/services`;
      
      const method = editingService ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        title: formData.title.trim(),
        new_category_name: formData.category_id === 'NEW' ? newCategoryName.trim() : undefined
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
    } finally {
      setSubmitting(false);
    }
  };

  // Category styles & icon helper
  const getCategoryDetails = (catName = '') => {
    const lower = catName.toLowerCase();
    if (lower.includes('kitchen')) {
      return { 
        bg: '#fff7ed', 
        text: '#ea580c', 
        border: '#ffedd5', 
        badgeBg: '#ffedd5',
        icon: Utensils 
      };
    }
    if (lower.includes('laundry') || lower.includes('cloth')) {
      return { 
        bg: '#eff6ff', 
        text: '#2563eb', 
        border: '#dbeafe', 
        badgeBg: '#dbeafe',
        icon: Shirt 
      };
    }
    if (lower.includes('floor')) {
      return { 
        bg: '#f0fdf4', 
        text: '#16a34a', 
        border: '#dcfce7', 
        badgeBg: '#dcfce7',
        icon: Layers 
      };
    }
    if (lower.includes('deep') || lower.includes('house')) {
      return { 
        bg: '#faf5ff', 
        text: '#9333ea', 
        border: '#f3e8ff', 
        badgeBg: '#f3e8ff',
        icon: Home 
      };
    }
    return { 
      bg: '#fefce8', 
      text: '#ca8a04', 
      border: '#fef9c3', 
      badgeBg: '#fef9c3',
      icon: CheckSquare 
    };
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

  // Calculate Average Payout % dynamically
  const calculatedAvgPayout = services.length > 0
    ? Math.round(
        services.reduce((acc, s) => {
          const rate = parseFloat(s.rate) || 0;
          const helper = parseFloat(s.helper_charge) || (rate > 0 ? rate - (parseFloat(s.platform_fee) || 39) : 0);
          return acc + (rate > 0 ? (helper / rate) * 100 : 85);
        }, 0) / services.length
      )
    : 85;

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* ── Header ────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ 
              display: 'inline-flex', 
              padding: '8px', 
              borderRadius: '12px', 
              backgroundColor: '#eff6ff', 
              color: '#3b82f6',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.15)'
            }}>
              <Home size={26} />
            </span>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Home Services Management
            </h1>
          </div>
          <p style={{ margin: '0.4rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.92rem' }}>
            Manage active home offerings, pricing, helper payouts, and booking availability
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={fetchHomeServices} 
            className="btn btn-outline" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              padding: '0.6rem 1.1rem',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button 
            onClick={openAddModal} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              backgroundColor: '#3b82f6', 
              color: '#fff', 
              padding: '0.6rem 1.3rem', 
              borderRadius: '10px', 
              border: 'none', 
              fontWeight: 700, 
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
              transition: 'all 0.2s ease'
            }}
          >
            <Plus size={18} /> Add New Service
          </button>
        </div>
      </div>

      {/* ── Summary Stats Cards ───────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ 
          background: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '16px', 
          padding: '1.4rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em' }}>TOTAL SERVICES</p>
              <h2 style={{ margin: '0.35rem 0 0 0', fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>{services.length}</h2>
            </div>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Home size={24} />
            </div>
          </div>
        </div>

        <div style={{ 
          background: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '16px', 
          padding: '1.4rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em' }}>ACTIVE SERVICES</p>
              <h2 style={{ margin: '0.35rem 0 0 0', fontSize: '2rem', fontWeight: 800, color: '#16a34a' }}>{activeCount}</h2>
            </div>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={24} />
            </div>
          </div>
        </div>

        <div style={{ 
          background: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '16px', 
          padding: '1.4rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em' }}>CATEGORIES</p>
              <h2 style={{ margin: '0.35rem 0 0 0', fontSize: '2rem', fontWeight: 800, color: '#9333ea' }}>{categories.length}</h2>
            </div>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#faf5ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={24} />
            </div>
          </div>
        </div>

        <div style={{ 
          background: '#ffffff', 
          border: '1px solid #e2e8f0', 
          borderRadius: '16px', 
          padding: '1.4rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em' }}>AVG HELPER PAYOUT</p>
              <h2 style={{ margin: '0.35rem 0 0 0', fontSize: '2rem', fontWeight: 800, color: '#ea580c' }}>{calculatedAvgPayout}%</h2>
            </div>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Percent size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Category Filter Pills & Search Bar ─────────────── */}
      <div style={{ 
        background: '#ffffff', 
        border: '1px solid #e2e8f0', 
        borderRadius: '16px', 
        padding: '1.25rem', 
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <button
            onClick={() => setSelectedCategory('ALL')}
            style={{ 
              borderRadius: '30px', 
              padding: '0.5rem 1.1rem', 
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: selectedCategory === 'ALL' ? 'none' : '1px solid #e2e8f0',
              backgroundColor: selectedCategory === 'ALL' ? '#3b82f6' : '#ffffff',
              color: selectedCategory === 'ALL' ? '#ffffff' : '#475569',
              boxShadow: selectedCategory === 'ALL' ? '0 4px 12px rgba(59, 130, 246, 0.25)' : 'none',
              transition: 'all 0.15s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            All Categories
            <span style={{ 
              fontSize: '0.75rem', 
              padding: '2px 7px', 
              borderRadius: '20px', 
              backgroundColor: selectedCategory === 'ALL' ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
              color: selectedCategory === 'ALL' ? '#ffffff' : '#64748b'
            }}>
              {services.length}
            </span>
          </button>

          {categories.map(cat => {
            const isSelected = String(selectedCategory) === String(cat.id);
            const details = getCategoryDetails(cat.name);
            const CatIcon = details.icon;
            const count = services.filter(s => String(s.category_id) === String(cat.id)).length;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(String(cat.id))}
                style={{ 
                  borderRadius: '30px', 
                  padding: '0.5rem 1.1rem', 
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: isSelected ? 'none' : '1px solid #e2e8f0',
                  backgroundColor: isSelected ? '#3b82f6' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#475569',
                  boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.25)' : 'none',
                  transition: 'all 0.15s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <CatIcon size={15} color={isSelected ? '#ffffff' : details.text} />
                {cat.name}
                <span style={{ 
                  fontSize: '0.75rem', 
                  padding: '2px 7px', 
                  borderRadius: '20px', 
                  backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : details.badgeBg,
                  color: isSelected ? '#ffffff' : details.text
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Filter Row */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by title, description or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                padding: '0.65rem 1rem 0.65rem 2.6rem', 
                width: '100%', 
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                outline: 'none',
                fontSize: '0.9rem',
                color: '#0f172a',
                backgroundColor: '#f8fafc',
                transition: 'all 0.2s ease'
              }}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                style={{ 
                  position: 'absolute', 
                  right: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  border: 'none', 
                  background: 'none', 
                  cursor: 'pointer',
                  color: '#94a3b8'
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} style={{ color: '#64748b' }} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ 
                borderRadius: '10px', 
                border: '1px solid #e2e8f0',
                padding: '0.65rem 1rem',
                fontSize: '0.88rem',
                fontWeight: 600,
                color: '#334155',
                backgroundColor: '#f8fafc',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Services Table ─────────────────────────────────── */}
      {loading ? (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '4rem 2rem', textAlign: 'center' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 1rem', color: '#3b82f6' }} />
          <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading Home Services catalog...</p>
        </div>
      ) : error ? (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '16px', padding: '2.5rem', textAlign: 'center', color: '#dc2626' }}>
          <AlertCircle size={32} style={{ margin: '0 auto 0.75rem' }} />
          <p style={{ fontWeight: 600, marginBottom: '1rem' }}>{error}</p>
          <button 
            onClick={fetchHomeServices} 
            style={{ 
              backgroundColor: '#dc2626', 
              color: '#ffffff', 
              padding: '0.5rem 1.2rem', 
              borderRadius: '8px', 
              border: 'none', 
              fontWeight: 600, 
              cursor: 'pointer' 
            }}
          >
            Retry Connection
          </button>
        </div>
      ) : filteredServices.length === 0 ? (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <Home size={32} />
          </div>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>No Home Services Found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
            {searchTerm || statusFilter !== 'ALL' || selectedCategory !== 'ALL'
              ? 'No services matched your filter criteria. Try resetting filters or search query.'
              : 'Start by adding your first home service to accept customer bookings.'}
          </p>
          <button 
            onClick={openAddModal} 
            style={{ 
              backgroundColor: '#3b82f6', 
              color: '#ffffff', 
              padding: '0.65rem 1.4rem', 
              borderRadius: '10px', 
              border: 'none', 
              fontWeight: 700, 
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
            }}
          >
            <Plus size={18} /> Add New Home Service
          </button>
        </div>
      ) : (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div className="table-responsive" style={{ margin: 0 }}>
            <table style={{ width: '100%', minWidth: '820px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '1rem 1.4rem' }}>Service Offering</th>
                  <th style={{ padding: '1rem 1.2rem' }}>Category</th>
                  <th style={{ padding: '1rem 1.2rem' }}>Customer Rate</th>
                  <th style={{ padding: '1rem 1.2rem' }}>Helper Payout</th>
                  <th style={{ padding: '1rem 1.2rem' }}>Platform Fee</th>
                  <th style={{ padding: '1rem 1.2rem' }}>Duration</th>
                  <th style={{ padding: '1rem 1.2rem' }}>Status</th>
                  <th style={{ padding: '1rem 1.4rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.map((service, index) => {
                  const catDetails = getCategoryDetails(service.category_name);
                  const CatIcon = catDetails.icon;
                  const rate = parseFloat(service.rate) || 0;
                  const fee = parseFloat(service.platform_fee) || 39;
                  const helperCharge = parseFloat(service.helper_charge) || (rate > fee ? rate - fee : rate);
                  const payoutPercent = rate > 0 ? Math.round((helperCharge / rate) * 100) : 85;

                  return (
                    <tr 
                      key={service.id} 
                      style={{ 
                        borderBottom: index === filteredServices.length - 1 ? 'none' : '1px solid #f1f5f9',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                    >
                      {/* Service Info */}
                      <td style={{ padding: '1.1rem 1.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <div style={{ 
                            width: '40px', 
                            height: '40px', 
                            borderRadius: '10px', 
                            backgroundColor: catDetails.bg, 
                            border: `1px solid ${catDetails.border}`,
                            color: catDetails.text,
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <CatIcon size={20} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.94rem' }}>
                              {service.title}
                            </div>
                            {service.description && (
                              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3px', lineHeight: 1.4, maxWidth: '440px' }}>
                                {service.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td style={{ padding: '1.1rem 1.2rem' }}>
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '5px',
                          background: catDetails.bg, 
                          color: catDetails.text, 
                          border: `1px solid ${catDetails.border}`,
                          borderRadius: '20px', 
                          padding: '0.3rem 0.75rem', 
                          fontSize: '0.78rem',
                          fontWeight: 700
                        }}>
                          <CatIcon size={13} />
                          {service.category_name || 'Home Service'}
                        </span>
                      </td>

                      {/* Customer Rate */}
                      <td style={{ padding: '1.1rem 1.2rem' }}>
                        <div style={{ fontWeight: 800, color: '#16a34a', fontSize: '1.02rem' }}>
                          ₹{rate.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>User Price</div>
                      </td>

                      {/* Helper Earning */}
                      <td style={{ padding: '1.1rem 1.2rem' }}>
                        <div style={{ fontWeight: 800, color: '#2563eb', fontSize: '1.02rem' }}>
                          ₹{helperCharge.toFixed(2)}
                        </div>
                        <span style={{ 
                          display: 'inline-block',
                          fontSize: '0.7rem', 
                          fontWeight: 700, 
                          color: '#2563eb', 
                          background: '#eff6ff', 
                          padding: '1px 6px', 
                          borderRadius: '6px',
                          marginTop: '2px'
                        }}>
                          {payoutPercent}% Payout
                        </span>
                      </td>

                      {/* Platform Fee */}
                      <td style={{ padding: '1.1rem 1.2rem' }}>
                        <div style={{ fontWeight: 700, color: '#475569' }}>
                          ₹{fee.toFixed(2)}
                        </div>
                      </td>

                      {/* Duration */}
                      <td style={{ padding: '1.1rem 1.2rem', color: '#475569' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.84rem', fontWeight: 600 }}>
                          <Clock size={14} color="#64748b" /> {service.duration || '1 Hour'}
                        </span>
                      </td>

                      {/* Active Status */}
                      <td style={{ padding: '1.1rem 1.2rem' }}>
                        <button
                          onClick={() => handleToggle(service.id)}
                          style={{
                            border: 'none',
                            background: service.is_active === 1 ? '#dcfce7' : '#fee2e2',
                            color: service.is_active === 1 ? '#15803d' : '#b91c1c',
                            padding: '0.35rem 0.85rem',
                            borderRadius: '20px',
                            fontWeight: 700,
                            fontSize: '0.76rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {service.is_active === 1 ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                          {service.is_active === 1 ? 'ACTIVE' : 'INACTIVE'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1.1rem 1.4rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => openEditModal(service)}
                            style={{ 
                              padding: '0.4rem 0.75rem', 
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              borderRadius: '8px',
                              border: '1px solid #dbeafe',
                              backgroundColor: '#eff6ff',
                              color: '#2563eb',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease'
                            }}
                            title="Edit Service"
                          >
                            <Edit2 size={13} /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(service.id, service.title)}
                            style={{ 
                              padding: '0.4rem 0.75rem', 
                              fontSize: '0.8rem', 
                              borderRadius: '8px',
                              border: '1px solid #fee2e2',
                              backgroundColor: '#fef2f2',
                              color: '#dc2626', 
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease'
                            }}
                            title="Delete Service"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal (Crisp, Solid Background, Always-Visible Submit Button) ── */}
      {isModalOpen && (
        <div 
          className="modal-overlay" 
          onClick={(e) => {
            if (e.target.classList.contains('modal-overlay')) setIsModalOpen(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            overflowY: 'auto'
          }}
        >
          <div 
            className="modal-dialog"
            style={{ 
              width: '100%',
              maxWidth: '560px',
              maxHeight: 'min(90vh, 700px)',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.4)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div className="modal-dialog-header" style={{ flexShrink: 0, padding: '1.25rem 1.5rem', background: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ 
                  display: 'inline-flex', 
                  padding: '8px', 
                  borderRadius: '12px', 
                  backgroundColor: '#eff6ff', 
                  color: '#3b82f6' 
                }}>
                  <Home size={22} />
                </span>
                <div>
                  <h3 className="modal-dialog-title" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
                    {editingService ? 'Edit Service & Pricing' : 'Add New Home Service'}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                    <span style={{ 
                      fontSize: '0.72rem', 
                      fontWeight: 700, 
                      color: '#059669', 
                      backgroundColor: '#ecfdf5', 
                      padding: '2px 8px', 
                      borderRadius: '6px',
                      border: '1px solid #d1fae5',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                      Global Live Sync
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Updates website & booking app in real-time
                    </span>
                  </div>
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                style={{ 
                  background: '#f1f5f9', 
                  border: 'none', 
                  borderRadius: '10px', 
                  width: '34px', 
                  height: '34px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: '#64748b',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', margin: 0 }}>
              <div 
                className="modal-dialog-body" 
                style={{ 
                  flex: 1, 
                  overflowY: 'auto', 
                  padding: '1.25rem 1.5rem', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '1.1rem', 
                  backgroundColor: '#ffffff' 
                }}
              >
                {/* 1. Service Name (Prominent & Clear) */}
                <div>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
                    <span>SERVICE NAME <span style={{ color: '#ef4444' }}>*</span></span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'none' }}>Customers see this name</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter service name (e.g. Kitchen Cleaning, Bathroom Deep Scrub, Sofa Wash)"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    style={{ 
                      width: '100%', 
                      padding: '0.75rem 1rem', 
                      borderRadius: '10px', 
                      border: '1.5px solid #cbd5e1', 
                      fontSize: '0.92rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      backgroundColor: '#f8fafc',
                      outline: 'none'
                    }}
                    required
                  />
                </div>

                {/* 2. Service Category */}
                <div>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
                    <span>SERVICE CATEGORY <span style={{ color: '#ef4444' }}>*</span></span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'none' }}>Select or create new category</span>
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    style={{ 
                      width: '100%', 
                      padding: '0.75rem 1rem', 
                      borderRadius: '10px', 
                      border: '1.5px solid #cbd5e1', 
                      fontSize: '0.92rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      backgroundColor: '#f8fafc',
                      outline: 'none'
                    }}
                    required
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                    <option value="NEW">+ Create New Category...</option>
                  </select>

                  {formData.category_id === 'NEW' && (
                    <div style={{ marginTop: '0.6rem' }}>
                      <input
                        type="text"
                        placeholder="Enter new category name (e.g. Pest Control, Electrical & Repairs)"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        style={{ 
                          width: '100%', 
                          padding: '0.65rem 0.9rem', 
                          borderRadius: '10px', 
                          border: '2px solid #3b82f6', 
                          fontSize: '0.88rem',
                          fontWeight: 600,
                          color: '#0f172a',
                          backgroundColor: '#eff6ff',
                          outline: 'none'
                        }}
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                {/* 3. Description */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
                    Service Description
                  </label>
                  <textarea
                    placeholder="Clear description of the tasks the helper will perform for the customer..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    style={{ 
                      width: '100%', 
                      padding: '0.7rem 0.9rem', 
                      borderRadius: '10px', 
                      border: '1.5px solid #cbd5e1', 
                      fontSize: '0.88rem',
                      color: '#0f172a',
                      backgroundColor: '#f8fafc',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                  />
                </div>

                {/* 4. Pricing Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                      Customer Rate (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="299.00"
                      value={formData.rate}
                      onChange={(e) => {
                        const rateVal = parseFloat(e.target.value || 0);
                        const pfVal = parseFloat(formData.platform_fee || 39);
                        const calculatedHC = rateVal > pfVal ? (rateVal - pfVal) : 0;
                        setFormData({ 
                          ...formData, 
                          rate: e.target.value,
                          helper_charge: calculatedHC > 0 ? calculatedHC.toFixed(2) : formData.helper_charge
                        });
                      }}
                      style={{ 
                        width: '100%', 
                        padding: '0.7rem 0.9rem', 
                        borderRadius: '10px', 
                        border: '1.5px solid #86efac', 
                        fontSize: '1rem',
                        fontWeight: 800,
                        color: '#15803d',
                        backgroundColor: '#ffffff',
                        outline: 'none'
                      }}
                      required
                    />
                    <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '3px', display: 'block' }}>
                      Price shown to customer
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                      Helper Earning (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="260.00"
                      value={formData.helper_charge}
                      onChange={(e) => setFormData({ ...formData, helper_charge: e.target.value })}
                      style={{ 
                        width: '100%', 
                        padding: '0.7rem 0.9rem', 
                        borderRadius: '10px', 
                        border: '1.5px solid #93c5fd', 
                        fontSize: '1rem',
                        fontWeight: 800,
                        color: '#1d4ed8',
                        backgroundColor: '#ffffff',
                        outline: 'none'
                      }}
                      required
                    />
                    <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '3px', display: 'block' }}>
                      Payout helper receives
                    </span>
                  </div>
                </div>

                {/* 5. Platform Fee & Duration */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                      Platform Fee (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.platform_fee}
                      onChange={(e) => setFormData({ ...formData, platform_fee: e.target.value })}
                      style={{ 
                        width: '100%', 
                        padding: '0.7rem 0.9rem', 
                        borderRadius: '10px', 
                        border: '1.5px solid #cbd5e1', 
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        color: '#334155',
                        backgroundColor: '#f8fafc',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                      Estimated Duration
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1.5 - 2 Hours"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      style={{ 
                        width: '100%', 
                        padding: '0.7rem 0.9rem', 
                        borderRadius: '10px', 
                        border: '1.5px solid #cbd5e1', 
                        fontSize: '0.9rem',
                        color: '#0f172a',
                        backgroundColor: '#f8fafc',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* 6. Active Toggle Checkbox */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  padding: '0.85rem 1rem', 
                  background: formData.is_active === 1 ? '#f0fdf4' : '#f8fafc', 
                  borderRadius: '12px', 
                  border: formData.is_active === 1 ? '1.5px solid #bbf7d0' : '1px solid #e2e8f0',
                  marginTop: '0.2rem'
                }}>
                  <input
                    type="checkbox"
                    id="active_check"
                    checked={formData.is_active === 1}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                    style={{ width: '19px', height: '19px', cursor: 'pointer', accentColor: '#16a34a' }}
                  />
                  <label htmlFor="active_check" style={{ fontSize: '0.88rem', fontWeight: 700, color: formData.is_active === 1 ? '#15803d' : '#475569', cursor: 'pointer' }}>
                    Enable this service for instant customer booking
                  </label>
                </div>
              </div>

              {/* Footer - Always Visible & Pinned to Modal Bottom */}
              <div 
                className="modal-dialog-footer" 
                style={{ 
                  flexShrink: 0,
                  padding: '1rem 1.5rem', 
                  background: '#f8fafc', 
                  borderTop: '1px solid #e2e8f0', 
                  display: 'flex', 
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.03)'
                }}
              >
                <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={14} color="#3b82f6" />
                  <span>Changes apply globally in real-time</span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    style={{ 
                      padding: '0.65rem 1.25rem', 
                      borderRadius: '10px', 
                      border: '1.5px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#475569',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{ 
                      padding: '0.65rem 1.6rem', 
                      borderRadius: '10px', 
                      backgroundColor: '#2563eb', 
                      color: '#ffffff', 
                      border: 'none', 
                      fontWeight: 800, 
                      fontSize: '0.9rem',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      opacity: submitting ? 0.75 : 1
                    }}
                  >
                    {submitting ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      editingService ? 'Save Changes' : 'Create Service'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
