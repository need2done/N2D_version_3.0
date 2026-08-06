const db = require('../config/db');

exports.getAllProducts = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, b.name as brand_name, pi.image_url
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, b.name as brand_name 
      FROM products p 
      LEFT JOIN brands b ON p.brand_id = b.id 
      WHERE p.id = ?
    `, [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Get images
    const [images] = await db.query('SELECT image_url, is_primary FROM product_images WHERE product_id = ?', [req.params.id]);
    rows[0].images = images;
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getProductsByCategory = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, b.name as brand_name, pi.image_url
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
      WHERE p.category_id = ?
    `, [req.params.id]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.searchProducts = async (req, res) => {
  try {
    const query = req.query.q || '';
    const searchTerm = `%${query}%`;
    const [rows] = await db.query(`
      SELECT p.*, b.name as brand_name, pi.image_url
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
      WHERE p.name LIKE ? OR b.name LIKE ?
    `, [searchTerm, searchTerm]);
    res.json(rows);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { category_id, brand_id, name, weight, mrp, selling_price, stock, image } = req.body;
    
    // Simple validation
    if (!name || !mrp || !selling_price) {
      return res.status(400).json({ message: 'Name, mrp, and selling_price are required' });
    }

    const [result] = await db.query(
      `INSERT INTO products (category_id, brand_id, name, weight, mrp, selling_price, stock) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [category_id || 1, brand_id || null, name, weight || '1 unit', mrp, selling_price, stock !== undefined ? stock : 100]
    );

    if (image) {
      await db.query(
        `INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, TRUE)`,
        [result.insertId, image]
      );
    }

    res.status(201).json({ id: result.insertId, message: 'Product created successfully' });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, brand_id, name, weight, mrp, selling_price, stock, image } = req.body;
    
    // First check if product exists
    const [existing] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await db.query(
      `UPDATE products SET category_id = ?, brand_id = ?, name = ?, weight = ?, mrp = ?, selling_price = ?, stock = ? WHERE id = ?`,
      [
        category_id || existing[0].category_id, 
        brand_id || existing[0].brand_id, 
        name || existing[0].name, 
        weight || existing[0].weight, 
        mrp !== undefined ? mrp : existing[0].mrp, 
        selling_price !== undefined ? selling_price : existing[0].selling_price, 
        stock !== undefined ? stock : existing[0].stock, 
        id
      ]
    );

    if (image) {
      // Check if image exists
      const [images] = await db.query('SELECT * FROM product_images WHERE product_id = ?', [id]);
      if (images.length > 0) {
        await db.query('UPDATE product_images SET image_url = ? WHERE product_id = ? AND is_primary = TRUE', [image, id]);
      } else {
        await db.query('INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, TRUE)', [id, image]);
      }
    }

    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Due to ON DELETE CASCADE on product_images in schema, we just delete the product
    const [result] = await db.query('DELETE FROM products WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.bulkUpdateStock = async (req, res) => {
  try {
    const { category_id, stock } = req.body;
    
    if (stock === undefined) {
      return res.status(400).json({ message: 'Stock value is required' });
    }

    if (category_id) {
      await db.query('UPDATE products SET stock = ? WHERE category_id = ?', [stock, category_id]);
      res.json({ message: 'Category stock updated successfully' });
    } else {
      await db.query('UPDATE products SET stock = ?', [stock]);
      res.json({ message: 'All products stock updated successfully' });
    }
  } catch (error) {
    console.error('Error bulk updating stock:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
