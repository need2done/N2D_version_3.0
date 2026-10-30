import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { DataContext } from '../context/DataContext';
import { 
  FaCalendarAlt, FaClock, FaMapMarkerAlt, FaCreditCard, 
  FaTag, FaCheck, FaTimes, FaSearch, FaSpinner, FaStar, FaCheckCircle
} from 'react-icons/fa';
import api from '../services/api';
import PaymentModal from '../components/modals/PaymentModal';

const BookingConfiguration = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  let rawCustomerId = searchParams.get('customerId') || localStorage.getItem('n2d_customerId') || 'UNKNOWN';
  if (rawCustomerId.startsWith('N2DHS')) {
    rawCustomerId = rawCustomerId.substring(5);
  }
  if (!/^\d+$/.test(rawCustomerId) && rawCustomerId !== 'UNKNOWN') {
    try {
      const decoded = atob(rawCustomerId);
      if (decoded.match(/^\d+$/)) rawCustomerId = decoded;
    } catch (e) {}
  }
  const customerId = rawCustomerId;
  
  const { setBookingSession } = useSession();
  const [service, setService] = useState(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  
  // Form State
  const [duration, setDuration] = useState('1 Hour');
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');
  const [address, setAddress] = useState({
    houseNo: '',
    street: '',
    area: '',
    city: '',
    pincode: ''
  });

  // Custom Options State for Service #5 (Custom Package)
  const defaultCustomOptions = [
    { id: 'opt_kitchen', name: 'Kitchen Cleaning (Dishes, Sink & Arrange)', price: 199, duration: '45 mins' },
    { id: 'opt_clothes', name: 'Cloth Washing (Wash & Hang on Hangers)', price: 149, duration: '30 mins' },
    { id: 'opt_floor_clean', name: 'Floor Cleaning (Broom Sweep & Mop)', price: 149, duration: '45 mins' },
    { id: 'opt_floor_wash', name: 'Floor Washing (Deep Water Scrub & Wash)', price: 199, duration: '45 mins' }
  ];
  const [selectedCustomOptions, setSelectedCustomOptions] = useState(['opt_kitchen', 'opt_floor_clean']);
  
  // Itemized Garments State for Service #2 (Laundry Help)
  const defaultGarments = [
    { id: 'shirt', name: 'Shirt / T-Shirt', icon: '👔', rates: { opt_laundry_wash: 8, opt_laundry_dry: 4, opt_laundry_iron: 10, opt_laundry_fold: 5 }, defaultQty: 4 },
    { id: 'jeans', name: 'Trousers / Jeans', icon: '👖', rates: { opt_laundry_wash: 10, opt_laundry_dry: 4, opt_laundry_iron: 12, opt_laundry_fold: 5 }, defaultQty: 2 },
    { id: 'kurti', name: 'Kurti / Top / Salwar', icon: '👗', rates: { opt_laundry_wash: 8, opt_laundry_dry: 4, opt_laundry_iron: 10, opt_laundry_fold: 5 }, defaultQty: 2 },
    { id: 'saree', name: 'Saree (Daily / Cotton)', icon: '🥻', rates: { opt_laundry_wash: 20, opt_laundry_dry: 10, opt_laundry_iron: 25, opt_laundry_fold: 10 }, defaultQty: 1 },
    { id: 'bedsheet', name: 'Bedsheet (Single / Double)', icon: '🛏️', rates: { opt_laundry_wash: 25, opt_laundry_dry: 10, opt_laundry_iron: 25, opt_laundry_fold: 10 }, defaultQty: 1 },
    { id: 'towel', name: 'Bath Towel / Linens', icon: '🛁', rates: { opt_laundry_wash: 8, opt_laundry_dry: 4, opt_laundry_iron: 5, opt_laundry_fold: 5 }, defaultQty: 0 }
  ];
  const [garmentCounts, setGarmentCounts] = useState({ shirt: 4, jeans: 2, kurti: 2, saree: 1, bedsheet: 1, towel: 0 });

  const { services, platformFee, couponConfig } = useContext(DataContext);

  const defaultPromo = (couponConfig && couponConfig.defaultCoupon) || 'DUSSEHRA';
  const shouldAutoApply = couponConfig ? couponConfig.autoApply !== false : true;

  // Coupon State
  const [couponCode, setCouponCode] = useState(shouldAutoApply ? defaultPromo : '');
  const [isCouponApplied, setIsCouponApplied] = useState(shouldAutoApply);
  const [couponInput, setCouponInput] = useState('');
  const [couponStatus, setCouponStatus] = useState(shouldAutoApply ? { type: 'success', msg: `${defaultPromo} applied!` } : { type: '', msg: '' });

  useEffect(() => {
    if (couponConfig && couponConfig.autoApply && !couponCode) {
      setCouponCode(couponConfig.defaultCoupon || 'DUSSEHRA');
      setIsCouponApplied(true);
      setCouponStatus({ type: 'success', msg: `${couponConfig.defaultCoupon || 'DUSSEHRA'} applied!` });
    }
  }, [couponConfig]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  useEffect(() => {
    const selectedData = services.find(s => s.id.toString() === id) || services[0];
    if (selectedData) {
      const isCustom = Boolean(selectedData.is_custom || (selectedData.custom_options && selectedData.custom_options.length > 0) || selectedData.name.includes('Custom'));
      const options = (selectedData.custom_options && selectedData.custom_options.length > 0) ? selectedData.custom_options : (isCustom ? defaultCustomOptions : []);

      setService({
        id: selectedData.id,
        name: selectedData.name,
        base_price: selectedData.base_price,
        image_url: selectedData.image,
        is_custom: isCustom,
        custom_options: options,
        whats_included: selectedData.whats_included || []
      });
      if (options.length > 0) {
        setSelectedCustomOptions(options.map(o => o.id));
      }
      if (selectedData.name.includes('Full House') || selectedData.base_price >= 1000) {
        setDuration('4 - 5 Hours');
      }
    }
  }, [id, services]);

  const isLaundryService = service && (service.id === 2 || service.name?.toLowerCase().includes('laundry'));
  const isCustomService = service && (service.is_custom || (service.custom_options && service.custom_options.length > 0) || service.name.includes('Custom'));
  const isDeepCleanService = service && (service.name.includes('Full House') || service.base_price >= 1000);
  const activeCustomOptions = (service && service.custom_options && service.custom_options.length > 0) ? service.custom_options : defaultCustomOptions;

  const toggleCustomOption = (optId) => {
    setSelectedCustomOptions(prev => {
      const exists = prev.includes(optId);
      if (exists) {
        if (prev.length === 1) {
          alert('Please select at least one task for your custom package.');
          return prev;
        }
        return prev.filter(item => item !== optId);
      } else {
        return [...prev, optId];
      }
    });
  };

  const getGarmentPerPieceRate = (g) => {
    if (g && g.rates) {
      return selectedCustomOptions.reduce((sum, optId) => sum + (g.rates[optId] || 0), 0);
    }
    return activeCustomOptions
      .filter(opt => selectedCustomOptions.includes(opt.id))
      .reduce((total, opt) => total + (parseFloat(opt.price) || 0), 0);
  };

  const totalGarments = Object.values(garmentCounts).reduce((a, b) => a + (parseInt(b) || 0), 0);

  const updateGarmentCount = (gId, delta) => {
    setGarmentCounts(prev => {
      const current = prev[gId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [gId]: next };
    });
  };

  const getSubtotal = () => {
    if (!service) return 0;
    if (isLaundryService) {
      const total = defaultGarments.reduce((sum, g) => {
        const qty = garmentCounts[g.id] || 0;
        const rate = getGarmentPerPieceRate(g);
        return sum + (rate * qty);
      }, 0);
      return Math.round(total);
    }
    if (isCustomService) {
      const sum = activeCustomOptions
        .filter(opt => selectedCustomOptions.includes(opt.id))
        .reduce((total, opt) => total + (parseFloat(opt.price) || 0), 0);
      return sum;
    }
    if (isDeepCleanService) {
      return service.base_price;
    }
    const base = service.base_price;
    const multiplier = parseInt(duration.split(' ')[0]) || 1;
    return base * multiplier;
  };

  const getActiveDiscountPercent = () => {
    if (!isCouponApplied || !couponCode) return 0;
    const couponsList = (couponConfig && couponConfig.coupons) || [
      { code: 'DUSSEHRA', discountPercent: 20 },
      { code: 'DASARA', discountPercent: 20 },
      { code: 'FESTIVE20', discountPercent: 20 },
      { code: 'WELCOME10', discountPercent: 10 }
    ];
    const match = couponsList.find(c => c.code.toUpperCase() === couponCode.toUpperCase());
    return match ? (match.discountPercent || 20) : 20;
  };

  const getDiscount = () => {
    if (!isCouponApplied) return 0;
    const subtotal = getSubtotal();
    const percent = getActiveDiscountPercent();
    return Math.round(subtotal * (percent / 100));
  };

  const calculatePrice = () => {
    const subtotal = getSubtotal();
    const discount = getDiscount();
    return Math.max(0, subtotal - discount) + (platformFee || 0);
  };

  const handleApplyCoupon = (codeToApply) => {
    const code = (codeToApply || couponInput).trim().toUpperCase();
    if (!code) {
      setCouponStatus({ type: 'error', msg: 'Please enter a coupon code' });
      return;
    }
    const couponsList = (couponConfig && couponConfig.coupons) || [
      { code: 'DUSSEHRA', discountPercent: 20 },
      { code: 'DASARA', discountPercent: 20 },
      { code: 'FESTIVE20', discountPercent: 20 },
      { code: 'WELCOME10', discountPercent: 10 }
    ];
    const match = couponsList.find(c => c.code.toUpperCase() === code);
    if (match) {
      setCouponCode(code);
      setIsCouponApplied(true);
      setCouponInput('');
      setCouponStatus({ type: 'success', msg: `${code} applied: ${match.discountPercent || 20}% discount!` });
    } else {
      setCouponStatus({ type: 'error', msg: 'Invalid or expired coupon code' });
    }
  };

  const handleRemoveCoupon = () => {
    setIsCouponApplied(false);
    setCouponCode('');
    setCouponStatus({ type: 'info', msg: 'Coupon removed' });
  };

  // Location Search & Autocomplete State
  const [locationSearch, setLocationSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (!locationSearch || locationSearch.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingLocation(true);
      try {
        const res = await api.get(`/maps/autocomplete?query=${encodeURIComponent(locationSearch.trim())}`);
        if (res.data && res.data.success) {
          setSuggestions(res.data.predictions || []);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error("Autocomplete error:", err);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [locationSearch]);

  const handleSelectPlace = async (pred) => {
    setShowSuggestions(false);
    setLocationSearch(pred.description);

    let extractedHouseNo = '';
    const searchMatch = locationSearch.match(/^(\d+[-/][\w-]+|\d+)\s*,\s*(.+)/);
    if (searchMatch) {
      extractedHouseNo = searchMatch[1];
    }

    try {
      const res = await api.get(`/maps/place-details?placeId=${pred.place_id}&description=${encodeURIComponent(pred.description)}`);
      if (res.data && res.data.success && res.data.address) {
        const a = res.data.address;
        setAddress(prev => ({
          ...prev,
          houseNo: extractedHouseNo || a.houseNo || prev.houseNo,
          street: a.street || prev.street,
          area: a.area || prev.area,
          city: a.city || prev.city,
          pincode: a.pincode || prev.pincode
        }));
      }
    } catch (err) {
      console.error("Place details error:", err);
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await api.get(`/maps/reverse-geocode?lat=${latitude}&lng=${longitude}`);
          if (res.data && res.data.success && res.data.address) {
            const a = res.data.address;
            setAddress(prev => ({
              ...prev,
              houseNo: a.houseNo || prev.houseNo,
              street: a.street || prev.street,
              area: a.area || prev.area,
              city: a.city || prev.city,
              pincode: a.pincode || prev.pincode
            }));
            setLocationSearch(a.fullAddress || `${a.area}, ${a.city}`);
          }
        } catch (error) {
          console.error("Error detecting location:", error);
          alert("Could not detect exact address. You can type your location in the search bar.");
        } finally {
          setIsDetecting(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setIsDetecting(false);
        alert("Please enable location access in your browser or type your location manually.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleContinue = () => {
    setIsPaymentOpen(true);
  };

  const handlePaymentSuccess = async () => {
    setIsPaymentOpen(false);
    try {
      const selectedNames = isCustomService 
        ? activeCustomOptions.filter(o => selectedCustomOptions.includes(o.id)).map(o => o.name.split(' (')[0]).join(' + ')
        : service.name;

      const activeGarmentSummary = defaultGarments
        .filter(g => (garmentCounts[g.id] || 0) > 0)
        .map(g => `${garmentCounts[g.id]}x ${g.name}`)
        .join(', ');

      const payload = {
        customerId,
        serviceId: id,
        serviceName: isLaundryService
          ? `${service.name} (${totalGarments} Clothes: ${activeGarmentSummary || selectedNames})`
          : (isCustomService 
              ? (service.name.toLowerCase().includes('custom') ? `Custom Package: ${selectedNames}` : `${service.name} (${selectedNames})`)
              : service.name),
        duration: isLaundryService 
          ? `${totalGarments} Clothes • Pickup: ${slot || 'Scheduled'} (Return in 12-48 hrs)` 
          : (isCustomService 
              ? `${selectedCustomOptions.length} Selected Tasks` 
              : (isDeepCleanService ? '4 - 5 Hours' : duration)),
        clothCount: isLaundryService ? totalGarments : null,
        garmentBreakdown: isLaundryService ? garmentCounts : null,
        bookingDate: date,
        bookingSlot: slot,
        address,
        couponCode: isCouponApplied ? couponCode : null,
        discountAmount: getDiscount(),
        estimatedTotal: calculatePrice()
      };

      const res = await api.post('/home-services/checkout', payload);
      if (res.data.success) {
        navigate(`/booking-confirmation/${res.data.orderId}`);
      }
    } catch (err) {
      console.error("Error creating booking:", err);
      alert("Failed to create booking.");
    }
  };

  if (!service) return <div className="text-center py-20 font-bold">Loading service details...</div>;

  return (
    <div className="bg-gray-50 min-h-screen py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl md:text-5xl font-black text-gray-900 mb-10 tracking-tight">Configure Your Booking</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          
          <div className="md:col-span-2 space-y-8">
            
            {/* Condition 1: Custom Package / Laundry Help - Interactive Checklist */}
            {/* Condition 1: Custom Package / Laundry Help - Interactive Checklist */}
            {isCustomService ? (
              <div className="bg-white p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-blue-100 space-y-6">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-2xl font-black text-gray-900 flex items-center tracking-tight">
                    <FaCheckCircle className="mr-3 text-blue-600" /> 
                    {isLaundryService ? 'Configure Laundry Order' : 'Choose Your Services'}
                  </h2>
                  <span className="bg-blue-100 text-blue-800 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                    {isLaundryService ? 'Select Clothes' : 'Interactive Pack'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 font-medium">
                  {isLaundryService 
                    ? 'Select your laundry tasks and choose your clothes below. Per-piece rates calculate live with doorstep pickup and 12hr to 48hr return!' 
                    : 'Select the exact tasks you need. The total price and helper schedule adjust automatically!'}
                </p>

                {/* 1. Laundry Tasks Checklist */}
                <div>
                  <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <span className="text-blue-600">1️⃣</span> Select Laundry Tasks Needed:
                  </h3>
                  <div className="space-y-2.5">
                    {activeCustomOptions.map(opt => {
                      const isSelected = selectedCustomOptions.includes(opt.id);
                      return (
                        <div
                          key={opt.id}
                          onClick={() => toggleCustomOption(opt.id)}
                          className={`p-3.5 rounded-2xl border-2 cursor-pointer flex items-center justify-between transition-all select-none ${
                            isSelected ? 'border-blue-600 bg-blue-50/70 shadow-sm' : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all ${
                              isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 bg-white'
                            }`}>
                              {isSelected && <FaCheck size={10} />}
                            </div>
                            <div>
                              <span className="font-bold text-gray-900 text-sm block">{opt.name}</span>
                              <span className="text-xs text-gray-500 font-medium">
                                {isLaundryService ? 'Included in cloth rate' : `Estimated: ${opt.duration}`}
                              </span>
                            </div>
                          </div>
                          <span className="font-black text-blue-700 text-xs sm:text-sm">
                            {isLaundryService ? (isSelected ? '✓ Selected' : '+ Add') : `+₹${opt.price}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Itemized Garments Grid (Only for Laundry Help) */}
                {isLaundryService && (
                  <div className="p-5 bg-gradient-to-br from-blue-50/90 via-indigo-50/50 to-blue-50/90 rounded-2xl border-2 border-blue-200 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-blue-950 flex items-center gap-2">
                          <span className="text-lg">👕</span> 2. Choose Your Clothes ({totalGarments} Total)
                        </h3>
                        <p className="text-xs text-blue-800 font-medium mt-0.5">
                          Specify quantity for each type. Rates multiply live by selected tasks!
                        </p>
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setGarmentCounts({ shirt: 4, jeans: 2, kurti: 2, saree: 1, bedsheet: 1, towel: 0 })}
                          className="text-[11px] font-bold text-blue-700 hover:underline bg-white/90 px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs"
                        >
                          Reset 10 Pcs
                        </button>
                        <button
                          type="button"
                          onClick={() => setGarmentCounts({ shirt: 0, jeans: 0, kurti: 0, saree: 0, bedsheet: 0, towel: 0 })}
                          className="text-[11px] font-bold text-red-600 hover:underline bg-white/90 px-2.5 py-1 rounded-lg border border-red-200 shadow-2xs"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {defaultGarments.map(g => {
                        const qty = garmentCounts[g.id] || 0;
                        const rate = getGarmentPerPieceRate(g);
                        const itemTotal = rate * qty;
                        return (
                          <div 
                            key={g.id}
                            className={`p-3.5 rounded-xl border-2 transition-all flex items-center justify-between ${
                              qty > 0 
                                ? 'bg-white border-blue-500 shadow-xs' 
                                : 'bg-white/70 border-gray-200 opacity-80'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <span className="text-2xl flex-shrink-0">{g.icon}</span>
                              <div className="min-w-0">
                                <h4 className="font-bold text-gray-900 text-xs sm:text-sm truncate">{g.name}</h4>
                                <p className="text-[11px] text-blue-700 font-black">
                                  ₹{rate} <span className="text-gray-500 font-normal">/ piece</span>
                                  {qty > 0 && <span className="ml-1.5 text-gray-900 font-black">• Total: ₹{itemTotal}</span>}
                                </p>
                              </div>
                            </div>

                            {/* Stepper */}
                            <div className="flex items-center gap-1.5 flex-shrink-0 bg-blue-50/70 p-1 rounded-lg border border-blue-200/60">
                              <button
                                type="button"
                                onClick={() => updateGarmentCount(g.id, -1)}
                                className="w-7 h-7 rounded-md bg-white hover:bg-gray-100 text-gray-800 font-black text-sm flex items-center justify-center border border-gray-200 transition-colors"
                              >
                                -
                              </button>
                              <span className="w-7 text-center font-black text-sm text-gray-900">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateGarmentCount(g.id, 1)}
                                className="w-7 h-7 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-black text-sm flex items-center justify-center shadow-xs transition-colors"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {totalGarments === 0 && (
                      <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs font-bold text-amber-900">
                        ⚠️ Please add at least 1 cloth above.
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 p-3.5 bg-blue-50/80 rounded-xl border border-blue-200/50 flex items-center justify-between text-xs font-bold text-blue-900">
                  <span>
                    {isLaundryService 
                      ? `Total: ${totalGarments} Clothes • ${selectedCustomOptions.length} Tasks Selected`
                      : `Selected: ${selectedCustomOptions.length} of ${activeCustomOptions.length} tasks`}
                  </span>
                  <span>
                    {isLaundryService ? '🚚 Return Turnaround: 12 - 48 Hours' : `Estimated Time: ~${selectedCustomOptions.length * 45} mins`}
                  </span>
                </div>
              </div>
            ) : isDeepCleanService ? (
              /* Condition 2: Full House Deep Clean - Comprehensive 4-5 hr Badge Card */
              <div className="bg-white p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-indigo-100">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h2 className="text-2xl font-black text-gray-900 flex items-center tracking-tight">
                    <FaClock className="mr-3 text-blue-600" /> Package Duration
                  </h2>
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                    Full 4 - 5 Hours Package
                  </span>
                </div>

                <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200/80 rounded-2xl p-5 mb-4">
                  <div className="text-blue-950 font-black text-lg mb-2 flex items-center gap-2">
                    <span>✨ Complete 2BHK / Independent House Deep Cleaning</span>
                  </div>
                  <p className="text-sm text-blue-900 leading-relaxed font-medium mb-3">
                    Fixed price package of <strong>₹1,199</strong> for a comprehensive 4 to 5 hour deep sanitization visit.
                  </p>
                  
                  <div className="space-y-2 border-t border-blue-200/60 pt-3">
                    <div className="flex items-start text-xs font-bold text-blue-900">
                      <span className="text-emerald-600 mr-2 text-sm">🚿</span>
                      <span><strong>Exclusive Bathroom Deep Scrub:</strong> Hard-water tile descaling, commode acid sanitization & tap polish (Only available in this package).</span>
                    </div>
                    <div className="flex items-start text-xs font-bold text-blue-900">
                      <span className="text-blue-600 mr-2 text-sm">🪭</span>
                      <span><strong>Ceiling Fans & Lights:</strong> Full degreasing and dusting of fans, tube lights & switchboards.</span>
                    </div>
                    <div className="flex items-start text-xs font-bold text-blue-900">
                      <span className="text-blue-600 mr-2 text-sm">🪟</span>
                      <span><strong>Windows & Grills:</strong> Glass wiping with squeegee and mosquito mesh cleaning.</span>
                    </div>
                    <div className="flex items-start text-xs font-bold text-blue-900">
                      <span className="text-blue-600 mr-2 text-sm">🕸️</span>
                      <span><strong>Cobweb Removal:</strong> Complete clearance of cobwebs/బూజులు from all ceilings and corners.</span>
                    </div>
                    <div className="flex items-start text-xs font-bold text-blue-900">
                      <span className="text-blue-600 mr-2 text-sm">🧹</span>
                      <span><strong>Floor Scrubbing:</strong> Wet floor scrubbing with disinfectant across hall, bedrooms, kitchen & balcony.</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Condition 3: Regular Services - Standard Duration Selector */
              <div className="bg-white p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100">
                <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center tracking-tight">
                  <FaClock className="mr-3 text-blue-600" /> Select Duration
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['1 Hour', '1.5 Hours', '2 Hours', '3 Hours'].map(d => (
                    <button 
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`py-4 px-4 rounded-2xl border-2 font-bold transition-all ${
                        duration === d 
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm transform -translate-y-1' 
                          : 'border-gray-100 text-gray-600 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Date & Time Card */}
            <div className="bg-white p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-2xl font-black text-gray-900 flex items-center tracking-tight">
                  <FaCalendarAlt className="mr-3 text-blue-600" /> 
                  {isLaundryService ? 'Select Pickup Date & Time' : 'Select Date & Time'}
                </h2>
                {isLaundryService && (
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                    <span>🚚</span> Return in 12hr to 48hr
                  </span>
                )}
              </div>

              {/* Informative Pickup & Delivery Banner for Laundry Help */}
              {isLaundryService && (
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200/80 rounded-2xl">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 text-lg shadow-sm">
                      🚚
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-blue-950">
                        Doorstep Clothes Pickup & Return Timeline
                      </h4>
                      <p className="text-xs text-blue-800 font-medium leading-relaxed">
                        Helper arrives at your address during your selected pickup window to collect clothes. Clothes are carefully washed, dried, pressed, and neatly folded based on your selected tasks, and <strong>delivered back safely to your home within 12hr to 48hr</strong>!
                      </p>
                      <div className="pt-2 flex flex-wrap gap-2 text-[11px] font-bold text-blue-900">
                        <span className="bg-white/90 px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
                          ⚡ Steam Press only: Return in ~12 - 24 hrs
                        </span>
                        <span className="bg-white/90 px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
                          🧺 Wash, Dry & Fold: Return in ~24 - 36 hrs
                        </span>
                        <span className="bg-white/90 px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
                          ✨ Full Combo Laundry: Return in ~24 - 48 hrs
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  {isLaundryService ? 'Choose Pickup Date' : 'Choose Date'}
                </label>
                <input 
                  type="date" 
                  min={new Date().toLocaleDateString('en-CA')}
                  className="w-full md:w-1/2 p-4 border-2 border-gray-200 rounded-2xl focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none font-bold text-gray-700 transition-all"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setSlot('');
                  }}
                />
              </div>

              {date && (
                <div>
                  <h3 className="text-base font-bold text-gray-700 mb-4">
                    {isLaundryService ? 'Available Pickup Time Slots' : 'Available Time Slots'}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {['08:00 AM - 10:00 AM', '10:00 AM - 12:00 PM', '12:00 PM - 02:00 PM', '02:00 PM - 04:00 PM', '04:00 PM - 06:00 PM', '06:00 PM - 08:00 PM'].map(s => {
                      const todayStr = new Date().toLocaleDateString('en-CA');
                      const isToday = date === todayStr;
                      const [startTimeStr, modifier] = s.split(' - ')[0].split(' ');
                      let [hours, minutes] = startTimeStr.split(':').map(Number);
                      if (modifier === 'PM' && hours !== 12) hours += 12;
                      if (modifier === 'AM' && hours === 12) hours = 0;
                      
                      const slotDate = new Date();
                      slotDate.setHours(hours, minutes, 0, 0);
                      const isPast = isToday && slotDate < new Date();

                      return (
                        <button 
                          key={s}
                          disabled={isPast}
                          onClick={() => setSlot(s)}
                          className={`p-3 text-xs md:text-sm rounded-2xl border-2 font-bold transition-all ${
                            isPast 
                              ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                              : slot === s 
                                ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm transform -translate-y-1' 
                                : 'border-gray-100 text-gray-600 hover:border-blue-300 hover:bg-gray-50'
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Address Form Card */}
            <div className="bg-white p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-gray-900 flex items-center tracking-tight">
                  <FaMapMarkerAlt className="mr-3 text-blue-600" /> Service Address
                </h2>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={isDetecting}
                  className="flex items-center text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-xl transition-all cursor-pointer border border-blue-100 disabled:opacity-50"
                >
                  {isDetecting ? (
                    <><FaSpinner className="animate-spin mr-1.5" /> Detecting...</>
                  ) : (
                    <><FaMapMarkerAlt className="mr-1.5" /> Detect My Location</>
                  )}
                </button>
              </div>

              {/* Location Search Input with Live Suggestions */}
              <div className="relative mb-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search your area, colony, or landmark in Bhongir..."
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                    className="w-full p-4 pl-12 border-2 border-gray-200 rounded-2xl focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-semibold text-gray-800 transition-all shadow-sm"
                  />
                  <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
                  {isSearchingLocation && (
                    <FaSpinner className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-600 animate-spin text-base" />
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-60 overflow-y-auto divide-y divide-gray-50">
                    {suggestions.map((pred, i) => (
                      <div
                        key={i}
                        onClick={() => handleSelectPlace(pred)}
                        className="p-3.5 hover:bg-blue-50 cursor-pointer flex items-center gap-3 transition-colors text-left"
                      >
                        <FaMapMarkerAlt className="text-blue-500 shrink-0 text-sm" />
                        <div>
                          <p className="text-xs font-bold text-gray-900">{pred.main_text || pred.description.split(',')[0]}</p>
                          <p className="text-[11px] text-gray-500 truncate">{pred.secondary_text || pred.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">House / Flat No. <strong className="text-red-500">*</strong></label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Flat 302 / Plot 45"
                      className="w-full p-3.5 border border-gray-200 rounded-xl focus:border-blue-600 outline-none text-sm font-medium"
                      value={address.houseNo}
                      onChange={(e) => setAddress({ ...address, houseNo: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Apartment / Street / Colony</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Sri Sai Nilayam, Teachers Colony"
                      className="w-full p-3.5 border border-gray-200 rounded-xl focus:border-blue-600 outline-none text-sm font-medium"
                      value={address.street}
                      onChange={(e) => setAddress({ ...address, street: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Area / Landmark</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Near Clock Tower"
                      className="w-full p-3.5 border border-gray-200 rounded-xl focus:border-blue-600 outline-none text-sm font-medium"
                      value={address.area}
                      onChange={(e) => setAddress({ ...address, area: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">City</label>
                    <input 
                      type="text" 
                      placeholder="Bhongir"
                      className="w-full p-3.5 border border-gray-200 rounded-xl focus:border-blue-600 outline-none text-sm font-medium"
                      value={address.city || 'Bhongir'}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Pincode</label>
                    <input 
                      type="text" 
                      placeholder="508116"
                      className="w-full p-3.5 border border-gray-200 rounded-xl focus:border-blue-600 outline-none text-sm font-medium"
                      value={address.pincode || '508116'}
                      onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Order Summary */}
          <div className="md:col-span-1">
            <div className="bg-white p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 sticky top-24">
              <h3 className="text-xl font-black text-gray-900 mb-6 tracking-tight">Booking Summary</h3>
              
              <div className="flex items-center space-x-4 mb-6">
                <img src={service.image_url} alt={service.name} className="w-16 h-16 rounded-2xl object-cover shadow-sm border border-gray-100" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-gray-900 text-base leading-tight mb-1 truncate">{service.name}</h4>
                  <p className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md w-fit">
                    {isLaundryService 
                      ? `${totalGarments} Clothes • ${selectedCustomOptions.length} Tasks` 
                      : (isCustomService ? `${selectedCustomOptions.length} Selected Tasks` : (isDeepCleanService ? '4 - 5 Hours' : duration))}
                  </p>
                </div>
              </div>

              {/* Scheduled Pickup & Delivery Box */}
              {date && slot && (
                <div className="mb-4 p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200/80 text-xs">
                  <div className="flex items-center justify-between font-bold text-blue-950 mb-1">
                    <span className="flex items-center gap-1.5">
                      <span>{isLaundryService ? '🚚' : '📅'}</span>
                      <span>{isLaundryService ? 'Pickup Window:' : 'Scheduled Slot:'}</span>
                    </span>
                    <span className="text-blue-700 font-black">{slot}</span>
                  </div>
                  <div className="text-blue-800 text-[11px] font-medium flex items-center justify-between">
                    <span>Date: {date}</span>
                    {isLaundryService && (
                      <span className="text-emerald-700 font-black">✓ Return: 12 - 48 hrs</span>
                    )}
                  </div>
                </div>
              )}

              {/* Custom Package / Laundry Selected Breakdown */}
              {isCustomService && (
                <div className="mb-6 p-4 bg-blue-50/70 rounded-2xl border border-blue-100">
                  <div className="flex justify-between items-center mb-2.5">
                    <p className="text-xs font-black text-blue-900 uppercase tracking-wider">
                      {isLaundryService ? `Selected Tasks (${totalGarments} Clothes):` : `Selected Tasks (${selectedCustomOptions.length}):`}
                    </p>
                    <span className="text-xs font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">Live Calculation</span>
                  </div>
                  {isLaundryService ? (
                    <div className="space-y-1.5">
                      {defaultGarments.filter(g => (garmentCounts[g.id] || 0) > 0).map(g => {
                        const qty = garmentCounts[g.id] || 0;
                        const rate = getGarmentPerPieceRate(g);
                        return (
                          <div key={g.id} className="text-xs text-gray-700 flex justify-between items-center">
                            <span className="font-medium">
                              {g.icon} {qty}x {g.name} <span className="text-gray-400 text-[10px]">(@ ₹{rate}/pc)</span>
                            </span>
                            <span className="font-black text-gray-900">₹{rate * qty}</span>
                          </div>
                        );
                      })}
                      <div className="mt-2.5 pt-2 border-t border-blue-200/60 flex justify-between text-xs font-black text-blue-950">
                        <span>Total Clothes:</span>
                        <span>{totalGarments} Pieces</span>
                      </div>
                    </div>
                  ) : (
                    <ul className="space-y-1.5">
                      {activeCustomOptions.filter(o => selectedCustomOptions.includes(o.id)).map(o => (
                        <li key={o.id} className="text-xs text-gray-700 flex justify-between items-center">
                          <span className="font-medium">• {o.name.split(' (')[0]}</span>
                          <span className="font-black text-gray-900">₹{o.price}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Festive Coupon Card */}
              <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FaTag className="text-amber-600 text-sm" />
                    <span className="text-xs font-black text-amber-900 uppercase tracking-wider">Festive Offer</span>
                  </div>
                  {isCouponApplied && (
                    <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <FaCheck className="text-[10px]" /> 20% OFF
                    </span>
                  )}
                </div>

                {isCouponApplied ? (
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-amber-300 shadow-sm">
                    <div>
                      <p className="font-mono font-black text-amber-950 text-sm tracking-wider">{couponCode}</p>
                      <p className="text-[11px] font-bold text-emerald-600">Saved ₹{getDiscount()} on this booking</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <FaTimes className="text-[10px]" /> Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter Code (e.g. DUSSEHRA)"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        className="w-full text-xs font-mono font-bold uppercase p-2 border border-gray-300 rounded-xl focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyCoupon()}
                        className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-black px-4 py-2 rounded-xl shadow transition-colors cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyCoupon(couponConfig?.defaultCoupon || 'DUSSEHRA')}
                      className="text-[11px] font-bold text-amber-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      ✨ Apply <span className="font-mono font-black bg-amber-200/80 px-1.5 py-0.5 rounded text-amber-950">{couponConfig?.defaultCoupon || 'DUSSEHRA'}</span> ({getActiveDiscountPercent() || 20}% OFF)
                    </button>
                  </div>
                )}

                {couponStatus.msg && (
                  <p className={`text-[11px] font-bold mt-2 ${couponStatus.type === 'error' ? 'text-red-600' : couponStatus.type === 'success' ? 'text-emerald-700' : 'text-gray-600'}`}>
                    {couponStatus.msg}
                  </p>
                )}
              </div>

              {/* Real-Time Price Calculation Breakdown */}
              <div className="space-y-3.5 text-sm font-medium text-gray-600 mb-6 border-b border-gray-100 pb-6">
                <div className="flex justify-between items-center">
                  <span>{isCustomService ? 'Custom Tasks Total' : 'Service Package'}</span>
                  <span className="font-bold text-gray-900 text-base">₹{getSubtotal()}</span>
                </div>

                {isCouponApplied && getDiscount() > 0 && (
                  <div className="flex justify-between items-center text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-100">
                    <span className="font-bold flex items-center gap-1 text-xs">
                      <FaTag className="text-xs" /> Coupon ({couponCode})
                    </span>
                    <span className="font-black">- ₹{getDiscount()}</span>
                  </div>
                )}

                {platformFee > 0 && (
                  <div className="flex justify-between items-center text-orange-600 pt-1 border-t border-gray-50">
                    <span>Platform Fee</span>
                    <span className="font-bold">+ ₹{platformFee}</span>
                  </div>
                )}

                <div className="flex justify-between font-black text-gray-900 pt-3 border-t border-gray-100 text-lg">
                  <span>Total Amount</span>
                  <span className="text-2xl text-blue-600">₹{calculatePrice()}</span>
                </div>
              </div>

              {/* Checkout / Date-Time Guidance */}
              {date && slot ? (
                <>
                  <button 
                    onClick={handleContinue}
                    disabled={!address.houseNo}
                    className="w-full flex items-center justify-center py-4 px-6 rounded-2xl text-white font-black text-base md:text-lg bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer"
                  >
                    <FaCreditCard className="mr-2 text-xl" /> Proceed to Payment
                  </button>
                  {!address.houseNo && (
                    <p className="text-center text-xs text-amber-700 font-bold mt-2.5">
                      ⚠️ Please enter your House / Flat No. to continue.
                    </p>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs font-bold text-center">
                    👉 Please select a <strong>Date & Time Slot</strong> above to proceed to checkout.
                  </div>
                  <button 
                    disabled
                    className="w-full flex items-center justify-center py-3.5 px-6 rounded-2xl text-gray-400 font-black text-sm bg-gray-100 border border-gray-200 cursor-not-allowed"
                  >
                    Select Slot to Proceed
                  </button>
                </div>
              )}

              <p className="text-center text-xs text-gray-400 mt-4">
                Background-verified helper assigned upon confirmation.
              </p>
            </div>
          </div>

        </div>
      </div>
      
      <PaymentModal 
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        amount={calculatePrice()}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
};

export default BookingConfiguration;
