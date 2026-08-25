'use client';

import React from 'react';
import Link from 'next/link';
import { Search, ShoppingCart, MapPin, Menu, LocateFixed, ChevronDown, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useSearch } from '@/context/SearchContext';
import styles from './Header.module.css';

export default function Header() {
  const { cartItems, openCart } = useCart();
  const { searchQuery, setSearchQuery } = useSearch();
  const [location, setLocation] = React.useState('Select Location');
  const [isLocating, setIsLocating] = React.useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = React.useState(false);
  const [locationSearchInput, setLocationSearchInput] = React.useState('');
  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const handleDetectLocation = async (exact = false) => {
    setIsLocating(true);

    if (exact && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await res.json();
            
            if (data && data.address) {
              const area = data.address.suburb || data.address.neighbourhood || data.address.residential || data.address.road || 'Unknown Area';
              const city = data.address.city || data.address.town || data.address.state_district || '';
              setLocation(`${area}${city ? ', ' + city : ''}`);
              setIsLocationModalOpen(false);
            } else {
              setLocation('Location not found');
            }
          } catch (e) {
            setLocation('Select Location');
          } finally {
            setIsLocating(false);
          }
        },
        async (error) => {
          console.error("GPS Denied", error);
          fetchIpLocation();
        }
      );
    } else {
      fetchIpLocation();
    }
  };

  const fetchIpLocation = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      if (data && data.city) {
        setLocation(data.city);
        setIsLocationModalOpen(false);
      } else {
        setLocation('Select Location');
      }
    } catch (e) {
      setLocation('Select Location');
    } finally {
      setIsLocating(false);
    }
  };

  React.useEffect(() => {
    handleDetectLocation(false); // Only IP fallback on mount
  }, []);
  return (
    <header className={styles.header}>
      <div className={`container ${styles.headerContainer}`}>
        
        {/* Left Section: Logo & Location */}
        <div className={styles.leftSection}>
          <button 
            className={styles.menuBtn} 
            aria-label="Menu"
            onClick={() => document.dispatchEvent(new Event('open-mobile-sidebar'))}
          >
            <Menu size={28} />
          </button>
          
          <Link 
            href="/" 
            className={styles.logo}
            onClick={() => {
              setSearchQuery('');
              document.dispatchEvent(new Event('reset-home-view'));
            }}
          >
            <img src="/logo.png?v=2" alt="Need2done Logo" className={styles.logoImg} />
          </Link>

          <div className={styles.locationContainer} onClick={() => setIsLocationModalOpen(true)} title="Click to select location">
            <div className={styles.locationIconWrapper}>
              <MapPin size={22} color="white" />
            </div>
            <div className={styles.locationTextWrapper}>
              <div className={styles.locationTitle}>
                Deliver to <ChevronDown size={14} />
              </div>
              <div className={styles.locationSubtitle}>{location}</div>
            </div>
          </div>
        </div>

        {/* Center Section: Search */}
        <div className={styles.searchContainer}>
          <Search size={20} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search fruits and vegetables..." 
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Right Section: Cart & Admin */}
        <div className={styles.rightSection}>
          <button className={styles.cartButton} onClick={openCart}>
            <ShoppingCart size={20} />
            <span className={styles.cartCount}>{totalItems}</span>
          </button>
          <Link href="/admin" className={styles.adminLoginBtn} title="Admin Portal">
            Admin 🔐
          </Link>
        </div>
      </div>

      {/* Location Modal */}
      {isLocationModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsLocationModalOpen(false)}>
          <div className={styles.locationModal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Select Location</h3>
              <button onClick={() => setIsLocationModalOpen(false)} className={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <button className={styles.detectLocationBtn} onClick={() => handleDetectLocation(true)}>
                {isLocating ? <LocateFixed size={18} className="animate-spin" /> : <LocateFixed size={18} />}
                <span>Detect Exact Location (GPS)</span>
              </button>
              
              <div className={styles.divider}>
                <span>or enter manually</span>
              </div>
              
              <div className={styles.locationSearchBox}>
                <Search size={18} className={styles.searchIconSmall} />
                <input 
                  type="text" 
                  placeholder="Enter your area, city or pincode" 
                  value={locationSearchInput}
                  onChange={(e) => setLocationSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && locationSearchInput.trim() !== '') {
                      setLocation(locationSearchInput.trim());
                      setIsLocationModalOpen(false);
                    }
                  }}
                  autoFocus
                />
              </div>
              <button 
                className={styles.applyLocationBtn} 
                disabled={!locationSearchInput.trim()}
                onClick={() => {
                  if (locationSearchInput.trim() !== '') {
                    setLocation(locationSearchInput.trim());
                    setIsLocationModalOpen(false);
                  }
                }}
              >
                Confirm Location
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
