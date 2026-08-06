import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Lazy loading pages for better performance
const Home = lazy(() => import('./pages/Home'));
const ServiceDetails = lazy(() => import('./pages/ServiceDetails'));
const BookingConfiguration = lazy(() => import('./pages/BookingConfiguration'));
const OfferDetails = lazy(() => import('./pages/OfferDetails'));
const InfoPage = lazy(() => import('./pages/InfoPage'));
const BookingConfirmation = lazy(() => import('./pages/BookingConfirmation'));
const MyBookings = lazy(() => import('./pages/MyBookings'));
const AdminLogin = lazy(() => import('./pages/admin/Login'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));

const Loader = () => (
  <div className="flex justify-center items-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

function App() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cid = params.get('customerId');
    if (cid) {
      let cleanCid = cid;
      if (cleanCid.startsWith('N2DHS')) {
        cleanCid = cleanCid.substring(5);
      }
      let finalId = cleanCid;
      try {
        const decoded = atob(cleanCid);
        if (decoded.match(/^\d+$/)) finalId = decoded;
      } catch (e) {}
      localStorage.setItem('n2d_customerId', finalId);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return (
    <DataProvider>
      <Router basename="/home-services">
      <div className="flex flex-col min-h-screen bg-lightBg font-sans">
        <Navbar />
        <main className="flex-grow pb-16 md:pb-0">
          <Suspense fallback={<Loader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/service/:id" element={<ServiceDetails />} />
              <Route path="/book/:id" element={<BookingConfiguration />} />
              <Route path="/offer/:id" element={<OfferDetails />} />
              <Route path="/info/:id" element={<InfoPage />} />
              <Route path="/booking-confirmation/:orderId" element={<BookingConfirmation />} />
              <Route path="/my-bookings" element={<MyBookings />} />
              
              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminDashboard />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </Router>
    </DataProvider>
  );
}

export default App;
