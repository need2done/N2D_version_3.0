const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
    res.send('Need2Done API is running...');
});

// Import API routes
// const productRoutes = require('./routes/products');
// app.use('/api/products', productRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
