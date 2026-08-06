import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import { useCart } from '../../context/CartContext';

const ADDONS = [
  { key: 'extraCheese', label: 'Extra Cheese', price: 30, emoji: '🧀' },
  { key: 'extraSauce', label: 'Extra Sauce', price: 10, emoji: '🫙' },
  { key: 'extraToppings', label: 'Extra Toppings', price: 20, emoji: '🌶️' },
  { key: 'extraEgg', label: 'Extra Egg', price: 15, emoji: '🥚' },
];

const SPICE_LEVELS = [
  { value: 'mild', label: 'Mild', emoji: '😌' },
  { value: 'medium', label: 'Medium', emoji: '🌶️' },
  { value: 'spicy', label: 'Spicy', emoji: '🔥' },
  { value: 'extra-spicy', label: 'Extra Spicy', emoji: '💀' },
];

export default function CustomizationModal({ item, restaurantId, restaurantName, onClose }) {
  const { addItem, isDifferentRestaurant, clearCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState({});
  const [spiceLevel, setSpiceLevel] = useState('medium');
  const [instructions, setInstructions] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const basePrice = item.offerPrice || item.price;
  const addonTotal = Object.entries(selectedAddons)
    .filter(([, v]) => v)
    .reduce((sum, [key]) => sum + (ADDONS.find(a => a.key === key)?.price || 0), 0);
  const unitPrice = basePrice + addonTotal;
  const totalPrice = unitPrice * quantity;

  const toggleAddon = (key) => setSelectedAddons(prev => ({ ...prev, [key]: !prev[key] }));

  const handleAddToCart = () => {
    if (isDifferentRestaurant(restaurantId)) {
      setShowClearConfirm(true);
      return;
    }
    doAddToCart(false);
  };

  const doAddToCart = (shouldClear = false) => {
    if (shouldClear) {
      clearCart();
    }
    const customizations = {
      ...(selectedAddons.extraCheese ? { 'Extra Cheese': '+₹30' } : {}),
      ...(selectedAddons.extraSauce ? { 'Extra Sauce': '+₹10' } : {}),
      ...(selectedAddons.extraToppings ? { 'Extra Toppings': '+₹20' } : {}),
      ...(selectedAddons.extraEgg ? { 'Extra Egg': '+₹15' } : {}),
      'Spice Level': spiceLevel,
      ...(instructions ? { 'Instructions': instructions } : {}),
    };
    const cartItem = { ...item, cartPrice: unitPrice };
    for (let i = 0; i < quantity; i++) {
      addItem(cartItem, restaurantId, restaurantName, customizations);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl z-10"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
            <div>
              <h2 className="font-display font-bold text-text-primary text-lg line-clamp-1">{item.name}</h2>
              <p className="text-text-muted text-xs">Customize your order</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <CloseIcon style={{ fontSize: 18 }} />
            </button>
          </div>

          <div className="px-6 py-5 space-y-6">
            {/* Item preview */}
            <div className="flex gap-4 items-start">
              <img
                src={item.image}
                alt={item.name}
                className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200&h=200&fit=crop'; }}
              />
              <div>
                <p className="text-text-secondary text-sm line-clamp-2">{item.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-bold text-text-primary">₹{basePrice}</span>
                  {item.offerPrice && <span className="price-original">₹{item.price}</span>}
                </div>
              </div>
            </div>

            {/* Quantity */}
            <div>
              <h3 className="font-semibold text-text-primary text-sm mb-3">Quantity</h3>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-brand-orange hover:text-brand-orange transition-colors"
                >
                  <RemoveIcon style={{ fontSize: 16 }} />
                </button>
                <span className="font-display font-bold text-xl text-text-primary w-8 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => q + 1)}
                  className="w-9 h-9 rounded-full bg-brand-orange text-white flex items-center justify-center hover:bg-brand-orange-dark transition-colors shadow-orange"
                >
                  <AddIcon style={{ fontSize: 16 }} />
                </button>
              </div>
            </div>

            {/* Add-ons */}
            <div>
              <h3 className="font-semibold text-text-primary text-sm mb-3">Add-ons <span className="text-text-muted font-normal">(Optional)</span></h3>
              <div className="grid grid-cols-2 gap-2">
                {ADDONS.map(addon => (
                  <button
                    key={addon.key}
                    onClick={() => toggleAddon(addon.key)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all duration-200 ${
                      selectedAddons[addon.key]
                        ? 'border-brand-orange bg-brand-orange-pale text-brand-orange'
                        : 'border-gray-200 text-text-secondary hover:border-gray-300'
                    }`}
                  >
                    <span>{addon.emoji}</span>
                    <div className="text-left">
                      <p className="text-xs font-semibold">{addon.label}</p>
                      <p className="text-xs text-text-muted">+₹{addon.price}</p>
                    </div>
                    {selectedAddons[addon.key] && (
                      <div className="ml-auto w-4 h-4 rounded-full bg-brand-orange flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Spice Level */}
            <div>
              <h3 className="font-semibold text-text-primary text-sm mb-3 flex items-center gap-1">
                <LocalFireDepartmentIcon style={{ fontSize: 16 }} className="text-brand-orange" />
                Spice Level
              </h3>
              <div className="flex gap-2 flex-wrap">
                {SPICE_LEVELS.map(level => (
                  <button
                    key={level.value}
                    onClick={() => setSpiceLevel(level.value)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all duration-200 ${
                      spiceLevel === level.value
                        ? 'border-brand-orange bg-brand-orange text-white'
                        : 'border-gray-200 text-text-secondary hover:border-gray-300'
                    }`}
                  >
                    <span>{level.emoji}</span>
                    {level.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cooking Instructions */}
            <div>
              <h3 className="font-semibold text-text-primary text-sm mb-2">Cooking Instructions <span className="text-text-muted font-normal">(Optional)</span></h3>
              <textarea
                placeholder="Any special requests? (e.g. less oil, no onion...)"
                className="input-field resize-none text-sm"
                rows={2}
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                maxLength={200}
              />
            </div>
          </div>

          {/* Footer: Live Price + Add to Cart */}
          <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-text-secondary text-sm">Total Price</span>
              <motion.span
                key={totalPrice}
                initial={{ scale: 1.2, color: '#FF6B00' }}
                animate={{ scale: 1, color: '#1A1A1A' }}
                className="font-display font-bold text-xl"
              >
                ₹{totalPrice}
              </motion.span>
            </div>
            <button
              onClick={handleAddToCart}
              className="btn-primary w-full text-center"
            >
              Add {quantity} item{quantity > 1 ? 's' : ''} to Cart — ₹{totalPrice}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Clear Cart Confirm */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="text-3xl text-center mb-3">🛒</div>
              <h3 className="font-display font-bold text-text-primary text-center mb-2">
                Your cart has items from another restaurant
              </h3>
              <p className="text-text-muted text-sm text-center mb-5">
                Would you like to clear your cart and add items from <strong>{restaurantName}</strong>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => doAddToCart(true)}
                  className="flex-1 btn-primary text-sm"
                >
                  Clear Cart
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
