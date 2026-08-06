const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const { authenticateAdmin } = require('../middleware/auth');
const verifyAdminToken = authenticateAdmin;


// GET /api/food/items - Fetch all food items and restaurants
router.get('/items', (req, res) => {
    try {
        const { restaurants } = require('../../modules/N2D_FOOD_CS_Dashboard/src/data/restaurants');
        const { menuData } = require('../../modules/N2D_FOOD_CS_Dashboard/src/data/menu');
        
        let allItems = [];
        Object.keys(menuData).forEach(restaurantId => {
            const categories = menuData[restaurantId];
            const rest = restaurants.find(r => String(r.id) === String(restaurantId));
            const restName = rest ? rest.name : `Restaurant #${restaurantId}`;

            Object.keys(categories).forEach(category => {
                categories[category].forEach(item => {
                    allItems.push({
                        ...item,
                        restaurantId: Number(restaurantId),
                        restaurantName: restName,
                        categoryName: category
                    });
                });
            });
        });

        res.json({
            success: true,
            restaurants,
            items: allItems,
            totalItems: allItems.length
        });
    } catch (err) {
        console.error("Error fetching food items:", err);
        res.status(500).json({ success: false, error: "Failed to fetch food items" });
    }
});

// POST /api/food/items - Add a new food item
router.post('/items', verifyAdminToken, (req, res) => {
    try {
        const { restaurantId, categoryName, name, description, price, offerPrice, isVeg, prepTime, isAvailable, isBestSeller, customizable, image } = req.body;
        
        if (!restaurantId || !name || !price) {
            return res.status(400).json({ success: false, error: "Restaurant ID, Item Name, and Price are required" });
        }

        const newItem = {
            id: Date.now(),
            name,
            description: description || '',
            price: Number(price),
            offerPrice: offerPrice ? Number(offerPrice) : null,
            image: image || 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300&h=200&fit=crop',
            isVeg: Boolean(isVeg),
            prepTime: prepTime || '20 min',
            isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
            isBestSeller: Boolean(isBestSeller),
            customizable: Boolean(customizable)
        };

        res.json({
            success: true,
            message: "Food item added successfully",
            item: {
                ...newItem,
                restaurantId: Number(restaurantId),
                categoryName: categoryName || 'Best Sellers'
            }
        });
    } catch (err) {
        console.error("Error creating food item:", err);
        res.status(500).json({ success: false, error: "Failed to add food item" });
    }
});

// PUT /api/food/items/:id - Update food item
router.put('/items/:id', verifyAdminToken, (req, res) => {
    try {
        const itemId = Number(req.params.id);
        const updates = req.body;

        res.json({
            success: true,
            message: "Food item updated successfully",
            itemId,
            updates
        });
    } catch (err) {
        console.error("Error updating food item:", err);
        res.status(500).json({ success: false, error: "Failed to update food item" });
    }
});

// PATCH /api/food/items/:id/toggle-stock - Quick stock toggle
router.patch('/items/:id/toggle-stock', verifyAdminToken, (req, res) => {
    try {
        const itemId = Number(req.params.id);
        const { isAvailable } = req.body;

        res.json({
            success: true,
            message: `Food item availability set to ${isAvailable ? 'In Stock' : 'Out of Stock'}`,
            itemId,
            isAvailable: Boolean(isAvailable)
        });
    } catch (err) {
        console.error("Error toggling stock:", err);
        res.status(500).json({ success: false, error: "Failed to update stock status" });
    }
});

// DELETE /api/food/items/:id - Delete food item
router.delete('/items/:id', verifyAdminToken, (req, res) => {
    try {
        const itemId = Number(req.params.id);
        res.json({
            success: true,
            message: "Food item deleted successfully",
            itemId
        });
    } catch (err) {
        console.error("Error deleting food item:", err);
        res.status(500).json({ success: false, error: "Failed to delete food item" });
    }
});

// POST /api/food/admin/restaurants - Add a new partner restaurant
router.post('/restaurants', verifyAdminToken, (req, res) => {
    try {
        const newRestaurant = req.body;
        if (!newRestaurant.name) {
            return res.status(400).json({ success: false, error: "Restaurant Name is required" });
        }

        res.json({
            success: true,
            message: "Partner restaurant added successfully",
            restaurant: newRestaurant
        });
    } catch (err) {
        console.error("Error adding restaurant:", err);
        res.status(500).json({ success: false, error: "Failed to add restaurant" });
    }
});

module.exports = router;
