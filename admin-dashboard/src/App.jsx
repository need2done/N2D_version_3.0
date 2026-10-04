import React, { useState, useEffect, useRef } from 'react';
import {
  BrowserRouter, Routes, Route, NavLink, Navigate, Outlet, useLocation
} from 'react-router-dom';
import Dashboard         from './pages/Dashboard';
import LiveMap           from './pages/LiveMap';
import Helpers           from './pages/Helpers';
import HomeServiceHelpers from './pages/HomeServiceHelpers';
import TrackingStatus    from './pages/TrackingStatus';
import Alerts            from './pages/Alerts';
import Earnings          from './pages/Earnings';
import Analysis          from './pages/Analysis';
import Health            from './pages/Health';
import Support           from './pages/Support';
import Login             from './pages/Login';
import SettingsPage      from './pages/Settings';
import Services          from './pages/Services';
import Vendors           from './pages/Vendors';
import WalletPage        from './pages/Wallet';
import CustomWorkAdmin   from './pages/CustomWorkAdmin';
import HomeServicesPage  from './pages/HomeServicesPage';

import {
  LayoutDashboard, BarChart3,
  Layers, Home, Briefcase,
  MapPinned, Activity,
  Users, Wrench, Store,
  DollarSign, Wallet, Bell,
  Settings, ChevronDown, ChevronRight,
  LogOut, Menu, X, Search,
  ServerCrash, LifeBuoy,
  ChevronRight as Sep,
} from 'lucide-react';

import logo from './assets/logo.png';
import './index.css';

