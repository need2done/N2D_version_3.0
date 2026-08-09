import React, { createContext, useState, useContext, useEffect } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [fees, setFees] = useState({ deliveryFee: 30, platformFee: 8 });

  useEffect(() => {
    fetch('/api/settings/pricing?service=groceries')
      .then(r => r.json())
      .then(d => {
        if (d.success) setFees({ deliveryFee: d.deliveryFee, platformFee: d.platformFee });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');
    if (!orderId) return;

    Promise.all([
      fetch('/api/groceries/products').then(r => r.json()),
      fetch(`/api/carts/${orderId}`).then(r => r.json())
    ]).then(([products, cartRes]) => {
      if (cartRes.success && cartRes.cart && cartRes.cart.length > 0) {
        const items = [];
        cartRes.cart.forEach(ci => {
          const product = products.find(p => p.id === ci.product_id || p.name === ci.product_name);
          if (product) {
            items.push({
              ...product,
              selectedWeight: ci.unit,
              selectedPrice: Number(ci.price),
              cartItemId: `${product.id}-${ci.unit}`,
              quantity: Number(ci.quantity)
            });
          }
        });
        setCart(items);
      }
    }).catch(err => console.error('Failed to load cart for orderId:', err));
  }, []);

  const checkout = async () => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');

    if (orderId) {
      try {
        const payload = {
          items: cart.map(item => ({
            product_id: item.id,
            product_name: item.name,
            quantity: item.quantity,
            price: item.selectedPrice || item.selling_price,
            unit: item.selectedWeight || item.weight
          }))
        };
        await fetch(`/api/carts/${orderId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.error('Failed to save cart:', err);
      }
    }

    const deliveryFee = fees.deliveryFee;
    const platformFee = fees.platformFee;
    const estimatedTotal = cartTotal + deliveryFee + platformFee;

    const message = orderId ? `ORDER_${orderId}` : (() => {
      let orderText = `*New Order Request*\n\n`;
      orderText += `*Items:*\n`;
      cart.forEach(item => {
        const weightStr = item.selectedWeight ? ` (${item.selectedWeight})` : '';
        const itemPrice = item.selectedPrice || item.selling_price;
        orderText += `- ${item.quantity}x ${item.name}${weightStr} (₹${itemPrice * item.quantity})\n`;
      });
      orderText += `\n*Subtotal:* ₹${cartTotal}`;
      orderText += `\n*Delivery Fee:* ₹${deliveryFee}`;
      orderText += `\n*Platform Fee:* ₹${platformFee}`;
      orderText += `\n*Total Amount:* ₹${estimatedTotal}\n`;
      orderText += `\nPlease confirm my order!`;
      return orderText;
    })();

    const encodedText = encodeURIComponent(message);
    const whatsappNumber = "917989862623"; 
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedText}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const addToCart = (product, quantity = 1) => {
    const cartItemId = `${product.id}-${product.selectedWeight || product.weight}`;
    
    setCart(prev => {
      const existing = prev.find(item => item.cartItemId === cartItemId);
      if (existing) {
        return prev.map(item => 
          item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { ...product, cartItemId, quantity }];
    });
  };

  const updateQuantity = (cartItemId, quantity) => {
    setCart(prev => prev.map(item => 
      item.cartItemId === cartItemId ? { ...item, quantity } : item
    ).filter(item => item.quantity > 0));
  };

  const removeFromCart = (cartItemId) => {
    setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
  };

  const cartTotal = cart.reduce((total, item) => {
    const price = item.selectedPrice || item.selling_price;
    return total + (price * item.quantity);
  }, 0);
  const itemCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, updateQuantity, removeFromCart, cartTotal, itemCount, checkout, fees }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
