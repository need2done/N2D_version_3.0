import React, { useState, useEffect } from 'react';
import { 
  Calculator, PhoneCall, Bike, Car, Truck, Sparkles, ShoppingBag, 
  Wrench, ShieldCheck, IndianRupee, ArrowRight, Zap, Info, 
  CheckCircle2, Clock, MapPin, Navigation, Percent, HelpCircle
} from 'lucide-react';
import CallOrderModal from '../components/CallOrderModal';
import { API_URL } from '../config';

export default function FareCalculatorPage() {
  const [activeTab, setActiveTab] = useState('RIDE'); // 'RIDE', 'CUSTOM_WORK', 'SHOPPING', 'HOME_SERVICES'
  
  // Call Order Modal State
  const [showCallModal, setShowCallModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);

  // ----------------------------------------------------
  // 1. RIDE ENGINE STATE
  // ----------------------------------------------------
  const [rideVehicle, setRideVehicle] = useState('BIKE'); // 'BIKE', 'AUTO', 'CAR'
  const [rideDistance, setRideDistance] = useState(4.5);
  const [isNightFare, setIsNightFare] = useState(false);
  const [isLongPickup, setIsLongPickup] = useState(false);
  const [ridePickupText, setRidePickupText] = useState('RTC Bus Stand, Bhongir');
  const [rideDropText, setRideDropText] = useState('Rayagiri, Bhongir');

  // ----------------------------------------------------
  // 2. CUSTOM WORK ENGINE STATE
  // ----------------------------------------------------
  const [cwTaskType, setCwTaskType] = useState('direct_pickup');
  const [cwDistance, setCwDistance] = useState(2.8);
  const [cwExtraStops, setCwExtraStops] = useState(0);
  const [cwHasAccess, setCwHasAccess] = useState(false);
  const [cwShoppingEffort, setCwShoppingEffort] = useState(false);
  const [cwExtraTimeBlocks, setCwExtraTimeBlocks] = useState(0); // 15 mins block
  const [cwPickupText, setCwPickupText] = useState('Clock Tower, Bhongir');
  const [cwDropText, setCwDropText] = useState('Teachers Colony, Bhongir');

  // ----------------------------------------------------
  // 3. SHOPPING & DELIVERY STATE
  // ----------------------------------------------------
  const [shopCategory, setShopCategory] = useState('Groceries');
  const [shopBillAmount, setShopBillAmount] = useState(250);
  const [shopDistance, setShopDistance] = useState(2.0);
  const [shopStoreText, setShopStoreText] = useState('Local Supermarket');
  const [shopCustomerText, setShopCustomerText] = useState('Customer Home');

  // ----------------------------------------------------
  // 4. HOME SERVICES STATE
  // ----------------------------------------------------
  const [hsServices, setHsServices] = useState([]);
  const [selectedHsCategory, setSelectedHsCategory] = useState('ALL');
  const [selectedHsServiceId, setSelectedHsServiceId] = useState(null);
  const [hsQuantity, setHsQuantity] = useState(1);
  const [loadingHs, setLoadingHs] = useState(true);

  useEffect(() => {
    fetchHsServices();
  }, []);

  const fetchHsServices = async () => {
    try {
      setLoadingHs(true);
      const res = await fetch(`${API_URL}/home-services/services`);
      const data = await res.json();
      if (data.success && data.services) {
        setHsServices(data.services);
        if (data.services.length > 0) {
          setSelectedHsServiceId(data.services[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load HS services in calculator:', e);
    } finally {
      setLoadingHs(false);
    }
  };

  // ----------------------------------------------------
  // CALCULATIONS: RIDE
  // ----------------------------------------------------
  const calculateRide = () => {
    const dist = Math.max(1.0, parseFloat(rideDistance) || 1.0);
    let base = 11;
    let tier1Rate = 8.2;
    let tier2Rate = 11.3;
    let tier1Limit = 8;
    const platformFee = 5;

    if (rideVehicle === 'AUTO') {
      base = 30;
      tier1Rate = 15;
      tier2Rate = 18;
      tier1Limit = 5;
    } else if (rideVehicle === 'CAR') {
      base = 50;
      tier1Rate = 20;
      tier2Rate = 25;
      tier1Limit = 5;
    }

    let distCharge = 0;
    let t1Dist = 0;
    let t2Dist = 0;

    if (dist <= tier1Limit) {
      t1Dist = dist;
      distCharge = dist * tier1Rate;
    } else {
      t1Dist = tier1Limit;
      t2Dist = dist - tier1Limit;
      distCharge = (t1Dist * tier1Rate) + (t2Dist * tier2Rate);
    }

    let subtotal = base + distCharge;
    if (isLongPickup) subtotal += 15; // +₹15 long pickup fee
    if (isNightFare) subtotal = subtotal * 1.25; // 25% night surge

    const finalSubtotal = Math.round(subtotal);
    const totalFare = finalSubtotal + platformFee;
    const helperPayout = Math.round(finalSubtotal * 0.85);
    const platformMargin = totalFare - helperPayout;

    return {
      dist,
      base,
      tier1Rate,
      tier2Rate,
      tier1Limit,
      t1Dist,
      t2Dist,
      distCharge: Math.round(distCharge),
      nightExtra: isNightFare ? Math.round(subtotal - (base + distCharge)) : 0,
      longPickupExtra: isLongPickup ? 15 : 0,
      platformFee,
      totalFare,
      helperPayout,
      platformMargin
    };
  };

  // ----------------------------------------------------
  // CALCULATIONS: CUSTOM WORK
  // ----------------------------------------------------
  const calculateCustomWork = () => {
    const dist = parseFloat(cwDistance) || 0;
    let baseFare = 59;
    let helperBase = 40;
    let extraKmCharge = 0;
    let extraKmHelper = 0;

    if (cwTaskType === 'micro_errand') {
      baseFare = 39; helperBase = 25;
    } else if (cwTaskType === 'prepaid_pickup') {
      baseFare = 49; helperBase = 35;
    } else if (cwTaskType === 'direct_pickup') {
      if (dist <= 2.0) {
        baseFare = 39; helperBase = 25;
      } else if (dist <= 3.5) {
        baseFare = 79; helperBase = 55;
      } else if (dist <= 5.0) {
        baseFare = 99; helperBase = 68;
      } else {
        baseFare = 99;
        helperBase = 68;
        const extraKm = dist - 5.0;
        extraKmCharge = Math.round(extraKm * 8);
        extraKmHelper = Math.round(extraKm * 5);
      }
    } else if (cwTaskType === 'buy_and_bring') {
      baseFare = 79; helperBase = 55;
      if (dist > 3.5) {
        extraKmCharge = 20; extraKmHelper = 15;
      }
    } else if (cwTaskType === 'queue_paperwork') {
      baseFare = 89; helperBase = 60;
    } else if (cwTaskType === 'multi_stop') {
      baseFare = 119; helperBase = 85;
    } else if (cwTaskType === 'cargo_auto') {
      baseFare = 149; helperBase = 110;
    } else {
      baseFare = 99; helperBase = 75;
    }

    let addOnsFare = 0;
    let addOnsHelper = 0;

    if (cwExtraStops > 0) {
      addOnsFare += (cwExtraStops * 30);
      addOnsHelper += (cwExtraStops * 20);
    }
    if (cwHasAccess) {
      addOnsFare += 20;
      addOnsHelper += 10;
    }
    if (cwShoppingEffort) {
      addOnsFare += 45;
      addOnsHelper += 15;
    }
    if (cwExtraTimeBlocks > 0) {
      addOnsFare += (cwExtraTimeBlocks * 30);
      addOnsHelper += (cwExtraTimeBlocks * 20);
    }

    const totalFare = baseFare + extraKmCharge + addOnsFare;
    const helperPayout = helperBase + extraKmHelper + addOnsHelper;
    const platformMargin = totalFare - helperPayout;

    return {
      dist,
      baseFare,
      extraKmCharge,
      addOnsFare,
      totalFare,
      helperPayout,
      platformMargin
    };
  };

  // ----------------------------------------------------
  // CALCULATIONS: SHOPPING
  // ----------------------------------------------------
  const calculateShopping = () => {
    const dist = parseFloat(shopDistance) || 1.5;
    const bill = parseFloat(shopBillAmount) || 0;
    let deliveryFee = 30;
    if (dist > 2.0) {
      deliveryFee += Math.round((dist - 2.0) * 10);
    }
    const platformFee = 5;
    const helperPayout = deliveryFee - platformFee;
    const totalPayable = bill + deliveryFee;

    return {
      dist,
      bill,
      deliveryFee,
      platformFee,
      helperPayout,
      totalPayable
    };
  };

  // ----------------------------------------------------
  // CALCULATIONS: HOME SERVICES
  // ----------------------------------------------------
  const calculateHomeService = () => {
    const s = hsServices.find(x => x.id === selectedHsServiceId) || (hsServices[0] || {});
    const qty = Math.max(1, parseInt(hsQuantity) || 1);
    const ratePerUnit = parseFloat(s.rate) || 199;
    const helperPerUnit = parseFloat(s.helper_charge) || 170;
    const platformPerUnit = parseFloat(s.platform_fee) || 29;

    const totalFare = ratePerUnit * qty;
    const helperPayout = helperPerUnit * qty;
    const platformMargin = platformPerUnit * qty;

    return {
      service: s,
      qty,
      ratePerUnit,
      totalFare,
      helperPayout,
      platformMargin,
      duration: s.duration || '1 Hour'
    };
  };

  const rideCalc = calculateRide();
  const cwCalc = calculateCustomWork();
  const shopCalc = calculateShopping();
  const hsCalc = calculateHomeService();

  // Launch Call Order Modal with preloaded quote
  const launchCallOrderWithQuote = (quoteObj) => {
    setSelectedQuote(quoteObj);
    setShowCallModal(true);
  };

  return (
    <div style={{ padding: '0 0 40px 0' }}>
      {/* Top Banner Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '20px',
        padding: '24px 28px',
        color: '#ffffff',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            backgroundColor: 'rgba(2, 132, 199, 0.25)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            borderRadius: '16px',
            padding: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Calculator size={32} color="#38bdf8" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 900, letterSpacing: '-0.02em', color: '#ffffff' }}>
                Quick Fare Calculator & Call Order
              </h2>
              <span style={{
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid #10b981',
                color: '#34d399',
                fontSize: '11px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                LIVE ENGINE v3.0
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8', maxWidth: '640px' }}>
              Instant rate cards and price simulation across all 4 N2D engines. Calculate exact customer fare, helper payout, and commission during incoming customer calls.
            </p>
          </div>
        </div>

        <button
          onClick={() => launchCallOrderWithQuote(null)}
          style={{
            backgroundColor: '#0284c7',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 20px',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
            transition: 'all 0.2s'
          }}
        >
          <PhoneCall size={18} /> New Call Order
        </button>
      </div>

      {/* Tabs Switcher Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '24px'
      }}>
        {[
          { key: 'RIDE', label: 'Taxi & Rides', icon: Bike, desc: 'Bike, Auto & Car Fares' },
          { key: 'CUSTOM_WORK', label: 'Custom Work & Errands', icon: Sparkles, desc: 'Parcel & Task Slabs' },
          { key: 'SHOPPING', label: 'Shopping & Delivery', icon: ShoppingBag, desc: 'Groceries, Veg & Meds' },
          { key: 'HOME_SERVICES', label: 'Home Services', icon: Wrench, desc: 'Electrician & Repairs' },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                backgroundColor: isActive ? '#ffffff' : '#f8fafc',
                border: isActive ? '2px solid #0284c7' : '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '16px',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: isActive ? '0 10px 20px -5px rgba(2, 132, 199, 0.15)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <div style={{
                  backgroundColor: isActive ? '#e0f2fe' : '#f1f5f9',
                  borderRadius: '10px',
                  padding: '8px',
                  color: isActive ? '#0284c7' : '#64748b'
                }}>
                  <Icon size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: isActive ? '#0284c7' : '#1e293b' }}>
                    {tab.label}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {tab.desc}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tab 1: RIDE ESTIMATOR */}
      {activeTab === 'RIDE' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          {/* Controls Card */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              🚕 Ride Parameter Simulator
            </h3>

            {/* Vehicle Selector */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                Vehicle Type
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {[
                  { key: 'BIKE', label: '🛵 Bike', base: '₹11 Base', rate: '₹8.2/km (up to 8km)' },
                  { key: 'AUTO', label: '🛺 Auto', base: '₹30 Base', rate: '₹15/km (up to 5km)' },
                  { key: 'CAR', label: '🚗 Car', base: '₹50 Base', rate: '₹20/km' }
                ].map(v => (
                  <button
                    key={v.key}
                    onClick={() => setRideVehicle(v.key)}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '12px',
                      border: rideVehicle === v.key ? '2px solid #0284c7' : '1px solid #cbd5e1',
                      backgroundColor: rideVehicle === v.key ? '#f0f9ff' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: 800, color: rideVehicle === v.key ? '#0369a1' : '#1e293b' }}>
                      {v.label}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7', marginTop: '2px' }}>
                      {v.base}
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>
                      {v.rate}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Distance Slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  Trip Distance (km)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="50"
                    value={rideDistance}
                    onChange={(e) => setRideDistance(parseFloat(e.target.value) || 1)}
                    style={{
                      width: '70px',
                      padding: '4px 8px',
                      textAlign: 'center',
                      fontWeight: 800,
                      fontSize: '15px',
                      borderRadius: '8px',
                      border: '1.5px solid #0284c7',
                      color: '#0284c7'
                    }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>km</span>
                </div>
              </div>
              <input
                type="range"
                min="0.5"
                max="30"
                step="0.5"
                value={rideDistance}
                onChange={(e) => setRideDistance(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#0284c7' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                <span>0.5 km (Local)</span>
                <span>5 km (Town)</span>
                <span>15 km (Outstation/Cross)</span>
                <span>30 km</span>
              </div>
            </div>

            {/* Toggles */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px',
                borderRadius: '12px',
                border: isNightFare ? '1.5px solid #7c3aed' : '1px solid #e2e8f0',
                backgroundColor: isNightFare ? '#f5f3ff' : '#ffffff',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={isNightFare}
                  onChange={(e) => setIsNightFare(e.target.checked)}
                  style={{ accentColor: '#7c3aed' }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: isNightFare ? '#6d28d9' : '#334155' }}>
                    🌙 Night Fare (1.25x)
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>
                    Active 11:00 PM - 6:00 AM
                  </div>
                </div>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px',
                borderRadius: '12px',
                border: isLongPickup ? '1.5px solid #ea580c' : '1px solid #e2e8f0',
                backgroundColor: isLongPickup ? '#fff7ed' : '#ffffff',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={isLongPickup}
                  onChange={(e) => setIsLongPickup(e.target.checked)}
                  style={{ accentColor: '#ea580c' }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: isLongPickup ? '#c2410c' : '#334155' }}>
                    📍 Long Pickup (+₹15)
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>
                    Helper &gt; 3 km away from pickup
                  </div>
                </div>
              </label>
            </div>

            {/* Locations for instant quote transfer */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
                Default Route Text for Order Booking:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Pickup Location"
                  value={ridePickupText}
                  onChange={(e) => setRidePickupText(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
                <input
                  type="text"
                  placeholder="Drop Location"
                  value={rideDropText}
                  onChange={(e) => setRideDropText(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>
            </div>
          </div>

          {/* Breakdown & Margin Card */}
          <div className="card" style={{ padding: '24px', backgroundColor: '#f8fafc', border: '1.5px solid #cbd5e1' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              💰 Fare Breakdown & Economics
            </h3>

            {/* Big Price Display */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '20px',
              border: '1.5px solid #0284c7',
              textAlign: 'center',
              marginBottom: '20px',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Customer Fare
              </div>
              <div style={{ fontSize: '38px', fontWeight: 900, color: '#0284c7', margin: '4px 0' }}>
                ₹{rideCalc.totalFare}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                for {rideCalc.dist} km via {rideVehicle}
              </div>
            </div>

            {/* Breakdown List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Base Fare:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{rideCalc.base}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Distance Charge ({rideCalc.dist} km):</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{rideCalc.distCharge}</span>
              </div>
              {rideCalc.nightExtra > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#7c3aed' }}>
                  <span>Night Multiplier Surcharge (1.25x):</span>
                  <span style={{ fontWeight: 700 }}>+₹{rideCalc.nightExtra}</span>
                </div>
              )}
              {rideCalc.longPickupExtra > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ea580c' }}>
                  <span>Long Pickup Allowance:</span>
                  <span style={{ fontWeight: 700 }}>+₹{rideCalc.longPickupExtra}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Platform Convenience Fee:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>+₹{rideCalc.platformFee}</span>
              </div>
            </div>

            {/* Split Metrics */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              padding: '14px',
              borderRadius: '12px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              marginBottom: '20px'
            }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
                  Helper Payout (85%)
                </div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#059669' }}>
                  ₹{rideCalc.helperPayout}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>Direct to Driver</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>
                  Platform Revenue (15%)
                </div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#d97706' }}>
                  ₹{rideCalc.platformMargin}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>Need2Done Margin</div>
              </div>
            </div>

            {/* Button */}
            <button
              onClick={() => launchCallOrderWithQuote({
                serviceCategory: 'RIDE',
                engineType: 'RIDE',
                vehicleType: rideVehicle,
                serviceTitle: `${rideVehicle} Ride (${rideCalc.dist} km)`,
                distanceKm: rideCalc.dist,
                pickupLocation: ridePickupText,
                dropLocation: rideDropText,
                totalAmount: rideCalc.totalFare,
                helperCharge: rideCalc.helperPayout,
                platformFee: rideCalc.platformMargin
              })}
              style={{
                width: '100%',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '14px',
                fontWeight: 800,
                fontSize: '15px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
              }}
            >
              <PhoneCall size={18} /> Create Call Order with this Quote
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: CUSTOM WORK / ERRANDS ESTIMATOR */}
      {activeTab === 'CUSTOM_WORK' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          {/* Controls Card */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              👷 Custom Work & Errand Slabs
            </h3>

            {/* Task Type Grid */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                Task Category (Pilot Rate Card)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {[
                  { key: 'direct_pickup', title: '📦 Direct Parcel Pick & Drop', fare: '0-2km: ₹39, 2-3.5: ₹79, 3.5-5: ₹99' },
                  { key: 'micro_errand', title: '⚡ Hyperlocal Micro Errand', fare: 'Flat ₹39 (0-2 km, 1-2 items)' },
                  { key: 'prepaid_pickup', title: '🏷️ Prepaid Package Pickup', fare: 'Flat ₹49 (Pre-paid pickup)' },
                  { key: 'buy_and_bring', title: '🛍️ Buy & Bring / Store Run', fare: 'Base ₹79 (Helper buys & brings)' },
                  { key: 'queue_paperwork', title: '📑 Queueing & Govt Paperwork', fare: 'Base ₹89 (Waiting & physical submission)' },
                  { key: 'multi_stop', title: '🔄 Multi-Stop Town Run', fare: 'Base ₹119 (Multiple pickups/deliveries)' },
                  { key: 'cargo_auto', title: '🛺 Heavy Cargo Auto Task', fare: 'Base ₹149 (Heavy appliances / bulky bags)' },
                  { key: 'repair_breakdown', title: '🔧 Unique / Breakdown Assist', fare: 'Base ₹99 (Bike puncture / breakdown)' },
                ].map(item => (
                  <button
                    key={item.key}
                    onClick={() => setCwTaskType(item.key)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: cwTaskType === item.key ? '2px solid #0284c7' : '1px solid #cbd5e1',
                      backgroundColor: cwTaskType === item.key ? '#f0f9ff' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 800, color: cwTaskType === item.key ? '#0369a1' : '#1e293b' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      {item.fare}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Distance Slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  Route Distance (km)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="25"
                    value={cwDistance}
                    onChange={(e) => setCwDistance(parseFloat(e.target.value) || 1)}
                    style={{
                      width: '70px',
                      padding: '4px 8px',
                      textAlign: 'center',
                      fontWeight: 800,
                      fontSize: '15px',
                      borderRadius: '8px',
                      border: '1.5px solid #0284c7',
                      color: '#0284c7'
                    }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>km</span>
                </div>
              </div>
              <input
                type="range"
                min="0.5"
                max="20"
                step="0.5"
                value={cwDistance}
                onChange={(e) => setCwDistance(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#0284c7' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                <span>0-2 km (₹39)</span>
                <span>2.1-3.5 km (₹79)</span>
                <span>3.6-5.0 km (₹99)</span>
                <span>&gt;5 km (+₹8/km)</span>
              </div>
            </div>

            {/* Effort Add-ons */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                Effort & Complexity Add-ons
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                    Extra Stops (+₹30/stop):
                  </label>
                  <select
                    value={cwExtraStops}
                    onChange={(e) => setCwExtraStops(parseInt(e.target.value))}
                    style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700 }}
                  >
                    <option value="0">0 Extra Stops</option>
                    <option value="1">+1 Stop (+₹30)</option>
                    <option value="2">+2 Stops (+₹60)</option>
                    <option value="3">+3 Stops (+₹90)</option>
                  </select>
                </div>

                <div style={{ padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                    Waiting Blocks (+₹30/15m):
                  </label>
                  <select
                    value={cwExtraTimeBlocks}
                    onChange={(e) => setCwExtraTimeBlocks(parseInt(e.target.value))}
                    style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700 }}
                  >
                    <option value="0">Standard Duration</option>
                    <option value="1">+15 Mins Wait (+₹30)</option>
                    <option value="2">+30 Mins Wait (+₹60)</option>
                    <option value="3">+45 Mins Wait (+₹90)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={cwHasAccess}
                    onChange={(e) => setCwHasAccess(e.target.checked)}
                    style={{ accentColor: '#0284c7' }}
                  />
                  Access / Security Gate (+₹20)
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={cwShoppingEffort}
                    onChange={(e) => setCwShoppingEffort(e.target.checked)}
                    style={{ accentColor: '#0284c7' }}
                  />
                  Store Picking Effort (+₹45)
                </label>
              </div>
            </div>

            {/* Route text */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Task Pickup Point"
                  value={cwPickupText}
                  onChange={(e) => setCwPickupText(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
                <input
                  type="text"
                  placeholder="Task Drop Point"
                  value={cwDropText}
                  onChange={(e) => setCwDropText(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>
            </div>
          </div>

          {/* Economics Card */}
          <div className="card" style={{ padding: '24px', backgroundColor: '#f8fafc', border: '1.5px solid #cbd5e1' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              💰 Custom Work Fare Breakdown
            </h3>

            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '20px',
              border: '1.5px solid #0284c7',
              textAlign: 'center',
              marginBottom: '20px',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Customer Service Fee
              </div>
              <div style={{ fontSize: '38px', fontWeight: 900, color: '#0284c7', margin: '4px 0' }}>
                ₹{cwCalc.totalFare}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Category: {cwTaskType.replace(/_/g, ' ').toUpperCase()} ({cwCalc.dist} km)
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Base Slab Charge:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{cwCalc.baseFare}</span>
              </div>
              {cwCalc.extraKmCharge > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                  <span>Extended Distance Charge:</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>+₹{cwCalc.extraKmCharge}</span>
                </div>
              )}
              {cwCalc.addOnsFare > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0284c7' }}>
                  <span>Complexity & Stops Add-ons:</span>
                  <span style={{ fontWeight: 700 }}>+₹{cwCalc.addOnsFare}</span>
                </div>
              )}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              padding: '14px',
              borderRadius: '12px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              marginBottom: '20px'
            }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
                  Helper Payout
                </div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#059669' }}>
                  ₹{cwCalc.helperPayout}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>Task Runner Share</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>
                  Platform Net Margin
                </div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#d97706' }}>
                  ₹{cwCalc.platformMargin}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>Need2Done Share</div>
              </div>
            </div>

            <button
              onClick={() => launchCallOrderWithQuote({
                serviceCategory: 'CUSTOM_WORK',
                engineType: 'TASK',
                customTaskType: cwTaskType,
                serviceTitle: `AnyWork: ${cwTaskType.replace(/_/g, ' ').toUpperCase()} (${cwCalc.dist} km)`,
                distanceKm: cwCalc.dist,
                pickupLocation: cwPickupText,
                dropLocation: cwDropText,
                totalAmount: cwCalc.totalFare,
                helperCharge: cwCalc.helperPayout,
                platformFee: cwCalc.platformMargin
              })}
              style={{
                width: '100%',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '14px',
                fontWeight: 800,
                fontSize: '15px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
              }}
            >
              <PhoneCall size={18} /> Create Call Order with this Quote
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: SHOPPING & DELIVERY ESTIMATOR */}
      {activeTab === 'SHOPPING' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              🛒 Store Shopping & Delivery Calculator
            </h3>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                Service Category
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {['Groceries', 'Vegetables & Fruits', 'Medicines', 'Food Service'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setShopCategory(cat)}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '10px',
                      border: shopCategory === cat ? '2px solid #0284c7' : '1px solid #cbd5e1',
                      backgroundColor: shopCategory === cat ? '#f0f9ff' : '#ffffff',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: shopCategory === cat ? '#0369a1' : '#334155',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                Estimated Store Bill Amount (₹)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#64748b' }}>₹</span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={shopBillAmount}
                    onChange={(e) => setShopBillAmount(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 32px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '16px',
                      fontWeight: 800,
                      color: '#0f172a'
                    }}
                  />
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  (Customer pays store receipt on delivery)
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  Delivery Distance: {shopDistance} km
                </label>
              </div>
              <input
                type="range"
                min="0.5"
                max="15"
                step="0.5"
                value={shopDistance}
                onChange={(e) => setShopDistance(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#0284c7' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                <span>0-2 km (₹30 Flat Delivery)</span>
                <span>&gt;2 km (+₹10/km)</span>
                <span>15 km</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Store / Market Name"
                  value={shopStoreText}
                  onChange={(e) => setShopStoreText(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
                <input
                  type="text"
                  placeholder="Delivery Address"
                  value={shopCustomerText}
                  onChange={(e) => setShopCustomerText(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '24px', backgroundColor: '#f8fafc', border: '1.5px solid #cbd5e1' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              💰 Delivery & Bill Breakdown
            </h3>

            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '20px',
              border: '1.5px solid #0284c7',
              textAlign: 'center',
              marginBottom: '20px',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Amount Payable by Customer
              </div>
              <div style={{ fontSize: '38px', fontWeight: 900, color: '#0284c7', margin: '4px 0' }}>
                ₹{shopCalc.totalPayable}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Store Bill (₹{shopCalc.bill}) + Delivery (₹{shopCalc.deliveryFee})
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Store Items Bill (Paid to Shop):</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{shopCalc.bill}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Delivery Charge ({shopCalc.dist} km):</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{shopCalc.deliveryFee}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Platform Commission:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{shopCalc.platformFee}</span>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              padding: '14px',
              borderRadius: '12px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              marginBottom: '20px'
            }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
                  Helper Delivery Payout
                </div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#059669' }}>
                  ₹{shopCalc.helperPayout}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>Direct Delivery Fee</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>
                  Platform Commission
                </div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#d97706' }}>
                  ₹{shopCalc.platformFee}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>Fixed Flat Share</div>
              </div>
            </div>

            <button
              onClick={() => launchCallOrderWithQuote({
                serviceCategory: 'SHOPPING',
                engineType: 'TASK',
                serviceTitle: `${shopCategory} Delivery (${shopCalc.dist} km)`,
                distanceKm: shopCalc.dist,
                storeBillAmount: shopCalc.bill,
                pickupLocation: shopStoreText,
                dropLocation: shopCustomerText,
                totalAmount: shopCalc.totalPayable,
                helperCharge: shopCalc.helperPayout,
                platformFee: shopCalc.platformFee
              })}
              style={{
                width: '100%',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '14px',
                fontWeight: 800,
                fontSize: '15px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
              }}
            >
              <PhoneCall size={18} /> Create Call Order with this Quote
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: HOME SERVICES RATE CARD */}
      {activeTab === 'HOME_SERVICES' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              🏠 Home Services Catalog Rate Card
            </h3>

            {/* Category filter */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {['ALL', 'Electrician', 'Plumber', 'AC & Appliance Repair', 'Cleaning & Pest Control'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedHsCategory(cat)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    border: selectedHsCategory === cat ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                    backgroundColor: selectedHsCategory === cat ? '#e0f2fe' : '#ffffff',
                    color: selectedHsCategory === cat ? '#0369a1' : '#475569',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Services List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
              {hsServices
                .filter(s => selectedHsCategory === 'ALL' || s.category_name === selectedHsCategory)
                .map(s => {
                  const isSelected = selectedHsServiceId === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedHsServiceId(s.id)}
                      style={{
                        padding: '14px',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                        backgroundColor: isSelected ? '#f0f9ff' : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: isSelected ? '#0369a1' : '#1e293b' }}>
                          {s.title}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          {s.description || 'Professional home repair / installation'}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '11px', color: '#0284c7', fontWeight: 600 }}>
                          <span>⏱️ {s.duration || '1 Hour'}</span>
                          <span>🔧 {s.category_name}</span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '18px', fontWeight: 900, color: '#0284c7' }}>
                          ₹{s.rate}
                        </div>
                        <div style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>
                          Helper: ₹{s.helper_charge}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Quantity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                Quantity / Number of Points:
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map(q => (
                  <button
                    key={q}
                    onClick={() => setHsQuantity(q)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '8px',
                      border: hsQuantity === q ? '2px solid #0284c7' : '1px solid #cbd5e1',
                      backgroundColor: hsQuantity === q ? '#e0f2fe' : '#ffffff',
                      fontWeight: 800,
                      fontSize: '13px',
                      color: hsQuantity === q ? '#0369a1' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Breakdown Card */}
          <div className="card" style={{ padding: '24px', backgroundColor: '#f8fafc', border: '1.5px solid #cbd5e1' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              💰 Booking Quote & Payout
            </h3>

            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '20px',
              border: '1.5px solid #0284c7',
              textAlign: 'center',
              marginBottom: '20px',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Fixed Service Charge
              </div>
              <div style={{ fontSize: '38px', fontWeight: 900, color: '#0284c7', margin: '4px 0' }}>
                ₹{hsCalc.totalFare}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                {hsCalc.service.title || 'Selected Service'} ({hsCalc.qty}x)
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Unit Price (Base Rate):</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{hsCalc.ratePerUnit}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Quantity / Point Multiplier:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{hsCalc.qty}x</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Expected Job Duration:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{hsCalc.duration}</span>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              padding: '14px',
              borderRadius: '12px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              marginBottom: '20px'
            }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
                  Helper Payout
                </div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#059669' }}>
                  ₹{hsCalc.helperPayout}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>Handed to Technician</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>
                  Platform Revenue
                </div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#d97706' }}>
                  ₹{hsCalc.platformMargin}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>Need2Done Margin</div>
              </div>
            </div>

            <button
              onClick={() => launchCallOrderWithQuote({
                serviceCategory: 'HOME_SERVICES',
                engineType: 'TASK',
                serviceTitle: `Home Service: ${hsCalc.service.title} (${hsCalc.qty}x)`,
                pickupLocation: 'Customer House / Premises',
                dropLocation: 'On-site Repair',
                totalAmount: hsCalc.totalFare,
                helperCharge: hsCalc.helperPayout,
                platformFee: hsCalc.platformMargin
              })}
              style={{
                width: '100%',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '14px',
                fontWeight: 800,
                fontSize: '15px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
              }}
            >
              <PhoneCall size={18} /> Book Call Order for this Service
            </button>
          </div>
        </div>
      )}

      {/* Floating or Embedded Call Order Modal */}
      <CallOrderModal
        isOpen={showCallModal}
        onClose={() => setShowCallModal(false)}
        initialQuote={selectedQuote}
        onOrderCreated={() => {
          // Success callback
        }}
      />
    </div>
  );
}
