import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaSearch, FaBell, FaMapMarkerAlt, FaWhatsapp, FaChevronDown, FaTimes, FaUserShield } from 'react-icons/fa';

const Navbar = () => {
  const navigate = useNavigate();
  const [showLocation, setShowLocation] = useState(false);
  const [location, setLocation] = useState('Hyderabad, Telangana');
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const allServices = [
    { id: 1, name: 'Dish Washing' },
    { id: 2, name: 'Kitchen Cleaning' },
    { id: 3, name: 'Fan Cleaning' },
    { id: 4, name: 'Window Cleaning' },
    { id: 5, name: 'Laundry Help' },
    { id: 6, name: 'Bathroom Cleaning' }
  ];

  const filteredServices = searchQuery ? allServices.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())) : [];

  const handleSearchSelect = (id) => {
    setSearchQuery('');
    navigate(`/service/${id}`);
  };

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      setLocation('Locating...');
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await response.json();
          const city = data.address.city || data.address.town || data.address.state_district || 'Unknown Location';
          const state = data.address.state || '';
          setLocation(`${city}${state ? `, ${state}` : ''}`);
          setShowLocation(false);
        } catch (error) {
          setLocation('Your Location');
          setShowLocation(false);
        }
      }, () => {
        setLocation('Hyderabad, Telangana');
        alert('Please allow location access in your browser settings.');
      });
    } else {
      alert('Geolocation is not supported by your browser');
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm py-3">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          
          {/* Logo & Location */}
          <div className="flex items-center space-x-6 md:space-x-10">
            <Link to="/" className="flex-shrink-0 flex items-center h-16 md:h-24 relative group">
              <img 
                src={`${import.meta.env.BASE_URL}logo.png`} 
                alt="Need2Done Logo" 
                className="h-full w-auto max-w-[200px] md:max-w-[280px] object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }} 
              />
              {/* Fallback if logo.png fails */}
              <div className="hidden flex-col justify-center items-center">
                <div className="text-blue-600 font-black text-2xl tracking-tighter leading-none mb-1">
                  <span className="text-red-500">^</span>ND
                </div>
                <span className="font-bold text-sm text-blue-700 tracking-tight leading-none">Need2done</span>
              </div>
            </Link>
            
            <div className="hidden md:block relative">
              <button 
                onClick={() => setShowLocation(!showLocation)}
                className="flex items-center space-x-2 text-sm font-semibold text-gray-700 border border-gray-200 rounded-full px-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <FaMapMarkerAlt className="text-gray-500" />
                <span>{location}</span>
                <FaChevronDown className={`text-gray-400 text-xs ml-1 transition-transform ${showLocation ? 'rotate-180' : ''}`} />
              </button>
              
              {showLocation && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-xl py-2 z-50">
                  <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 mb-1">Current Location</div>
                  <button 
                    onClick={handleCurrentLocation}
                    className="w-full flex items-center px-4 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <FaMapMarkerAlt className="mr-2" /> Detect My Location
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Search Bar (Desktop) */}
          <div className="hidden md:flex flex-1 justify-center px-12">
            <div className="w-full max-w-2xl relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for services..."
                className="w-full pl-12 pr-10 py-3 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all text-sm font-medium"
              />
              <FaSearch className="absolute left-5 top-3.5 text-gray-400 text-lg" />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 focus:outline-none z-10"
                >
                  <FaTimes size={14} />
                </button>
              )}
              
              {/* Search Results Dropdown */}
              {searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden z-50 max-h-60 overflow-y-auto">
                  {filteredServices.length > 0 ? (
                    filteredServices.map(service => (
                      <button
                        key={service.id}
                        onClick={() => handleSearchSelect(service.id)}
                        className="w-full text-left px-5 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 flex items-center transition-colors"
                      >
                        <FaSearch className="text-gray-300 mr-3 text-sm" />
                        <span className="font-semibold text-gray-700">{service.name}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-5 py-4 text-sm text-gray-500 text-center font-medium">
                      No services found for "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Icons */}
          <div className="flex items-center space-x-8">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="flex flex-col items-center justify-center text-gray-600 hover:text-gray-900 transition-colors focus:outline-none"
              >
                <div className="relative">
                  <FaBell size={22} className="text-gray-600" />
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white ring-2 ring-white">3</span>
                </div>
                <span className="text-xs font-semibold mt-1">Notifications</span>
              </button>
              
              {showNotifications && (
                <div className="absolute top-full right-0 mt-3 w-72 bg-white border border-gray-100 rounded-xl shadow-xl py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <span className="font-bold text-gray-900">Notifications</span>
                  </div>
                  <div className="p-4 text-center text-sm text-gray-500">
                    You have 3 new offers available!
                  </div>
                </div>
              )}
            </div>

            <a href="https://wa.me/917989862623" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center text-gray-600 hover:text-green-600 transition-colors">
              <FaWhatsapp size={24} className="text-green-500" />
              <span className="text-xs font-semibold mt-1">Help</span>
            </a>
            
            <Link to="/admin/login" className="flex flex-col items-center justify-center text-gray-600 hover:text-blue-600 transition-colors">
              <FaUserShield size={24} className="text-blue-500" />
              <span className="text-xs font-semibold mt-1">Admin</span>
            </Link>
          </div>

        </div>
        
        {/* Mobile Search Bar */}
        <div className="md:hidden pt-3 pb-1">
          <div className="w-full relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for services..."
              className="w-full pl-10 pr-10 py-2.5 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm"
            />
            <FaSearch className="absolute left-4 top-3.5 text-gray-400" />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-3 text-gray-400 hover:text-gray-600 focus:outline-none z-10"
              >
                <FaTimes size={14} />
              </button>
            )}
            
            {/* Mobile Search Results */}
            {searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden z-50">
                {filteredServices.length > 0 ? (
                  filteredServices.map(service => (
                    <button
                      key={service.id}
                      onClick={() => handleSearchSelect(service.id)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 flex items-center"
                    >
                      <FaSearch className="text-gray-300 mr-3 text-sm" />
                      <span className="font-semibold text-gray-700">{service.name}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500 text-center">
                    No services found.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
