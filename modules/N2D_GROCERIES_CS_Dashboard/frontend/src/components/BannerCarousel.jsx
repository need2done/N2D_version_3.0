import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const banners = [
  { id: 1, color: 'bg-gradient-to-r from-blue-600 to-blue-400', title: 'Weekend Sale', subtitle: 'Flat 50% Off on Groceries', image: 'https://placehold.co/600x300/1565FF/FFFFFF?text=Weekend+Sale' },
  { id: 2, color: 'bg-gradient-to-r from-orange-500 to-yellow-400', title: 'Festival Offers', subtitle: 'Buy More Save More', image: 'https://placehold.co/600x300/FF9800/FFFFFF?text=Festival+Offers' },
];

const BannerCarousel = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const next = () => setCurrent((prev) => (prev + 1) % banners.length);
  const prev = () => setCurrent((prev) => (prev - 1 + banners.length) % banners.length);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden mb-8 shadow-sm group h-[200px] md:h-[300px]">
      {/* Slides */}
      <div 
        className="flex transition-transform duration-500 ease-in-out h-full"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {banners.map((banner) => (
          <div key={banner.id} className="min-w-full h-full relative">
            <img src={banner.image} alt={banner.title} className="absolute inset-0 w-full h-full object-cover opacity-90" />
            <div className={`absolute inset-0 opacity-50 ${banner.color}`}></div>
            <div className="absolute inset-0 flex flex-col justify-center p-8 md:p-12 text-white">
              <h2 className="text-3xl md:text-5xl font-bold mb-2 md:mb-4">{banner.title}</h2>
              <p className="text-lg md:text-2xl font-medium opacity-90">{banner.subtitle}</p>
              <button className="mt-6 bg-white text-gray-900 px-6 py-2 md:px-8 md:py-3 rounded-xl font-bold w-max hover:bg-gray-50 transition-colors shadow-sm">
                Shop Now
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <button 
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-white"
      >
        <ChevronLeft size={24} />
      </button>
      <button 
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-white"
      >
        <ChevronRight size={24} />
      </button>

      {/* Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {banners.map((_, idx) => (
          <button 
            key={idx}
            onClick={() => setCurrent(idx)}
            className={`h-2 rounded-full transition-all ${current === idx ? 'w-6 bg-white' : 'w-2 bg-white/50'}`}
          />
        ))}
      </div>
    </div>
  );
};

export default BannerCarousel;
