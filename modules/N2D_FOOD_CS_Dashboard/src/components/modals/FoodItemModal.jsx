import { useState, useEffect } from 'react';

export default function FoodItemModal({ isOpen, onClose, item, restaurants, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    restaurantId: 1,
    categoryName: 'Best Sellers',
    description: '',
    price: '',
    offerPrice: '',
    isVeg: true,
    prepTime: '20 min',
    isAvailable: true,
    isBestSeller: false,
    customizable: true,
    image: ''
  });

  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        restaurantId: item.restaurantId || (restaurants[0]?.id || 1),
        categoryName: item.categoryName || 'Best Sellers',
        description: item.description || '',
        price: item.price || '',
        offerPrice: item.offerPrice || '',
        isVeg: item.isVeg !== undefined ? item.isVeg : true,
        prepTime: item.prepTime || '20 min',
        isAvailable: item.isAvailable !== undefined ? item.isAvailable : true,
        isBestSeller: Boolean(item.isBestSeller),
        customizable: item.customizable !== undefined ? item.customizable : true,
        image: item.image || ''
      });
      setImagePreview(item.image || '');
    } else {
      setFormData({
        name: '',
        restaurantId: restaurants[0]?.id || 1,
        categoryName: 'Best Sellers',
        description: '',
        price: '',
        offerPrice: '',
        isVeg: true,
        prepTime: '20 min',
        isAvailable: true,
        isBestSeller: false,
        customizable: true,
        image: ''
      });
      setImagePreview('');
    }
  }, [item, restaurants, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
    if (name === 'image') setImagePreview(value);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setFormData(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      alert("Please provide Item Name and Price.");
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍲</span>
            <h2 className="text-lg font-bold text-gray-900">
              {item ? 'Edit Food Item' : 'Add New Food Item'}
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
            
            {/* Item Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Item Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="e.g. Chicken Dum Biryani"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all"
              />
            </div>

            {/* Restaurant */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Restaurant *
              </label>
              <select
                name="restaurantId"
                value={formData.restaurantId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all bg-white"
              >
                {restaurants.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Menu Category
              </label>
              <input
                type="text"
                name="categoryName"
                value={formData.categoryName}
                onChange={handleChange}
                placeholder="e.g. Best Sellers, Biryani, Starters"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all"
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Price (₹) *
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                min="0"
                step="1"
                placeholder="e.g. 220"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all"
              />
            </div>

            {/* Offer Price */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Offer / Discounted Price (₹)
              </label>
              <input
                type="number"
                name="offerPrice"
                value={formData.offerPrice}
                onChange={handleChange}
                min="0"
                step="1"
                placeholder="e.g. 180 (Leave blank if none)"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all"
              />
            </div>

            {/* Prep Time */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Preparation Time
              </label>
              <input
                type="text"
                name="prepTime"
                value={formData.prepTime}
                onChange={handleChange}
                placeholder="e.g. 20 min"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              name="description"
              rows={2}
              value={formData.description}
              onChange={handleChange}
              placeholder="Brief ingredients and taste description..."
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all resize-none"
            />
          </div>

          {/* Toggles (Veg/NonVeg, InStock, BestSeller) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
            {/* Veg / Non-Veg */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isVeg"
                name="isVeg"
                checked={formData.isVeg}
                onChange={handleChange}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="isVeg" className="text-xs font-semibold text-gray-800 cursor-pointer flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded-full border flex items-center justify-center p-0.5 ${formData.isVeg ? 'border-emerald-600' : 'border-rose-600'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${formData.isVeg ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                </span>
                {formData.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
              </label>
            </div>

            {/* In Stock */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isAvailable"
                name="isAvailable"
                checked={formData.isAvailable}
                onChange={handleChange}
                className="w-4 h-4 text-brand-orange rounded focus:ring-brand-orange cursor-pointer"
              />
              <label htmlFor="isAvailable" className="text-xs font-semibold text-gray-800 cursor-pointer">
                Available (In Stock)
              </label>
            </div>

            {/* Bestseller */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isBestSeller"
                name="isBestSeller"
                checked={formData.isBestSeller}
                onChange={handleChange}
                className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400 cursor-pointer"
              />
              <label htmlFor="isBestSeller" className="text-xs font-semibold text-gray-800 cursor-pointer flex items-center gap-1">
                ⭐ Mark Bestseller
              </label>
            </div>
          </div>

          {/* Image Source */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Item Image (Upload File or Enter Image URL)
            </label>
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-brand-orange hover:file:bg-orange-100 cursor-pointer"
              />
              <span className="text-xs text-gray-400 font-bold">OR</span>
              <input
                type="text"
                name="image"
                value={formData.image}
                onChange={handleChange}
                placeholder="https://images.unsplash.com/..."
                className="flex-1 w-full px-3 py-1.5 border border-gray-300 rounded-xl text-xs outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all"
              />
            </div>

            {imagePreview && (
              <div className="mt-3 flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-200">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-16 h-16 object-cover rounded-lg border border-gray-300 shadow-sm"
                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200&h=200&fit=crop'; }}
                />
                <span className="text-xs text-gray-500 font-medium">Image Preview</span>
              </div>
            )}
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{item ? 'Save Changes' : 'Add Item'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
