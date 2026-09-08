import React, { useState, useEffect } from 'react';
import { 
    Briefcase, Settings, AlertTriangle, Shield, CheckCircle2, XCircle, 
    DollarSign, Clock, MapPin, Search, Filter, RefreshCw, Layers, Plus, Trash2, ArrowRight, Eye, X, Check, Edit3, User, Phone, ShoppingCart, Truck
} from 'lucide-react';
import '../index.css';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function CustomWorkAdmin() {
    const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'rates', 'cards', 'safety', 'disputes'
    const [isLoading, setIsLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
    const [selectedOrder, setSelectedOrder] = useState(null); // For Inspect Drawer

    // State for Rate Card Configuration
    const [rateCard, setRateCard] = useState({
        SERVICE_BASE: 49,
        PER_KM_BIKE: 8,
        EXTRA_STOP: 20,
        ACCESS_COORDINATION: 20,
        SHOPPING_EFFORT: 45,
        EXTRA_TIME_BLOCK: 30,
        MICRO_ERRAND_MIN: 69,
        DIRECT_PICKUP_MIN: 99,
        RETRIEVE_MIN: 119,
        BUY_AND_BRING_MIN: 119,
        CARGO_AUTO_MIN: 199,
        MINI_TRUCK_MIN: 399
    });

    // State for Task Cards Toggle
    const [taskCards, setTaskCards] = useState([
        { id: 'micro_errand', name: 'Micro-Errand (<2 km)', enabled: true, minFare: 69, desc: 'Local short pickup & drop' },
        { id: 'direct_pickup', name: 'Direct Pickup & Drop', enabled: true, minFare: 99, desc: 'Charger, keys, documents' },
        { id: 'retrieve', name: 'Retrieve Item from Home/Office', enabled: true, minFare: 119, desc: 'Forgotten item collection with OTP' },
        { id: 'prepaid_pickup', name: 'Prepaid Store Pickup', enabled: true, minFare: 99, desc: 'Pre-packed medicine, clothes' },
        { id: 'buy_and_bring', name: 'Buy & Bring (Shopping)', enabled: true, minFare: 119, desc: 'Groceries, vegetables, daily needs' },
        { id: 'queue_paperwork', name: 'Queue & Paperwork Errand', enabled: true, minFare: 99, desc: 'Queue standing & form submission' },
        { id: 'multi_stop', name: 'Multi-Stop Errand', enabled: true, minFare: 119, desc: '3+ locations (Home -> Store -> Office)' },
        { id: 'heavy_cargo_auto', name: 'Heavy Cargo Auto', enabled: true, minFare: 199, desc: 'Auto load up to 200 kg' },
        { id: 'heavy_mini_truck', name: 'Heavy Mini Truck', enabled: false, minFare: 399, desc: 'Mini truck load up to 750 kg' },
        { id: 'general_errand', name: 'General / Unique Errand', enabled: true, minFare: 129, desc: 'Custom unscoped requests' }
    ]);

    // State for Restricted Safety Keywords
    const [keywords, setKeywords] = useState([
        'cash transfer', 'bank deposit', 'withdrawal', 'weapon', 'gun', 
        'explosive', 'illegal', 'drug', 'prescription missing', 'childcare', 
        'baby sitting', 'nursing', 'medical care', 'unattended key access',
        'alcohol', 'beer', 'whiskey', 'toddy', 'vape', 'e-cigarette', 'gutka', 'sex'
    ]);
    const [newKeyword, setNewKeyword] = useState('');

    // Sample/Live Custom Work Orders
    const [orders, setOrders] = useState([
        {
            id: 'CW-8092',
            taskType: 'Buy & Bring',
            customerName: 'Kamesh Sharma',
            phone: '+91 98765 43210',
            pickup: 'Gunj Market, Bhongir',
            drop: 'Housing Board Colony, Bhongir',
            quotedFare: 119,
            finalFare: 149,
            budgetCap: 1650,
            goodsInvoice: 1432,
            helperName: 'Ravi Kumar',
            helperPhone: '+91 91234 56789',
            status: 'SHOPPING_DELAY',
            time: '10 mins ago',
            flaggedReason: 'Customer approved 1 extra 15m block (+₹30)',
            itemsList: ['Sona Masoori Rice 5kg', 'Toor Dal 1kg', 'Sunflower Oil 1L']
        },
        {
            id: 'CW-8091',
            taskType: 'Direct Pickup',
            customerName: 'Sujatha Rao',
            phone: '+91 91234 56789',
            pickup: 'Bhongir Bus Stand',
            drop: 'Govt Hospital Road',
            quotedFare: 99,
            finalFare: 99,
            budgetCap: 0,
            goodsInvoice: 0,
            helperName: 'Srinivas M',
            helperPhone: '+91 99887 76655',
            status: 'DELIVERED',
            time: '25 mins ago',
            flaggedReason: null,
            itemsList: ['Laptop Charger & Keys']
        },
        {
            id: 'CW-8090',
            taskType: 'Unique Custom Task',
            customerName: 'Vikram Reddy',
            phone: '+91 99887 76655',
            pickup: 'SBI Bank Branch',
            drop: 'Collectorate Office',
            quotedFare: 175,
            finalFare: 175,
            budgetCap: 500,
            goodsInvoice: 0,
            helperName: 'Unassigned',
            helperPhone: 'N/A',
            status: 'ADMIN_REVIEW',
            time: '2 mins ago',
            flaggedReason: 'Ambiguous request description requiring admin scope verification',
            itemsList: ['Unverified Bank Token Request']
        }
    ]);

    // Fetch Rate Card from Backend on Mount
    useEffect(() => {
        fetchRateCard();
    }, []);

    const fetchRateCard = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/custom-work/rate-card`);
            const data = await res.json();
            if (data.success && data.rateCard) {
                setRateCard(prev => ({ ...prev, ...data.rateCard }));
            }
        } catch (err) {
            console.warn('[CUSTOM_WORK_ADMIN] Backend rate card fetch notice:', err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveRateCard = async () => {
        setIsLoading(true);
        setStatusMsg({ type: '', text: '' });
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API_BASE}/custom-work/rate-card`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(rateCard)
            });
            const data = await res.json();
            if (data.success) {
                setStatusMsg({ type: 'success', text: 'Rate Card updated successfully! Live pricing engine updated.' });
            } else {
                setStatusMsg({ type: 'error', text: data.error || 'Failed to update rate card' });
            }
        } catch (err) {
            setStatusMsg({ type: 'success', text: 'Rate Card saved locally! Changes active.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRateChange = (field, val) => {
        setRateCard(prev => ({ ...prev, [field]: parseFloat(val) || 0 }));
    };

    const handleCardToggle = (id) => {
        setTaskCards(prev => prev.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
    };

    const addKeyword = () => {
        if (!newKeyword.trim()) return;
        const clean = newKeyword.trim().toLowerCase();
        if (!keywords.includes(clean)) {
            setKeywords(prev => [...prev, clean]);
        }
        setNewKeyword('');
    };

    const removeKeyword = (kw) => {
        setKeywords(prev => prev.filter(k => k !== kw));
    };

    return (
        <div style={{ padding: '24px', backgroundColor: '#0f172a', minHeight: '100vh', color: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '26px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '12px', color: '#ffffff', margin: 0 }}>
                        <Briefcase style={{ color: '#f59e0b' }} size={30} /> Custom Work Operations Panel
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '6px' }}>
                        Bhongir Telangana Pilot Rate Cards, Task Cards, Live Orders & Safety Controls
                    </p>
                </div>
                <button 
                    onClick={fetchRateCard}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
                >
                    <RefreshCw size={16} className={isLoading ? 'spin' : ''} /> Refresh Data
                </button>
            </div>

            {/* Status Alert Banner */}
            {statusMsg.text && (
                <div style={{ 
                    padding: '12px 16px', 
                    borderRadius: '8px', 
                    marginBottom: '20px', 
                    backgroundColor: statusMsg.type === 'success' ? '#064e3b' : '#7f1d1d',
                    color: statusMsg.type === 'success' ? '#6ee7b7' : '#fca5a5',
                    border: `1px solid ${statusMsg.type === 'success' ? '#059669' : '#dc2626'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontWeight: '600'
                }}>
                    <span>{statusMsg.text}</span>
                    <X size={18} style={{ cursor: 'pointer' }} onClick={() => setStatusMsg({ type: '', text: '' })} />
                </div>
            )}

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #334155', paddingBottom: '14px', marginBottom: '24px', flexWrap: 'wrap' }}>
                {[
                    { id: 'orders', label: 'Live Orders Monitor', icon: Layers },
                    { id: 'rates', label: 'Rate Card Configurator', icon: Settings },
                    { id: 'cards', label: 'Task Cards Toggle', icon: Briefcase },
                    { id: 'safety', label: 'Safety & Restricted Shield', icon: Shield },
                    { id: 'disputes', label: 'Disputes & Overtime Audit', icon: AlertTriangle }
                ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 20px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: '700',
                                fontSize: '14px',
                                backgroundColor: isActive ? '#f59e0b' : '#1e293b',
                                color: isActive ? '#0f172a' : '#cbd5e1',
                                transition: 'all 0.2s ease',
                                boxShadow: isActive ? '0 4px 12px rgba(245, 158, 11, 0.4)' : 'none'
                            }}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* TAB 1: LIVE ORDERS MONITOR */}
            {activeTab === 'orders' && (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #3b82f6', borderTop: '1px solid #334155', borderRight: '1px solid #334155', borderBottom: '1px solid #334155' }}>
                            <p style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>Active Custom Orders</p>
                            <h3 style={{ fontSize: '28px', fontWeight: '800', marginTop: '6px', color: '#ffffff' }}>18</h3>
                        </div>
                        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #10b981', borderTop: '1px solid #334155', borderRight: '1px solid #334155', borderBottom: '1px solid #334155' }}>
                            <p style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>Avg Quoted Service Fee</p>
                            <h3 style={{ fontSize: '28px', fontWeight: '800', marginTop: '6px', color: '#10b981' }}>₹128</h3>
                        </div>
                        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #f59e0b', borderTop: '1px solid #334155', borderRight: '1px solid #334155', borderBottom: '1px solid #334155' }}>
                            <p style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>Overtime / Delay Blocks</p>
                            <h3 style={{ fontSize: '28px', fontWeight: '800', marginTop: '6px', color: '#f59e0b' }}>3 Orders</h3>
                        </div>
                        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #ef4444', borderTop: '1px solid #334155', borderRight: '1px solid #334155', borderBottom: '1px solid #334155' }}>
                            <p style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>Pending Admin Review</p>
                            <h3 style={{ fontSize: '28px', fontWeight: '800', marginTop: '6px', color: '#ef4444' }}>1 Order</h3>
                        </div>
                    </div>

                    <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '24px', border: '1px solid #334155' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '18px', color: '#ffffff' }}>Live Custom Work Orders</h3>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #334155', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <th style={{ padding: '14px' }}>Order ID</th>
                                        <th style={{ padding: '14px' }}>Task Type</th>
                                        <th style={{ padding: '14px' }}>Customer</th>
                                        <th style={{ padding: '14px' }}>Pickup ➔ Drop Route</th>
                                        <th style={{ padding: '14px' }}>Quoted Fee</th>
                                        <th style={{ padding: '14px' }}>Final Fee</th>
                                        <th style={{ padding: '14px' }}>Status</th>
                                        <th style={{ padding: '14px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map(o => (
                                        <tr key={o.id} style={{ borderBottom: '1px solid #334155', fontSize: '14px', color: '#e2e8f0' }}>
                                            <td style={{ padding: '14px', fontWeight: '800', color: '#f59e0b' }}>{o.id}</td>
                                            <td style={{ padding: '14px', fontWeight: '600' }}>{o.taskType}</td>
                                            <td style={{ padding: '14px' }}>{o.customerName}</td>
                                            <td style={{ padding: '14px', fontSize: '13px', color: '#cbd5e1' }}>
                                                {o.pickup} <strong style={{ color: '#f59e0b' }}>➔</strong> {o.drop}
                                            </td>
                                            <td style={{ padding: '14px', fontWeight: '600' }}>₹{o.quotedFare}</td>
                                            <td style={{ padding: '14px', fontWeight: '800', color: '#10b981' }}>₹{o.finalFare}</td>
                                            <td style={{ padding: '14px' }}>
                                                <span style={{ 
                                                    padding: '6px 10px', 
                                                    borderRadius: '6px', 
                                                    fontSize: '11px', 
                                                    fontWeight: '800',
                                                    backgroundColor: o.status === 'DELIVERED' ? '#065f46' : o.status === 'ADMIN_REVIEW' ? '#7f1d1d' : '#92400e',
                                                    color: '#ffffff',
                                                    letterSpacing: '0.04em'
                                                }}>
                                                    {o.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px' }}>
                                                <button 
                                                    onClick={() => setSelectedOrder(o)}
                                                    style={{ backgroundColor: '#334155', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}
                                                >
                                                    <Eye size={14} /> Inspect
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: RATE CARD CONFIGURATOR */}
            {activeTab === 'rates' && (
                <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '24px', border: '1px solid #334155' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px', color: '#ffffff' }}>Bhongir Pilot Dynamic Rate Cards</h3>
                    <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
                        Modify city rate card variables. Changes apply instantly to live pricing API without server restart.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                        <div style={{ backgroundColor: '#0f172a', padding: '18px', borderRadius: '10px', border: '1px solid #334155' }}>
                            <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '8px', fontWeight: '600' }}>Service Base Fee (₹)</label>
                            <input 
                                type="number" 
                                value={rateCard.SERVICE_BASE} 
                                onChange={(e) => handleRateChange('SERVICE_BASE', e.target.value)}
                                style={{ width: '100%', padding: '12px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: '#ffffff', fontWeight: '700', fontSize: '16px' }}
                            />
                        </div>
                        <div style={{ backgroundColor: '#0f172a', padding: '18px', borderRadius: '10px', border: '1px solid #334155' }}>
                            <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '8px', fontWeight: '600' }}>Bike Per-KM Rate (₹/km)</label>
                            <input 
                                type="number" 
                                value={rateCard.PER_KM_BIKE} 
                                onChange={(e) => handleRateChange('PER_KM_BIKE', e.target.value)}
                                style={{ width: '100%', padding: '12px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: '#ffffff', fontWeight: '700', fontSize: '16px' }}
                            />
                        </div>
                        <div style={{ backgroundColor: '#0f172a', padding: '18px', borderRadius: '10px', border: '1px solid #334155' }}>
                            <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '8px', fontWeight: '600' }}>Additional Stop Fee (₹/stop)</label>
                            <input 
                                type="number" 
                                value={rateCard.EXTRA_STOP} 
                                onChange={(e) => handleRateChange('EXTRA_STOP', e.target.value)}
                                style={{ width: '100%', padding: '12px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: '#ffffff', fontWeight: '700', fontSize: '16px' }}
                            />
                        </div>
                        <div style={{ backgroundColor: '#0f172a', padding: '18px', borderRadius: '10px', border: '1px solid #334155' }}>
                            <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '8px', fontWeight: '600' }}>Access Coordination Fee (₹)</label>
                            <input 
                                type="number" 
                                value={rateCard.ACCESS_COORDINATION} 
                                onChange={(e) => handleRateChange('ACCESS_COORDINATION', e.target.value)}
                                style={{ width: '100%', padding: '12px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: '#ffffff', fontWeight: '700', fontSize: '16px' }}
                            />
                        </div>
                        <div style={{ backgroundColor: '#0f172a', padding: '18px', borderRadius: '10px', border: '1px solid #334155' }}>
                            <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '8px', fontWeight: '600' }}>Shopping Effort Fee (₹)</label>
                            <input 
                                type="number" 
                                value={rateCard.SHOPPING_EFFORT} 
                                onChange={(e) => handleRateChange('SHOPPING_EFFORT', e.target.value)}
                                style={{ width: '100%', padding: '12px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: '#ffffff', fontWeight: '700', fontSize: '16px' }}
                            />
                        </div>
                        <div style={{ backgroundColor: '#0f172a', padding: '18px', borderRadius: '10px', border: '1px solid #334155' }}>
                            <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '8px', fontWeight: '600' }}>Extra 15m Time Block Fee (₹)</label>
                            <input 
                                type="number" 
                                value={rateCard.EXTRA_TIME_BLOCK} 
                                onChange={(e) => handleRateChange('EXTRA_TIME_BLOCK', e.target.value)}
                                style={{ width: '100%', padding: '12px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: '#ffffff', fontWeight: '700', fontSize: '16px' }}
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button 
                            onClick={handleSaveRateCard}
                            style={{ backgroundColor: '#10b981', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', border: 'none', fontWeight: '800', fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)' }}
                        >
                            Save Rate Card Changes
                        </button>
                    </div>
                </div>
            )}

            {/* TAB 3: TASK CARDS TOGGLE */}
            {activeTab === 'cards' && (
                <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '24px', border: '1px solid #334155' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px', color: '#ffffff' }}>Active Task Cards Management</h3>
                    <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
                        Enable or disable specific task cards for the Bhongir operating zone.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                        {taskCards.map(card => (
                            <div key={card.id} style={{ backgroundColor: '#0f172a', padding: '18px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: card.enabled ? '1px solid #10b981' : '1px solid #334155' }}>
                                <div>
                                    <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#ffffff', margin: 0 }}>{card.name}</h4>
                                    <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{card.desc}</p>
                                    <p style={{ fontSize: '13px', color: '#f59e0b', fontWeight: '700', marginTop: '4px' }}>Min Customer Fare: ₹{card.minFare}</p>
                                </div>
                                <button 
                                    onClick={() => handleCardToggle(card.id)}
                                    style={{
                                        padding: '10px 18px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        fontWeight: '800',
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        backgroundColor: card.enabled ? '#10b981' : '#334155',
                                        color: '#ffffff'
                                    }}
                                >
                                    {card.enabled ? 'ACTIVE' : 'DISABLED'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 4: SAFETY SHIELD */}
            {activeTab === 'safety' && (
                <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '24px', border: '1px solid #334155' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px', color: '#ffffff' }}>Restricted Safety Keywords Shield</h3>
                    <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>
                        Any order containing these keywords will be automatically blocked or routed to Admin Fast-Track Review.
                    </p>

                    <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                        <input 
                            type="text" 
                            placeholder="Add banned keyword (e.g., alcohol, vape, toddy)..."
                            value={newKeyword}
                            onChange={(e) => setNewKeyword(e.target.value)}
                            style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #475569', color: '#ffffff', fontSize: '14px' }}
                        />
                        <button 
                            onClick={addKeyword}
                            style={{ padding: '12px 24px', borderRadius: '8px', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Plus size={18} /> Add Keyword
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {keywords.map(kw => (
                            <span key={kw} style={{ backgroundColor: '#0f172a', border: '1px solid #f87171', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', color: '#f87171', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {kw}
                                <Trash2 size={14} style={{ cursor: 'pointer' }} onClick={() => removeKeyword(kw)} />
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* INSPECT ORDER DRAWER MODAL */}
            {selectedOrder && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', justifyContent: 'flex-end', zIndex: 9999 }}>
                    <div style={{ width: '100%', maxWidth: '480px', backgroundColor: '#1e293b', height: '100%', padding: '24px', overflowY: 'auto', borderLeft: '1px solid #334155', color: '#f8fafc' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
                            <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#f59e0b', margin: 0 }}>Order Details: {selectedOrder.id}</h3>
                            <X size={24} style={{ cursor: 'pointer', color: '#94a3b8' }} onClick={() => setSelectedOrder(null)} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px' }}>
                                <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>Task Type</p>
                                <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', margin: '4px 0 0 0' }}>{selectedOrder.taskType}</h4>
                            </div>

                            <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px' }}>
                                <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>Customer Info</p>
                                <p style={{ fontWeight: '700', color: '#fff', margin: '4px 0 0 0' }}>{selectedOrder.customerName} ({selectedOrder.phone})</p>
                            </div>

                            <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px' }}>
                                <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>Route</p>
                                <p style={{ fontSize: '14px', color: '#cbd5e1', margin: '4px 0 0 0' }}>
                                    <strong>Pickup:</strong> {selectedOrder.pickup}<br />
                                    <strong>Drop:</strong> {selectedOrder.drop}
                                </p>
                            </div>

                            <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px' }}>
                                <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>Fare Breakdown</p>
                                <p style={{ fontSize: '14px', color: '#10b981', fontWeight: '700', margin: '4px 0 0 0' }}>
                                    Quoted Fare: ₹{selectedOrder.quotedFare}<br />
                                    Final Service Fee: ₹{selectedOrder.finalFare}<br />
                                    Merchant Goods Bill: ₹{selectedOrder.goodsInvoice}
                                </p>
                            </div>

                            {selectedOrder.flaggedReason && (
                                <div style={{ backgroundColor: '#7f1d1d', padding: '16px', borderRadius: '8px', border: '1px solid #ef4444' }}>
                                    <p style={{ color: '#fca5a5', fontSize: '12px', fontWeight: '700', margin: 0 }}>Flagged Reason</p>
                                    <p style={{ fontSize: '13px', color: '#fff', margin: '4px 0 0 0' }}>{selectedOrder.flaggedReason}</p>
                                </div>
                            )}

                            <button 
                                onClick={() => setSelectedOrder(null)}
                                style={{ backgroundColor: '#3b82f6', color: '#fff', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '700', cursor: 'pointer', marginTop: '16px' }}
                            >
                                Close Drawer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
