import { useState } from 'react';
import { motion } from 'framer-motion';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import AddIcon from '@mui/icons-material/Add';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import { useWishlist } from '../../context/WishlistContext';
import { getDiscountPercent } from '../../utils/formatters';

export default function FoodCard({ item, restaurantId, restaurantName, onAddClick }) {
  const { isItemWishlisted, toggleItem } = useWishlist();
  const [imgError, setImgError] = useState(false);
  const isWishlisted = isItemWishlisted(item.id);
  const discount = getDiscountPercent(item.price, item.offerPrice);
  const displayPrice = item.offerPrice || item.price;

  return (
    <motion.div
      className="bg-white rounded-2xl p-4 shadow-card hover:shadow-card-hover transition-all duration-300 flex gap-4"
      whileHover={{ y: -2 }}
      layout
    >
      {/* Left: Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        {/* Veg / Non-veg */}
        <div className="flex items-center gap-2 mb-1.5">
          {item.isVeg ? (
            <span className="badge-veg">
              <span className="w-2 h-2 rounded-full bg-brand-green inline-block" />
              VEG
            </span>
          ) : (
            <span className="badge-nonveg">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              NON VEG
            </span>
          )}
          {item.isBestSeller && (
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              ⭐ Bestseller
            </span>
          )}
        </div>

        {/* Name */}
        <h3 className="font-display font-semibold text-text-primary text-sm leading-snug mb-1 line-clamp-2">
          {item.name}
        </h3>

        {/* Description */}
        <p className="text-text-muted text-xs leading-relaxed line-clamp-2 mb-3">
          {item.description}
        </p>

        {/* Meta */}
        <div className="flex items-center gap-2 mb-3">
          <span className="flex items-center gap-1 text-xs text-text-muted">
            <AccessTimeIcon style={{ fontSize: 12 }} />
            {item.prepTime}
          </span>
        </div>

        {/* Price */}
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-text-primary text-base">
            ₹{displayPrice}
          </span>
          {item.offerPrice && (
            <>
              <span className="price-original">₹{item.price}</span>
              {discount && (
                <span className="text-xs font-bold text-brand-green bg-brand-green-pale px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <LocalOfferIcon style={{ fontSize: 10 }} />
                  {discount}% OFF
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right: Image + Buttons */}
      <div className="flex-shrink-0 flex flex-col items-center gap-2">
        {/* Image */}
        <div className="relative w-28 h-28 rounded-xl overflow-hidden">
          <img
            src={imgError ? 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200&h=200&fit=crop' : item.image}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
          {/* Wishlist */}
          <button
            onClick={() => toggleItem(item.id)}
            className="absolute top-1.5 right-1.5 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
          >
            {isWishlisted ? (
              <FavoriteIcon style={{ fontSize: 12 }} className="text-red-500" />
            ) : (
              <FavoriteBorderIcon style={{ fontSize: 12 }} className="text-text-secondary" />
            )}
          </button>
        </div>

        {/* Add Button */}
        {item.isAvailable ? (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => onAddClick?.(item)}
            className="w-full flex items-center justify-center gap-1 bg-gradient-to-r from-brand-orange to-brand-orange-light text-white text-xs font-bold px-4 py-2 rounded-xl shadow-orange hover:shadow-orange-hover transition-all duration-200 animate-pulse-orange"
          >
            <AddIcon style={{ fontSize: 14 }} />
            ADD
          </motion.button>
        ) : (
          <button
            disabled
            className="w-full text-xs font-semibold px-4 py-2 rounded-xl bg-gray-100 text-text-muted cursor-not-allowed"
          >
            OUT OF STOCK
          </button>
        )}
      </div>
    </motion.div>
  );
}
