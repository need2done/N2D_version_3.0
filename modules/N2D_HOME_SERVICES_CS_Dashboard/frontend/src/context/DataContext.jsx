import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const DataContext = createContext();

export const initialServices = [
  {
    id: 1,
    name: 'Kitchen Cleaning',
    image: `${import.meta.env.BASE_URL}images/kitchen.png`,
    base_price: 299,
    duration: '1.5 - 2 Hours',
    short_summary: 'Dishes • Sink Scrub • Slab Wipe • Vessels Stack',
    description: 'Daily kitchen cleaning help for your home. Helper washes all used plates and cooking vessels, scrubs the sink clean, wipes down cooking slabs, and stacks dishes neatly in racks.',
    rating: 4.8,
    reviewCount: 310,
    whats_included: [
      'Washing all dishes, plates, cookware, frying pans, and spoons',
      'Thorough scrubbing of kitchen sink and food drain hole',
      'Wiping down cooking counter slabs, stove top, and backsplash tiles',
      'Neatly stacking cleaned dishes and vessels back in racks',
      'Clearing wet food waste into dustbin'
    ],
    whats_not_included: [
      'Chimney interior motor deep degreasing',
      'Electrical repairs of refrigerator or microwave',
      'Scrubbing heavily burnt grease built up over months'
    ]
  },
  {
    id: 2,
    name: 'Laundry Help',
    image: `${import.meta.env.BASE_URL}images/laundry.png`,
    base_price: 27,
    duration: 'Return in 12 - 48 Hours',
    is_custom: true,
    short_summary: 'Wash • Stand Dry • Steam Press • Fold',
    description: 'Hassle-free doorstep laundry service. We pick up your clothes, wash them separately, dry them, give them a crisp steam iron, fold them neatly, and deliver back in 12 to 48 hours.',
    rating: 4.8,
    reviewCount: 240,
    custom_options: [
      { id: 'opt_laundry_wash', name: 'Washing Everyday Clothes (Bucket / Machine)', price: 8, duration: 'Machine / Bucket Wash' },
      { id: 'opt_laundry_dry', name: 'Proper Clothes Drying (Hangers / Lines)', price: 4, duration: 'Sun & Stand Drying' },
      { id: 'opt_laundry_iron', name: 'Crisp Pressing / Steam Ironing', price: 10, duration: 'Crisp Steam Press' },
      { id: 'opt_laundry_fold', name: 'Neat Wardrobe Folding & Stacking', price: 5, duration: 'Wardrobe Stacking' }
    ],
    whats_included: [
      'Free doorstep pickup & return at your scheduled time slot (12 - 48 hrs)',
      '100% separate wash — your clothes are never mixed with anyone else\'s',
      'Gentle wash using quality skin-safe detergent and fabric softener',
      'Safe drying that keeps colors bright and prevents fabric shrinking',
      'Crisp steam pressing for wrinkle-free shirts, trousers, sarees, and kurtis',
      'Clean wardrobe folding and dust-proof protective cover packaging'
    ],
    whats_not_included: [
      'Heavy commercial rugs, thick carpets, or doormats cleaning',
      'Dry-cleaning delicate bridal lehengas or heavy zari wedding sarees',
      'Genuine leather, suede, or velvet chemical restoration',
      'Corrosive chemical bleaching of colored fabrics'
    ]
  },
  {
    id: 3,
    name: 'Cloth Washing',
    image: `${import.meta.env.BASE_URL}images/cloth_washing_v2.png`,
    base_price: 230,
    duration: '1 Hour',
    short_summary: 'Daily Clothes Wash • Machine / Bucket • Line Dry',
    description: 'Everyday clothes washing at your home. Helper washes your daily wear clothes and bedsheets using your washing machine or bucket, and hangs them neatly on your drying rack or line.',
    rating: 4.7,
    reviewCount: 185,
    whats_included: [
      'Washing daily wear shirts, trousers, nightwear, kurtis, and bedsheets',
      'Separating white clothes and colored fabrics to avoid color bleeding',
      'Machine wash or gentle bucket washing using your preferred detergent',
      'Spreading and hanging washed clothes neatly on drying stands or lines'
    ],
    whats_not_included: [
      'Ironing or steam pressing clothes (available in Laundry Help)',
      'Wardrobe folding dry clothes',
      'Dry-cleaning delicate silk sarees or formal suits'
    ]
  },
  {
    id: 4,
    name: 'Floor Maintenance',
    image: `${import.meta.env.BASE_URL}images/floor_cleaning_v2.png`,
    base_price: 299,
    duration: '1.5 - 2 Hours',
    short_summary: 'Room Sweep • Tile Floor Scrub • Wet Mop',
    description: 'Complete floor sweeping, scrubbing, and mopping for your house. Helper sweeps all corner dust, scrubs tile floors with disinfectant cleaner, and wet mops for a spotless, germ-free floor.',
    rating: 4.9,
    reviewCount: 420,
    whats_included: [
      'Complete broom sweeping across hall, bedrooms, kitchen, and balcony',
      'Scrubbing stubborn dirt, sticky spots, and grime from floor tiles',
      'Deep wet mopping with fresh-fragrance disinfectant cleaner',
      'Dry wipe finish to prevent slippery floors and leave a clean shine'
    ],
    whats_not_included: [
      'Full bathroom acid wash (included in Full House Deep Clean)',
      'Balcony ceiling fan and window grill cleaning',
      'Moving heavy wooden almirahs or loaded cots'
    ]
  },
  {
    id: 5,
    name: 'Custom Package',
    image: `${import.meta.env.BASE_URL}images/custom_service_v2.png`,
    base_price: 349,
    duration: 'Custom Duration',
    is_custom: true,
    short_summary: 'Choose Tasks: Kitchen, Washing, Sweeping, or Scrubbing',
    description: 'Design your own home cleaning package! Pick only the chores you need done today—Dish washing, clothes wash, broom sweeping, or deep floor washing. Pay only for the chores you select.',
    rating: 4.9,
    reviewCount: 512,
    custom_options: [
      { id: 'opt_kitchen', name: 'Kitchen Cleaning (Dishes, Sink & Arrange)', price: 199, duration: '45 mins' },
      { id: 'opt_clothes', name: 'Cloth Washing (Wash & Hang on Hangers)', price: 199, duration: '30 mins' },
      { id: 'opt_floor_clean', name: 'Floor Cleaning (Broom Sweep & Mop)', price: 199, duration: '45 mins' },
      { id: 'opt_floor_wash', name: 'Floor Washing (Deep Water Scrub & Wash)', price: 199, duration: '45 mins' }
    ],
    whats_included: [
      'Interactive checklist: Select only the chores you need',
      'Instant live price update matching strictly your selected chores',
      'Background-verified helper assigned to finish tasks on time',
      'Chore verification before the helper departs'
    ],
    whats_not_included: [
      'Chores not ticked in your booking checklist',
      'Unscheduled full house deep cleaning'
    ]
  },
  {
    id: 6,
    name: 'Full House Deep Clean (2BHK / House)',
    image: `${import.meta.env.BASE_URL}images/bathroom.png`,
    base_price: 1199,
    duration: '4 - 5 Hours',
    short_summary: 'Deep Clean: Bathrooms, Ceiling Fans, Windows & Floors',
    description: 'Total house deep cleaning for 1BHK, 2BHK, or 3BHK homes. Deep bathroom cleaning (tiles & commode), ceiling fans, window glass & mosquito mesh, cobweb removal, and full house floor scrubbing.',
    rating: 4.9,
    reviewCount: 650,
    whats_included: [
      '🚿 Deep Bathroom Cleaning: Hard water stain removal from wall tiles, commode acid scrub, tap shine & floor sanitization',
      '🪭 Ceiling Fans & Lights: Dust and sticky oil removal from all fans, lights, and switchboards',
      '🪟 Windows & Mosquito Grills: Window glass wiped clear and mesh screens dusted clean',
      '🕸️ Cobweb Removal: Complete clearing of all ceiling cobwebs and corner dust across every room',
      '🧹 Full House Deep Floor Scrub: Kitchen, hall, bedrooms, and balcony wet washed and scrubbed clean'
    ],
    whats_not_included: [
      'Wall painting, plastering, or water leakage repair',
      'Shifting heavy double cots or loaded wooden almirahs outside the home',
      'Terrace or roof water tank cleaning'
    ]
  }
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
    const saved = localStorage.getItem('n2d_services_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && !parsed.some(s => s.name === 'Fan Cleaning' || s.name === 'Window Cleaning')) {
          return parsed;
        }
      } catch (e) {}
    }
    return initialServices;
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

  // Fetch remote banner, coupon, and services config on load
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get(`/home-services/banner-config?_t=${Date.now()}`);
        if (res.data && res.data.success) {
          if (res.data.banner) {
            setBannerConfig(prev => ({ ...prev, ...res.data.banner }));
            localStorage.setItem('n2d_banner_config', JSON.stringify(res.data.banner));
          }
          if (res.data.coupons) {
            setCouponConfig(prev => ({ ...prev, ...res.data.coupons }));
            localStorage.setItem('n2d_coupon_config', JSON.stringify(res.data.coupons));
          }
          if (res.data.services && Array.isArray(res.data.services) && res.data.services.length > 0) {
            setServices(res.data.services);
            localStorage.setItem('n2d_services_v3', JSON.stringify(res.data.services));
          }
        }
      } catch (err) {
        console.warn('Using local banner/coupon settings:', err.message);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    localStorage.setItem('n2d_services_v3', JSON.stringify(services));
  }, [services]);

  useEffect(() => {
    localStorage.setItem('n2d_platform_fee', platformFee.toString());
  }, [platformFee]);

  useEffect(() => {
    localStorage.setItem('n2d_admin_auth', isAdminAuth.toString());
  }, [isAdminAuth]);

  // Actions
  const syncServicesToBackend = async (newServices) => {
    try {
      await api.post('/home-services/admin/services-config', { services: newServices });
    } catch (e) {
      console.warn('Could not sync services to backend API (will retry on next action):', e.message);
    }
  };

  const addService = async (newService) => {
    const nextId = services.length > 0 ? Math.max(...services.map(s => s.id)) + 1 : 1;
    const updated = [...services, { ...newService, id: nextId, rating: 5.0, reviewCount: 0 }];
    setServices(updated);
    await syncServicesToBackend(updated);
  };

  const updateService = async (id, updatedData) => {
    const updated = services.map(s => s.id === id ? { ...s, ...updatedData } : s);
    setServices(updated);
    await syncServicesToBackend(updated);
  };

  const deleteService = async (id) => {
    const updated = services.filter(s => s.id !== id);
    setServices(updated);
    await syncServicesToBackend(updated);
  };

  const resetServices = async () => {
    setServices(initialServices);
    localStorage.setItem('n2d_services_v2', JSON.stringify(initialServices));
    localStorage.removeItem('n2d_services');
    await syncServicesToBackend(initialServices);
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
      services, addService, updateService, deleteService, resetServices,
      platformFee, setPlatformFee,
      isAdminAuth, setIsAdminAuth,
      bannerConfig, setBannerConfig, saveBannerConfig,
      couponConfig, setCouponConfig, saveCouponConfig
    }}>
      {children}
    </DataContext.Provider>
  );
};
