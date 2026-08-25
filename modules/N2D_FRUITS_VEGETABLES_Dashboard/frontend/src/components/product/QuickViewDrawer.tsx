'use client';

import React, { useState, useEffect } from 'react';
import { X, Star } from 'lucide-react';
import { useQuickView } from '@/context/QuickViewContext';
import { useCart } from '@/context/CartContext';
import styles from './QuickViewDrawer.module.css';

export default function QuickViewDrawer() {
  const { isOpen, product, closeQuickView } = useQuickView();
  const { addToCart } = useCart();
  const [selectedOption, setSelectedOption] = useState(0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSelectedOption(0);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!product) return null;

  const options = product.quantityOptions || (product as any).options || [{ label: product.baseUnit || '1 Unit', price: (product as any).basePrice ?? (product as any).price ?? 0, value: 1 }];
  const currentOption = options[selectedOption] || options[0];
  const dynamicPrice = currentOption.price;

  return (
    <div className={`${styles.overlay} ${isOpen ? styles.open : ''}`} onClick={closeQuickView}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Quick View</h2>
          <button className={styles.closeBtn} onClick={closeQuickView}>
            <X size={20} />
          </button>
        </div>
        
        <div className={styles.content}>
          <div className={styles.imageGallery}>
            <img src={product.image} alt={product.name} className={styles.image} />
          </div>

          <div className={styles.productInfo}>
            <h1 className={styles.productName}>{product.name}</h1>
            <div className={styles.badges}>
              {product.badge && <span className={styles.badge}>{product.badge}</span>}
              <span className={styles.badge}>Farm Fresh</span>
            </div>
            <div className={styles.rating}>
              <Star size={16} fill="#fbbf24" color="#fbbf24" />
              <strong>{product.rating}</strong>
              <span>({product.reviewCount} Reviews)</span>
            </div>
          </div>

          <div className={styles.priceSection}>
            <div className={styles.price}>₹{dynamicPrice}</div>
          </div>

          <div className={styles.quantitySection}>
            <label className={styles.quantityLabel}>Choose Quantity</label>
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
            
            {((product as any).inStock === false || product.status === 'Out of Stock') && (
              <p style={{ color: '#ef4444', fontSize: '0.9rem', marginTop: '8px', fontWeight: 'bold' }}>
                Currently Unavailable
              </p>
            )}
          </div>

          <div className={styles.description}>
            <p>{product.description}</p>
            <br/>
            <strong>Delivery:</strong> 25-35 Minutes<br/>
            <strong>Origin:</strong> Bhongir Local Farmers
          </div>
        </div>

        <div className={styles.footer}>
          <button 
            className={styles.addToCartBtn}
            disabled={(product as any).inStock === false || product.status === 'Out of Stock'}
            onClick={() => {
              addToCart(product, currentOption);
              closeQuickView();
            }}
          >
            {((product as any).inStock === false || product.status === 'Out of Stock') ? 'Out of Stock' : 'Add to Cart'}
          </button>
          <button className={styles.viewDetailsBtn} onClick={closeQuickView}>Continue Shopping</button>
        </div>
      </div>
    </div>
  );
}
