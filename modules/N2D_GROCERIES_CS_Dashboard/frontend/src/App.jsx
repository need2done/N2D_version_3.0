import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import GroceryDashboard from './pages/GroceryDashboard';
import CheckoutPage from './pages/CheckoutPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  return token ? children : <Navigate to="/admin/login" />;
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<GroceryDashboard />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      
      {/* Admin Routes */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route 
        path="/admin" 
        element={
          <PrivateRoute>
            <AdminDashboard />
          </PrivateRoute>
        } 
      />
    </Routes>
  );
}

export default App;
