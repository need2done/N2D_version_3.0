const db = require('../config/db');

exports.getCart = async (req, res) => {
  try {
    // Basic implementation: fetch cart 1 as a placeholder since there is no auth
    const cartId = 1; 
    const [rows] = await db.query(`
      SELECT ci.*, p.name, p.selling_price, p.mrp, pi.image_url 
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
      WHERE ci.cart_id = ?
    `, [cartId]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const cartId = 1;
    
    // Check if exists
    const [existing] = await db.query('SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?', [cartId, productId]);
    
    if (existing.length > 0) {
      await db.query('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?', [quantity, existing[0].id]);
    } else {
      await db.query('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)', [cartId, productId, quantity]);
    }
    
    res.json({ success: true, message: 'Added to cart' });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const cartId = 1;
    
    if (quantity <= 0) {
      await db.query('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?', [cartId, productId]);
    } else {
      await db.query('UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?', [quantity, cartId, productId]);
    }
    
    res.json({ success: true, message: 'Cart updated' });
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const productId = req.params.id;
    const cartId = 1;
    await db.query('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?', [cartId, productId]);
    res.json({ success: true, message: 'Removed from cart' });
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
