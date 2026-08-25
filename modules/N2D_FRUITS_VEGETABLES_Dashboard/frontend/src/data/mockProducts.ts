export type UnitType = 'Weight' | 'Bunch' | 'Piece' | 'Dozen' | 'Pack';

export interface QuantityOption {
  label: string;
  value: number; // base unit multiplier
  price: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  unitType: UnitType;
  baseUnit: string;
  basePrice: number;
  originalPrice?: number;
  discount?: string;
  image: string;
  badge?: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  rating: number;
  reviewCount: number;
  description: string;
  quantityOptions: QuantityOption[];
}

const getPlaceholder = (text: string) => `https://placehold.co/600x600/e2e8f0/059669?text=${encodeURIComponent(text)}`;

const generateWeightOptions = (basePrice: number): QuantityOption[] => [
  { label: '250 g', value: 0.25, price: basePrice * 0.25 },
  { label: '500 g', value: 0.5, price: basePrice * 0.5 },
  { label: '1 kg', value: 1, price: basePrice },
  { label: '2 kg', value: 2, price: basePrice * 2 },
];

const generatePieceOptions = (basePrice: number): QuantityOption[] => [
  { label: '1 Piece', value: 1, price: basePrice },
  { label: '2 Pieces', value: 2, price: basePrice * 2 },
  { label: '3 Pieces', value: 3, price: basePrice * 3 },
];

