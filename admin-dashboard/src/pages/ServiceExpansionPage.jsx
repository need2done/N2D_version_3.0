import React, { useState, useEffect } from 'react';
import { 
  Globe, MapPin, Compass, Plus, Edit2, Trash2, CheckCircle2, 
  AlertTriangle, RefreshCw, X, ShieldCheck, Zap, Navigation, 
  Search, Sliders, Info, ChevronRight, Check, MapPinned, ArrowRight
} from 'lucide-react';
import { API_URL } from '../config';

// Quick expansion presets for rapid one-click expansion around Yadadri Bhuvanagiri & surrounding mandals
const EXPANSION_PRESETS = [
  {
    name: 'Alair & Station Corridor',
    centerLat: 17.6322,
    centerLng: 79.0345,
    radiusKm: 15.0,
    status: 'ACTIVE',
    description: 'Covers Alair town, railway corridor, and surrounding agricultural belt.',
    villagesCovered: ['Alair Town', 'Sharjipally', 'Manthapuri', 'Kolampally', 'Kollur']
  },
  {
    name: 'Bhoodan Pochampally Textile Belt',
    centerLat: 17.3486,
    centerLng: 78.8142,
    radiusKm: 15.0,
    status: 'ACTIVE',
    description: 'Famous weaving hub, tourism belt, and connecting rural hamlets.',
    villagesCovered: ['Pochampally', 'Mukthapur', 'Revanapally', 'Jalala', 'Kanumukkala']
  },
  {
    name: 'Bibinagar AIIMS & Industrial Corridor',
    centerLat: 17.4727,
    centerLng: 78.7892,
    radiusKm: 12.0,
    status: 'ACTIVE',
    description: 'AIIMS hospital campus, local IT/industrial units, and village settlements.',
    villagesCovered: ['Bibinagar', 'Kondamadugu', 'Padmati Somaram', 'Raghavapuram', 'Jameelapet']
  },
  {
    name: 'Valigonda & Musi River Basin',
    centerLat: 17.4089,
    centerLng: 79.0142,
    radiusKm: 15.0,
    status: 'COMING_SOON',
    description: 'Agricultural hub and market area connecting to Nalgonda highway.',
    villagesCovered: ['Valigonda', 'Tekulasomaram', 'Goprajpally', 'Reddinaik Thanda', 'Vemulakonda']
  },
  {
    name: 'Choutuppal NH-65 Highway Belt',
    centerLat: 17.2514,
    centerLng: 78.8953,
    radiusKm: 15.0,
    status: 'COMING_SOON',
    description: 'Major National Highway-65 logistics, pharma industrial cluster, and town center.',
    villagesCovered: ['Choutuppal', 'Lingojiguda', 'Panthangi', 'Malkapur', 'Thallasingaram']
  }
];

// Presets for geofence testing simulator
const SIMULATOR_PRESETS = [
  { label: 'Bhongir Clock Tower', lat: 17.5113, lng: 78.8899, type: 'core' },
  { label: 'Raigir Railway Station', lat: 17.5320, lng: 78.9140, type: 'core' },
  { label: 'Yadagirigutta Temple Hill', lat: 17.5850, lng: 78.9450, type: 'belt' },
  { label: 'Bibinagar AIIMS Campus', lat: 17.4727, lng: 78.7892, type: 'belt' },
  { label: 'Ghatkesar Outer Ring Road', lat: 17.4475, lng: 78.6830, type: 'belt' },
  { label: 'Secunderabad Junction (Out of Zone)', lat: 17.4399, lng: 78.4983, type: 'out' },
  { label: 'Chennai Central, TN (Out of State)', lat: 13.0827, lng: 80.2707, type: 'out' },
  { label: 'Bengaluru Majestic, KA (Out of State)', lat: 12.9716, lng: 77.5946, type: 'out' },
];

