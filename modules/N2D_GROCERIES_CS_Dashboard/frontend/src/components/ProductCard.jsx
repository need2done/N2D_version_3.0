import React, { useState } from 'react';
import { Heart, Eye, Star, ChevronDown } from 'lucide-react';
import { useCart } from '../context/CartContext';
import QuickViewModal from './QuickViewModal';

const ProductCard = ({ product }) => {
  const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  
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
  const [selectedWeight, setSelectedWeight] = useState(options.includes(product.weight) ? product.weight : options[0]);

  const baseGrams = parseWeightToGrams(product.weight);
  const selectedGrams = parseWeightToGrams(selectedWeight);
  const multiplier = selectedGrams / baseGrams;

  // Calculate prices based on multiplier
  const mrp = Math.round((product.mrp || 0) * multiplier);
  const sellingPrice = Math.round((product.selling_price || 0) * multiplier);
  const discountPercentage = mrp > sellingPrice ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0;

  // Cart integration
  const cartItemId = `${product.id}-${selectedWeight}`;
  const cartItem = cart.find(item => item.cartItemId === cartItemId);
  const quantity = cartItem ? cartItem.quantity : 0;

  const handleAdd = () => {
    addToCart({ ...product, selectedWeight, selectedPrice: sellingPrice });
  };

  const handleIncrease = () => {
    updateQuantity(cartItemId, quantity + 1);
  };

  const handleDecrease = () => {
    if (quantity === 1) {
      removeFromCart(cartItemId);
    } else {
      updateQuantity(cartItemId, quantity - 1);
    }
  };

  const isOutOfStock = product.stock !== undefined && product.stock <= 0;

  return (
    <>
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100 overflow-hidden flex flex-col h-full group p-3">
      
      {/* Image Container */}
      <div className="relative aspect-[4/3] w-full rounded-xl bg-gray-50 mb-3 overflow-hidden flex items-center justify-center group-hover:bg-gray-100 transition-colors">
        <img 
          src={product.image || product.image_url} 
          alt={product.name}
          className={`w-full h-full object-cover mix-blend-multiply transition-transform duration-500 cursor-pointer ${isOutOfStock ? 'opacity-50 grayscale' : 'group-hover:scale-105'}`}
          onClick={() => !isOutOfStock && setIsQuickViewOpen(true)}
        />
        
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/40 backdrop-blur-[2px]">
            <div className="bg-gray-800 text-white font-bold text-xs uppercase px-4 py-1.5 rounded-full shadow-lg transform -rotate-12">
              Out of Stock
            </div>
          </div>
        )}
        
        {/* Top Left Tag */}
        {product.tag && (
          <div className="absolute top-2 left-2 bg-[#0C8346] text-white text-[10px] font-semibold px-2 py-0.5 rounded-sm shadow-sm">
            {product.tag}
          </div>
        )}

        {/* Top Right Heart Button */}
        <button className="absolute top-2 right-2 bg-white p-1.5 rounded-full shadow-sm text-gray-500 hover:text-red-500 transition-colors">
          <Heart size={16} />
        </button>

        {/* Quick View Button */}
        <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsQuickViewOpen(true);
            }}
            className="w-full bg-white/90 backdrop-blur-sm border border-blue-200 text-blue-600 text-xs font-semibold py-1.5 rounded-md flex items-center justify-center gap-1 hover:bg-blue-50"
          >
            <Eye size={14} />
            Quick View
          </button>
        </div>
      </div>

      <div className="flex flex-col flex-grow">
        {/* Title */}
        <h3 className="font-semibold text-[15px] text-gray-800 leading-snug mb-1 line-clamp-1">
          {product.name}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-2">
          <Star size={12} className="fill-[#F5A623] text-[#F5A623]" />
          <span className="text-xs text-gray-500">
            {product.rating || '4.5'} ({product.reviews || Math.floor(Math.random() * 300 + 50)})
          </span>
        </div>

        {/* Price Row */}
        <div className="flex items-center gap-2 mb-3">
          <span className="font-bold text-gray-900 text-lg leading-none">₹{sellingPrice}</span>
          {discountPercentage > 0 && (
            <>
              <span className="text-xs text-gray-400 line-through">₹{mrp}</span>
              <span className="bg-pink-50 text-pink-500 text-[10px] font-bold px-1.5 py-0.5 rounded">
                {discountPercentage}% OFF
              </span>
            </>
          )}
        </div>

        <div className="mt-auto space-y-2">
          {/* Weight Dropdown */}
          <div className="relative w-full">
            <select 
              value={selectedWeight}
              onChange={(e) => setSelectedWeight(e.target.value)}
              disabled={isOutOfStock}
              className={`w-full appearance-none flex items-center justify-between border border-gray-200 rounded-md px-3 py-1.5 text-xs text-gray-700 transition-colors focus:outline-none focus:border-green-400 ${isOutOfStock ? 'bg-gray-100 opacity-60 cursor-not-allowed' : 'bg-gray-50/50 hover:bg-gray-50 cursor-pointer'}`}
            >
              {options.map((opt, i) => (
                <option key={i} value={opt}>{opt}</option>
              ))}
            </select>
            <ChevronDown size={14} className="text-gray-400 absolute right-3 top-2 pointer-events-none" />
          </div>

          {/* Add to Cart Button */}
          {isOutOfStock ? (
            <button 
              disabled
              className="w-full py-2 bg-gray-200 text-gray-500 font-bold text-sm rounded-md cursor-not-allowed"
            >
              Notify Me
            </button>
          ) : quantity === 0 ? (
            <button 
              onClick={handleAdd}
              className="w-full py-2 bg-[#E6F7F5] text-[#0C8346] font-bold text-sm rounded-md hover:bg-[#D1F0EB] transition-colors"
            >
              Add to Cart
            </button>
          ) : (
            <div className="w-full py-1 bg-[#0C8346] text-white font-bold text-sm rounded-md flex items-center justify-between px-3">
              <button onClick={handleDecrease} className="p-1 hover:bg-green-700 rounded-full transition-colors">-</button>
              <span>{quantity}</span>
              <button onClick={handleIncrease} className="p-1 hover:bg-green-700 rounded-full transition-colors">+</button>
            </div>
          )}
        </div>
      </div>
    </div>
    <QuickViewModal 
      product={{...product, selectedWeight}} 
      isOpen={isQuickViewOpen} 
      onClose={() => setIsQuickViewOpen(false)} 
    />
    </>
  );
};

export default ProductCard;
