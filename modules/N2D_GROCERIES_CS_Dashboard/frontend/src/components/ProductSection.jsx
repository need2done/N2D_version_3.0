import React from 'react';
import ProductCard from './ProductCard';
import { ChevronRight } from 'lucide-react';

const ProductSection = ({ title, products, showFilters = false }) => {
  return (
    <section className="mb-10 mt-6">
      {title && (
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h2>
          <button className="text-primary hover:text-blue-700 font-semibold text-sm flex items-center gap-1 group transition-colors">
            View All <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}

      {/* Filter Buttons */}
      {showFilters && (
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-2 scrollbar-hide whitespace-nowrap">
          <button className="flex items-center gap-1 px-4 py-1.5 bg-white border border-gray-200 rounded-full text-sm font-medium hover:bg-gray-50 text-gray-700 shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
            Filters
          </button>
          <button className="px-4 py-1.5 bg-white border border-gray-200 rounded-full text-sm font-medium hover:bg-gray-50 text-gray-700 shadow-sm">Amul</button>
          <button className="px-4 py-1.5 bg-white border border-gray-200 rounded-full text-sm font-medium hover:bg-gray-50 text-gray-700 shadow-sm">Heritage</button>
          <button className="px-4 py-1.5 bg-white border border-gray-200 rounded-full text-sm font-medium hover:bg-gray-50 text-gray-700 shadow-sm">Dodla</button>
          <button className="px-4 py-1.5 bg-white border border-gray-200 rounded-full text-sm font-medium hover:bg-gray-50 text-gray-700 shadow-sm">Vijaya</button>
          <button className="px-4 py-1.5 bg-white border border-gray-200 rounded-full text-sm font-medium hover:bg-gray-50 text-gray-700 shadow-sm">Britannia</button>
          <button className="px-4 py-1.5 bg-white border border-gray-200 rounded-full text-sm font-medium hover:bg-gray-50 text-gray-700 shadow-sm flex items-center gap-1">Brand <ChevronRight size={14} className="rotate-90" /></button>
          <button className="px-4 py-1.5 bg-white border border-gray-200 rounded-full text-sm font-medium hover:bg-gray-50 text-gray-700 shadow-sm flex items-center gap-1">Type <ChevronRight size={14} className="rotate-90" /></button>
          <button className="px-4 py-1.5 bg-white border border-gray-200 rounded-full text-sm font-medium hover:bg-gray-50 text-gray-700 shadow-sm flex items-center gap-1">Customer Ratings <ChevronRight size={14} className="rotate-90" /></button>
          <button className="px-4 py-1.5 bg-white border border-gray-200 rounded-full text-sm font-medium hover:bg-gray-50 text-gray-700 shadow-sm flex items-center gap-1">Sort By <ChevronRight size={14} className="rotate-90" /></button>
        </div>
      )}
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
};

export default ProductSection;
