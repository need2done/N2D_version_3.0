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
import Vendors from './pages/Vendors';
import WalletPage from './pages/Wallet';
import { LayoutDashboard, MapPinned, Users, Activity, Bell, Settings, DollarSign, BarChart3, ServerCrash, LifeBuoy, LogOut, Store, Wallet, Wrench } from 'lucide-react';
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
    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        window.location.href = '/login';
    };

    return (
        <div className="dashboard-layout">
            <nav className="sidebar">
                <div className="sidebar-logo">
                    <img src={logo} alt="Need2Done Logo" />
                </div>
                <div className="sidebar-links">
                    <NavLink to="/" className={({isActive}) => isActive ? "nav-link active" : "nav-link"} end>
                        <LayoutDashboard size={20} />
                        Unified Dashboard
                    </NavLink>
                    <NavLink to="/earnings" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                        <DollarSign size={20} />
                        Payments & Earnings
                    </NavLink>
                    <NavLink to="/analysis" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                        <BarChart3 size={20} />
                        Analytics
                    </NavLink>
                    <NavLink to="/map" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                        <MapPinned size={20} />
                        Live Tracking
                    </NavLink>
                    <NavLink to="/helpers" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                        <Users size={20} />
                        Helpers
                    </NavLink>
                    <NavLink to="/hs-helpers" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                        <Wrench size={20} />
                        HS Helpers
                    </NavLink>
                    <NavLink to="/vendors" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                        <Store size={20} />
                        Vendors
                    </NavLink>
                    <NavLink to="/wallet" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                        <Wallet size={20} />
                        Wallets & Settlements
                    </NavLink>
                    <NavLink to="/status" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                        <Activity size={20} />
                        Tracking Status
                    </NavLink>
                    <NavLink to="/alerts" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                        <Bell size={20} />
                        Alerts
                    </NavLink>
                    <NavLink to="/health" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                        <ServerCrash size={20} />
                        System Health
                    </NavLink>
                    <NavLink to="/support" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                        <LifeBuoy size={20} />
                        Support Requests
                    </NavLink>
                </div>
                
                <div className="sidebar-footer">
                    <NavLink to="/settings" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
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
