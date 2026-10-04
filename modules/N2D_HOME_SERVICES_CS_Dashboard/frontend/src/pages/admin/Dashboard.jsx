import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataContext } from '../../context/DataContext';
import { 
  FaTrash, FaEdit, FaPlus, FaSignOutAlt, FaUpload, 
  FaTag, FaBullhorn, FaPercentage, FaCheckCircle, FaSave, 
  FaEye, FaTools, FaCog, FaCheck, FaTimes
} from 'react-icons/fa';

const Dashboard = () => {
  const { 
    services, addService, updateService, deleteService, 
    platformFee, setPlatformFee, 
    isAdminAuth, setIsAdminAuth,
    bannerConfig, saveBannerConfig,
    couponConfig, saveCouponConfig
  } = useContext(DataContext);

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('services'); // 'services' | 'banner' | 'coupons' | 'settings'

  // Service Form State
  const [isEditingService, setIsEditingService] = useState(false);
  const [currentService, setCurrentService] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [duration, setDuration] = useState('');
  const [image, setImage] = useState('');

  // Fee Form State
  const [feeInput, setFeeInput] = useState(platformFee);

  // Banner Form State
  const [bannerForm, setBannerForm] = useState({
    isActive: true,
    badgeText: '🪔 FESTIVE SPECIAL • DUSSEHRA DHAMAKA 🏹',
    title: 'Celebrate Dussehra with a Sparkling Clean Home',
    subtitle: 'Get FLAT 20% OFF on all professional cleaning, repairs, and kitchen deep-clean services. Code DUSSEHRA is automatically applied at checkout!',
    discountBadge: '20% OFF',
    couponCode: 'DUSSEHRA',
    discountPercent: 20,
    ctaText: 'Book Service with 20% OFF',
    theme: 'amber'
  });
  const [bannerSavedMsg, setBannerSavedMsg] = useState('');

  // Coupon Form State
  const [couponForm, setCouponForm] = useState({
    autoApply: true,
    defaultCoupon: 'DUSSEHRA',
    coupons: [
      { code: 'DUSSEHRA', discountPercent: 20, description: 'Festive 20% Discount' },
      { code: 'DASARA', discountPercent: 20, description: 'Festive 20% Discount' },
      { code: 'FESTIVE20', discountPercent: 20, description: 'Festive 20% Discount' },
      { code: 'WELCOME10', discountPercent: 10, description: 'New User 10% Discount' }
    ]
  });
  const [newCoupon, setNewCoupon] = useState({ code: '', discountPercent: 20, description: '' });
  const [couponSavedMsg, setCouponSavedMsg] = useState('');

  useEffect(() => {
    if (!isAdminAuth) {
      navigate('/admin/login');
    }
  }, [isAdminAuth, navigate]);

  useEffect(() => {
    if (bannerConfig) {
      setBannerForm(prev => ({ ...prev, ...bannerConfig }));
    }
  }, [bannerConfig]);

  useEffect(() => {
    if (couponConfig) {
      setCouponForm(prev => ({ ...prev, ...couponConfig }));
    }
  }, [couponConfig]);

  useEffect(() => {
    setFeeInput(platformFee);
  }, [platformFee]);

  const handleLogout = () => {
    setIsAdminAuth(false);
    navigate('/admin/login');
  };

  // -------------------------------------------------------------
  // Services Handlers
  // -------------------------------------------------------------
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetServiceForm = () => {
    setName('');
    setDescription('');
    setBasePrice('');
    setDuration('');
    setImage('');
    setCurrentService(null);
    setIsEditingService(false);
  };

  const handleEditServiceClick = (service) => {
    setName(service.name);
    setDescription(service.description);
    setBasePrice(service.base_price);
    setDuration(service.duration);
    setImage(service.image);
    setCurrentService(service);
    setIsEditingService(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleServiceSubmit = (e) => {
    e.preventDefault();
    const serviceData = {
      name,
      description,
      base_price: parseFloat(basePrice) || 0,
      duration,
      image: image || `${import.meta.env.BASE_URL}images/dishwashing.png`
    };

    if (currentService) {
      updateService(currentService.id, serviceData);
      alert('Service updated successfully!');
    } else {
      addService(serviceData);
      alert('New service added successfully!');
    }
    resetServiceForm();
  };

  // -------------------------------------------------------------
  // Banner Handlers
  // -------------------------------------------------------------
  const handleSaveBanner = async (e) => {
    e.preventDefault();
    await saveBannerConfig(bannerForm);
    setBannerSavedMsg('Banner settings saved successfully!');
    setTimeout(() => setBannerSavedMsg(''), 4000);
  };

  // -------------------------------------------------------------
  // Coupon Handlers
  // -------------------------------------------------------------
  const handleAddCoupon = (e) => {
    e.preventDefault();
    const code = newCoupon.code.trim().toUpperCase();
    if (!code) {
      alert('Please enter a coupon code.');
      return;
    }
    if (couponForm.coupons.some(c => c.code.toUpperCase() === code)) {
      alert('A coupon with this code already exists.');
      return;
    }
    const updatedList = [
      ...couponForm.coupons,
      {
        code,
        discountPercent: parseInt(newCoupon.discountPercent) || 10,
        description: newCoupon.description.trim() || 'Promotional Discount'
      }
    ];
    const updatedConfig = { ...couponForm, coupons: updatedList };
    setCouponForm(updatedConfig);
    saveCouponConfig(updatedConfig);
    setNewCoupon({ code: '', discountPercent: 20, description: '' });
  };

  const handleDeleteCoupon = (codeToDelete) => {
    if (!window.confirm(`Are you sure you want to delete coupon "${codeToDelete}"?`)) return;
    const updatedList = couponForm.coupons.filter(c => c.code !== codeToDelete);
    const updatedDefault = couponForm.defaultCoupon === codeToDelete ? (updatedList[0]?.code || '') : couponForm.defaultCoupon;
    const updatedConfig = { ...couponForm, defaultCoupon: updatedDefault, coupons: updatedList };
    setCouponForm(updatedConfig);
    saveCouponConfig(updatedConfig);
  };

  const handleSaveCouponSettings = async (e) => {
    e.preventDefault();
    await saveCouponConfig(couponForm);
    setCouponSavedMsg('Coupon settings saved successfully!');
    setTimeout(() => setCouponSavedMsg(''), 4000);
  };

  // -------------------------------------------------------------
  // Fee Handler
  // -------------------------------------------------------------
  const handleSaveFee = () => {
    setPlatformFee(parseFloat(feeInput) || 0);
    alert('Platform fee updated successfully!');
  };

  if (!isAdminAuth) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span className="text-blue-600">Need2Done</span> Home Services Admin
            </h1>
            <p className="text-xs md:text-sm text-gray-500 font-medium">Manage services, prices, festive banners, and coupons</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if(window.confirm('This will delete all custom services and restore default services. Continue?')) {
                  localStorage.removeItem('n2d_services');
                  window.location.reload();
                }
              }} 
              className="text-xs font-bold text-gray-600 hover:bg-gray-100 px-3.5 py-2 rounded-xl transition-colors border border-gray-200"
            >
              Reset Services
            </button>
            <button 
              onClick={handleLogout} 
              className="flex items-center text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition-colors border border-red-100"
            >
              <FaSignOutAlt className="mr-1.5" /> Logout
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto space-x-2 pt-2 border-t border-gray-100 scrollbar-none">
          <button
            onClick={() => setActiveTab('services')}
            className={`flex items-center gap-2 py-3 px-5 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === 'services' 
                ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl' 
                : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            <FaTools /> Services & Pricing ({services.length})
          </button>

          <button
            onClick={() => setActiveTab('banner')}
            className={`flex items-center gap-2 py-3 px-5 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === 'banner' 
                ? 'border-amber-600 text-amber-600 bg-amber-50/50 rounded-t-xl' 
                : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            <FaBullhorn /> Festive Banner & Offers
            {bannerForm.isActive && (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('coupons')}
            className={`flex items-center gap-2 py-3 px-5 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === 'coupons' 
                ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50 rounded-t-xl' 
                : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            <FaTag /> Coupons & Discounts ({couponForm.coupons?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 py-3 px-5 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === 'settings' 
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-xl' 
                : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            <FaCog /> Platform Fee Settings
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* ========================================================================= */}
        {/* TAB 1: SERVICES & PRICING                                                 */}
        {/* ========================================================================= */}
        {activeTab === 'services' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Column */}
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 sticky top-36">
                <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">
                    {isEditingService ? '✏️ Edit Service' : '➕ Add New Service'}
                  </h2>
                  {isEditingService && (
                    <button 
                      onClick={resetServiceForm} 
                      className="text-xs font-bold text-gray-500 hover:text-gray-800 bg-gray-100 px-3 py-1.5 rounded-lg"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                <form onSubmit={handleServiceSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Service Title</label>
                    <input 
                      type="text" 
                      required 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      placeholder="e.g. Sofa Deep Cleaning"
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-600 font-medium outline-none" 
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Base Price (₹)</label>
                      <input 
                        type="number" 
                        required 
                        value={basePrice} 
                        onChange={(e) => setBasePrice(e.target.value)} 
                        placeholder="299"
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-600 font-bold outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Duration</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 1 Hour" 
                        required 
                        value={duration} 
                        onChange={(e) => setDuration(e.target.value)} 
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-600 font-medium outline-none" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Description</label>
                    <textarea 
                      rows="3" 
                      required 
                      value={description} 
                      onChange={(e) => setDescription(e.target.value)} 
                      placeholder="Brief details about what the service includes..."
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-600 font-medium outline-none"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Service Image</label>
                    <div className="mt-1 flex items-center gap-4">
                      {image && <img src={image} alt="Preview" className="h-14 w-14 object-cover rounded-xl border border-gray-200 shadow-sm" />}
                      <label className="cursor-pointer bg-gray-50 px-4 py-2 border border-gray-300 rounded-xl flex items-center text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors">
                        <FaUpload className="mr-2 text-blue-600" /> Upload Image
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3.5 rounded-xl shadow-lg transition-all mt-4 text-sm"
                  >
                    {isEditingService ? 'Update Service' : 'Add New Service'}
                  </button>
                </form>
              </div>
            </div>

            {/* List Column */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <h2 className="text-lg font-black text-gray-900 tracking-tight">Active Services</h2>
                  <span className="bg-blue-100 text-blue-800 text-xs font-black px-3 py-1 rounded-full">{services.length} Listed</span>
                </div>
                
                <ul className="divide-y divide-gray-100">
                  {services.map((service) => (
                    <li key={service.id} className="p-6 hover:bg-gray-50/80 transition-colors flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <img src={service.image} alt={service.name} className="h-16 w-16 rounded-2xl object-cover shadow-sm border border-gray-100 flex-shrink-0" />
                        <div className="min-w-0">
                          <h3 className="text-base font-black text-gray-900 truncate">{service.name}</h3>
                          <p className="text-xs text-gray-500 font-bold mt-0.5">{service.duration} • <span className="text-blue-600 font-black">₹{service.base_price}</span></p>
                          <p className="text-xs text-gray-400 truncate mt-1">{service.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button 
                          onClick={() => handleEditServiceClick(service)} 
                          className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-blue-100" 
                          title="Edit Service"
                        >
                          <FaEdit size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            if (window.confirm(`Delete service "${service.name}"?`)) {
                              deleteService(service.id);
                            }
                          }} 
                          className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-red-100" 
                          title="Delete Service"
                        >
                          <FaTrash size={16} />
                        </button>
                      </div>
                    </li>
                  ))}
                  {services.length === 0 && (
                    <div className="p-12 text-center text-gray-500 font-bold">No services found. Add your first service on the left!</div>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: FESTIVE BANNER & OFFERS                                            */}
        {/* ========================================================================= */}
        {activeTab === 'banner' && (
          <div className="space-y-8">
            {/* Live Preview Card */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <FaEye className="text-amber-600" /> Live Homepage Banner Preview
                </h3>
                <span className={`text-xs font-black px-3 py-1 rounded-full ${bannerForm.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                  {bannerForm.isActive ? '● Visible on Website' : '○ Hidden on Website'}
                </span>
              </div>

              {/* Dynamic Preview Container */}
              {bannerForm.isActive ? (
                <div className={`relative rounded-[28px] overflow-hidden shadow-xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 border-2 ${
                  bannerForm.theme === 'blue' ? 'bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#2563eb] border-blue-300/40' :
                  bannerForm.theme === 'purple' ? 'bg-gradient-to-br from-[#3b0764] via-[#6b21a8] to-[#9333ea] border-purple-300/40' :
                  bannerForm.theme === 'emerald' ? 'bg-gradient-to-br from-[#022c22] via-[#065f46] to-[#059669] border-emerald-300/40' :
                  bannerForm.theme === 'rose' ? 'bg-gradient-to-br from-[#4c0519] via-[#9f1239] to-[#e11d48] border-rose-300/40' :
                  'bg-gradient-to-br from-[#78350f] via-[#b45309] to-[#d97706] border-amber-300/40'
                }`}>
                  <div className="relative z-10 max-w-xl text-center md:text-left">
                    {bannerForm.badgeText && (
                      <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider mb-3 border border-white/30">
                        {bannerForm.badgeText}
                      </div>
                    )}
                    <h2 className="text-2xl md:text-3xl font-black text-white leading-tight mb-2 tracking-tight">
                      {bannerForm.title || 'Special Festive Offer'}
                    </h2>
                    <p className="text-white/90 text-xs md:text-sm mb-4 leading-relaxed">
                      {bannerForm.subtitle || 'Offer description will appear here...'}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="bg-white text-gray-900 font-black py-2.5 px-5 rounded-xl text-xs md:text-sm shadow">
                        {bannerForm.ctaText || 'Book Service'}
                      </span>
                      <span className="text-xs text-white/90 font-bold bg-black/20 px-3 py-2 rounded-xl">
                        ✓ Auto-applied at checkout
                      </span>
                    </div>
                  </div>

                  <div className="relative z-10 flex-shrink-0 flex flex-col items-center justify-center bg-black/25 backdrop-blur-md rounded-2xl p-5 border border-white/20 text-center min-w-[200px]">
                    <div className="text-4xl mb-1">🪔</div>
                    <span className="text-white/80 text-[10px] font-bold tracking-widest uppercase">Special Discount</span>
                    <div className="text-3xl font-black text-white my-0.5">
                      {bannerForm.discountBadge || `${bannerForm.discountPercent || 20}% OFF`}
                    </div>
                    <span className="text-[10px] text-white/70 font-medium">Coupon Code</span>
                    <div className="mt-1 bg-amber-400 text-amber-950 font-mono font-black px-3 py-1 rounded-lg text-xs tracking-wider">
                      {bannerForm.couponCode || 'DUSSEHRA'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-500 font-bold text-sm">
                  Banner is currently disabled. Toggle "Enable Banner" below to show it on the homepage.
                </div>
              )}
            </div>

            {/* Banner Configuration Editor Form */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Banner Settings & Customization</h2>
                  <p className="text-xs text-gray-500">Edit headline text, promo code, discount badge, and banner color palette</p>
                </div>

                {bannerSavedMsg && (
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5">
                    <FaCheck className="text-emerald-500" /> {bannerSavedMsg}
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveBanner} className="space-y-6">
                
                {/* Active Toggle & Theme Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-black text-gray-900">Enable Banner</label>
                      <p className="text-xs text-gray-500">Display this festive banner on the homepage</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={bannerForm.isActive} 
                        onChange={(e) => setBannerForm({ ...bannerForm, isActive: e.target.checked })} 
                        className="sr-only peer" 
                      />
                      <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Color Theme</label>
                    <div className="flex gap-2">
                      {[
                        { id: 'amber', name: 'Amber Gold', bg: 'bg-amber-500' },
                        { id: 'blue', name: 'Royal Blue', bg: 'bg-blue-600' },
                        { id: 'purple', name: 'Regal Purple', bg: 'bg-purple-600' },
                        { id: 'emerald', name: 'Emerald', bg: 'bg-emerald-600' },
                        { id: 'rose', name: 'Crimson Rose', bg: 'bg-rose-600' },
                      ].map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setBannerForm({ ...bannerForm, theme: t.id })}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                            bannerForm.theme === t.id ? 'border-gray-900 bg-white shadow-sm ring-2 ring-gray-900/10' : 'border-gray-200 bg-white hover:bg-gray-100'
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded-full ${t.bg}`}></span>
                          <span>{t.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Text Customization */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Top Badge Pill Text</label>
                    <input 
                      type="text" 
                      value={bannerForm.badgeText} 
                      onChange={(e) => setBannerForm({ ...bannerForm, badgeText: e.target.value })} 
                      placeholder="e.g. 🪔 FESTIVE SPECIAL • DUSSEHRA DHAMAKA 🏹"
                      className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-200 focus:border-amber-600 font-medium outline-none" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Main Banner Title / Headline</label>
                    <input 
                      type="text" 
                      required
                      value={bannerForm.title} 
                      onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })} 
                      placeholder="e.g. Celebrate Dussehra with a Sparkling Clean Home"
                      className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-200 focus:border-amber-600 font-bold outline-none" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Subtitle / Offer Description</label>
                  <textarea 
                    rows="2" 
                    required
                    value={bannerForm.subtitle} 
                    onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })} 
                    placeholder="e.g. Get FLAT 20% OFF on all professional cleaning, repairs, and kitchen deep-clean services..."
                    className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-200 focus:border-amber-600 font-medium outline-none"
                  ></textarea>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Discount Badge Label</label>
                    <input 
                      type="text" 
                      value={bannerForm.discountBadge} 
                      onChange={(e) => setBannerForm({ ...bannerForm, discountBadge: e.target.value })} 
                      placeholder="e.g. 20% OFF"
                      className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-200 focus:border-amber-600 font-black outline-none" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Displayed Coupon Code</label>
                    <input 
                      type="text" 
                      value={bannerForm.couponCode} 
                      onChange={(e) => setBannerForm({ ...bannerForm, couponCode: e.target.value.toUpperCase() })} 
                      placeholder="e.g. DUSSEHRA"
                      className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-200 focus:border-amber-600 font-mono font-black uppercase outline-none" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">CTA Button Text</label>
                    <input 
                      type="text" 
                      value={bannerForm.ctaText} 
                      onChange={(e) => setBannerForm({ ...bannerForm, ctaText: e.target.value })} 
                      placeholder="e.g. Book Service with 20% OFF"
                      className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-200 focus:border-amber-600 font-bold outline-none" 
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button 
                    type="submit" 
                    className="bg-amber-600 hover:bg-amber-700 text-white font-black py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 text-base cursor-pointer"
                  >
                    <FaSave /> Save Banner Changes
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: COUPONS & DISCOUNTS                                                */}
        {/* ========================================================================= */}
        {activeTab === 'coupons' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left: General Coupon Settings & Add Form */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* General Auto-Apply Settings */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                  <h3 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <FaTag className="text-emerald-600" /> Auto-Apply Config
                  </h3>
                  {couponSavedMsg && (
                    <span className="text-xs font-bold text-emerald-600">{couponSavedMsg}</span>
                  )}
                </div>

                <form onSubmit={handleSaveCouponSettings} className="space-y-4">
                  <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div>
                      <label className="block text-xs font-bold text-gray-900">Auto-Apply Coupon</label>
                      <p className="text-[11px] text-gray-500">Automatically apply default discount at checkout</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={couponForm.autoApply} 
                        onChange={(e) => setCouponForm({ ...couponForm, autoApply: e.target.checked })} 
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Default Pre-applied Code</label>
                    <select
                      value={couponForm.defaultCoupon}
                      onChange={(e) => setCouponForm({ ...couponForm, defaultCoupon: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:border-emerald-600 font-mono font-bold outline-none bg-white"
                    >
                      {couponForm.coupons?.map(c => (
                        <option key={c.code} value={c.code}>
                          {c.code} ({c.discountPercent}% OFF)
                        </option>
                      ))}
                    </select>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow transition-all text-xs flex items-center justify-center gap-1.5"
                  >
                    <FaSave /> Save Auto-Apply Settings
                  </button>
                </form>
              </div>

              {/* Add New Coupon Form */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                <h3 className="text-base font-black text-gray-900 mb-4 pb-3 border-b border-gray-100 flex items-center gap-2">
                  <FaPlus className="text-blue-600 text-sm" /> Add Promo Coupon
                </h3>

                <form onSubmit={handleAddCoupon} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Coupon Code</label>
                    <input 
                      type="text" 
                      required 
                      value={newCoupon.code} 
                      onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })} 
                      placeholder="e.g. DIWALI30"
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-600 font-mono font-black uppercase outline-none" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Discount (%)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        min="1" 
                        max="100" 
                        required 
                        value={newCoupon.discountPercent} 
                        onChange={(e) => setNewCoupon({ ...newCoupon, discountPercent: e.target.value })} 
                        placeholder="20"
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-600 font-bold outline-none" 
                      />
                      <span className="absolute right-3.5 top-2.5 text-gray-400 font-bold">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Description / Notes</label>
                    <input 
                      type="text" 
                      value={newCoupon.description} 
                      onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })} 
                      placeholder="e.g. Festive Diwali 30% discount"
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-600 font-medium outline-none" 
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3.5 rounded-xl shadow transition-all text-xs flex items-center justify-center gap-1.5"
                  >
                    <FaPlus /> Create Promo Code
                  </button>
                </form>
              </div>

            </div>

            {/* Right: Active Coupons List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <h2 className="text-lg font-black text-gray-900 tracking-tight">Active Coupons & Promo Codes</h2>
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-3 py-1 rounded-full">
                    {couponForm.coupons?.length || 0} Active
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-black text-gray-400 uppercase tracking-wider">
                        <th className="py-3 px-6">Coupon Code</th>
                        <th className="py-3 px-6">Discount</th>
                        <th className="py-3 px-6">Description</th>
                        <th className="py-3 px-6">Default</th>
                        <th className="py-3 px-6 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {couponForm.coupons?.map((c) => {
                        const isDefault = couponForm.defaultCoupon === c.code;
                        return (
                          <tr key={c.code} className="hover:bg-gray-50/80 transition-colors">
                            <td className="py-4 px-6">
                              <span className="font-mono font-black text-gray-900 bg-gray-100 px-3 py-1 rounded-lg border border-gray-200">
                                {c.code}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <span className="font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                                {c.discountPercent}% OFF
                              </span>
                            </td>
                            <td className="py-4 px-6 text-gray-600 font-medium">
                              {c.description || 'Promotional Offer'}
                            </td>
                            <td className="py-4 px-6">
                              {isDefault ? (
                                <span className="text-[11px] font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 flex items-center gap-1 w-fit">
                                  <FaCheck className="text-[9px]" /> Auto-Applied
                                </span>
                              ) : (
                                <button
                                  onClick={() => {
                                    const upd = { ...couponForm, defaultCoupon: c.code };
                                    setCouponForm(upd);
                                    saveCouponConfig(upd);
                                  }}
                                  className="text-xs font-bold text-gray-400 hover:text-blue-600 underline"
                                >
                                  Set as Default
                                </button>
                              )}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <button 
                                onClick={() => handleDeleteCoupon(c.code)}
                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Coupon"
                              >
                                <FaTrash size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {(!couponForm.coupons || couponForm.coupons.length === 0) && (
                        <tr>
                          <td colSpan="5" className="p-8 text-center text-gray-500 font-bold">
                            No coupons created yet. Add one using the form on the left!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: PLATFORM SETTINGS                                                  */}
        {/* ========================================================================= */}
        {activeTab === 'settings' && (
          <div className="max-w-xl mx-auto">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
              <h2 className="text-xl font-black text-gray-900 mb-2">Platform Fee Configuration</h2>
              <p className="text-xs text-gray-500 mb-6">Set the default platform convenience fee charged on every customer booking</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Platform Fee Amount (₹)</label>
                  <div className="flex gap-3">
                    <input 
                      type="number" 
                      value={feeInput} 
                      onChange={(e) => setFeeInput(e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-3 text-lg font-black border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-600 outline-none"
                    />
                    <button 
                      onClick={handleSaveFee} 
                      className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black hover:bg-blue-700 shadow-md transition-colors"
                    >
                      Save Fee
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Current Platform Fee: ₹{platformFee} (automatically added to checkout subtotal).
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
