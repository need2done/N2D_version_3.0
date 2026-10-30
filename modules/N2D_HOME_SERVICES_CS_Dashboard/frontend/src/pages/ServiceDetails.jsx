import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DataContext } from '../context/DataContext';
import { FaStar, FaClock, FaRegClock, FaCheckCircle, FaTimesCircle, FaShieldAlt } from 'react-icons/fa';

const ServiceDetails = () => {
  const { id } = useParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  const { services } = useContext(DataContext);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  useEffect(() => {
    setTimeout(() => {
      const selectedData = services.find(s => s.id.toString() === id) || services[0];
      setService({
        id: selectedData.id,
        name: selectedData.name,
        description: selectedData.description,
        rating: selectedData.rating || 4.8,
        review_count: selectedData.reviewCount || 120,
        base_price: selectedData.base_price,
        base_duration: selectedData.duration,
        image_url: selectedData.image,
        is_custom: Boolean(selectedData.is_custom || (selectedData.custom_options && selectedData.custom_options.length > 0)),
        custom_options: selectedData.custom_options || [],
        whats_included: selectedData.whats_included || ['Washing all utensils', 'Cleaning the sink area', 'Arranging dried utensils'],
        whats_not_included: selectedData.whats_not_included || ['Scrubbing burnt vessels deeply', 'Cleaning kitchen slabs']
      });
      setLoading(false);
    }, 500);
  }, [id, services]);

  if (loading) return <div className="text-center py-20">Loading details...</div>;
  if (!service) return <div className="text-center py-20">Service not found.</div>;

  return (
    <div className="bg-white">
      {/* 2. Hero Banner */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="relative h-[300px] md:h-[400px] bg-[#022b5e] rounded-[32px] overflow-hidden shadow-2xl flex items-center">
          
          {/* Right Side Image (No vertical cropping issues) */}
          <div className="absolute right-0 top-0 bottom-0 w-full md:w-1/2 z-0">
            <div className="absolute inset-0 bg-gradient-to-r from-[#022b5e] via-transparent to-transparent z-10 hidden md:block"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#022b5e] via-transparent to-transparent z-10 md:hidden"></div>
            <img src={service.image_url} alt={service.name} className="w-full h-full object-cover object-center md:object-[center_20%] opacity-60 md:opacity-100" />
          </div>

          {/* Left Side Content */}
          <div className="relative z-20 w-full md:w-1/2 p-8 md:p-16 text-white">
            <h1 className="text-4xl md:text-6xl font-black mb-6 drop-shadow-lg tracking-tight leading-tight">{service.name}</h1>
            <div className="flex items-center text-sm md:text-base font-bold drop-shadow-md bg-white/10 w-fit px-5 py-2.5 rounded-full backdrop-blur-md border border-white/20">
              <FaStar className="text-orange-400 mr-2 text-lg" /> {service.rating} ({service.review_count} Reviews) 
              <span className="mx-4 opacity-40">|</span> 
              {(service.id === 2 || service.name?.toLowerCase().includes('laundry')) ? (
                <span className="flex items-center text-orange-300">
                  <span className="mr-1.5 text-lg">🚚</span> Return in 12 - 48 Hours
                </span>
              ) : (
                <span className="flex items-center">
                  <FaRegClock className="mr-2 text-orange-400 text-lg" /> {service.base_duration}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          <div className="lg:col-span-2 space-y-12">
            <section>
              <h2 className="text-3xl font-black text-gray-900 mb-5 tracking-tight">About this service</h2>
              <p className="text-gray-800 leading-relaxed text-base md:text-lg font-medium">{service.description}</p>
            </section>

            {/* Sub-Tasks & Pricing Breakdown (Laundry, Custom, etc.) */}
            {service.custom_options && service.custom_options.length > 0 && (
              <section className="bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-blue-50/60 border border-blue-200/80 p-6 md:p-8 rounded-[28px] shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
                  <div>
                    <h3 className="text-xl md:text-2xl font-black text-gray-900 flex items-center gap-2">
                      <span className="text-blue-600">⚡</span> Sub-Services & Pricing Breakdown
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600 font-medium mt-1">
                      Pick any or all tasks during booking. You only pay for what you select!
                    </p>
                  </div>
                  <span className="self-start sm:self-auto bg-blue-600 text-white text-[11px] font-black px-3.5 py-1 rounded-full uppercase tracking-wider shadow-xs">
                    Customizable
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {service.custom_options.map((opt, idx) => (
                    <div key={opt.id || idx} className="bg-white p-4 rounded-2xl border border-blue-100/80 shadow-xs flex items-center justify-between hover:shadow-md transition-shadow">
                      <div className="min-w-0 pr-3">
                        <h4 className="font-bold text-gray-900 text-sm">{opt.name}</h4>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">
                          {(service.id === 2 || service.name?.toLowerCase().includes('laundry')) ? 'Care: Professional Laundry Work' : `Est. ${opt.duration}`}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-lg font-black text-blue-700">
                          ₹{opt.price}{(service.id === 2 || service.name?.toLowerCase().includes('laundry')) ? ' / cloth' : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 pt-4 border-t border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold text-blue-900">
                  <span>
                    {(service.id === 2 || service.name?.toLowerCase().includes('laundry')) 
                      ? '💡 Per-piece pricing: Select your exact clothes & quantities on booking • Return in 12 - 48 Hrs' 
                      : `💡 Complete Combo / Starting Base: ₹${service.base_price}`}
                  </span>
                  <Link to={`/book/${service.id}`} className="text-blue-600 hover:underline">
                    Configure & Book ➔
                  </Link>
                </div>
              </section>
            )}

            {/* Supported Clothes & Items Guide for Laundry */}
            {(service.id === 2 || service.name?.toLowerCase().includes('laundry')) && (
              <section className="bg-white border-2 border-blue-100 p-6 md:p-8 rounded-[28px] shadow-sm">
                <div className="mb-4">
                  <h3 className="text-xl md:text-2xl font-black text-gray-900 flex items-center gap-2">
                    <span className="text-blue-600">👔</span> Supported Clothes & Items
                  </h3>
                  <p className="text-xs md:text-sm text-gray-500 font-medium mt-1">
                    Every piece has an itemized rate based on your selected tasks (Wash, Dry, Steam Iron, Fold).
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { name: 'Shirt / T-Shirt', icon: '👔', price: 'from ₹10/pc' },
                    { name: 'Trousers / Jeans', icon: '👖', price: 'from ₹12/pc' },
                    { name: 'Kurti / Top / Salwar', icon: '👗', price: 'from ₹10/pc' },
                    { name: 'Saree (Daily/Cotton)', icon: '🥻', price: 'from ₹25/pc' },
                    { name: 'Bedsheet (Single/Dbl)', icon: '🛏️', price: 'from ₹25/pc' },
                    { name: 'Bath Towels & Linens', icon: '🛁', price: 'from ₹5/pc' }
                  ].map((g, i) => (
                    <div key={i} className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center gap-2.5">
                      <span className="text-2xl">{g.icon}</span>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900">{g.name}</h4>
                        <span className="text-[11px] font-black text-blue-700">{g.price}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* How It Works for Laundry */}
            {(service.id === 2 || service.name?.toLowerCase().includes('laundry')) && (
              <section className="bg-gradient-to-br from-blue-950 via-indigo-950 to-blue-900 text-white p-6 md:p-8 rounded-[28px] shadow-lg border border-blue-800/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <div>
                    <span className="bg-blue-500/25 text-blue-200 text-xs font-black uppercase px-3 py-1 rounded-full border border-blue-400/30">
                      ⚡ 4-Step Easy Service
                    </span>
                    <h3 className="text-2xl font-black mt-2">How Laundry Doorstep Works</h3>
                  </div>
                  <span className="text-xs font-bold text-blue-200 bg-white/10 px-3 py-1 rounded-lg w-fit">
                    Doorstep Pickup & Return in 12 - 48 Hrs
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-xs">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-black text-sm mb-3 shadow-md">1</div>
                    <h4 className="font-bold text-sm text-white mb-1">Pick Clothes & Tasks</h4>
                    <p className="text-xs text-blue-100 font-medium leading-relaxed">Select clothes and pick only the tasks you want (Wash, Dry, Steam Press, Fold).</p>
                  </div>
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-xs">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-black text-sm mb-3 shadow-md">2</div>
                    <h4 className="font-bold text-sm text-white mb-1">Doorstep Bag Pickup</h4>
                    <p className="text-xs text-blue-100 font-medium leading-relaxed">Our verified runner collects your laundry directly from your doorstep at your chosen slot.</p>
                  </div>
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-xs">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-black text-sm mb-3 shadow-md">3</div>
                    <h4 className="font-bold text-sm text-white mb-1">Hygienic Care & Press</h4>
                    <p className="text-xs text-blue-100 font-medium leading-relaxed">100% separated wash (never mixed), skin-safe detergents & crisp steam pressing.</p>
                  </div>
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-xs">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-black text-sm mb-3 shadow-md">4</div>
                    <h4 className="font-bold text-sm text-white mb-1">Returned in 12 - 48h</h4>
                    <p className="text-xs text-blue-100 font-medium leading-relaxed">Delivered back fresh, neatly folded in protective covers, ready to hang or wear.</p>
                  </div>
                </div>
              </section>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <section className="bg-emerald-50/80 border border-emerald-200/70 p-6 md:p-7 rounded-[26px]">
                <h3 className="text-xl font-black text-emerald-900 mb-4 flex items-center gap-2">
                  <FaCheckCircle className="text-emerald-600 text-lg" /> What's Included
                </h3>
                <ul className="space-y-3">
                  {service.whats_included.map((item, idx) => (
                    <li key={idx} className="flex items-start text-emerald-950 font-medium text-sm leading-relaxed">
                      <span className="text-emerald-600 font-black mr-2 mt-0.5">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="bg-rose-50/80 border border-rose-200/70 p-6 md:p-7 rounded-[26px]">
                <h3 className="text-xl font-black text-rose-900 mb-4 flex items-center gap-2">
                  <FaTimesCircle className="text-rose-600 text-lg" /> What's Not Included
                </h3>
                <ul className="space-y-3">
                  {service.whats_not_included.map((item, idx) => (
                    <li key={idx} className="flex items-start text-rose-950 font-medium text-sm leading-relaxed">
                      <span className="text-rose-600 font-black mr-2 mt-0.5">✕</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <section>
              <h2 className="text-3xl font-black text-gray-900 mb-8 tracking-tight">Why Need2Done?</h2>
              {(service.id === 2 || service.name?.toLowerCase().includes('laundry')) ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-white border border-gray-100 rounded-[24px] shadow-sm hover:shadow-md transition-shadow">
                    <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FaShieldAlt className="text-2xl text-blue-600" />
                    </div>
                    <h4 className="font-bold text-gray-900 mb-1">100% Isolated Wash</h4>
                    <p className="text-sm text-gray-500 font-medium">Never mixed with other households. Dedicated sanitized batch.</p>
                  </div>
                  <div className="text-center p-6 bg-white border border-gray-100 rounded-[24px] shadow-sm hover:shadow-md transition-shadow">
                    <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FaCheckCircle className="text-2xl text-green-500" />
                    </div>
                    <h4 className="font-bold text-gray-900 mb-1">Custom Task Choice</h4>
                    <p className="text-sm text-gray-500 font-medium">Pay only for what you need (Wash only, Steam Iron only, or Full Combo).</p>
                  </div>
                  <div className="text-center p-6 bg-white border border-gray-100 rounded-[24px] shadow-sm hover:shadow-md transition-shadow">
                    <div className="bg-orange-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FaClock className="text-2xl text-orange-500" />
                    </div>
                    <h4 className="font-bold text-gray-900 mb-1">12 - 48h Turnaround</h4>
                    <p className="text-sm text-gray-500 font-medium">Fast, punctual doorstep pickup and timely doorstep return.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-white border border-gray-100 rounded-[24px] shadow-sm hover:shadow-md transition-shadow">
                    <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FaShieldAlt className="text-2xl text-blue-600" />
                    </div>
                    <h4 className="font-bold text-gray-900 mb-1">Verified Pros</h4>
                    <p className="text-sm text-gray-500 font-medium">Background checked & trained</p>
                  </div>
                  <div className="text-center p-6 bg-white border border-gray-100 rounded-[24px] shadow-sm hover:shadow-md transition-shadow">
                    <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FaCheckCircle className="text-2xl text-green-500" />
                    </div>
                    <h4 className="font-bold text-gray-900 mb-1">Quality Assured</h4>
                    <p className="text-sm text-gray-500 font-medium">100% satisfaction guarantee</p>
                  </div>
                  <div className="text-center p-6 bg-white border border-gray-100 rounded-[24px] shadow-sm hover:shadow-md transition-shadow">
                    <div className="bg-orange-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FaClock className="text-2xl text-orange-500" />
                    </div>
                    <h4 className="font-bold text-gray-900 mb-1">On Time</h4>
                    <p className="text-sm text-gray-500 font-medium">Punctual & reliable service</p>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Sticky Booking Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white border border-gray-100 rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
              <h3 className="text-2xl font-black text-gray-900 mb-2">Book Service</h3>
              <p className="text-sm font-semibold text-gray-400 mb-6 border-b border-gray-100 pb-4 uppercase tracking-wider">Starting Price</p>
              
              <div className="flex justify-between items-end mb-8">
                <div>
                  <span className="text-5xl font-black text-gray-900 tracking-tight">₹{service.base_price}</span>
                  <span className="text-gray-500 font-medium block mt-1">
                    {(service.id === 2 || service.name?.toLowerCase().includes('laundry')) 
                      ? 'Doorstep Pickup & Return in 12 - 48 Hrs' 
                      : `per ${service.base_duration}`}
                  </span>
                </div>
              </div>

              <Link 
                to={`/book/${service.id}`}
                className="w-full block text-center py-4 px-6 rounded-2xl text-white font-black text-lg bg-blue-600 hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Book Now
              </Link>
              
              <p className="text-center text-xs font-semibold text-gray-400 mt-5 flex items-center justify-center">
                <FaCheckCircle className="mr-1.5 text-green-500" /> No advance payment required
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetails;
