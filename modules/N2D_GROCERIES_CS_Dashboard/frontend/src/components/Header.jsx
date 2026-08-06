import React, { useState } from 'react';
import { Search, MapPin, HelpCircle, ShoppingCart, ChevronDown, X, Navigation, Menu, Shield } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';

const Header = ({ searchQuery, setSearchQuery, onMenuClick }) => {
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [logoError, setLogoError] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState('Bhongir, Telangana');
  const [tempLocation, setTempLocation] = useState('');

  const handleLocationSubmit = (e) => {
    e.preventDefault();
    if (tempLocation.trim()) {
      setCurrentLocation(tempLocation);
      setIsLocationModalOpen(false);
      setTempLocation('');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-3 lg:py-0 lg:h-20 flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-6">
        
        {/* Top Row on Mobile: Hamburger, Logo, Location, and Cart */}
        <div className="w-full lg:w-auto flex items-center justify-between lg:justify-start gap-3 lg:gap-6">
          <div className="flex items-center gap-1 lg:gap-2">
            <button 
              onClick={onMenuClick}
              className="lg:hidden p-1.5 -ml-1 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <Menu size={24} />
            </button>
            <div className="flex-shrink-0 cursor-pointer flex items-center">
            {!logoError ? (
              <img 
                src="/images/logo.png" 
                alt="Need2Done Logo" 
                className="h-[60px] lg:h-[120px] w-auto object-contain lg:-ml-6 lg:-my-4"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-10 h-10 lg:w-[72px] lg:h-[72px] bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl lg:text-3xl">
                N
              </div>
            )}
            </div>
          </div>

          <div 
            onClick={() => setIsLocationModalOpen(true)}
            className="flex-1 lg:flex-none flex items-center gap-1.5 lg:gap-2 bg-gray-50 px-2.5 py-1.5 lg:px-4 lg:py-2.5 rounded-lg lg:rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors overflow-hidden"
          >
            <MapPin size={18} className="text-primary flex-shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] lg:text-xs text-gray-500 font-medium hidden lg:block">Delivering to</span>
              <span className="text-xs lg:text-sm font-semibold text-gray-800 flex items-center gap-1 truncate">
                <span className="truncate">{currentLocation}</span> <ChevronDown size={14} className="flex-shrink-0" />
              </span>
            </div>
          </div>

          {/* Mobile Admin & Cart Icons */}
          <div className="lg:hidden flex items-center gap-1">
            <button 
              onClick={() => navigate('/admin/login')}
              className="flex items-center justify-center p-2 text-gray-700 relative hover:bg-gray-100 rounded-full transition-colors"
              title="Admin Portal"
            >
              <Shield size={22} className="text-primary" />
            </button>
            <button className="flex items-center justify-center p-2 text-gray-700 relative hover:bg-gray-100 rounded-full transition-colors">
              <ShoppingCart size={24} />
              {itemCount > 0 && (
                <span className="absolute top-0 right-0 bg-secondary text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
        
        {/* Search Bar - Full width on mobile, flex-1 on desktop */}
        <div className="w-full lg:flex-1 relative order-3 lg:order-none">
            <input
              type="text"
              placeholder="Search for groceries, brands..."
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          </div>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center gap-6 order-2 lg:order-none">
          <button 
            onClick={() => navigate('/admin/login')}
            className="flex items-center gap-2 text-primary hover:text-blue-700 transition-colors font-bold bg-blue-50 px-4 py-2 rounded-xl"
          >
            <Shield size={20} />
            <span className="text-sm">Admin Portal</span>
          </button>
          <button className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors font-medium">
            <span className="text-sm">Offers</span>
          </button>
          <button className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors font-medium">
            <HelpCircle size={20} />
            <span className="text-sm">Help</span>
          </button>
          <button className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-card relative">
            <ShoppingCart size={20} />
            <span>Cart</span>
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-secondary text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">
                {itemCount}
              </span>
            )}
          </button>
        </div>

      </div>

      {/* Location Modal */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">Select Location</h3>
              <button onClick={() => setIsLocationModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <button 
                onClick={() => {
                  setCurrentLocation('Current Location');
                  setIsLocationModalOpen(false);
                }}
                className="w-full flex items-center gap-3 text-primary font-semibold p-3 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors mb-6"
              >
                <Navigation size={20} />
                Detect my current location
              </button>

              <div className="relative flex items-center mb-2">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium">OR</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              <form onSubmit={handleLocationSubmit} className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Enter delivery address</label>
                <div className="relative mb-4">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search area, street name..."
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                    value={tempLocation}
                    onChange={(e) => setTempLocation(e.target.value)}
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                </div>
                
                <button 
                  type="submit" 
                  disabled={!tempLocation.trim()}
                  className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Confirm Location
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
