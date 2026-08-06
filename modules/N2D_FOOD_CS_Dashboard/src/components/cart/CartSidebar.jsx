import { motion, AnimatePresence } from 'framer-motion';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useCart } from '../../context/CartContext';
import { useState } from 'react';
import CheckoutModal from '../modals/CheckoutModal';

export default function CartSidebar({ isOpen, onClose }) {
  const {
    items,
    restaurantName,
    subtotal,
    platformFee,
    packagingFee,
    deliveryFee,
    grandTotal,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();

  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const handleCheckout = () => {
    setCheckoutOpen(true);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={onClose}
            />

            {/* Sidebar */}
            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-screen max-w-md bg-white shadow-2xl flex flex-col"
              >
                {/* Header */}
                <div className="px-4 py-6 bg-white border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-display font-bold text-lg text-text-primary">Your Cart</h2>
                    {restaurantName && (
                      <p className="text-xs text-text-muted">From {restaurantName}</p>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                  >
                    <CloseIcon style={{ fontSize: 18 }} />
                  </button>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
                  {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <span className="text-5xl mb-4">🛒</span>
                      <h3 className="font-display font-semibold text-text-primary text-base">Your cart is empty</h3>
                      <p className="text-text-muted text-xs mt-1">Add items to start ordering</p>
                      <button
                        onClick={onClose}
                        className="mt-6 px-5 py-2.5 rounded-xl border border-brand-orange text-brand-orange text-xs font-bold hover:bg-brand-orange hover:text-white transition-all"
                      >
                        Browse Restaurants
                      </button>
                    </div>
                  ) : (
                    items.map((item, idx) => (
                      <div key={idx} className="flex gap-3 pb-4 border-b border-gray-100 items-start">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200&h=200&fit=crop';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-text-primary truncate">{item.name}</h4>
                          {item.customizations && Object.entries(item.customizations).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {Object.entries(item.customizations).map(([k, v]) => (
                                <span key={k} className="text-[10px] bg-gray-100 text-text-secondary px-1.5 py-0.5 rounded-md">
                                  {k}: {v}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm font-bold text-text-primary">₹{item.cartPrice * item.quantity}</span>
                            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                              <button
                                onClick={() => updateQuantity(idx, item.quantity - 1)}
                                className="w-5 h-5 rounded-md bg-white flex items-center justify-center shadow-sm text-text-secondary hover:text-brand-orange transition-colors"
                              >
                                <RemoveIcon style={{ fontSize: 12 }} />
                              </button>
                              <span className="text-xs font-bold text-text-primary px-1">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(idx, item.quantity + 1)}
                                className="w-5 h-5 rounded-md bg-white flex items-center justify-center shadow-sm text-text-secondary hover:text-brand-orange transition-colors"
                              >
                                <AddIcon style={{ fontSize: 12 }} />
                              </button>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeItem(idx)}
                          className="text-text-muted hover:text-red-500 transition-colors p-1"
                        >
                          <DeleteIcon style={{ fontSize: 18 }} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer Sums */}
                {items.length > 0 && (
                  <div className="bg-white border-t border-gray-100 px-4 py-6 space-y-4">
                    {/* Fee Summary */}
                    <div className="space-y-2 text-xs text-text-secondary">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span className="font-semibold text-text-primary">₹{subtotal}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Platform Fee</span>
                        <span className="font-semibold text-text-primary">₹{platformFee}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Packaging Fee</span>
                        <span className="font-semibold text-text-primary">₹{packagingFee}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Delivery Fee</span>
                        <span className="font-semibold text-text-primary">{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span>
                      </div>
                      <div className="border-t border-gray-100 my-2 pt-2 flex justify-between text-sm font-bold text-text-primary">
                        <span>Grand Total</span>
                        <span className="text-brand-orange text-base">₹{grandTotal}</span>
                      </div>
                    </div>

                    {/* Green WhatsApp card */}
                    <div className="whatsapp-card flex gap-3 items-start">
                      <WhatsAppIcon className="text-white flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold">Complete your order securely on WhatsApp</p>
                        <p className="text-[10px] text-white/95 mt-0.5 leading-normal">
                          Upon checkout, we will redirect you to our secure WhatsApp bot to confirm location and complete payment (Razorpay / Cash On Delivery).
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="space-y-2">
                      <button
                        onClick={handleCheckout}
                        className="btn-primary w-full text-center flex items-center justify-center gap-2"
                      >
                        <span>Proceed to Checkout</span>
                        <span>—</span>
                        <span>₹{grandTotal}</span>
                      </button>
                      <button
                        onClick={onClose}
                        className="w-full text-center text-xs font-semibold text-text-secondary hover:text-brand-orange py-2 transition-colors"
                      >
                        Continue Shopping
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <CheckoutModal isOpen={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
    </>
  );
}
