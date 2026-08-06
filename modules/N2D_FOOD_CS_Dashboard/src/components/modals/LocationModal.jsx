import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CloseIcon from '@mui/icons-material/Close';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SearchIcon from '@mui/icons-material/Search';
import MyLocationIcon from '@mui/icons-material/MyLocation';

const POPULAR_CITIES = [
  'Bhongir, Telangana',
  'Hyderabad, Telangana',
  'Warangal, Telangana',
  'Secunderabad, Telangana',
  'Karimnagar, Telangana',
  'Nizamabad, Telangana',
];

export default function LocationModal({ isOpen, onClose, currentLocation, onSelectLocation }) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredCities = POPULAR_CITIES.filter(city => 
    city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (city) => {
    onSelectLocation(city);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-800">Select Delivery Location</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <CloseIcon className="text-gray-500" />
            </button>
          </div>

          <div className="p-4">
            {/* Search Input */}
            <div className="relative mb-6">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search for your city or area..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-orange focus:bg-white transition-colors"
                autoFocus
              />
            </div>

            {/* Current Location Button */}
            <button
              onClick={() => handleSelect('Current Location (GPS)')}
              className="w-full flex items-center gap-3 p-3 mb-4 rounded-xl border border-gray-100 hover:border-brand-orange hover:bg-orange-50 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-brand-orange group-hover:bg-brand-orange group-hover:text-white transition-colors">
                <MyLocationIcon fontSize="small" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-brand-orange">Use current location</p>
                <p className="text-xs text-gray-500">Using GPS</p>
              </div>
            </button>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">Popular Cities</p>
              <div className="max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredCities.length > 0 ? (
                  filteredCities.map((city, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelect(city)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors ${
                        currentLocation === city ? 'bg-orange-50 border border-brand-orange' : 'border border-transparent'
                      }`}
                    >
                      <LocationOnIcon fontSize="small" className={currentLocation === city ? 'text-brand-orange' : 'text-gray-400'} />
                      <span className={`text-sm ${currentLocation === city ? 'font-bold text-brand-orange' : 'font-medium text-gray-700'}`}>
                        {city}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-500 text-sm">No cities found matching "{searchQuery}"</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
