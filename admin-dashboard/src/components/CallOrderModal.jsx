import React, { useState, useEffect } from 'react';
import { 
  PhoneCall, X, User, MapPin, Navigation, IndianRupee, 
  CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, 
  Bike, Car, Truck, Wrench, ShoppingBag, Sparkles, Clock, Send
} from 'lucide-react';
import { API_URL } from '../config';

export default function CallOrderModal({ isOpen, onClose, onOrderCreated, initialQuote = null }) {
  if (!isOpen) return null;

  // Form State
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [engineType, setEngineType] = useState('TASK'); // 'RIDE', 'TASK'
  const [serviceCategory, setServiceCategory] = useState('CUSTOM_WORK'); // 'RIDE', 'CUSTOM_WORK', 'SHOPPING', 'HOME_SERVICES'
  const [vehicleType, setVehicleType] = useState('BIKE'); // 'BIKE', 'AUTO', 'CAR'
  const [serviceTitle, setServiceTitle] = useState('Pick & Drop / Errand');
  
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropLocation, setDropLocation] = useState('');
  const [distanceKm, setDistanceKm] = useState(2.5);
  
  // Custom work specific
  const [customTaskType, setCustomTaskType] = useState('direct_pickup');
  const [extraStops, setExtraStops] = useState(0);

  // Shopping specific
  const [storeBillAmount, setStoreBillAmount] = useState(0);
  const [shoppingService, setShoppingService] = useState('Groceries');

  // Home services specific
  const [selectedHsService, setSelectedHsService] = useState('');
  const [hsServicesList, setHsServicesList] = useState([]);

  // Pricing
  const [totalAmount, setTotalAmount] = useState(59);
  const [helperCharge, setHelperCharge] = useState(40);
  const [platformFee, setPlatformFee] = useState(5);
  const [manualPriceOverride, setManualPriceOverride] = useState(false);

  // Assignment & Payment
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [assignedHelperId, setAssignedHelperId] = useState('');
  const [helpersList, setHelpersList] = useState([]);
  const [notes, setNotes] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successData, setSuccessData] = useState(null);

  // Fetch helpers & HS services on mount
  useEffect(() => {
    fetchHelpers();
    fetchHsServices();
  }, []);

  // Pre-fill initial quote if provided from Fare Calculator page
  useEffect(() => {
    if (initialQuote) {
      if (initialQuote.serviceCategory) setServiceCategory(initialQuote.serviceCategory);
      if (initialQuote.engineType) setEngineType(initialQuote.engineType);
      if (initialQuote.vehicleType) setVehicleType(initialQuote.vehicleType);
      if (initialQuote.serviceTitle) setServiceTitle(initialQuote.serviceTitle);
      if (initialQuote.distanceKm !== undefined) setDistanceKm(initialQuote.distanceKm);
      if (initialQuote.pickupLocation) setPickupLocation(initialQuote.pickupLocation);
      if (initialQuote.dropLocation) setDropLocation(initialQuote.dropLocation);
      if (initialQuote.totalAmount !== undefined) setTotalAmount(initialQuote.totalAmount);
      if (initialQuote.helperCharge !== undefined) setHelperCharge(initialQuote.helperCharge);
      if (initialQuote.platformFee !== undefined) setPlatformFee(initialQuote.platformFee);
      if (initialQuote.storeBillAmount !== undefined) setStoreBillAmount(initialQuote.storeBillAmount);
      if (initialQuote.customTaskType) setCustomTaskType(initialQuote.customTaskType);
    }
  }, [initialQuote]);

  // Recalculate price when parameters change (unless manually edited)
  useEffect(() => {
    if (manualPriceOverride) return;

    if (serviceCategory === 'RIDE') {
      calculateRideFare(distanceKm, vehicleType);
    } else if (serviceCategory === 'CUSTOM_WORK') {
      calculateCustomWorkFare(distanceKm, customTaskType, extraStops);
    } else if (serviceCategory === 'SHOPPING') {
      calculateShoppingFare(distanceKm, storeBillAmount);
    }
  }, [serviceCategory, vehicleType, distanceKm, customTaskType, extraStops, storeBillAmount, manualPriceOverride]);

  const fetchHelpers = async () => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const res = await fetch(`${API_URL}/helpers`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.success && data.helpers) {
        setHelpersList(data.helpers);
      }
    } catch (e) {
      console.error('Failed to fetch helpers for modal:', e);
    }
  };

  const fetchHsServices = async () => {
    try {
      const res = await fetch(`${API_URL}/home-services/services`);
      const data = await res.json();
      if (data.success && data.services) {
        setHsServicesList(data.services);
      }
    } catch (e) {
      console.error('Failed to fetch HS services for modal:', e);
    }
  };

  // Pricing Engines
  const calculateRideFare = (dist, vehicle) => {
    const d = Math.max(1.0, parseFloat(dist) || 1.0);
    let base = 11;
    let perKm1 = 8.2;
    let perKm2 = 11.3;
    let tier1Limit = 8;
    let pFee = 5;

    if (vehicle === 'AUTO') {
      base = 30;
      perKm1 = 15;
      perKm2 = 18;
      tier1Limit = 5;
    } else if (vehicle === 'CAR') {
      base = 50;
      perKm1 = 20;
      perKm2 = 25;
      tier1Limit = 5;
    }

    let distFare = 0;
    if (d <= tier1Limit) {
      distFare = d * perKm1;
    } else {
      distFare = (tier1Limit * perKm1) + ((d - tier1Limit) * perKm2);
    }

    const subtotal = Math.round(base + distFare);
    const total = subtotal + pFee;
    const hPayout = Math.round(subtotal * 0.85); // 85% helper split

    setTotalAmount(total);
    setHelperCharge(hPayout);
    setPlatformFee(pFee + Math.round(subtotal * 0.15));
    setEngineType('RIDE');
    setServiceTitle(`${vehicle} Ride (${d.toFixed(1)} km)`);
  };

  const calculateCustomWorkFare = (dist, taskType, stops) => {
    const d = parseFloat(dist) || 0;
    let fare = 59;
    let helper = 40;

    if (taskType === 'micro_errand') {
      fare = 39; helper = 25;
    } else if (taskType === 'prepaid_pickup') {
      fare = 49; helper = 35;
    } else if (taskType === 'direct_pickup') {
      if (d <= 2.0) { fare = 39; helper = 25; }
      else if (d <= 3.5) { fare = 79; helper = 55; }
      else if (d <= 5.0) { fare = 99; helper = 68; }
      else {
        const extraKm = d - 5.0;
        fare = 99 + Math.round(extraKm * 8);
        helper = 68 + Math.round(extraKm * 5);
      }
    } else if (taskType === 'buy_and_bring') {
      fare = 79; helper = 55;
      if (d > 3.5) { fare += 20; helper += 15; }
    } else if (taskType === 'queue_paperwork') {
      fare = 89; helper = 60;
    } else if (taskType === 'multi_stop') {
      fare = 119; helper = 85;
    } else if (taskType === 'cargo_auto') {
      fare = 149; helper = 110;
    } else {
      fare = 99; helper = 75;
    }

    // Add extra stops (+₹30 each)
    if (stops > 0) {
      fare += (stops * 30);
      helper += (stops * 20);
    }

    const pFee = Math.max(5, fare - helper);
    setTotalAmount(fare);
    setHelperCharge(helper);
    setPlatformFee(pFee);
    setEngineType('TASK');
    setServiceTitle(`Custom Work: ${taskType.replace(/_/g, ' ').toUpperCase()} (${d.toFixed(1)} km)`);
  };

  const calculateShoppingFare = (dist, storeBill) => {
    const d = parseFloat(dist) || 1.5;
    const bill = parseFloat(storeBill) || 0;
    
    // Delivery fee: ₹30 up to 2km + ₹10/km after
    let deliveryFee = 30;
    if (d > 2.0) {
      deliveryFee += Math.round((d - 2.0) * 10);
    }
    const pFee = 5;
    const hPayout = deliveryFee - pFee;
    const grandTotal = bill + deliveryFee;

    setTotalAmount(grandTotal);
    setHelperCharge(hPayout);
    setPlatformFee(pFee);
    setEngineType('TASK');
    setServiceTitle(`${shoppingService} Delivery (${d.toFixed(1)} km)`);
  };

  const handleHsSelect = (serviceId) => {
    const s = hsServicesList.find(x => String(x.id) === String(serviceId));
    if (!s) return;
    setSelectedHsService(serviceId);
    setTotalAmount(parseFloat(s.rate) || 199);
    setHelperCharge(parseFloat(s.helper_charge) || 170);
    setPlatformFee(parseFloat(s.platform_fee) || 29);
    setEngineType('TASK');
    setServiceTitle(`Home Service: ${s.title}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (!cleanPhone || (cleanPhone.length !== 10 && cleanPhone.length !== 12)) {
      setError('Please enter a valid 10-digit customer mobile number.');
      return;
    }

    if (!pickupLocation && serviceCategory !== 'HOME_SERVICES') {
      setError('Please provide a pickup / task location.');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const payload = {
        customer_phone: cleanPhone,
        customer_name: customerName || 'Phone Caller',
        service: serviceCategory === 'RIDE' ? 'Ride' : 
                 serviceCategory === 'CUSTOM_WORK' ? 'AnyWork' :
                 serviceCategory === 'SHOPPING' ? shoppingService : 'Home Services',
        engine_type: engineType,
        vehicle_type: engineType === 'RIDE' ? vehicleType : null,
        service_title: serviceTitle,
        pickup_location: pickupLocation,
        drop_location: dropLocation || 'Customer Address',
        distance_km: parseFloat(distanceKm) || 0,
        total_amount: parseFloat(totalAmount) || 0,
        helper_charge: parseFloat(helperCharge) || 0,
        platform_fee: parseFloat(platformFee) || 0,
        bill_amount: serviceCategory === 'SHOPPING' ? parseFloat(storeBillAmount) || 0 : 0,
        payment_method: paymentMethod,
        helper_id: assignedHelperId ? parseInt(assignedHelperId) : null,
        notes: notes.trim()
      };

      const res = await fetch(`${API_URL}/orders/call-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to place call order');
      }

      setSuccessData(data);
      if (onOrderCreated) {
        onOrderCreated(data);
      }
    } catch (err) {
      console.error('Call Order submit error:', err);
      setError(err.message || 'Something went wrong while placing order.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '720px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          color: '#ffffff',
          borderTopLeftRadius: '19px',
          borderTopRightRadius: '19px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <PhoneCall size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
                Quick Fare Calculator & Call Order
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#e0f2fe' }}>
                Calculate fare live while on call with customer & create instant order
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        {successData ? (
          <div style={{ padding: '36px 24px', textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#ecfdf5',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <CheckCircle2 size={36} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
              Order Placed Successfully!
            </h3>
            <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '14px' }}>
              Order ID <strong style={{ color: '#0284c7' }}>#{successData.display_id}</strong> is active. Confirmation WhatsApp sent to customer.
            </p>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '16px',
              maxWidth: '460px',
              margin: '0 auto 24px',
              textAlign: 'left',
              fontSize: '13px',
              lineHeight: 1.6
            }}>
              <div><strong>Customer:</strong> {successData.customer_name} ({successData.customer_phone})</div>
              <div><strong>Service:</strong> {serviceTitle}</div>
              <div><strong>Total Customer Fare:</strong> ₹{successData.total_amount}</div>
              <div><strong>Helper Payout:</strong> ₹{successData.helper_charge}</div>
              <div><strong>Platform Commission:</strong> ₹{successData.platform_fee}</div>
              <div><strong>Payment Mode:</strong> {paymentMethod === 'CASH' ? 'Cash to Helper' : 'UPI Link'}</div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={onClose}
                style={{ padding: '10px 24px', fontWeight: 700 }}
              >
                Close & Return to Dashboard
              </button>
              <button
                className="btn btn-outline"
                onClick={() => {
                  setSuccessData(null);
                  setCustomerPhone('');
                  setCustomerName('');
                  setNotes('');
                }}
                style={{ padding: '10px 20px' }}
              >
                Place Another Call Order
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>
            {error && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                padding: '10px 14px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#b91c1c',
                fontSize: '13px'
              }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* 1. Customer Section */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                1. Caller / Customer Info
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#64748b'
                    }}>+91</span>
                    <input
                      type="tel"
                      required
                      placeholder="Customer 10-digit Phone"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 44px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#0f172a',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Customer Name (optional)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '14px',
                      color: '#0f172a',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 2. Service Category Selector */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                2. Select Service Category
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {[
                  { key: 'RIDE', label: 'Ride Booking', icon: Bike, desc: 'Bike / Auto / Car' },
                  { key: 'CUSTOM_WORK', label: 'Custom Work', icon: Sparkles, desc: 'Pick & Drop / Errand' },
                  { key: 'SHOPPING', label: 'Shopping', icon: ShoppingBag, desc: 'Groceries / Food / Meds' },
                  { key: 'HOME_SERVICES', label: 'Home Services', icon: Wrench, desc: 'Electrician / Plumber' },
                ].map(item => {
                  const Icon = item.icon;
                  const isSelected = serviceCategory === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setServiceCategory(item.key);
                        setManualPriceOverride(false);
                      }}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid #0284c7' : '1.5px solid #e2e8f0',
                        backgroundColor: isSelected ? '#f0f9ff' : '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s'
                      }}
                    >
                      <Icon size={18} color={isSelected ? '#0284c7' : '#64748b'} style={{ margin: '0 auto 4px' }} />
                      <div style={{ fontSize: '12px', fontWeight: 700, color: isSelected ? '#0369a1' : '#334155' }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                        {item.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sub-parameters based on category */}
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '14px',
              marginBottom: '18px'
            }}>
              {serviceCategory === 'RIDE' && (
                <div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    {['BIKE', 'AUTO', 'CAR'].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => { setVehicleType(v); setManualPriceOverride(false); }}
                        style={{
                          flex: 1,
                          padding: '8px',
                          borderRadius: '10px',
                          border: vehicleType === v ? '2px solid #0284c7' : '1px solid #cbd5e1',
                          backgroundColor: vehicleType === v ? '#e0f2fe' : '#ffffff',
                          fontWeight: 700,
                          fontSize: '12px',
                          color: vehicleType === v ? '#0369a1' : '#475569',
                          cursor: 'pointer'
                        }}
                      >
                        {v === 'BIKE' && '🛵 Bike'}
                        {v === 'AUTO' && '🛺 Auto'}
                        {v === 'CAR' && '🚗 Car'}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Estimated Distance (km):</label>
                      <input
                        type="range"
                        min="0.5"
                        max="25"
                        step="0.5"
                        value={distanceKm}
                        onChange={(e) => { setDistanceKm(parseFloat(e.target.value)); setManualPriceOverride(false); }}
                        style={{ width: '100%', accentColor: '#0284c7' }}
                      />
                    </div>
                    <div style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      fontWeight: 800,
                      color: '#0284c7',
                      fontSize: '14px'
                    }}>
                      {distanceKm} km
                    </div>
                  </div>
                </div>
              )}

              {serviceCategory === 'CUSTOM_WORK' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '10px' }}>
                    {[
                      { key: 'direct_pickup', label: '📦 Parcel Pick & Drop' },
                      { key: 'micro_errand', label: '⚡ Micro Errand (0-2km)' },
                      { key: 'prepaid_pickup', label: '🏷️ Prepaid Pickup' },
                      { key: 'buy_and_bring', label: '🛍️ Buy & Bring' },
                      { key: 'queue_paperwork', label: '📑 Govt / Queue Work' },
                      { key: 'multi_stop', label: '🔄 Multi-Stop Task' },
                    ].map(t => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => { setCustomTaskType(t.key); setManualPriceOverride(false); }}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '8px',
                          border: customTaskType === t.key ? '2px solid #0284c7' : '1px solid #cbd5e1',
                          backgroundColor: customTaskType === t.key ? '#e0f2fe' : '#ffffff',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: customTaskType === t.key ? '#0369a1' : '#475569',
                          cursor: 'pointer'
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Route Distance: {distanceKm} km</label>
                      <input
                        type="range"
                        min="0.5"
                        max="20"
                        step="0.5"
                        value={distanceKm}
                        onChange={(e) => { setDistanceKm(parseFloat(e.target.value)); setManualPriceOverride(false); }}
                        style={{ width: '100%', accentColor: '#0284c7' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Extra Stops (+₹30/stop):</label>
                      <select
                        value={extraStops}
                        onChange={(e) => { setExtraStops(parseInt(e.target.value)); setManualPriceOverride(false); }}
                        style={{ padding: '5px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 700 }}
                      >
                        <option value="0">0 Extra Stops</option>
                        <option value="1">1 Extra Stop (+₹30)</option>
                        <option value="2">2 Extra Stops (+₹60)</option>
                        <option value="3">3 Extra Stops (+₹90)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {serviceCategory === 'SHOPPING' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Store Category:</label>
                      <select
                        value={shoppingService}
                        onChange={(e) => setShoppingService(e.target.value)}
                        style={{ width: '100%', padding: '7px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 700 }}
                      >
                        <option value="Groceries">🛒 Groceries</option>
                        <option value="Vegetables & Fruits">🥦 Veggies & Fruits</option>
                        <option value="Medicines">💊 Pharmacy / Medicines</option>
                        <option value="Food Service">🍔 Restaurant Food</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Store Bill Amount (₹):</label>
                      <input
                        type="number"
                        placeholder="Estimated Bill (₹)"
                        value={storeBillAmount || ''}
                        onChange={(e) => { setStoreBillAmount(parseFloat(e.target.value) || 0); setManualPriceOverride(false); }}
                        style={{ width: '100%', padding: '7px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 700 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Distance: {distanceKm} km</label>
                      <input
                        type="range"
                        min="0.5"
                        max="15"
                        step="0.5"
                        value={distanceKm}
                        onChange={(e) => { setDistanceKm(parseFloat(e.target.value)); setManualPriceOverride(false); }}
                        style={{ width: '100%', accentColor: '#0284c7', marginTop: '6px' }}
                      />
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    * Store receipt bill is payable on delivery. Delivery charge is ₹30 for 0-2km + ₹10/km after.
                  </div>
                </div>
              )}

              {serviceCategory === 'HOME_SERVICES' && (
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px', display: 'block' }}>
                    Select Catalog Service:
                  </label>
                  <select
                    value={selectedHsService}
                    onChange={(e) => handleHsSelect(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #0284c7',
                      fontSize: '13px',
                      fontWeight: 700,
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <option value="">-- Choose Home Service --</option>
                    {hsServicesList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.title} — ₹{s.rate} ({s.duration || '1 hr'}) [Helper: ₹{s.helper_charge}]
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* 3. Locations */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                3. Pickup & Drop Locations
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <MapPin size={14} color="#0284c7" />
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Pickup Point / Store</span>
                  </div>
                  <input
                    type="text"
                    required={serviceCategory !== 'HOME_SERVICES'}
                    placeholder="e.g. Bus Stand / Shop Name / Landmark"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <Navigation size={14} color="#10b981" />
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Drop Point / Customer Address</span>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. House No, Colony, Bhongir"
                    value={dropLocation}
                    onChange={(e) => setDropLocation(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 4. Live Fare Breakdown & Margin Box */}
            <div style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              border: '1.5px solid #cbd5e1',
              borderRadius: '14px',
              padding: '14px 18px',
              marginBottom: '18px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155', textTransform: 'uppercase' }}>
                  Live Quote Breakdown
                </span>
                <button
                  type="button"
                  onClick={() => setManualPriceOverride(!manualPriceOverride)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: manualPriceOverride ? '#e11d48' : '#0284c7',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  {manualPriceOverride ? 'Reset to Auto-Formula' : 'Custom Override Price'}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', textAlign: 'center' }}>
                <div style={{ background: '#ffffff', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Customer Fare</div>
                  {manualPriceOverride ? (
                    <input
                      type="number"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
                      style={{ width: '80px', textAlign: 'center', fontWeight: 800, fontSize: '18px', color: '#0284c7', border: '1px solid #93c5fd', borderRadius: '6px' }}
                    />
                  ) : (
                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#0284c7' }}>₹{totalAmount}</div>
                  )}
                </div>

                <div style={{ background: '#ffffff', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Helper Payout</div>
                  {manualPriceOverride ? (
                    <input
                      type="number"
                      value={helperCharge}
                      onChange={(e) => setHelperCharge(parseFloat(e.target.value) || 0)}
                      style={{ width: '80px', textAlign: 'center', fontWeight: 800, fontSize: '18px', color: '#10b981', border: '1px solid #86efac', borderRadius: '6px' }}
                    />
                  ) : (
                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#10b981' }}>₹{helperCharge}</div>
                  )}
                </div>

                <div style={{ background: '#ffffff', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Platform Margin</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#f59e0b' }}>₹{platformFee}</div>
                </div>

                <div style={{ background: '#ffffff', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Store Bill</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#64748b' }}>₹{storeBillAmount}</div>
                </div>
              </div>
            </div>

            {/* 5. Payment & Assignment */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Payment Method
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      border: paymentMethod === 'CASH' ? '2px solid #10b981' : '1px solid #cbd5e1',
                      backgroundColor: paymentMethod === 'CASH' ? '#ecfdf5' : '#ffffff',
                      fontWeight: 700,
                      fontSize: '12px',
                      color: paymentMethod === 'CASH' ? '#047857' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    💵 Cash (Helper Collects)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('UPI')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      border: paymentMethod === 'UPI' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                      backgroundColor: paymentMethod === 'UPI' ? '#f0f9ff' : '#ffffff',
                      fontWeight: 700,
                      fontSize: '12px',
                      color: paymentMethod === 'UPI' ? '#0369a1' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    💳 UPI Link (WhatsApp)
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Assign Helper Directly
                </label>
                <select
                  value={assignedHelperId}
                  onChange={(e) => setAssignedHelperId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '12px',
                    fontWeight: 600,
                    backgroundColor: '#ffffff'
                  }}
                >
                  <option value="">⚡ Auto-Broadcast (First Come First Serve)</option>
                  {helpersList.map(h => (
                    <option key={h.id} value={h.id}>
                      {h.name} — ({h.device_type === 'KEYPAD' ? '📞 Keypad' : '📱 Smartphone'}) [{h.status}]
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: '20px' }}>
              <input
                type="text"
                placeholder="Additional instructions / caller notes (e.g. Call before coming, parcel package is heavy)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  color: '#334155',
                  outline: 'none'
                }}
              />
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={onClose}
                disabled={loading}
                style={{ padding: '9px 18px', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  padding: '9px 24px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#0284c7'
                }}
              >
                {loading ? 'Booking Order...' : (
                  <>
                    <PhoneCall size={16} /> Confirm & Book Call Order (₹{totalAmount})
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
