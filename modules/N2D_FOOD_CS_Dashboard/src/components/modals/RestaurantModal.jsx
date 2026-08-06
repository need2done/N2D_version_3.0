import { useState } from 'react';

export default function RestaurantModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    cuisine: '',
    deliveryTime: '20-30 min',
    distance: '1.0 km',
    offer: '15% OFF',
    address: 'Bhongir, Telangana 508116',
    openingHours: '8:00 AM - 10:30 PM',
    description: '',
    priceForTwo: 300,
    cover: '',
    logo: ''
  });

  const [logoPreview, setLogoPreview] = useState('');
  const [coverPreview, setCoverPreview] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'logo') setLogoPreview(value);
    if (name === 'cover') setCoverPreview(value);
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (field === 'logo') {
          setLogoPreview(reader.result);
          setFormData(prev => ({ ...prev, logo: reader.result }));
        } else {
          setCoverPreview(reader.result);
          setFormData(prev => ({ ...prev, cover: reader.result }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) {
      alert("Please enter Restaurant Name.");
      return;
    }
    const slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const cuisinesArray = formData.cuisine ? formData.cuisine.split(',').map(c => c.trim()) : ['Multi Cuisine'];

    onSave({
      ...formData,
      id: Date.now(),
      slug,
      cuisine: cuisinesArray,
      rating: 4.5,
      reviewCount: 1,
      isOpen: true,
      tags: ['popular', 'recentlyAdded'],
      categories: ['Best Sellers', 'Starters', 'Biryani', 'Meals'],
      cover: formData.cover || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=400&fit=crop',
      logo: formData.logo || '/logos/CG.png'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏪</span>
            <h2 className="text-lg font-bold text-gray-900">
              Add New Partner Restaurant
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Restaurant Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Restaurant Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="e.g. Royal Spice Restaurant"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all"
              />
            </div>

            {/* Cuisines */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Cuisines (Comma Separated)
              </label>
              <input
                type="text"
                name="cuisine"
                value={formData.cuisine}
                onChange={handleChange}
                placeholder="e.g. Biryani, North Indian, Chinese"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all"
              />
            </div>

            {/* Delivery Time */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Estimated Delivery Time
              </label>
              <input
                type="text"
                name="deliveryTime"
                value={formData.deliveryTime}
                onChange={handleChange}
                placeholder="e.g. 20-30 min"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all"
              />
            </div>

            {/* Offer Text */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Special Offer Badge
              </label>
              <input
                type="text"
                name="offer"
                value={formData.offer}
                onChange={handleChange}
                placeholder="e.g. 20% OFF on orders above ₹200"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all"
              />
            </div>

            {/* Price For Two */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Average Price For Two (₹)
              </label>
              <input
                type="number"
                name="priceForTwo"
                value={formData.priceForTwo}
                onChange={handleChange}
                placeholder="e.g. 300"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all"
              />
            </div>

            {/* Opening Hours */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Opening Hours
              </label>
              <input
                type="text"
                name="openingHours"
                value={formData.openingHours}
                onChange={handleChange}
                placeholder="e.g. 8:00 AM - 11:00 PM"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Address & Location
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="e.g. Main Road, Bhongir, Telangana 508116"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Restaurant Description
            </label>
            <textarea
              name="description"
              rows={2}
              value={formData.description}
              onChange={handleChange}
              placeholder="Brief summary of restaurant specialities and dining experience..."
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all resize-none"
            />
          </div>

          {/* Cover & Logo Image Upload */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Restaurant Cover Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'cover')}
                className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-brand-orange cursor-pointer w-full mb-1"
              />
              <input
                type="text"
                name="cover"
                value={formData.cover}
                onChange={handleChange}
                placeholder="Or enter Image URL"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-xl text-xs outline-none focus:border-brand-orange"
              />
              {coverPreview && (
                <img src={coverPreview} alt="Cover Preview" className="mt-2 w-full h-20 object-cover rounded-lg border border-gray-200" />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Restaurant Logo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'logo')}
                className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-brand-orange cursor-pointer w-full mb-1"
              />
              <input
                type="text"
                name="logo"
                value={formData.logo}
                onChange={handleChange}
                placeholder="Or enter Logo URL"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-xl text-xs outline-none focus:border-brand-orange"
              />
              {logoPreview && (
                <img src={logoPreview} alt="Logo Preview" className="mt-2 w-12 h-12 object-contain rounded-lg border border-gray-200" />
              )}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-brand-orange hover:bg-brand-orange-dark text-white rounded-xl text-xs font-bold shadow-orange hover:shadow-orange-hover transition-all cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Restaurant</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
