import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import StarIcon from '@mui/icons-material/Star';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import { useWishlist } from '../../context/WishlistContext';

export default function RestaurantCard({ restaurant }) {
  const navigate = useNavigate();
  const { isRestaurantWishlisted, toggleRestaurant } = useWishlist();
  const [logoErr, setLogoErr] = useState(false);
  const [coverErr, setCoverErr] = useState(false);
  const isWishlisted = isRestaurantWishlisted(restaurant.id);

  const handleWishlist = (e) => {
    e.stopPropagation();
    toggleRestaurant(restaurant.id);
  };

  return (
    <motion.div
      className="card rounded-2xl overflow-hidden border border-gray-100 flex flex-col h-full cursor-pointer hover:shadow-card-hover transition-all duration-300 relative group"
      whileHover={{ y: -6 }}
      onClick={() => navigate(`/restaurant/${restaurant.slug}`)}
    >
      {/* 1. Restaurant Cover Image */}
      <div className="relative h-44 w-full bg-gray-100 overflow-hidden">
        <img
          src={coverErr
            ? 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=300&fit=crop'
            : restaurant.cover}
          alt={`${restaurant.name} cover`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={() => setCoverErr(true)}
          loading="lazy"
        />
        {/* Dark overlay at bottom of cover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Favorite Icon (Wishlist) */}
        <button
          className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform z-10"
          onClick={handleWishlist}
        >
          {isWishlisted ? (
            <FavoriteIcon style={{ fontSize: 16 }} className="text-red-500" />
          ) : (
            <FavoriteBorderIcon style={{ fontSize: 16 }} className="text-text-secondary" />
          )}
        </button>

        {/* Badges on Cover */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {restaurant.isOpen ? (
            <span className="bg-brand-green text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              OPEN
            </span>
          ) : (
            <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              CLOSED
            </span>
          )}
        </div>

        {/* Offer Badge Overlay at Bottom Left */}
        {restaurant.offer && (
          <div className="absolute bottom-3 left-3 bg-gradient-to-r from-brand-green to-brand-green-light text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-md">
            <LocalOfferIcon style={{ fontSize: 11 }} />
            <span>{restaurant.offer}</span>
          </div>
        )}
      </div>

      {/* 2. Restaurant Logo Overlap & Info Section */}
      <div className="p-5 pt-7 relative flex-1 flex flex-col justify-between bg-white">
        {/* Floating Restaurant Logo */}
        <div className="absolute -top-7 right-5 w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-md bg-white z-10">
          <img
            src={logoErr
              ? `https://ui-avatars.com/api/?name=${encodeURIComponent(restaurant.name)}&background=FF6B00&color=fff&size=56&bold=true`
              : restaurant.logo}
            alt={`${restaurant.name} logo`}
            className="w-full h-full object-cover"
            onError={() => setLogoErr(true)}
            loading="lazy"
          />
        </div>

        <div>
          {/* Restaurant Name */}
          <h3 className="font-display font-black text-text-primary text-base md:text-lg leading-tight line-clamp-1 mb-1 pr-14 group-hover:text-brand-orange transition-colors">
            {restaurant.name}
          </h3>

          {/* Cuisine */}
          <p className="text-text-secondary text-xs line-clamp-1 mb-3">
            {restaurant.cuisine.join(', ')}
          </p>

          {/* Metrics Row */}
          <div className="flex items-center justify-between text-xs font-semibold text-text-secondary border-t border-b border-gray-50 py-2.5 my-3">
            {/* Rating */}
            <div className="flex items-center gap-1">
              <span className="flex items-center gap-0.5 bg-brand-green text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                <StarIcon style={{ fontSize: 10 }} />
                {restaurant.rating}
              </span>
              <span className="text-[10px] text-text-muted">({restaurant.reviewCount})</span>
            </div>
            
            {/* Delivery time */}
            <span className="flex items-center gap-1">
              <AccessTimeIcon style={{ fontSize: 13 }} className="text-text-muted" />
              {restaurant.deliveryTime} mins
            </span>

            {/* Price For Two */}
            <span>₹{restaurant.priceForTwo} for two</span>
          </div>

          {/* Distance */}
          <div className="flex items-center gap-1 text-[11px] text-text-muted mb-4">
            <LocationOnIcon style={{ fontSize: 12 }} />
            <span>{restaurant.distance} • {restaurant.address.split(',')[0]}</span>
          </div>
        </div>

        {/* View Menu Button */}
        <button
          className="w-full py-2.5 border-2 border-brand-orange text-brand-orange font-bold text-xs rounded-xl flex items-center justify-center gap-1 group-hover:bg-brand-orange group-hover:text-white transition-all duration-300"
        >
          <span>View Menu</span>
        </button>
      </div>
    </motion.div>
  );
}
