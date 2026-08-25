'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, LogOut, Image as ImageIcon, CheckCircle, XCircle } from 'lucide-react';
import { useSearch } from '@/context/SearchContext';
import styles from './admin.module.css';

export default function AdminDashboard() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState('All');
  const { searchQuery } = useSearch();
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    unitType: 'kg',
    baseUnit: '1 kg',
    description: '',
    image: '',
    inStock: true
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/fruits-vegetables/products?t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchProducts();
  }, [router]);

  const getAuthHeaders = (contentType = true) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    const headers: Record<string, string> = {};
    if (contentType) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const handleLogout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_token');
    }
    await fetch('/api/fruits-vegetables/logout', { method: 'POST', credentials: 'include' });
    router.push('/admin/login');
  };

  const openModal = (product: any = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name || '',
        category: product.category || 'Fresh Vegetables',
        price: product.basePrice !== undefined ? product.basePrice : (product.price !== undefined ? product.price : (product.options && product.options[0] ? product.options[0].price : '')),
        unitType: product.unitType || 'kg',
        baseUnit: product.baseUnit || '1 kg',
        description: product.description || '',
        image: product.image || '',
        inStock: product.inStock !== false
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '', category: 'Fresh Vegetables', price: '40', unitType: 'kg', baseUnit: '1 kg', description: '', image: '', inStock: true
      });
    }
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await fetch(`/api/fruits-vegetables/products/${id}`, { 
        method: 'DELETE',
        headers: getAuthHeaders(false),
        credentials: 'include'
      });
      fetchProducts();
    }
  };

  const handleToggleStock = async (product: any) => {
    const newStockStatus = product.inStock === false ? true : false;
    
    // Optimistic update
    setProducts(products.map(p => (p && p.id === product.id) ? { ...p, inStock: newStockStatus } : p));
    
    try {
      await fetch(`/api/fruits-vegetables/products/${product.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(true),
        credentials: 'include',
        body: JSON.stringify({ inStock: newStockStatus })
      });
    } catch (err) {
      console.error(err);
      fetchProducts(); // Revert on failure
    }
  };

  const handleBulkStock = async (inStock: boolean) => {
    // Optimistic update
    setProducts(products.map(p => {
      if (p) {
        if (filterCategory === 'All' || p.category === filterCategory) {
          return { ...p, inStock };
        }
      }
      return p;
    }));
    
    try {
      await fetch('/api/fruits-vegetables/products/bulk', {
        method: 'POST',
        headers: getAuthHeaders(true),
        credentials: 'include',
        body: JSON.stringify({ inStock, category: filterCategory === 'All' ? null : filterCategory })
      });
    } catch (err) {
      console.error(err);
      fetchProducts(); // Revert on failure
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      let imageUrl = formData.image;

      // Handle image upload if a new file was selected
      if (imageFile) {
        const uploadData = new FormData();
        uploadData.append('file', imageFile);
        const uploadRes = await fetch('/api/fruits-vegetables/upload', {
          method: 'POST',
          headers: getAuthHeaders(false),
          credentials: 'include',
          body: uploadData
        });
        if (uploadRes.ok) {
          const result = await uploadRes.json();
          imageUrl = result.url;
        } else {
          const errText = await uploadRes.text();
          alert(`Image upload failed: ${errText}`);
          setIsSaving(false);
          return;
        }
      }

      const numPrice = Number(formData.price) || (editingProduct ? (editingProduct.basePrice || editingProduct.price || 0) : 40);

      const productPayload = {
        name: formData.name,
        category: formData.category,
        unitType: formData.unitType,
        baseUnit: formData.baseUnit,
        description: formData.description,
        image: imageUrl,
        basePrice: numPrice,
        price: numPrice,
        inStock: formData.inStock,
        options: [{ label: formData.baseUnit, price: numPrice }]
      };

      if (editingProduct) {
        await fetch(`/api/fruits-vegetables/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(true),
          credentials: 'include',
          body: JSON.stringify(productPayload)
        });
        setProducts(prev => prev.map(p => (p && p.id === editingProduct.id) ? { ...p, ...productPayload, image: imageUrl } : p));
      } else {
        const res = await fetch('/api/fruits-vegetables/products', {
          method: 'POST',
          headers: getAuthHeaders(true),
          credentials: 'include',
          body: JSON.stringify(productPayload)
        });
        const created = await res.json();
        setProducts(prev => [...prev, created]);
      }

      setIsModalOpen(false);
      await fetchProducts();
    } catch (err) {
      console.error(err);
      alert('Failed to save product');
    } finally {
      setIsSaving(false);
    }
  };

  const formatImgSrc = (url: string) => {
    if (!url) return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&h=600&fit=crop';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/uploads/')) return url;
    if (url.startsWith('uploads/')) return `/${url}`;
    if (url.startsWith('/images/')) return `/fruits${url}`;
    if (url.startsWith('images/')) return `/fruits/${url}`;
    if (url.includes('.') && !url.includes('/')) return `/uploads/${url}`;
    return url;
  };

  return (
    <div className={styles.adminLayout}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <span style={{ color: '#0d6efd', fontWeight: 900, fontSize: '1.5rem' }}>N2D</span>
          <h2>Admin Dashboard</h2>
        </div>
        <button onClick={handleLogout} className={styles.logoutBtn}>
          <LogOut size={18} /> Logout
        </button>
      </header>

      <main className={styles.main}>
        <div className={styles.tableHeader}>
          <h3>Inventory Management</h3>
          <div className={styles.headerActions}>
            <select 
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value)}
              className={styles.categoryFilterSelect}
            >
              <option value="All">All Categories</option>
              <option value="Fresh Vegetables">Fresh Vegetables</option>
              <option value="Leafy Vegetables">Leafy Vegetables</option>
              <option value="Root Vegetables">Root Vegetables</option>
              <option value="Herbs & Seasonings">Herbs & Seasonings</option>
              <option value="Fresh Fruits">Fresh Fruits</option>
              <option value="Citrus Fruits">Citrus Fruits</option>
              <option value="Seasonal Fruits">Seasonal Fruits</option>
              <option value="Premium Fruits">Premium Fruits</option>
            </select>
            <button onClick={() => handleBulkStock(true)} style={{ backgroundColor: '#22c55e', color: '#fff' }} className={styles.addBtn}>
              <CheckCircle size={16} /> In Stock
            </button>
            <button onClick={() => handleBulkStock(false)} style={{ backgroundColor: '#ef4444', color: '#fff' }} className={styles.addBtn}>
              <XCircle size={16} /> Out of Stock
            </button>
            <button onClick={() => openModal()} className={styles.addBtn}>
              <Plus size={18} /> Add Product
            </button>
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>Loading inventory...</div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products
                  .filter(p => p && p.id)
                  .filter(p => filterCategory === 'All' ? true : p.category === filterCategory)
                  .filter(p => !searchQuery ? true : (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(p => (
                  <tr key={p.id}>
                    <td>
                      <img 
                        src={formatImgSrc(p.image)} 
                        alt={p.name} 
                        className={styles.productThumb} 
                        onError={(e) => {
                          if (p.image && p.image.startsWith('/uploads/')) return;
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&h=600&fit=crop';
                        }}
                      />
                    </td>
                    <td className={styles.fw600}>{p.name}</td>
                    <td><span className={styles.categoryBadge}>{p.category}</span></td>
                    <td>₹{p.basePrice !== undefined ? p.basePrice : (p.price !== undefined ? p.price : (p.options && p.options[0] ? p.options[0].price : 'N/A'))}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label className={styles.switch}>
                          <input 
                            type="checkbox" 
                            checked={p.inStock !== false} 
                            onChange={() => handleToggleStock(p)}
                          />
                          <span className={styles.slider}></span>
                        </label>
                        <span className={p.inStock !== false ? styles.inStock : styles.outOfStock} style={{ fontSize: '0.8rem' }}>
                          {p.inStock !== false ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button onClick={() => openModal(p)} className={styles.editBtn} title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className={styles.deleteBtn} title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Product Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => setIsModalOpen(false)} className={styles.closeModal}>×</button>
            </div>
            
            <form onSubmit={handleSave} className={styles.form}>
              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label>Product Name</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                
                <div className={styles.inputGroup}>
                  <label>Category</label>
                  <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    <option value="Fresh Vegetables">Fresh Vegetables</option>
                    <option value="Leafy Vegetables">Leafy Vegetables</option>
                    <option value="Root Vegetables">Root Vegetables</option>
                    <option value="Herbs & Seasonings">Herbs & Seasonings</option>
                    <option value="Fresh Fruits">Fresh Fruits</option>
                    <option value="Citrus Fruits">Citrus Fruits</option>
                    <option value="Seasonal Fruits">Seasonal Fruits</option>
                    <option value="Premium Fruits">Premium Fruits</option>
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label>Price (₹)</label>
                  <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="Enter price" />
                </div>

                <div className={styles.inputGroup}>
                  <label>Unit Label (e.g. 1 kg, 1 Bunch)</label>
                  <input type="text" required value={formData.baseUnit} onChange={e => setFormData({...formData, baseUnit: e.target.value})} />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label>Description</label>
                <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
              </div>

              <div className={styles.imageUploadSection}>
                <label>Product Image</label>
                <div className={styles.fileInputWrapper}>
                  <ImageIcon size={20} className={styles.fileIcon} />
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setImageFile(e.target.files[0]);
                      }
                    }} 
                  />
                  <span>{imageFile ? imageFile.name : (editingProduct ? 'Upload new image to replace' : 'Choose an image file')}</span>
                </div>
                {imageFile ? (
                  <div className={styles.currentImage}>
                    <span>Preview:</span>
                    <img src={URL.createObjectURL(imageFile)} alt="Preview" height={45} style={{ borderRadius: 6, objectFit: 'cover', border: '1px solid #22c55e' }} />
                  </div>
                ) : (formData.image && (
                  <div className={styles.currentImage}>
                    <span>Current:</span>
                    <img src={formatImgSrc(formData.image)} alt="Preview" height={45} style={{ borderRadius: 6, objectFit: 'cover' }} />
                  </div>
                ))}
              </div>

              <div className={styles.checkboxGroup}>
                <input type="checkbox" id="stock" checked={formData.inStock} onChange={e => setFormData({...formData, inStock: e.target.checked})} />
                <label htmlFor="stock">Currently In Stock</label>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" onClick={() => setIsModalOpen(false)} className={styles.cancelBtn}>Cancel</button>
                <button type="submit" disabled={isSaving} className={styles.saveBtn}>
                  {isSaving ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
