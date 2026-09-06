import React, { useState } from 'react';
import { FaCheckCircle, FaSpinner, FaLock, FaShieldAlt } from 'react-icons/fa';
import api from '../../services/api';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const PaymentModal = ({ isOpen, onClose, amount, onPaymentSuccess }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleRazorpayPayment = async () => {
    setIsProcessing(true);
    try {
      const resLoaded = await loadRazorpayScript();
      if (!resLoaded) {
        alert('Razorpay SDK failed to load. Please check your internet connection.');
        setIsProcessing(false);
        return;
      }

      // Call backend to create Razorpay Order
      const orderRes = await api.post('/payments/create-order', {
        amount,
        customerName: 'Customer',
        customerPhone: 'Guest'
      });

      if (!orderRes.data || !orderRes.data.success) {
        alert(orderRes.data?.error || 'Failed to initialize Razorpay payment order.');
        setIsProcessing(false);
        return;
      }

      const { keyId, razorpayOrderId, currency } = orderRes.data;

      const options = {
        key: keyId,
        amount: Math.round(amount * 100),
        currency: currency || 'INR',
        name: 'Need2Done',
        description: 'Home Services Booking Payment',
        image: 'https://need2done.in/assets/logo.png',
        order_id: razorpayOrderId,
        handler: async function (response) {
          try {
            const verifyRes = await api.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyRes.data && verifyRes.data.success) {
              setIsProcessing(false);
              setSuccess(true);
              setTimeout(() => {
                onPaymentSuccess(response.razorpay_payment_id);
              }, 1200);
            } else {
              setIsProcessing(false);
              alert(verifyRes.data?.error || 'Payment verification failed.');
            }
          } catch (vErr) {
            console.error("Verification error:", vErr);
            setIsProcessing(false);
            alert("Error verifying payment signature.");
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
          }
        },
        prefill: {
          name: 'Need2Done Customer'
        },
        theme: {
          color: '#4F46E5'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        setIsProcessing(false);
        alert(`Payment Failed: ${resp.error?.description || 'Transaction declined.'}`);
      });
      rzp.open();
    } catch (err) {
      console.error("Razorpay Payment Error:", err);
      setIsProcessing(false);
      alert("Error initializing Razorpay payment gateway.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-[32px] p-8 max-w-sm w-full mx-4 shadow-2xl relative">
        <h2 className="text-2xl font-black text-gray-900 mb-6 text-center">Complete Payment</h2>
        
        {!success ? (
          <>
            <div className="bg-indigo-50 text-indigo-700 p-4 rounded-2xl mb-6 text-center border border-indigo-100">
              <p className="text-sm font-medium mb-1">Amount to Pay</p>
              <p className="text-3xl font-black">₹{amount}</p>
            </div>

            <div className="space-y-3">
              <button 
                onClick={handleRazorpayPayment}
                disabled={isProcessing}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-2xl transition-all shadow-md flex justify-center items-center gap-2"
              >
                {isProcessing ? (
                  <><FaSpinner className="animate-spin mr-2" /> Connecting to Razorpay...</>
                ) : (
                  <>
                    <FaLock className="text-sm" /> Pay with Razorpay (UPI / Card)
                  </>
                )}
              </button>
              
              {!isProcessing && (
                <button 
                  onClick={onClose}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-2xl transition-all"
                >
                  Cancel
                </button>
              )}
            </div>
            
            <p className="text-xs text-gray-400 text-center mt-6 flex items-center justify-center gap-1">
              <FaShieldAlt className="text-indigo-500" /> 256-bit Secure Razorpay Payment Gateway
            </p>
          </>
        ) : (
          <div className="text-center py-6">
            <FaCheckCircle className="text-green-500 text-6xl mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h3>
            <p className="text-gray-500">Redirecting to confirmation...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;