export const mockProducts: Product[] = [
  // Original
  {
    id: 'p1', name: 'Tomato Hybrid', slug: 'tomato-hybrid', category: 'Fresh Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 32, originalPrice: 38, discount: '16% OFF', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&h=600&fit=crop', badge: 'Farm Fresh', status: 'In Stock', rating: 4.8, reviewCount: 214, description: 'Fresh farm-grown tomatoes ideal for curries, salads, soups and daily cooking.',
    quantityOptions: generateWeightOptions(32)
  },
  {
    id: 'p2', name: 'Fresh Spinach', slug: 'fresh-spinach', category: 'Leafy Vegetables', unitType: 'Bunch', baseUnit: '1 Bunch', basePrice: 20, image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&h=600&fit=crop', badge: 'Organic', status: 'In Stock', rating: 4.5, reviewCount: 89, description: 'Rich in iron and vitamins, fresh spinach directly from local organic farms.',
    quantityOptions: [ { label: '1 Bunch', value: 1, price: 20 }, { label: '2 Bunches', value: 2, price: 40 }, { label: '3 Bunches', value: 3, price: 60 } ]
  },
  {
    id: 'p3', name: 'Carrot', slug: 'carrot', category: 'Root Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 45, originalPrice: 50, discount: '10% OFF', image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600&h=600&fit=crop', badge: 'Best Seller', status: 'In Stock', rating: 4.9, reviewCount: 312, description: 'Crunchy, sweet, and healthy root vegetable.',
    quantityOptions: generateWeightOptions(45)
  },
  {
    id: 'p4', name: 'Papaya', slug: 'papaya', category: 'Fresh Fruits', unitType: 'Piece', baseUnit: '1 Piece', basePrice: 60, image: 'https://images.unsplash.com/photo-1617112848504-d2db17042841?w=600&h=600&fit=crop', status: 'Low Stock', rating: 4.7, reviewCount: 156, description: 'Sweet and delicious fresh papaya.',
    quantityOptions: generatePieceOptions(60)
  },
  {
    id: 'p5', name: 'Banana (Robusta)', slug: 'banana', category: 'Fresh Fruits', unitType: 'Dozen', baseUnit: '1 Dozen', basePrice: 50, image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&h=600&fit=crop', status: 'In Stock', rating: 4.6, reviewCount: 420, description: 'Energy-packed robusta bananas.',
    quantityOptions: [ { label: 'Half Dozen', value: 0.5, price: 25 }, { label: '1 Dozen', value: 1, price: 50 }, { label: '2 Dozen', value: 2, price: 100 } ]
  },

  // Daily Essentials
  { id: 'v1', name: 'Tomato', slug: 'tomato', category: 'Fresh Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 30, image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&h=600&fit=crop', status: 'In Stock', rating: 4.7, reviewCount: 150, description: 'Fresh tomatoes.', quantityOptions: generateWeightOptions(30) },
  { id: 'v2', name: 'Onion', slug: 'onion', category: 'Fresh Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 40, image: '/images/products/onion_1783706164696.png', badge: 'Daily Essential', status: 'In Stock', rating: 4.8, reviewCount: 430, description: 'Crisp and pungent onions.', quantityOptions: generateWeightOptions(40) },
  { id: 'v3', name: 'Brinjal (Purple)', slug: 'brinjal-purple', category: 'Fresh Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 50, image: '/images/products/purple_brinjal_1783706179175.png', status: 'In Stock', rating: 4.3, reviewCount: 45, description: 'Fresh purple brinjal.', quantityOptions: generateWeightOptions(50) },
  { id: 'v4', name: 'Brinjal (Green)', slug: 'brinjal-green', category: 'Fresh Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 45, image: '/images/products/green_brinjal_1783706549198.png', status: 'In Stock', rating: 4.2, reviewCount: 30, description: 'Fresh green brinjal.', quantityOptions: generateWeightOptions(45) },
  { id: 'v5', name: 'Round Brinjal', slug: 'round-brinjal', category: 'Fresh Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 55, image: getPlaceholder('Round Brinjal'), status: 'In Stock', rating: 4.4, reviewCount: 65, description: 'Round brinjal.', quantityOptions: generateWeightOptions(55) },
  { id: 'v6', name: 'Long Brinjal', slug: 'long-brinjal', category: 'Fresh Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 50, image: getPlaceholder('Long Brinjal'), status: 'In Stock', rating: 4.1, reviewCount: 22, description: 'Long brinjal.', quantityOptions: generateWeightOptions(50) },
  { id: 'v7', name: 'Lady Finger (Okra)', slug: 'lady-finger', category: 'Fresh Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 60, image: '/images/products/lady_finger_1783706202563.png', status: 'In Stock', rating: 4.6, reviewCount: 112, description: 'Fresh tender okra.', quantityOptions: generateWeightOptions(60) },
  { id: 'v8', name: 'Green Capsicum', slug: 'green-capsicum', category: 'Fresh Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 70, image: '/images/products/green_capsicum_1783706190482.png', status: 'In Stock', rating: 4.5, reviewCount: 88, description: 'Crunchy green capsicum.', quantityOptions: generateWeightOptions(70) },
  { id: 'v9', name: 'Red Capsicum', slug: 'red-capsicum', category: 'Fresh Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 120, image: getPlaceholder('Red Capsicum'), status: 'In Stock', rating: 4.8, reviewCount: 45, description: 'Sweet red capsicum.', quantityOptions: generateWeightOptions(120) },
  { id: 'v10', name: 'Yellow Capsicum', slug: 'yellow-capsicum', category: 'Fresh Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 120, image: getPlaceholder('Yellow Capsicum'), status: 'In Stock', rating: 4.7, reviewCount: 34, description: 'Sweet yellow capsicum.', quantityOptions: generateWeightOptions(120) },
  { id: 'v11', name: 'Green Chilli', slug: 'green-chilli', category: 'Fresh Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 80, image: '/images/products/green_chilli_1783706214933.png', badge: 'Spicy', status: 'In Stock', rating: 4.5, reviewCount: 200, description: 'Spicy green chillies.', quantityOptions: generateWeightOptions(80) },
  
  // Gourds
  { id: 'v12', name: 'Bottle Gourd', slug: 'bottle-gourd', category: 'Fresh Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 40, image: '/images/products/bottle_gourd_1783706226172.png', status: 'In Stock', rating: 4.3, reviewCount: 56, description: 'Fresh bottle gourd.', quantityOptions: generateWeightOptions(40) },
  { id: 'v13', name: 'Ridge Gourd', slug: 'ridge-gourd', category: 'Fresh Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 50, image: getPlaceholder('Ridge Gourd'), status: 'In Stock', rating: 4.4, reviewCount: 78, description: 'Fresh ridge gourd.', quantityOptions: generateWeightOptions(50) },
  { id: 'v14', name: 'Snake Gourd', slug: 'snake-gourd', category: 'Fresh Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 45, image: getPlaceholder('Snake Gourd'), status: 'In Stock', rating: 4.2, reviewCount: 44, description: 'Fresh snake gourd.', quantityOptions: generateWeightOptions(45) },
  { id: 'v15', name: 'Bitter Gourd', slug: 'bitter-gourd', category: 'Fresh Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 60, image: '/images/products/bitter_gourd_1783706242239.png', status: 'In Stock', rating: 4.6, reviewCount: 120, description: 'Fresh bitter gourd.', quantityOptions: generateWeightOptions(60) },
  { id: 'v16', name: 'Sponge Gourd', slug: 'sponge-gourd', category: 'Fresh Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 55, image: getPlaceholder('Sponge Gourd'), status: 'In Stock', rating: 4.1, reviewCount: 25, description: 'Fresh sponge gourd.', quantityOptions: generateWeightOptions(55) },
  { id: 'v17', name: 'Ash Gourd', slug: 'ash-gourd', category: 'Fresh Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 35, image: getPlaceholder('Ash Gourd'), status: 'In Stock', rating: 4.4, reviewCount: 40, description: 'Fresh ash gourd.', quantityOptions: generateWeightOptions(35) },
  { id: 'v18', name: 'Pumpkin', slug: 'pumpkin', category: 'Fresh Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 30, image: getPlaceholder('Pumpkin'), status: 'In Stock', rating: 4.5, reviewCount: 90, description: 'Fresh pumpkin.', quantityOptions: generateWeightOptions(30) },
  { id: 'v19', name: 'White Pumpkin', slug: 'white-pumpkin', category: 'Fresh Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 40, image: getPlaceholder('White Pumpkin'), status: 'In Stock', rating: 4.3, reviewCount: 30, description: 'Fresh white pumpkin.', quantityOptions: generateWeightOptions(40) },

  // Other Vegetables
  { id: 'v20', name: 'Cucumber', slug: 'cucumber', category: 'Fresh Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 40, image: '/images/products/cucumber_1783706255468.png', status: 'In Stock', rating: 4.6, reviewCount: 150, description: 'Crisp cucumber.', quantityOptions: generateWeightOptions(40) },
  { id: 'v21', name: 'English Cucumber', slug: 'english-cucumber', category: 'Fresh Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 60, image: getPlaceholder('English Cucumber'), status: 'In Stock', rating: 4.7, reviewCount: 80, description: 'Seedless English cucumber.', quantityOptions: generateWeightOptions(60) },
  { id: 'v22', name: 'Chow Chow', slug: 'chow-chow', category: 'Fresh Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 45, image: getPlaceholder('Chow Chow'), status: 'In Stock', rating: 4.2, reviewCount: 20, description: 'Fresh chow chow.', quantityOptions: generateWeightOptions(45) },
  { id: 'v23', name: 'Ivy Gourd (Dondakaya)', slug: 'ivy-gourd', category: 'Fresh Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 50, image: getPlaceholder('Ivy Gourd'), status: 'In Stock', rating: 4.5, reviewCount: 110, description: 'Fresh ivy gourd.', quantityOptions: generateWeightOptions(50) },
  { id: 'v24', name: 'Pointed Gourd (Parwal)', slug: 'pointed-gourd', category: 'Fresh Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 80, image: getPlaceholder('Pointed Gourd'), status: 'In Stock', rating: 4.4, reviewCount: 60, description: 'Fresh pointed gourd.', quantityOptions: generateWeightOptions(80) },

  // Flower Vegetables
  { id: 'v25', name: 'Cauliflower', slug: 'cauliflower', category: 'Fresh Vegetables', unitType: 'Piece', baseUnit: '1 Piece', basePrice: 40, image: '/images/products/cauliflower_1783706269602.png', status: 'In Stock', rating: 4.6, reviewCount: 130, description: 'Fresh cauliflower.', quantityOptions: generatePieceOptions(40) },
  { id: 'v26', name: 'Broccoli', slug: 'broccoli', category: 'Fresh Vegetables', unitType: 'Piece', baseUnit: '1 Piece', basePrice: 90, image: '/images/products/broccoli_1783706283927.png', badge: 'Premium', status: 'In Stock', rating: 4.8, reviewCount: 95, description: 'Fresh broccoli head.', quantityOptions: generatePieceOptions(90) },
  { id: 'v27', name: 'Cabbage', slug: 'cabbage', category: 'Fresh Vegetables', unitType: 'Piece', baseUnit: '1 Piece', basePrice: 30, image: getPlaceholder('Cabbage'), status: 'In Stock', rating: 4.5, reviewCount: 120, description: 'Fresh cabbage.', quantityOptions: generatePieceOptions(30) },
  { id: 'v28', name: 'Red Cabbage', slug: 'red-cabbage', category: 'Fresh Vegetables', unitType: 'Piece', baseUnit: '1 Piece', basePrice: 60, image: getPlaceholder('Red Cabbage'), status: 'In Stock', rating: 4.6, reviewCount: 45, description: 'Fresh red cabbage.', quantityOptions: generatePieceOptions(60) },

  // Beans
  { id: 'v29', name: 'French Beans', slug: 'french-beans', category: 'Fresh Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 70, image: getPlaceholder('French Beans'), status: 'In Stock', rating: 4.5, reviewCount: 140, description: 'Fresh french beans.', quantityOptions: generateWeightOptions(70) },
  { id: 'v30', name: 'Cluster Beans', slug: 'cluster-beans', category: 'Fresh Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 50, image: getPlaceholder('Cluster Beans'), status: 'In Stock', rating: 4.3, reviewCount: 85, description: 'Fresh cluster beans.', quantityOptions: generateWeightOptions(50) },
  { id: 'v31', name: 'Broad Beans', slug: 'broad-beans', category: 'Fresh Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 60, image: getPlaceholder('Broad Beans'), status: 'In Stock', rating: 4.4, reviewCount: 65, description: 'Fresh broad beans.', quantityOptions: generateWeightOptions(60) },
  { id: 'v32', name: 'Flat Beans', slug: 'flat-beans', category: 'Fresh Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 55, image: getPlaceholder('Flat Beans'), status: 'In Stock', rating: 4.2, reviewCount: 40, description: 'Fresh flat beans.', quantityOptions: generateWeightOptions(55) },
  { id: 'v33', name: 'Hyacinth Beans', slug: 'hyacinth-beans', category: 'Fresh Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 80, image: getPlaceholder('Hyacinth Beans'), status: 'In Stock', rating: 4.5, reviewCount: 30, description: 'Fresh hyacinth beans.', quantityOptions: generateWeightOptions(80) },
  { id: 'v34', name: 'Cowpea Beans', slug: 'cowpea-beans', category: 'Fresh Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 65, image: getPlaceholder('Cowpea Beans'), status: 'In Stock', rating: 4.4, reviewCount: 50, description: 'Fresh cowpea beans.', quantityOptions: generateWeightOptions(65) },

  // Pods
  { id: 'v35', name: 'Drumstick', slug: 'drumstick', category: 'Fresh Vegetables', unitType: 'Piece', baseUnit: '1 Piece', basePrice: 15, image: getPlaceholder('Drumstick'), status: 'In Stock', rating: 4.6, reviewCount: 160, description: 'Fresh drumsticks.', quantityOptions: generatePieceOptions(15) },
  { id: 'v36', name: 'Sweet Corn', slug: 'sweet-corn', category: 'Fresh Vegetables', unitType: 'Piece', baseUnit: '1 Piece', basePrice: 20, image: getPlaceholder('Sweet Corn'), status: 'In Stock', rating: 4.8, reviewCount: 220, description: 'Fresh sweet corn.', quantityOptions: generatePieceOptions(20) },
  { id: 'v37', name: 'Baby Corn', slug: 'baby-corn', category: 'Fresh Vegetables', unitType: 'Pack', baseUnit: '1 Pack', basePrice: 50, image: getPlaceholder('Baby Corn'), status: 'In Stock', rating: 4.7, reviewCount: 110, description: 'Fresh baby corn pack.', quantityOptions: [ { label: '1 Pack', value: 1, price: 50 }, { label: '2 Packs', value: 2, price: 100 } ] },
  { id: 'v38', name: 'Green Peas', slug: 'green-peas', category: 'Fresh Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 100, image: getPlaceholder('Green Peas'), status: 'In Stock', rating: 4.7, reviewCount: 180, description: 'Fresh green peas.', quantityOptions: generateWeightOptions(100) },
  // Leafy Vegetables
  { id: 'l1', name: 'Spinach (Palak)', slug: 'spinach-palak', category: 'Leafy Vegetables', unitType: 'Bunch', baseUnit: '1 Bunch', basePrice: 15, image: getPlaceholder('Spinach'), status: 'In Stock', rating: 4.8, reviewCount: 150, description: 'Fresh spinach leaves.', quantityOptions: [{label: '1 Bunch', value: 1, price: 15}, {label: '2 Bunches', value: 2, price: 30}] },
  { id: 'l2', name: 'Amaranthus Green', slug: 'amaranthus-green', category: 'Leafy Vegetables', unitType: 'Bunch', baseUnit: '1 Bunch', basePrice: 12, image: getPlaceholder('Amaranthus Green'), status: 'In Stock', rating: 4.5, reviewCount: 80, description: 'Fresh green amaranthus.', quantityOptions: [{label: '1 Bunch', value: 1, price: 12}, {label: '2 Bunches', value: 2, price: 24}] },
  { id: 'l3', name: 'Amaranthus Red', slug: 'amaranthus-red', category: 'Leafy Vegetables', unitType: 'Bunch', baseUnit: '1 Bunch', basePrice: 15, image: getPlaceholder('Amaranthus Red'), status: 'In Stock', rating: 4.4, reviewCount: 65, description: 'Fresh red amaranthus.', quantityOptions: [{label: '1 Bunch', value: 1, price: 15}, {label: '2 Bunches', value: 2, price: 30}] },
  { id: 'l4', name: 'Fenugreek Leaves (Methi)', slug: 'fenugreek-methi', category: 'Leafy Vegetables', unitType: 'Bunch', baseUnit: '1 Bunch', basePrice: 20, image: getPlaceholder('Methi'), status: 'In Stock', rating: 4.7, reviewCount: 110, description: 'Fresh methi leaves.', quantityOptions: [{label: '1 Bunch', value: 1, price: 20}, {label: '2 Bunches', value: 2, price: 40}] },
  { id: 'l5', name: 'Sorrel Leaves (Gongura)', slug: 'sorrel-gongura', category: 'Leafy Vegetables', unitType: 'Bunch', baseUnit: '1 Bunch', basePrice: 15, image: getPlaceholder('Gongura'), status: 'In Stock', rating: 4.6, reviewCount: 95, description: 'Fresh gongura leaves.', quantityOptions: [{label: '1 Bunch', value: 1, price: 15}, {label: '2 Bunches', value: 2, price: 30}] },
  { id: 'l6', name: 'Coriander Leaves', slug: 'coriander-leaves', category: 'Leafy Vegetables', unitType: 'Bunch', baseUnit: '1 Bunch', basePrice: 10, image: getPlaceholder('Coriander'), status: 'In Stock', rating: 4.9, reviewCount: 320, description: 'Fresh coriander.', quantityOptions: [{label: '1 Bunch', value: 1, price: 10}, {label: '2 Bunches', value: 2, price: 20}] },
  { id: 'l7', name: 'Mint Leaves', slug: 'mint-leaves', category: 'Leafy Vegetables', unitType: 'Bunch', baseUnit: '1 Bunch', basePrice: 10, image: getPlaceholder('Mint'), status: 'In Stock', rating: 4.8, reviewCount: 210, description: 'Fresh mint.', quantityOptions: [{label: '1 Bunch', value: 1, price: 10}, {label: '2 Bunches', value: 2, price: 20}] },
  { id: 'l8', name: 'Curry Leaves', slug: 'curry-leaves', category: 'Leafy Vegetables', unitType: 'Bunch', baseUnit: '1 Bunch', basePrice: 10, image: getPlaceholder('Curry Leaves'), status: 'In Stock', rating: 4.9, reviewCount: 180, description: 'Fresh curry leaves.', quantityOptions: [{label: '1 Bunch', value: 1, price: 10}, {label: '2 Bunches', value: 2, price: 20}] },
  { id: 'l9', name: 'Dill Leaves', slug: 'dill-leaves', category: 'Leafy Vegetables', unitType: 'Bunch', baseUnit: '1 Bunch', basePrice: 15, image: getPlaceholder('Dill Leaves'), status: 'In Stock', rating: 4.5, reviewCount: 45, description: 'Fresh dill leaves.', quantityOptions: [{label: '1 Bunch', value: 1, price: 15}, {label: '2 Bunches', value: 2, price: 30}] },
  { id: 'l10', name: 'Spring Onion Greens', slug: 'spring-onion', category: 'Leafy Vegetables', unitType: 'Bunch', baseUnit: '1 Bunch', basePrice: 25, image: getPlaceholder('Spring Onion'), status: 'In Stock', rating: 4.7, reviewCount: 130, description: 'Fresh spring onions.', quantityOptions: [{label: '1 Bunch', value: 1, price: 25}, {label: '2 Bunches', value: 2, price: 50}] },
  { id: 'l11', name: 'Malabar Spinach (Bachali)', slug: 'malabar-spinach', category: 'Leafy Vegetables', unitType: 'Bunch', baseUnit: '1 Bunch', basePrice: 20, image: getPlaceholder('Malabar Spinach'), status: 'In Stock', rating: 4.4, reviewCount: 30, description: 'Fresh bachali aaku.', quantityOptions: [{label: '1 Bunch', value: 1, price: 20}, {label: '2 Bunches', value: 2, price: 40}] },
  { id: 'l12', name: 'Celery (Premium)', slug: 'celery', category: 'Leafy Vegetables', unitType: 'Bunch', baseUnit: '1 Bunch', basePrice: 40, image: getPlaceholder('Celery'), status: 'In Stock', rating: 4.6, reviewCount: 85, description: 'Premium fresh celery.', quantityOptions: [{label: '1 Bunch', value: 1, price: 40}, {label: '2 Bunches', value: 2, price: 80}] },
  { id: 'l13', name: 'Lettuce', slug: 'lettuce', category: 'Leafy Vegetables', unitType: 'Piece', baseUnit: '1 Piece', basePrice: 50, image: getPlaceholder('Lettuce'), status: 'In Stock', rating: 4.8, reviewCount: 160, description: 'Crisp iceberg lettuce.', quantityOptions: generatePieceOptions(50) },
  { id: 'l14', name: 'Kale (Premium)', slug: 'kale', category: 'Leafy Vegetables', unitType: 'Bunch', baseUnit: '1 Bunch', basePrice: 80, image: getPlaceholder('Kale'), status: 'In Stock', rating: 4.7, reviewCount: 95, description: 'Premium fresh kale.', quantityOptions: [{label: '1 Bunch', value: 1, price: 80}, {label: '2 Bunches', value: 2, price: 160}] },
  { id: 'l15', name: 'Mustard Greens', slug: 'mustard-greens', category: 'Leafy Vegetables', unitType: 'Bunch', baseUnit: '1 Bunch', basePrice: 25, image: getPlaceholder('Mustard Greens'), status: 'In Stock', rating: 4.3, reviewCount: 40, description: 'Fresh mustard greens.', quantityOptions: [{label: '1 Bunch', value: 1, price: 25}, {label: '2 Bunches', value: 2, price: 50}] },

  // Root Vegetables
  { id: 'r1', name: 'Potato', slug: 'potato', category: 'Root Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 40, image: getPlaceholder('Potato'), status: 'In Stock', rating: 4.9, reviewCount: 520, description: 'Versatile potatoes.', quantityOptions: generateWeightOptions(40) },
  { id: 'r2', name: 'Carrot', slug: 'carrot-root', category: 'Root Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 50, image: getPlaceholder('Carrot'), status: 'In Stock', rating: 4.8, reviewCount: 410, description: 'Fresh carrots.', quantityOptions: generateWeightOptions(50) },
  { id: 'r3', name: 'Beetroot', slug: 'beetroot', category: 'Root Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 45, image: getPlaceholder('Beetroot'), status: 'In Stock', rating: 4.6, reviewCount: 180, description: 'Fresh beetroot.', quantityOptions: generateWeightOptions(45) },
  { id: 'r4', name: 'Radish', slug: 'radish', category: 'Root Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 35, image: getPlaceholder('Radish'), status: 'In Stock', rating: 4.5, reviewCount: 150, description: 'Fresh white radish.', quantityOptions: generateWeightOptions(35) },
  { id: 'r5', name: 'Sweet Potato', slug: 'sweet-potato', category: 'Root Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 60, image: getPlaceholder('Sweet Potato'), status: 'In Stock', rating: 4.7, reviewCount: 220, description: 'Sweet potatoes.', quantityOptions: generateWeightOptions(60) },
  { id: 'r6', name: 'Tapioca', slug: 'tapioca', category: 'Root Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 50, image: getPlaceholder('Tapioca'), status: 'In Stock', rating: 4.4, reviewCount: 90, description: 'Fresh tapioca root.', quantityOptions: generateWeightOptions(50) },
  { id: 'r7', name: 'Turnip', slug: 'turnip', category: 'Root Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 45, image: getPlaceholder('Turnip'), status: 'In Stock', rating: 4.3, reviewCount: 45, description: 'Fresh turnip.', quantityOptions: generateWeightOptions(45) },
  { id: 'r8', name: 'Elephant Foot Yam', slug: 'elephant-foot-yam', category: 'Root Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 70, image: getPlaceholder('Yam'), status: 'In Stock', rating: 4.5, reviewCount: 110, description: 'Fresh elephant foot yam.', quantityOptions: generateWeightOptions(70) },
  { id: 'r9', name: 'Colocasia (Arbi)', slug: 'colocasia', category: 'Root Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 55, image: getPlaceholder('Colocasia'), status: 'In Stock', rating: 4.6, reviewCount: 130, description: 'Fresh colocasia.', quantityOptions: generateWeightOptions(55) },
  { id: 'r10', name: 'Ginger', slug: 'ginger-root', category: 'Root Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 120, image: getPlaceholder('Ginger'), status: 'In Stock', rating: 4.8, reviewCount: 290, description: 'Fresh ginger root.', quantityOptions: generateWeightOptions(120) },
  { id: 'r11', name: 'Garlic', slug: 'garlic-root', category: 'Root Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 150, image: getPlaceholder('Garlic'), status: 'In Stock', rating: 4.9, reviewCount: 340, description: 'Fresh garlic bulbs.', quantityOptions: generateWeightOptions(150) },
  { id: 'r12', name: 'Turmeric (Fresh)', slug: 'turmeric-fresh', category: 'Root Vegetables', unitType: 'Weight', baseUnit: '1 kg', basePrice: 80, image: getPlaceholder('Turmeric'), status: 'In Stock', rating: 4.7, reviewCount: 95, description: 'Fresh raw turmeric.', quantityOptions: generateWeightOptions(80) },

  // Herbs & Seasonings
  { id: 'h1', name: 'Basil', slug: 'basil', category: 'Herbs & Seasonings', unitType: 'Pack', baseUnit: '1 Pack', basePrice: 50, image: getPlaceholder('Basil'), status: 'In Stock', rating: 4.8, reviewCount: 120, description: 'Fresh basil leaves.', quantityOptions: [{label: '1 Pack', value: 1, price: 50}] },
  { id: 'h2', name: 'Rosemary', slug: 'rosemary', category: 'Herbs & Seasonings', unitType: 'Pack', baseUnit: '1 Pack', basePrice: 60, image: getPlaceholder('Rosemary'), status: 'In Stock', rating: 4.7, reviewCount: 80, description: 'Fresh rosemary.', quantityOptions: [{label: '1 Pack', value: 1, price: 60}] },
  { id: 'h3', name: 'Thyme', slug: 'thyme', category: 'Herbs & Seasonings', unitType: 'Pack', baseUnit: '1 Pack', basePrice: 60, image: getPlaceholder('Thyme'), status: 'In Stock', rating: 4.6, reviewCount: 75, description: 'Fresh thyme.', quantityOptions: [{label: '1 Pack', value: 1, price: 60}] },
  { id: 'h4', name: 'Parsley', slug: 'parsley', category: 'Herbs & Seasonings', unitType: 'Pack', baseUnit: '1 Pack', basePrice: 50, image: getPlaceholder('Parsley'), status: 'In Stock', rating: 4.7, reviewCount: 90, description: 'Fresh parsley.', quantityOptions: [{label: '1 Pack', value: 1, price: 50}] },
  { id: 'h5', name: 'Oregano (Fresh)', slug: 'oregano', category: 'Herbs & Seasonings', unitType: 'Pack', baseUnit: '1 Pack', basePrice: 65, image: getPlaceholder('Oregano'), status: 'In Stock', rating: 4.5, reviewCount: 40, description: 'Fresh oregano leaves.', quantityOptions: [{label: '1 Pack', value: 1, price: 65}] },
  { id: 'h6', name: 'Sage', slug: 'sage', category: 'Herbs & Seasonings', unitType: 'Pack', baseUnit: '1 Pack', basePrice: 55, image: getPlaceholder('Sage'), status: 'In Stock', rating: 4.4, reviewCount: 30, description: 'Fresh sage.', quantityOptions: [{label: '1 Pack', value: 1, price: 55}] },
  { id: 'h7', name: 'Lemongrass', slug: 'lemongrass', category: 'Herbs & Seasonings', unitType: 'Bunch', baseUnit: '1 Bunch', basePrice: 30, image: getPlaceholder('Lemongrass'), status: 'In Stock', rating: 4.8, reviewCount: 110, description: 'Fresh lemongrass stalks.', quantityOptions: [{label: '1 Bunch', value: 1, price: 30}] },
  { id: 'h8', name: 'Lemon', slug: 'lemon', category: 'Herbs & Seasonings', unitType: 'Piece', baseUnit: '1 Piece', basePrice: 10, image: getPlaceholder('Lemon'), status: 'In Stock', rating: 4.9, reviewCount: 450, description: 'Fresh juicy lemons.', quantityOptions: generatePieceOptions(10) },

  // Fresh Fruits
  { id: 'f1', name: 'Apple', slug: 'apple', category: 'Fresh Fruits', unitType: 'Weight', baseUnit: '1 kg', basePrice: 180, image: getPlaceholder('Apple'), status: 'In Stock', rating: 4.8, reviewCount: 340, description: 'Crisp apples.', quantityOptions: generateWeightOptions(180) },
  { id: 'f2', name: 'Banana', slug: 'banana-fruit', category: 'Fresh Fruits', unitType: 'Dozen', baseUnit: '1 Dozen', basePrice: 60, image: getPlaceholder('Banana'), status: 'In Stock', rating: 4.9, reviewCount: 510, description: 'Fresh sweet bananas.', quantityOptions: [{ label: 'Half Dozen', value: 0.5, price: 30 }, { label: '1 Dozen', value: 1, price: 60 }] },
  { id: 'f3', name: 'Grapes (Green)', slug: 'grapes-green', category: 'Fresh Fruits', unitType: 'Weight', baseUnit: '1 kg', basePrice: 120, image: getPlaceholder('Green Grapes'), status: 'In Stock', rating: 4.7, reviewCount: 220, description: 'Sweet green grapes.', quantityOptions: generateWeightOptions(120) },
  { id: 'f4', name: 'Grapes (Black)', slug: 'grapes-black', category: 'Fresh Fruits', unitType: 'Weight', baseUnit: '1 kg', basePrice: 150, image: getPlaceholder('Black Grapes'), status: 'In Stock', rating: 4.8, reviewCount: 190, description: 'Sweet black grapes.', quantityOptions: generateWeightOptions(150) },
  { id: 'f5', name: 'Guava', slug: 'guava', category: 'Fresh Fruits', unitType: 'Weight', baseUnit: '1 kg', basePrice: 80, image: getPlaceholder('Guava'), status: 'In Stock', rating: 4.6, reviewCount: 140, description: 'Fresh guava.', quantityOptions: generateWeightOptions(80) },
  { id: 'f6', name: 'Pomegranate', slug: 'pomegranate', category: 'Fresh Fruits', unitType: 'Weight', baseUnit: '1 kg', basePrice: 200, image: getPlaceholder('Pomegranate'), status: 'In Stock', rating: 4.9, reviewCount: 280, description: 'Fresh pomegranates.', quantityOptions: generateWeightOptions(200) },
  { id: 'f7', name: 'Sapota (Chikoo)', slug: 'sapota', category: 'Fresh Fruits', unitType: 'Weight', baseUnit: '1 kg', basePrice: 60, image: getPlaceholder('Sapota'), status: 'In Stock', rating: 4.7, reviewCount: 160, description: 'Sweet sapota.', quantityOptions: generateWeightOptions(60) },
  { id: 'f8', name: 'Watermelon', slug: 'watermelon', category: 'Fresh Fruits', unitType: 'Piece', baseUnit: '1 Piece', basePrice: 80, image: getPlaceholder('Watermelon'), status: 'In Stock', rating: 4.8, reviewCount: 310, description: 'Large fresh watermelon.', quantityOptions: generatePieceOptions(80) },
  { id: 'f9', name: 'Muskmelon', slug: 'muskmelon', category: 'Fresh Fruits', unitType: 'Piece', baseUnit: '1 Piece', basePrice: 60, image: getPlaceholder('Muskmelon'), status: 'In Stock', rating: 4.7, reviewCount: 190, description: 'Sweet muskmelon.', quantityOptions: generatePieceOptions(60) },
  { id: 'f10', name: 'Pineapple', slug: 'pineapple', category: 'Fresh Fruits', unitType: 'Piece', baseUnit: '1 Piece', basePrice: 70, image: getPlaceholder('Pineapple'), status: 'In Stock', rating: 4.8, reviewCount: 250, description: 'Fresh pineapple.', quantityOptions: generatePieceOptions(70) },
  { id: 'f11', name: 'Custard Apple', slug: 'custard-apple', category: 'Fresh Fruits', unitType: 'Weight', baseUnit: '1 kg', basePrice: 120, image: getPlaceholder('Custard Apple'), status: 'In Stock', rating: 4.7, reviewCount: 110, description: 'Sweet custard apple.', quantityOptions: generateWeightOptions(120) },
  { id: 'f12', name: 'Wood Apple', slug: 'wood-apple', category: 'Fresh Fruits', unitType: 'Piece', baseUnit: '1 Piece', basePrice: 30, image: getPlaceholder('Wood Apple'), status: 'In Stock', rating: 4.4, reviewCount: 40, description: 'Fresh wood apple.', quantityOptions: generatePieceOptions(30) },
  { id: 'f13', name: 'Indian Jujube (Regi Pandu)', slug: 'indian-jujube', category: 'Fresh Fruits', unitType: 'Weight', baseUnit: '1 kg', basePrice: 50, image: getPlaceholder('Jujube'), status: 'In Stock', rating: 4.5, reviewCount: 70, description: 'Fresh jujube.', quantityOptions: generateWeightOptions(50) },
  { id: 'f14', name: 'Amla', slug: 'amla', category: 'Fresh Fruits', unitType: 'Weight', baseUnit: '1 kg', basePrice: 80, image: getPlaceholder('Amla'), status: 'In Stock', rating: 4.8, reviewCount: 150, description: 'Fresh gooseberry (amla).', quantityOptions: generateWeightOptions(80) },
  { id: 'f15', name: 'Pear', slug: 'pear', category: 'Fresh Fruits', unitType: 'Weight', baseUnit: '1 kg', basePrice: 150, image: getPlaceholder('Pear'), status: 'In Stock', rating: 4.7, reviewCount: 130, description: 'Fresh pears.', quantityOptions: generateWeightOptions(150) },

  // Citrus Fruits
  { id: 'c1', name: 'Orange', slug: 'orange', category: 'Citrus Fruits', unitType: 'Weight', baseUnit: '1 kg', basePrice: 100, image: getPlaceholder('Orange'), status: 'In Stock', rating: 4.8, reviewCount: 290, description: 'Juicy oranges.', quantityOptions: generateWeightOptions(100) },
  { id: 'c2', name: 'Sweet Lime (Mosambi)', slug: 'sweet-lime', category: 'Citrus Fruits', unitType: 'Weight', baseUnit: '1 kg', basePrice: 80, image: getPlaceholder('Mosambi'), status: 'In Stock', rating: 4.7, reviewCount: 210, description: 'Fresh mosambi.', quantityOptions: generateWeightOptions(80) },
  { id: 'c3', name: 'Mandarin Orange', slug: 'mandarin-orange', category: 'Citrus Fruits', unitType: 'Weight', baseUnit: '1 kg', basePrice: 150, image: getPlaceholder('Mandarin'), status: 'In Stock', rating: 4.8, reviewCount: 160, description: 'Fresh mandarin oranges.', quantityOptions: generateWeightOptions(150) },
  { id: 'c4', name: 'Grapefruit', slug: 'grapefruit', category: 'Citrus Fruits', unitType: 'Piece', baseUnit: '1 Piece', basePrice: 60, image: getPlaceholder('Grapefruit'), status: 'In Stock', rating: 4.6, reviewCount: 80, description: 'Fresh grapefruit.', quantityOptions: generatePieceOptions(60) },
  { id: 'c5', name: 'Kinnow', slug: 'kinnow', category: 'Citrus Fruits', unitType: 'Weight', baseUnit: '1 kg', basePrice: 70, image: getPlaceholder('Kinnow'), status: 'In Stock', rating: 4.7, reviewCount: 140, description: 'Fresh kinnow.', quantityOptions: generateWeightOptions(70) },

  // Seasonal Fruits
  { id: 's1', name: 'Mango (Banganapalli)', slug: 'mango-banganapalli', category: 'Seasonal Fruits', unitType: 'Weight', baseUnit: '1 kg', basePrice: 120, image: getPlaceholder('Mango'), status: 'In Stock', rating: 4.9, reviewCount: 650, description: 'Sweet banganapalli mangoes.', quantityOptions: generateWeightOptions(120) },
  { id: 's2', name: 'Mango (Alphonso)', slug: 'mango-alphonso', category: 'Seasonal Fruits', unitType: 'Weight', baseUnit: '1 kg', basePrice: 250, image: getPlaceholder('Alphonso'), status: 'In Stock', rating: 4.9, reviewCount: 520, description: 'Premium alphonso mangoes.', quantityOptions: generateWeightOptions(250) },
  { id: 's3', name: 'Mango (Dasheri)', slug: 'mango-dasheri', category: 'Seasonal Fruits', unitType: 'Weight', baseUnit: '1 kg', basePrice: 150, image: getPlaceholder('Dasheri'), status: 'In Stock', rating: 4.8, reviewCount: 310, description: 'Sweet dasheri mangoes.', quantityOptions: generateWeightOptions(150) },
  { id: 's4', name: 'Mango (Totapuri)', slug: 'mango-totapuri', category: 'Seasonal Fruits', unitType: 'Weight', baseUnit: '1 kg', basePrice: 60, image: getPlaceholder('Totapuri'), status: 'In Stock', rating: 4.6, reviewCount: 220, description: 'Tangy totapuri mangoes.', quantityOptions: generateWeightOptions(60) },
  { id: 's5', name: 'Litchi', slug: 'litchi', category: 'Seasonal Fruits', unitType: 'Pack', baseUnit: '1 Pack', basePrice: 150, image: getPlaceholder('Litchi'), status: 'In Stock', rating: 4.8, reviewCount: 190, description: 'Fresh sweet litchi.', quantityOptions: [{label: '1 Pack', value: 1, price: 150}] },
  { id: 's6', name: 'Jamun', slug: 'jamun', category: 'Seasonal Fruits', unitType: 'Weight', baseUnit: '1 kg', basePrice: 200, image: getPlaceholder('Jamun'), status: 'In Stock', rating: 4.7, reviewCount: 140, description: 'Fresh jamun.', quantityOptions: generateWeightOptions(200) },
  { id: 's7', name: 'Plum', slug: 'plum', category: 'Seasonal Fruits', unitType: 'Weight', baseUnit: '1 kg', basePrice: 180, image: getPlaceholder('Plum'), status: 'In Stock', rating: 4.6, reviewCount: 110, description: 'Fresh juicy plums.', quantityOptions: generateWeightOptions(180) },
  { id: 's8', name: 'Peach', slug: 'peach', category: 'Seasonal Fruits', unitType: 'Weight', baseUnit: '1 kg', basePrice: 200, image: getPlaceholder('Peach'), status: 'In Stock', rating: 4.7, reviewCount: 120, description: 'Fresh sweet peaches.', quantityOptions: generateWeightOptions(200) },
  { id: 's9', name: 'Strawberry', slug: 'strawberry', category: 'Seasonal Fruits', unitType: 'Pack', baseUnit: '1 Pack', basePrice: 100, image: getPlaceholder('Strawberry'), status: 'In Stock', rating: 4.8, reviewCount: 280, description: 'Fresh strawberries.', quantityOptions: [{label: '1 Pack', value: 1, price: 100}] },

  // Premium Fruits
  { id: 'pr1', name: 'Kiwi', slug: 'kiwi', category: 'Premium Fruits', unitType: 'Pack', baseUnit: '1 Pack', basePrice: 150, image: getPlaceholder('Kiwi'), status: 'In Stock', rating: 4.8, reviewCount: 320, description: 'Premium imported kiwis.', quantityOptions: [{label: '1 Pack (3 pcs)', value: 1, price: 150}] },
  { id: 'pr2', name: 'Dragon Fruit', slug: 'dragon-fruit', category: 'Premium Fruits', unitType: 'Piece', baseUnit: '1 Piece', basePrice: 100, image: getPlaceholder('Dragon Fruit'), status: 'In Stock', rating: 4.7, reviewCount: 190, description: 'Fresh dragon fruit.', quantityOptions: generatePieceOptions(100) },
  { id: 'pr3', name: 'Avocado', slug: 'avocado', category: 'Premium Fruits', unitType: 'Piece', baseUnit: '1 Piece', basePrice: 180, image: getPlaceholder('Avocado'), status: 'In Stock', rating: 4.9, reviewCount: 420, description: 'Hass avocado.', quantityOptions: generatePieceOptions(180) },
  { id: 'pr4', name: 'Blueberries', slug: 'blueberries', category: 'Premium Fruits', unitType: 'Pack', baseUnit: '1 Pack', basePrice: 300, image: getPlaceholder('Blueberries'), status: 'In Stock', rating: 4.9, reviewCount: 210, description: 'Fresh blueberries.', quantityOptions: [{label: '1 Pack', value: 1, price: 300}] },
  { id: 'pr5', name: 'Cherries', slug: 'cherries', category: 'Premium Fruits', unitType: 'Pack', baseUnit: '1 Pack', basePrice: 400, image: getPlaceholder('Cherries'), status: 'In Stock', rating: 4.8, reviewCount: 150, description: 'Fresh imported cherries.', quantityOptions: [{label: '1 Pack', value: 1, price: 400}] },
  { id: 'pr6', name: 'Blackberries', slug: 'blackberries', category: 'Premium Fruits', unitType: 'Pack', baseUnit: '1 Pack', basePrice: 350, image: getPlaceholder('Blackberries'), status: 'In Stock', rating: 4.7, reviewCount: 90, description: 'Fresh blackberries.', quantityOptions: [{label: '1 Pack', value: 1, price: 350}] },
  { id: 'pr7', name: 'Raspberries', slug: 'raspberries', category: 'Premium Fruits', unitType: 'Pack', baseUnit: '1 Pack', basePrice: 400, image: getPlaceholder('Raspberries'), status: 'In Stock', rating: 4.8, reviewCount: 110, description: 'Fresh raspberries.', quantityOptions: [{label: '1 Pack', value: 1, price: 400}] },
  { id: 'pr8', name: 'Imported Apple', slug: 'imported-apple', category: 'Premium Fruits', unitType: 'Weight', baseUnit: '1 kg', basePrice: 300, image: getPlaceholder('Imported Apple'), status: 'In Stock', rating: 4.8, reviewCount: 160, description: 'Premium Washington apples.', quantityOptions: generateWeightOptions(300) },
  { id: 'pr9', name: 'Imported Pear', slug: 'imported-pear', category: 'Premium Fruits', unitType: 'Weight', baseUnit: '1 kg', basePrice: 250, image: getPlaceholder('Imported Pear'), status: 'In Stock', rating: 4.7, reviewCount: 120, description: 'Premium imported pears.', quantityOptions: generateWeightOptions(250) },
  { id: 'pr10', name: 'Imported Grapes', slug: 'imported-grapes', category: 'Premium Fruits', unitType: 'Weight', baseUnit: '1 kg', basePrice: 350, image: getPlaceholder('Imported Grapes'), status: 'In Stock', rating: 4.9, reviewCount: 180, description: 'Premium red globe grapes.', quantityOptions: generateWeightOptions(350) },
  { id: 'pr11', name: 'Passion Fruit', slug: 'passion-fruit', category: 'Premium Fruits', unitType: 'Piece', baseUnit: '1 Piece', basePrice: 50, image: getPlaceholder('Passion Fruit'), status: 'In Stock', rating: 4.6, reviewCount: 70, description: 'Fresh passion fruit.', quantityOptions: generatePieceOptions(50) }
];
