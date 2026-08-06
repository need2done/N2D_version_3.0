import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { categories } from '../../data/categories';

export default function CategoryCarousel({ onSelect }) {
  const [active, setActive] = useState(null);
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * 240, behavior: 'smooth' });
  };

  const handleSelect = (cat) => {
    const next = active === cat.id ? null : cat.id;
    setActive(next);
    onSelect?.(next ? cat.name : null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-bold text-base text-text-primary">Explore by Categories</h2>
        <div className="flex items-center gap-3">
          <button className="text-xs text-brand-orange font-semibold hover:underline">View All</button>
          <div className="flex gap-1">
            <button onClick={() => scroll(-1)} className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center hover:border-brand-orange hover:text-brand-orange transition-colors">
              <ArrowBackIosNewIcon style={{ fontSize: 10 }} />
            </button>
            <button onClick={() => scroll(1)} className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center hover:border-brand-orange hover:text-brand-orange transition-colors">
              <ArrowForwardIosIcon style={{ fontSize: 10 }} />
            </button>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
        {categories.map(cat => (
          <motion.button
            key={cat.id}
            onClick={() => handleSelect(cat)}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.95 }}
            className="flex-shrink-0 flex flex-col items-center gap-2 w-[130px] group"
          >
            <div className={`relative w-[130px] h-[96px] rounded-2xl overflow-hidden shadow-sm border-2 transition-all ${
              active === cat.id
                ? 'border-brand-orange shadow-orange'
                : 'border-transparent group-hover:shadow-md'
            }`}>
              {/* Background Image */}
              <img
                src={cat.image}
                alt={cat.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                loading="lazy"
              />
            </div>

            {/* Name Below */}
            <span className={`font-display font-bold text-[13px] tracking-wide uppercase text-center transition-colors ${
              active === cat.id ? 'text-brand-orange' : 'text-gray-700 group-hover:text-gray-900'
            }`}>
              {cat.name}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
