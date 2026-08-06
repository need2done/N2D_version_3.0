import { createContext, useContext, useState, useEffect } from 'react';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const [wishlistRestaurants, setWishlistRestaurants] = useState(() => {
    try {
      const saved = localStorage.getItem('n2d_wishlist_restaurants');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [wishlistItems, setWishlistItems] = useState(() => {
    try {
      const saved = localStorage.getItem('n2d_wishlist_items');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('n2d_wishlist_restaurants', JSON.stringify(wishlistRestaurants));
  }, [wishlistRestaurants]);

  useEffect(() => {
    localStorage.setItem('n2d_wishlist_items', JSON.stringify(wishlistItems));
  }, [wishlistItems]);

  const toggleRestaurant = (restaurantId) => {
    setWishlistRestaurants(prev =>
      prev.includes(restaurantId) ? prev.filter(id => id !== restaurantId) : [...prev, restaurantId]
    );
  };

  const toggleItem = (itemId) => {
    setWishlistItems(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const isRestaurantWishlisted = (id) => wishlistRestaurants.includes(id);
  const isItemWishlisted = (id) => wishlistItems.includes(id);

  return (
    <WishlistContext.Provider value={{
      wishlistRestaurants, wishlistItems,
      toggleRestaurant, toggleItem,
      isRestaurantWishlisted, isItemWishlisted,
      wishlistCount: wishlistRestaurants.length + wishlistItems.length,
    }}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
};
