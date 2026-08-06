import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import N2DLogo from '../components/ui/N2DLogo';
import FoodItemModal from '../components/modals/FoodItemModal';
import RestaurantModal from '../components/modals/RestaurantModal';
import { restaurants as defaultRestaurants } from '../data/restaurants';
import { menuData as defaultMenuData } from '../data/menu';

export default function FoodAdminDashboard() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRestModalOpen, setIsRestModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [notification, setNotification] = useState(null);

  // Pricing & Free Delivery settings state
  const [pricingSettings, setPricingSettings] = useState({
    freeDeliveryThreshold: 199,
    deliveryFee: 40,
    platformFee: 5
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Load Initial Menu Data
  useEffect(() => {
    const token = localStorage.getItem('food_admin_token');
    if (!token) {
      navigate('/food/admin/login');
      return;
    }

    // Transform default static menu data into flat list if API fails
    let flatItems = [];
    Object.keys(defaultMenuData).forEach(restId => {
      const rest = defaultRestaurants.find(r => String(r.id) === String(restId));
      const restName = rest ? rest.name : `Restaurant #${restId}`;

      Object.keys(defaultMenuData[restId]).forEach(category => {
        defaultMenuData[restId][category].forEach(item => {
          flatItems.push({
            ...item,
            restaurantId: Number(restId),
            restaurantName: restName,
            categoryName: category
          });
        });
      });
    });

    setRestaurants(defaultRestaurants);

    // Try fetching from backend API
    fetch('/api/food/admin/items')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.items && data.items.length > 0) {
          setItems(data.items);
          if (data.restaurants) setRestaurants(data.restaurants);
        } else {
          setItems(flatItems);
        }
      })
    // Load pricing settings
    fetch('/api/settings/pricing?service=food')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setPricingSettings({
            freeDeliveryThreshold: Number(d.freeDeliveryThreshold ?? 199),
            deliveryFee: Number(d.deliveryFee ?? 40),
            platformFee: Number(d.platformFee ?? 5)
          });
        }
      })
      .catch(() => {});
  }, [navigate]);

  const showNotify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleLogout = () => {
    localStorage.removeItem('food_admin_token');
    navigate('/food/admin/login');
  };

  // Toggle In Stock / Out of Stock
  const handleToggleStock = async (itemId) => {
    const target = items.find(i => i.id === itemId);
    if (!target) return;

    const newStatus = !target.isAvailable;
    const updated = items.map(i => i.id === itemId ? { ...i, isAvailable: newStatus } : i);
    setItems(updated);

    showNotify(`Item "${target.name}" is now ${newStatus ? 'In Stock' : 'Out of Stock'}`);

    const token = localStorage.getItem('food_admin_token');
    try {
      await fetch(`/api/food/admin/items/${itemId}/toggle-stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isAvailable: newStatus })
      });
    } catch (err) {
      console.log("Local state updated");
    }
  };

  // Save Item (Create or Edit)
  const handleSaveItem = async (formData) => {
    const token = localStorage.getItem('food_admin_token');
    const rest = restaurants.find(r => Number(r.id) === Number(formData.restaurantId));
    const restName = rest ? rest.name : 'Selected Restaurant';

    if (editingItem) {
      // Edit existing
      const updatedList = items.map(i => {
        if (i.id === editingItem.id) {
          return {
            ...i,
            ...formData,
            restaurantName: restName
          };
        }
        return i;
      });
      setItems(updatedList);
      showNotify(`Updated "${formData.name}" successfully!`);

      try {
        await fetch(`/api/food/admin/items/${editingItem.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });
      } catch (e) {}
    } else {
      // Create new
      const newItem = {
        id: Date.now(),
        ...formData,
        restaurantName: restName
      };
      setItems([newItem, ...items]);
      showNotify(`Added "${formData.name}" to menu!`);

      try {
        await fetch('/api/food/admin/items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });
      } catch (e) {}
    }

    setIsModalOpen(false);
    setEditingItem(null);
  };
  const handleSaveRestaurant = (newRest) => {
    const updatedRests = [...restaurants, newRest];
    setRestaurants(updatedRests);
    showNotify(`Added restaurant "${newRest.name}" successfully!`);
    setIsRestModalOpen(false);

    const token = localStorage.getItem('food_admin_token');
    try {
      fetch('/api/food/admin/restaurants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newRest)
      });
    } catch (e) {}
  };

  // Save Pricing Settings
  const handleSavePricing = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const token = localStorage.getItem('food_admin_token');
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          FREE_DELIVERY_THRESHOLD_FOOD: pricingSettings.freeDeliveryThreshold,
          HELPER_CHARGE_FOOD: pricingSettings.deliveryFee,
          PLATFORM_FEE_FOOD: pricingSettings.platformFee
        })
      });
      const data = await res.json();
      if (data.success) {
        showNotify(`✅ Free Delivery Threshold updated to ₹${pricingSettings.freeDeliveryThreshold}!`);
      } else {
        showNotify('Failed to save settings', 'error');
      }
    } catch (err) {
      showNotify('Failed to connect to backend', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  // Delete Item
  const handleDeleteItem = async (itemId, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    setItems(items.filter(i => i.id !== itemId));
    showNotify(`Deleted "${name}"`, 'error');

    const token = localStorage.getItem('food_admin_token');
    try {
      await fetch(`/api/food/admin/items/${itemId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) {}
  };

  // Extract Categories
  const categoriesList = Array.from(new Set(items.map(i => i.categoryName || 'General')));

  // Filter Items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRest = selectedRestaurant === 'ALL' || String(item.restaurantId) === String(selectedRestaurant);
    const matchesCat = selectedCategory === 'ALL' || item.categoryName === selectedCategory;
    const matchesStock = stockFilter === 'ALL' || 
                         (stockFilter === 'IN_STOCK' && item.isAvailable) ||
                         (stockFilter === 'OUT_OF_STOCK' && !item.isAvailable);

    return matchesSearch && matchesRest && matchesCat && matchesStock;
  });

  // Stats
  const totalCount = items.length;
  const inStockCount = items.filter(i => i.isAvailable).length;
  const outOfStockCount = items.filter(i => !i.isAvailable).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <N2DLogo size="sm" />
            <span className="hidden sm:inline-block h-6 w-px bg-slate-200" />
            <span className="text-xs font-black uppercase tracking-wider bg-orange-100 text-brand-orange px-2.5 py-1 rounded-full">
              Food Admin Console
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRestModalOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0V7" />
              </svg>
              <span>Add Restaurant</span>
            </button>

            <button
              onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
              className="bg-brand-orange hover:bg-brand-orange-dark text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-orange transition-all cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Food Item</span>
            </button>

            <button
              onClick={handleLogout}
              className="text-xs font-bold text-slate-500 hover:text-red-600 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2 animate-bounce ${
          notification.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
          <span>{notification.type === 'error' ? '🗑️' : '✅'}</span>
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-brand-orange flex items-center justify-center text-lg font-bold">
              🍔
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Total Items</p>
              <p className="text-xl font-extrabold text-slate-800">{totalCount}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-lg font-bold">
              🟢
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">In Stock</p>
              <p className="text-xl font-extrabold text-emerald-600">{inStockCount}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-lg font-bold">
              🔴
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Out of Stock</p>
              <p className="text-xl font-extrabold text-rose-600">{outOfStockCount}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-lg font-bold">
              🏪
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Restaurants</p>
              <p className="text-xl font-extrabold text-slate-800">{restaurants.length}</p>
            </div>
          </div>
        </div>

        {/* Free Delivery & Pricing Settings Card */}
        <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 p-5 rounded-2xl text-white shadow-md">
          <form onSubmit={handleSavePricing} className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl">
                🚚
              </div>
              <div>
                <h3 className="text-sm font-black tracking-wide">Free Delivery & Fee Configuration</h3>
                <p className="text-xs text-white/90 font-medium">Set free delivery threshold and delivery charges for Food service</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20">
                <label className="block text-[10px] font-bold uppercase text-white/80">Free Delivery Above (₹)</label>
                <input
                  type="number"
                  value={pricingSettings.freeDeliveryThreshold}
                  onChange={(e) => setPricingSettings({ ...pricingSettings, freeDeliveryThreshold: Number(e.target.value) })}
                  className="w-24 bg-transparent text-sm font-extrabold outline-none text-white placeholder-white/50"
                  min="0"
                  required
                />
              </div>

              <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20">
                <label className="block text-[10px] font-bold uppercase text-white/80">Delivery Fee (₹)</label>
                <input
                  type="number"
                  value={pricingSettings.deliveryFee}
                  onChange={(e) => setPricingSettings({ ...pricingSettings, deliveryFee: Number(e.target.value) })}
                  className="w-20 bg-transparent text-sm font-extrabold outline-none text-white placeholder-white/50"
                  min="0"
                  required
                />
              </div>

              <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20">
                <label className="block text-[10px] font-bold uppercase text-white/80">Platform Fee (₹)</label>
                <input
                  type="number"
                  value={pricingSettings.platformFee}
                  onChange={(e) => setPricingSettings({ ...pricingSettings, platformFee: Number(e.target.value) })}
                  className="w-20 bg-transparent text-sm font-extrabold outline-none text-white placeholder-white/50"
                  min="0"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="px-4 py-2.5 bg-white text-orange-600 hover:bg-orange-50 text-xs font-black rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>

        {/* Toolbar (Search & Filters) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
          
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes or description..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
            
            {/* Restaurant Filter */}
            <select
              value={selectedRestaurant}
              onChange={(e) => setSelectedRestaurant(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-white outline-none focus:border-brand-orange cursor-pointer"
            >
              <option value="ALL">All Restaurants ({restaurants.length})</option>
              {restaurants.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-white outline-none focus:border-brand-orange cursor-pointer"
            >
              <option value="ALL">All Categories ({categoriesList.length})</option>
              {categoriesList.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Stock Filter */}
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-white outline-none focus:border-brand-orange cursor-pointer"
            >
              <option value="ALL">All Availability</option>
              <option value="IN_STOCK">🟢 In Stock Only</option>
              <option value="OUT_OF_STOCK">🔴 Out of Stock Only</option>
            </select>
          </div>
        </div>

        {/* Food Items Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.length === 0 ? (
            <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
              <span className="text-4xl">🔍</span>
              <p className="text-sm font-bold text-slate-700">No matching food items found</p>
              <p className="text-xs text-slate-400">Try adjusting your search query or filters.</p>
            </div>
          ) : (
            filteredItems.map(item => (
              <div 
                key={item.id}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between hover:shadow-md ${
                  !item.isAvailable ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Top Image Banner */}
                  <div className="relative h-40 w-full overflow-hidden bg-slate-100">
                    <img
                      src={item.image}
                      alt={item.name}
                      className={`w-full h-full object-cover transition-transform duration-300 ${!item.isAvailable ? 'grayscale opacity-75' : ''}`}
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300&h=200&fit=crop'; }}
                    />

                    {/* Veg / Non-Veg Badge */}
                    <span className={`absolute top-3 left-3 px-2 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 shadow-sm backdrop-blur-md ${
                      item.isVeg ? 'bg-white/95 text-emerald-700 border border-emerald-200' : 'bg-white/95 text-rose-700 border border-rose-200'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                      {item.isVeg ? 'Veg' : 'Non-Veg'}
                    </span>

                    {/* Bestseller Badge */}
                    {item.isBestSeller && (
                      <span className="absolute top-3 right-3 bg-amber-500 text-white text-[9px] font-black uppercase px-2 py-1 rounded-lg shadow-sm">
                        ⭐ Bestseller
                      </span>
                    )}

                    {/* Out of Stock Overlay */}
                    {!item.isAvailable && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="bg-rose-600 text-white text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
                          Out of Stock
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content Info */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 leading-tight">{item.name}</h3>
                        <p className="text-[11px] font-semibold text-brand-orange mt-0.5">{item.restaurantName}</p>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md flex-shrink-0">
                        {item.categoryName}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {item.description || 'No detailed description provided.'}
                    </p>

                    {/* Price Info */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-base font-extrabold text-slate-900">
                        ₹{item.offerPrice || item.price}
                      </span>
                      {item.offerPrice && (
                        <span className="text-xs text-slate-400 line-through font-semibold">
                          ₹{item.price}
                        </span>
                      )}
                      {item.prepTime && (
                        <span className="ml-auto text-[10px] text-slate-400 font-medium">
                          ⏱️ {item.prepTime}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  
                  {/* Stock Toggle */}
                  <button
                    onClick={() => handleToggleStock(item.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      item.isAvailable
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                    }`}
                  >
                    <span>{item.isAvailable ? '🟢 In Stock' : '🔴 Out of Stock'}</span>
                  </button>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-brand-orange hover:bg-orange-50 transition-colors cursor-pointer"
                      title="Edit Item"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>

                    <button
                      onClick={() => handleDeleteItem(item.id, item.name)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Delete Item"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Modals */}
      <FoodItemModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
        item={editingItem}
        restaurants={restaurants}
        onSave={handleSaveItem}
      />

      <RestaurantModal
        isOpen={isRestModalOpen}
        onClose={() => setIsRestModalOpen(false)}
        onSave={handleSaveRestaurant}
      />
    </div>
  );
}
