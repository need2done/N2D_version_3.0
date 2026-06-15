import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Plus, Trash2, Edit2, X, Shield, Users, Smartphone, ToggleRight, Tag, Bell } from 'lucide-react';
import './Settings.css';

export default function Settings() {
    const [activeTab, setActiveTab] = useState('agents');

    // Env Settings State
    const [envSettings, setEnvSettings] = useState({});
    const [originalEnvSettings, setOriginalEnvSettings] = useState({});
    const [envLoading, setEnvLoading] = useState(false);
    const [envMessage, setEnvMessage] = useState('');
    
    // Advanced Pricing State
    const [advancedPricing, setAdvancedPricing] = useState({
        COMMISSION_PERCENT: 15,
        LONG_PICKUP: { threshold_km: 3, rate_per_km: 5, max_fee: 20 },
        NIGHT_FARE: { start_hour: 23, end_hour: 6, multiplier: 1.25 },
        VEHICLES: {
            BIKE: { base_fare: 11, time_rate_per_min: 0.50, distance_tiers: [{up_to_km: 8, rate_per_km: 8.2}, {up_to_km: 100, rate_per_km: 11.3}] },
            AUTO: { base_fare: 30, time_rate_per_min: 0.80, distance_tiers: [{up_to_km: 5, rate_per_km: 15}, {up_to_km: 100, rate_per_km: 18}] },
            CAR: { base_fare: 50, time_rate_per_min: 1.50, distance_tiers: [{up_to_km: 5, rate_per_km: 20}, {up_to_km: 100, rate_per_km: 25}] }
        }
    });

    const [pricingSubTab, setPricingSubTab] = useState('global');

    // Agents State
    const [agents, setAgents] = useState([]);
    const [agentsLoading, setAgentsLoading] = useState(false);
    const [editingAgent, setEditingAgent] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Form states for adding/editing agent
    const [agentForm, setAgentForm] = useState({ name: '', phone: '', helper_code: '' });
    
    // Active Offers State
    const [offers, setOffers] = useState([]);
    const [offerForm, setOfferForm] = useState({ service: 'RIDE', type: 'PERCENT', value: '', msg: '' });

    // Active Surges State
    const [surges, setSurges] = useState([]);
    const [surgeForm, setSurgeForm] = useState({ service: 'RIDE', amount: '' });

    const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    // Fetch settings on mount
    useEffect(() => {
        fetchSettings();
        fetchAgents();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch(`${VITE_API_URL}/settings`);
            const data = await res.json();
            if (data.success) {
                setEnvSettings(data.settings);
                setOriginalEnvSettings(data.settings);
                if (data.settings.ACTIVE_OFFERS) {
                    try { setOffers(JSON.parse(data.settings.ACTIVE_OFFERS)); } catch(e) {}
                }
                if (data.settings.ACTIVE_SURGES) {
                    try { setSurges(JSON.parse(data.settings.ACTIVE_SURGES)); } catch(e) {}
                }
                if (data.settings.ADVANCED_PRICING) {
                    try { setAdvancedPricing(JSON.parse(data.settings.ADVANCED_PRICING)); } catch(e) {}
                }
            }
        } catch (err) {
            console.error('Failed to fetch settings', err);
        }
    };

    const fetchAgents = async () => {
        try {
            setAgentsLoading(true);
            const res = await fetch(`${VITE_API_URL}/helpers`);
            const data = await res.json();
            if (data.success) {
                setAgents(data.helpers);
            }
        } catch (err) {
            console.error('Failed to fetch agents', err);
        } finally {
            setAgentsLoading(false);
        }
    };

    // --- Env Settings Handlers ---
    const handleAddOffer = (e) => {
        e.preventDefault();
        if (!offerForm.value || !offerForm.msg) return;
        const newOffer = { ...offerForm, id: Date.now() };
        const updatedOffers = [...offers, newOffer];
        setOffers(updatedOffers);
        setEnvSettings(prev => ({ ...prev, ACTIVE_OFFERS: JSON.stringify(updatedOffers) }));
        setOfferForm({ service: 'RIDE', type: 'PERCENT', value: '', msg: '' });
    };

    const handleRemoveOffer = (id) => {
        const updatedOffers = offers.filter(o => o.id !== id);
        setOffers(updatedOffers);
        setEnvSettings(prev => ({ ...prev, ACTIVE_OFFERS: JSON.stringify(updatedOffers) }));
    };

    const handleAddSurge = (e) => {
        e.preventDefault();
        if (!surgeForm.amount) return;
        const newSurge = { ...surgeForm, id: Date.now() };
        const updatedSurges = [...surges, newSurge];
        setSurges(updatedSurges);
        setEnvSettings(prev => ({ ...prev, ACTIVE_SURGES: JSON.stringify(updatedSurges) }));
        setSurgeForm({ service: 'RIDE', amount: '' });
    };

    const handleRemoveSurge = (id) => {
        const updatedSurges = surges.filter(s => s.id !== id);
        setSurges(updatedSurges);
        setEnvSettings(prev => ({ ...prev, ACTIVE_SURGES: JSON.stringify(updatedSurges) }));
    };

    const notifySurge = async (surge) => {
        if (!window.confirm(`Are you sure you want to notify all helpers about ₹${surge.amount} surge for ${surge.service}?`)) return;
        
        try {
            const res = await fetch(`${VITE_API_URL}/helpers/notify-surge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: surge.amount, service: surge.service })
            });
            const data = await res.json();
            if (data.success) {
                alert('Surge notification sent to all helpers!');
            } else {
                alert('Failed to send notification: ' + data.error);
            }
        } catch (err) {
            alert('Error sending notification');
        }
    };
    const handleEnvChange = (e) => {
        const { name, value, type, checked } = e.target;
        setEnvSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (checked ? 'true' : 'false') : value
        }));
    };

    const saveEnvSettings = async () => {
        setEnvLoading(true);
        setEnvMessage('');

        // Only send changed settings
        const updates = {};
        for (const key in envSettings) {
            if (key !== 'ADVANCED_PRICING' && envSettings[key] !== originalEnvSettings[key]) {
                updates[key] = envSettings[key];
            }
        }

        const apStr = JSON.stringify(advancedPricing);
        if (apStr !== originalEnvSettings.ADVANCED_PRICING) {
            updates.ADVANCED_PRICING = apStr;
        }

        if (Object.keys(updates).length === 0) {
            setEnvMessage('No changes to save.');
            setEnvLoading(false);
            return;
        }

        try {
            const res = await fetch(`${VITE_API_URL}/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            const data = await res.json();
            if (data.success) {
                setEnvMessage('Settings updated successfully!');
                setOriginalEnvSettings(envSettings);
                if (updates.ADMIN_USERNAME || updates.ADMIN_PASSWORD) {
                    setEnvMessage('Credentials updated. You may need to log in again later.');
                }
            } else {
                setEnvMessage(data.error || 'Failed to update settings');
            }
        } catch (err) {
            setEnvMessage('Server error while saving settings');
        } finally {
            setEnvLoading(false);
            setTimeout(() => setEnvMessage(''), 5000);
        }
    };

    // --- Agent Management Handlers ---
    const handleAgentFormChange = (e) => {
        setAgentForm({ ...agentForm, [e.target.name]: e.target.value });
    };

    const saveAgent = async (e) => {
        e.preventDefault();
        try {
            if (editingAgent) {
                // Update
                await fetch(`${VITE_API_URL}/helpers/${editingAgent.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(agentForm)
                });
            } else {
                // Create
                await fetch(`${VITE_API_URL}/helpers`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(agentForm)
                });
            }
            fetchAgents();
            closeAgentModal();
        } catch (err) {
            console.error('Failed to save agent', err);
        }
    };

    const deleteAgent = async (id) => {
        if (!window.confirm('Are you sure you want to remove this agent?')) return;
        try {
            await fetch(`${VITE_API_URL}/helpers/${id}`, { method: 'DELETE' });
            fetchAgents();
        } catch (err) {
            console.error('Failed to delete agent', err);
        }
    };

    const openEditModal = (agent) => {
        setEditingAgent(agent);
        setAgentForm({ name: agent.name, phone: agent.phone, helper_code: agent.helper_code || '' });
        setIsAddModalOpen(true);
    };

    const closeAgentModal = () => {
        setIsAddModalOpen(false);
        setEditingAgent(null);
        setAgentForm({ name: '', phone: '', helper_code: '' });
    };

    return (
        <div className="settings-page">
            <div className="page-header">
                <div>
                    <h1>Settings & Staff Management</h1>
                    <p className="text-secondary">Configure system variables and manage your delivery agents.</p>
                </div>
            </div>

            <div className="settings-layout">
                {/* Sidebar Navigation for Settings */}
                <div className="settings-sidebar card">
                    <button
                        className={`settings-tab ${activeTab === 'agents' ? 'active' : ''}`}
                        onClick={() => setActiveTab('agents')}
                    >
                        <Users size={20} /> Staff / Agents
                    </button>
                    <button
                        className={`settings-tab ${activeTab === 'credentials' ? 'active' : ''}`}
                        onClick={() => setActiveTab('credentials')}
                    >
                        <Shield size={20} /> Admin Credentials
                    </button>
                    <button
                        className={`settings-tab ${activeTab === 'numbers' ? 'active' : ''}`}
                        onClick={() => setActiveTab('numbers')}
                    >
                        <Smartphone size={20} /> Manage Numbers
                    </button>
                    <button
                        className={`settings-tab ${activeTab === 'system' ? 'active' : ''}`}
                        onClick={() => setActiveTab('system')}
                    >
                        <ToggleRight size={20} /> System Toggles
                    </button>
                    <button
                        className={`settings-tab ${activeTab === 'pricing' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pricing')}
                    >
                        <Tag size={20} /> Pricing & Offers
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="settings-content card">
                    {/* AGENTS TAB */}
                    {activeTab === 'agents' && (
                        <div className="settings-section animate-fade-in">
                            <div className="section-header">
                                <h2>Manage Agents</h2>
                                <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
                                    <Plus size={18} /> Add New Agent
                                </button>
                            </div>

                            <div className="table-responsive">
                                <table className="n2d-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Name</th>
                                            <th>Phone Number</th>
                                            <th>Code</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {agentsLoading ? (
                                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Loading agents...</td></tr>
                                        ) : agents.length === 0 ? (
                                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No agents found.</td></tr>
                                        ) : (
                                            agents.map(agent => (
                                                <tr key={agent.id}>
                                                    <td>#{agent.id}</td>
                                                    <td className="fw-bold">{agent.name}</td>
                                                    <td>{agent.phone}</td>
                                                    <td><span className="badge badge-secondary">{agent.helper_code}</span></td>
                                                    <td>
                                                        <span className={`status-indicator ${agent.status === 'ONLINE' ? 'status-green' : 'status-red'}`}></span>
                                                        {agent.status}
                                                    </td>
                                                    <td>
                                                        <div className="action-buttons">
                                                            <button className="btn-icon" onClick={() => openEditModal(agent)} title="Edit">
                                                                <Edit2 size={18} />
                                                            </button>
                                                            <button className="btn-icon text-danger" onClick={() => deleteAgent(agent.id)} title="Remove">
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* CREDENTIALS TAB */}
                    {activeTab === 'credentials' && (
                        <div className="settings-section animate-fade-in">
                            <h2>Admin Credentials</h2>
                            <p className="text-secondary mb-4">Update the username and password used to access this dashboard.</p>

                            <div className="form-group">
                                <label>Admin Username</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="ADMIN_USERNAME"
                                    value={envSettings.ADMIN_USERNAME || ''}
                                    onChange={handleEnvChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>Admin Password</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    name="ADMIN_PASSWORD"
                                    placeholder="••••••••"
                                    value={envSettings.ADMIN_PASSWORD || ''}
                                    onChange={handleEnvChange}
                                />
                            </div>

                            <div className="settings-actions">
                                {envMessage && <span className="settings-msg">{envMessage}</span>}
                                <button className="btn btn-primary" onClick={saveEnvSettings} disabled={envLoading}>
                                    <Save size={18} /> {envLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* NUMBERS TAB */}
                    {activeTab === 'numbers' && (
                        <div className="settings-section animate-fade-in">
                            <h2>Manage Numbers</h2>
                            <p className="text-secondary mb-4">Configure the main administrative phone numbers.</p>

                            <div className="form-group">
                                <label>Admin Phone Number (System Alerts)</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="ADMIN_PHONE_NUMBER"
                                    value={envSettings.ADMIN_PHONE_NUMBER || ''}
                                    onChange={handleEnvChange}
                                    placeholder="e.g. 919885131080"
                                />
                                <small className="form-text">This number receives critical system notifications.</small>
                            </div>

                            <div className="settings-actions">
                                {envMessage && <span className="settings-msg">{envMessage}</span>}
                                <button className="btn btn-primary" onClick={saveEnvSettings} disabled={envLoading}>
                                    <Save size={18} /> {envLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* SYSTEM TOGGLES TAB */}
                    {activeTab === 'system' && (
                        <div className="settings-section animate-fade-in">
                            <h2>System Configuration</h2>
                            <p className="text-secondary mb-4">Adjust operational parameters and platform toggles.</p>

                            <div className="grid-2-col">
                                <div className="form-group">
                                    <label>Helper Charge (₹)</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        name="HELPER_CHARGE"
                                        value={envSettings.HELPER_CHARGE || ''}
                                        onChange={handleEnvChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Platform Fee (₹)</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        name="PLATFORM_FEE"
                                        value={envSettings.PLATFORM_FEE || ''}
                                        onChange={handleEnvChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Auto-Assign Timeout (seconds)</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        name="AUTO_ASSIGN_TIMEOUT"
                                        value={envSettings.AUTO_ASSIGN_TIMEOUT || ''}
                                        onChange={handleEnvChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>OTP Expiry (minutes)</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        name="OTP_EXPIRY_MINUTES"
                                        value={envSettings.OTP_EXPIRY_MINUTES || ''}
                                        onChange={handleEnvChange}
                                    />
                                </div>
                            </div>

                            <div className="toggle-group mt-4">
                                <label className="toggle-label">
                                    <input
                                        type="checkbox"
                                        name="DEBUG_MODE"
                                        checked={envSettings.DEBUG_MODE === 'true'}
                                        onChange={handleEnvChange}
                                    />
                                    <span className="toggle-slider"></span>
                                    Enable Debug Mode (Detailed Logs)
                                </label>
                            </div>

                            <div className="settings-actions mt-4">
                                {envMessage && <span className="settings-msg">{envMessage}</span>}
                                <button className="btn btn-primary" onClick={saveEnvSettings} disabled={envLoading}>
                                    <Save size={18} /> {envLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    )}

                                        {/* PRICING TAB */}
                    {activeTab === 'pricing' && (
                        <div className="settings-section animate-fade-in">
                            <h2>Pricing & Offers</h2>
                            <p className="text-secondary mb-4">Manage ride fares, surge events, and customer discounts.</p>
                            
                            {/* ADVANCED Dynamic Pricing */}
                            <div className="card mb-4 p-3 bg-light">
                                <h3 className="section-subtitle mb-3">Advanced Ride Pricing Card</h3>
                                
                                <div className="pricing-subtabs mb-4" style={{ display: 'flex', gap: '10px' }}>
                                    <button 
                                        type="button"
                                        className={`btn btn-sm ${pricingSubTab === 'global' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                        onClick={() => setPricingSubTab('global')}
                                        style={{ padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold' }}
                                    >
                                        Global Rules
                                    </button>
                                    <button 
                                        type="button"
                                        className={`btn btn-sm ${pricingSubTab === 'vehicles' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                        onClick={() => setPricingSubTab('vehicles')}
                                        style={{ padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold' }}
                                    >
                                        Vehicle Rates & Tiers
                                    </button>
                                </div>

                                {pricingSubTab === 'global' && (
                                    <div className="global-pricing-rules animate-fade-in">
                                        <div className="grid-2-col mb-3">
                                            <div className="form-group">
                                                <label>Platform Commission (%)</label>
                                                <input 
                                                    type="number" 
                                                    className="form-control"
                                                    value={advancedPricing.COMMISSION_PERCENT || ''}
                                                    onChange={(e) => setAdvancedPricing({
                                                        ...advancedPricing,
                                                        COMMISSION_PERCENT: parseFloat(e.target.value) || 0
                                                    })}
                                                />
                                            </div>
                                        </div>

                                        <h4 className="mt-4 mb-2 text-primary" style={{ fontSize: '1.1rem', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>Long Pickup Rules</h4>
                                        <div className="grid-3-col mb-3">
                                            <div className="form-group">
                                                <label>Threshold (km)</label>
                                                <input 
                                                    type="number" 
                                                    className="form-control"
                                                    value={advancedPricing.LONG_PICKUP?.threshold_km || ''}
                                                    onChange={(e) => setAdvancedPricing({
                                                        ...advancedPricing,
                                                        LONG_PICKUP: { ...advancedPricing.LONG_PICKUP, threshold_km: parseFloat(e.target.value) || 0 }
                                                    })}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Rate per km (₹)</label>
                                                <input 
                                                    type="number" 
                                                    className="form-control"
                                                    value={advancedPricing.LONG_PICKUP?.rate_per_km || ''}
                                                    onChange={(e) => setAdvancedPricing({
                                                        ...advancedPricing,
                                                        LONG_PICKUP: { ...advancedPricing.LONG_PICKUP, rate_per_km: parseFloat(e.target.value) || 0 }
                                                    })}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Max Fee (₹)</label>
                                                <input 
                                                    type="number" 
                                                    className="form-control"
                                                    value={advancedPricing.LONG_PICKUP?.max_fee || ''}
                                                    onChange={(e) => setAdvancedPricing({
                                                        ...advancedPricing,
                                                        LONG_PICKUP: { ...advancedPricing.LONG_PICKUP, max_fee: parseFloat(e.target.value) || 0 }
                                                    })}
                                                />
                                            </div>
                                        </div>

                                        <h4 className="mt-4 mb-2 text-primary" style={{ fontSize: '1.1rem', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>Night Fare Rules</h4>
                                        <div className="grid-3-col mb-3">
                                            <div className="form-group">
                                                <label>Start Hour (24h)</label>
                                                <input 
                                                    type="number" 
                                                    className="form-control"
                                                    value={advancedPricing.NIGHT_FARE?.start_hour || 0}
                                                    onChange={(e) => setAdvancedPricing({
                                                        ...advancedPricing,
                                                        NIGHT_FARE: { ...advancedPricing.NIGHT_FARE, start_hour: parseInt(e.target.value) || 0 }
                                                    })}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>End Hour (24h)</label>
                                                <input 
                                                    type="number" 
                                                    className="form-control"
                                                    value={advancedPricing.NIGHT_FARE?.end_hour || 0}
                                                    onChange={(e) => setAdvancedPricing({
                                                        ...advancedPricing,
                                                        NIGHT_FARE: { ...advancedPricing.NIGHT_FARE, end_hour: parseInt(e.target.value) || 0 }
                                                    })}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Fare Multiplier (e.g. 1.25)</label>
                                                <input 
                                                    type="number" 
                                                    step="0.05"
                                                    className="form-control"
                                                    value={advancedPricing.NIGHT_FARE?.multiplier || 1}
                                                    onChange={(e) => setAdvancedPricing({
                                                        ...advancedPricing,
                                                        NIGHT_FARE: { ...advancedPricing.NIGHT_FARE, multiplier: parseFloat(e.target.value) || 1 }
                                                    })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {pricingSubTab === 'vehicles' && (
                                    <div className="vehicle-pricing-rules animate-fade-in">
                                        {['BIKE', 'AUTO', 'CAR'].map(v => {
                                            const vConf = advancedPricing.VEHICLES?.[v] || { base_fare: 0, time_rate_per_min: 0, distance_tiers: [] };
                                            return (
                                                <div key={v} className="vehicle-block mb-4 p-3 border rounded bg-white shadow-sm">
                                                    <h4 className="fw-bold mb-3 text-secondary">{v === 'BIKE' ? '🏍️' : v === 'AUTO' ? '🛺' : '🚗'} {v} Rates</h4>
                                                    <div className="grid-2-col mb-3">
                                                        <div className="form-group">
                                                            <label>Base Fare (₹)</label>
                                                            <input 
                                                                type="number" 
                                                                className="form-control"
                                                                value={vConf.base_fare || 0}
                                                                onChange={(e) => {
                                                                    const updated = { ...advancedPricing };
                                                                    updated.VEHICLES[v] = { ...vConf, base_fare: parseFloat(e.target.value) || 0 };
                                                                    setAdvancedPricing(updated);
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="form-group">
                                                            <label>Time Fare (₹/min)</label>
                                                            <input 
                                                                type="number" 
                                                                step="0.01"
                                                                className="form-control"
                                                                value={vConf.time_rate_per_min || 0}
                                                                onChange={(e) => {
                                                                    const updated = { ...advancedPricing };
                                                                    updated.VEHICLES[v] = { ...vConf, time_rate_per_min: parseFloat(e.target.value) || 0 };
                                                                    setAdvancedPricing(updated);
                                                                }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <h5 className="text-secondary mt-3 mb-2" style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>Distance-Based Tiers</h5>
                                                    <div className="tiers-list mb-3">
                                                        {(vConf.distance_tiers || []).map((tier, idx) => (
                                                            <div key={idx} className="tier-row mb-2 p-2 bg-light rounded" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                                <span style={{ minWidth: '90px', fontSize: '0.9rem', fontWeight: 'bold' }}>Tier {idx + 1}: Up to</span>
                                                                <input 
                                                                    type="number" 
                                                                    className="form-control form-control-sm" 
                                                                    style={{ maxWidth: '80px' }}
                                                                    placeholder="km" 
                                                                    value={tier.up_to_km} 
                                                                    onChange={(e) => {
                                                                        const updated = { ...advancedPricing };
                                                                        updated.VEHICLES[v].distance_tiers[idx].up_to_km = parseFloat(e.target.value) || 0;
                                                                        setAdvancedPricing(updated);
                                                                    }}
                                                                />
                                                                <span style={{ fontSize: '0.9rem' }}>km</span>
                                                                <span style={{ fontSize: '0.9rem', margin: '0 5px' }}>=</span>
                                                                <input 
                                                                    type="number" 
                                                                    step="0.1"
                                                                    className="form-control form-control-sm" 
                                                                    style={{ maxWidth: '90px' }}
                                                                    placeholder="₹/km" 
                                                                    value={tier.rate_per_km} 
                                                                    onChange={(e) => {
                                                                        const updated = { ...advancedPricing };
                                                                        updated.VEHICLES[v].distance_tiers[idx].rate_per_km = parseFloat(e.target.value) || 0;
                                                                        setAdvancedPricing(updated);
                                                                    }}
                                                                />
                                                                <span style={{ fontSize: '0.9rem' }}>₹/km</span>
                                                                <button 
                                                                    type="button" 
                                                                    className="btn btn-sm text-danger ml-auto"
                                                                    onClick={() => {
                                                                        const updated = { ...advancedPricing };
                                                                        updated.VEHICLES[v].distance_tiers.splice(idx, 1);
                                                                        setAdvancedPricing(updated);
                                                                    }}
                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <button 
                                                        type="button" 
                                                        className="btn btn-outline-primary btn-sm d-flex align-items-center"
                                                        onClick={() => {
                                                            const updated = { ...advancedPricing };
                                                            if (!updated.VEHICLES[v]) updated.VEHICLES[v] = { base_fare: 0, time_rate_per_min: 0, distance_tiers: [] };
                                                            if (!updated.VEHICLES[v].distance_tiers) updated.VEHICLES[v].distance_tiers = [];
                                                            updated.VEHICLES[v].distance_tiers.push({ up_to_km: 100, rate_per_km: 10 });
                                                            setAdvancedPricing(updated);
                                                        }}
                                                        style={{ gap: '5px' }}
                                                    >
                                                        <Plus size={14} /> Add New Distance Tier
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="mt-3 text-right">
                                    {envMessage && <span className="settings-msg mr-3">{envMessage}</span>}
                                    <button className="btn btn-primary" onClick={saveEnvSettings} disabled={envLoading}>
                                        <Save size={18} style={{ marginRight: '8px' }} /> {envLoading ? 'Saving...' : 'Apply Advanced Pricing'}
                                    </button>
                                </div>
                            </div>

                            {/* SURGE CONFIGURATION */}
                            <div className="card mb-4 p-3 border-warning">
                                <h3 className="section-subtitle text-warning mb-3">Active Surges</h3>
                                <p className="text-secondary mb-3" style={{fontSize: '0.85rem'}}>Configure surge amounts per service. These will be added to the base fare and helper earnings.</p>
                                
                                {surges.length > 0 ? (
                                    <div className="table-responsive mb-4">
                                        <table className="n2d-table w-100">
                                            <thead>
                                                <tr>
                                                    <th>Service</th>
                                                    <th>Amount (₹)</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {surges.map(surge => (
                                                    <tr key={surge.id}>
                                                        <td><span className="badge badge-warning text-dark">{surge.service}</span></td>
                                                        <td>₹{surge.amount}</td>
                                                        <td>
                                                            <div className="action-buttons">
                                                                <button className="btn btn-warning btn-sm" onClick={() => notifySurge(surge)} title="Notify Helpers" style={{fontSize: '12px', padding: '4px 8px'}}>
                                                                    <Bell size={14} style={{marginRight: '4px'}} /> Notify
                                                                </button>
                                                                <button className="btn-icon text-danger" onClick={() => handleRemoveSurge(surge.id)} title="Remove Surge">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-secondary mb-4 text-center">No active surges running.</p>
                                )}

                                {/* Add New Surge Form */}
                                <div className="bg-light p-3 rounded mt-3 border border-warning" style={{backgroundColor: '#fffcf5'}}>
                                    <h4 className="mb-3 text-warning" style={{ fontSize: '1rem' }}>Add New Surge</h4>
                                    <div className="grid-2-col mb-3">
                                        <div className="form-group">
                                            <label>Service Type</label>
                                            <select 
                                                className="form-control"
                                                value={surgeForm.service}
                                                onChange={(e) => setSurgeForm({...surgeForm, service: e.target.value})}
                                            >
                                                <option value="RIDE">Ride Service</option>
                                                <option value="TASK">Task Delivery</option>
                                                <option value="ANYWORK">AnyWork</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Surge Amount (₹)</label>
                                            <input 
                                                type="number" 
                                                className="form-control"
                                                placeholder="e.g. 50"
                                                value={surgeForm.amount}
                                                onChange={(e) => setSurgeForm({...surgeForm, amount: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    <button className="btn btn-warning" onClick={handleAddSurge}>
                                        <Plus size={18} /> Add & Apply Surge
                                    </button>
                                </div>
                            </div>

                            {/* DISCOUNTS & OFFERS */}
                            <div className="card mb-4 p-3 border-success">
                                <h3 className="section-subtitle text-success mb-3">Active Customer Offers</h3>
                                
                                {/* Active Offers Table */}
                                {offers.length > 0 ? (
                                    <div className="table-responsive mb-4">
                                        <table className="n2d-table w-100">
                                            <thead>
                                                <tr>
                                                    <th>Service</th>
                                                    <th>Type</th>
                                                    <th>Value</th>
                                                    <th>Message to Customer</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {offers.map(offer => (
                                                    <tr key={offer.id}>
                                                        <td><span className="badge badge-primary">{offer.service}</span></td>
                                                        <td>{offer.type}</td>
                                                        <td>{offer.type === 'PERCENT' ? `${offer.value}%` : `₹${offer.value}`}</td>
                                                        <td><small>{offer.msg}</small></td>
                                                        <td>
                                                            <button className="btn-icon text-danger" onClick={() => handleRemoveOffer(offer.id)} title="Remove Offer">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-secondary mb-4 text-center">No active offers running.</p>
                                )}

                                {/* Add New Offer Form */}
                                <div className="bg-light p-3 rounded mt-3">
                                    <h4 className="mb-3" style={{ fontSize: '1rem' }}>Create New Offer</h4>
                                    <div className="grid-2-col mb-3">
                                        <div className="form-group">
                                            <label>Service Type</label>
                                            <select 
                                                className="form-control"
                                                value={offerForm.service}
                                                onChange={(e) => setOfferForm({...offerForm, service: e.target.value})}
                                            >
                                                <option value="RIDE">Ride Service</option>
                                                <option value="TASK">Task Delivery</option>
                                                <option value="ANYWORK">AnyWork</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Discount Type</label>
                                            <select 
                                                className="form-control"
                                                value={offerForm.type}
                                                onChange={(e) => setOfferForm({...offerForm, type: e.target.value})}
                                            >
                                                <option value="PERCENT">Percentage (%)</option>
                                                <option value="AMOUNT">Flat Amount (₹)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid-2-col mb-3">
                                        <div className="form-group">
                                            <label>Discount Value</label>
                                            <input 
                                                type="number" 
                                                className="form-control"
                                                placeholder="e.g. 10"
                                                value={offerForm.value}
                                                onChange={(e) => setOfferForm({...offerForm, value: e.target.value})}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Message shown to Customer</label>
                                            <input 
                                                type="text" 
                                                className="form-control"
                                                placeholder="e.g. Weekend Special! 10% Off!"
                                                value={offerForm.msg}
                                                onChange={(e) => setOfferForm({...offerForm, msg: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    <button className="btn btn-success" onClick={handleAddOffer}>
                                        <Plus size={18} /> Add & Apply Offer
                                    </button>
                                </div>
                            </div>
                            
                            {/* General Save Bottom */}
                            <div className="settings-actions mt-4 border-top pt-3">
                                {envMessage && <span className="settings-msg">{envMessage}</span>}
                                <button className="btn btn-primary" onClick={saveEnvSettings} disabled={envLoading}>
                                    <Save size={18} /> {envLoading ? 'Saving...' : 'Save All General Changes'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ADD/EDIT AGENT MODAL */}
            {isAddModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content card">
                        <div className="modal-header">
                            <h3>{editingAgent ? 'Edit Agent' : 'Add New Agent'}</h3>
                            <button className="btn-icon" onClick={closeAgentModal}><X size={20} /></button>
                        </div>
                        <form onSubmit={saveAgent}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Full Name</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="name"
                                        required
                                        value={agentForm.name}
                                        onChange={handleAgentFormChange}
                                        placeholder="e.g. John Doe"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Phone Number (with country code)</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="phone"
                                        required
                                        value={agentForm.phone}
                                        onChange={handleAgentFormChange}
                                        placeholder="e.g. 919876543210"
                                    />
                                </div>
                                {!editingAgent && (
                                    <div className="form-group">
                                        <label>Helper Code (Optional)</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            name="helper_code"
                                            value={agentForm.helper_code}
                                            onChange={handleAgentFormChange}
                                            placeholder="Leave empty for auto-generation"
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closeAgentModal}>Cancel</button>
                                <button type="submit" className="btn btn-primary">
                                    <Save size={18} /> {editingAgent ? 'Update Agent' : 'Save Agent'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