/* ─────────────────────────────────────────────────
   Protected Route
───────────────────────────────────────────────── */
const ProtectedRoute = () => {
  const token = localStorage.getItem('adminToken');
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

/* ─────────────────────────────────────────────────
   Nav group section label
───────────────────────────────────────────────── */
const NavSection = ({ label }) => (
  <div className="nav-section-label">{label}</div>
);

/* ─────────────────────────────────────────────────
   Single Nav Link item
───────────────────────────────────────────────── */
const NavItem = ({ to, icon: Icon, children, onClick, end = false }) => (
  <NavLink
    to={to}
    end={end}
    onClick={onClick}
    className={({ isActive }) =>
      `nav-item${isActive ? ' active' : ''}`
    }
  >
    <Icon size={16} strokeWidth={2} />
    <span>{children}</span>
  </NavLink>
);

/* ─────────────────────────────────────────────────
   Settings Accordion
───────────────────────────────────────────────── */
const SettingsAccordion = ({ closeSidebar }) => {
  const location = useLocation();
  const isSettingsActive = location.pathname.startsWith('/settings');
  const [open, setOpen] = useState(isSettingsActive);

  useEffect(() => {
    if (isSettingsActive) setOpen(true);
  }, [isSettingsActive]);

  const subItems = [
    { label: 'Staff / Agents',    tab: 'staff' },
    { label: 'Admin Credentials', tab: 'credentials' },
    { label: 'Manage Numbers',    tab: 'numbers' },
    { label: 'System Toggles',    tab: 'toggles' },
    { label: 'Pricing & Offers',  tab: 'pricing' },
  ];

  return (
    <>
      <button
        className={`nav-item${isSettingsActive ? ' active' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <Settings size={16} strokeWidth={2} />
        <span style={{ flex: 1 }}>Settings</span>
        <ChevronDown
          size={14}
          strokeWidth={2}
          style={{
            transition: 'transform 250ms ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            color: '#94a3b8',
          }}
        />
      </button>

      <div className={`settings-accordion${open ? ' open' : ''}`}>
        {subItems.map(({ label, tab }) => (
          <NavLink
            key={tab}
            to={`/settings?tab=${tab}`}
            onClick={closeSidebar}
            className={({ isActive }) =>
              `nav-subitem${isActive && location.search === `?tab=${tab}` ? ' active' : ''}`
            }
          >
            <span
              style={{
                width: 4, height: 4,
                borderRadius: '50%',
                backgroundColor: '#cbd5e1',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            {label}
          </NavLink>
        ))}
      </div>
    </>
  );
};

/* ─────────────────────────────────────────────────
   Dynamic Breadcrumb
───────────────────────────────────────────────── */
const ROUTE_LABELS = {
  '':             'Dashboard',
  'services':     'Services',
  'home-services':'Home Services',
  'custom-work':  'Custom Work Admin',
  'earnings':     'Payments & Earnings',
  'analysis':     'Analytics',
  'map':          'Live Tracking',
  'helpers':      'Helpers',
  'hs-helpers':   'HS Helpers',
  'vendors':      'Vendors',
  'wallet':       'Wallets & Settlements',
  'status':       'Tracking Status',
  'alerts':       'Alerts',
  'health':       'System Health',
  'support':      'Support Requests',
  'settings':     'Settings',
};

const Breadcrumb = () => {
  const location = useLocation();
  const segment = location.pathname.replace(/^\//, '').split('/')[0] || '';
  const label   = ROUTE_LABELS[segment] || segment;

  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <span>App</span>
      <span className="breadcrumb-sep">/</span>
      <span className="breadcrumb-current">{label}</span>
    </nav>
  );
};

/* ─────────────────────────────────────────────────
   Top Header (fixed 56px bar)
───────────────────────────────────────────────── */
const TopHeader = ({ onMenuToggle }) => {
  const [query, setQuery] = useState('');

  return (
    <header className="top-header">
      {/* Mobile hamburger — hidden on desktop via CSS */}
      <button
        className="mobile-menu-toggle"
        style={{ display: 'none' }}
        onClick={onMenuToggle}
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      <Breadcrumb />

      <div className="header-search-wrapper">
        <Search size={14} className="header-search-icon" />
        <input
          type="search"
          className="header-search"
          placeholder="Search orders, helpers…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Global search"
        />
      </div>
    </header>
  );
};

/* ─────────────────────────────────────────────────
   Main Dashboard Layout
───────────────────────────────────────────────── */
const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    window.location.href = '/admin/login';
  };

  const closeSidebar = () => setIsSidebarOpen(false);

  /* Auto-logout after 10 min inactivity */
  useEffect(() => {
    let tid;
    const reset = () => {
      clearTimeout(tid);
      tid = setTimeout(handleLogout, 600_000);
    };
    reset();
    const events = ['mousemove', 'mousedown', 'keypress', 'touchmove', 'scroll'];
    events.forEach(e => window.addEventListener(e, reset));
    return () => {
      clearTimeout(tid);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, []);

  return (
    <div className="dashboard-layout">
      {/* ── Mobile Top Bar ── */}
      <header className="mobile-header">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="mobile-menu-toggle"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <img src={logo} alt="Need2Done" className="mobile-logo" />
        <div style={{ width: 38 }} />
      </header>

      {/* ── Sidebar Overlay (mobile) ── */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} aria-hidden="true" />
      )}

      {/* ── Sidebar ── */}
      <nav className={`sidebar${isSidebarOpen ? ' open' : ''}`} aria-label="Main navigation">
        {/* Logo zone */}
        <div className="sidebar-logo">
          <img src={logo} alt="Need2Done Logo" />
          <button
            className="sidebar-close-btn"
            onClick={closeSidebar}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable nav body */}
        <div className="sidebar-body">

          {/* OVERVIEW */}
          <NavSection label="Overview" />
          <NavItem to="/" icon={LayoutDashboard} onClick={closeSidebar} end>
            Unified Dashboard
          </NavItem>
          <NavItem to="/analysis" icon={BarChart3} onClick={closeSidebar}>
            Analytics
          </NavItem>

          {/* OPERATIONS */}
          <NavSection label="Operations" />
          <NavItem to="/services" icon={Layers} onClick={closeSidebar}>
            Services
          </NavItem>
          <NavItem to="/home-services" icon={Home} onClick={closeSidebar}>
            Home Services
          </NavItem>
          <NavItem to="/custom-work" icon={Briefcase} onClick={closeSidebar}>
            Custom Work Admin
          </NavItem>

          {/* FULFILLMENT & TRACK */}
          <NavSection label="Fulfillment & Track" />
          <NavItem to="/map" icon={MapPinned} onClick={closeSidebar}>
            Live Tracking
          </NavItem>
          <NavItem to="/status" icon={Activity} onClick={closeSidebar}>
            Tracking Status
          </NavItem>

          {/* MANAGEMENT */}
          <NavSection label="Management" />
          <NavItem to="/helpers" icon={Users} onClick={closeSidebar}>
            Helpers
          </NavItem>
          <NavItem to="/hs-helpers" icon={Wrench} onClick={closeSidebar}>
            HS Helpers
          </NavItem>
          <NavItem to="/vendors" icon={Store} onClick={closeSidebar}>
            Vendors
          </NavItem>

          {/* FINANCE & SYSTEM */}
          <NavSection label="Finance & System" />
          <NavItem to="/earnings" icon={DollarSign} onClick={closeSidebar}>
            Payments & Earnings
          </NavItem>
          <NavItem to="/wallet" icon={Wallet} onClick={closeSidebar}>
            Wallets & Settlements
          </NavItem>
          <NavItem to="/alerts" icon={Bell} onClick={closeSidebar}>
            Alerts
          </NavItem>

          {/* SYSTEM */}
          <NavSection label="System" />
          <NavItem to="/health" icon={ServerCrash} onClick={closeSidebar}>
            System Health
          </NavItem>
          <NavItem to="/support" icon={LifeBuoy} onClick={closeSidebar}>
            Support Requests
          </NavItem>

        </div>

        {/* Footer: Settings accordion + Logout */}
        <div className="sidebar-footer">
          <SettingsAccordion closeSidebar={closeSidebar} />
          <button
            onClick={handleLogout}
            className="nav-item"
            style={{ color: '#ef4444', marginTop: 4 }}
            aria-label="Log out"
          >
            <LogOut size={16} strokeWidth={2} />
            <span>Log out</span>
          </button>
        </div>
      </nav>

      {/* ── Right column: header + content ── */}
      <div className="content-shell">
        <TopHeader onMenuToggle={() => setIsSidebarOpen(true)} />
        <main className="main-content">
          <div className="animate-fade">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────
   App & Router
───────────────────────────────────────────────── */
function App() {
  return (
    <BrowserRouter basename="/admin">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/"              element={<Dashboard />} />
            <Route path="/services"      element={<Services />} />
            <Route path="/home-services" element={<HomeServicesPage />} />
            <Route path="/custom-work"   element={<CustomWorkAdmin />} />
            <Route path="/earnings"      element={<Earnings />} />
            <Route path="/analysis"      element={<Analysis />} />
            <Route path="/map"           element={<LiveMap />} />
            <Route path="/helpers"       element={<Helpers />} />
            <Route path="/hs-helpers"    element={<HomeServiceHelpers />} />
            <Route path="/vendors"       element={<Vendors />} />
            <Route path="/wallet"        element={<WalletPage />} />
            <Route path="/status"        element={<TrackingStatus />} />
            <Route path="/alerts"        element={<Alerts />} />
            <Route path="/health"        element={<Health />} />
            <Route path="/support"       element={<Support />} />
            <Route path="/settings"      element={<SettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
