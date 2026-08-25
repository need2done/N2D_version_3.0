'use client';

import React, { useState } from 'react';
import { Heart, Star, Eye } from 'lucide-react';
import { Product } from '@/data/mockProducts';
import { useQuickView } from '@/context/QuickViewContext';
import { useCart } from '@/context/CartContext';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [selectedOption, setSelectedOption] = useState(0);
  const { openQuickView } = useQuickView();
  const { addToCart } = useCart();
  const options = product.quantityOptions || (product as any).options || [{ label: product.baseUnit || '1 Unit', price: (product as any).basePrice ?? (product as any).price ?? 0, value: 1 }];
  const currentOption = options[selectedOption] || options[0];
  const dynamicPrice = currentOption.price;
  
  // Calculate dynamic original price if available
  const dynamicOriginalPrice = product.originalPrice && currentOption.value
    ? (product.originalPrice * currentOption.value).toFixed(2)
    : null;

  return (
    <div className={styles.card}>
      <div className={styles.imageContainer} onClick={() => openQuickView(product)} style={{ cursor: 'pointer', position: 'relative' }}>
        {product.badge && <span className={styles.badge}>{product.badge}</span>}
        <button className={styles.wishlistBtn} aria-label="Add to wishlist" onClick={(e) => e.stopPropagation()}>
          <Heart size={18} />
        </button>
        {/* Using standard img for now, can be upgraded to next/image later */}
        <img 
          src={product.image} 
          alt={product.name} 
          className={styles.productImage} 
          style={{ opacity: ((product as any).inStock === false || product.status === 'Out of Stock') ? 0.5 : 1 }} 
          onError={(e) => {
            if (product.image && product.image.startsWith('/uploads/')) return;
            e.currentTarget.onerror = null;
            e.currentTarget.src = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&h=600&fit=crop';
          }}
        />
        
        {((product as any).inStock === false || product.status === 'Out of Stock') && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
            <span style={{ backgroundColor: '#ef4444', color: 'white', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '1rem', transform: 'rotate(-10deg)', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>OUT OF STOCK</span>
          </div>
        )}

        <div style={{ position: 'absolute', bottom: '8px', left: '8px', right: '8px', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.9)', padding: '4px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--primary-dark)', opacity: 0.8 }}>
          <Eye size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}/> Quick View
        </div>
      </div>

      <h3 className={styles.title} title={product.name}>{product.name}</h3>
      
      <div className={styles.rating}>
        <Star size={14} className={styles.star} fill="currentColor" />
        <span>{product.rating}</span>
        <span>({product.reviewCount})</span>
      </div>

      <div className={styles.priceContainer}>
        <span className={styles.currentPrice}>₹{dynamicPrice}</span>
        {dynamicOriginalPrice && (
          <span className={styles.originalPrice}>₹{dynamicOriginalPrice}</span>
        )}
        {product.discount && (
          <span className={styles.discount}>{product.discount}</span>
        )}
      </div>

      <div className={styles.selectorContainer}>
        <select 
          className={styles.quantitySelect}
          value={selectedOption}
          onChange={(e) => setSelectedOption(Number(e.target.value))}
          disabled={(product as any).inStock === false || product.status === 'Out of Stock'}
        >
          {options.map((opt: any, idx: number) => (
            <option key={opt.label || idx} value={idx}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      
      {((product as any).inStock === false || product.status === 'Out of Stock') && (
        <p style={{ textAlign: 'center', color: '#ef4444', fontSize: '0.85rem', margin: '4px 0 8px 0', fontWeight: 'bold' }}>
          Currently Unavailable
        </p>
      )}

      <button 
        className={styles.addToCartBtn}
        disabled={(product as any).inStock === false || product.status === 'Out of Stock'}
        onClick={() => addToCart(product, currentOption)}
      >
        {((product as any).inStock === false || product.status === 'Out of Stock') ? 'Out of Stock' : 'Add to Cart'}
      </button>
    </div>
  );
}
