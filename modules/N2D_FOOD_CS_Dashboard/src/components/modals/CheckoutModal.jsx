import { motion, AnimatePresence } from 'framer-motion';
import CloseIcon from '@mui/icons-material/Close';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SendIcon from '@mui/icons-material/Send';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import PaymentsIcon from '@mui/icons-material/Payments';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useCart } from '../../context/CartContext';
import { generateOrderId, buildWhatsAppURL } from '../../utils/whatsapp';
import { useState, useEffect, useRef } from 'react';

export default function CheckoutModal({ isOpen, onClose }) {
  const cart = useCart();
  const [orderId, setOrderId] = useState('');
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' or 'simulator'
  
  // Simulator State
  const [simStep, setSimStep] = useState(1); // 1: Welcome/Confirm, 2: Location, 3: Payment, 4: Success, 5: COD Error
  const [simMessages, setSimMessages] = useState([]);
  const [showRazorpay, setShowRazorpay] = useState(false);
  const [razorpayLoading, setRazorpayLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const oid = generateOrderId();
      setOrderId(oid);
      setActiveTab('summary');
      resetSimulator(oid);
    }
  }, [isOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [simMessages, simStep, showRazorpay]);

  const resetSimulator = (oid) => {
    setSimStep(1);
    setShowRazorpay(false);
    setRazorpayLoading(false);
    setSimMessages([
      {
        sender: 'bot',
        text: `🍽️ *Need2Done Food Order*\n━━━━━━━━━━━━━━━━━━━━\n📋 *Order ID:* ${oid}\n🏪 *Restaurant:* ${cart.restaurantName || 'N/A'}\n━━━━━━━━━━━━━━━━━━━━\n\n*Items Ordered:*\n${(cart.items || []).map((item, idx) => `${idx + 1}. ${item.name} x${item.quantity} = ₹${item.cartPrice * item.quantity}`).join('\n')}\n\n━━━━━━━━━━━━━━━━━━━━\n💰 *Subtotal:* ₹${cart.subtotal}\n🏷️ *Platform Fee:* ₹${cart.platformFee}\n📦 *Packaging:* ₹${cart.packagingFee}\n🚀 *Delivery:* ₹${cart.deliveryFee}\n━━━━━━━━━━━━━━━━━━━━\n✅ *Grand Total: ₹${cart.grandTotal}*\n━━━━━━━━━━━━━━━━━━━━\n\n*Do you want to confirm this order?*`,
        time: 'Just now'
      }
    ]);
  };

  const handleCompleteOrder = async () => {
    const searchParams = new URLSearchParams(window.location.search);
    let currentOrderId = searchParams.get('orderId');
    const customerId = searchParams.get('customerId');
    
    // If not accessed from WhatsApp flow, generate a draft order via API
    if (!currentOrderId) {
      try {
        const draftRes = await fetch('/api/carts/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerPhone: '9999999999', customerName: 'Guest User', serviceName: 'Food Service' })
        });
        if (draftRes.ok) {
           const data = await draftRes.json();
           currentOrderId = data.orderId;
        } else {
           alert("Failed to initialize order.");
           return;
        }
      } catch (err) {
        // Fallback if API fails (e.g. running standalone without backend)
        currentOrderId = orderId; 
      }
    }

    try {
      const itemsPayload = cart.items.map(item => ({
        id: item.id || 0,
        name: item.name,
        qty: item.quantity,
        price: item.cartPrice,
        unit: 'item'
      }));

      // Call backend API to save cart
      const response = await fetch(`/api/carts/${currentOrderId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          items: itemsPayload,
          restaurant: cart.restaurantName || ''
        })
      });

      if (!response.ok) {
        console.error('Failed to save cart to backend');
      }
    } catch (e) {
      console.error('Error saving cart:', e);
    }

    // Redirect to WhatsApp with the order ID to continue flow
    const message = `ORDER_${currentOrderId}`;
    const encoded = encodeURIComponent(message);
    window.location.href = `https://wa.me/15556349916?text=${encoded}`;
    
    cart.clearCart();
    onClose();
  };

  // Simulator Actions
  const handleSimConfirm = () => {
    setSimMessages(prev => [
      ...prev,
      { sender: 'user', text: 'Confirm Order ✅', time: 'Just now' },
      { sender: 'bot', text: 'Awesome! 📍 Please share your delivery location so we can calculate the exact ETA.', time: 'Just now' }
    ]);
    setSimStep(2);
  };

  const handleSimCancel = () => {
    setSimMessages(prev => [
      ...prev,
      { sender: 'user', text: 'Cancel Order ❌', time: 'Just now' },
      { sender: 'bot', text: 'Order cancelled. You can edit your cart back on the website. Thank you!', time: 'Just now' }
    ]);
    setSimStep(0); // terminated
  };

  const handleSimLocation = () => {
    setSimMessages(prev => [
      ...prev,
      { sender: 'user', text: '📍 Shared Location: Bhongir Fort Road, Bhongir', time: 'Just now' },
      { sender: 'bot', text: `Location saved! 🚀 Rider will be dispatched to *Bhongir Fort Road*.\n\n*Order Total:* ₹${cart.grandTotal}\n\n*Choose your payment method below:*`, time: 'Just now' }
    ]);
    setSimStep(3);
  };

  const handleSimPaymentMethod = (method) => {
    if (method === 'COD') {
      setSimMessages(prev => [
        ...prev,
        { sender: 'user', text: 'Cash on Delivery (COD) 💵', time: 'Just now' }
      ]);
      
      if (cart.grandTotal < 100) {
        // Enforce rule: COD allowed only when Order Total >= ₹100
        setSimMessages(prev => [
          ...prev,
          { sender: 'bot', text: `⚠️ *Cash on Delivery is unavailable.*\n\nCOD is only allowed for orders of *₹100 or above* (your order total is *₹${cart.grandTotal}*).\n\nPlease complete your payment online via Razorpay.`, time: 'Just now' }
        ]);
        setSimStep(5); // COD Error state
      } else {
        setSimMessages(prev => [
          ...prev,
          { sender: 'bot', text: `🎉 *Order Confirmed!*\n\nYour order *${orderId}* is placed successfully via *Cash on Delivery*.\n\nPlease keep ₹${cart.grandTotal} ready. Our rider is on their way! 🛵`, time: 'Just now' }
        ]);
        setSimStep(4); // Success state
      }
    } else if (method === 'Online') {
      setSimMessages(prev => [
        ...prev,
        { sender: 'user', text: 'Pay Online 💳', time: 'Just now' }
      ]);
      setShowRazorpay(true);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        return resolve(true);
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRazorpayPayment = async () => {
    setRazorpayLoading(true);
    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        alert('Razorpay SDK failed to load. Please check your internet connection.');
        setRazorpayLoading(false);
        return;
      }

      // Step 1: Create Razorpay Order on backend
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: cart.grandTotal,
          orderId: orderId,
          customerName: 'Customer',
          customerPhone: '9999999999'
        })
      });

      const orderData = await res.json();
      if (!res.ok || !orderData.success) {
        alert(orderData.error || 'Failed to create payment order.');
        setRazorpayLoading(false);
        return;
      }

      // Step 2: Configure Razorpay Checkout Options
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Need2Done',
        description: `Payment for Order #${orderId}`,
        order_id: orderData.razorpayOrderId,
        handler: async function (response) {
          try {
            // Step 3: Verify signature on backend
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderId: orderId
              })
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              setShowRazorpay(false);
              setSimMessages(prev => [
                ...prev,
                { sender: 'bot', text: `⚡ *Payment Successful!* (Payment ID: ${response.razorpay_payment_id})\n\n🎉 *Order Confirmed!*\n\nYour order *${orderId}* is successfully paid and is now being prepared! 🛵💨`, time: 'Just now' }
              ]);
              setSimStep(4);
            } else {
              alert('Payment signature verification failed: ' + (verifyData.error || 'Unknown error'));
            }
          } catch (err) {
            console.error('Payment verification error:', err);
            alert('An error occurred during payment verification.');
          } finally {
            setRazorpayLoading(false);
          }
        },
        prefill: {
          name: 'Guest User',
          contact: '9999999999'
        },
        theme: {
          color: '#FF6B00'
        },
        modal: {
          ondismiss: function () {
            setRazorpayLoading(false);
          }
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (err) {
      console.error('Razorpay Error:', err);
      alert('Could not initialize payment flow.');
      setRazorpayLoading(false);
    }
  };


  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative bg-white rounded-3xl w-full max-w-4xl h-[85vh] sm:h-[80vh] flex flex-col shadow-2xl z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-white">
            <div className="flex items-center gap-3">
              <h3 className="font-display font-black text-lg md:text-xl text-text-primary">Need2Done Checkout</h3>
              {/* Tab Switchers */}
              <div className="flex bg-gray-100 p-0.5 rounded-lg text-xs">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`px-3 py-1.5 rounded-md font-bold transition-all ${
                    activeTab === 'summary' ? 'bg-white text-brand-orange shadow-sm' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Direct Order
                </button>
                <button
                  onClick={() => setActiveTab('simulator')}
                  className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1 ${
                    activeTab === 'simulator' ? 'bg-white text-green-600 shadow-sm' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <WhatsAppIcon style={{ fontSize: 14 }} />
                  Simulate WhatsApp Bot
                </button>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <CloseIcon style={{ fontSize: 18 }} />
            </button>
          </div>

          {/* Body Section */}
          <div className="flex-1 flex overflow-hidden">
            {activeTab === 'summary' ? (
              /* TAB 1: Direct Order & Summary */
              <div className="w-full flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100 overflow-y-auto">
                {/* Left: Summary list */}
                <div className="flex-1 p-6 space-y-4">
                  <h4 className="font-display font-bold text-sm text-text-primary uppercase tracking-wider">Order Summary</h4>
                  <div className="bg-brand-orange-pale rounded-2xl p-4 border border-brand-orange/20 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">Your Order ID</span>
                    <p className="font-display font-black text-brand-orange text-xl tracking-wide mt-0.5">{orderId}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-text-secondary">Restaurant: <span className="text-text-primary font-black">{cart.restaurantName}</span></p>
                    <div className="border border-gray-100 rounded-2xl p-4 max-h-48 overflow-y-auto space-y-3 bg-gray-50/50">
                      {cart.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start text-xs">
                          <div className="min-w-0 pr-4">
                            <p className="font-semibold text-text-primary truncate">{item.name} x{item.quantity}</p>
                            {item.customizations && Object.keys(item.customizations).length > 0 && (
                              <p className="text-[10px] text-text-muted mt-0.5">
                                {Object.entries(item.customizations)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(', ')}
                              </p>
                            )}
                          </div>
                          <span className="font-bold text-text-primary flex-shrink-0">₹{item.cartPrice * item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Checkout details */}
                <div className="w-full md:w-[380px] p-6 flex flex-col justify-between bg-gray-50/30">
                  <div className="space-y-4">
                    <h4 className="font-display font-bold text-sm text-text-primary uppercase tracking-wider">Pricing Breakdown</h4>
                    
                    <div className="space-y-2.5 text-xs text-text-secondary">
                      <div className="flex justify-between">
                        <span>Items Subtotal</span>
                        <span className="font-semibold text-text-primary">₹{cart.subtotal}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Platform Fee</span>
                        <span className="font-semibold text-text-primary">₹{cart.platformFee}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Packaging Fee</span>
                        <span className="font-semibold text-text-primary">₹{cart.packagingFee}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Delivery Fee</span>
                        <span className="font-semibold text-text-primary">₹{cart.deliveryFee}</span>
                      </div>
                      <div className="border-t border-dashed border-gray-200 my-2 pt-2.5 flex justify-between text-sm font-bold text-text-primary">
                        <span>Grand Total</span>
                        <span className="text-brand-orange text-base font-black">₹{cart.grandTotal}</span>
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-xl p-3.5 flex gap-2.5 items-start">
                      <WhatsAppIcon className="text-green-600 flex-shrink-0" style={{ fontSize: 18 }} />
                      <div className="text-[11px] text-green-800 leading-relaxed">
                        <p className="font-bold mb-0.5">Direct WhatsApp Checkout</p>
                        <p>Clicking the button below will copy your order items and open WhatsApp. You will complete your order securely on our WhatsApp bot.</p>
                      </div>
                    </div>

                    <p className="text-[11px] text-text-muted text-center italic mt-2">
                      "You will complete your order securely on WhatsApp."
                    </p>
                  </div>

                  <div className="mt-6 space-y-2">
                    <button
                      onClick={handleCompleteOrder}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
                    >
                      <WhatsAppIcon />
                      <span>Send Order to WhatsApp</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('simulator')}
                      className="w-full text-center text-xs font-semibold text-brand-orange bg-brand-orange-pale py-2.5 rounded-xl hover:bg-brand-orange hover:text-white transition-colors"
                    >
                      Try Interactive Bot Simulator
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* TAB 2: WhatsApp Chat Simulator */
              <div className="w-full flex h-full relative overflow-hidden bg-slate-900 flex-col md:flex-row">
                {/* Simulated Phone Screen Left */}
                <div className="flex-1 flex flex-col h-full bg-[#E5DDD5] relative overflow-hidden">
                  
                  {/* Phone Header */}
                  <div className="bg-[#075E54] text-white px-4 py-3 flex items-center gap-3 shadow-md flex-shrink-0">
                    <button onClick={() => setActiveTab('summary')} className="text-white hover:opacity-85 sm:hidden">
                      <ArrowBackIcon style={{ fontSize: 18 }} />
                    </button>
                    <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#075E54] font-black text-sm shadow-sm select-none">
                      N2D
                    </div>
                    <div>
                      <p className="text-sm font-bold">Need2Done Food Bot</p>
                      <p className="text-[10px] text-white/80">Active Chatbot • online</p>
                    </div>
                  </div>

                  {/* Messages Scroll Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
                    {simMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`rounded-2xl px-4 py-2.5 max-w-[85%] text-xs shadow-sm whitespace-pre-line relative ${
                            msg.sender === 'user'
                              ? 'bg-[#DCF8C6] text-text-primary rounded-tr-none'
                              : 'bg-white text-text-primary rounded-tl-none'
                          }`}
                        >
                          {msg.text}
                          <span className="block text-[8px] text-text-muted text-right mt-1">{msg.time}</span>
                        </div>
                      </div>
                    ))}

                    <div ref={chatEndRef} />
                  </div>

                  {/* Interactive Input/Quick Replies Bar */}
                  <div className="bg-[#f0f0f0] p-4 border-t border-gray-200 flex-shrink-0">
                    <AnimatePresence mode="wait">
                      {simStep === 1 && (
                        <motion.div
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -20, opacity: 0 }}
                          className="flex flex-col gap-2"
                        >
                          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Quick Replies:</p>
                          <div className="flex gap-2">
                            <button
                              onClick={handleSimConfirm}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-md transition-colors"
                            >
                              Confirm Order ✅
                            </button>
                            <button
                              onClick={handleSimCancel}
                              className="bg-white hover:bg-gray-100 text-red-600 border border-gray-300 font-bold py-2 px-4 rounded-xl text-xs shadow-sm transition-colors"
                            >
                              Cancel ❌
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {simStep === 2 && (
                        <motion.div
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -20, opacity: 0 }}
                          className="flex flex-col gap-2"
                        >
                          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Required Action:</p>
                          <button
                            onClick={handleSimLocation}
                            className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md"
                          >
                            <LocationOnIcon style={{ fontSize: 16 }} />
                            Share Current Location (Bhongir)
                          </button>
                        </motion.div>
                      )}

                      {simStep === 3 && (
                        <motion.div
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -20, opacity: 0 }}
                          className="flex flex-col gap-2"
                        >
                          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Select Payment Mode:</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSimPaymentMethod('Online')}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md"
                            >
                              <CreditCardIcon style={{ fontSize: 16 }} />
                              Pay Online (Razorpay)
                            </button>
                            <button
                              onClick={() => handleSimPaymentMethod('COD')}
                              className="flex-1 bg-[#075E54] hover:bg-[#128C7E] text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md"
                            >
                              <PaymentsIcon style={{ fontSize: 16 }} />
                              Cash On Delivery (COD)
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {simStep === 5 && (
                        <motion.div
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -20, opacity: 0 }}
                          className="flex flex-col gap-2"
                        >
                          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">COD Blocked (&lt; ₹100 limit):</p>
                          <button
                            onClick={() => handleSimPaymentMethod('Online')}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md"
                          >
                            <CreditCardIcon style={{ fontSize: 16 }} />
                            Pay Online (Razorpay)
                          </button>
                        </motion.div>
                      )}

                      {simStep === 4 && (
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="text-center py-2"
                        >
                          <p className="text-xs font-bold text-green-700 flex items-center justify-center gap-1">
                            <CheckCircleIcon style={{ fontSize: 18 }} />
                            Order Successfully Simulated!
                          </p>
                          <button
                            onClick={() => resetSimulator(orderId)}
                            className="mt-2 text-[10px] text-brand-orange hover:underline font-bold"
                          >
                            Restart Simulation
                          </button>
                        </motion.div>
                      )}

                      {simStep === 0 && (
                        <div className="text-center py-2">
                          <p className="text-xs text-text-muted italic">Order Flow Cancelled.</p>
                          <button
                            onClick={() => resetSimulator(orderId)}
                            className="mt-2 text-[10px] text-brand-orange hover:underline font-bold"
                          >
                            Restart Simulation
                          </button>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Simulated Razorpay Overlay Pane */}
                <AnimatePresence>
                  {showRazorpay && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
                    >
                      <motion.div
                        initial={{ scale: 0.95 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.95 }}
                        className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
                      >
                        {/* Razorpay Header */}
                        <div className="bg-[#0b2545] text-white px-5 py-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-black tracking-widest text-[#3399ff]">Razorpay</span>
                            <span className="text-[10px] bg-[#3399ff]/20 text-[#3399ff] px-1.5 py-0.5 rounded font-bold">SECURE</span>
                          </div>
                          <button onClick={() => setShowRazorpay(false)} className="text-white/70 hover:text-white">
                            <CloseIcon style={{ fontSize: 16 }} />
                          </button>
                        </div>

                        {/* Razorpay Merchant Info */}
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-[#fafbfc]">
                          <div>
                            <p className="text-xs font-bold text-slate-800">Need2Done Food Delivery</p>
                            <p className="text-[10px] text-slate-400">Order ID: {orderId}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-400">Amount</p>
                            <p className="text-sm font-black text-slate-800">₹{cart.grandTotal}</p>
                          </div>
                        </div>

                        {/* Razorpay Payment options / Simulation */}
                        <div className="p-5 space-y-4">
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex gap-3 items-start">
                            <CreditCardIcon className="text-blue-600 flex-shrink-0" style={{ fontSize: 20 }} />
                            <div className="text-xs text-blue-900 leading-normal">
                              <p className="font-bold">Simulated Sandbox Environment</p>
                              <p className="text-[11px] text-blue-700 mt-0.5">Click the button below to simulate a successful debit card payment through Razorpay API.</p>
                            </div>
                          </div>

                          <button
                            onClick={handleRazorpayPayment}
                            disabled={razorpayLoading}
                            className="w-full bg-[#3399ff] hover:bg-[#1a85f2] text-white font-bold py-3 px-4 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:bg-blue-300"
                          >
                            {razorpayLoading ? (
                              <>
                                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                <span>Authorizing Payment...</span>
                              </>
                            ) : (
                              <span>Simulate Success Payment — ₹{cart.grandTotal}</span>
                            )}
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
