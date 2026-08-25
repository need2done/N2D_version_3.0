import React, { useState, useEffect } from 'react';
import styles from './HeroBanner.module.css';

const banners = [
  {
    id: 1,
    title: 'Farm Fresh Vegetables',
    subtitle: 'Delivered in 30 Minutes to your doorstep',
    badge: 'Flat 10% OFF',
    bgClass: styles.bgVeggie
  },
  {
    id: 2,
    title: 'Premium Exotic Fruits',
    subtitle: 'Handpicked quality, rich in taste & nutrition',
    badge: 'Fresh Arrival',
    bgClass: styles.bgFruits
  },
  {
    id: 3,
    title: 'Need2Done',
    subtitle: 'Your one-stop destination for fresh Fruits and Vegetables.',
    badge: '100% Quality Assured',
    bgClass: styles.bgBrand
  }
];

export default function HeroBanner() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className={styles.bannerContainer}>
      {banners.map((banner, index) => (
        <div 
          key={banner.id} 
          className={`${styles.banner} ${banner.bgClass} ${index === current ? styles.active : ''}`}
        >
          <div className={styles.content}>
            <h2 className={styles.title}>{banner.title}</h2>
            <p className={styles.subtitle}>{banner.subtitle}</p>
            <div className={styles.offerBadge}>{banner.badge}</div>
          </div>
        </div>
      ))}
      <div className={styles.indicators}>
        {banners.map((_, index) => (
          <button 
            key={index} 
            className={`${styles.dot} ${index === current ? styles.activeDot : ''}`}
            onClick={() => setCurrent(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
