import React, { useContext } from 'react';
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

  const handleBookNow = (serviceId) => {
    navigate(`/book/${serviceId}`);
  };

  const { services: allServices } = useContext(DataContext);

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

      {/* 3. Offers for you */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <h2 className="text-3xl font-black text-gray-900 mb-8 tracking-tight">Offers for you</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          
          {/* Card 1 */}
          <Link to="/offer/first-booking" className="bg-orange-50 rounded-[24px] p-8 relative overflow-hidden border border-orange-100 flex flex-col hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
            <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider w-fit mb-4">NEW USER</span>
            <h3 className="text-xl font-black text-gray-900 mb-2">First Booking Offer</h3>
            <p className="text-sm font-medium text-gray-600 mb-8 max-w-[180px]">Get 20% OFF on your first service</p>
            <div className="mt-auto">
              <span className="text-3xl font-black text-orange-500">20% <span className="text-sm font-bold text-gray-500">OFF</span></span>
            </div>
            <div className="absolute right-[-10px] bottom-[-10px] text-[100px] transform group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">🎁</div>
          </Link>

          {/* Card 2 */}
          <Link to="/offer/festival" className="bg-blue-50 rounded-[24px] p-8 relative overflow-hidden border border-blue-100 flex flex-col hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
            <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider w-fit mb-4">FESTIVAL</span>
            <h3 className="text-xl font-black text-gray-900 mb-2">Festival Special</h3>
            <p className="text-sm font-medium text-gray-600 mb-8 max-w-[180px]">Upto ₹200 OFF on selected services</p>
            <div className="mt-auto flex flex-col leading-tight">
              <span className="text-xs text-blue-500 font-bold mb-1 tracking-wider">UPTO</span>
              <span className="text-3xl font-black text-blue-600">₹200 <span className="text-sm font-bold text-gray-500">OFF</span></span>
            </div>
            <div className="absolute right-4 bottom-2 text-[80px] transform group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-500">🪔</div>
          </Link>

          {/* Card 3 */}
          <Link to="/offer/weekend" className="bg-green-50 rounded-[24px] p-8 relative overflow-hidden border border-green-100 flex flex-col hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
            <span className="bg-green-100 text-green-700 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider w-fit mb-4">WEEKEND</span>
            <h3 className="text-xl font-black text-gray-900 mb-2">Weekend Bonanza</h3>
            <p className="text-sm font-medium text-gray-600 mb-8 max-w-[180px]">Flat ₹150 OFF on all bookings above ₹799</p>
            <div className="mt-auto flex flex-col leading-tight">
              <span className="text-xs text-green-600 font-bold mb-1 tracking-wider">FLAT</span>
              <span className="text-3xl font-black text-green-600">₹150 <span className="text-sm font-bold text-gray-500">OFF</span></span>
            </div>
            <div className="absolute right-4 bottom-2 text-[80px] transform group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">📅</div>
          </Link>
        </div>
      </section>

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
