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
              <FaRegClock className="mr-2 text-orange-400 text-lg" /> {service.base_duration}
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
              <p className="text-gray-600 leading-relaxed text-lg font-medium">{service.description}</p>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <section className="bg-green-50 p-6 rounded-2xl">
                <h3 className="text-xl font-bold text-green-800 mb-4 flex items-center">
                  <FaCheckCircle className="mr-2" /> What's Included
                </h3>
                <ul className="space-y-3">
                  {service.whats_included.map((item, idx) => (
                    <li key={idx} className="flex items-start text-green-700">
                      <span className="mr-2 mt-1">•</span> {item}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="bg-red-50 p-6 rounded-2xl">
                <h3 className="text-xl font-bold text-red-800 mb-4 flex items-center">
                  <FaTimesCircle className="mr-2" /> What's Not Included
                </h3>
                <ul className="space-y-3">
                  {service.whats_not_included.map((item, idx) => (
                    <li key={idx} className="flex items-start text-red-700">
                      <span className="mr-2 mt-1">•</span> {item}
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <section>
              <h2 className="text-3xl font-black text-gray-900 mb-8 tracking-tight">Why Need2Done?</h2>
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
                  <span className="text-gray-500 font-medium block mt-1">per {service.base_duration}</span>
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
