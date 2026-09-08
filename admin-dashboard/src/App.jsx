import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, Outlet } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import LiveMap from './pages/LiveMap';
import Helpers from './pages/Helpers';
import HomeServiceHelpers from './pages/HomeServiceHelpers';
import TrackingStatus from './pages/TrackingStatus';
import Alerts from './pages/Alerts';
import Earnings from './pages/Earnings';
import Analysis from './pages/Analysis';
import Health from './pages/Health';
import Support from './pages/Support';
import Login from './pages/Login';
import SettingsPage from './pages/Settings';
import Services from './pages/Services';
import Vendors from './pages/Vendors';
import WalletPage from './pages/Wallet';
import CustomWorkAdmin from './pages/CustomWorkAdmin';
import { LayoutDashboard, MapPinned, Users, Activity, Bell, Settings, DollarSign, BarChart3, ServerCrash, LifeBuoy, LogOut, Store, Wallet, Wrench, Menu, X, Layers, Briefcase } from 'lucide-react';
import logo from './assets/logo.png';
import './index.css';

// Protected Route Component
const ProtectedRoute = () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        return <Navigate to="/login" replace />;
    }
    return <Outlet />;
};

// Dashboard Layout Component
const DashboardLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        window.location.href = '/login';
    };

    const closeSidebar = () => {
        setIsSidebarOpen(false);
    };

    useEffect(() => {
        let timeoutId;
        const resetTimeout = () => {
            if (timeoutId) clearTimeout(timeoutId);
            // 10 minutes = 600,000 ms
            timeoutId = setTimeout(() => {
                handleLogout();
            }, 600000);
        };

        resetTimeout();
        const events = ['mousemove', 'mousedown', 'keypress', 'touchmove', 'scroll'];
        
        const handleActivity = () => {
            resetTimeout();
        };

        events.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, []);

    return (
        <div className="dashboard-layout">
            {/* Mobile Top Navbar */}
            <header className="mobile-header">
                <button onClick={() => setIsSidebarOpen(true)} className="mobile-menu-toggle">
                    <Menu size={24} />
                </button>
                <div className="mobile-logo-wrapper">
                    <img src={logo} alt="Need2Done Logo" className="mobile-logo" />
                </div>
                <div style={{ width: 40 }}></div> {/* spacer */}
            </header>

            {/* Sidebar Overlay */}
            {isSidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

            <nav className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-logo">
                    <img src={logo} alt="Need2Done Logo" />
                    <button className="sidebar-close-btn" onClick={closeSidebar}>
                        <X size={24} />
                    </button>
                </div>
                <div className="sidebar-links">
                    <NavLink to="/" onClick={closeSidebar} className={({isActive}) => isActive ? "nav-link active" : "nav-link"} end>
                        <LayoutDashboard size={20} />
                        Unified Dashboard
                    </NavLink>
                    <NavLink to="/services" onClick={closeSidebar} className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                        <Layers size={20} />
                        Services
                    </NavLink>
                    <NavLink to="/custom-work" onClick={closeSidebar} className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                        <Briefcase size={20} />
                        Custom Work Admin
                    </NavLink>
                    <NavLink to="/earnings" onClick={closeSidebar} className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                        <DollarSign size={20} />
                        Payments & Earnings
                    </NavLink>
                    <NavLink to="/analysis" onClick={closeSidebar} className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                        <BarChart3 size={20} />
                        Analytics
                    </NavLink>
                    <NavLink to="/map" onClick={closeSidebar} className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                        <MapPinned size={20} />
                        Live Tracking
                    </NavLink>
                    <NavLink to="/helpers" onClick={closeSidebar} className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                        <Users size={20} />
                        Helpers
                    </NavLink>
                    <NavLink to="/hs-helpers" onClick={closeSidebar} className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                        <Wrench size={20} />
                        HS Helpers
                    </NavLink>
                    <NavLink to="/vendors" onClick={closeSidebar} className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                        <Store size={20} />
                        Vendors
                    </NavLink>
                    <NavLink to="/wallet" onClick={closeSidebar} className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                        <Wallet size={20} />
                        Wallets & Settlements
                    </NavLink>
                    <NavLink to="/status" onClick={closeSidebar} className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                        <Activity size={20} />
                        Tracking Status
                    </NavLink>
                    <NavLink to="/alerts" onClick={closeSidebar} className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                        <Bell size={20} />
                        Alerts
                    </NavLink>
                    <NavLink to="/health" onClick={closeSidebar} className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                        <ServerCrash size={20} />
                        System Health
                    </NavLink>
                    <NavLink to="/support" onClick={closeSidebar} className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                        <LifeBuoy size={20} />
                        Support Requests
                    </NavLink>
                </div>
                
                <div className="sidebar-footer">
                    <NavLink to="/settings" onClick={closeSidebar} className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                        <Settings size={20} />
                        Settings
                    </NavLink>
                    <button onClick={handleLogout} className="nav-link" style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left', color: '#f87171' }}>
                        <LogOut size={20} />
                        Logout
                    </button>
                </div>
            </nav>
            
            <main className="main-content">
                <div className="animate-fade">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

function App() {
    return (
        <BrowserRouter basename="/admin">
            <Routes>
                {/* Public Route */}
                <Route path="/login" element={<Login />} />

                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                    <Route element={<DashboardLayout />}>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/services" element={<Services />} />
                        <Route path="/custom-work" element={<CustomWorkAdmin />} />
                        <Route path="/earnings" element={<Earnings />} />
                        <Route path="/analysis" element={<Analysis />} />
                        <Route path="/map" element={<LiveMap />} />
                        <Route path="/helpers" element={<Helpers />} />
                        <Route path="/hs-helpers" element={<HomeServiceHelpers />} />
                        <Route path="/vendors" element={<Vendors />} />
                        <Route path="/wallet" element={<WalletPage />} />
                        <Route path="/status" element={<TrackingStatus />} />
                        <Route path="/alerts" element={<Alerts />} />
                        <Route path="/health" element={<Health />} />
                        <Route path="/support" element={<Support />} />
                        <Route path="/settings" element={<SettingsPage />} />
                    </Route>
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
