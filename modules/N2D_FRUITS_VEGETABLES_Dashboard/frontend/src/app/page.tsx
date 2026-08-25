'use client';

import React, { useState, useEffect } from 'react';
import HeroBanner from '@/components/layout/HeroBanner';
import Sidebar from '@/components/layout/Sidebar';
import ProductCard from '@/components/product/ProductCard';
import { useSearch } from '@/context/SearchContext';
import styles from './page.module.css';

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState('All Items');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockFilter, setStockFilter] = useState('All');
  const { searchQuery } = useSearch();

  useEffect(() => {
    const loadProducts = () => {
      fetch(`/api/fruits-vegetables/products?t=${Date.now()}`, { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          setProducts(data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to load products', err);
          setLoading(false);
        });
    };

    loadProducts();
    
    // Poll every 5 seconds to keep customer dashboard in sync with Admin changes
    const intervalId = setInterval(loadProducts, 5000);
    
    // Listen for logo clicks to reset view
    const handleReset = () => {
      setSelectedCategory('All Items');
      setStockFilter('All');
    };
    document.addEventListener('reset-home-view', handleReset);
    
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('reset-home-view', handleReset);
    };
  }, []);

  const filteredProducts = products.filter(p => {
    if (!p || !p.name) return false;
    const matchesCategory = selectedCategory === 'All Items' || p.category === selectedCategory;
    const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesStock = true;
    if (stockFilter === 'In Stock') {
      matchesStock = p.inStock !== false && p.status !== 'Out of Stock';
    } else if (stockFilter === 'Out of Stock') {
      matchesStock = p.inStock === false || p.status === 'Out of Stock';
    }

    return matchesCategory && matchesSearch && matchesStock;
  });

  return (
    <div className={`container ${styles.mainLayout}`}>
      <Sidebar 
        selectedCategory={selectedCategory} 
        onSelectCategory={setSelectedCategory} 
      />
      <div className={styles.contentArea}>
        <HeroBanner />
        
        <div className={styles.sectionHeader}>
          <h2>{selectedCategory}</h2>
          <select 
            className={styles.stockFilter}
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
          >
            <option value="All">All Products</option>
            <option value="In Stock">In Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
        </div>

        <div className={styles.productGrid}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', gridColumn: '1 / -1' }}>
              <h3 style={{ color: 'var(--text-muted)' }}>Loading fresh products...</h3>
            </div>
          ) : filteredProducts.length > 0 ? (
            filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))
          ) : (
            <div className={styles.noResults}>
              <h3>No products found</h3>
              <p>Try selecting a different category or search term.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
