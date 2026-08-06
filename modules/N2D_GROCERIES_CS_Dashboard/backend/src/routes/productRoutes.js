const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

router.get('/', productController.getAllProducts);
router.get('/category/:id', productController.getProductsByCategory);
router.get('/:id', productController.getProductById);

// Admin Routes for CRUD
router.post('/', productController.createProduct);
router.put('/bulk/stock', productController.bulkUpdateStock);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;
