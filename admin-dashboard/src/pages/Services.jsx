import React, { useState, useEffect } from 'react';
import { Layers, CheckCircle2, XCircle, RefreshCw, Sparkles, ShieldCheck, Power } from 'lucide-react';
import './Settings.css'; // Re-use sleek settings styling

const Services = () => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [message, setMessage] = useState(null);

    const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

    const fetchServices = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API_BASE}/services`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                setServices(data.services || []);
            }
        } catch (err) {
            console.error('Error loading services:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServices();
    }, []);

    const toggleService = async (serviceId, currentStatus) => {
        setUpdatingId(serviceId);
        setMessage(null);
        try {
            const token = localStorage.getItem('adminToken');
            const newStatus = currentStatus === 1 ? 0 : 1;

            const res = await fetch(`${API_BASE}/services/${serviceId}/toggle`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ is_active: newStatus })
            });

            const data = await res.json();
            if (data.success) {
                setServices(prev => prev.map(s => 
                    s.service_id === serviceId ? { ...s, is_active: newStatus } : s
                ));
                const sName = services.find(s => s.service_id === serviceId)?.title || 'Service';
                setMessage({
                    type: newStatus === 1 ? 'success' : 'info',
                    text: `${sName} is now ${newStatus === 1 ? 'ACTIVE' : 'INACTIVE (Hidden from Bot & Customers)'}.`
                });
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to update status' });
            }
        } catch (err) {
            console.error('Toggle error:', err);
            setMessage({ type: 'error', text: 'Network error updating service status' });
        } finally {
            setUpdatingId(null);
        }
    };

    const activeCount = services.filter(s => s.is_active === 1).length;
    const inactiveCount = services.filter(s => s.is_active === 0).length;

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
                        <Layers className="text-cyan-400" size={32} />
                        Services Management
                    </h1>
                    <p style={{ color: '#94a3b8', marginTop: '6px', fontSize: '14px' }}>
                        Control which services are active on the platform and visible in the WhatsApp Bot.
                    </p>
                </div>

                <button 
                    onClick={fetchServices} 
                    disabled={loading}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 18px',
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '10px',
                        color: '#e2e8f0',
                        cursor: 'pointer',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                    }}
                >
                    <RefreshCw size={16} className={loading ? 'spin' : ''} />
                    Refresh Status
                </button>
            </div>

            {/* Notification Alert */}
            {message && (
                <div style={{
                    padding: '14px 20px',
                    borderRadius: '12px',
                    marginBottom: '24px',
                    background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : message.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    border: `1px solid ${message.type === 'success' ? '#10b981' : message.type === 'error' ? '#ef4444' : '#3b82f6'}`,
                    color: message.type === 'success' ? '#34d399' : message.type === 'error' ? '#f87171' : '#60a5fa',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between'
                }}>
                    <span>{message.text}</span>
                    <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px' }}>✕</button>
                </div>
            )}

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>ACTIVE SERVICES</div>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#f8fafc' }}>{activeCount}</div>
                    </div>
                </div>

                <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <XCircle size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>INACTIVE / HIDDEN</div>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#f8fafc' }}>{inactiveCount}</div>
                    </div>
                </div>

                <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>WHATSAPP BOT SYNC</div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#34d399', marginTop: '4px' }}>Real-time Live Sync</div>
                    </div>
                </div>
            </div>

            {/* Service Grid */}
            {loading ? (
                <div style={{ textAlignment: 'center', padding: '60px', color: '#94a3b8' }}>
                    <RefreshCw className="spin" size={32} style={{ marginBottom: '12px' }} />
                    <div>Loading service configuration...</div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
                    {services.map(s => {
                        const isActive = s.is_active === 1;
                        const isUpdating = updatingId === s.service_id;

                        return (
                            <div 
                                key={s.service_id}
                                style={{
                                    background: '#1e293b',
                                    borderRadius: '16px',
                                    border: isActive ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid #334155',
                                    padding: '24px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifySpace: 'space-between',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    boxShadow: isActive ? '0 10px 25px -5px rgba(16, 185, 129, 0.1)' : 'none',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                {/* Top indicator line */}
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: '4px',
                                    background: isActive ? 'linear-gradient(90deg, #10b981, #059669)' : '#475569'
                                }} />

                                <div>
                                    {/* Header Row */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ fontSize: '28px' }}>{s.icon || '⚙️'}</span>
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#f8fafc' }}>
                                                    {s.title}
                                                </h3>
                                                <span style={{ 
                                                    fontSize: '11px', 
                                                    fontWeight: '600', 
                                                    textTransform: 'uppercase',
                                                    color: '#94a3b8',
                                                    background: '#0f172a',
                                                    padding: '2px 8px',
                                                    borderRadius: '6px',
                                                    display: 'inline-block',
                                                    marginTop: '4px'
                                                }}>
                                                    {s.category || 'Platform'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Status Badge */}
                                        <span style={{
                                            fontSize: '12px',
                                            fontWeight: '700',
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            background: isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                                            color: isActive ? '#34d399' : '#94a3b8',
                                            border: `1px solid ${isActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(148, 163, 184, 0.3)'}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}>
                                            <span style={{
                                                width: '6px',
                                                height: '6px',
                                                borderRadius: '50%',
                                                background: isActive ? '#10b981' : '#94a3b8',
                                                boxShadow: isActive ? '0 0 8px #10b981' : 'none'
                                            }} />
                                            {isActive ? 'ACTIVE' : 'INACTIVE'}
                                        </span>
                                    </div>

                                    <p style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: '1.5', margin: '0 0 20px 0' }}>
                                        {s.description}
                                    </p>
                                </div>

                                {/* Control Footer */}
                                <div style={{ 
                                    paddingTop: '16px', 
                                    borderTop: '1px solid #334155', 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center' 
                                }}>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                                        Service ID: #{s.service_id}
                                    </span>

                                    <button
                                        onClick={() => toggleService(s.service_id, s.is_active)}
                                        disabled={isUpdating}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '8px 16px',
                                            borderRadius: '10px',
                                            fontWeight: '600',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            border: 'none',
                                            transition: 'all 0.2s',
                                            background: isActive ? '#ef4444' : '#10b981',
                                            color: '#ffffff',
                                            boxShadow: isActive ? '0 4px 12px rgba(239, 68, 68, 0.25)' : '0 4px 12px rgba(16, 185, 129, 0.25)'
                                        }}
                                    >
                                        <Power size={14} />
                                        {isUpdating ? 'Updating...' : isActive ? 'Deactivate' : 'Activate Service'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Services;
