import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StarIcon from '@mui/icons-material/Star';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { getRestaurantBySlug } from '../data/restaurants';
import { getMenuByRestaurant } from '../data/menu';
import MenuSection from '../components/restaurant/MenuSection';
import CustomizationModal from '../components/modals/CustomizationModal';
import CartPanel from '../components/cart/CartPanel';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import EmptyState from '../components/ui/EmptyState';

export default function RestaurantPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isRestaurantWishlisted, toggleRestaurant } = useWishlist();
  const { addItem, isDifferentRestaurant, clearCart } = useCart();

  const restaurant = getRestaurantBySlug(slug);
  const menu = restaurant ? getMenuByRestaurant(restaurant.id) : null;

  const [selectedItem, setSelectedItem] = useState(null);
  const [pendingItem, setPendingItem] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (!restaurant) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <EmptyState
          icon="😢"
          title="Restaurant not found"
          subtitle="The restaurant you are looking for does not exist or has been removed."
          action={{
            label: 'Go back home',
            onClick: () => navigate('/'),
          }}
        />
      </div>
    );
  }

  const isWishlisted = isRestaurantWishlisted(restaurant.id);

  const handleAddItem = (item) => {
    if (isDifferentRestaurant(restaurant.id)) {
      setPendingItem(item);
      setShowClearConfirm(true);
      return;
    }

    if (item.customizable) {
      setSelectedItem(item);
    } else {
      addItem(item, restaurant.id, restaurant.name, {});
    }
  };

  const handleClearCartConfirm = () => {
    clearCart();
    if (pendingItem.customizable) {
      setSelectedItem(pendingItem);
    } else {
      addItem(pendingItem, restaurant.id, restaurant.name, {});
    }
    setPendingItem(null);
    setShowClearConfirm(false);
  };

  const handleCancelClearCart = () => {
    setPendingItem(null);
    setShowClearConfirm(false);
  };

  return (
    <div className="py-6 space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Back to Home Button */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1.5 text-sm font-semibold text-text-secondary hover:text-brand-orange transition-colors"
      >
        <ArrowBackIcon style={{ fontSize: 16 }} />
        Back to restaurants
      </button>

      {/* Restaurant Header Card */}
      <div className="relative rounded-3xl overflow-hidden shadow-card border border-gray-100 bg-white">
        {/* Cover */}
        <div className="h-48 md:h-64 relative">
          <img
            src={restaurant.cover}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

          {/* Floating Action Details */}
          <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
            <div className="flex gap-4 items-center">
              {/* Logo */}
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border-2 border-white shadow-lg bg-white">
                <img
                  src={restaurant.logo}
                  alt={`${restaurant.name} logo`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      restaurant.name
                    )}&background=FF6B00&color=fff&size=80`;
                  }}
                />
              </div>
              <div className="text-white">
                <h1 className="font-display font-black text-xl md:text-3xl">{restaurant.name}</h1>
                <p className="text-white/80 text-xs md:text-sm mt-0.5">{restaurant.cuisine.join(', ')}</p>
              </div>
            </div>

            {/* Wishlist Icon */}
            <button
              onClick={() => toggleRestaurant(restaurant.id)}
              className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
            >
              {isWishlisted ? (
                <FavoriteIcon className="text-red-500" style={{ fontSize: 20 }} />
              ) : (
                <FavoriteBorderIcon className="text-text-secondary" style={{ fontSize: 20 }} />
              )}
            </button>
          </div>
        </div>

        {/* Rating and Info bar */}
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-gray-50">
          <div className="text-center md:border-r border-gray-100 pb-2 md:pb-0">
            <div className="flex items-center justify-center gap-1 text-brand-green font-bold text-base">
              <StarIcon style={{ fontSize: 18 }} />
              <span>{restaurant.rating}</span>
            </div>
            <p className="text-[10px] text-text-muted mt-0.5">({restaurant.reviewCount}+ Ratings)</p>
          </div>

          <div className="text-center md:border-r border-gray-100 pb-2 md:pb-0">
            <div className="flex items-center justify-center gap-1 text-text-primary font-bold text-base">
              <AccessTimeIcon style={{ fontSize: 18 }} className="text-text-secondary" />
              <span>{restaurant.deliveryTime} mins</span>
            </div>
            <p className="text-[10px] text-text-muted mt-0.5">Delivery Time</p>
          </div>

          <div className="text-center md:border-r border-gray-100">
            <p className="text-text-primary font-bold text-base">₹{restaurant.priceForTwo}</p>
            <p className="text-[10px] text-text-muted mt-0.5">Cost for Two</p>
          </div>

          <div className="text-center">
            <p className="text-brand-orange font-bold text-base flex items-center justify-center gap-1">
              <LocationOnIcon style={{ fontSize: 16 }} />
              {restaurant.distance}
            </p>
            <p className="text-[10px] text-text-muted mt-0.5">Distance</p>
          </div>
        </div>

        {/* Address and timing block */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 text-xs text-text-secondary">
          <span className="flex items-center gap-1">
            <LocationOnIcon style={{ fontSize: 14 }} className="text-text-muted" />
            {restaurant.address}
          </span>
          <span className="flex items-center gap-1 font-medium">
            <InfoOutlinedIcon style={{ fontSize: 14 }} className="text-text-muted" />
            Hours: {restaurant.openingHours}
          </span>
        </div>
      </div>

      {/* Offers Badge Overlay */}
      {restaurant.offer && (
        <div className="bg-brand-green-pale border border-brand-green/20 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-green/10 flex items-center justify-center text-brand-green">
            <LocalOfferIcon style={{ fontSize: 18 }} />
          </div>
          <div>
            <p className="text-xs font-bold text-brand-green">Special Offer Applied</p>
            <p className="text-xs text-brand-green/90 font-medium">
              Use code <strong className="font-bold">{restaurant.offerCode}</strong> to get {restaurant.offer}!
            </p>
          </div>
        </div>
      )}

      {/* Responsive Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Menu Sections */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 shadow-card border border-gray-100">
          <h2 className="font-display font-black text-xl text-text-primary mb-6">Our Menu</h2>
          {menu ? (
            <MenuSection
              menu={menu}
              restaurantId={restaurant.id}
              restaurantName={restaurant.name}
              onAddItem={handleAddItem}
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-text-secondary text-sm">Menu is empty for this restaurant right now.</p>
            </div>
          )}
        </div>

        {/* Right Column: Sticky Cart Panel (Desktop only) */}
        <div className="hidden lg:block lg:col-span-4">
          <CartPanel />
        </div>
      </div>

      {/* Customization modal */}
      {selectedItem && (
        <CustomizationModal
          item={selectedItem}
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {/* Clear Cart Confirmation Dialog */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleCancelClearCart} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl z-10 text-center"
            >
              <div className="text-3xl mb-3">🛒</div>
              <h3 className="font-display font-bold text-text-primary text-base mb-2">
                Your cart has items from another restaurant
              </h3>
              <p className="text-text-secondary text-xs mb-6 leading-relaxed">
                Would you like to clear your cart and add items from <strong>{restaurant.name}</strong>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelClearCart}
                  className="flex-1 border border-gray-300 text-text-secondary font-bold text-xs py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearCartConfirm}
                  className="flex-1 bg-brand-orange hover:bg-brand-orange-dark text-white font-bold text-xs py-2.5 rounded-xl shadow-orange hover:shadow-orange-hover transition-colors"
                >
                  Clear Cart
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
