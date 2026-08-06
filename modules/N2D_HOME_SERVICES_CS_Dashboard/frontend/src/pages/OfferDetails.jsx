import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaGift, FaPercentage, FaRegCalendarAlt, FaStar, FaArrowRight } from 'react-icons/fa';

const OfferDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const offers = {
    'first-booking': {
      title: 'First Booking Offer',
      badge: 'NEW USER',
      color: 'orange',
      bgClass: 'bg-orange-50',
      borderClass: 'border-orange-100',
      textClass: 'text-orange-600',
      badgeBg: 'bg-orange-100',
      badgeText: 'text-orange-700',
      emoji: '🎁',
      subtitle: 'Get 20% OFF on your very first service with Need2Done!',
      description: 'Welcome to Need2Done! We are thrilled to have you here. To get you started, we are offering a flat 20% discount on your first ever booking. Experience premium, background-verified home services at an unbeatable price.',
      terms: [
        'Applicable only for first-time users.',
        'Maximum discount capped at ₹500.',
        'Valid on all home services (Cleaning, Dishwashing, Laundry, etc).',
        'Cannot be combined with other offers.',
        'Offer applied automatically during WhatsApp checkout.'
      ]
    },
    'festival': {
      title: 'Festival Special',
      badge: 'FESTIVAL',
      color: 'blue',
      bgClass: 'bg-blue-50',
      borderClass: 'border-blue-100',
      textClass: 'text-blue-600',
      badgeBg: 'bg-blue-100',
      badgeText: 'text-blue-700',
      emoji: '🪔',
      subtitle: 'Upto ₹200 OFF on selected premium cleaning services.',
      description: 'Get your home festival-ready with our premium deep cleaning services! For a limited time, get up to ₹200 off to make sure your home shines bright for the celebrations.',
      terms: [
        'Applicable for all users.',
        'Valid only on Kitchen Cleaning and Bathroom Cleaning.',
        'Minimum booking amount of ₹499 required.',
        'Offer applied automatically during WhatsApp checkout.',
        'Valid until the end of the festive season.'
      ]
    },
    'weekend': {
      title: 'Weekend Bonanza',
      badge: 'WEEKEND',
      color: 'green',
      bgClass: 'bg-green-50',
      borderClass: 'border-green-100',
      textClass: 'text-green-600',
      badgeBg: 'bg-green-100',
      badgeText: 'text-green-700',
      emoji: '📅',
      subtitle: 'Flat ₹150 OFF on all bookings above ₹799!',
      description: 'Make the most of your weekend and let us handle the chores! Book any service on a Saturday or Sunday, and enjoy a flat ₹150 discount when your cart value exceeds ₹799.',
      terms: [
        'Applicable only for bookings scheduled on Saturday or Sunday.',
        'Minimum booking amount of ₹799 required.',
        'Valid on all home services.',
        'Cannot be combined with New User offers.',
        'Offer applied automatically during WhatsApp checkout.'
      ]
    }
  };

  const offer = offers[id];

  if (!offer) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <h2 className="text-3xl font-black text-gray-900 mb-4">Offer Not Found</h2>
        <p className="text-gray-500 mb-8">This offer might have expired or does not exist.</p>
        <Link to="/" className="bg-blue-600 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
          Go Back Home
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Dynamic Header Banner */}
      <div className={`${offer.bgClass} border-b ${offer.borderClass} pt-12 pb-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden`}>
        <div className="max-w-4xl mx-auto relative z-10">
          <button onClick={() => navigate(-1)} className={`flex items-center text-sm font-bold ${offer.textClass} hover:opacity-70 mb-8 transition-opacity`}>
            <FaArrowLeft className="mr-2" /> Back
          </button>
          
          <span className={`${offer.badgeBg} ${offer.badgeText} text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider mb-4 inline-block shadow-sm`}>
            {offer.badge}
          </span>
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-4 tracking-tight leading-tight">
            {offer.title}
          </h1>
          <p className="text-lg md:text-xl font-medium text-gray-700 max-w-2xl">
            {offer.subtitle}
          </p>
        </div>
        
        {/* Decorative Emoji Background */}
        <div className="absolute right-[-5%] md:right-[10%] top-[20%] text-[150px] md:text-[250px] opacity-20 pointer-events-none transform rotate-12">
          {offer.emoji}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20">
        <div className="bg-white rounded-[32px] p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100">
          
          <div className="mb-10">
            <h2 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">About this offer</h2>
            <p className="text-gray-600 text-lg leading-relaxed font-medium">
              {offer.description}
            </p>
          </div>

          <div className="bg-gray-50 rounded-[24px] p-8 border border-gray-100 mb-10">
            <h3 className="text-xl font-bold text-gray-900 mb-5 flex items-center tracking-tight">
              Terms & Conditions
            </h3>
            <ul className="space-y-4">
              {offer.terms.map((term, index) => (
                <li key={index} className="flex items-start text-gray-600 font-medium">
                  <span className={`min-w-6 h-6 rounded-full flex items-center justify-center mr-3 mt-0.5 text-xs font-bold ${offer.badgeBg} ${offer.badgeText}`}>
                    {index + 1}
                  </span>
                  {term}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-gray-100">
            <div className="mb-6 sm:mb-0 text-center sm:text-left">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Ready to use this?</p>
              <p className="text-xl font-black text-gray-900">Book a service now</p>
            </div>
            
            <Link 
              to="/" 
              className={`w-full sm:w-auto text-center py-4 px-8 rounded-2xl text-white font-black text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all flex items-center justify-center ${
                offer.color === 'orange' ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/30' : 
                offer.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30' : 
                'bg-green-600 hover:bg-green-700 shadow-green-600/30'
              }`}
            >
              Explore Services <FaArrowRight className="ml-2" />
            </Link>
          </div>

        </div>
      </div>

    </div>
  );
};

export default OfferDetails;
