import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchIcon from '@mui/icons-material/Search';
import FoodCard from './FoodCard';
import { SkeletonFoodCard } from '../ui/SkeletonCard';
import EmptyState from '../ui/EmptyState';

export default function MenuSection({ menu, restaurantId, restaurantName, onAddItem }) {
  const categories = Object.keys(menu);
  const [activeCategory, setActiveCategory] = useState(categories[0] || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const categoryRefs = useRef({});
  const navRef = useRef(null);

  // Filter items by search
  const filteredMenu = {};
  categories.forEach(cat => {
    const items = menu[cat].filter(item =>
      searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (items.length > 0) filteredMenu[cat] = items;
  });

  const handleCategoryClick = (cat) => {
    setActiveCategory(cat);
    categoryRefs.current[cat]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Scroll nav item into view
    const navItem = navRef.current?.querySelector(`[data-cat="${cat}"]`);
    navItem?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  // Intersection Observer to update active category on scroll
  useEffect(() => {
    const observers = [];
    categories.forEach(cat => {
      const el = categoryRefs.current[cat];
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveCategory(cat); },
        { threshold: 0.3, rootMargin: '-80px 0px 0px 0px' }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, [categories.join(',')]);

  const visibleCategories = Object.keys(filteredMenu);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sticky Category Nav (sidebar on desktop, top bar on mobile) */}
      <div className="lg:w-56 flex-shrink-0">
        <div className="lg:sticky lg:top-20">
          {/* Search within menu */}
          <div className="relative mb-4">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" style={{ fontSize: 16 }} />
            <input
              type="text"
              placeholder="Search in menu..."
              className="input-field pl-9 text-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Category tabs — horizontal scroll on mobile, vertical list on desktop */}
          <nav
            ref={navRef}
            className="flex lg:flex-col gap-1 overflow-x-auto no-scrollbar lg:overflow-x-visible pb-2 lg:pb-0"
          >
            {categories.map(cat => (
              <button
                key={cat}
                data-cat={cat}
                onClick={() => handleCategoryClick(cat)}
                className={`flex-shrink-0 lg:w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                  activeCategory === cat
                    ? 'bg-brand-orange text-white shadow-orange'
                    : 'text-text-secondary hover:bg-brand-orange-pale hover:text-brand-orange'
                }`}
              >
                {cat}
                <span className={`ml-1 text-xs ${activeCategory === cat ? 'text-white/80' : 'text-text-muted'}`}>
                  ({menu[cat]?.length || 0})
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 min-w-0 space-y-10">
        {visibleCategories.length === 0 ? (
          <EmptyState icon="🔍" title="No items found" subtitle={`No menu items match "${searchQuery}"`} />
        ) : (
          visibleCategories.map(cat => (
            <section
              key={cat}
              ref={el => (categoryRefs.current[cat] = el)}
              id={`menu-${cat.replace(/\s+/g, '-').toLowerCase()}`}
            >
              {/* Category Header */}
              <div className="flex items-center gap-3 mb-4">
                <h3 className="font-display font-bold text-text-primary text-lg">{cat}</h3>
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-text-muted">{filteredMenu[cat].length} items</span>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <AnimatePresence>
                  {filteredMenu[cat].map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05, duration: 0.3 }}
                    >
                      <FoodCard
                        item={item}
                        restaurantId={restaurantId}
                        restaurantName={restaurantName}
                        onAddClick={onAddItem}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
