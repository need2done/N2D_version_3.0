const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const { generateToken, authenticateAdmin } = require('../middleware/auth');
const { loginRateLimiter } = require('../middleware/rateLimiter');

const dataPaths = [
    path.resolve(__dirname, '../data/fruits_vegetables_products.json'),
    path.resolve(__dirname, '../../modules/N2D_FRUITS_VEGETABLES_Dashboard/frontend/data/products.json')
];

function getProducts() {
    for (const p of dataPaths) {
        if (fs.existsSync(p)) {
            try {
                const data = JSON.parse(fs.readFileSync(p, 'utf8'));
                if (Array.isArray(data) && data.length > 0) return data;
            } catch (e) {
                console.error('Error reading JSON path:', p, e);
            }
        }
    }
    return [];
}

function saveProducts(products) {
    for (const p of dataPaths) {
        try {
            fs.mkdirSync(path.dirname(p), { recursive: true });
            fs.writeFileSync(p, JSON.stringify(products, null, 2), 'utf8');
        } catch (e) {
            console.error('Error saving JSON path:', p, e);
        }
    }
}

function formatImageUrl(product) {
    const categoryFallbacks = {
        'Fresh Vegetables': 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=600&h=600&fit=crop',
        'Leafy Vegetables': 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&h=600&fit=crop',
        'Root Vegetables': 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&h=600&fit=crop',
        'Herbs & Seasonings': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&h=600&fit=crop',
        'Fresh Fruits': 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600&h=600&fit=crop',
        'Citrus Fruits': 'https://images.unsplash.com/photo-1534531141161-e416040974ed?w=600&h=600&fit=crop',
        'Seasonal Fruits': 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=600&h=600&fit=crop',
        'Premium Fruits': 'https://images.unsplash.com/photo-1528825871115-3581a5387919?w=600&h=600&fit=crop'
    };

    const img = product.image || product.image_url;
    const fallback = categoryFallbacks[product.category] || categoryFallbacks['Fresh Vegetables'];

    if (!img) return fallback;
    if (img.startsWith('http://') || img.startsWith('https://')) return img;
    if (img.startsWith('/uploads/')) return img;
    if (img.startsWith('/images/')) return `/fruits${img}`;
    return fallback;
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
        
        products = products.map(p => ({
            ...p,
            image: formatImageUrl(p)
        }));

        res.json(products);
    } catch (e) {
        console.error('Failed to fetch fruits & vegetables products:', e);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});


// 2. CREATE
router.post('/products', (req, res) => {
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

// 3. UPDATE
router.put('/products/:id', (req, res) => {
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

// 4. DELETE
router.delete('/products/:id', (req, res) => {
    try {
        let products = getProducts();
        products = products.filter(p => p && p.id !== req.params.id);
        saveProducts(products);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// 5. BULK STOCK UPDATE
router.post('/products/bulk', (req, res) => {
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
            sameSite: 'lax',
            path: '/',
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
        const uploadDir = path.resolve(__dirname, '../public/uploads');
        fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const safeName = crypto.randomBytes(16).toString('hex') + ext;
        cb(null, safeName);
    }
});

const allowedMimeTypes = [
    'image/jpeg', 'image/pjpeg', 'image/png', 'image/webp', 'image/gif', 
    'image/avif', 'image/heic', 'image/heif', 'image/svg+xml', 'image/bmp', 
    'image/tiff', 'image/x-icon', 'application/octet-stream'
];

const upload = multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const validExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.heic', '.heif', '.svg', '.bmp', '.ico'];
        
        if (allowedMimeTypes.includes(file.mimetype) || validExts.includes(ext) || file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Please upload a valid image file (JPEG, PNG, WEBP, AVIF, GIF, etc.).'));
        }
    }
});

router.post('/upload', (req, res) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        res.status(201).json({ url: `/uploads/${req.file.filename}` });
    });
});

module.exports = router;
