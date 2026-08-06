import React from 'react';
import { useCart } from '../context/CartContext';
import { Plus, Minus, Trash2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CartSidebar = () => {
  const { cart, updateQuantity, removeFromCart, cartTotal, itemCount, checkout, fees } = useCart();
  const navigate = useNavigate();

  const deliveryFee = fees?.deliveryFee ?? 30;
  const platformFee = fees?.platformFee ?? 8;
  const estimatedTotal = cartTotal + deliveryFee + platformFee;

  const FREE_DELIVERY_THRESHOLD = 500;
  const awayFromFree = FREE_DELIVERY_THRESHOLD - cartTotal;

  if (itemCount === 0) return null;

  return (
    <div className="w-[420px] flex-shrink-0 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col hidden xl:flex self-start sticky top-24 h-[calc(100vh-120px)]">
      
      {/* Header */}
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-bold text-gray-900 text-lg">My Cart ({itemCount})</h3>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-5 no-scrollbar">
        <div className="flex flex-col gap-4">
          {cart.map(item => {
            const price = item.selectedPrice || item.selling_price;
            return (
            <div key={item.cartItemId} className="flex gap-4 items-start">
              <div className="w-16 h-16 bg-gray-50 rounded-lg p-2 flex-shrink-0">
                <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-800 line-clamp-2 leading-tight">{item.name}</h4>
                <div className="text-xs text-gray-500 mt-1">{item.selectedWeight || item.weight}</div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg h-8">
                    <button onClick={() => { if(item.quantity === 1) removeFromCart(item.cartItemId); else updateQuantity(item.cartItemId, item.quantity - 1); }} className="w-8 h-full flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded-l-lg transition-colors">
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} className="w-8 h-full flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded-r-lg transition-colors">
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="font-bold text-gray-900">₹{price * item.quantity}</span>
                </div>
              </div>
              <button onClick={() => removeFromCart(item.cartItemId)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                <Trash2 size={16} />
              </button>
            </div>
          )})}
        </div>
      </div>

      {/* Footer / Summary */}
      <div className="p-5 bg-white border-t border-gray-100 rounded-b-2xl">
        
        {/* Free Delivery Banner */}
        <div className="bg-green-50 rounded-lg p-3 flex items-center gap-2 mb-4">
          <div className="bg-success text-white p-1 rounded-full"><CheckCircle2 size={14} /></div>
          <span className="text-xs font-medium text-success">
            {awayFromFree > 0 ? `Add ₹${awayFromFree} more to get FREE Delivery` : 'You get FREE Delivery!'}
          </span>
        </div>

        {/* Bill Details */}
        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal ({itemCount} Items)</span>
            <span>₹{cartTotal}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Delivery Fee</span>
            <span>₹{deliveryFee}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Platform Fee</span>
            <span>₹{platformFee}</span>
          </div>
        </div>

        <div className="flex justify-between items-center font-bold text-lg text-gray-900 mb-5 pt-3 border-t border-dashed border-gray-200">
          <span>Estimated Total</span>
          <span>₹{estimatedTotal}</span>
        </div>

        <button 
          onClick={checkout}
          className="w-full bg-[#1e5631] text-white py-4 rounded-xl font-bold hover:bg-[#164024] transition-colors flex items-center justify-between px-6"
        >
          <span>Place Order via WhatsApp</span>
          <ArrowRight size={20} />
        </button>
      </div>

    </div>
  );
};

export default CartSidebar;
