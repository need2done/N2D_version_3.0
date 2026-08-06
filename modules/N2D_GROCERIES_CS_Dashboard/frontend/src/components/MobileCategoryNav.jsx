import React, { useState, useEffect } from 'react';
import { 
  Milk, Droplet, Wheat, Bean, Flame, Nut, Cookie, Coffee, 
  CupSoda, Drumstick, SprayCan, Heart, Baby, Home, ShoppingBag, Snowflake
} from 'lucide-react';

const iconMap = {
  'Milk': Milk,
  'Droplet': Droplet,
  'Wheat': Wheat,
  'Bean': Bean,
  'Flame': Flame,
  'Nut': Nut,
  'Cookie': Cookie,
  'Coffee': Coffee,
  'CupSoda': CupSoda,
  'Drumstick': Drumstick,
  'SprayCan': SprayCan,
  'Heart': Heart,
  'Baby': Baby,
  'Home': Home,
  'Snowflake': Snowflake,
};

const MobileCategoryNav = ({ activeCategory, setActiveCategory, searchQuery, isOpen, onClose }) => {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetch('/api/groceries/categories')
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(err => console.error('Error fetching categories:', err));
  }, []);

  const searchLower = (searchQuery || '').toLowerCase().trim();
  const displayCategories = searchLower 
    ? categories.filter(c => c.name.toLowerCase().includes(searchLower))
    : categories;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div 
        className={`fixed top-0 left-0 h-full w-[280px] bg-white z-50 transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h2 className="font-bold text-lg text-gray-800">Categories</h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <span className="text-xl leading-none">&times;</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {displayCategories.map((cat) => {
            const Icon = iconMap[cat.icon] || ShoppingBag;
            const isActive = activeCategory === cat.id;
            
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  onClose();
                }}
                className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all text-left ${
                  isActive 
                    ? 'bg-primary/10 border-l-4 border-primary shadow-sm' 
                    : 'hover:bg-gray-50 border-l-4 border-transparent'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isActive ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-500'
                }`}>
                  <Icon size={20} />
                </div>
                <span className={`font-semibold text-sm ${
                  isActive ? 'text-primary' : 'text-gray-700'
                }`}>
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default MobileCategoryNav;
