import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

const SLIDES = [
  {
    id: 1,
    badge: '🔥 Hot Deal',
    title: '50% OFF',
    sub: 'ON YOUR FIRST ORDER',
    desc: 'Use code FIRST50 and enjoy half off on your first delicious meal from any restaurant.',
    cta: 'Order Now',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=500&fit=crop',
    color: '#FF6B00',
  },
  {
    id: 2,
    badge: '🎉 Weekend Only',
    title: 'WEEKEND SPECIALS',
    sub: 'SATURDAY & SUNDAY DEALS',
    desc: 'Celebrate your weekend with exclusive deals and up to ₹100 cashback on top family restaurants.',
    cta: 'Explore Offers',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&h=500&fit=crop',
    color: '#FF8C38',
  },
  {
    id: 3,
    badge: '🚀 Free Delivery',
    title: 'FREE DELIVERY',
    sub: 'ON ORDERS ABOVE ₹199',
    desc: 'Hungry? Enjoy zero delivery charges on your favorite dishes delivered straight to your door.',
    cta: 'Order Free',
    image: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=1200&h=500&fit=crop',
    color: '#2E7D32',
  },
  {
    id: 4,
    badge: '✨ New Arrivals',
    title: 'NEW RESTAURANTS',
    sub: 'JUST ARRIVED IN BHONGIR',
    desc: 'Discover freshly onboarded local spots offering incredible launch discounts.',
    cta: 'Discover Taste',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&h=500&fit=crop',
    color: '#1565C0',
  },
  {
    id: 5,
    badge: '🎊 Festival Feast',
    title: 'FESTIVAL OFFERS',
    sub: 'CELEBRATE WITH GREAT FOOD',
    desc: 'Special festive family combos and sweet platters at unbeatable prices.',
    cta: 'Order Feast',
    image: 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=1200&h=500&fit=crop',
    color: '#E55A00',
  },
];

const INTERVAL = 5000;

export default function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const next = useCallback(() => setCurrent(c => (c + 1) % SLIDES.length), []);
  const prev = useCallback(() => setCurrent(c => (c - 1 + SLIDES.length) % SLIDES.length), []);

  useEffect(() => {
    const t = setInterval(next, INTERVAL);
    return () => clearInterval(t);
  }, [next]);

  const slide = SLIDES[current];

  return (
    <div className="relative overflow-hidden rounded-3xl h-[280px] sm:h-[340px] md:h-[400px] w-full shadow-card border border-gray-100">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 w-full h-full"
        >
          {/* Background Image */}
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover"
          />
          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-transparent" />

          {/* Slide Text Content */}
          <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-12 md:px-16 py-8 max-w-xl md:max-w-2xl z-10 text-white">
            <motion.span
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold w-fit border border-white/20 uppercase tracking-wider mb-3 text-brand-orange-light"
              style={{ color: slide.color }}
            >
              {slide.badge}
            </motion.span>
            
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="font-display font-black leading-tight text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight text-white uppercase"
            >
              {slide.title}
            </motion.h1>

            <motion.p
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-xs sm:text-sm font-bold tracking-widest text-gray-300 mt-1 uppercase"
            >
              {slide.sub}
            </motion.p>

            <motion.p
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-xs sm:text-sm text-gray-400 font-medium leading-relaxed mt-3 hidden sm:block max-w-md md:max-w-lg"
            >
              {slide.desc}
            </motion.p>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 flex items-center gap-4"
            >
              <button
                className="px-6 py-3 text-white font-bold rounded-xl text-xs sm:text-sm tracking-wider transition-all duration-200 shadow-lg hover:brightness-110 active:scale-95"
                style={{ backgroundColor: '#FF6B00' }}
              >
                {slide.cta}
              </button>
              {/* Slide indicators inside the banner */}
              <div className="flex gap-2 ml-4">
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`transition-all duration-300 rounded-full h-1.5 ${
                      i === current ? 'w-6' : 'w-1.5'
                    }`}
                    style={{ backgroundColor: i === current ? '#FF6B00' : 'rgba(255,255,255,0.3)' }}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/35 hover:bg-black/55 border border-white/10 rounded-full flex items-center justify-center text-white transition-all z-20 hover:scale-105"
      >
        <ArrowBackIosNewIcon style={{ fontSize: 14 }} />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/35 hover:bg-black/55 border border-white/10 rounded-full flex items-center justify-center text-white transition-all z-20 hover:scale-105"
      >
        <ArrowForwardIosIcon style={{ fontSize: 14 }} />
      </button>
    </div>
  );
}
