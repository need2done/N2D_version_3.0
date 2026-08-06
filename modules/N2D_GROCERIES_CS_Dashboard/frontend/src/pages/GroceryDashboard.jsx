import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import Header from '../components/Header';
import CategorySidebar from '../components/CategorySidebar';
import MobileCategoryNav from '../components/MobileCategoryNav';
import QuickTabs from '../components/QuickTabs';
import BannerCarousel from '../components/BannerCarousel';
import ProductSection from '../components/ProductSection';
import FloatingCart from '../components/FloatingCart';
import CartSidebar from '../components/CartSidebar';
import Footer from '../components/Footer';

const GroceryDashboard = () => {
  const [activeCategory, setActiveCategory] = useState(1);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [sortOption, setSortOption] = useState('popular');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Reset selected brand when category or search changes
  useEffect(() => {
    setSelectedBrand('All');
  }, [activeCategory, searchQuery]);

  useEffect(() => {
    // Fetch products dynamically
    fetch('/api/groceries/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching products:', err);
        setLoading(false);
      });
  }, []);

  // Filter products by category or search query
  const searchLower = searchQuery.toLowerCase().trim();
  let displayProducts = products;
  
  if (searchLower) {
    displayProducts = products.filter(p => 
      p.name.toLowerCase().includes(searchLower) ||
      (p.brand_name && p.brand_name.toLowerCase().includes(searchLower))
    );
  } else {
    displayProducts = products.filter(p => p.category_id === activeCategory);
  }

  const availableBrands = ['All', ...new Set(displayProducts.map(p => p.brand_name).filter(Boolean))];
  
  let finalProducts = selectedBrand === 'All' 
    ? displayProducts 
    : displayProducts.filter(p => p.brand_name === selectedBrand);

  // Apply sorting
  finalProducts = [...finalProducts];
  switch(sortOption) {
    case 'price_low_high':
      finalProducts.sort((a, b) => (a.selling_price || 0) - (b.selling_price || 0));
      break;
    case 'price_high_low':
      finalProducts.sort((a, b) => (b.selling_price || 0) - (a.selling_price || 0));
      break;
    case 'name_a_z':
      finalProducts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      break;
    case 'name_z_a':
      finalProducts.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
      break;
    default:
      // 'popular' or default keeps original ID/db order
      break;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      <Header 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
        onMenuClick={() => setIsMobileMenuOpen(true)} 
      />
      <MobileCategoryNav 
        activeCategory={activeCategory} 
        setActiveCategory={setActiveCategory} 
        searchQuery={searchQuery}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      
      <main className="max-w-[1440px] mx-auto px-6 py-8 flex gap-8 relative">
        <CategorySidebar activeCategory={activeCategory} setActiveCategory={setActiveCategory} searchQuery={searchQuery} />
        
        <div className="flex-1 min-w-0">
          {!searchLower && <BannerCarousel />}
          
          {searchLower && (
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800">Search Results for "{searchQuery}"</h2>
              <p className="text-gray-500 text-sm mt-1">Found {displayProducts.length} items</p>
            </div>
          )}

          {/* Controls Bar: Brand Filters & Sorting */}
          {displayProducts.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              {/* Brand Filters */}
              {availableBrands.length > 2 ? (
                <div className="flex-1 overflow-x-auto no-scrollbar pb-2 sm:pb-0">
                  <div className="flex gap-2">
                    {availableBrands.map(brand => (
                      <button
                        key={brand}
                        onClick={() => setSelectedBrand(brand)}
                        className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors border ${
                          selectedBrand === brand
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-blue-50 hover:text-primary hover:border-blue-200'
                        }`}
                      >
                        {brand}
                      </button>
                    ))}
                  </div>
                </div>
              ) : <div className="flex-1" />}

              {/* Sorting Dropdown */}
              <div className="flex-shrink-0 relative self-start sm:self-auto inline-block">
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  className="appearance-none bg-[#E6F0FF] border border-[#B3D4FF] text-primary text-sm font-bold rounded-full px-4 py-1.5 pr-8 hover:bg-[#D1E6FF] hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer shadow-sm"
                >
                  <option value="popular">Sort: Popularity</option>
                  <option value="price_low_high">Price: Low to High</option>
                  <option value="price_high_low">Price: High to Low</option>
                  <option value="name_a_z">Name: A to Z</option>
                  <option value="name_z_a">Name: Z to A</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary">
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>
          )}
          
          {finalProducts.length > 0 ? (
            <ProductSection products={finalProducts} />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <span className="text-6xl">🛒</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">No Products Found</h3>
              <p className="text-gray-500 max-w-md text-center mb-6">
                {searchLower 
                  ? `We couldn't find anything matching "${searchQuery}". Try checking your spelling or using more general terms.`
                  : "This category currently has no items available. Please check back later."}
              </p>
              {searchLower && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}
        </div>

        <CartSidebar />
      </main>

      <div className="xl:hidden">
        <FloatingCart />
      </div>
      
      <Footer />
    </div>
  );
};

export default GroceryDashboard;
