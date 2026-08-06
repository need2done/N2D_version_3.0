import React from 'react';
import { ShoppingBag, ChevronRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';

const FloatingCart = () => {
  const { cart, itemCount, cartTotal, checkout } = useCart();
  const navigate = useNavigate();

  if (itemCount === 0) return null;

  const FREE_DELIVERY_THRESHOLD = 500;
  const awayFromFree = FREE_DELIVERY_THRESHOLD - cartTotal;
  const progressPercent = Math.min((cartTotal / FREE_DELIVERY_THRESHOLD) * 100, 100);

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[320px] bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden animate-slide-up">
      {/* Free Delivery Progress */}
      <div className="bg-blue-50 px-4 py-2 text-sm text-center">
        {awayFromFree > 0 ? (
          <span className="text-gray-700 font-medium">
            ₹{awayFromFree} away from <span className="text-primary font-bold">FREE Delivery</span>
          </span>
        ) : (
          <span className="text-success font-bold flex items-center justify-center gap-1">
            Yay! You get FREE Delivery 🎉
          </span>
        )}
        <div className="w-full h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${awayFromFree <= 0 ? 'bg-success' : 'bg-primary'}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Cart Summary */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-primary relative">
            <ShoppingBag size={24} />
            <span className="absolute -top-1 -right-1 bg-secondary text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
              {itemCount}
            </span>
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">{itemCount} {itemCount === 1 ? 'Item' : 'Items'}</div>
            <div className="font-bold text-lg text-gray-900">₹{cartTotal}</div>
          </div>
        </div>

        <button 
          onClick={checkout}
          className="bg-[#0C8346] text-white px-5 py-3 rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm shadow-green-200"
        >
          Checkout <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default FloatingCart;
