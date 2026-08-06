import React, { useState } from 'react';
import { FaCheckCircle, FaSpinner } from 'react-icons/fa';

const PaymentModal = ({ isOpen, onClose, amount, onPaymentSuccess }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSimulatePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setSuccess(true);
      setTimeout(() => {
        onPaymentSuccess();
      }, 1500);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-[32px] p-8 max-w-sm w-full mx-4 shadow-2xl relative">
        <h2 className="text-2xl font-black text-gray-900 mb-6 text-center">Complete Payment</h2>
        
        {!success ? (
          <>
            <div className="bg-blue-50 text-blue-700 p-4 rounded-2xl mb-6 text-center">
              <p className="text-sm font-medium mb-1">Amount to Pay</p>
              <p className="text-3xl font-black">₹{amount}</p>
            </div>

            <div className="space-y-3">
              <button 
                onClick={handleSimulatePayment}
                disabled={isProcessing}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-2xl transition-all shadow-md flex justify-center items-center"
              >
                {isProcessing ? (
                  <><FaSpinner className="animate-spin mr-2" /> Processing...</>
                ) : (
                  'Simulate Payment (UPI / Card)'
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
            
            <p className="text-xs text-gray-400 text-center mt-6">
              * This is a local mock payment gateway.
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
