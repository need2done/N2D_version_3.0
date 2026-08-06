import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import RestaurantPage from './pages/RestaurantPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import RefundPolicy from './pages/RefundPolicy';
import Terms from './pages/Terms';
import NotFound from './pages/NotFound';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import CartSidebar from './components/cart/CartSidebar';
import { useCart } from './context/CartContext';
import { menuData } from './data/menu';

import FoodAdminLogin from './pages/FoodAdminLogin';
import FoodAdminDashboard from './pages/FoodAdminDashboard';

function AppContent() {
  const { setCart } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const location = useLocation();
  const isAdminRoute = location.pathname.includes('/admin');

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const orderId = searchParams.get('orderId');
    const isEdit = searchParams.get('edit') === 'true';

    if (orderId && isEdit) {
      fetch(`/api/carts/${orderId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.cart && data.cart.length > 0) {
             let allMenu = [];
             Object.values(menuData).forEach(restMenu => {
                 Object.values(restMenu).forEach(categoryItems => {
                     allMenu = [...allMenu, ...categoryItems];
                 });
             });

             const items = data.cart.map(item => {
                 const menuItem = allMenu.find(m => m.id === item.product_id);
                 return {
                     id: item.product_id,
                     name: item.product_name,
                     price: item.price,
                     cartPrice: item.price,
                     quantity: item.quantity,
                     unit: item.unit,
                     image: menuItem ? menuItem.image : 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200&h=200&fit=crop'
                 };
             });
             setCart({ items, restaurantId: null, restaurantName: null });
             setCartOpen(true);
          }
        })
        .catch(err => console.error("Failed to load cart for edit:", err));
    }
  }, []);

  if (isAdminRoute) {
    const isLogin = location.pathname.includes('/login');
    return (
      <Routes>
        <Route path="/admin/login" element={<FoodAdminLogin />} />
        <Route path="/food/admin/login" element={<FoodAdminLogin />} />
        <Route path="/admin" element={<FoodAdminDashboard />} />
        <Route path="/food/admin" element={<FoodAdminDashboard />} />
        <Route path="*" element={isLogin ? <FoodAdminLogin /> : <FoodAdminDashboard />} />
      </Routes>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* Header */}
      <Header onCartClick={() => setCartOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/restaurant/:slug" element={<RestaurantPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {/* Footer */}
      <Footer />

      {/* Global Cart Drawer */}
      <CartSidebar isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}

function App() {
  return (
    <WishlistProvider>
      <CartProvider>
        <Router basename="/food">
          <AppContent />
        </Router>
      </CartProvider>
    </WishlistProvider>
  );
}

export default App;


