import React, { useContext, useEffect } from 'react';
import { DataContext } from '../context/DataContext';
import { Link, useNavigate } from 'react-router-dom';
import { FaStar, FaArrowRight, FaCheckCircle, FaRegClock, FaHistory, FaChevronRight } from 'react-icons/fa';
import { 
  MdCleaningServices, 
  MdOutlineBathtub, 
  MdOutlineKitchen, 
  MdOutlineLocalLaundryService,
  MdPestControl
} from 'react-icons/md';
import { BiDish, BiCabinet } from 'react-icons/bi';
import { GiSofa } from 'react-icons/gi';

const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  const handleBookNow = (serviceId) => {
    navigate(`/book/${serviceId}`);
  };

  const { services: allServices, bannerConfig } = useContext(DataContext);

  const popularServices = [
    { id: 1, name: 'Home Cleaning', rating: 4.7, reviews: '1.2K', duration: '1 Hour', price: 99, img: 'https://placehold.co/400x300/ff7d00/ffffff?text=Home+Cleaning' },
    { id: 2, name: 'Bathroom Cleaning', rating: 4.7, reviews: '956', duration: '1 Hour', price: 99, img: 'https://placehold.co/400x300/ff7d00/ffffff?text=Bathroom+Cleaning' },
    { id: 3, name: 'Kitchen Cleaning', rating: 4.6, reviews: '1.1K', duration: '1 Hour', price: 99, img: 'https://placehold.co/400x300/ff7d00/ffffff?text=Kitchen+Cleaning' },
    { id: 4, name: 'Dish Washing', rating: 4.6, reviews: '893', duration: '1 Hour', price: 99, img: 'https://placehold.co/400x300/ff7d00/ffffff?text=Dish+Washing' },
    { id: 5, name: 'Laundry & Ironing', rating: 4.7, reviews: '787', duration: '1 Hour', price: 99, img: 'https://placehold.co/400x300/ff7d00/ffffff?text=Laundry' },
  ];

  return (
    <div className="bg-white min-h-screen pb-16">
      
      {/* 1. Hero Section */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-[#022b5e] rounded-3xl overflow-hidden relative flex flex-col md:flex-row shadow-lg h-[400px]">
          
          <div className="relative z-20 w-full md:w-3/5 p-8 md:p-14 flex flex-col justify-center">
            <div className="inline-block bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider mb-4 border border-orange-400 w-fit">
              Professional Home Services
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-2">
              Trusted Helpers.
            </h1>
            <h1 className="text-4xl md:text-5xl font-black text-orange-500 leading-tight mb-4">
              Book in Minutes.
            </h1>
            <p className="text-gray-300 text-sm md:text-base mb-8 max-w-md">
              Background verified professionals at your service
            </p>
            
            <div className="flex flex-wrap gap-6 mb-8">
              <div className="flex items-center text-white/90 text-xs font-medium">
                <FaCheckCircle className="text-white/50 mr-1.5" /> Verified Professionals
              </div>
              <div className="flex items-center text-white/90 text-xs font-medium">
                <FaCheckCircle className="text-white/50 mr-1.5" /> Background Checked
              </div>
              <div className="flex items-center text-white/90 text-xs font-medium">
                <FaRegClock className="text-white/50 mr-1.5" /> On-time Service
              </div>
              <div className="flex items-center text-white/90 text-xs font-medium">
                <FaCheckCircle className="text-white/50 mr-1.5" /> Satisfaction Guaranteed
              </div>
            </div>

            <button 
              onClick={() => document.getElementById('all-services').scrollIntoView({ behavior: 'smooth' })}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 px-8 rounded-xl flex items-center w-fit transition-all shadow-lg cursor-pointer"
            >
              Book a Service <FaArrowRight className="ml-2" />
            </button>
          </div>

          <div className="absolute right-0 bottom-0 h-full w-full md:w-1/2 z-0 overflow-hidden flex justify-end items-end pb-2 pr-6 md:pr-12 space-x-[-60px]">
            {/* Gradient Mask Overlay */}
            <div 
              className="absolute inset-0 z-30 pointer-events-none" 
              style={{ background: 'linear-gradient(to right, #022b5e 0%, transparent 50%)' }}
            ></div>
            
            {/* Image 1 (Left) */}
            <div className="relative z-10 h-[280px] w-[200px] transform rotate-[-8deg] translate-y-8 hover:z-40 hover:-translate-y-2 transition-all duration-500 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20 opacity-90 hover:opacity-100">
              <img src={`${import.meta.env.BASE_URL}images/kitchen.png`} className="w-full h-full object-cover" alt="Cleaner 1" />
            </div>
            {/* Image 2 (Center, Prominent) */}
            <div className="relative z-20 h-[340px] w-[220px] transform hover:z-40 hover:-translate-y-4 transition-all duration-500 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/40">
              <img src={`${import.meta.env.BASE_URL}images/dishwashing.png`} className="w-full h-full object-cover object-[70%_center]" alt="Cleaner 2" />
            </div>
            {/* Image 3 (Right) */}
            <div className="relative z-10 h-[280px] w-[200px] transform rotate-[8deg] translate-y-8 hover:z-40 hover:-translate-y-2 transition-all duration-500 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20 opacity-90 hover:opacity-100">
              <img src={`${import.meta.env.BASE_URL}images/bathroom.png`} className="w-full h-full object-cover object-[30%_center]" alt="Cleaner 3" />
            </div>
          </div>

          {/* Badge Overlay */}
          <div className="absolute bottom-6 right-6 z-20 bg-white px-4 py-2 rounded-xl flex items-center shadow-xl border border-gray-100">
            <div className="bg-blue-600 rounded-full p-1 mr-3 text-white">
              <FaCheckCircle />
            </div>
            <div className="text-sm font-bold text-gray-800 leading-tight">
              100% Safe &<br />Reliable Service
            </div>
          </div>
        </div>
      </section>

      {/* 2. All Services Grid */}
      <section id="all-services" className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-16 mb-16 pt-4">
        <div className="flex justify-between items-end mb-8">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Our Premium Services</h2>
          <button 
            onClick={() => document.getElementById('all-services').scrollIntoView({ behavior: 'smooth' })} 
            className="text-sm font-bold text-blue-600 flex items-center hover:text-blue-700 transition-colors cursor-pointer bg-blue-50 px-4 py-2 rounded-full"
          >
            Explore All <FaArrowRight className="ml-2 text-xs" />
          </button>
        </div>
        
        {/* 3 vertical (columns) grid for 6 items total = 3x2 grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
          {allServices.map((service, idx) => (
            <Link 
              to={`/service/${service.id}`} 
              key={idx} 
              className="bg-white rounded-[32px] overflow-hidden shadow-[0_10px_40px_rgb(0,0,0,0.06)] hover:shadow-[0_10px_40px_rgb(0,0,0,0.12)] border border-gray-100 transition-all duration-300 group flex flex-col transform hover:-translate-y-2"
            >
              <div className="w-full aspect-[4/3] overflow-hidden relative">
                <img 
                  src={service.image} 
                  alt={service.name} 
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-in-out" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <div className="p-6 md:p-8 w-full text-center bg-white relative z-10 flex flex-col items-center justify-center">
                <h3 className="font-black text-gray-900 text-lg md:text-2xl tracking-tight mb-2">
                  {service.name}
                </h3>
                <div className="w-10 h-1 bg-blue-500 rounded-full mb-3 transform origin-left group-hover:scale-x-150 transition-transform duration-300"></div>
                <span className="text-blue-600 text-sm font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                  Book Now <FaArrowRight className="ml-1.5 text-xs" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Promotional / Festive Offer Banner (Dynamic from Admin) */}
      {bannerConfig && bannerConfig.isActive !== false && (
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-14">
          <div className={`relative rounded-[32px] overflow-hidden shadow-2xl p-8 md:p-12 text-white flex flex-col lg:flex-row items-center justify-between gap-8 border-2 ${
            bannerConfig.theme === 'blue' ? 'bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#2563eb] border-blue-300/40' :
            bannerConfig.theme === 'purple' ? 'bg-gradient-to-br from-[#3b0764] via-[#6b21a8] to-[#9333ea] border-purple-300/40' :
            bannerConfig.theme === 'emerald' ? 'bg-gradient-to-br from-[#022c22] via-[#065f46] to-[#059669] border-emerald-300/40' :
            bannerConfig.theme === 'rose' ? 'bg-gradient-to-br from-[#4c0519] via-[#9f1239] to-[#e11d48] border-rose-300/40' :
            'bg-gradient-to-br from-[#78350f] via-[#b45309] to-[#d97706] border-amber-300/40'
          }`}>
            {/* Decorative Festive Background Glows */}
            <div className="absolute -top-24 -right-24 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-black/20 rounded-full blur-3xl pointer-events-none"></div>

            {/* Left Content */}
            <div className="relative z-10 max-w-2xl text-center lg:text-left">
              {bannerConfig.badgeText && (
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md text-white text-xs md:text-sm font-black px-4 py-1.5 rounded-full uppercase tracking-wider mb-4 border border-white/30 shadow-sm">
                  {bannerConfig.badgeText}
                </div>
              )}
              <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-3 tracking-tight">
                {bannerConfig.title || 'Special Festive Offer'}
              </h2>
              <p className="text-white/90 text-sm md:text-lg mb-6 leading-relaxed">
                {bannerConfig.subtitle || 'Book now and enjoy exclusive discounts on all home services!'}
              </p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                <button 
                  onClick={() => {
                    const el = document.getElementById('all-services');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-white hover:bg-gray-100 text-gray-900 font-black py-4 px-8 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 text-base md:text-lg flex items-center gap-2 cursor-pointer border border-white/80"
                >
                  <span>{bannerConfig.ctaText || 'Book Service Now'}</span>
                  <FaArrowRight className="text-gray-700" />
                </button>
                <div className="text-xs md:text-sm text-white/90 font-bold flex items-center gap-2 bg-black/20 px-4 py-3 rounded-2xl backdrop-blur-sm border border-white/10">
                  <FaCheckCircle className="text-emerald-400 text-base" /> Auto-applied on all services
                </div>
              </div>
            </div>

            {/* Right Festive Emblem / Promo Badge */}
            <div className="relative z-10 flex-shrink-0 flex flex-col items-center justify-center bg-black/25 backdrop-blur-md rounded-[28px] p-6 md:p-8 border border-white/20 text-center min-w-[240px]">
              <div className="text-5xl md:text-6xl mb-2">🪔</div>
              <span className="text-white/80 text-xs font-bold tracking-widest uppercase">Special Discount</span>
              <div className="text-4xl md:text-5xl font-black text-white my-1">
                {bannerConfig.discountBadge || `${bannerConfig.discountPercent || 20}% OFF`}
              </div>
              <span className="text-xs text-white/70 font-medium">Coupon Code</span>
              <div className="mt-2 bg-amber-400 text-amber-950 font-mono font-black px-4 py-1.5 rounded-xl text-sm tracking-wider shadow-inner">
                {bannerConfig.couponCode || 'DUSSEHRA'}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 6. Trust Section */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-16 pt-8 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="flex items-start">
            <div className="text-gray-700 text-3xl mr-4">📝</div>
            <div>
              <h4 className="font-bold text-sm text-gray-900 mb-1">Easy Booking</h4>
              <p className="text-xs text-gray-500 leading-tight">Book your service<br/>in just a few taps</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="text-gray-700 text-3xl mr-4">🛡️</div>
            <div>
              <h4 className="font-bold text-sm text-gray-900 mb-1">Verified Helpers</h4>
              <p className="text-xs text-gray-500 leading-tight">Background checked<br/>& trained professionals</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="text-gray-700 text-3xl mr-4">₹</div>
            <div>
              <h4 className="font-bold text-sm text-gray-900 mb-1">Transparent Pricing</h4>
              <p className="text-xs text-gray-500 leading-tight">No hidden charges,<br/>what you see is what you pay</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="text-gray-700 text-3xl mr-4">🎧</div>
            <div>
              <h4 className="font-bold text-sm text-gray-900 mb-1">24/7 Support</h4>
              <p className="text-xs text-gray-500 leading-tight">We are here to<br/>help you anytime</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;
