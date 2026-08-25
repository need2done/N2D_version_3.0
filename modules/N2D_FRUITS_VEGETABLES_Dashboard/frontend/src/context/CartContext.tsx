'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, QuantityOption } from '@/data/mockProducts';

export interface CartItem {
  id: string; // unique ID for the cart item instance (could just be product id + selected option)
  product: Product;
  selectedOption: QuantityOption;
  quantity: number; // how many of the selectedOption (e.g. 2 x 500g)
}

interface CartContextType {
  isCartOpen: boolean;
  cartItems: CartItem[];
  openCart: () => void;
  closeCart: () => void;
  addToCart: (product: Product, selectedOption: QuantityOption) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  updateQuantity: (cartItemId: string, change: number) => void;
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  grandTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [fees, setFees] = useState<{ deliveryFee: number; platformFee: number }>({ deliveryFee: 20, platformFee: 5 });

  useEffect(() => {
    fetch('/api/settings/pricing?service=veg_fruits')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setFees({
            deliveryFee: Number(d.deliveryFee ?? 20),
            platformFee: Number(d.platformFee ?? 5)
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');
    if (!orderId) return;

    Promise.all([
      fetch('/api/fruits-vegetables/products').then(r => r.json()),
      fetch(`/api/carts/${orderId}`).then(r => r.json())
    ]).then(([products, cartRes]) => {
      if (cartRes.success && cartRes.cart && cartRes.cart.length > 0) {
        const items: CartItem[] = [];
        cartRes.cart.forEach((ci: any) => {
          const product = products.find((p: any) => p.id.toString() === ci.product_id.toString() || p.name === ci.product_name);
          if (product) {
            const options = product.quantityOptions || [{ label: product.baseUnit, price: product.basePrice }];
            const option = options.find((o: any) => o.label === ci.unit) || options[0];
            items.push({
              id: `${product.id}-${option.label}`,
              product,
              selectedOption: {
                ...option,
                price: Number(option.price ?? product.basePrice ?? ci.price ?? 0)
              },
              quantity: Number(ci.quantity)
            });
          }
        });
        setCartItems(items);
      }
    }).catch(err => console.error('Failed to load cart for orderId:', err));
  }, []);

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  const addToCart = (product: Product, selectedOption: QuantityOption) => {
    const cartItemId = `${product.id}-${selectedOption.label}`;
    const safeOption = {
      ...selectedOption,
      price: Number(selectedOption.price ?? product.basePrice ?? 0)
    };
    
    setCartItems(prev => {
      const existing = prev.find(item => item.id === cartItemId);
      if (existing) {
        return prev.map(item => 
          item.id === cartItemId 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { id: cartItemId, product, selectedOption: safeOption, quantity: 1 }];
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== cartItemId));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const updateQuantity = (cartItemId: string, change: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === cartItemId) {
        const newQty = Math.max(1, item.quantity + change);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const subtotal = cartItems.reduce((acc, item) => {
    const rawPrice = item?.selectedOption?.price ?? item?.product?.basePrice ?? (item?.product as any)?.price ?? 0;
    const numericPrice = Number(rawPrice);
    const safePrice = isNaN(numericPrice) ? 0 : numericPrice;
    const qty = Number(item?.quantity ?? 1);
    const safeQty = isNaN(qty) ? 1 : qty;
    return acc + (safePrice * safeQty);
  }, 0);

  const deliveryFee = subtotal === 0 ? 0 : (subtotal >= 199 ? 0 : fees.deliveryFee);
  const platformFee = subtotal === 0 ? 0 : fees.platformFee;
  const grandTotal = subtotal + deliveryFee + platformFee;

  return (
    <CartContext.Provider value={{ 
      isCartOpen, 
      cartItems, 
      openCart, 
      closeCart, 
      addToCart, 
      removeFromCart,
      clearCart,
      updateQuantity,
      subtotal,
      deliveryFee,
      platformFee,
      grandTotal
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
