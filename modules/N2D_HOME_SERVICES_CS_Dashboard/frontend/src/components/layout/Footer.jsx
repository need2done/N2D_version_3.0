import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebook, FaTwitter, FaInstagram, FaWhatsapp } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-1">
            <Link to="/">
              <img src="/logo.png" alt="Need2Done Logo" className="h-16 md:h-20 object-contain mb-4" />
            </Link>
            <p className="mt-4 text-gray-500 text-sm">
              Your trusted partner for professional home services. Book verified experts in minutes.
            </p>
          </div>
          
          <div>
            <h3 className="font-bold text-gray-900 mb-4 text-lg">Company</h3>
            <ul className="space-y-3 text-sm font-medium text-gray-600">
              <li><Link to="/info/about" className="hover:text-blue-600 transition-colors flex items-center">About Us</Link></li>
              <li><Link to="/info/terms" className="hover:text-blue-600 transition-colors flex items-center">Terms & Conditions</Link></li>
              <li><Link to="/info/privacy" className="hover:text-blue-600 transition-colors flex items-center">Privacy Policy</Link></li>
              <li><Link to="/info/contact" className="hover:text-blue-600 transition-colors flex items-center">Contact Us</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold text-gray-900 mb-4 text-lg">For Customers</h3>
            <ul className="space-y-3 text-sm font-medium text-gray-600">
              <li><Link to="/info/support" className="hover:text-blue-600 transition-colors flex items-center">Customer Support</Link></li>
              <li><Link to="/info/faq" className="hover:text-blue-600 transition-colors flex items-center">FAQs</Link></li>
              <li><Link to="/info/safety" className="hover:text-blue-600 transition-colors flex items-center">Safety Guidelines</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-4 text-lg">Connect With Us</h3>
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-all">
                <FaFacebook size={20} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-blue-50 hover:text-blue-400 transition-all">
                <FaTwitter size={20} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-pink-50 hover:text-pink-600 transition-all">
                <FaInstagram size={20} />
              </a>
            </div>
            <div className="mt-6">
              <a href="https://wa.me/917989862623" target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-6 py-3 bg-[#25D366] text-white font-bold rounded-xl hover:bg-[#20bd5a] hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                <FaWhatsapp className="mr-2 text-xl" /> Chat on WhatsApp
              </a>
            </div>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Need2Done. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
