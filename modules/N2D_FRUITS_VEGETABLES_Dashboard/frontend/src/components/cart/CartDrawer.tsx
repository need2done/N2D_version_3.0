'use client';

import React, { useState, useEffect } from 'react';
import { X, ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import styles from './CartDrawer.module.css';

export default function CartDrawer() {
  const { 
    isCartOpen, 
    closeCart, 
    cartItems, 
    updateQuantity, 
    removeFromCart,
    clearCart,
    subtotal,
    deliveryFee,
    platformFee,
    grandTotal
  } = useCart();

  const [liveProducts, setLiveProducts] = useState<any[]>([]);

  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = 'hidden';
      // Fetch live inventory to validate cart
      fetch(`/api/fruits-vegetables/products?t=${Date.now()}`, { cache: 'no-store' })
        .then(res => res.json())
        .then(data => setLiveProducts(data))
        .catch(err => console.error(err));
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isCartOpen]);

  const handleWhatsAppCheckout = async () => {
    if (cartItems.length === 0 || hasOutOfStock) return;

    let orderId = '';
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      orderId = params.get('orderId') || '';
    }

    if (orderId) {
      try {
        const payload = {
          items: cartItems.map(item => {
            const rawP = item?.selectedOption?.price ?? item?.product?.basePrice ?? 0;
            const numP = Number(rawP);
            return {
              product_id: item.product.id,
              product_name: item.product.name,
              quantity: item.quantity,
              price: isNaN(numP) ? 0 : numP,
              unit: item.selectedOption.label
            };
          })
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

    const message = orderId ? `ORDER_${orderId}` : `Hello Need2Done 👋\nI would like to place the following order:\n\n*Items:*\n`;
    
    let text = message;
    if (!orderId) {
      cartItems.forEach((item, index) => {
        const rawP = item?.selectedOption?.price ?? item?.product?.basePrice ?? 0;
        const numP = Number(rawP);
        const safeP = isNaN(numP) ? 0 : numP;
        text += `${index + 1}. ${item.product.name}\n   Quantity: ${item.quantity} x ${item.selectedOption.label}\n   Price: ₹${safeP * item.quantity}\n\n`;
      });
      text += `*Subtotal:* ₹${subtotal}\n`;
      text += `*Delivery:* ${deliveryFee === 0 ? 'FREE' : '₹' + deliveryFee}\n`;
      text += `*Platform Fee:* ₹${platformFee}\n`;
      text += `*Grand Total:* ₹${grandTotal}\n\n`;
      text += `Please confirm my order.`;
    }

    const encodedMessage = encodeURIComponent(text);
    const whatsappNumber = "917989862623"; 
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const getOutOfStockItems = () => {
    if (liveProducts.length === 0) return [];
    
    return cartItems.filter(item => {
      const liveProduct = liveProducts.find(p => p.id.toString() === item.product.id.toString());
      if (liveProduct) {
        return liveProduct.inStock === false || liveProduct.status === 'Out of Stock';
      }
      return true; // If product was deleted, treat as out of stock
    });
  };

  const outOfStockItems = getOutOfStockItems();
  const hasOutOfStock = outOfStockItems.length > 0;

  return (
    <div className={`${styles.overlay} ${isCartOpen ? styles.open : ''}`} onClick={closeCart}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        
        <div className={styles.header}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 className={styles.title}>
              <ShoppingBag size={20} />
              Shopping Cart ({cartItems.length})
            </h2>
            {cartItems.length > 0 && (
              <button className={styles.clearBtn} onClick={clearCart}>
                Clear All
              </button>
            )}
          </div>
          <button className={styles.closeBtn} onClick={closeCart}>
            <X size={20} />
          </button>
        </div>
        
        <div className={styles.content}>
          {hasOutOfStock && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '12px', margin: '15px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 500 }}>
              ⚠️ Some items in your cart are no longer available. Please remove them to proceed.
            </div>
          )}
          {cartItems.length === 0 ? (
            <div className={styles.emptyState}>
              <div style={{ fontSize: '3rem' }}>🥕🍅🥬</div>
              <h3>Your Cart is Empty</h3>
              <p>Looks like you haven't added anything to your cart yet.</p>
              <button className={styles.continueBtn} onClick={closeCart}>Start Shopping</button>
            </div>
          ) : (
            <div className={styles.cartItems}>
              {cartItems.map((item) => {
                const isItemOut = outOfStockItems.some(osi => osi.id === item.id);
                const rawP = item?.selectedOption?.price ?? item?.product?.basePrice ?? 0;
                const numP = Number(rawP);
                const safeP = isNaN(numP) ? 0 : numP;
                return (
                <div key={item.id} className={styles.cartItem} style={isItemOut ? { backgroundColor: '#fff1f2', border: '1px solid #fecdd3' } : {}}>
                  <img src={item.product.image} alt={item.product.name} className={styles.itemImage} style={isItemOut ? { opacity: 0.5 } : {}} />
                  
                  <div className={styles.itemDetails}>
                    <div className={styles.itemName}>{item.product.name}</div>
                    <div className={styles.itemOption}>{item.selectedOption.label}</div>
                    <div className={styles.itemPrice}>₹{safeP * item.quantity}</div>
                    {isItemOut && <div style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 'bold', marginTop: '4px' }}>Status: Out of Stock</div>}
                  </div>

                  <div className={styles.itemControls}>
                    <div className={styles.quantityCtrl} style={isItemOut ? { visibility: 'hidden' } : {}}>
                      <button className={styles.qtyBtn} onClick={() => updateQuantity(item.id, -1)}>-</button>
                      <span style={{ fontSize: '0.9rem', width: '20px', textAlign: 'center' }}>{item.quantity}</span>
                      <button className={styles.qtyBtn} onClick={() => updateQuantity(item.id, 1)}>+</button>
                    </div>
                    <button className={styles.deleteBtn} onClick={() => removeFromCart(item.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>

        {cartItems.length > 0 && (
          <>
            <div className={styles.summary}>
              <div className={styles.summaryRow}>
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Delivery</span>
                <span>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Platform Fee</span>
                <span>₹{platformFee}</span>
              </div>
              <div className={styles.grandTotal}>
                <span>Grand Total</span>
                <span>₹{grandTotal}</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px' }}>
                Order will be sent via WhatsApp to: <strong>+91 79898 62623</strong>
              </div>
            </div>

            <div className={styles.footer}>
              <button 
                className={styles.checkoutBtn} 
                onClick={handleWhatsAppCheckout}
                disabled={hasOutOfStock}
                style={hasOutOfStock ? { backgroundColor: '#cbd5e1', cursor: 'not-allowed' } : {}}
              >
                {hasOutOfStock ? 'Remove Unavailable Items' : 'Checkout on WhatsApp'}
              </button>
              <button className={styles.continueBtn} onClick={closeCart}>
                Continue Shopping
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
