import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import styles from './Sidebar.module.css';

const categories = [
  'All Items',
  'Fresh Vegetables',
  'Leafy Vegetables',
  'Root Vegetables',
  'Herbs & Seasonings',
  'Fresh Fruits',
  'Citrus Fruits',
  'Seasonal Fruits',
  'Premium Fruits',
];

interface SidebarProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export default function Sidebar({ selectedCategory, onSelectCategory }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    document.addEventListener('open-mobile-sidebar', handleOpen);
    return () => document.removeEventListener('open-mobile-sidebar', handleOpen);
  }, []);

  return (
    <>
      {isOpen && <div className={styles.overlay} onClick={() => setIsOpen(false)} />}

      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
        <div className={styles.mobileHeader}>
          <h2>Categories</h2>
          <button onClick={() => setIsOpen(false)}><X size={24} /></button>
        </div>
        
        <h3 className={styles.sectionTitle}>Categories</h3>
      <div className={styles.categoryList}>
        {categories.map((cat) => (
          <div 
            key={cat} 
            className={`${styles.categoryItem} ${selectedCategory === cat ? styles.active : ''}`}
            onClick={() => {
              onSelectCategory(cat);
              setIsOpen(false);
            }}
          >
            <span>{cat}</span>
          </div>
        ))}
      </div>
    </aside>
    </>
  );
}
