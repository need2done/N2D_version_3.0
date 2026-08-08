const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const { generateToken, authenticateAdmin } = require('../middleware/auth');
const { loginRateLimiter } = require('../middleware/rateLimiter');

const dataPath = path.resolve(__dirname, '../../modules/N2D_FRUITS_VEGETABLES_Dashboard/frontend/data/products.json');

function getProducts() {
    if (!fs.existsSync(dataPath)) return [];
    return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
}

function saveProducts(products) {
    fs.mkdirSync(path.dirname(dataPath), { recursive: true });
    fs.writeFileSync(dataPath, JSON.stringify(products, null, 2), 'utf8');
}

// 1. GET ALL (Public catalog)
router.get('/products', async (req, res) => {
    try {
        let products = getProducts();
        if (!products || products.length === 0) {
            const pool = require('../config/db');
            const [rows] = await pool.query(`
                SELECT id, name, category, price as basePrice, weight as baseUnit, COALESCE(image_url, 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&q=80') as image
                FROM products 
                WHERE category IN ('Fresh Vegetables', 'Fresh Fruits', 'Leafy Vegetables', 'Root Vegetables', 'Herbs & Seasonings', 'Citrus Fruits', 'Seasonal Fruits', 'Premium Fruits', 'Seasonings & Herbs', 'Exotics')
                   OR category_id IN (1, 2, 3, 4, 5)
            `);
            products = rows.map(p => ({
                id: p.id,
                name: p.name,
                category: p.category || 'Fresh Vegetables',
                basePrice: parseFloat(p.basePrice || 40),
                price: parseFloat(p.basePrice || 40),
                baseUnit: p.baseUnit || '1 kg',
                unitType: 'Weight',
                image: p.image || 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&q=80',
                status: 'In Stock',
                inStock: true,
                rating: 4.8,
                reviewCount: 50,
                description: `Fresh ${p.name}`,
                quantityOptions: [
                    { label: p.baseUnit || '1 kg', value: 1, price: parseFloat(p.basePrice || 40) },
                    { label: '500 g', value: 0.5, price: parseFloat(p.basePrice || 40) * 0.5 }
                ]
            }));
        }
        res.json(products);
    } catch (e) {
        console.error('Failed to fetch fruits & vegetables products:', e);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});


// 2. CREATE (Admin protected)
router.post('/products', authenticateAdmin, (req, res) => {
    try {
        const products = getProducts();
        const newProduct = req.body;
        newProduct.id = 'p' + Date.now();
        products.push(newProduct);
        saveProducts(products);
        res.status(201).json(newProduct);
    } catch (e) {
        res.status(500).json({ error: 'Failed to create product' });
    }
});

// 3. UPDATE (Admin protected)
router.put('/products/:id', authenticateAdmin, (req, res) => {
    try {
        const products = getProducts();
        const idx = products.findIndex(p => p && p.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Not found' });
        
        products[idx] = { ...products[idx], ...req.body };
        saveProducts(products);
        res.json(products[idx]);
    } catch (e) {
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// 4. DELETE (Admin protected)
router.delete('/products/:id', authenticateAdmin, (req, res) => {
    try {
        let products = getProducts();
        products = products.filter(p => p && p.id !== req.params.id);
        saveProducts(products);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// 5. BULK STOCK UPDATE (Admin protected)
router.post('/products/bulk', authenticateAdmin, (req, res) => {
    try {
        const { inStock, category } = req.body;
        const products = getProducts();
        const updated = products.map(p => {
            if (p) {
                if (!category || p.category === category) {
                    return { ...p, inStock };
                }
            }
            return p;
        });
        saveProducts(updated);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to update stock' });
    }
});

// 6. AUTH LOGIN (Secured with rate limit and JWT)
router.post('/auth', loginRateLimiter, (req, res) => {
    const { username, password } = req.body;
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
        return res.status(500).json({ error: 'Authentication service misconfigured' });
    }

    if (username === adminUsername && password === adminPassword) {
        const token = generateToken({ username: adminUsername, role: 'admin' }, 86400);
        res.cookie('admin_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 1000 // 1 day
        });
        return res.json({ success: true, token });
    }
    res.status(401).json({ error: 'Invalid credentials' });
});

// 7. LOGOUT
router.post('/logout', (req, res) => {
    res.clearCookie('admin_token');
    res.json({ success: true });
});

// 8. UPLOAD IMAGE (Admin protected, file type & size validated, sanitized filename)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.resolve(__dirname, '../../website/images/products');
        fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const safeName = crypto.randomBytes(16).toString('hex') + ext;
        cb(null, safeName);
    }
});

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and GIF images are allowed.'));
        }
    }
});

router.post('/upload', authenticateAdmin, (req, res) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        res.status(201).json({ url: `/images/products/${req.file.filename}` });
    });
});

module.exports = router;
