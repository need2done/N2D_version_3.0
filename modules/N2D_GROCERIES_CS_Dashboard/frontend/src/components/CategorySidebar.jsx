import React, { useState, useEffect } from 'react';
import { 
  Milk, 
  Droplet, 
  Wheat, 
  Bean, 
  Flame, 
  Nut, 
  Cookie, 
  Coffee, 
  CupSoda, 
  Drumstick, 
  SprayCan, 
  Heart, 
  Baby, 
  Home, 
  ChevronRight,
  ShoppingBag,
  Snowflake
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

const CategorySidebar = ({ activeCategory, setActiveCategory, searchQuery }) => {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetch('/api/groceries/categories')
      .then(res => res.json())
      .then(data => {
        setCategories(data);
      })
      .catch(err => console.error('Error fetching categories:', err));
  }, []);

  const searchLower = (searchQuery || '').toLowerCase().trim();
  const displayCategories = searchLower 
    ? categories.filter(c => c.name.toLowerCase().includes(searchLower))
    : categories;

  return (
    <div className="w-64 flex-shrink-0 bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden hidden lg:block sticky top-24 self-start h-[calc(100vh-120px)] overflow-y-auto">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-800 text-lg">Categories</h3>
      </div>
      <ul className="py-2">
        {displayCategories.map((cat) => {
          const Icon = iconMap[cat.icon] || ShoppingBag;
          const isActive = activeCategory === cat.id;
          return (
            <li key={cat.id}>
              <button
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50 transition-colors group ${
                  isActive ? 'bg-blue-50 border-r-4 border-primary text-primary' : 'text-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg flex-shrink-0 transition-colors ${isActive ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary'}`}>
                    <Icon size={18} />
                  </div>
                  <span className={`font-medium text-sm text-left ${isActive ? 'text-primary' : 'text-gray-700'}`}>
                    {cat.name}
                  </span>
                </div>
                {isActive && <ChevronRight size={16} className="text-primary" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default CategorySidebar;
