import React, { useState, useEffect } from 'react';
import { 
    Briefcase, Settings, AlertTriangle, Shield, CheckCircle2, XCircle, 
    DollarSign, Clock, MapPin, Search, Filter, RefreshCw, Layers, Plus, Trash2, ArrowRight 
} from 'lucide-react';
import '../index.css';

export default function CustomWorkAdmin() {
    const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'rates', 'cards', 'safety', 'disputes'
    const [isLoading, setIsLoading] = useState(false);
    
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
        { id: 'micro_errand', name: 'Micro-Errand (<2 km)', enabled: true, minFare: 69 },
        { id: 'direct_pickup', name: 'Direct Pickup & Drop', enabled: true, minFare: 99 },
        { id: 'retrieve', name: 'Retrieve Item from Home/Office', enabled: true, minFare: 119 },
        { id: 'prepaid_pickup', name: 'Prepaid Store Pickup', enabled: true, minFare: 99 },
        { id: 'buy_and_bring', name: 'Buy & Bring (Shopping)', enabled: true, minFare: 119 },
        { id: 'queue_paperwork', name: 'Queue & Paperwork Errand', enabled: true, minFare: 99 },
        { id: 'multi_stop', name: 'Multi-Stop Errand', enabled: true, minFare: 119 },
        { id: 'heavy_cargo_auto', name: 'Heavy Cargo Auto', enabled: true, minFare: 199 },
        { id: 'heavy_mini_truck', name: 'Heavy Mini Truck', enabled: false, minFare: 399 },
        { id: 'general_errand', name: 'General / Unique Errand', enabled: true, minFare: 129 }
    ]);

    // State for Restricted Safety Keywords
    const [keywords, setKeywords] = useState([
        'cash transfer', 'bank deposit', 'withdrawal', 'weapon', 'gun', 
        'explosive', 'illegal', 'drug', 'prescription missing', 'childcare', 
        'baby sitting', 'nursing', 'medical care', 'unattended key access',
        'alcohol', 'beer', 'whiskey', 'toddy', 'vape', 'e-cigarette', 'gutka'
    ]);
    const [newKeyword, setNewKeyword] = useState('');

    // Sample Live Custom Work Orders
    const [orders, setOrders] = useState([
        {
            id: 'CW-8092',
            taskType: 'Buy & Bring',
            customerName: 'Kamesh Sharma',
            phone: '+91 9876543210',
            pickup: 'Gunj Market, Bhongir',
            drop: 'Housing Board Colony',
            quotedFare: 119,
            finalFare: 149,
            budgetCap: 1650,
            goodsInvoice: 1432,
            helperName: 'Ravi Kumar',
            status: 'SHOPPING_DELAY',
            time: '10 mins ago',
            flaggedReason: 'Customer approved 1 extra 15m block (+₹30)'
        },
        {
            id: 'CW-8091',
            taskType: 'Direct Pickup',
            customerName: 'Sujatha Rao',
            phone: '+91 9123456789',
            pickup: 'Bhongir Bus Stand',
            drop: 'Govt Hospital Road',
            quotedFare: 99,
            finalFare: 99,
            budgetCap: 0,
            goodsInvoice: 0,
            helperName: 'Srinivas M',
            status: 'DELIVERED',
            time: '25 mins ago',
            flaggedReason: null
        },
        {
            id: 'CW-8090',
            taskType: 'Unique Custom Task',
            customerName: 'Vikram Reddy',
            phone: '+91 9988776655',
            pickup: 'SBI Bank Branch',
            drop: 'Collectorate Office',
            quotedFare: 175,
            finalFare: 175,
            budgetCap: 500,
            goodsInvoice: 0,
            helperName: 'Unassigned',
            status: 'ADMIN_REVIEW',
            time: '2 mins ago',
            flaggedReason: 'Ambiguous request description requiring verification'
        }
    ]);

    const handleRateChange = (field, val) => {
        setRateCard(prev => ({ ...prev, [field]: parseFloat(val) || 0 }));
    };

    const handleCardToggle = (id) => {
        setTaskCards(prev => prev.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
    };

    const addKeyword = () => {
        if (!newKeyword.trim()) return;
        setKeywords(prev => [...prev, newKeyword.trim().toLowerCase()]);
        setNewKeyword('');
    };

    const removeKeyword = (kw) => {
        setKeywords(prev => prev.filter(k => k !== kw));
    };

    return (
        <div className="custom-work-admin-container" style={{ padding: '24px', color: '#f3f4f6' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', color: '#fff' }}>
                        <Briefcase className="text-amber-400" size={28} /> Custom Work Operations Panel
                    </h1>
                    <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '4px' }}>
                        Bhongir Telangana Pilot Rate Cards, Task Cards, Live Orders & Safety Controls
                    </p>
                </div>
                <button 
                    onClick={() => setIsLoading(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                >
                    <RefreshCw size={16} className={isLoading ? 'spin' : ''} /> Refresh Data
                </button>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #374151', paddingBottom: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
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
                                padding: '10px 18px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '14px',
                                backgroundColor: isActive ? '#f59e0b' : '#1f2937',
                                color: isActive ? '#111827' : '#9ca3af',
                                transition: 'all 0.2s ease'
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
                        <div style={{ backgroundColor: '#1f2937', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #3b82f6' }}>
                            <p style={{ color: '#9ca3af', fontSize: '12px' }}>Total Active Custom Orders</p>
                            <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '4px' }}>18</h3>
                        </div>
                        <div style={{ backgroundColor: '#1f2937', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
                            <p style={{ color: '#9ca3af', fontSize: '12px' }}>Avg Quoted Service Fee</p>
                            <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '4px' }}>₹128</h3>
                        </div>
                        <div style={{ backgroundColor: '#1f2937', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #f59e0b' }}>
                            <p style={{ color: '#9ca3af', fontSize: '12px' }}>Overtime / Extra Blocks Requested</p>
                            <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '4px' }}>3 Orders</h3>
                        </div>
                        <div style={{ backgroundColor: '#1f2937', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #ef4444' }}>
                            <p style={{ color: '#9ca3af', fontSize: '12px' }}>Pending Admin Review</p>
                            <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '4px' }}>1 Order</h3>
                        </div>
                    </div>

                    <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', padding: '20px', border: '1px solid #374151' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Live Orders Table</h3>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #374151', color: '#9ca3af', fontSize: '13px' }}>
                                        <th style={{ padding: '12px' }}>Order ID</th>
                                        <th style={{ padding: '12px' }}>Task Type</th>
                                        <th style={{ padding: '12px' }}>Customer</th>
                                        <th style={{ padding: '12px' }}>Pickup $\rightarrow$ Drop</th>
                                        <th style={{ padding: '12px' }}>Quoted Fee</th>
                                        <th style={{ padding: '12px' }}>Final Fee</th>
                                        <th style={{ padding: '12px' }}>Status</th>
                                        <th style={{ padding: '12px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map(o => (
                                        <tr key={o.id} style={{ borderBottom: '1px solid #374151', fontSize: '14px' }}>
                                            <td style={{ padding: '12px', fontWeight: 'bold', color: '#f59e0b' }}>{o.id}</td>
                                            <td style={{ padding: '12px' }}>{o.taskType}</td>
                                            <td style={{ padding: '12px' }}>{o.customerName}</td>
                                            <td style={{ padding: '12px', fontSize: '12px', color: '#d1d5db' }}>{o.pickup} $\rightarrow$ {o.drop}</td>
                                            <td style={{ padding: '12px' }}>₹{o.quotedFare}</td>
                                            <td style={{ padding: '12px', fontWeight: 'bold', color: '#10b981' }}>₹{o.finalFare}</td>
                                            <td style={{ padding: '12px' }}>
                                                <span style={{ 
                                                    padding: '4px 8px', 
                                                    borderRadius: '4px', 
                                                    fontSize: '11px', 
                                                    fontWeight: 'bold',
                                                    backgroundColor: o.status === 'DELIVERED' ? '#065f46' : o.status === 'ADMIN_REVIEW' ? '#7f1d1d' : '#92400e',
                                                    color: '#fff'
                                                }}>
                                                    {o.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <button style={{ backgroundColor: '#374151', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                                                    Inspect
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
                <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', padding: '24px', border: '1px solid #374151' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Bhongir Pilot Dynamic Rate Cards</h3>
                    <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '24px' }}>
                        Modify city rate card variables. Changes reflect immediately in the live pricing engine without restarting backend services.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                        <div style={{ backgroundColor: '#111827', padding: '16px', borderRadius: '8px' }}>
                            <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Service Base Fee (₹)</label>
                            <input 
                                type="number" 
                                value={rateCard.SERVICE_BASE} 
                                onChange={(e) => handleRateChange('SERVICE_BASE', e.target.value)}
                                style={{ width: '100%', padding: '10px', backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '6px', color: '#fff', fontWeight: 'bold' }}
                            />
                        </div>
                        <div style={{ backgroundColor: '#111827', padding: '16px', borderRadius: '8px' }}>
                            <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Bike Per-KM Rate (₹/km)</label>
                            <input 
                                type="number" 
                                value={rateCard.PER_KM_BIKE} 
                                onChange={(e) => handleRateChange('PER_KM_BIKE', e.target.value)}
                                style={{ width: '100%', padding: '10px', backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '6px', color: '#fff', fontWeight: 'bold' }}
                            />
                        </div>
                        <div style={{ backgroundColor: '#111827', padding: '16px', borderRadius: '8px' }}>
                            <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Additional Stop Fee (₹/stop)</label>
                            <input 
                                type="number" 
                                value={rateCard.EXTRA_STOP} 
                                onChange={(e) => handleRateChange('EXTRA_STOP', e.target.value)}
                                style={{ width: '100%', padding: '10px', backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '6px', color: '#fff', fontWeight: 'bold' }}
                            />
                        </div>
                        <div style={{ backgroundColor: '#111827', padding: '16px', borderRadius: '8px' }}>
                            <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Access Coordination Fee (₹)</label>
                            <input 
                                type="number" 
                                value={rateCard.ACCESS_COORDINATION} 
                                onChange={(e) => handleRateChange('ACCESS_COORDINATION', e.target.value)}
                                style={{ width: '100%', padding: '10px', backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '6px', color: '#fff', fontWeight: 'bold' }}
                            />
                        </div>
                        <div style={{ backgroundColor: '#111827', padding: '16px', borderRadius: '8px' }}>
                            <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Shopping Effort Fee (₹)</label>
                            <input 
                                type="number" 
                                value={rateCard.SHOPPING_EFFORT} 
                                onChange={(e) => handleRateChange('SHOPPING_EFFORT', e.target.value)}
                                style={{ width: '100%', padding: '10px', backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '6px', color: '#fff', fontWeight: 'bold' }}
                            />
                        </div>
                        <div style={{ backgroundColor: '#111827', padding: '16px', borderRadius: '8px' }}>
                            <label style={{ fontSize: '13px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Extra 15m Time Block Fee (₹)</label>
                            <input 
                                type="number" 
                                value={rateCard.EXTRA_TIME_BLOCK} 
                                onChange={(e) => handleRateChange('EXTRA_TIME_BLOCK', e.target.value)}
                                style={{ width: '100%', padding: '10px', backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '6px', color: '#fff', fontWeight: 'bold' }}
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button style={{ backgroundColor: '#10b981', color: '#fff', padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                            Save Rate Card Changes
                        </button>
                    </div>
                </div>
            )}

            {/* TAB 3: TASK CARDS TOGGLE */}
            {activeTab === 'cards' && (
                <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', padding: '24px', border: '1px solid #374151' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Active Task Cards Management</h3>
                    <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '24px' }}>
                        Enable or disable specific task cards for the Bhongir operating zone.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                        {taskCards.map(card => (
                            <div key={card.id} style={{ backgroundColor: '#111827', padding: '16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: card.enabled ? '1px solid #059669' : '1px solid #374151' }}>
                                <div>
                                    <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff' }}>{card.name}</h4>
                                    <p style={{ fontSize: '12px', color: '#9ca3af' }}>Min Customer Fare: ₹{card.minFare}</p>
                                </div>
                                <button 
                                    onClick={() => handleCardToggle(card.id)}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        fontWeight: 'bold',
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        backgroundColor: card.enabled ? '#10b981' : '#374151',
                                        color: '#fff'
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
                <div style={{ backgroundColor: '#1f2937', borderRadius: '12px', padding: '24px', border: '1px solid #374151' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Restricted Safety Keywords Shield</h3>
                    <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '20px' }}>
                        Any order containing these keywords will be automatically blocked or routed to Admin Fast-Track Review.
                    </p>

                    <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                        <input 
                            type="text" 
                            placeholder="Add banned keyword (e.g., wine, toddy, cash)..."
                            value={newKeyword}
                            onChange={(e) => setNewKeyword(e.target.value)}
                            style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', backgroundColor: '#111827', border: '1px solid #374151', color: '#fff' }}
                        />
                        <button 
                            onClick={addKeyword}
                            style={{ padding: '10px 20px', borderRadius: '8px', backgroundColor: '#ef4444', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <Plus size={16} /> Add Keyword
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {keywords.map(kw => (
                            <span key={kw} style={{ backgroundColor: '#111827', border: '1px solid #374151', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {kw}
                                <Trash2 size={14} style={{ cursor: 'pointer' }} onClick={() => removeKeyword(kw)} />
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
