import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import DeliveryDiningIcon from '@mui/icons-material/DeliveryDining';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import CheckoutModal from '../modals/CheckoutModal';

export default function CartPanel() {
  const navigate = useNavigate();
  const {
    items, restaurantName,
    subtotal, platformFee, packagingFee, deliveryFee, grandTotal,
    totalItems, updateQuantity, removeItem,
  } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  return (
    <>
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 flex flex-col overflow-hidden"
        style={{ maxHeight: 'calc(100vh - 88px)', position: 'sticky', top: 76 }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-display font-bold text-sm text-text-primary">Your Cart</h2>
          {totalItems > 0 && (
            <span className="bg-brand-orange text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              {totalItems}
            </span>
          )}
        </div>

        {/* Items or Empty */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <ShoppingCartIcon style={{ fontSize: 40 }} className="text-gray-200 mb-3" />
              <p className="text-xs font-semibold text-gray-400">Your cart is empty</p>
              <p className="text-[10px] text-gray-300 mt-1">Add items from restaurants to get started</p>
            </div>
          ) : (
            <div className="px-4 py-3 space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2.5 items-start">
                  {/* Food image */}
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-gray-100"
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=96&h=96&fit=crop'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-text-primary line-clamp-1">{item.name}</p>
                    <p className="text-[9px] text-gray-400 line-clamp-1">{restaurantName}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs font-bold text-text-primary">₹{item.cartPrice * item.quantity}</span>
                      {/* Qty controls */}
                      <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-1 py-0.5">
                        <button
                          onClick={() => updateQuantity(idx, item.quantity - 1)}
                          className="w-4 h-4 rounded flex items-center justify-center hover:bg-white transition-colors"
                        >
                          <RemoveIcon style={{ fontSize: 10 }} className="text-brand-orange" />
                        </button>
                        <span className="text-[10px] font-black text-text-primary px-0.5">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(idx, item.quantity + 1)}
                          className="w-4 h-4 rounded flex items-center justify-center hover:bg-white transition-colors"
                        >
                          <AddIcon style={{ fontSize: 10 }} className="text-brand-orange" />
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Delete */}
                  <button
                    onClick={() => removeItem(idx)}
                    className="text-gray-300 hover:text-red-400 transition-colors mt-0.5 flex-shrink-0"
                  >
                    <DeleteIcon style={{ fontSize: 16 }} />
                  </button>
                </div>
              ))}

              {/* Add cooking instructions */}
              <button className="flex items-center gap-1.5 text-brand-orange text-[11px] font-semibold hover:underline mt-1">
                <EditNoteIcon style={{ fontSize: 14 }} />
                Add cooking instructions
              </button>
            </div>
          )}
        </div>

        {/* Bill Summary + Actions */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-3 space-y-3">
            {/* Fee rows */}
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span className="font-semibold text-text-primary">₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Platform Fee</span>
                <span className="font-semibold text-text-primary">₹{platformFee}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Delivery Fee</span>
                <span className="font-semibold text-text-primary">{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Packaging Fee</span>
                <span className="font-semibold text-text-primary">₹{packagingFee}</span>
              </div>
              <div className="flex justify-between font-black text-sm text-text-primary pt-1.5 border-t border-gray-100">
                <span>Grand Total</span>
                <span className="text-brand-orange">₹{grandTotal}</span>
              </div>
            </div>

            {/* WhatsApp note */}
            <div className="bg-green-50 border border-green-100 rounded-xl p-2.5 flex gap-2 items-center">
              <WhatsAppIcon style={{ fontSize: 18 }} className="text-green-600 flex-shrink-0" />
              <p className="text-[10px] text-green-700 font-medium leading-snug">
                You will complete your order securely on WhatsApp
              </p>
            </div>

            {/* Checkout Button */}
            <button
              onClick={() => setCheckoutOpen(true)}
              className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-black text-sm py-3 rounded-xl shadow-orange hover:shadow-orange-hover transition-all duration-200"
            >
              Checkout
            </button>

            {/* Continue shopping */}
            <button 
              onClick={() => navigate('/')}
              className="w-full text-brand-orange font-semibold text-xs py-2 rounded-xl border border-brand-orange hover:bg-brand-orange-pale transition-all">
              Continue Shopping
            </button>

            {/* Free delivery note */}
            <div className="flex items-center gap-2 text-[10px] text-green-600 font-semibold">
              <DeliveryDiningIcon style={{ fontSize: 14 }} />
              Free Delivery on orders above ₹199
            </div>
          </div>
        )}
      </div>

      <CheckoutModal isOpen={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
    </>
  );
}
