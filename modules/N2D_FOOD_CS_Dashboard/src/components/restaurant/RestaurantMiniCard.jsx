import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import StarIcon from '@mui/icons-material/Star';

// Mini card used in Fast Delivery and Top Rated compact rows
export function RestaurantMiniCard({ restaurant, showTime = true }) {
  const navigate = useNavigate();
  const [imgErr, setImgErr] = useState(false);
  return (
    <motion.div
      className="flex items-center gap-2.5 bg-white rounded-xl p-2 shadow-sm border border-gray-100 cursor-pointer hover:shadow-card transition-all duration-200"
      whileHover={{ x: 2 }}
      onClick={() => navigate(`/restaurant/${restaurant.slug}`)}
    >
      <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-900">
        <img
          src={imgErr
            ? `https://ui-avatars.com/api/?name=${encodeURIComponent(restaurant.name)}&background=FF6B00&color=fff&size=56`
            : restaurant.logo}
          alt={restaurant.name}
          className="w-full h-full object-cover"
          onError={() => setImgErr(true)}
          loading="lazy"
        />
        {showTime && (
          <div className="absolute bottom-0 left-0 right-0 bg-brand-green/90 text-white text-[8px] font-bold text-center py-0.5">
            {restaurant.deliveryTime} min
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-[11px] text-text-primary line-clamp-1">{restaurant.name}</p>
        <div className="flex items-center gap-0.5 mt-0.5">
          <StarIcon style={{ fontSize: 10 }} className="text-amber-400" />
          <span className="text-[10px] font-bold text-text-primary">{restaurant.rating}</span>
        </div>
      </div>
    </motion.div>
  );
}

import { useState } from 'react';

// Today's Offer coupon card
export function OfferCouponCard({ restaurant }) {
  const navigate = useNavigate();
  const discount = restaurant.offer?.match(/\d+%/)?.[0] || '10%';
  const upto = restaurant.offer?.match(/₹\d+/)?.[0] || '₹60';

  return (
    <motion.div
      className="relative rounded-xl overflow-hidden cursor-pointer shadow-sm border border-gray-100"
      style={{ height: 80 }}
      whileHover={{ scale: 1.02 }}
      onClick={() => navigate(`/restaurant/${restaurant.slug}`)}
    >
      <img
        src={restaurant.cover}
        alt={restaurant.name}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center p-2">
        <p className="text-white font-black text-sm leading-tight text-center">{discount} OFF</p>
        <p className="text-white/90 text-[9px] font-semibold">up to {upto}</p>
        <p className="text-brand-orange text-[9px] font-bold mt-0.5">Use Code: {restaurant.offerCode}</p>
      </div>
    </motion.div>
  );
}
