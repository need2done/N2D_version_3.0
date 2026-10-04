import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const DataContext = createContext();

const initialServices = [
  { id: 1, name: 'Dish Washing', image: `${import.meta.env.BASE_URL}images/dishwashing.png`, base_price: 299, duration: '1 Hour', description: 'Professional dish washing service. We use safe and effective cleaning agents.', rating: 4.8, reviewCount: 120 },
  { id: 2, name: 'Kitchen Cleaning', image: `${import.meta.env.BASE_URL}images/kitchen.png`, base_price: 399, duration: '2 Hours', description: 'Complete kitchen deep cleaning including slabs, cabinets, and sink area.', rating: 4.7, reviewCount: 250 },
  { id: 3, name: 'Fan Cleaning', image: `${import.meta.env.BASE_URL}images/fan.png`, base_price: 99, duration: '1 Hour', description: 'Thorough cleaning of ceiling fans, removing dust and grime.', rating: 4.6, reviewCount: 89 },
  { id: 4, name: 'Window Cleaning', image: `${import.meta.env.BASE_URL}images/window.png`, base_price: 199, duration: '1.5 Hours', description: 'Spotless window cleaning for inside and outside glasses.', rating: 4.5, reviewCount: 150 },
  { id: 5, name: 'Laundry Help', image: `${import.meta.env.BASE_URL}images/laundry.png`, base_price: 149, duration: '1 Hour', description: 'Washing, folding, and basic ironing of everyday clothes.', rating: 4.8, reviewCount: 320 },
  { id: 6, name: 'Bathroom Cleaning', image: `${import.meta.env.BASE_URL}images/bathroom.png`, base_price: 499, duration: '2 Hours', description: 'Deep cleaning and sanitization of your bathroom, floor, and fixtures.', rating: 4.9, reviewCount: 410 }
];

const defaultBannerConfig = {
  isActive: true,
  badgeText: '🪔 FESTIVE SPECIAL • DUSSEHRA DHAMAKA 🏹',
  title: 'Celebrate Dussehra with a Sparkling Clean Home',
  subtitle: 'Get FLAT 20% OFF on all professional cleaning, repairs, and kitchen deep-clean services. Code DUSSEHRA is automatically applied at checkout!',
  discountBadge: '20% OFF',
  couponCode: 'DUSSEHRA',
  discountPercent: 20,
  ctaText: 'Book Service with 20% OFF',
  theme: 'amber'
};

const defaultCouponConfig = {
  autoApply: true,
  defaultCoupon: 'DUSSEHRA',
  coupons: [
    { code: 'DUSSEHRA', discountPercent: 20, description: 'Festive 20% Discount' },
    { code: 'DASARA', discountPercent: 20, description: 'Festive 20% Discount' },
    { code: 'FESTIVE20', discountPercent: 20, description: 'Festive 20% Discount' },
    { code: 'WELCOME10', discountPercent: 10, description: 'New User 10% Discount' }
  ]
};

export const DataProvider = ({ children }) => {
  const [services, setServices] = useState(() => {
    const saved = localStorage.getItem('n2d_services');
    return saved ? JSON.parse(saved) : initialServices;
  });

  const [platformFee, setPlatformFee] = useState(() => {
    const saved = localStorage.getItem('n2d_platform_fee');
    return saved ? parseFloat(saved) : 0;
  });

  const [isAdminAuth, setIsAdminAuth] = useState(() => {
    return localStorage.getItem('n2d_admin_auth') === 'true';
  });

  const [bannerConfig, setBannerConfig] = useState(() => {
    const saved = localStorage.getItem('n2d_banner_config');
    return saved ? JSON.parse(saved) : defaultBannerConfig;
  });

  const [couponConfig, setCouponConfig] = useState(() => {
    const saved = localStorage.getItem('n2d_coupon_config');
    return saved ? JSON.parse(saved) : defaultCouponConfig;
  });

  // Fetch remote banner and coupon config on load
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get('/home-services/banner-config');
        if (res.data && res.data.success) {
          if (res.data.banner) {
            setBannerConfig(prev => ({ ...prev, ...res.data.banner }));
            localStorage.setItem('n2d_banner_config', JSON.stringify(res.data.banner));
          }
          if (res.data.coupons) {
            setCouponConfig(prev => ({ ...prev, ...res.data.coupons }));
            localStorage.setItem('n2d_coupon_config', JSON.stringify(res.data.coupons));
          }
        }
      } catch (err) {
        console.warn('Using local banner/coupon settings:', err.message);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    localStorage.setItem('n2d_services', JSON.stringify(services));
  }, [services]);

  useEffect(() => {
    localStorage.setItem('n2d_platform_fee', platformFee.toString());
  }, [platformFee]);

  useEffect(() => {
    localStorage.setItem('n2d_admin_auth', isAdminAuth.toString());
  }, [isAdminAuth]);

  // Actions
  const addService = (newService) => {
    const nextId = services.length > 0 ? Math.max(...services.map(s => s.id)) + 1 : 1;
    setServices([...services, { ...newService, id: nextId, rating: 5.0, reviewCount: 0 }]);
  };

  const updateService = (id, updatedData) => {
    setServices(services.map(s => s.id === id ? { ...s, ...updatedData } : s));
  };

  const deleteService = (id) => {
    setServices(services.filter(s => s.id !== id));
  };

  const saveBannerConfig = async (newBanner) => {
    setBannerConfig(newBanner);
    localStorage.setItem('n2d_banner_config', JSON.stringify(newBanner));
    try {
      await api.post('/home-services/admin/banner-config', { banner: newBanner });
    } catch (e) {
      console.error('Failed to sync banner config with backend:', e);
    }
  };

  const saveCouponConfig = async (newCoupons) => {
    setCouponConfig(newCoupons);
    localStorage.setItem('n2d_coupon_config', JSON.stringify(newCoupons));
    try {
      await api.post('/home-services/admin/banner-config', { coupons: newCoupons });
    } catch (e) {
      console.error('Failed to sync coupon config with backend:', e);
    }
  };

  return (
    <DataContext.Provider value={{
      services, addService, updateService, deleteService,
      platformFee, setPlatformFee,
      isAdminAuth, setIsAdminAuth,
      bannerConfig, setBannerConfig, saveBannerConfig,
      couponConfig, setCouponConfig, saveCouponConfig
    }}>
      {children}
    </DataContext.Provider>
  );
};