export default function ServiceExpansionPage() {
  const [activeTab, setActiveTab] = useState('zones'); // 'zones', 'simulator', 'settings'
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState([]);
  const [globalSettings, setGlobalSettings] = useState({
    defaultRadiusKm: 30.0,
    defaultCenterLat: 17.5113,
    defaultCenterLng: 78.8899,
    primaryAreaName: 'Bhongir and surrounding villages',
    comingSoonMessageTe: '',
    comingSoonMessageEn: ''
  });
  const [stats, setStats] = useState({
    totalZones: 0,
    activeZones: 0,
    comingSoonZones: 0,
    maxCoverageRadius: 30.0
  });

  const [notification, setNotification] = useState(null); // { type: 'success' | 'error', message: '' }
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'ACTIVE', 'COMING_SOON'

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [editingZoneId, setEditingZoneId] = useState(null);
  const [zoneFormData, setZoneFormData] = useState({
    name: '',
    centerLat: 17.5113,
    centerLng: 78.8899,
    radiusKm: 15.0,
    status: 'ACTIVE',
    description: '',
    villagesCovered: ''
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Delete Modal state
  const [deleteModalZone, setDeleteModalZone] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Simulator state
  const [simLat, setSimLat] = useState('17.5113');
  const [simLng, setSimLng] = useState('78.8899');
  const [simTesting, setSimTesting] = useState(false);
  const [simResult, setSimResult] = useState(null);

  // Settings form state
  const [savingSettings, setSavingSettings] = useState(false);

  // Get Admin token
  const getAuthToken = () => {
    return localStorage.getItem('adminToken') || localStorage.getItem('token') || '';
  };

  // Show Toast
  const showToast = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Fetch all zones and settings
  const fetchZones = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/service-zones`);
      const data = await res.json();
      if (data.success) {
        setZones(data.zones || []);
        if (data.global) {
          setGlobalSettings(data.global);
        }
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        showToast('error', data.error || 'Failed to load service zones');
      }
    } catch (err) {
      console.error('Error fetching service zones:', err);
      showToast('error', 'Network error connecting to service zones API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  // Quick Toggle Zone Status (Active <-> Coming Soon)
  const handleToggleZoneStatus = async (zone) => {
    const nextStatus = zone.status === 'ACTIVE' ? 'COMING_SOON' : 'ACTIVE';
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/service-zones/${zone.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          'success', 
          `Zone "${zone.name}" is now ${nextStatus === 'ACTIVE' ? '🟢 LIVE (Orders Allowed)' : '🟠 COMING SOON (Guarded)'}!`
        );
        fetchZones();
      } else {
        showToast('error', data.error || 'Could not update zone status');
      }
    } catch (err) {
      showToast('error', 'Network error updating zone');
    }
  };

  // Open Modal for Add
  const handleOpenAddModal = (preset = null) => {
    setModalMode('add');
    setEditingZoneId(null);
    if (preset) {
      setZoneFormData({
        name: preset.name,
        centerLat: preset.centerLat,
        centerLng: preset.centerLng,
        radiusKm: preset.radiusKm,
        status: preset.status,
        description: preset.description,
        villagesCovered: (preset.villagesCovered || []).join(', ')
      });
    } else {
      setZoneFormData({
        name: '',
        centerLat: globalSettings.defaultCenterLat || 17.5113,
        centerLng: globalSettings.defaultCenterLng || 78.8899,
        radiusKm: 15.0,
        status: 'ACTIVE',
        description: '',
        villagesCovered: ''
      });
    }
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (zone) => {
    setModalMode('edit');
    setEditingZoneId(zone.id);
    setZoneFormData({
      name: zone.name || '',
      centerLat: zone.centerLat || 17.5113,
      centerLng: zone.centerLng || 78.8899,
      radiusKm: zone.radiusKm || 15.0,
      status: zone.status || 'ACTIVE',
      description: zone.description || '',
      villagesCovered: Array.isArray(zone.villagesCovered) ? zone.villagesCovered.join(', ') : (zone.villagesCovered || '')
    });
    setIsModalOpen(true);
  };

  // Submit Add or Edit Form
  const handleSaveZone = async (e) => {
    e.preventDefault();
    if (!zoneFormData.name.trim()) {
      showToast('error', 'Zone name is required.');
      return;
    }

    try {
      setFormSubmitting(true);
      const token = getAuthToken();
      const payload = {
        name: zoneFormData.name.trim(),
        centerLat: parseFloat(zoneFormData.centerLat),
        centerLng: parseFloat(zoneFormData.centerLng),
        radiusKm: parseFloat(zoneFormData.radiusKm),
        status: zoneFormData.status,
        description: zoneFormData.description.trim(),
        villagesCovered: zoneFormData.villagesCovered
      };

      const endpoint = modalMode === 'add' 
        ? `${API_URL}/service-zones`
        : `${API_URL}/service-zones/${editingZoneId}`;
      const method = modalMode === 'add' ? 'POST' : 'PUT';

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', modalMode === 'add' ? 'New service zone created successfully!' : 'Service zone updated successfully!');
        setIsModalOpen(false);
        fetchZones();
      } else {
        showToast('error', data.error || 'Failed to save zone.');
      }
    } catch (err) {
      showToast('error', 'Error connecting to server.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Zone
  const handleDeleteZoneConfirm = async () => {
    if (!deleteModalZone) return;
    try {
      setDeleting(true);
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/service-zones/${deleteModalZone.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', `Zone "${deleteModalZone.name}" deleted.`);
        setDeleteModalZone(null);
        fetchZones();
      } else {
        showToast('error', data.error || 'Failed to delete zone.');
      }
    } catch (err) {
      showToast('error', 'Error deleting zone.');
    } finally {
      setDeleting(false);
    }
  };

  // Run Simulator Test
  const handleRunSimulator = async (latVal, lngVal) => {
    const lat = latVal !== undefined ? latVal : simLat;
    const lng = lngVal !== undefined ? lngVal : simLng;

    try {
      setSimTesting(true);
      setSimResult(null);
      const res = await fetch(`${API_URL}/service-zones/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: parseFloat(lat), lng: parseFloat(lng) })
      });
      const data = await res.json();
      if (data.success) {
        setSimResult(data);
      } else {
        showToast('error', data.error || 'Test check failed.');
      }
    } catch (err) {
      showToast('error', 'Could not run location test.');
    } finally {
      setSimTesting(false);
    }
  };

  // Save Global Settings
  const handleSaveGlobalSettings = async (e) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/service-zones/settings/global`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(globalSettings)
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Global service boundary settings saved and synced to environment!');
        fetchZones();
      } else {
        showToast('error', data.error || 'Failed to save global settings.');
      }
    } catch (err) {
      showToast('error', 'Network error saving settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Filtered zones list
  const filteredZones = zones.filter(zone => {
    const matchesSearch = 
      zone.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (zone.description && zone.description.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (zone.villagesCovered && zone.villagesCovered.some(v => v.toLowerCase().includes(searchFilter.toLowerCase())));

    const matchesStatus = 
      statusFilter === 'ALL' ? true :
      statusFilter === 'ACTIVE' ? zone.status === 'ACTIVE' :
      zone.status !== 'ACTIVE';

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

      {/* ── Toast Notification ── */}
      {notification && (
        <div 
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all transform animate-bounce ${
            notification.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle size={18} className="text-rose-600 flex-shrink-0" />
          )}
          <span>{notification.message}</span>
          <button 
            onClick={() => setNotification(null)} 
            className="text-slate-400 hover:text-slate-600 ml-2"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Top Header & Hero Banner ── */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold uppercase tracking-wider mb-3">
              <Globe size={14} className="text-blue-400 animate-spin-slow" />
              Multi-Zone Expansion Engine
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Service Expansion & Geofence Manager
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
              Seamlessly scale Need2Done to new towns, mandals, and villages without code changes. Manage geofences, toggle live order acceptance, and prevent out-of-boundary requests with automated bilingual customer notifications.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fetchZones()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition backdrop-blur-sm border border-white/10 active:scale-95 disabled:opacity-50"
              title="Refresh all zone data"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => handleOpenAddModal()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-500/25 transition active:scale-95"
            >
              <Plus size={18} strokeWidth={2.5} />
              <span>Add New Zone</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="bg-white/5 rounded-xl p-3 sm:p-4 border border-white/5">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Service Hubs</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-emerald-400">{stats.activeZones}</span>
              <span className="text-xs text-emerald-400 font-medium">● Live Taking Orders</span>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-3 sm:p-4 border border-white/5">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Staged Expansion</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-amber-400">{stats.comingSoonZones}</span>
              <span className="text-xs text-amber-300 font-medium">Coming Soon</span>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-3 sm:p-4 border border-white/5">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Max Coverage Radius</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-white">{stats.maxCoverageRadius}</span>
              <span className="text-xs text-slate-400 font-medium">KM geofence</span>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-3 sm:p-4 border border-white/5">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Anchor Center</span>
            <div className="mt-1">
              <div className="text-sm font-bold text-white truncate">{globalSettings.primaryAreaName || 'Bhongir Hub'}</div>
              <span className="text-xs text-slate-400 font-mono">17.5113°N, 78.8899°E</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1.5 shadow-sm">
        <button
          onClick={() => setActiveTab('zones')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition ${
            activeTab === 'zones'
              ? 'bg-blue-50 text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <MapPin size={17} />
          <span>Operational Zones ({zones.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition ${
            activeTab === 'simulator'
              ? 'bg-blue-50 text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Compass size={17} />
          <span>Live Geofence Simulator</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition ${
            activeTab === 'settings'
              ? 'bg-blue-50 text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Sliders size={17} />
          <span>Global Boundary & Bot Messages</span>
        </button>
      </div>

      {/* ========================================================
          TAB 1: OPERATIONAL ZONES & RAPID EXPANSION
      ======================================================== */}
      {activeTab === 'zones' && (
        <div className="space-y-6">

          {/* Quick One-Click Expansion Presets */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 p-5 rounded-2xl border border-blue-100 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={18} className="text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Rapid Expansion Templates (1-Click Staging)
              </h3>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              Need to expand into neighboring mandals? Click any location below to pre-fill coordinates, radius, and local village lists:
            </p>
            <div className="flex flex-wrap gap-2">
              {EXPANSION_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleOpenAddModal(preset)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-blue-600 hover:text-white text-slate-700 text-xs font-semibold border border-slate-200 hover:border-blue-600 shadow-sm transition active:scale-95 group"
                >
                  <Plus size={13} className="text-blue-500 group-hover:text-white" />
                  <span>{preset.name}</span>
                  <span className="text-[10px] text-slate-400 group-hover:text-blue-200">({preset.radiusKm}km)</span>
                </button>
              ))}
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search zones by name, mandal, or village..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              {searchFilter && (
                <button 
                  onClick={() => setSearchFilter('')} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Status:</span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
                {['ALL', 'ACTIVE', 'COMING_SOON'].map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 rounded-md font-medium transition ${
                      statusFilter === status 
                        ? 'bg-white text-blue-700 shadow-sm' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {status === 'ALL' ? 'All Zones' : status === 'ACTIVE' ? 'Active' : 'Coming Soon'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Zones Grid */}
          {loading ? (
            <div className="py-20 text-center bg-white rounded-2xl border border-slate-200">
              <RefreshCw size={28} className="animate-spin text-blue-500 mx-auto mb-3" />
              <p className="text-sm text-slate-500 font-medium">Loading configured service zones...</p>
            </div>
          ) : filteredZones.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300 p-8">
              <Globe size={40} className="text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">No matching service zones found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchFilter ? 'Try clearing your search term or filter.' : 'Add your first service zone to define your delivery and ride territory.'}
              </p>
              <button
                onClick={() => handleOpenAddModal()}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition"
              >
                <Plus size={15} />
                <span>Create Zone</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredZones.map(zone => {
                const isActive = zone.status === 'ACTIVE';

                return (
                  <div
                    key={zone.id}
                    className={`bg-white rounded-2xl border transition-all duration-200 hover:shadow-md flex flex-col justify-between overflow-hidden ${
                      isActive ? 'border-slate-200 hover:border-emerald-300' : 'border-slate-200 hover:border-amber-300'
                    }`}
                  >
                    {/* Zone Card Header */}
                    <div className="p-5 border-b border-slate-100">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span 
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                isActive 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                              {isActive ? 'ACTIVE / LIVE' : 'COMING SOON'}
                            </span>

                            <span className="text-[11px] font-mono text-slate-400">
                              {zone.radiusKm} km radius
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-slate-900 leading-snug">
                            {zone.name}
                          </h3>
                        </div>

                        {/* 1-Click Status Toggle Button */}
                        <button
                          onClick={() => handleToggleZoneStatus(zone)}
                          className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold border transition active:scale-95 ${
                            isActive
                              ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          }`}
                          title={isActive ? 'Click to pause orders in this zone' : 'Click to activate orders immediately in this zone'}
                        >
                          {isActive ? 'Pause' : 'Activate'}
                        </button>
                      </div>

                      {zone.description && (
                        <p className="mt-2 text-xs text-slate-500 line-clamp-2">
                          {zone.description}
                        </p>
                      )}
                    </div>

                    {/* Zone Details Body */}
                    <div className="p-5 space-y-4 flex-1">
                      {/* GPS & Radius details */}
                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Center GPS</span>
                          <span className="font-mono text-slate-700 font-medium">
                            {Number(zone.centerLat).toFixed(4)}, {Number(zone.centerLng).toFixed(4)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Allowed Distance</span>
                          <span className="font-semibold text-slate-800">
                            Up to {zone.radiusKm} KM
                          </span>
                        </div>
                      </div>

                      {/* Villages Chips */}
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                          Villages & Settlements ({Array.isArray(zone.villagesCovered) ? zone.villagesCovered.length : 0}):
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                          {Array.isArray(zone.villagesCovered) && zone.villagesCovered.length > 0 ? (
                            zone.villagesCovered.map((vil, vIdx) => (
                              <span
                                key={vIdx}
                                className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium"
                              >
                                {vil}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">No specific villages tagged.</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Zone Card Footer Actions */}
                    <div className="px-5 py-3 bg-slate-50/75 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => {
                          setSimLat(String(zone.centerLat));
                          setSimLng(String(zone.centerLng));
                          setActiveTab('simulator');
                          handleRunSimulator(zone.centerLat, zone.centerLng);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
                      >
                        <Compass size={13} />
                        <span>Test Pin Here</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(zone)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Edit Zone"
                        >
                          <Edit2 size={15} />
                        </button>

                        <button
                          onClick={() => setDeleteModalZone(zone)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Delete Zone"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 2: GEOFENCE SIMULATOR / TEST PIN
      ======================================================== */}
      {activeTab === 'simulator' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
                <Compass size={14} />
                Live Boundary Tester
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Test Location Serviceability
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Enter any GPS coordinates or pick a preset location to simulate whether a customer's WhatsApp location pin will be accepted or guarded with a Coming Soon response.
              </p>
            </div>

            {/* Quick Test Presets */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Quick Test Landmarks:
              </span>
              <div className="flex flex-wrap gap-2">
                {SIMULATOR_PRESETS.map((preset, idx) => {
                  const isOut = preset.type === 'out';
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setSimLat(String(preset.lat));
                        setSimLng(String(preset.lng));
                        handleRunSimulator(preset.lat, preset.lng);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition active:scale-95 ${
                        isOut 
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200' 
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <MapPin size={12} className={isOut ? 'text-rose-500' : 'text-blue-500'} />
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input Form */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={simLat}
                  onChange={e => setSimLat(e.target.value)}
                  placeholder="e.g. 17.5113"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={simLng}
                  onChange={e => setSimLng(e.target.value)}
                  placeholder="e.g. 78.8899"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => handleRunSimulator()}
                  disabled={simTesting || !simLat || !simLng}
                  className="w-full px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-md transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Navigation size={16} className={simTesting ? 'animate-spin' : ''} />
                  <span>{simTesting ? 'Testing...' : 'Test Location'}</span>
                </button>
              </div>
            </div>

            {/* Simulator Results Display */}
            {simResult && (
              <div className="mt-6 space-y-4 animate-fade">
                {/* Result Status Banner */}
                <div
                  className={`p-5 rounded-2xl border flex items-start gap-4 ${
                    simResult.isServiceable
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {simResult.isServiceable ? (
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                      <CheckCircle2 size={22} />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                      <AlertTriangle size={22} />
                    </div>
                  )}

                  <div className="flex-1">
                    <h3 className="text-base font-bold">
                      {simResult.isServiceable ? 'Location is SERVICEABLE! 🎉' : 'Location is OUT OF SERVICE AREA ⚠️'}
                    </h3>
                    <p className="text-xs sm:text-sm mt-0.5 opacity-90">
                      {simResult.message}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold">
                      {simResult.matchedZone && (
                        <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800">
                          Matched Zone: {simResult.matchedZone}
                        </span>
                      )}
                      <span className="px-2.5 py-1 rounded-md bg-white/80 border border-slate-200 text-slate-700 font-mono">
                        Distance to nearest hub: {simResult.nearestDistanceKm} km
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grid: Zone Breakdown & WhatsApp Customer Preview */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Breakdown by defined zones */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-blue-600" />
                      Distance Breakdown By Configured Zones:
                    </h4>

                    <div className="space-y-2">
                      {simResult.zoneBreakdown && simResult.zoneBreakdown.map((zb, zIdx) => (
                        <div
                          key={zIdx}
                          className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-semibold text-slate-800">{zb.zoneName}</div>
                            <div className="text-[11px] text-slate-500">
                              Allowed: {zb.radiusKm} km | Status: {zb.status}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-mono font-bold text-slate-900 block">
                              {zb.distanceKm} km
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                zb.isServiceable
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : zb.isInside
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {zb.isServiceable ? 'Covered' : zb.isInside ? 'Coming Soon' : 'Outside'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Customer Experience Simulation */}
                  <div className="bg-slate-900 text-white p-5 rounded-xl shadow-lg border border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                          <span>💬</span> Customer WhatsApp Screen Preview
                        </span>
                        <span className="text-[10px] text-slate-400">Automated Bot Flow</span>
                      </div>

                      {simResult.isServiceable ? (
                        <div className="bg-emerald-950/60 border border-emerald-800/80 rounded-xl p-3.5 text-xs text-emerald-200 leading-relaxed font-sans space-y-2">
                          <p className="font-semibold text-white">✅ Location Accepted!</p>
                          <p>
                            "📍 Location verified inside <strong>{simResult.matchedZone}</strong>. Calculating best route and finding available Need2Done helpers near you..."
                          </p>
                          <div className="text-[11px] text-emerald-300 font-medium">
                            ▶ Proceeding to Helper Assignment & Live Quoting
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-3.5 text-xs text-slate-200 leading-relaxed font-sans space-y-2">
                          <p className="font-semibold text-amber-400">
                            📍 Location Out of Service Area / సర్వీస్ పరిధి వెలుపల
                          </p>
                          <p className="text-[11px] text-slate-300">
                            "The selected location is outside our operational zone. Need2Done is currently active in <strong>{globalSettings.primaryAreaName}</strong>. We are coming soon to your area! ✨"
                          </p>
                          <p className="text-[11px] text-slate-300">
                            "మీరు ఎంచుకున్న లొకేషన్ మా సర్వీస్ పరిధి వెలుపల ఉంది. ప్రస్తుతానికి నీడ్2డన్ సేవలు భువనగిరి పరిసర గ్రామాలలో మాత్రమే అందుబాటులో ఉన్నాయి. త్వరలోనే మీ ప్రాంతానికి కూడా రాబోతున్నాము! 🚀"
                          </p>
                          <div className="pt-2">
                            <span className="inline-block px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold text-[11px] shadow">
                              📍 Reselect Location / లొకేషన్ మార్చుకోండి
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Instant rejection protects riders & helpers</span>
                      <span>Zero manual intervention</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: GLOBAL SERVICE SETTINGS & BOT MESSAGES
      ======================================================== */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveGlobalSettings} className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              Global Boundary Defaults & WhatsApp Bot Messages
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mb-6">
              These settings serve as the system-wide fallback anchor and define the bilingual messaging shown to customers who select an out-of-boundary pin.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Primary Anchor Coordinates */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPinned size={14} className="text-blue-600" />
                  Primary Anchor Center
                </h3>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Primary Service Area Label
                  </label>
                  <input
                    type="text"
                    value={globalSettings.primaryAreaName || ''}
                    onChange={e => setGlobalSettings(prev => ({ ...prev, primaryAreaName: e.target.value }))}
                    placeholder="e.g. Bhongir and surrounding villages"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                    required
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Shown in customer rejection messages and system reports.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Center Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={globalSettings.defaultCenterLat || ''}
                      onChange={e => setGlobalSettings(prev => ({ ...prev, defaultCenterLat: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Center Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={globalSettings.defaultCenterLng || ''}
                      onChange={e => setGlobalSettings(prev => ({ ...prev, defaultCenterLng: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Default Boundary Radius (KM)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="5"
                      max="100"
                      step="1"
                      value={globalSettings.defaultRadiusKm || 30}
                      onChange={e => setGlobalSettings(prev => ({ ...prev, defaultRadiusKm: parseFloat(e.target.value) }))}
                      className="flex-1 accent-blue-600"
                    />
                    <span className="w-16 px-2.5 py-1.5 rounded-lg bg-slate-100 text-center font-mono font-bold text-sm text-slate-800">
                      {globalSettings.defaultRadiusKm} km
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Default maximum distance from center if a zone radius is omitted.
                  </span>
                </div>
              </div>

              {/* Bot Rejection Messages */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span>💬</span>
                  Custom WhatsApp Bot Messages
                </h3>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Telugu Coming Soon Message
                  </label>
                  <textarea
                    rows={4}
                    value={globalSettings.comingSoonMessageTe || ''}
                    onChange={e => setGlobalSettings(prev => ({ ...prev, comingSoonMessageTe: e.target.value }))}
                    placeholder="మీరు ఎంచుకున్న లొకేషన్ మా సర్వీస్ పరిధి వెలుపల ఉంది..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    English Coming Soon Message
                  </label>
                  <textarea
                    rows={4}
                    value={globalSettings.comingSoonMessageEn || ''}
                    onChange={e => setGlobalSettings(prev => ({ ...prev, comingSoonMessageEn: e.target.value }))}
                    placeholder="The selected location is outside our operational zone..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => fetchZones()}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium transition"
              >
                Reset Changes
              </button>

              <button
                type="submit"
                disabled={savingSettings}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-md transition active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                <Check size={16} />
                <span>{savingSettings ? 'Saving & Syncing...' : 'Save & Sync Settings'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================
          MODAL: ADD / EDIT SERVICE ZONE
      ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {modalMode === 'add' ? 'Add New Service Expansion Zone' : 'Edit Service Zone'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Define the geofence perimeter and covered villages for this operational area.
                </p>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveZone} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Zone Name *
                </label>
                <input
                  type="text"
                  value={zoneFormData.name}
                  onChange={e => setZoneFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Yadagirigutta Temple City & Alair Belt"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Center Latitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={zoneFormData.centerLat}
                    onChange={e => setZoneFormData(prev => ({ ...prev, centerLat: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Center Longitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={zoneFormData.centerLng}
                    onChange={e => setZoneFormData(prev => ({ ...prev, centerLng: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Coverage Radius (KM) *
                  </label>
                  <span className="font-mono font-bold text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {zoneFormData.radiusKm} KM
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="60"
                  step="1"
                  value={zoneFormData.radiusKm}
                  onChange={e => setZoneFormData(prev => ({ ...prev, radiusKm: parseFloat(e.target.value) }))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>2 km (Local town)</span>
                  <span>15 km (Mandal hub)</span>
                  <span>30 km (District belt)</span>
                  <span>60 km</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Operational Status
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition ${
                      zoneFormData.status === 'ACTIVE'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="zoneStatus"
                      value="ACTIVE"
                      checked={zoneFormData.status === 'ACTIVE'}
                      onChange={() => setZoneFormData(prev => ({ ...prev, status: 'ACTIVE' }))}
                      className="text-emerald-600"
                    />
                    <div>
                      <div className="text-xs">🟢 ACTIVE / LIVE</div>
                      <div className="text-[10px] font-normal text-slate-500">Accept orders immediately</div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition ${
                      zoneFormData.status === 'COMING_SOON'
                        ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="zoneStatus"
                      value="COMING_SOON"
                      checked={zoneFormData.status === 'COMING_SOON'}
                      onChange={() => setZoneFormData(prev => ({ ...prev, status: 'COMING_SOON' }))}
                      className="text-amber-600"
                    />
                    <div>
                      <div className="text-xs">🟠 COMING SOON</div>
                      <div className="text-[10px] font-normal text-slate-500">Staged (Polite bot guard)</div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Covered Villages & Mandals
                </label>
                <input
                  type="text"
                  value={zoneFormData.villagesCovered}
                  onChange={e => setZoneFormData(prev => ({ ...prev, villagesCovered: e.target.value }))}
                  placeholder="e.g. Bhongir Town, Raigir, Bibinagar, Pagidipalli (comma-separated)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Separate village and town names with commas.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description / Operational Notes
                </label>
                <textarea
                  rows={2}
                  value={zoneFormData.description}
                  onChange={e => setZoneFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g. Primary pilot zone covering town center and connecting railway mandals."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Modal Buttons */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>{formSubmitting ? 'Saving...' : modalMode === 'add' ? 'Create Zone' : 'Update Zone'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CONFIRM DELETE
      ======================================================== */}
      {deleteModalZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 size={22} />
            </div>

            <h3 className="text-base font-bold text-slate-900">
              Delete Service Zone?
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-800">{deleteModalZone.name}</strong>? Orders in this geofence will no longer be serviced once removed.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteModalZone(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteZoneConfirm}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md transition active:scale-95 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete Zone'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
