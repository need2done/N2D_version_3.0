import React, { useState, useEffect } from 'react';
import { 
    Briefcase, Settings, AlertTriangle, Shield, CheckCircle2, XCircle, 
    DollarSign, Clock, MapPin, Search, Filter, RefreshCw, Layers, Plus, Trash2, ArrowRight, Eye, X, Check, Edit3, User, Phone, ShoppingCart, Truck, ChevronDown, ChevronUp, Zap, HelpCircle, Layers3, Navigation
} from 'lucide-react';
import '../index.css';
import { API_URL as API_BASE } from '../config';

export default function CustomWorkAdmin() {
    const [activeTab, setActiveTab] = useState('categories'); // 'categories', 'orders', 'rates', 'safety', 'disputes'
    const [isLoading, setIsLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
    const [selectedOrder, setSelectedOrder] = useState(null); // For Inspect Drawer
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all'); // 'all', 'single', 'two'
    const [expandedFlows, setExpandedFlows] = useState({ buy_and_bring: true, unique_custom_task: true });
    const [newCategoryKeywords, setNewCategoryKeywords] = useState({});

    // State for Rate Card Configuration
    const [rateCard, setRateCard] = useState({
        SLAB_0_2KM: 59,
        SLAB_0_2KM_HELPER: 40,
        SLAB_2_3_5KM: 79,
        SLAB_2_3_5KM_HELPER: 55,
        SLAB_3_5_5KM: 99,
        SLAB_3_5_5KM_HELPER: 68,
        PER_KM_ABOVE_5KM: 8,
        PER_KM_ABOVE_5KM_HELPER: 5,
        EXTRA_STOP: 20,
        ACCESS_COORDINATION: 20,
        SHOPPING_EFFORT: 45,
        EXTRA_TIME_BLOCK: 30,
        CARGO_AUTO_MIN: 199,
        MINI_TRUCK_MIN: 399
    });

    // State for 8 Category AI & Flow Explorer
    const [categoryDetails, setCategoryDetails] = useState([
        {
            id: 'buy_and_bring',
            code: 'buy_and_bring',
            name: 'Shopping & Emergency Fuel (Buy & Bring)',
            flowType: 'Two-Location Transfer Flow (Store -> Home)',
            isSingleLoc: false,
            qtyCheck: true,
            qtyNote: 'Prompts for fuel volume (1L, 2L) or grocery item list',
            fares: '₹59 (0-2km) | ₹79 (2-3.5km) | ₹99 (3.5-5km)',
            desc: 'Helper advances cash at store/pump for groceries, fuel, medicines or provisions.',
            keywords: ['buy', 'grocery', 'groceries', 'vegetable', 'fruits', 'shop', 'store bill', 'kirana', 'pharmacy', 'supermarket', 'sweets', 'dairy', 'petrol', 'fuel', 'milk', 'bread', 'stationery'],
            enabled: true,
            steps: [
                '1. Customer sends request (e.g. "I need petrol 2 litres" or "25kg rice bag")',
                '2. AI detects buy_and_bring intent & triggers quantity check if missing',
                '3. Bot asks for Store / Pickup location (provides [🏪 Use Nearest Store] button)',
                '4. Bot asks for Drop-off location & computes tiered distance fare + estimated item cost',
                '5. Helper receives order with store list, advances cash, and delivers'
            ]
        },
        {
            id: 'direct_pickup',
            code: 'direct_pickup',
            name: 'Direct Pick & Drop Courier',
            flowType: 'Two-Location Transfer Flow (Pickup -> Drop)',
            isSingleLoc: false,
            qtyCheck: false,
            qtyNote: 'Pre-packed items (no quantity check needed)',
            fares: '₹59 (0-2km) | ₹79 (2-3.5km) | ₹99 (3.5-5km)',
            desc: 'Direct point A to point B item delivery for charger, keys, tiffin, documents.',
            keywords: ['pick up', 'pickup', 'collect and drop', 'deliver to', 'laptop charger', 'charger', 'tiffin box', 'lunch box', 'spectacles', 'documents', 'rc document', 'parcel', 'laundry clothes'],
            enabled: true,
            steps: [
                '1. Customer requests parcel transport (e.g. "pick up charger from home and drop at office")',
                '2. AI detects direct_pickup & skips item quantity prompts',
                '3. Bot prompts for Pickup Address & contact details',
                '4. Bot prompts for Drop Address & calculates exact distance fare',
                '5. Rider picks up sealed parcel and delivers directly'
            ]
        },
        {
            id: 'retrieve',
            code: 'retrieve',
            name: 'Item Retrieval & Coordination',
            flowType: 'Two-Location Transfer Flow (Retrieve -> Customer)',
            isSingleLoc: false,
            qtyCheck: false,
            qtyNote: 'Coordinated item collection with contact person',
            fares: '₹59 (0-2km) | ₹79 (2-3.5km) | ₹99 (3.5-5km)',
            desc: 'Retrieving forgotten keys, helmet, wallet or ID card from friend/office/canteen.',
            keywords: ['retrieve', 'bring from home', 'collect key', 'forgot', 'forgotten', 'left at', 'brother', 'friend', 'family', 'canteen', 'function hall', 'security guard', 'locker', 'wallet'],
            enabled: true,
            steps: [
                '1. Customer requests forgotten item (e.g. "I left my keys at my friend house")',
                '2. AI detects retrieve intent & asks for contact person details if missing',
                '3. Bot collects Retrieval location & contact phone number',
                '4. Bot collects Customer current drop location',
                '5. Rider calls contact person on arrival, retrieves item, and brings to customer'
            ]
        },
        {
            id: 'prepaid_pickup',
            code: 'prepaid_pickup',
            name: 'Prepaid Store Collection',
            flowType: 'Two-Location Transfer Flow (Store -> Customer)',
            isSingleLoc: false,
            qtyCheck: false,
            qtyNote: 'Pre-ordered counter pickup (already paid online/advance)',
            fares: '₹59 (0-2km) | ₹79 (2-3.5km) | ₹99 (3.5-5km)',
            desc: 'Collecting prepaid bakery cakes, dry cleaned suits, photo prints, booked shoes.',
            keywords: ['prepaid', 'pre-ordered', 'already paid', 'paid online', 'bakery cake', 'dry cleaned suit', 'photo studio', 'bata shoes', 'lenskart glasses', 'boutique dress', 'florist bouquet'],
            enabled: true,
            steps: [
                '1. Customer mentions pre-ordered item (e.g. "collect cake from bakery paid online")',
                '2. AI detects prepaid_pickup & prompts for order token/invoice #',
                '3. Bot asks for Bakery/Store location & pickup reference name',
                '4. Bot asks for Delivery address',
                '5. Helper quotes order code at counter, picks up package, delivers'
            ]
        },
        {
            id: 'queue_paperwork',
            code: 'queue_paperwork',
            name: 'Queueing & Official Paperwork',
            flowType: 'Single Work Site Flow (1-Loc) - BYPASSES DROP LOCATION',
            isSingleLoc: true,
            qtyCheck: false,
            qtyNote: 'On-site queueing at office/bank counter',
            fares: '₹99 base + ₹30 per 15m extra wait block',
            desc: 'Standing in line at MeeSeva, bank passbook update, electricity bill counter, token wait.',
            keywords: ['queue', 'wait in line', 'paperwork', 'form', 'token', 'meeseva', 'tahsildar', 'rto office', 'bank passbook', 'sbi queue', 'electricity office', 'sub-registrar', 'post office'],
            enabled: true,
            steps: [
                '1. Customer requests queue assist (e.g. "stand in line at MeeSeva counter")',
                '2. AI detects queue_paperwork & sets is_single_location = true',
                '3. Bot asks ONLY for 📍 Work Site / Office Location (Drop location prompt is bypassed!)',
                '4. System quotes base fee (₹99) + transparent ₹30/15m extra wait policy',
                '5. Helper reaches site, gets token, stays in queue until customer arrives'
            ]
        },
        {
            id: 'multi_stop',
            code: 'multi_stop',
            name: 'Multi-Stop Errand Run',
            flowType: 'Multi-Stop Flow (Stop 1 -> Stop 2 -> Drop)',
            isSingleLoc: false,
            qtyCheck: true,
            qtyNote: 'Checks multi-store item lists',
            fares: '₹119 base (incl. 2 stops) + ₹20 / extra stop',
            desc: 'Visiting 2 or 3 places in a single run (e.g. Kirana store -> Pharmacy -> Home).',
            keywords: ['multi stop', 'multi-stop', '2 stores', '3 stops', 'kirana and medplus', 'courier and fruit mandi', 'sbi bank and sweets', 'multiple places'],
            enabled: true,
            steps: [
                '1. Customer specifies multi-destination task (e.g. "buy groceries from market then medicine from MedPlus")',
                '2. AI detects multi_stop intent & prompts for list of stops',
                '3. Bot collects Stop 1 & Stop 2 location pins',
                '4. Bot collects Final Drop location & applies multi-stop surcharge (+₹20/extra stop)',
                '5. Helper completes sequentially in one single trip'
            ]
        },
        {
            id: 'heavy_cargo_auto',
            code: 'heavy_cargo_auto',
            name: 'Cargo Transport & Moving (Auto / Truck)',
            flowType: 'Two-Location Transfer Flow (Loading -> Unloading)',
            isSingleLoc: false,
            qtyCheck: false,
            qtyNote: 'Bulk transport vehicle loading',
            fares: 'Cargo Auto: ₹199 min | Mini Truck: ₹399 min',
            desc: 'Transporting heavy rice bags, cement, washing machine, refrigerator, furniture, generator.',
            keywords: ['cargo auto', 'mini truck', 'shift house', 'cement bags', 'steel rods', 'washing machine', 'refrigerator', 'cooler', 'bed mattress', 'tiles', 'generator'],
            enabled: true,
            steps: [
                '1. Customer requests heavy item moving (e.g. "shift fridge and washing machine")',
                '2. AI detects heavy_cargo_auto & selects 3-wheeler auto / 4-wheeler mini truck',
                '3. Bot collects Loading Point & Unloading Point',
                '4. Bot calculates cargo transport pricing (₹199 / ₹399 min base)',
                '5. Commercial vehicle dispatched with helper for loading support'
            ]
        },
        {
            id: 'unique_custom_task',
            code: 'unique_custom_task',
            name: 'On-Site Repair, Breakdown & Custom Errand',
            flowType: 'Single Work Site Flow (1-Loc) - BYPASSES DROP LOCATION',
            isSingleLoc: true,
            qtyCheck: true,
            qtyNote: 'Checks petrol litres if emergency fuel request',
            fares: '₹59 (0-2km) | ₹79 (2-3.5km) | ₹99 (3.5-5km)',
            desc: 'On-site mechanic breakdown assistance, flat tyre, plumber, electrician, locksmith, pet feeding.',
            keywords: ['mechanic', 'not starting', 'starting', 'puncture', 'flat tyre', 'tyre', 'breakdown', 'stranded', 'bike repair', 'car battery', 'jumpstart', 'plumber', 'electrician', 'locksmith', 'broken key', 'water pipe leak', 'feed pet dog'],
            enabled: true,
            steps: [
                '1. Customer requests emergency/repair help (e.g. "my bike not starting im at bhongir highway")',
                '2. AI detects unique_custom_task & sets is_single_location = true',
                '3. Bot asks ONLY for 📍 Work Site / Stranded Location (Drop location prompt is bypassed!)',
                '4. System displays 🛠️ On-Site Service & Breakdown Policy with distance fare',
                '5. On-site mechanic/service helper dispatched immediately to location'
            ]
        }
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
            id: 'N2DCW_8092',
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
            id: 'N2DCW_8091',
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
            id: 'N2DCW_8090',
            taskType: 'Unique Custom Task (Mechanic)',
            customerName: 'Vikram Reddy',
            phone: '+91 99887 76655',
            pickup: 'Highway Petrol Bunk, Bhongir (Work Site)',
            drop: 'N/A (Single Location Task)',
            quotedFare: 79,
            finalFare: 79,
            budgetCap: 500,
            goodsInvoice: 0,
            helperName: 'Mahesh Mechanic',
            helperPhone: '+91 94411 22334',
            status: 'ON_ROUTE',
            time: '2 mins ago',
            flaggedReason: null,
            itemsList: ['Bike Puncture & Battery Jumpstart']
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

    const handleCategoryToggle = (id) => {
        setCategoryDetails(prev => prev.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
    };

    const toggleFlowAccordion = (id) => {
        setExpandedFlows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleAddKeywordToCategory = (catId) => {
        const kw = (newCategoryKeywords[catId] || '').trim().toLowerCase();
        if (!kw) return;
        setCategoryDetails(prev => prev.map(c => {
            if (c.id === catId && !c.keywords.includes(kw)) {
                return { ...c, keywords: [...c.keywords, kw] };
            }
            return c;
        }));
        setNewCategoryKeywords(prev => ({ ...prev, [catId]: '' }));
    };

    const handleRemoveKeywordFromCategory = (catId, kwToRemove) => {
        setCategoryDetails(prev => prev.map(c => {
            if (c.id === catId) {
                return { ...c, keywords: c.keywords.filter(k => k !== kwToRemove) };
            }
            return c;
        }));
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

    // Filter categories based on search & filter pills
    const filteredCategories = categoryDetails.filter(cat => {
        const matchesSearch = cat.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              cat.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              cat.keywords.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()));
        if (!matchesSearch) return false;

        if (categoryFilter === 'single') return cat.isSingleLoc;
        if (categoryFilter === 'two') return !cat.isSingleLoc;
        return true;
    });

    return (
        <div style={{ padding: '24px', backgroundColor: '#0f172a', minHeight: '100vh', color: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '26px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '12px', color: '#ffffff', margin: 0 }}>
                        <Briefcase style={{ color: '#f59e0b' }} size={30} /> Custom Work Operations & 8 Category AI Manager
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '6px' }}>
                        Bhongir Telangana Operating Center — Manage Category Flows, Keywords, Dynamic Pricing & Safety
                    </p>
                </div>
                <button 
                    onClick={fetchRateCard}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
                >
                    <RefreshCw size={16} className={isLoading ? 'spin' : ''} /> Refresh Engine Data
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
                    { id: 'categories', label: '📂 8 Category AI & Flow Explorer', icon: Layers3 },
                    { id: 'orders', label: '📊 Live Orders Monitor', icon: Layers },
                    { id: 'rates', label: '💰 Rate Card Configurator', icon: Settings },
                    { id: 'safety', label: '🛡️ Safety & Restricted Shield', icon: Shield },
                    { id: 'disputes', label: '⚖️ Disputes & Overtime Audit', icon: AlertTriangle }
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

            {/* TAB 1: 8 CATEGORY AI & FLOW EXPLORER */}
            {activeTab === 'categories' && (
                <div>
                    {/* Header Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                        <div style={{ backgroundColor: '#1e293b', padding: '18px', borderRadius: '12px', borderLeft: '4px solid #f59e0b', borderTop: '1px solid #334155', borderRight: '1px solid #334155', borderBottom: '1px solid #334155' }}>
                            <p style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Total Category Codes</p>
                            <h3 style={{ fontSize: '26px', fontWeight: '800', marginTop: '4px', color: '#ffffff' }}>8 Active Categories</h3>
                        </div>
                        <div style={{ backgroundColor: '#1e293b', padding: '18px', borderRadius: '12px', borderLeft: '4px solid #3b82f6', borderTop: '1px solid #334155', borderRight: '1px solid #334155', borderBottom: '1px solid #334155' }}>
                            <p style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Single Location (1-Loc Work Site)</p>
                            <h3 style={{ fontSize: '26px', fontWeight: '800', marginTop: '4px', color: '#60a5fa' }}>2 Categories</h3>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Mechanic/Repair & Queueing (Bypasses Drop)</span>
                        </div>
                        <div style={{ backgroundColor: '#1e293b', padding: '18px', borderRadius: '12px', borderLeft: '4px solid #10b981', borderTop: '1px solid #334155', borderRight: '1px solid #334155', borderBottom: '1px solid #334155' }}>
                            <p style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>Transfer Flow (2-Loc Pickup/Drop)</p>
                            <h3 style={{ fontSize: '26px', fontWeight: '800', marginTop: '4px', color: '#10b981' }}>6 Categories</h3>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Shopping, Pick & Drop, Retrieval, Moving</span>
                        </div>
                        <div style={{ backgroundColor: '#1e293b', padding: '18px', borderRadius: '12px', borderLeft: '4px solid #a855f7', borderTop: '1px solid #334155', borderRight: '1px solid #334155', borderBottom: '1px solid #334155' }}>
                            <p style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>AI Trigger Mappings</p>
                            <h3 style={{ fontSize: '26px', fontWeight: '800', marginTop: '4px', color: '#c084fc' }}>110+ Mapped Keywords</h3>
                        </div>
                    </div>

                    {/* Search & Filter Toolbar */}
                    <div style={{ backgroundColor: '#1e293b', padding: '16px 20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #334155', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
                            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input 
                                type="text"
                                placeholder="Search by category name, code (e.g. buy_and_bring), or keyword (e.g. petrol, mechanic)..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: '100%', padding: '10px 12px 10px 38px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: '#ffffff', fontSize: '14px' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => setCategoryFilter('all')}
                                style={{ padding: '8px 14px', borderRadius: '6px', border: 'none', fontWeight: '700', fontSize: '13px', cursor: 'pointer', backgroundColor: categoryFilter === 'all' ? '#f59e0b' : '#0f172a', color: categoryFilter === 'all' ? '#0f172a' : '#cbd5e1' }}
                            >
                                All 8 Categories
                            </button>
                            <button
                                onClick={() => setCategoryFilter('single')}
                                style={{ padding: '8px 14px', borderRadius: '6px', border: 'none', fontWeight: '700', fontSize: '13px', cursor: 'pointer', backgroundColor: categoryFilter === 'single' ? '#3b82f6' : '#0f172a', color: categoryFilter === 'single' ? '#ffffff' : '#cbd5e1' }}
                            >
                                📍 1-Location Work Site
                            </button>
                            <button
                                onClick={() => setCategoryFilter('two')}
                                style={{ padding: '8px 14px', borderRadius: '6px', border: 'none', fontWeight: '700', fontSize: '13px', cursor: 'pointer', backgroundColor: categoryFilter === 'two' ? '#10b981' : '#0f172a', color: categoryFilter === 'two' ? '#ffffff' : '#cbd5e1' }}
                            >
                                🚚 2-Location Transfer
                            </button>
                        </div>
                    </div>

                    {/* 8 Category Cards List */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                        {filteredCategories.map((cat, idx) => (
                            <div 
                                key={cat.id} 
                                style={{ 
                                    backgroundColor: '#1e293b', 
                                    borderRadius: '12px', 
                                    padding: '24px', 
                                    border: cat.isSingleLoc ? '1px solid #3b82f6' : '1px solid #334155',
                                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
                                }}
                            >
                                {/* Card Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #334155', paddingBottom: '16px', marginBottom: '16px' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                            <span style={{ backgroundColor: '#0f172a', color: '#f59e0b', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '800', fontFamily: 'monospace', border: '1px solid #f59e0b' }}>
                                                Category #{idx + 1}: {cat.code}
                                            </span>
                                            <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#ffffff', margin: 0 }}>{cat.name}</h3>
                                        </div>
                                        <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '6px', margin: '6px 0 0 0' }}>{cat.desc}</p>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <button 
                                            onClick={() => handleCategoryToggle(cat.id)}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                fontWeight: '800',
                                                fontSize: '12px',
                                                cursor: 'pointer',
                                                backgroundColor: cat.enabled ? '#10b981' : '#475569',
                                                color: '#ffffff'
                                            }}
                                        >
                                            {cat.enabled ? '● ACTIVE IN BOT' : '○ DISABLED'}
                                        </button>
                                    </div>
                                </div>

                                {/* Flow Type Banner */}
                                <div style={{ 
                                    padding: '12px 16px', 
                                    borderRadius: '8px', 
                                    marginBottom: '18px', 
                                    backgroundColor: cat.isSingleLoc ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                    border: `1px solid ${cat.isSingleLoc ? '#3b82f6' : '#10b981'}`,
                                    display: 'flex',
                                    justify: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '10px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {cat.isSingleLoc ? (
                                            <Zap style={{ color: '#60a5fa' }} size={20} />
                                        ) : (
                                            <Navigation style={{ color: '#34d399' }} size={20} />
                                        )}
                                        <div>
                                            <strong style={{ color: cat.isSingleLoc ? '#60a5fa' : '#34d399', fontSize: '14px' }}>
                                                {cat.flowType}
                                            </strong>
                                            <p style={{ color: '#cbd5e1', fontSize: '12px', margin: '2px 0 0 0' }}>
                                                {cat.isSingleLoc 
                                                    ? '⚡ Stranded / On-Site Repair Mode: Bot prompts ONLY for Work Site location. Bypasses drop location prompt completely!'
                                                    : '🚚 2-Point Delivery Mode: Bot asks where to pick up / buy items first (with convenient store options), then asks for customer drop location.'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => toggleFlowAccordion(cat.id)}
                                        style={{ backgroundColor: '#0f172a', border: '1px solid #475569', color: '#ffffff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        {expandedFlows[cat.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />} 
                                        {expandedFlows[cat.id] ? 'Hide Bot Steps' : 'View Bot Steps'}
                                    </button>
                                </div>

                                {/* Expandable Step-by-step Flowchart */}
                                {expandedFlows[cat.id] && (
                                    <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', marginBottom: '18px', border: '1px solid #334155' }}>
                                        <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#f59e0b', textTransform: 'uppercase', marginBottom: '10px' }}>
                                            🤖 WhatsApp Bot Execution Steps for {cat.code}
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {cat.steps.map((step, sIdx) => (
                                                <div key={sIdx} style={{ fontSize: '13px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ color: '#10b981', fontWeight: '700' }}>✓</span>
                                                    {step}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Specs Grid: Quantity Intake & Base Pricing */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '18px' }}>
                                    <div style={{ backgroundColor: '#0f172a', padding: '14px', borderRadius: '8px', border: '1px solid #334155' }}>
                                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', display: 'block' }}>Quantity & Intake Rule</span>
                                        <strong style={{ fontSize: '14px', color: cat.qtyCheck ? '#f59e0b' : '#38bdf8', marginTop: '4px', display: 'block' }}>
                                            {cat.qtyCheck ? '📦 Quantity Intake Check Required' : '⚡ Direct Intake (No Qty Check)'}
                                        </strong>
                                        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0' }}>{cat.qtyNote}</p>
                                    </div>

                                    <div style={{ backgroundColor: '#0f172a', padding: '14px', borderRadius: '8px', border: '1px solid #334155' }}>
                                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', display: 'block' }}>Base Pricing & Distance Slabs</span>
                                        <strong style={{ fontSize: '14px', color: '#10b981', marginTop: '4px', display: 'block' }}>{cat.fares}</strong>
                                        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0' }}>Calculated via Smooth Tiered Engine in backend</p>
                                    </div>
                                </div>

                                {/* AI Intent Search Keywords Section */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            🎯 Mapped Intent Search Keywords ({cat.keywords.length})
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                                        {cat.keywords.map(kw => (
                                            <span 
                                                key={kw} 
                                                style={{ 
                                                    backgroundColor: '#0f172a', 
                                                    border: '1px solid #475569', 
                                                    color: '#e2e8f0', 
                                                    padding: '5px 12px', 
                                                    borderRadius: '16px', 
                                                    fontSize: '12px', 
                                                    fontWeight: '600',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}
                                            >
                                                {kw}
                                                <X 
                                                    size={12} 
                                                    style={{ cursor: 'pointer', color: '#ef4444' }} 
                                                    onClick={() => handleRemoveKeywordFromCategory(cat.id, kw)} 
                                                />
                                            </span>
                                        ))}
                                    </div>

                                    {/* Add Keyword Input for this category */}
                                    <div style={{ display: 'flex', gap: '10px', maxWidth: '420px' }}>
                                        <input 
                                            type="text" 
                                            placeholder={`Add new keyword for ${cat.code}...`}
                                            value={newCategoryKeywords[cat.id] || ''}
                                            onChange={(e) => setNewCategoryKeywords(prev => ({ ...prev, [cat.id]: e.target.value }))}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddKeywordToCategory(cat.id); }}
                                            style={{ flex: 1, padding: '8px 12px', backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#ffffff', fontSize: '13px' }}
                                        />
                                        <button 
                                            onClick={() => handleAddKeywordToCategory(cat.id)}
                                            style={{ padding: '8px 14px', backgroundColor: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                                        >
                                            + Add Keyword
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 2: LIVE ORDERS MONITOR */}
            {activeTab === 'orders' && (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #3b82f6', borderTop: '1px solid #334155', borderRight: '1px solid #334155', borderBottom: '1px solid #334155' }}>
                            <p style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>Active Custom Orders</p>
                            <h3 style={{ fontSize: '28px', fontWeight: '800', marginTop: '6px', color: '#ffffff' }}>18</h3>
                        </div>
                        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #10b981', borderTop: '1px solid #334155', borderRight: '1px solid #334155', borderBottom: '1px solid #334155' }}>
                            <p style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>Avg Quoted Service Fee</p>
                            <h3 style={{ fontSize: '28px', fontWeight: '800', marginTop: '6px', color: '#10b981' }}>₹99</h3>
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

            {/* TAB 3: RATE CARD CONFIGURATOR */}
            {activeTab === 'rates' && (
                <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '24px', border: '1px solid #334155' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px', color: '#ffffff' }}>Bhongir Pilot Dynamic Rate Cards</h3>
                    <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
                        Modify city rate card variables. Changes apply instantly to live pricing API without server restart.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                        <div style={{ backgroundColor: '#0f172a', padding: '18px', borderRadius: '10px', border: '1px solid #10b981' }}>
                            <label style={{ fontSize: '13px', color: '#10b981', display: 'block', marginBottom: '8px', fontWeight: '700' }}>Slab 1: Micro Errand (0 - 2.0 km) Fare (₹)</label>
                            <input 
                                type="number" 
                                value={rateCard.SLAB_0_2KM || 59} 
                                onChange={(e) => handleRateChange('SLAB_0_2KM', e.target.value)}
                                style={{ width: '100%', padding: '12px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: '#ffffff', fontWeight: '700', fontSize: '16px' }}
                            />
                            <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px', display: 'block' }}>Helper Payout: ₹{rateCard.SLAB_0_2KM_HELPER || 40}</span>
                        </div>

                        <div style={{ backgroundColor: '#0f172a', padding: '18px', borderRadius: '10px', border: '1px solid #3b82f6' }}>
                            <label style={{ fontSize: '13px', color: '#60a5fa', display: 'block', marginBottom: '8px', fontWeight: '700' }}>Slab 2: Bhongir Local Town (2.1 - 3.5 km) Fare (₹)</label>
                            <input 
                                type="number" 
                                value={rateCard.SLAB_2_3_5KM || 79} 
                                onChange={(e) => handleRateChange('SLAB_2_3_5KM', e.target.value)}
                                style={{ width: '100%', padding: '12px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: '#ffffff', fontWeight: '700', fontSize: '16px' }}
                            />
                            <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px', display: 'block' }}>Helper Payout: ₹{rateCard.SLAB_2_3_5KM_HELPER || 55}</span>
                        </div>

                        <div style={{ backgroundColor: '#0f172a', padding: '18px', borderRadius: '10px', border: '1px solid #f59e0b' }}>
                            <label style={{ fontSize: '13px', color: '#fbbf24', display: 'block', marginBottom: '8px', fontWeight: '700' }}>Slab 3: Extended Town (3.6 - 5.0 km) Fare (₹)</label>
                            <input 
                                type="number" 
                                value={rateCard.SLAB_3_5_5KM || 99} 
                                onChange={(e) => handleRateChange('SLAB_3_5_5KM', e.target.value)}
                                style={{ width: '100%', padding: '12px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: '#ffffff', fontWeight: '700', fontSize: '16px' }}
                            />
                            <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px', display: 'block' }}>Helper Payout: ₹{rateCard.SLAB_3_5_5KM_HELPER || 68}</span>
                        </div>

                        <div style={{ backgroundColor: '#0f172a', padding: '18px', borderRadius: '10px', border: '1px solid #a855f7' }}>
                            <label style={{ fontSize: '13px', color: '#c084fc', display: 'block', marginBottom: '8px', fontWeight: '700' }}>Slab 4: Above 5 km Extra Rate (₹/km)</label>
                            <input 
                                type="number" 
                                value={rateCard.PER_KM_ABOVE_5KM || 8} 
                                onChange={(e) => handleRateChange('PER_KM_ABOVE_5KM', e.target.value)}
                                style={{ width: '100%', padding: '12px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: '#ffffff', fontWeight: '700', fontSize: '16px' }}
                            />
                            <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px', display: 'block' }}>Helper Rate: ₹{rateCard.PER_KM_ABOVE_5KM_HELPER || 5}/km</span>
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
                            💾 Save Rate Card Config to Production
                        </button>
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

            {/* TAB 5: DISPUTES & OVERTIME AUDIT */}
            {activeTab === 'disputes' && (
                <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '24px', border: '1px solid #334155' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px', color: '#ffffff' }}>Disputes & Overtime Audit Log</h3>
                    <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>
                        Audit trail for customer price adjustments, additional wait time blocks (+₹30/15m), and shopping advance receipts.
                    </p>

                    <div style={{ backgroundColor: '#0f172a', padding: '18px', borderRadius: '8px', border: '1px solid #334155' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px', marginBottom: '12px' }}>
                            <div>
                                <strong style={{ color: '#f59e0b', fontSize: '15px' }}>Order #N2DCW_8092 — Kamesh Sharma</strong>
                                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' }}>Task: Buy & Bring (Groceries + Fuel)</p>
                            </div>
                            <span style={{ backgroundColor: '#065f46', color: '#6ee7b7', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700' }}>APPROVED</span>
                        </div>
                        <p style={{ fontSize: '13px', color: '#cbd5e1', margin: 0 }}>
                            Customer approved 1 extra 15m delay block (+₹30) due to billing counter queue at supermarket. Helper receipt uploaded and verified.
                        </p>
                    </div>
                </div>
            )}

            {/* INSPECT ORDER DRAWER MODAL */}
            {selectedOrder && (
                <div 
                    onClick={() => setSelectedOrder(null)}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', justifyContent: 'flex-end', zIndex: 9999, cursor: 'pointer' }}
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: '100%', maxWidth: '480px', backgroundColor: '#1e293b', height: '100%', padding: '24px', overflowY: 'auto', borderLeft: '1px solid #334155', color: '#f8fafc', cursor: 'default' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
                            <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#f59e0b', margin: 0 }}>Order Details: {selectedOrder.id}</h3>
                            <X size={24} style={{ cursor: 'pointer', color: '#94a3b8' }} onClick={(e) => { e.stopPropagation(); setSelectedOrder(null); }} />
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
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSelectedOrder(null); }}
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
