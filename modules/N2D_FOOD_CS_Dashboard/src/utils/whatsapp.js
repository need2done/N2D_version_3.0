// WhatsApp order URL builder
const WHATSAPP_NUMBER = '917989862623'; // India +91

export function generateOrderId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `N2D-${timestamp}-${random}`;
}

export function buildWhatsAppURL(cart, orderId, totals) {
  const itemLines = cart.items
    .map((item, idx) => {
      const customText = item.customizations
        ? Object.entries(item.customizations)
            .filter(([, v]) => v && v !== 'none' && v !== false && v !== '')
            .map(([k, v]) => `  ${k}: ${v}`)
            .join('\n')
        : '';
      return `${idx + 1}. ${item.name} x${item.quantity} = ₹${(item.cartPrice * item.quantity)}${customText ? '\n' + customText : ''}`;
    })
    .join('\n');

  const message = `🍽️ *Need2Done Food Order*
━━━━━━━━━━━━━━━━━━━━
📋 *Order ID:* ${orderId}
🏪 *Restaurant:* ${cart.restaurantName}
━━━━━━━━━━━━━━━━━━━━

*Items Ordered:*
${itemLines}

━━━━━━━━━━━━━━━━━━━━
💰 *Subtotal:* ₹${totals.subtotal}
🏷️ *Platform Fee:* ₹${totals.platformFee}
📦 *Packaging:* ₹${totals.packagingFee}
🚀 *Delivery:* ₹${totals.deliveryFee}
━━━━━━━━━━━━━━━━━━━━
✅ *Grand Total: ₹${totals.grandTotal}*
━━━━━━━━━━━━━━━━━━━━

Please confirm this order! 🙏`;

  const encoded = encodeURIComponent(message);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
}
