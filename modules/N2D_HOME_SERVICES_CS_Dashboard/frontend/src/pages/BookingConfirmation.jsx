import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaCheckCircle, FaWhatsapp, FaMapMarkerAlt, FaHome } from 'react-icons/fa';

const BookingConfirmation = () => {
  const { orderId } = useParams();

  return (
    <div className="bg-gray-50 min-h-screen py-20 px-4 flex items-center justify-center">
      <div className="max-w-xl w-full bg-white p-10 rounded-[32px] shadow-2xl text-center border border-gray-100">
        
        <div className="flex justify-center mb-6">
          <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center">
            <FaCheckCircle className="text-green-500 text-6xl" />
          </div>
        </div>

        <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">Booking Confirmed!</h1>
        <p className="text-gray-500 font-medium mb-8">
          Your payment was successful and your booking is confirmed.
        </p>

        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 mb-8 text-left">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-500 font-medium">Booking ID</span>
            <span className="font-black text-gray-900 text-lg">{orderId}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 font-medium">Status</span>
            <span className="font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">Searching for Helper...</span>
          </div>
        </div>

        <p className="text-sm text-gray-600 font-medium mb-8 leading-relaxed">
          We have sent a confirmation message to your WhatsApp.<br/>
          You can track your booking status directly from there.
        </p>

        <div className="space-y-4">
          <button onClick={() => window.location.href = 'https://wa.me/15556349916'} className="w-full flex items-center justify-center bg-[#25D366] hover:bg-[#20bd5a] text-white font-black py-4 px-6 rounded-2xl transition-all shadow-lg hover:-translate-y-1">
            <FaWhatsapp className="mr-2 text-2xl" /> Track on WhatsApp
          </button>
          
          <Link to="/" className="w-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 px-6 rounded-2xl transition-all">
            <FaHome className="mr-2" /> Go Home
          </Link>
        </div>

      </div>
    </div>
  );
};

export default BookingConfirmation;
