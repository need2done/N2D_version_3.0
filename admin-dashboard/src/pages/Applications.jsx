import { useState, useEffect } from 'react';
import {
  ClipboardCheck, Search, Filter, RefreshCw, Eye, CheckCircle2,
  XCircle, AlertCircle, Clock, FileText, Download, User, Store,
  Phone, Mail, MapPin, Calendar, ShieldCheck, ChevronLeft, ChevronRight,
  MessageSquare, AlertTriangle, Send, X, Edit, CreditCard
} from 'lucide-react';
import { API_URL } from '../config';

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [metrics, setMetrics] = useState({
    total: 0, new_today: 0, pending_review: 0,
    under_verification: 0, additional_info_required: 0, approved: 0, rejected: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // Modals & Details
  const [selectedApp, setSelectedApp] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(null); // 'APPROVE' | 'REJECT' | 'REQUEST_INFO' | 'UNDER_VERIFICATION'
  const [modalReason, setModalReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [newNote, setNewNote] = useState('');

  // Bank Details Modal State
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankFormData, setBankFormData] = useState({
    bank_holder_name: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    upi_id: ''
  });
  const [bankSubmitting, setBankSubmitting] = useState(false);
  const [bankError, setBankError] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const getAdminToken = () => {
    return localStorage.getItem('adminToken') || localStorage.getItem('token') || '';
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit,
        type: typeFilter,
        status: statusFilter,
        search: searchTerm
      });

      const res = await fetch(`${API_URL}/applications?${params.toString()}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setApplications(data.applications || []);
        setMetrics(data.metrics || {});
        setTotalPages(data.pagination?.totalPages || 1);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch applications');
      }
    } catch (err) {
      console.error(err);
      setError('Cannot connect to backend server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [typeFilter, statusFilter, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchApplications();
  };

  const viewApplicationDetails = async (appId) => {
    setDetailsLoading(true);
    try {
      const res = await fetch(`${API_URL}/applications/${appId}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setSelectedApp(data);
      } else {
        alert(data.error || 'Failed to fetch application details');
      }
    } catch (err) {
      console.error(err);
      alert('Error fetching application details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleStatusChange = async (targetStatus) => {
    if (!selectedApp) return;
    const appId = selectedApp.application.application_id;

    if (targetStatus === 'REJECTED' && !modalReason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }
    if (targetStatus === 'ADDITIONAL_INFO_REQUIRED' && !modalReason.trim()) {
      alert('Please specify the additional details or documents required.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/applications/${appId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          status: targetStatus,
          rejection_reason: targetStatus === 'REJECTED' ? modalReason : null,
          additional_info_request: targetStatus === 'ADDITIONAL_INFO_REQUIRED' ? modalReason : null,
          note: modalReason || `Status updated to ${targetStatus}`
        })
      });

      const data = await res.json();
      if (data.success) {
        setShowStatusModal(null);
        setModalReason('');
        await viewApplicationDetails(appId);
        fetchApplications();
      } else {
        alert(data.error || 'Failed to update status');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update application status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedApp) return;
    const appId = selectedApp.application.application_id;

    try {
      const res = await fetch(`${API_URL}/applications/${appId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ note: newNote.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setNewNote('');
        viewApplicationDetails(appId);
      } else {
        alert(data.error || 'Failed to add note');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to add note');
    }
  };

  const openBankModal = () => {
    if (!selectedApp) return;
    const app = selectedApp.application;
    setBankFormData({
      bank_holder_name: app.bank_holder_name || '',
      bank_name: app.bank_name || '',
      account_number: '',
      ifsc_code: app.ifsc_code || '',
      upi_id: app.upi_id || ''
    });
    setBankError('');
    setShowBankModal(true);
  };

  const handleUpdateBankDetails = async (e) => {
    e.preventDefault();
    if (!selectedApp) return;
    setBankSubmitting(true);
    setBankError('');
    try {
      const res = await fetch(`${API_URL}/applications/${selectedApp.application.application_id}/bank`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(bankFormData)
      });
      const data = await res.json();
      if (data.success) {
        setSelectedApp(prev => ({
          ...prev,
          application: {
            ...prev.application,
            ...data.bank_details
          }
        }));
        setShowBankModal(false);
        viewApplicationDetails(selectedApp.application.application_id);
      } else {
        setBankError(data.error || 'Failed to update bank details');
      }
    } catch (err) {
      console.error(err);
      setBankError('Failed to communicate with server.');
    } finally {
      setBankSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      'SUBMITTED': { label: 'Submitted', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
      'PENDING_REVIEW': { label: 'Pending Review', bg: '#fef3c7', color: '#b45309', border: '#fcd34d' },
      'UNDER_VERIFICATION': { label: 'Under Verification', bg: '#e0f2fe', color: '#0369a1', border: '#7dd3fc' },
      'ADDITIONAL_INFO_REQUIRED': { label: 'Info Required', bg: '#ffedd5', color: '#c2410c', border: '#fdba74' },
      'APPROVED': { label: 'Approved', bg: '#dcfce7', color: '#15803d', border: '#86efac' },
      'REJECTED': { label: 'Rejected', bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' }
    };
    const s = map[status] || { label: status, bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
    return (
      <span style={{
        backgroundColor: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        padding: '3px 8px',
        borderRadius: '999px',
        fontSize: '0.74rem',
        fontWeight: '700',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        {s.label}
      </span>
    );
  };

  const getDocumentUrl = (appId, docId) => {
    const token = getAdminToken();
    return `${API_URL}/applications/${appId}/documents/${docId}?token=${encodeURIComponent(token)}`;
  };

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* Page Header */}
      <div className="page-header-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
            <ClipboardCheck size={28} color="#0284c7" />
            Helper / Vendor Applications
          </h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.88rem' }}>
            Review candidate registrations, verify KYC documents, and manage approval workflows.
          </p>
        </div>
        <button
          className="btn btn-outline"
          onClick={fetchApplications}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}
        >
          <RefreshCw size={15} /> Refresh List
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #fca5a5' }}>
          {error}
        </div>
      )}

      {/* Summary Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '14px', borderLeft: '4px solid #64748b' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '4px' }}>{metrics.total || 0}</div>
        </div>
        <div className="card" style={{ padding: '14px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' }}>New Today</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '4px' }}>{metrics.new_today || 0}</div>
        </div>
        <div className="card" style={{ padding: '14px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase' }}>Pending Review</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '4px' }}>{metrics.pending_review || 0}</div>
        </div>
        <div className="card" style={{ padding: '14px', borderLeft: '4px solid #0284c7' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>Verifying</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '4px' }}>{metrics.under_verification || 0}</div>
        </div>
        <div className="card" style={{ padding: '14px', borderLeft: '4px solid #ea580c' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ea580c', textTransform: 'uppercase' }}>Info Required</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '4px' }}>{metrics.additional_info_required || 0}</div>
        </div>
        <div className="card" style={{ padding: '14px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>Approved</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '4px' }}>{metrics.approved || 0}</div>
        </div>
        <div className="card" style={{ padding: '14px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>Rejected</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '4px' }}>{metrics.rejected || 0}</div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '260px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by ID, name, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
            Search
          </button>
        </form>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Category Filter */}
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff' }}
          >
            <option value="ALL">All Categories (Helper & Vendor)</option>
            <option value="HELPER">🛵 Helpers Only</option>
            <option value="VENDOR">🏪 Vendors Only</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="UNDER_VERIFICATION">Under Verification</option>
            <option value="ADDITIONAL_INFO_REQUIRED">Additional Info Required</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Applications Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '12px 16px' }}>App ID</th>
                <th style={{ padding: '12px 16px' }}>Applicant / Business</th>
                <th style={{ padding: '12px 16px' }}>Type</th>
                <th style={{ padding: '12px 16px' }}>Mobile</th>
                <th style={{ padding: '12px 16px' }}>Location</th>
                <th style={{ padding: '12px 16px' }}>Category</th>
                <th style={{ padding: '12px 16px' }}>Docs</th>
                <th style={{ padding: '12px 16px' }}>Submitted</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    Loading applications...
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    No registration applications match the current filter criteria.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#0369a1' }}>
                      {app.application_id}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{app.name}</div>
                      {app.owner_name && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Owner: {app.owner_name}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {app.type === 'HELPER' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#0284c7', fontWeight: 600 }}>
                          <User size={13} /> Helper
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#8b5cf6', fontWeight: 600 }}>
                          <Store size={13} /> Vendor
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>{app.phone}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      {[app.village_town, app.district].filter(Boolean).join(', ') || 'Telangana'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '0.78rem' }}>
                        {app.service_category || app.business_category || 'N/A'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ color: app.document_count > 0 ? '#0284c7' : '#94a3b8', fontWeight: 600 }}>
                        {app.document_count} file(s)
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.78rem' }}>
                      {new Date(app.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {getStatusBadge(app.status)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        className="btn btn-outline"
                        onClick={() => viewApplicationDetails(app.application_id)}
                        style={{ padding: '5px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Eye size={13} /> Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
          <div style={{ color: '#64748b' }}>
            Page {page} of {totalPages}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-outline"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{ padding: '5px 10px', fontSize: '0.8rem' }}
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <button
              className="btn btn-outline"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              style={{ padding: '5px 10px', fontSize: '0.8rem' }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Application Details Modal */}
      {selectedApp && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '14px', width: '100%', maxWidth: '900px',
            maxHeight: '90vh', overflowY: 'auto', padding: '24px', position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                    {selectedApp.application.name}
                  </h3>
                  {getStatusBadge(selectedApp.application.status)}
                  <span style={{ fontSize: '0.78rem', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                    {selectedApp.application.type}
                  </span>
                </div>
                <div style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '4px', display: 'flex', gap: '16px' }}>
                  <span>App ID: <strong style={{ color: '#0369a1', fontFamily: 'monospace' }}>{selectedApp.application.application_id}</strong></span>
                  <span>Submitted: {new Date(selectedApp.application.created_at).toLocaleString('en-IN')}</span>
                  {selectedApp.application.assigned_reviewer && (
                    <span>Reviewer: <strong>{selectedApp.application.assigned_reviewer}</strong></span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Quick Action Ribbon */}
            <div style={{ backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Change Status:</span>
              <button
                className="btn btn-primary"
                onClick={() => { setShowStatusModal('APPROVE'); setModalReason(''); }}
                style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', padding: '6px 12px', fontSize: '0.8rem' }}
              >
                <CheckCircle2 size={14} /> Approve
              </button>
              <button
                className="btn btn-outline"
                onClick={() => { setShowStatusModal('UNDER_VERIFICATION'); setModalReason(''); }}
                style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#0284c7', borderColor: '#0284c7' }}
              >
                <Clock size={14} /> Move to Verification
              </button>
              <button
                className="btn btn-outline"
                onClick={() => { setShowStatusModal('REQUEST_INFO'); setModalReason(''); }}
                style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#ea580c', borderColor: '#ea580c' }}
              >
                <AlertCircle size={14} /> Request More Info
              </button>
              <button
                className="btn btn-outline"
                onClick={() => { setShowStatusModal('REJECT'); setModalReason(''); }}
                style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#dc2626', borderColor: '#dc2626' }}
              >
                <XCircle size={14} /> Reject
              </button>
            </div>

            {/* Application Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              {/* Section 1: Contact & Personal Details */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={16} /> Contact & Personal Details
                </h4>
                <div style={{ fontSize: '0.82rem', lineHeight: '1.7' }}>
                  <div><strong>Legal Name:</strong> {selectedApp.application.name}</div>
                  {selectedApp.application.owner_name && (
                    <div><strong>Owner / Proprietor:</strong> {selectedApp.application.owner_name}</div>
                  )}
                  <div><strong>Mobile Phone:</strong> {selectedApp.application.phone}</div>
                  <div><strong>WhatsApp Phone:</strong> {selectedApp.application.whatsapp_number || selectedApp.application.phone}</div>
                  <div><strong>Email Address:</strong> {selectedApp.application.email}</div>
                  {selectedApp.application.dob && (
                    <div><strong>Date of Birth:</strong> {selectedApp.application.dob}</div>
                  )}
                  {selectedApp.application.gender && (
                    <div><strong>Gender:</strong> {selectedApp.application.gender}</div>
                  )}
                  <div><strong>Complete Address:</strong> {selectedApp.application.address}</div>
                  <div>
                    <strong>Location:</strong> {[selectedApp.application.village_town, selectedApp.application.mandal, selectedApp.application.district, selectedApp.application.state].filter(Boolean).join(', ')} — {selectedApp.application.pincode}
                  </div>
                  {selectedApp.application.emergency_contact && (
                    <div><strong>Emergency Contact:</strong> {selectedApp.application.emergency_contact}</div>
                  )}
                </div>
              </div>

              {/* Section 2: Service & Vehicle / Business Specifics */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {selectedApp.application.type === 'HELPER' ? <ShieldCheck size={16} /> : <Store size={16} />}
                  {selectedApp.application.type === 'HELPER' ? 'Service & Vehicle Information' : 'Business Particulars'}
                </h4>
                <div style={{ fontSize: '0.82rem', lineHeight: '1.7' }}>
                  {selectedApp.application.type === 'HELPER' ? (
                    <>
                      <div><strong>Service Category:</strong> {selectedApp.application.service_category}</div>
                      <div><strong>Vehicle Type:</strong> {selectedApp.application.vehicle_type || 'None (Walking / Bicycle)'}</div>
                      {selectedApp.application.vehicle_reg_number && (
                        <div><strong>Vehicle Reg No:</strong> {selectedApp.application.vehicle_reg_number}</div>
                      )}
                      {selectedApp.application.vehicle_make_model && (
                        <div><strong>Make & Model:</strong> {selectedApp.application.vehicle_make_model} ({selectedApp.application.vehicle_year || 'N/A'})</div>
                      )}
                      {selectedApp.application.driving_license_number && (
                        <div><strong>Driving Licence No:</strong> {selectedApp.application.driving_license_number}</div>
                      )}
                      {selectedApp.application.driving_experience_years !== null && (
                        <div><strong>Driving Experience:</strong> {selectedApp.application.driving_experience_years} years</div>
                      )}
                      <div><strong>Availability:</strong> {selectedApp.application.availability_type} ({selectedApp.application.preferred_hours || 'Flexible'})</div>
                      <div><strong>Preferred Area:</strong> {selectedApp.application.preferred_area || 'Bhongir & Surrounding Zones'}</div>
                    </>
                  ) : (
                    <>
                      <div><strong>Shop / Business Name:</strong> {selectedApp.application.business_name || selectedApp.application.name}</div>
                      <div><strong>Business Category:</strong> {selectedApp.application.business_category || 'Retail'}</div>
                      <div><strong>Products / Services:</strong> {selectedApp.application.products_offered || 'N/A'}</div>
                      <div><strong>Operating Hours:</strong> {selectedApp.application.operating_hours || 'General Shop Hours'}</div>
                      {selectedApp.application.years_in_business !== null && (
                        <div><strong>Years in Business:</strong> {selectedApp.application.years_in_business} years</div>
                      )}
                      {selectedApp.application.gst_number && (
                        <div><strong>GST Registration No:</strong> {selectedApp.application.gst_number}</div>
                      )}
                      {selectedApp.application.business_description && (
                        <div><strong>Description:</strong> {selectedApp.application.business_description}</div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Bank & Payout Details (Masked) */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginBottom: '20px', backgroundColor: '#fcfcfd' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CreditCard size={16} /> Payout & Banking Details (Protected & Masked)
                </h4>
                <button
                  className="btn btn-outline"
                  onClick={openBankModal}
                  style={{ padding: '4px 10px', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  <Edit size={13} /> {selectedApp.application.bank_holder_name ? 'Edit Bank Details' : '+ Add Bank Details'}
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', fontSize: '0.82rem' }}>
                <div><strong>Account Holder:</strong> {selectedApp.application.bank_holder_name || <span style={{ color: '#94a3b8' }}>Not provided</span>}</div>
                <div><strong>Bank Name:</strong> {selectedApp.application.bank_name || <span style={{ color: '#94a3b8' }}>Not provided</span>}</div>
                <div><strong>Account Number:</strong> <span style={{ fontFamily: 'monospace' }}>{selectedApp.application.bank_account_masked || <span style={{ color: '#94a3b8' }}>Not provided</span>}</span></div>
                <div><strong>IFSC Code:</strong> <span style={{ fontFamily: 'monospace' }}>{selectedApp.application.ifsc_code || <span style={{ color: '#94a3b8' }}>Not provided</span>}</span></div>
                <div><strong>UPI ID:</strong> {selectedApp.application.upi_id || <span style={{ color: '#94a3b8' }}>Not provided</span>}</div>
              </div>
            </div>

            {/* Section 4: Uploaded KYC Documents */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={16} /> Uploaded KYC & Legal Documents ({selectedApp.documents.length})
              </h4>
              {selectedApp.documents.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0 }}>No documents were uploaded with this submission.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                  {selectedApp.documents.map((doc) => (
                    <div key={doc.id} style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0284c7' }}>{doc.doc_type}</div>
                        <div style={{ fontSize: '0.75rem', color: '#475569', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                          {doc.original_name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          {(doc.file_size / 1024).toFixed(1)} KB • {doc.mime_type}
                        </div>
                      </div>
                      <a
                        href={getDocumentUrl(selectedApp.application.application_id, doc.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline"
                        style={{ padding: '6px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Eye size={12} /> View
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 5: Internal Review Notes & Status History */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Internal Notes */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageSquare size={16} /> Internal Review Notes
                </h4>
                <form onSubmit={handleAddNote} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input
                    type="text"
                    placeholder="Add an internal reviewer note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    style={{ flex: 1, padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '7px 12px', fontSize: '0.8rem' }}>
                    <Send size={13} /> Add
                  </button>
                </form>
                <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                  {selectedApp.notes.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>No internal notes recorded.</div>
                  ) : (
                    selectedApp.notes.map((n) => (
                      <div key={n.id} style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '6px', marginBottom: '8px', fontSize: '0.78rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.72rem', marginBottom: '2px' }}>
                          <strong>{n.author}</strong>
                          <span>{new Date(n.created_at).toLocaleString('en-IN')}</span>
                        </div>
                        <div>{n.note}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Status Audit History */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={16} /> Audit History
                </h4>
                <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                  {selectedApp.history.map((h) => (
                    <div key={h.id} style={{ borderLeft: '2px solid #0284c7', paddingLeft: '10px', marginBottom: '10px', fontSize: '0.78rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.72rem' }}>
                        <span>Status: <strong>{h.to_status}</strong></span>
                        <span>{new Date(h.created_at).toLocaleString('en-IN')}</span>
                      </div>
                      <div style={{ color: '#334155' }}>{h.notes}</div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>By: {h.changed_by}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Decision / Reason Modal */}
      {showStatusModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.8)', zIndex: 1100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '480px',
            padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem' }}>
              {showStatusModal === 'APPROVE' && 'Confirm Application Approval'}
              {showStatusModal === 'REJECT' && 'Reject Application'}
              {showStatusModal === 'REQUEST_INFO' && 'Request Additional Information'}
              {showStatusModal === 'UNDER_VERIFICATION' && 'Move to Under Verification'}
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.84rem', margin: '0 0 16px' }}>
              {showStatusModal === 'APPROVE' && 'An approval confirmation will be recorded and an email notification sent to the applicant.'}
              {showStatusModal === 'REJECT' && 'Please specify the reason for rejection. This will be recorded and communicated in the status email.'}
              {showStatusModal === 'REQUEST_INFO' && 'Specify what documents or details the applicant must provide.'}
              {showStatusModal === 'UNDER_VERIFICATION' && 'Mark that background checks and document scrutiny are underway.'}
            </p>

            {(showStatusModal === 'REJECT' || showStatusModal === 'REQUEST_INFO' || showStatusModal === 'APPROVE') && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: '#475569' }}>
                  {showStatusModal === 'REJECT' ? 'REJECTION REASON (MANDATORY)' : (showStatusModal === 'REQUEST_INFO' ? 'REQUESTED DETAILS (MANDATORY)' : 'OPTIONAL ONBOARDING NOTE')}
                </label>
                <textarea
                  rows="3"
                  value={modalReason}
                  onChange={(e) => setModalReason(e.target.value)}
                  placeholder={
                    showStatusModal === 'REJECT'
                      ? 'e.g. Driving licence expired / Vehicle model does not satisfy age criteria...'
                      : (showStatusModal === 'REQUEST_INFO' ? 'e.g. Please provide a clear scan of your Aadhaar back side...' : 'e.g. Welcoming partner, scheduling onboarding session...')
                  }
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="btn btn-outline"
                disabled={actionLoading}
                onClick={() => setShowStatusModal(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={actionLoading}
                onClick={() => {
                  if (showStatusModal === 'APPROVE') handleStatusChange('APPROVED');
                  if (showStatusModal === 'REJECT') handleStatusChange('REJECTED');
                  if (showStatusModal === 'REQUEST_INFO') handleStatusChange('ADDITIONAL_INFO_REQUIRED');
                  if (showStatusModal === 'UNDER_VERIFICATION') handleStatusChange('UNDER_VERIFICATION');
                }}
                style={{
                  backgroundColor: showStatusModal === 'APPROVE' ? '#16a34a' : (showStatusModal === 'REJECT' ? '#dc2626' : '#0284c7'),
                  borderColor: showStatusModal === 'APPROVE' ? '#16a34a' : (showStatusModal === 'REJECT' ? '#dc2626' : '#0284c7')
                }}
              >
                {actionLoading ? 'Updating...' : 'Confirm Status Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Add Bank Details Modal */}
      {showBankModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '500px',
            padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={20} color="#0284c7" />
                Manage Payout & Bank Details
              </h3>
              <button
                onClick={() => setShowBankModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.84rem', margin: '0 0 16px' }}>
              Securely record or update verified bank account and payout details for candidate <strong>{selectedApp?.application?.application_id}</strong>.
            </p>

            {bankError && (
              <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', fontSize: '0.82rem' }}>
                {bankError}
              </div>
            )}

            <form onSubmit={handleUpdateBankDetails}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  ACCOUNT HOLDER NAME
                </label>
                <input
                  type="text"
                  value={bankFormData.bank_holder_name}
                  onChange={(e) => setBankFormData({ ...bankFormData, bank_holder_name: e.target.value })}
                  placeholder="Legal name on bank record"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  BANK NAME
                </label>
                <input
                  type="text"
                  value={bankFormData.bank_name}
                  onChange={(e) => setBankFormData({ ...bankFormData, bank_name: e.target.value })}
                  placeholder="e.g. State Bank of India / HDFC Bank"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  ACCOUNT NUMBER {selectedApp?.application?.bank_account_masked && `(Current: ${selectedApp.application.bank_account_masked})`}
                </label>
                <input
                  type="text"
                  value={bankFormData.account_number}
                  onChange={(e) => setBankFormData({ ...bankFormData, account_number: e.target.value })}
                  placeholder={selectedApp?.application?.bank_account_masked ? 'Enter new number to update' : 'Full account number'}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    IFSC CODE
                  </label>
                  <input
                    type="text"
                    value={bankFormData.ifsc_code}
                    onChange={(e) => setBankFormData({ ...bankFormData, ifsc_code: e.target.value.toUpperCase() })}
                    placeholder="e.g. SBIN0020123"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', textTransform: 'uppercase' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    UPI ID (OPTIONAL)
                  </label>
                  <input
                    type="text"
                    value={bankFormData.upi_id}
                    onChange={(e) => setBankFormData({ ...bankFormData, upi_id: e.target.value })}
                    placeholder="e.g. name@oksbi"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={bankSubmitting}
                  onClick={() => setShowBankModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={bankSubmitting}
                >
                  {bankSubmitting ? 'Saving...' : 'Save Bank Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
