import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';

const AdminProductModal = ({ isOpen, onClose, product, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    mrp: '',
    selling_price: '',
    weight: '1 unit',
    stock: 100,
    category_id: 1, // Defaulting to 1 for MVP
    brand_id: 1,
    image: ''
  });
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        mrp: product.mrp || '',
        selling_price: product.selling_price || '',
        weight: product.weight || '1 unit',
        stock: product.stock !== undefined ? product.stock : 100,
        category_id: product.category_id || 1,
        brand_id: product.brand_id || 1,
        image: product.image_url || ''
      });
    } else {
      setFormData({
        name: '',
        mrp: '',
        selling_price: '',
        weight: '1 unit',
        stock: 100,
        category_id: 1,
        brand_id: 1,
        image: ''
      });
    }
  }, [product, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSave(formData, product?.id);
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="md:col-span-2 space-y-4">
              <label className="block text-sm font-semibold text-gray-700">Product Image</label>
              <div className="flex items-center gap-6">
                <div className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 relative group">
                  {formData.image ? (
                    <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="text-gray-400" size={32} />
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload className="text-white" size={24} />
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    ref={fileInputRef}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <div className="text-sm text-gray-500">
                  <p className="font-medium text-gray-700 mb-1">Upload Product Image</p>
                  <p>Click the area or drag a file to upload.</p>
                  <p className="mt-1">Recommended: 500x500px, PNG or JPG.</p>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Product Name *</label>
              <input 
                type="text" 
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none"
                placeholder="e.g. Amul Taaza Toned Milk"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">MRP (₹) *</label>
              <input 
                type="number" 
                name="mrp"
                required
                min="0"
                value={formData.mrp}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none"
                placeholder="e.g. 50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Selling Price (₹) *</label>
              <input 
                type="number" 
                name="selling_price"
                required
                min="0"
                value={formData.selling_price}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none"
                placeholder="e.g. 45"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Weight / Quantity</label>
              <input 
                type="text" 
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none"
                placeholder="e.g. 500 ml"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Initial Stock</label>
              <select 
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none cursor-pointer"
              >
                <option value={100}>In Stock (100)</option>
                <option value={0}>Out of Stock (0)</option>
              </select>
            </div>

          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-3 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminProductModal;
