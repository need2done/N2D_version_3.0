import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { DataContext } from '../context/DataContext';
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaCreditCard, FaTag, FaCheck, FaTimes } from 'react-icons/fa';
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
      setService({
        id: selectedData.id,
        name: selectedData.name,
        base_price: selectedData.base_price,
        image_url: selectedData.image
      });
    }
  }, [id, services]);

  const getSubtotal = () => {
    if (!service) return 0;
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

  const handleDetectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          const cityStr = data.address.city || data.address.town || data.address.village || data.address.state_district || 'Detected City';
          const areaStr = data.address.suburb || data.address.neighbourhood || data.address.residential || '';
          const pinStr = data.address.postcode || '';
          
          setAddress(prev => ({
            ...prev,
            area: areaStr || prev.area,
            city: cityStr,
            pincode: pinStr || prev.pincode
          }));
        } catch (error) {
          console.error("Error detecting location:", error);
        }
      }, (error) => {
        console.error("Geolocation error:", error);
      });
    }
  };

  const handleContinue = () => {
    setIsPaymentOpen(true);
  };

  const handlePaymentSuccess = async () => {
    setIsPaymentOpen(false);
    try {
      const payload = {
        customerId,
        serviceId: id,
        serviceName: service.name,
        duration,
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

  if (!service) return <div className="text-center py-20">Loading...</div>;

  return (
    <div className="bg-gray-50 min-h-screen py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl md:text-5xl font-black text-gray-900 mb-10 tracking-tight">Configure Your Booking</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          
          <div className="md:col-span-2 space-y-8">
            {/* Duration Card */}
            <div className="bg-white p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100">
              <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center tracking-tight">
                <FaClock className="mr-3 text-blue-600" /> Select Duration
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['1 Hour', '2 Hours', '3 Hours', '4 Hours'].map(d => (
                  <button 
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`py-4 px-4 rounded-2xl border-2 font-bold transition-all ${duration === d ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm transform -translate-y-1' : 'border-gray-100 text-gray-600 hover:border-blue-300 hover:bg-gray-50'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Date & Time Card */}
            <div className="bg-white p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100">
              <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center tracking-tight">
                <FaCalendarAlt className="mr-3 text-blue-600" /> Select Date & Time
              </h2>
              <div className="mb-6">
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM'].filter(s => {
                    const selectedD = new Date(date);
                    const today = new Date();
                    if (selectedD.toDateString() !== today.toDateString()) return true;
                    
                    const match = s.match(/(\d+):(\d+)\s+(AM|PM)/);
                    if (!match) return false;
                    let hour = parseInt(match[1]);
                    const ampm = match[3];
                    if (ampm === 'PM' && hour !== 12) hour += 12;
                    if (ampm === 'AM' && hour === 12) hour = 0;
                    return hour > today.getHours();
                  }).map(s => (
                    <button 
                      key={s}
                      onClick={() => setSlot(s)}
                      className={`py-3 px-4 rounded-2xl border-2 text-sm font-bold transition-all ${slot === s ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm transform -translate-y-1' : 'border-gray-100 text-gray-600 hover:border-blue-300 hover:bg-gray-50'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Address Card */}
            <div className="bg-white p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
                <h2 className="text-2xl font-black text-gray-900 flex items-center tracking-tight">
                  <FaMapMarkerAlt className="mr-3 text-blue-600" /> Service Address
                </h2>
                <button 
                  onClick={handleDetectLocation}
                  className="text-sm font-bold text-blue-700 bg-blue-50 px-5 py-2.5 rounded-full hover:bg-blue-100 transition-colors flex items-center w-fit border border-blue-100"
                >
                  <FaMapMarkerAlt className="mr-2" /> Detect Location
                </button>
              </div>
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <input type="text" placeholder="House No / Flat" className="w-full p-4 border border-gray-200 rounded-2xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-medium text-gray-800 bg-gray-50 focus:bg-white" value={address.houseNo} onChange={e => setAddress({...address, houseNo: e.target.value})} />
                  <input type="text" placeholder="Street / Building" className="w-full p-4 border border-gray-200 rounded-2xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-medium text-gray-800 bg-gray-50 focus:bg-white" value={address.street} onChange={e => setAddress({...address, street: e.target.value})} />
                </div>
                <input type="text" placeholder="Area / Colony / Locality" className="w-full p-4 border border-gray-200 rounded-2xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-medium text-gray-800 bg-gray-50 focus:bg-white" value={address.area} onChange={e => setAddress({...address, area: e.target.value})} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <input type="text" placeholder="City" className="w-full p-4 border border-gray-200 rounded-2xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-medium text-gray-800 bg-gray-50 focus:bg-white" value={address.city} onChange={e => setAddress({...address, city: e.target.value})} />
                  <input type="text" placeholder="Pincode" className="w-full p-4 border border-gray-200 rounded-2xl outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-medium text-gray-800 bg-gray-50 focus:bg-white" value={address.pincode} onChange={e => setAddress({...address, pincode: e.target.value})} />
                </div>
              </div>
            </div>
          </div>

          {/* Summary Sidebar */}
          <div className="md:col-span-1">
            <div className="sticky top-24 bg-white border border-gray-100 rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
              <h3 className="text-2xl font-black text-gray-900 mb-6 border-b border-gray-100 pb-5 tracking-tight">Booking Summary</h3>
              
              <div className="flex items-center space-x-5 mb-8">
                <img src={service.image_url} alt={service.name} className="w-20 h-20 rounded-2xl object-cover shadow-sm" />
                <div>
                  <h4 className="font-black text-gray-900 text-lg leading-tight mb-1">{service.name}</h4>
                  <p className="text-sm font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg w-fit">{duration}</p>
                </div>
              </div>

              {date && slot ? (
                <>
                  {/* Dussehra Coupon Card */}
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
                          className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
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
                            className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-black px-4 py-2 rounded-xl shadow transition-colors"
                          >
                            Apply
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleApplyCoupon(couponConfig?.defaultCoupon || 'DUSSEHRA')}
                          className="text-[11px] font-bold text-amber-800 hover:underline flex items-center gap-1"
                        >
                          ✨ Click to apply <span className="font-mono font-black bg-amber-200/80 px-1.5 py-0.5 rounded text-amber-950">{couponConfig?.defaultCoupon || 'DUSSEHRA'}</span> ({getActiveDiscountPercent() || 20}% OFF)
                        </button>
                      </div>
                    )}

                    {couponStatus.msg && (
                      <p className={`text-[11px] font-bold mt-2 ${couponStatus.type === 'error' ? 'text-red-600' : couponStatus.type === 'success' ? 'text-emerald-700' : 'text-gray-600'}`}>
                        {couponStatus.msg}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3.5 text-sm font-medium text-gray-600 mb-8 border-b border-gray-100 pb-8">
                    <div className="flex justify-between items-center">
                      <span>Base Price</span>
                      <span className="font-bold text-gray-900">₹{service.base_price}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Multiplier</span>
                      <span className="font-bold text-gray-900">x {parseInt(duration.split(' ')[0]) || 1}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-700 pt-1 border-t border-gray-50">
                      <span>Subtotal</span>
                      <span className="font-bold text-gray-900">₹{getSubtotal()}</span>
                    </div>
                    {isCouponApplied && getDiscount() > 0 && (
                      <div className="flex justify-between items-center text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-100">
                        <span className="font-bold flex items-center gap-1">
                          <FaTag className="text-xs" /> Coupon Discount ({couponCode} - {getActiveDiscountPercent()}%)
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
                    <div className="flex justify-between font-black text-gray-900 pt-4 border-t border-gray-100 mt-4 text-lg">
                      <span>Estimated Total</span>
                      <span className="text-2xl text-blue-600">₹{calculatePrice()}</span>
                    </div>
                  </div>
                  <div className="mb-8 p-4 bg-blue-50 text-blue-800 text-xs rounded-2xl text-center border border-blue-100">
                    <strong>Note:</strong> Extra time beyond the booking duration will be charged proportionally (e.g. ₹{Math.round(service.base_price / 2)} per 30 mins) subject to your approval during the service.
                  </div>

                  <button 
                    onClick={handleContinue}
                    disabled={!address.houseNo}
                    className="w-full flex items-center justify-center py-4 px-6 rounded-2xl text-white font-black text-lg bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer"
                  >
                    <FaCreditCard className="mr-2 text-2xl" /> Proceed to Payment
                  </button>
                  
                  <p className="text-center text-xs text-gray-400 mt-4">
                    Your payment is secure and encrypted.
                  </p>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
                  <p className="text-sm font-medium">Select a Date and Time<br/>to see your summary.</p>
                </div>
              )}
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
