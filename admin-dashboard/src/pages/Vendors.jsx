import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Store, Plus, Search, Edit2, Trash2, X, Phone, 
  MapPin, Zap, CheckCircle2, ShoppingBag, 
  ArrowUpRight, Navigation, RefreshCw, AlertCircle
} from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { API_URL } from '../config';

const CATEGORIES = [
  'ALL',
  'Groceries',
  'Vegetables & Fruits',
  'Home Services',
  'Food Service',
  'Medicines',
  'AnyWork',
  'Ride',
  'Other'
];

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  const [currentVendor, setCurrentVendor] = useState({
    name: '',
    phone: '',
    service_category: 'Groceries',
    address: '',
    lat: '',
    lng: '',
    auto_assign: true,
    status: 'Active'
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/vendors`);
      if (res.data.success) {
        setVendors(res.data.vendors || []);
      }
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
      toast.error('Failed to fetch vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (vendor = null) => {
    if (vendor) {
      setIsEditMode(true);
      setCurrentVendor({
        id: vendor.id,
        name: vendor.name || '',
        phone: vendor.phone || '',
        service_category: vendor.service_category || 'Groceries',
        address: vendor.address || '',
        lat: vendor.lat !== null && vendor.lat !== undefined ? vendor.lat : '',
        lng: vendor.lng !== null && vendor.lng !== undefined ? vendor.lng : '',
        auto_assign: vendor.auto_assign === 1 || vendor.auto_assign === true,
        status: vendor.status || 'Active'
      });
    } else {
      setIsEditMode(false);
      setCurrentVendor({
        name: '',
        phone: '',
        service_category: selectedCategory !== 'ALL' ? selectedCategory : 'Groceries',
        address: '',
        lat: '',
        lng: '',
        auto_assign: true,
        status: 'Active'
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsSubmitting(false);
    setCurrentVendor({
      name: '',
      phone: '',
      service_category: 'Groceries',
      address: '',
      lat: '',
      lng: '',
      auto_assign: true,
      status: 'Active'
    });
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCloseModal();
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.warning('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentVendor(prev => ({
          ...prev,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6)
        }));
        setDetectingLocation(false);
        toast.success('Coordinates detected from GPS!');
      },
      (err) => {
        setDetectingLocation(false);
        toast.error('Could not detect location: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentVendor.name.trim()) {
      toast.warning('Please enter a store name');
      return;
    }
    if (!currentVendor.phone.trim()) {
      toast.warning('Please enter a WhatsApp contact number');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        ...currentVendor,
        lat: currentVendor.lat !== '' ? parseFloat(currentVendor.lat) : null,
        lng: currentVendor.lng !== '' ? parseFloat(currentVendor.lng) : null,
      };

      if (isEditMode) {
        await axios.put(`${API_URL}/vendors/${currentVendor.id}`, payload);
        toast.success('Vendor updated successfully');
      } else {
        await axios.post(`${API_URL}/vendors`, payload);
        toast.success('Vendor registered successfully');
      }
      fetchVendors();
      handleCloseModal();
    } catch (error) {
      console.error('Operation failed:', error);
      toast.error(error.response?.data?.error || 'Operation failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name || 'this vendor'}"? This action cannot be undone.`)) {
      try {
        await axios.delete(`${API_URL}/vendors/${id}`);
        toast.success('Vendor deleted successfully');
        fetchVendors();
      } catch (error) {
        console.error('Failed to delete vendor:', error);
        toast.error('Failed to delete vendor');
      }
    }
  };

  // Metrics calculations
  const totalVendors = vendors.length;
  const activeVendors = vendors.filter(v => v.status === 'Active').length;
  const autoAssignVendors = vendors.filter(v => v.auto_assign === 1 || v.auto_assign === true).length;
  const totalOrdersAccepted = vendors.reduce((sum, v) => sum + (parseInt(v.accepted_orders, 10) || 0), 0);
  const totalVolume = vendors.reduce((sum, v) => sum + (parseFloat(v.total_amount, 10) || 0), 0);

  // Filtering
  const filteredVendors = vendors.filter(vendor => {
    const query = searchTerm.toLowerCase();
    const matchesSearch = 
      (vendor.name || '').toLowerCase().includes(query) ||
      (vendor.phone || '').includes(query) ||
      (vendor.service_category || '').toLowerCase().includes(query) ||
      (vendor.address || '').toLowerCase().includes(query);

    const matchesCategory = selectedCategory === 'ALL' || vendor.service_category === selectedCategory;
    const matchesStatus = selectedStatus === 'ALL' || vendor.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '2rem' }}>
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Page Header */}
      <div className="page-header-container" style={{ marginBottom: '1.25rem' }}>
        <div className="page-title-group">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ 
              display: 'inline-flex', 
              padding: '8px', 
              borderRadius: '10px', 
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              color: 'var(--primary)'
            }}>
              <Store size={24} />
            </span>
            Vendor Management
          </h3>
          <p>Register partner stores, manage product categories, GPS coordinates, and automated WhatsApp order dispatch.</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            onClick={fetchVendors} 
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Refresh Vendors"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button 
            onClick={() => handleOpenModal()} 
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)' }}
          >
            <Plus size={18} />
            Add Vendor
          </button>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="stat-cards-grid" style={{ marginBottom: '1.5rem' }}>
        {/* Card 1: Total Stores */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Stores
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                {totalVendors}
              </div>
            </div>
            <div className="stat-card-badge" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
              <Store size={22} />
            </div>
          </div>
          <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#64748b' }}>
            Registered partner network
          </div>
        </div>

        {/* Card 2: Active Vendors */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Active Stores
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#059669', marginTop: '4px' }}>
                {activeVendors}
              </div>
            </div>
            <div className="stat-card-badge" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
              <CheckCircle2 size={22} />
            </div>
          </div>
          <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#64748b' }}>
            {totalVendors > 0 ? `${Math.round((activeVendors / totalVendors) * 100)}% operational` : '0 operational'}
          </div>
        </div>

        {/* Card 3: Auto-Assign Active */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Auto-Dispatch
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#2563eb', marginTop: '4px' }}>
                {autoAssignVendors}
              </div>
            </div>
            <div className="stat-card-badge" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
              <Zap size={22} />
            </div>
          </div>
          <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#64748b' }}>
            Automated routing enabled
          </div>
        </div>

        {/* Card 4: Orders Fulfilled & Volume */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Accepted Orders
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#7c3aed', marginTop: '4px' }}>
                {totalOrdersAccepted}
              </div>
            </div>
            <div className="stat-card-badge" style={{ backgroundColor: '#f5f3ff', color: '#7c3aed' }}>
              <ShoppingBag size={22} />
            </div>
          </div>
          <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>
            ₹{totalVolume.toFixed(2)} total routed
          </div>
        </div>
      </div>

      {/* Main Vendors Container Card */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        
        {/* Category Horizontal Pills */}
        <div style={{ 
          padding: '12px 18px 0', 
          borderBottom: '1px solid #e2e8f0', 
          backgroundColor: '#fafbfc' 
        }}>
          <div className="category-tabs-bar">
            {CATEGORIES.map(cat => {
              const count = cat === 'ALL' 
                ? vendors.length 
                : vendors.filter(v => v.service_category === cat).length;
              const isActive = selectedCategory === cat;

              return (
                <button
                  key={cat}
                  className={`category-tab ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>{cat === 'ALL' ? 'All Categories' : cat}</span>
                  <span style={{ 
                    fontSize: '11px', 
                    padding: '1px 6px', 
                    borderRadius: '10px', 
                    backgroundColor: isActive ? '#2563eb' : '#e2e8f0',
                    color: isActive ? '#ffffff' : '#64748b',
                    fontWeight: 600
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter Toolbar */}
        <div style={{ 
          padding: '16px 20px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '12px',
          borderBottom: '1px solid #f1f5f9'
        }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
            <Search 
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} 
              size={17} 
            />
            <input
              type="text"
              placeholder="Search store name, phone, address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                width: '100%', 
                paddingLeft: '2.4rem', 
                paddingRight: '2rem',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem'
              }}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                style={{ 
                  position: 'absolute', 
                  right: '10px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  color: '#94a3b8' 
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Right Toolbar Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={{ 
                  height: '38px', 
                  borderRadius: '8px', 
                  border: '1px solid #cbd5e1', 
                  fontSize: '0.85rem',
                  padding: '0 10px'
                }}
              >
                <option value="ALL">All Status</option>
                <option value="Active">Active Only</option>
                <option value="Inactive">Inactive Only</option>
              </select>
            </div>

            <div style={{ 
              fontSize: '0.8rem', 
              fontWeight: 600, 
              color: '#475569', 
              backgroundColor: '#f1f5f9', 
              padding: '6px 12px', 
              borderRadius: '20px' 
            }}>
              Showing {filteredVendors.length} of {vendors.length} stores
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="table-responsive" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
          <table style={{ border: 'none', borderRadius: 0 }}>
            <thead>
              <tr>
                <th style={{ width: '220px' }}>Store & Details</th>
                <th>Category</th>
                <th>WhatsApp Contact</th>
                <th>Auto-Assign</th>
                <th style={{ textAlign: 'center' }}>Accepted Orders</th>
                <th style={{ textAlign: 'right' }}>Total Volume</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'right', width: '150px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendors.length > 0 ? (
                filteredVendors.map(vendor => {
                  const isAutoAssign = vendor.auto_assign === 1 || vendor.auto_assign === true;
                  const hasLocation = vendor.lat && vendor.lng;
                  const cleanPhone = (vendor.phone || '').replace(/[^0-9]/g, '');

                  return (
                    <tr key={vendor.id}>
                      {/* Store & Address */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <div style={{ 
                            width: '36px', 
                            height: '36px', 
                            borderRadius: '8px', 
                            backgroundColor: '#eff6ff', 
                            color: '#2563eb', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '14px',
                            flexShrink: 0
                          }}>
                            {vendor.name ? vendor.name.charAt(0).toUpperCase() : 'V'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.925rem' }}>
                              {vendor.name}
                            </div>
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: 'var(--text-muted)', 
                              marginTop: '2px',
                              maxWidth: '220px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }} title={vendor.address || 'No address specified'}>
                              {vendor.address || <span style={{ fontStyle: 'italic', color: '#cbd5e1' }}>No address specified</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td>
                        <span style={{ 
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          backgroundColor: '#f1f5f9',
                          color: '#334155',
                          border: '1px solid #e2e8f0'
                        }}>
                          {vendor.service_category || 'General'}
                        </span>
                      </td>

                      {/* WhatsApp Contact with Quick Link */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <a
                            href={`https://wa.me/${cleanPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ 
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              color: '#059669',
                              backgroundColor: '#ecfdf5',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              textDecoration: 'none',
                              fontSize: '12px',
                              fontWeight: 600,
                              border: '1px solid #a7f3d0',
                              transition: 'all 150ms ease'
                            }}
                            title={`Chat with ${vendor.name} on WhatsApp`}
                          >
                            <Phone size={13} />
                            {vendor.phone}
                            <ArrowUpRight size={12} style={{ opacity: 0.7 }} />
                          </a>

                          {hasLocation && (
                            <a
                              href={`https://www.google.com/maps?q=${vendor.lat},${vendor.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: '#2563eb',
                                backgroundColor: '#eff6ff',
                                padding: '4px 6px',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                textDecoration: 'none',
                                border: '1px solid #bfdbfe'
                              }}
                              title={`View location: ${vendor.lat}, ${vendor.lng}`}
                            >
                              <MapPin size={13} />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Auto Assign Status */}
                      <td>
                        {isAutoAssign ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 9px',
                            borderRadius: '20px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe'
                          }}>
                            <Zap size={12} style={{ fill: '#3b82f6', color: '#3b82f6' }} />
                            ACTIVE ⚡
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 9px',
                            borderRadius: '20px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            backgroundColor: '#f8fafc',
                            color: '#94a3b8',
                            border: '1px solid #e2e8f0'
                          }}>
                            Manual OFF
                          </span>
                        )}
                      </td>

                      {/* Accepted Orders */}
                      <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>
                        {vendor.accepted_orders || 0}
                      </td>

                      {/* Total Volume */}
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669', fontSize: '0.95rem' }}>
                        ₹{parseFloat(vendor.total_amount || 0).toFixed(2)}
                      </td>

                      {/* Status */}
                      <td style={{ textAlign: 'center' }}>
                        <span className={`status-badge ${vendor.status === 'Active' ? 'active' : 'cancelled'}`}>
                          {vendor.status || 'Active'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button 
                            onClick={() => handleOpenModal(vendor)} 
                            className="btn btn-outline"
                            style={{ 
                              padding: '5px 10px', 
                              fontSize: '0.78rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              borderRadius: '6px'
                            }}
                            title="Edit Vendor Details"
                          >
                            <Edit2 size={13} /> Edit
                          </button>
                          <button 
                            onClick={() => handleDelete(vendor.id, vendor.name)} 
                            className="btn"
                            style={{ 
                              padding: '5px 10px', 
                              fontSize: '0.78rem', 
                              background: '#fef2f2', 
                              color: '#dc2626', 
                              border: '1px solid #fecaca',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Delete Vendor"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <div style={{ 
                        width: '54px', 
                        height: '54px', 
                        borderRadius: '50%', 
                        backgroundColor: '#f1f5f9', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: '#94a3b8'
                      }}>
                        <Store size={26} />
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        No vendors found
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '380px' }}>
                        {searchTerm || selectedCategory !== 'ALL' || selectedStatus !== 'ALL'
                          ? 'Try clearing your search query or selecting "All Categories" to view more vendors.'
                          : 'No vendors are registered yet. Click below to add your first partner store.'}
                      </div>
                      {(searchTerm || selectedCategory !== 'ALL' || selectedStatus !== 'ALL') ? (
                        <button 
                          onClick={() => { setSearchTerm(''); setSelectedCategory('ALL'); setSelectedStatus('ALL'); }}
                          className="btn btn-outline"
                          style={{ marginTop: '6px', fontSize: '0.825rem' }}
                        >
                          Clear All Filters
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleOpenModal()} 
                          className="btn btn-primary"
                          style={{ marginTop: '8px', fontSize: '0.85rem' }}
                        >
                          <Plus size={16} /> Add First Vendor
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Add / Edit Vendor Modal ─────────────────────────────────────── */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleOverlayClick}>
          <div className="modal-dialog">
            
            {/* Modal Fixed Header */}
            <div className="modal-dialog-header">
              <div>
                <h3 className="modal-dialog-title">
                  <span style={{ 
                    display: 'inline-flex', 
                    padding: '6px', 
                    borderRadius: '8px', 
                    backgroundColor: '#eff6ff', 
                    color: 'var(--primary)' 
                  }}>
                    <Store size={18} />
                  </span>
                  {isEditMode ? 'Edit Vendor Details' : 'Add New Partner Store'}
                </h3>
                <p className="modal-dialog-subtitle">
                  {isEditMode 
                    ? 'Modify shop information, dispatch categories, or GPS location' 
                    : 'Register a store partner for automated WhatsApp order assignment'}
                </p>
              </div>

              <button 
                type="button"
                onClick={handleCloseModal} 
                className="btn btn-outline"
                style={{ 
                  padding: '6px 8px', 
                  borderRadius: '8px', 
                  color: 'var(--text-muted)',
                  border: '1px solid #e2e8f0',
                  lineHeight: 1
                }}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form wrapping body and footer */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              
              {/* Modal Scrollable Body */}
              <div className="modal-dialog-body">
                
                {/* Store Name */}
                <div>
                  <label className="form-label">
                    <span>Store / Vendor Name <strong style={{ color: '#ef4444' }}>*</strong></span>
                  </label>
                  <input 
                    type="text" 
                    required
                    style={{ width: '100%', height: '40px', borderRadius: '8px' }}
                    value={currentVendor.name}
                    onChange={(e) => setCurrentVendor({ ...currentVendor, name: e.target.value })}
                    placeholder="e.g. Sri Lakshmi Kiranam & General Store"
                  />
                </div>

                {/* WhatsApp & Category (2 Columns) */}
                <div className="form-row-2">
                  <div>
                    <label className="form-label">
                      <span>WhatsApp Number <strong style={{ color: '#ef4444' }}>*</strong></span>
                    </label>
                    <div className="input-icon-group">
                      <Phone size={15} className="input-icon" />
                      <input 
                        type="text" 
                        required
                        style={{ height: '40px', borderRadius: '8px' }}
                        value={currentVendor.phone}
                        onChange={(e) => setCurrentVendor({ ...currentVendor, phone: e.target.value })}
                        placeholder="e.g. 919876543210"
                      />
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginTop: '3px' }}>
                      Include country code (e.g. 91)
                    </span>
                  </div>

                  <div>
                    <label className="form-label">
                      <span>Service Category <strong style={{ color: '#ef4444' }}>*</strong></span>
                    </label>
                    <select 
                      style={{ width: '100%', height: '40px', borderRadius: '8px' }}
                      value={currentVendor.service_category}
                      onChange={(e) => setCurrentVendor({ ...currentVendor, service_category: e.target.value })}
                      required
                    >
                      <option value="Groceries">Groceries</option>
                      <option value="Vegetables & Fruits">Vegetables & Fruits</option>
                      <option value="Food Service">Food Service</option>
                      <option value="Home Services">Home Services</option>
                      <option value="Medicines">Medicines</option>
                      <option value="AnyWork">AnyWork</option>
                      <option value="Ride">Ride</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Shop Address */}
                <div>
                  <label className="form-label">
                    <span>Shop Address</span>
                    <span className="hint">Optional</span>
                  </label>
                  <textarea 
                    style={{ width: '100%', minHeight: '56px', borderRadius: '8px', padding: '8px 12px', fontFamily: 'inherit', fontSize: '0.85rem' }}
                    value={currentVendor.address || ''}
                    onChange={(e) => setCurrentVendor({ ...currentVendor, address: e.target.value })}
                    placeholder="Enter street, landmark, city (e.g. Main Road, Near Bus Stand, Bhongir)"
                    rows="2"
                  />
                </div>

                {/* Coordinates (2 Columns) with GPS button */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" style={{ margin: 0 }}>
                      <span>GPS Coordinates</span>
                      <span className="hint" style={{ marginLeft: '6px' }}>(Optional)</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleDetectLocation}
                      disabled={detectingLocation}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563eb',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: 0
                      }}
                    >
                      <Navigation size={12} className={detectingLocation ? 'animate-spin' : ''} />
                      {detectingLocation ? 'Detecting...' : 'Use Current GPS'}
                    </button>
                  </div>

                  <div className="form-row-2">
                    <div className="input-icon-group">
                      <MapPin size={15} className="input-icon" />
                      <input 
                        type="number" 
                        step="any"
                        style={{ height: '40px', borderRadius: '8px' }}
                        value={currentVendor.lat || ''}
                        onChange={(e) => setCurrentVendor({ ...currentVendor, lat: e.target.value })}
                        placeholder="Latitude (e.g. 17.5110)"
                      />
                    </div>
                    <div className="input-icon-group">
                      <MapPin size={15} className="input-icon" />
                      <input 
                        type="number" 
                        step="any"
                        style={{ height: '40px', borderRadius: '8px' }}
                        value={currentVendor.lng || ''}
                        onChange={(e) => setCurrentVendor({ ...currentVendor, lng: e.target.value })}
                        placeholder="Longitude (e.g. 78.8920)"
                      />
                    </div>
                  </div>
                </div>

                {/* Auto Assign Toggle Feature Card */}
                <div 
                  className={`toggle-feature-card ${currentVendor.auto_assign ? 'active' : ''}`}
                  onClick={() => setCurrentVendor(prev => ({ ...prev, auto_assign: !prev.auto_assign }))}
                >
                  <input 
                    type="checkbox"
                    id="auto_assign_toggle"
                    checked={currentVendor.auto_assign}
                    onChange={(e) => setCurrentVendor({ ...currentVendor, auto_assign: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', marginTop: '2px', accentColor: '#2563eb' }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong style={{ fontSize: '0.875rem', color: '#1e293b' }}>
                        Auto-Assign Orders via WhatsApp
                      </strong>
                      <span style={{ 
                        fontSize: '10px', 
                        fontWeight: 700, 
                        padding: '1px 6px', 
                        borderRadius: '6px', 
                        backgroundColor: currentVendor.auto_assign ? '#dbeafe' : '#e2e8f0',
                        color: currentVendor.auto_assign ? '#1d4ed8' : '#64748b'
                      }}>
                        {currentVendor.auto_assign ? 'ENABLED ⚡' : 'DISABLED'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px', lineHeight: 1.35 }}>
                      When enabled, incoming customer orders in <strong>{currentVendor.service_category || 'this category'}</strong> are automatically routed to this vendor via WhatsApp.
                    </div>
                  </div>
                </div>

                {/* Status Dropdown */}
                <div>
                  <label className="form-label">
                    <span>Store Status</span>
                  </label>
                  <select 
                    style={{ width: '100%', height: '40px', borderRadius: '8px' }}
                    value={currentVendor.status}
                    onChange={(e) => setCurrentVendor({ ...currentVendor, status: e.target.value })}
                  >
                    <option value="Active">Active (Accepting Orders)</option>
                    <option value="Inactive">Inactive (Suspended)</option>
                  </select>
                </div>

              </div>

              {/* Modal Fixed Footer */}
              <div className="modal-dialog-footer">
                <button 
                  type="button" 
                  onClick={handleCloseModal}
                  className="btn btn-outline"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '120px', justifyContent: 'center' }}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      {isEditMode ? 'Update Vendor' : 'Save Vendor'}
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
