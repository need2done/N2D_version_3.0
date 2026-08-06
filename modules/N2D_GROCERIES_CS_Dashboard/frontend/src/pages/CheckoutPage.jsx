import React from 'react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const CheckoutPage = () => {
  const { cart, cartTotal, itemCount, checkout } = useCart();
  const navigate = useNavigate();
  
  const deliveryFee = 30;
  const platformFee = 8;
  const estimatedTotal = cartTotal + deliveryFee + platformFee;

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Header />
      
      <main className="max-w-4xl mx-auto px-6 py-8">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center text-primary font-semibold mb-6 hover:underline"
        >
          <ArrowLeft size={16} className="mr-1" />
          Back to Shopping
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-success" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout Simulation</h1>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            This is a UI prototype. In a real application, you would proceed to payment for your {itemCount} items totaling ₹{estimatedTotal}.
          </p>
          
          <div className="bg-gray-50 rounded-xl p-6 text-left max-w-lg mx-auto">
            <h3 className="font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Order Summary</h3>
            {cart.map(item => (
              <div key={item.id} className="flex justify-between items-center mb-2">
                <span className="text-gray-600">{item.quantity}x {item.name}</span>
                <span className="font-medium text-gray-900">₹{item.selling_price * item.quantity}</span>
              </div>
            ))}
            <div className="border-t border-dashed border-gray-300 mt-4 pt-4">
              <div className="flex justify-between items-center font-bold text-lg">
                <span>Total Amount</span>
                <span className="text-[#0C8346]">₹{estimatedTotal}</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => {
              checkout();
              navigate('/');
            }}
            className="mt-8 bg-[#0C8346] text-white px-10 py-3 rounded-xl font-bold text-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-200"
          >
            Place Order via WhatsApp
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CheckoutPage;
