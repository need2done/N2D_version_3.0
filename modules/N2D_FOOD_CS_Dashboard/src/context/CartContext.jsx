import { createContext, useContext, useReducer, useEffect, useState } from 'react';

const CartContext = createContext(null);

export const DEFAULT_PLATFORM_FEE = 5;
export const DEFAULT_PACKAGING_FEE = 10;
export const DEFAULT_DELIVERY_FEE = 40;
export const FREE_DELIVERY_THRESHOLD = 199; // Change threshold here (e.g., 199 for free delivery above ₹199)

const initialState = {
  items: [],
  restaurantId: null,
  restaurantName: null,
};

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { item, restaurantId, restaurantName, customizations } = action.payload;
      const existingIndex = state.items.findIndex(
        (i) => i.id === item.id && JSON.stringify(i.customizations) === JSON.stringify(customizations)
      );
      if (existingIndex >= 0) {
        const updated = [...state.items];
        updated[existingIndex] = { ...updated[existingIndex], quantity: updated[existingIndex].quantity + 1 };
        return { ...state, items: updated };
      }
      return {
        ...state,
        restaurantId,
        restaurantName,
        items: [...state.items, { ...item, quantity: 1, customizations: customizations || {}, cartPrice: item.cartPrice || item.offerPrice || item.price }],
      };
    }
    case 'REMOVE_ITEM': {
      return { ...state, items: state.items.filter((_, idx) => idx !== action.payload.index) };
    }
    case 'UPDATE_QUANTITY': {
      const { index, quantity } = action.payload;
      if (quantity <= 0) {
        const updated = state.items.filter((_, i) => i !== index);
        return { ...state, items: updated, restaurantId: updated.length === 0 ? null : state.restaurantId, restaurantName: updated.length === 0 ? null : state.restaurantName };
      }
      const updated = [...state.items];
      updated[index] = { ...updated[index], quantity };
      return { ...state, items: updated };
    }
    case 'CLEAR_CART': {
      return initialState;
    }
    case 'SET_CART': {
      return action.payload;
    }
    default:
      return state;
  }
}

function computeTotals(items, feeConfig) {
  const subtotal = items.reduce((sum, item) => sum + item.cartPrice * item.quantity, 0);
  const platformFee = subtotal === 0 ? 0 : feeConfig.platformFee;
  const packagingFee = subtotal === 0 ? 0 : feeConfig.packagingFee;
  const threshold = feeConfig.freeDeliveryThreshold ?? FREE_DELIVERY_THRESHOLD;
  const deliveryFee = subtotal === 0 ? 0 : (subtotal >= threshold ? 0 : feeConfig.deliveryFee);
  const grandTotal = subtotal + platformFee + packagingFee + deliveryFee;
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  return { 
    subtotal, 
    platformFee, 
    packagingFee, 
    deliveryFee, 
    grandTotal, 
    totalItems,
    freeDeliveryThreshold: threshold
  };
}

export function CartProvider({ children }) {
  const [feeConfig, setFeeConfig] = useState({
    platformFee: DEFAULT_PLATFORM_FEE,
    packagingFee: DEFAULT_PACKAGING_FEE,
    deliveryFee: DEFAULT_DELIVERY_FEE,
    freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD
  });

  useEffect(() => {
    fetch('/api/settings/pricing?service=food')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setFeeConfig(prev => ({
            ...prev,
            deliveryFee: Number(d.deliveryFee ?? DEFAULT_DELIVERY_FEE),
            platformFee: Number(d.platformFee ?? DEFAULT_PLATFORM_FEE),
            freeDeliveryThreshold: Number(d.freeDeliveryThreshold ?? FREE_DELIVERY_THRESHOLD)
          }));
        }
      })
      .catch(() => {});
  }, []);

  const [state, dispatch] = useReducer(cartReducer, initialState, (init) => {
    try {
      const saved = localStorage.getItem('n2d_cart');
      return saved ? JSON.parse(saved) : init;
    } catch {
      return init;
    }
  });

  useEffect(() => {
    localStorage.setItem('n2d_cart', JSON.stringify(state));
  }, [state]);

  const totals = computeTotals(state.items, feeConfig);

  const addItem = (item, restaurantId, restaurantName, customizations) => {
    dispatch({ type: 'ADD_ITEM', payload: { item, restaurantId, restaurantName, customizations } });
  };

  const removeItem = (index) => dispatch({ type: 'REMOVE_ITEM', payload: { index } });
  const updateQuantity = (index, quantity) => dispatch({ type: 'UPDATE_QUANTITY', payload: { index, quantity } });
  const clearCart = () => dispatch({ type: 'CLEAR_CART' });
  const setCart = (cartData) => dispatch({ type: 'SET_CART', payload: cartData });

  const isDifferentRestaurant = (restaurantId) =>
    state.restaurantId !== null && state.restaurantId !== restaurantId && state.items.length > 0;

  return (
    <CartContext.Provider value={{ ...state, ...totals, addItem, removeItem, updateQuantity, clearCart, setCart, isDifferentRestaurant }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
