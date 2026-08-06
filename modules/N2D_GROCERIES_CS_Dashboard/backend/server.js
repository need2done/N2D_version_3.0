const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Routes
const categoryRoutes = require('./src/routes/categoryRoutes');
const productRoutes = require('./src/routes/productRoutes');
const searchRoutes = require('./src/routes/searchRoutes');
const cartRoutes = require('./src/routes/cartRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
// Increase payload limit for base64 image uploads
app.use(express.json({ limit: '10mb' }));

// Mount API routes
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/admin', adminRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
