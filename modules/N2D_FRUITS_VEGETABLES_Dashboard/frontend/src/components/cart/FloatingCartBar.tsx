'use client';

import React from 'react';
import { useCart } from '@/context/CartContext';
import { usePathname } from 'next/navigation';
import styles from './FloatingCartBar.module.css';
import { ChevronUp } from 'lucide-react';

export default function FloatingCartBar() {
  const { cartItems, isCartOpen, openCart, grandTotal } = useCart();
  const pathname = usePathname();

  // If cart is empty or the drawer is currently open, don't show this sticky bar
  if (cartItems.length === 0 || isCartOpen || pathname?.startsWith('/admin')) {
    return null;
  }

  // Get up to 3 images to display in the stack
  const previewItems = cartItems.slice(0, 3);
  const totalItemsCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className={styles.container} onClick={openCart}>
      <div className={styles.leftSection}>
        <div className={styles.imageStack}>
          {previewItems.map((item, index) => (
            <img 
              key={`${item.id}-${index}`} 
              src={item.product.image} 
              alt={item.product.name} 
              className={styles.stackImage} 
              style={{ zIndex: 10 - index }}
            />
          ))}
        </div>
        <div className={styles.info}>
          <div className={styles.itemCount}>
            {totalItemsCount} {totalItemsCount === 1 ? 'Item' : 'Items'} <ChevronUp size={16} color="#64748b" />
          </div>
          <div className={styles.subText}>
            Total ₹{grandTotal} • View Cart
          </div>
        </div>
      </div>
      <button className={styles.goBtn} onClick={(e) => { e.stopPropagation(); openCart(); }}>
        Go to Cart
      </button>
    </div>
  );
}
