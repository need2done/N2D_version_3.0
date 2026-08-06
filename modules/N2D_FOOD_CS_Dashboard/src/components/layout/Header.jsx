import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SearchIcon from '@mui/icons-material/Search';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CloseIcon from '@mui/icons-material/Close';
import HeadsetMicIcon from '@mui/icons-material/HeadsetMic';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { restaurants } from '../../data/restaurants';
import N2DLogo from '../ui/N2DLogo';
import LocationModal from '../modals/LocationModal';

const SUGGESTIONS = [
  'Biryani', 'Pizza', 'Burger', 'Dosa', 'Chicken', 'Paneer', 'Noodles', 'Cake',
];

export default function Header({ onCartClick }) {
  const [scrolled, setScrolled] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState('Bhongir, Telangana');
  const searchRef = useRef(null);
  const navigate = useNavigate();
  const { totalItems } = useCart();
  const { wishlistCount } = useWishlist();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (searchQuery.length > 1) {
      const q = searchQuery.toLowerCase();
      const matched = [];
      restaurants.forEach(r => {
        if (r.name.toLowerCase().includes(q) || r.cuisine.some(c => c.toLowerCase().includes(q))) {
          matched.push({ type: 'restaurant', label: r.name, sub: r.cuisine[0], slug: r.slug });
        }
      });
      SUGGESTIONS.filter(s => s.toLowerCase().includes(q)).forEach(s => {
        matched.push({ type: 'keyword', label: s });
      });
      setSuggestions(matched.slice(0, 6));
    } else {
      setSuggestions([]);
    }
  }, [searchQuery]);

  const handleSuggestionClick = (s) => {
    if (s.type === 'restaurant') navigate(`/restaurant/${s.slug}`);
    setSearchFocused(false);
    setSearchQuery('');
    setSuggestions([]);
  };

  return (
    <>
      <header className={`sticky top-0 z-50 bg-white transition-shadow duration-300 ${scrolled ? 'shadow-md' : 'shadow-sm'}`}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 md:gap-4 h-[88px] md:h-[116px]">

            {/* Logo */}
            <Link to="/" className="flex-shrink-0">
              <N2DLogo size="md" />
            </Link>

            {/* Location */}
            <div className="hidden md:flex flex-col justify-center min-w-[130px]">
              <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Deliver to</span>
              <button onClick={() => setIsLocationModalOpen(true)} className="flex items-center gap-1 group">
                <LocationOnIcon style={{ fontSize: 14 }} className="text-brand-orange flex-shrink-0" />
                <span className="text-sm font-bold text-text-primary whitespace-nowrap">{deliveryLocation}</span>
                <KeyboardArrowDownIcon style={{ fontSize: 16 }} className="text-text-secondary group-hover:text-brand-orange transition-colors" />
              </button>
              <span onClick={() => setIsLocationModalOpen(true)} className="text-[11px] text-brand-orange font-semibold cursor-pointer hover:underline">Change Location</span>
            </div>

            {/* Search */}
            <div className="flex-1 relative min-w-0">
              <div className={`flex items-center gap-2 bg-gray-50 border-2 rounded-xl px-4 py-2.5 transition-all ${searchFocused ? 'border-brand-orange shadow-orange' : 'border-gray-200'}`}>
                <SearchIcon style={{ fontSize: 18 }} className="text-gray-400 flex-shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search for restaurants, cuisines or dishes..."
                  className="flex-1 bg-transparent text-sm outline-none text-text-primary placeholder:text-gray-400 min-w-0"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => { setSearchFocused(false); setSuggestions([]); }, 150)}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')}>
                    <CloseIcon style={{ fontSize: 14 }} className="text-gray-400" />
                  </button>
                )}
              </div>

              <AnimatePresence>
                {searchFocused && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-card-hover border border-gray-100 overflow-hidden z-50"
                  >
                    {suggestions.map((s, i) => (
                      <button key={i} className="w-full text-left px-4 py-3 hover:bg-orange-50 flex items-center gap-3 transition-colors" onClick={() => handleSuggestionClick(s)}>
                        <SearchIcon style={{ fontSize: 14 }} className="text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-text-primary">{s.label}</p>
                          {s.sub && <p className="text-xs text-gray-400">{s.sub}</p>}
                        </div>
                        <span className="ml-auto text-[10px] text-gray-400 capitalize bg-gray-100 px-2 py-0.5 rounded-full">{s.type}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Nav Icons */}
            <nav className="flex items-center gap-1 flex-shrink-0">
              {/* Offers */}
              <button className="flex flex-col items-center px-3 py-1 rounded-xl hover:bg-orange-50 transition-colors group">
                <div className="relative">
                  <LocalOfferIcon style={{ fontSize: 22 }} className="text-gray-500 group-hover:text-brand-orange transition-colors" />
                </div>
                <span className="text-[11px] text-gray-500 group-hover:text-brand-orange font-medium mt-0.5">Offers</span>
              </button>

              {/* Wishlist */}
              <button className="relative flex flex-col items-center px-3 py-1 rounded-xl hover:bg-red-50 transition-colors group">
                <FavoriteIcon style={{ fontSize: 22 }} className="text-gray-500 group-hover:text-red-500 transition-colors" />
                <span className="text-[11px] text-gray-500 group-hover:text-red-500 font-medium mt-0.5">Wishlist</span>
                {wishlistCount > 0 && (
                  <span className="absolute top-0 right-1 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{wishlistCount}</span>
                )}
              </button>

              {/* Cart */}
              <button
                onClick={onCartClick}
                className="relative flex flex-col items-center px-3 py-1 rounded-xl hover:bg-orange-50 transition-colors group"
              >
                <ShoppingCartIcon style={{ fontSize: 22 }} className="text-gray-500 group-hover:text-brand-orange transition-colors" />
                <span className="text-[11px] text-gray-500 group-hover:text-brand-orange font-medium mt-0.5">Cart</span>
                {totalItems > 0 && (
                  <motion.span
                    key={totalItems}
                    initial={{ scale: 1.4 }}
                    animate={{ scale: 1 }}
                    className="absolute top-0 right-1 bg-brand-orange text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold shadow-orange"
                  >
                    {totalItems}
                  </motion.span>
                )}
              </button>

              {/* Support */}
              <a
                href="https://wa.me/917989862623?text=Hi!%20I%20need%20support."
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex flex-col items-center px-3 py-1 rounded-xl hover:bg-green-50 transition-colors group"
              >
                <HeadsetMicIcon style={{ fontSize: 22 }} className="text-gray-500 group-hover:text-green-600 transition-colors" />
                <span className="text-[11px] text-gray-500 group-hover:text-green-600 font-medium mt-0.5">Support</span>
              </a>

              {/* Food Admin Portal */}
              <a
                href="/food/admin"
                className="flex flex-col items-center px-3 py-1 rounded-xl hover:bg-orange-50 transition-colors group"
                title="Food Admin Console"
              >
                <span className="text-[16px]">🔐</span>
                <span className="text-[11px] text-gray-500 group-hover:text-brand-orange font-medium mt-0.5">Admin</span>
              </a>
            </nav>
          </div>
        </div>
      </header>
      
      <LocationModal 
        isOpen={isLocationModalOpen} 
        onClose={() => setIsLocationModalOpen(false)} 
        currentLocation={deliveryLocation}
        onSelectLocation={(loc) => setDeliveryLocation(loc)}
      />
    </>
  );
}
