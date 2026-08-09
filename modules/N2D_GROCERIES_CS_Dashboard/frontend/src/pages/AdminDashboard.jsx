import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, LogOut, Package, ArrowLeft, Search } from 'lucide-react';
import AdminProductModal from '../components/AdminProductModal';

const AdminDashboard = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  const [bulkCategory, setBulkCategory] = useState('');
  const navigate = useNavigate();

  const fetchProductsAndCategories = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch('/api/groceries/products'),
        fetch('/api/groceries/categories')
      ]);
      const prodData = await prodRes.json();
      const catData = await catRes.json();
      setProducts(prodData);
      setCategories(catData);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsAndCategories();
  }, []);

  const handleBulkStock = async (stockValue, isGlobal = false) => {
    const actionName = stockValue > 0 ? "IN STOCK" : "OUT OF STOCK";
    const targetName = isGlobal ? "ALL PRODUCTS" : "the selected category";
    
    if (!isGlobal && !bulkCategory) {
      alert('Please select a category first!');
      return;
    }

    if (!window.confirm(`Are you sure you want to mark ${targetName} as ${actionName}?`)) {
      return;
    }

    try {
      await fetch('/api/groceries/products/bulk/stock', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: isGlobal ? null : bulkCategory,
          stock: stockValue
        })
      });
      fetchProductsAndCategories();
    } catch (err) {
      console.error('Failed to perform bulk action', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  const handleAdd = () => {
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await fetch(`/api/groceries/products/${id}`, { method: 'DELETE' });
      fetchProductsAndCategories();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const handleToggleStock = async (product) => {
    const newStock = product.stock > 0 ? 0 : 100;
    try {
      await fetch(`/api/groceries/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...product, stock: newStock })
      });
      fetchProductsAndCategories();
    } catch (err) {
      console.error('Failed to toggle stock', err);
    }
  };

  const handleSaveProduct = async (formData, id) => {
    const url = id 
      ? `/api/groceries/products/${id}`
      : '/api/groceries/products';
      
    const method = id ? 'PUT' : 'POST';

    try {
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      setIsModalOpen(false);
      fetchProductsAndCategories();
    } catch (err) {
      console.error('Save failed', err);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.brand_name && p.brand_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = bulkCategory ? p.category_id.toString() === bulkCategory.toString() : true;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-primary font-bold">Loading Inventory...</div>;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Top Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="text-gray-400 hover:text-primary transition-colors">
              <ArrowLeft size={24} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">N</div>
              <span className="font-bold text-gray-900 text-lg hidden sm:block">Admin Portal</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={handleAdd}
              className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors shadow-sm text-sm sm:text-base"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Add Product</span>
            </button>
            <button onClick={handleLogout} className="text-gray-500 hover:text-red-500 transition-colors flex items-center gap-1">
              <LogOut size={20} />
              <span className="hidden sm:inline text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="text-primary" /> Inventory Management
            </h1>
            <p className="text-gray-500 text-sm mt-1">Manage your products, pricing, and stock levels.</p>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
            />
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-8 flex flex-col md:flex-row items-center gap-6">
          
          <div className="flex-1 flex flex-col sm:flex-row items-center gap-3 w-full border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 md:pr-6">
            <span className="font-semibold text-gray-700 text-sm whitespace-nowrap">Category Stock:</span>
            <select 
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select Category...</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="flex gap-2 w-full sm:w-auto">
              <button 
                onClick={() => handleBulkStock(100, false)}
                className="flex-1 sm:flex-none px-3 py-2 bg-green-50 text-green-700 font-semibold text-sm rounded-lg hover:bg-green-100 transition-colors border border-green-200"
              >
                In Stock
              </button>
              <button 
                onClick={() => handleBulkStock(0, false)}
                className="flex-1 sm:flex-none px-3 py-2 bg-red-50 text-red-600 font-semibold text-sm rounded-lg hover:bg-red-100 transition-colors border border-red-200"
              >
                Out of Stock
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="font-bold text-gray-800 text-sm whitespace-nowrap">Full Store:</span>
            <button 
              onClick={() => handleBulkStock(100, true)}
              className="flex-1 md:flex-none px-4 py-2 bg-[#0C8346] text-white font-bold text-sm rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              ALL In Stock
            </button>
            <button 
              onClick={() => handleBulkStock(0, true)}
              className="flex-1 md:flex-none px-4 py-2 bg-gray-800 text-white font-bold text-sm rounded-lg hover:bg-gray-900 transition-colors shadow-sm"
            >
              ALL Out of Stock
            </button>
          </div>

        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Product</th>
                  <th className="px-6 py-4 font-semibold">Brand</th>
                  <th className="px-6 py-4 font-semibold">Price</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg border border-gray-100 bg-white p-1 flex-shrink-0 flex items-center justify-center overflow-hidden">
                          {product.image_url || product.image ? (
                            <img 
                              src={(product.image_url || product.image).startsWith('/images/') ? `/groceries${product.image_url || product.image}` : (product.image_url || product.image)} 
                              alt={product.name} 
                              className="max-w-full max-h-full object-contain" 
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80';
                              }}
                            />
                          ) : (
                            <div className="text-gray-300"><Package size={20} /></div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.weight}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 font-medium">{product.brand_name || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">₹{product.selling_price}</span>
                        <span className="text-xs text-gray-400 line-through">₹{product.mrp}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleToggleStock(product)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${product.stock > 0 ? 'bg-green-500' : 'bg-gray-200'}`}
                        title={product.stock > 0 ? "Mark as Out of Stock" : "Mark as In Stock"}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${product.stock > 0 ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                      <span className={`ml-3 text-xs font-bold ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(product)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(product.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredProducts.length === 0 && (
              <div className="p-12 text-center text-gray-500">
                No products found.
              </div>
            )}
          </div>
        </div>
      </main>

      <AdminProductModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProduct}
        onSave={handleSaveProduct}
      />
    </div>
  );
};

export default AdminDashboard;
