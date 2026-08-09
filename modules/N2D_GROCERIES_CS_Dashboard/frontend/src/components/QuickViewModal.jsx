import React from 'react';
import { X, Star, Heart, CheckCircle2 } from 'lucide-react';
import { useCart } from '../context/CartContext';

const QuickViewModal = ({ product, isOpen, onClose }) => {
  const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
  
  if (!isOpen || !product) return null;

  const [selectedWeight, setSelectedWeight] = React.useState(product.selectedWeight || product.weight);

  // Sync state if product changes
  React.useEffect(() => {
    setSelectedWeight(product.selectedWeight || product.weight);
  }, [product]);

  // Dynamic weight options logic
  const parseWeightToGrams = (wStr) => {
    if (!wStr) return 1000;
    const w = wStr.toLowerCase().replace(' ', '');
    const val = parseFloat(w);
    if (w.includes('kg') || w.includes('l')) return val * 1000;
    return val;
  };

  const getWeightOptions = (wStr) => {
    if (!wStr) return ['1 pack'];
    const w = wStr.toLowerCase();
    if (w.includes('g') || w.includes('kg')) {
      return ['50 g', '100 g', '250 g', '500 g', '1 kg', '5 kg'];
    }
    if (w.includes('ml') || w.includes('l')) {
      return ['250 ml', '500 ml', '1 L', '5 L'];
    }
    return [wStr];
  };

  const options = getWeightOptions(product.weight);
  const baseGrams = parseWeightToGrams(product.weight);
  const selectedGrams = parseWeightToGrams(selectedWeight);
  const multiplier = selectedGrams / baseGrams;

  const mrp = Math.round((product.originalMrp || product.mrp || 0) * multiplier);
  const sellingPrice = Math.round((product.originalSellingPrice || product.selling_price || 0) * multiplier);
  const discountPercentage = mrp > sellingPrice ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0;

  const cartItemId = `${product.id}-${selectedWeight}`;
  const cartItem = cart.find(item => item.cartItemId === cartItemId);
  const quantity = cartItem ? cartItem.quantity : 0;

  const getImageUrl = (img) => {
    if (!img) return 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=600&q=80';
    if (img.startsWith('/images/')) return `/groceries${img}`;
    return img;
  };

  const displayImage = getImageUrl(product.image || product.image_url);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
      {/* Modal Container */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row relative">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        {/* Left: Image Gallery */}
        <div className="md:w-1/2 bg-gray-50 p-8 flex items-center justify-center relative">
          {product.tag && (
            <div className="absolute top-6 left-6 bg-[#0C8346] text-white text-xs font-bold px-3 py-1 rounded-sm shadow-sm">
              {product.tag}
            </div>
          )}
          <img 
            src={displayImage} 
            alt={product.name} 
            className="w-full h-full max-h-[380px] object-contain rounded-xl"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=600&q=80';
            }}
          />
        </div>

        {/* Right: Product Details */}
        <div className="md:w-1/2 p-8 overflow-y-auto flex flex-col">
          <div className="mb-2 text-sm text-[#0C8346] font-semibold tracking-wider uppercase">
            {product.brand || 'Need2Done'}
          </div>
          
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-2">
            {product.name}
          </h2>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center bg-gray-100 px-2 py-1 rounded-md">
              <span className="text-sm font-bold text-gray-800 mr-1">{product.rating || '4.5'}</span>
              <Star size={14} className="fill-[#F5A623] text-[#F5A623]" />
            </div>
            <span className="text-sm text-gray-500 underline cursor-pointer hover:text-primary">
              {product.reviews || Math.floor(Math.random() * 300 + 50)} Ratings
            </span>
          </div>

          <div className="border-t border-b border-gray-100 py-6 mb-6">
            <div className="flex items-end gap-3 mb-2">
              <span className="text-3xl font-black text-gray-900">₹{sellingPrice}</span>
              {discountPercentage > 0 && (
                <>
                  <span className="text-lg text-gray-400 line-through mb-1">₹{mrp}</span>
                  <span className="bg-pink-50 text-pink-500 text-xs font-bold px-2 py-1 rounded mb-1">
                    {discountPercentage}% OFF
                  </span>
                </>
              )}
            </div>
            <div className="text-sm text-gray-500">Inclusive of all taxes</div>
          </div>

          <div className="mb-8">
            <div className="text-sm font-semibold text-gray-900 mb-3">Select Quantity / Weight</div>
            <div className="flex flex-wrap gap-2">
              {options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedWeight(opt)}
                  className={`border-2 rounded-lg px-4 py-2 font-bold transition-colors ${
                    selectedWeight === opt 
                    ? 'border-primary bg-primary/5 text-primary' 
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto space-y-4">
            {/* Delivery Info */}
            <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-xl">
              <div className="text-primary mt-0.5"><CheckCircle2 size={20} /></div>
              <div>
                <div className="font-semibold text-sm text-gray-900 mb-1">Superfast Delivery</div>
                <div className="text-xs text-gray-500">Get this item delivered to your doorstep in 25 minutes!</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button className="flex-shrink-0 w-14 h-14 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center text-gray-600 transition-colors">
                <Heart size={24} />
              </button>
              
              {quantity === 0 ? (
                <button 
                  onClick={() => addToCart({ ...product, selectedWeight, selectedPrice: sellingPrice })}
                  className="flex-1 h-14 bg-[#0C8346] hover:bg-green-700 text-white font-bold text-lg rounded-xl transition-colors shadow-lg shadow-green-200"
                >
                  Add to Cart
                </button>
              ) : (
                <div className="flex-1 h-14 bg-[#0C8346] text-white font-bold text-lg rounded-xl flex items-center justify-between px-6 shadow-lg shadow-green-200">
                  <button onClick={() => { if(quantity===1) removeFromCart(cartItemId); else updateQuantity(cartItemId, quantity - 1); }} className="w-10 h-10 hover:bg-green-600 rounded-full flex items-center justify-center text-2xl leading-none pb-1 transition-colors">-</button>
                  <span className="text-xl">{quantity}</span>
                  <button onClick={() => updateQuantity(cartItemId, quantity + 1)} className="w-10 h-10 hover:bg-green-600 rounded-full flex items-center justify-center text-2xl leading-none pb-1 transition-colors">+</button>
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default QuickViewModal;
