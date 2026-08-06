// Full Menu Data for all 6 restaurants
export const menuData = {
  // ─────────────────────────────────────────────────
  // 1. CHALUKYA GRAND
  // ─────────────────────────────────────────────────
  1: {
    'Best Sellers': [
      {
        id: 101, name: 'Chicken Dum Biryani', description: 'Slow-cooked aromatic basmati rice with tender chicken pieces and royal spices', price: 220, offerPrice: 180, image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300&h=200&fit=crop', isVeg: false, prepTime: '35 min', isAvailable: true, isBestSeller: true, customizable: true,
      },
      {
        id: 102, name: 'Paneer Butter Masala', description: 'Creamy tomato-based gravy with soft paneer cubes, served with naan', price: 180, offerPrice: 150, image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300&h=200&fit=crop', isVeg: true, prepTime: '20 min', isAvailable: true, isBestSeller: true, customizable: true,
      },
      {
        id: 103, name: 'Chicken 65', description: 'Crispy deep-fried chicken with aromatic spices and curry leaves', price: 160, offerPrice: null, image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300&h=200&fit=crop', isVeg: false, prepTime: '20 min', isAvailable: true, isBestSeller: true, customizable: false,
      },
      {
        id: 104, name: 'Dal Makhani', description: 'Black lentils slow-cooked overnight with butter and cream', price: 150, offerPrice: 120, image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=300&h=200&fit=crop', isVeg: true, prepTime: '15 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
    ],
    'Starters': [
      {
        id: 105, name: 'Veg Manchurian', description: 'Crispy vegetable balls tossed in tangy Manchurian sauce', price: 120, offerPrice: null, image: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=300&h=200&fit=crop', isVeg: true, prepTime: '15 min', isAvailable: true, isBestSeller: false, customizable: true,
      },
      {
        id: 106, name: 'Chicken Tikka', description: 'Marinated chicken grilled in tandoor with mint chutney', price: 200, offerPrice: 170, image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=300&h=200&fit=crop', isVeg: false, prepTime: '25 min', isAvailable: true, isBestSeller: false, customizable: true,
      },
      {
        id: 107, name: 'Paneer Tikka', description: 'Marinated cottage cheese cubes grilled to perfection', price: 170, offerPrice: null, image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300&h=200&fit=crop', isVeg: true, prepTime: '20 min', isAvailable: true, isBestSeller: false, customizable: true,
      },
    ],
    'Biryani': [
      {
        id: 108, name: 'Mutton Dum Biryani', description: 'Premium mutton with long-grain basmati, cooked dum style', price: 280, offerPrice: 240, image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300&h=200&fit=crop', isVeg: false, prepTime: '40 min', isAvailable: true, isBestSeller: false, customizable: true,
      },
      {
        id: 109, name: 'Veg Dum Biryani', description: 'Fresh vegetables with aromatic spices in traditional dum style', price: 160, offerPrice: 130, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=200&fit=crop', isVeg: true, prepTime: '30 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
    ],
    'North Indian': [
      {
        id: 110, name: 'Butter Chicken', description: 'Tender chicken in a rich, creamy butter-tomato sauce', price: 200, offerPrice: 170, image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300&h=200&fit=crop', isVeg: false, prepTime: '25 min', isAvailable: true, isBestSeller: false, customizable: true,
      },
      {
        id: 111, name: 'Shahi Paneer', description: 'Cottage cheese in a royal Mughal-style creamy gravy', price: 190, offerPrice: null, image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=300&h=200&fit=crop', isVeg: true, prepTime: '20 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
      {
        id: 112, name: 'Garlic Naan', description: 'Soft leavened bread topped with garlic and butter', price: 40, offerPrice: null, image: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=300&h=200&fit=crop', isVeg: true, prepTime: '10 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
    ],
    'Chinese': [
      {
        id: 113, name: 'Chicken Fried Rice', description: 'Wok-tossed rice with chicken, vegetables and soy sauce', price: 150, offerPrice: 120, image: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=300&h=200&fit=crop', isVeg: false, prepTime: '20 min', isAvailable: true, isBestSeller: false, customizable: true,
      },
      {
        id: 114, name: 'Hakka Noodles', description: 'Stir-fried noodles with vegetables and Indo-Chinese sauces', price: 130, offerPrice: null, image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300&h=200&fit=crop', isVeg: true, prepTime: '15 min', isAvailable: true, isBestSeller: false, customizable: true,
      },
    ],
    'Cold Drinks': [
      {
        id: 115, name: 'Fresh Lime Soda', description: 'Refreshing lime juice with soda, choice of sweet or salted', price: 60, offerPrice: null, image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=300&h=200&fit=crop', isVeg: true, prepTime: '5 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
      {
        id: 116, name: 'Mango Lassi', description: 'Thick blended mango with yogurt and cardamom', price: 80, offerPrice: null, image: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=300&h=200&fit=crop', isVeg: true, prepTime: '5 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
    ],
    'Desserts': [
      {
        id: 117, name: 'Gulab Jamun', description: 'Soft milk-solid dumplings soaked in rose-flavored sugar syrup', price: 80, offerPrice: null, image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=300&h=200&fit=crop', isVeg: true, prepTime: '10 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
      {
        id: 118, name: 'Ice Cream (2 scoops)', description: 'Choice of vanilla, chocolate or strawberry ice cream', price: 80, offerPrice: 60, image: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=300&h=200&fit=crop', isVeg: true, prepTime: '5 min', isAvailable: true, isBestSeller: false, customizable: true,
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // 2. SR GRAND FAMILY RESTAURANT
  // ─────────────────────────────────────────────────
  2: {
    'Best Sellers': [
      {
        id: 201, name: 'Family Meals Thali', description: 'Complete veg thali with rice, dal, sabzi, roti, raita and dessert', price: 180, offerPrice: 150, image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=300&h=200&fit=crop', isVeg: true, prepTime: '20 min', isAvailable: true, isBestSeller: true, customizable: false,
      },
      {
        id: 202, name: 'Chicken Biryani', description: 'Aromatic basmati rice with juicy chicken and saffron', price: 190, offerPrice: 160, image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300&h=200&fit=crop', isVeg: false, prepTime: '30 min', isAvailable: true, isBestSeller: true, customizable: true,
      },
      {
        id: 203, name: 'Masala Dosa', description: 'Crispy rice crepe filled with spiced potato filling', price: 80, offerPrice: null, image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=300&h=200&fit=crop', isVeg: true, prepTime: '15 min', isAvailable: true, isBestSeller: true, customizable: false,
      },
    ],
    'Breakfast': [
      {
        id: 204, name: 'Idli Sambar (4 pcs)', description: 'Steamed rice cakes with lentil soup and chutneys', price: 60, offerPrice: null, image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=300&h=200&fit=crop', isVeg: true, prepTime: '10 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
      {
        id: 205, name: 'Plain Dosa', description: 'Crispy thin rice crepe served with sambar and chutneys', price: 60, offerPrice: null, image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=300&h=200&fit=crop', isVeg: true, prepTime: '10 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
      {
        id: 206, name: 'Upma', description: 'Savory semolina porridge with vegetables and spices', price: 50, offerPrice: null, image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300&h=200&fit=crop', isVeg: true, prepTime: '10 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
    ],
    'Meals': [
      {
        id: 207, name: 'Special Veg Meals', description: 'Rice, 2 curries, sambar, rasam, curd, papad and pickle', price: 120, offerPrice: 100, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=200&fit=crop', isVeg: true, prepTime: '15 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
      {
        id: 208, name: 'Chicken Meals', description: 'Rice, chicken curry, sambar, rasam and curd', price: 160, offerPrice: 130, image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300&h=200&fit=crop', isVeg: false, prepTime: '20 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
    ],
    'Starters': [
      {
        id: 209, name: 'Gobi 65', description: 'Crispy fried cauliflower with spicy coating', price: 120, offerPrice: null, image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300&h=200&fit=crop', isVeg: true, prepTime: '15 min', isAvailable: true, isBestSeller: false, customizable: true,
      },
      {
        id: 210, name: 'Egg Fry', description: 'Spiced egg fry with onions and green chilies', price: 80, offerPrice: null, image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=300&h=200&fit=crop', isVeg: false, prepTime: '10 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
    ],
    'North Indian': [
      {
        id: 211, name: 'Chole Bhature', description: 'Spiced chickpea curry with fluffy deep-fried bread', price: 120, offerPrice: null, image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300&h=200&fit=crop', isVeg: true, prepTime: '20 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
      {
        id: 212, name: 'Roti (3 pcs)', description: 'Soft whole wheat flatbread from tandoor', price: 30, offerPrice: null, image: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=300&h=200&fit=crop', isVeg: true, prepTime: '10 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
    ],
    'South Indian': [
      {
        id: 213, name: 'Rasam Vada', description: 'Crispy lentil fritters dunked in tangy rasam', price: 70, offerPrice: null, image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=300&h=200&fit=crop', isVeg: true, prepTime: '15 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
      {
        id: 214, name: 'Rava Idli', description: 'Steamed semolina cakes with coconut chutney', price: 70, offerPrice: null, image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=300&h=200&fit=crop', isVeg: true, prepTime: '12 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
    ],
    'Chinese': [
      {
        id: 215, name: 'Veg Fried Rice', description: 'Wok-tossed rice with fresh vegetables and sauces', price: 120, offerPrice: null, image: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=300&h=200&fit=crop', isVeg: true, prepTime: '15 min', isAvailable: true, isBestSeller: false, customizable: true,
      },
    ],
    'Cold Drinks': [
      {
        id: 216, name: 'Buttermilk', description: 'Cool and refreshing spiced yogurt drink', price: 30, offerPrice: null, image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=300&h=200&fit=crop', isVeg: true, prepTime: '5 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
      {
        id: 217, name: 'Soft Drinks', description: 'Pepsi, 7Up, or Mirinda – chilled and refreshing', price: 40, offerPrice: null, image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=300&h=200&fit=crop', isVeg: true, prepTime: '2 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // 3. NIWAALA - THE HEAVENLY BITES
  // ─────────────────────────────────────────────────
  3: {
    'Best Sellers': [
      {
        id: 301, name: 'Niwaala Special Biryani', description: 'Our signature biryani with secret spice blend, slow cooked for 3 hours', price: 250, offerPrice: 200, image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300&h=200&fit=crop', isVeg: false, prepTime: '40 min', isAvailable: true, isBestSeller: true, customizable: true,
      },
      {
        id: 302, name: 'Heavenly Kebab Platter', description: 'Assorted seekh, boti and shami kebabs with mint chutney', price: 320, offerPrice: 280, image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=300&h=200&fit=crop', isVeg: false, prepTime: '30 min', isAvailable: true, isBestSeller: true, customizable: false,
      },
      {
        id: 303, name: 'Royal Paneer Platter', description: 'Paneer tikka, paneer malai and paneer Afghani combo', price: 260, offerPrice: 220, image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300&h=200&fit=crop', isVeg: true, prepTime: '25 min', isAvailable: true, isBestSeller: true, customizable: true,
      },
    ],
    'Starters': [
      {
        id: 304, name: 'Chicken Lollipop', description: 'Crispy chicken drumettes in spicy coating', price: 180, offerPrice: 150, image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300&h=200&fit=crop', isVeg: false, prepTime: '20 min', isAvailable: true, isBestSeller: false, customizable: true,
      },
      {
        id: 305, name: 'Fish Fingers', description: 'Crispy golden fish strips with tartar sauce', price: 200, offerPrice: null, image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=300&h=200&fit=crop', isVeg: false, prepTime: '20 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
      {
        id: 306, name: 'Corn Cheese Balls', description: 'Deep-fried cheesy corn balls with dipping sauce', price: 140, offerPrice: null, image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=300&h=200&fit=crop', isVeg: true, prepTime: '15 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
    ],
    'Biryani': [
      {
        id: 307, name: 'Prawn Biryani', description: 'Juicy prawns with aromatic spices in dum biryani style', price: 300, offerPrice: 260, image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300&h=200&fit=crop', isVeg: false, prepTime: '45 min', isAvailable: true, isBestSeller: false, customizable: true,
      },
      {
        id: 308, name: 'Egg Biryani', description: 'Perfectly spiced biryani with boiled eggs', price: 160, offerPrice: 140, image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=300&h=200&fit=crop', isVeg: false, prepTime: '30 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
    ],
    'Meals': [
      {
        id: 309, name: 'Niwaala Full Meals', description: 'Premium rice, 3 gravies, papad, pickle, curd and dessert', price: 200, offerPrice: 170, image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=300&h=200&fit=crop', isVeg: true, prepTime: '20 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
    ],
    'Chinese': [
      {
        id: 310, name: 'Dragon Chicken', description: 'Spicy crispy chicken in dragon sauce', price: 190, offerPrice: 160, image: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=300&h=200&fit=crop', isVeg: false, prepTime: '20 min', isAvailable: true, isBestSeller: false, customizable: true,
      },
      {
        id: 311, name: 'Chilli Paneer', description: 'Crispy paneer cubes tossed in spicy chilli sauce', price: 160, offerPrice: null, image: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=300&h=200&fit=crop', isVeg: true, prepTime: '20 min', isAvailable: true, isBestSeller: false, customizable: true,
      },
    ],
    'Rolls': [
      {
        id: 312, name: 'Chicken Kathi Roll', description: 'Spiced chicken tikka wrapped in flaky paratha', price: 120, offerPrice: 100, image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=300&h=200&fit=crop', isVeg: false, prepTime: '15 min', isAvailable: true, isBestSeller: false, customizable: true,
      },
      {
        id: 313, name: 'Paneer Kathi Roll', description: 'Marinated paneer tikka wrapped in soft paratha', price: 110, offerPrice: null, image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300&h=200&fit=crop', isVeg: true, prepTime: '15 min', isAvailable: true, isBestSeller: false, customizable: true,
      },
    ],
    'Desserts': [
      {
        id: 314, name: 'Shahi Tukda', description: 'Royal bread pudding with saffron milk and dry fruits', price: 120, offerPrice: null, image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=300&h=200&fit=crop', isVeg: true, prepTime: '10 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
      {
        id: 315, name: 'Kulfi', description: 'Traditional Indian ice cream with cardamom and pistachios', price: 80, offerPrice: null, image: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=300&h=200&fit=crop', isVeg: true, prepTime: '5 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
    ],
    'Cold Drinks': [
      {
        id: 316, name: 'Rose Sharbat', description: 'Refreshing chilled rose drink with basil seeds', price: 70, offerPrice: null, image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=300&h=200&fit=crop', isVeg: true, prepTime: '5 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // 4. HOTEL RAGHAVENDRA (Pure Veg)
  // ─────────────────────────────────────────────────
  4: {
    'Best Sellers': [
      {
        id: 401, name: 'Special Thali', description: 'Unlimited meals with rice, 3 curries, sambar, rasam, curd, papad', price: 130, offerPrice: 100, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=200&fit=crop', isVeg: true, prepTime: '15 min', isAvailable: true, isBestSeller: true, customizable: false,
      },
      {
        id: 402, name: 'Paper Masala Dosa', description: 'Crispy paper-thin dosa with potato masala filling', price: 90, offerPrice: null, image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=300&h=200&fit=crop', isVeg: true, prepTime: '12 min', isAvailable: true, isBestSeller: true, customizable: false,
      },
      {
        id: 403, name: 'Puri Bhaji', description: 'Fluffy deep-fried bread with spiced potato curry', price: 70, offerPrice: null, image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300&h=200&fit=crop', isVeg: true, prepTime: '10 min', isAvailable: true, isBestSeller: true, customizable: false,
      },
    ],
    'Breakfast': [
      {
        id: 404, name: 'Idli Vada Combo', description: '2 idli + 1 vada with sambar and two chutneys', price: 70, offerPrice: null, image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=300&h=200&fit=crop', isVeg: true, prepTime: '10 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
      {
        id: 405, name: 'Poha', description: 'Flattened rice with onions, peas, mustard seeds and lemon', price: 50, offerPrice: null, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=200&fit=crop', isVeg: true, prepTime: '8 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
      {
        id: 406, name: 'Uttapam', description: 'Thick rice pancake with tomato, onion and coriander', price: 80, offerPrice: null, image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=300&h=200&fit=crop', isVeg: true, prepTime: '15 min', isAvailable: true, isBestSeller: false, customizable: true,
      },
    ],
    'Meals': [
      {
        id: 407, name: 'Lunch Meals', description: 'Rice, sambar, rasam, 2 vegetable curries, curd and papad', price: 100, offerPrice: 80, image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=300&h=200&fit=crop', isVeg: true, prepTime: '15 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
      {
        id: 408, name: 'Mini Meals', description: 'Rice, sambar, one curry and curd - perfect light meal', price: 70, offerPrice: null, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=200&fit=crop', isVeg: true, prepTime: '10 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
    ],
    'Tiffin': [
      {
        id: 409, name: 'Set Dosa (3 pcs)', description: 'Soft fluffy dosas served with sambar and chutneys', price: 70, offerPrice: null, image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=300&h=200&fit=crop', isVeg: true, prepTime: '12 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
      {
        id: 410, name: 'Bisi Bele Bath', description: 'Karnataka-style rice, lentils and vegetables in spiced broth', price: 90, offerPrice: null, image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=300&h=200&fit=crop', isVeg: true, prepTime: '15 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
    ],
    'Chaat': [
      {
        id: 411, name: 'Pani Puri (6 pcs)', description: 'Crispy puris filled with spiced water and tangy filling', price: 50, offerPrice: null, image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300&h=200&fit=crop', isVeg: true, prepTime: '5 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
      {
        id: 412, name: 'Bhel Puri', description: 'Crunchy puffed rice with vegetables, chutneys and sev', price: 60, offerPrice: null, image: 'https://images.unsplash.com/photo-1524492412937-b28074a47d70?w=300&h=200&fit=crop', isVeg: true, prepTime: '5 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
    ],
    'South Indian': [
      {
        id: 413, name: 'Sambar Rice', description: 'Rice mixed with tangy lentil sambar and ghee', price: 80, offerPrice: null, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=200&fit=crop', isVeg: true, prepTime: '10 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
    ],
    'Tea & Coffee': [
      {
        id: 414, name: 'Filter Coffee', description: 'South Indian strong decoction filter coffee with frothy milk', price: 30, offerPrice: null, image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300&h=200&fit=crop', isVeg: true, prepTime: '5 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
      {
        id: 415, name: 'Masala Chai', description: 'Aromatic tea with ginger, cardamom and spices', price: 20, offerPrice: null, image: 'https://images.unsplash.com/photo-1547825407-2d060104b7f8?w=300&h=200&fit=crop', isVeg: true, prepTime: '5 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // 5. MSR GOLDEN PIZZA HOUSE
  // ─────────────────────────────────────────────────
  5: {
    'Best Sellers': [
      {
        id: 501, name: 'Chicken BBQ Pizza', description: 'Smoky BBQ base with tender chicken, onions and bell peppers', price: 280, offerPrice: 240, image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&h=200&fit=crop', isVeg: false, prepTime: '25 min', isAvailable: true, isBestSeller: true, customizable: true,
      },
      {
        id: 502, name: 'Paneer Tikka Pizza', description: 'Tandoori paneer with peppers and Indian spiced sauce', price: 250, offerPrice: 210, image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&h=200&fit=crop', isVeg: true, prepTime: '25 min', isAvailable: true, isBestSeller: true, customizable: true,
      },
      {
        id: 503, name: 'Loaded Chicken Burger', description: 'Crispy chicken fillet with cheese, lettuce and special sauce', price: 180, offerPrice: 150, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=200&fit=crop', isVeg: false, prepTime: '15 min', isAvailable: true, isBestSeller: true, customizable: true,
      },
    ],
    'Pizza': [
      {
        id: 504, name: 'Margherita Pizza', description: 'Classic tomato, mozzarella and fresh basil', price: 180, offerPrice: null, image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&h=200&fit=crop', isVeg: true, prepTime: '20 min', isAvailable: true, isBestSeller: false, customizable: true,
      },
      {
        id: 505, name: 'Pepperoni Pizza', description: 'Loaded with spicy pepperoni and mozzarella cheese', price: 300, offerPrice: 260, image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&h=200&fit=crop', isVeg: false, prepTime: '25 min', isAvailable: true, isBestSeller: false, customizable: true,
      },
      {
        id: 506, name: 'Mexican Green Wave', description: 'Jalapeños, capsicum, onion and salsa on crispy base', price: 220, offerPrice: null, image: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=300&h=200&fit=crop', isVeg: true, prepTime: '22 min', isAvailable: true, isBestSeller: false, customizable: true,
      },
    ],
    'Burgers': [
      {
        id: 507, name: 'Classic Veg Burger', description: 'Crispy veg patty with cheese and fresh vegetables', price: 120, offerPrice: null, image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=300&h=200&fit=crop', isVeg: true, prepTime: '12 min', isAvailable: true, isBestSeller: false, customizable: true,
      },
      {
        id: 508, name: 'Double Smash Burger', description: 'Two smash patties with special sauce and pickles', price: 250, offerPrice: 210, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=200&fit=crop', isVeg: false, prepTime: '18 min', isAvailable: true, isBestSeller: false, customizable: true,
      },
    ],
    'Pasta': [
      {
        id: 509, name: 'Arabiatta Pasta', description: 'Penne in spicy tomato sauce with garlic', price: 180, offerPrice: null, image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300&h=200&fit=crop', isVeg: true, prepTime: '18 min', isAvailable: true, isBestSeller: false, customizable: true,
      },
      {
        id: 510, name: 'Chicken Alfredo', description: 'Creamy white sauce pasta with grilled chicken', price: 220, offerPrice: 190, image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=300&h=200&fit=crop', isVeg: false, prepTime: '20 min', isAvailable: true, isBestSeller: false, customizable: true,
      },
    ],
    'Sides': [
      {
        id: 511, name: 'Garlic Bread (4 pcs)', description: 'Toasted garlic bread with herb butter', price: 80, offerPrice: null, image: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=300&h=200&fit=crop', isVeg: true, prepTime: '8 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
      {
        id: 512, name: 'French Fries', description: 'Crispy golden fries with ketchup and dip', price: 90, offerPrice: null, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=200&fit=crop', isVeg: true, prepTime: '10 min', isAvailable: true, isBestSeller: false, customizable: true,
      },
    ],
    'Cold Drinks': [
      {
        id: 513, name: 'Cold Coffee', description: 'Chilled coffee blended with milk and ice cream', price: 120, offerPrice: null, image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300&h=200&fit=crop', isVeg: true, prepTime: '8 min', isAvailable: true, isBestSeller: false, customizable: true,
      },
      {
        id: 514, name: 'Watermelon Juice', description: 'Fresh chilled watermelon juice without ice', price: 80, offerPrice: null, image: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=300&h=200&fit=crop', isVeg: true, prepTime: '5 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
    ],
    'Combos': [
      {
        id: 515, name: 'Pizza + Drink Combo', description: 'Any medium pizza + cold drink at special price', price: 350, offerPrice: 299, image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&h=200&fit=crop', isVeg: false, prepTime: '25 min', isAvailable: true, isBestSeller: false, customizable: true,
      },
      {
        id: 516, name: 'Burger + Fries Combo', description: 'Any burger with large fries and cold drink', price: 280, offerPrice: 240, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=200&fit=crop', isVeg: false, prepTime: '15 min', isAvailable: true, isBestSeller: false, customizable: true,
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // 6. ROOPA BENGALURU BAKERY
  // ─────────────────────────────────────────────────
  6: {
    'Best Sellers': [
      {
        id: 601, name: 'Black Forest Cake (500g)', description: 'Classic German-style chocolate sponge with cherries and cream', price: 350, offerPrice: 280, image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&h=200&fit=crop', isVeg: true, prepTime: '10 min', isAvailable: true, isBestSeller: true, customizable: false,
      },
      {
        id: 602, name: 'Butter Croissant', description: 'Flaky, golden-baked French-style croissant with real butter', price: 60, offerPrice: null, image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=300&h=200&fit=crop', isVeg: true, prepTime: '5 min', isAvailable: true, isBestSeller: true, customizable: false,
      },
      {
        id: 603, name: 'Chocolate Truffle Pastry', description: 'Rich chocolate mousse pastry with chocolate glaze', price: 80, offerPrice: 65, image: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=300&h=200&fit=crop', isVeg: true, prepTime: '5 min', isAvailable: true, isBestSeller: true, customizable: false,
      },
    ],
    'Breads': [
      {
        id: 604, name: 'Multigrain Loaf', description: 'Healthy whole grain bread with seeds and oats', price: 120, offerPrice: null, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&h=200&fit=crop', isVeg: true, prepTime: '5 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
      {
        id: 605, name: 'Garlic Focaccia', description: 'Italian flatbread with roasted garlic and herbs', price: 100, offerPrice: null, image: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=300&h=200&fit=crop', isVeg: true, prepTime: '5 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
    ],
    'Cakes': [
      {
        id: 606, name: 'Pineapple Cake (500g)', description: 'Soft vanilla sponge with fresh pineapple and cream', price: 280, offerPrice: 240, image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&h=200&fit=crop', isVeg: true, prepTime: '10 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
      {
        id: 607, name: 'Red Velvet Cake (500g)', description: 'Velvety red sponge with cream cheese frosting', price: 380, offerPrice: 320, image: 'https://images.unsplash.com/photo-1558301211-0d8c8ddee6ec?w=300&h=200&fit=crop', isVeg: true, prepTime: '10 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
      {
        id: 608, name: 'Butterscotch Cake (500g)', description: 'Caramel butterscotch layered cake with crunchy praline', price: 300, offerPrice: null, image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=300&h=200&fit=crop', isVeg: true, prepTime: '10 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
    ],
    'Pastries': [
      {
        id: 609, name: 'Blueberry Cheesecake', description: 'Creamy New York style cheesecake with blueberry topping', price: 120, offerPrice: null, image: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=300&h=200&fit=crop', isVeg: true, prepTime: '5 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
      {
        id: 610, name: 'Mango Pastry', description: 'Fresh mango cream with sponge layers', price: 90, offerPrice: 75, image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=300&h=200&fit=crop', isVeg: true, prepTime: '5 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
    ],
    'Cookies': [
      {
        id: 611, name: 'Chocolate Chip Cookies (6 pcs)', description: 'Freshly baked soft chocolate chip cookies', price: 80, offerPrice: null, image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=300&h=200&fit=crop', isVeg: true, prepTime: '5 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
      {
        id: 612, name: 'Butter Cookies (6 pcs)', description: 'Melt-in-mouth traditional butter cookies', price: 60, offerPrice: null, image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=300&h=200&fit=crop', isVeg: true, prepTime: '5 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
    ],
    'Sandwiches': [
      {
        id: 613, name: 'Club Sandwich', description: 'Triple-decker with chicken, cheese, lettuce and tomato', price: 150, offerPrice: 120, image: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=300&h=200&fit=crop', isVeg: false, prepTime: '10 min', isAvailable: true, isBestSeller: false, customizable: true,
      },
      {
        id: 614, name: 'Veg Grilled Sandwich', description: 'Mixed vegetables with cheese on toasted bread', price: 100, offerPrice: null, image: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=300&h=200&fit=crop', isVeg: true, prepTime: '8 min', isAvailable: true, isBestSeller: false, customizable: true,
      },
    ],
    'Coffee': [
      {
        id: 615, name: 'Cappuccino', description: 'Espresso with steamed milk foam and cocoa dusting', price: 80, offerPrice: null, image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300&h=200&fit=crop', isVeg: true, prepTime: '5 min', isAvailable: true, isBestSeller: false, customizable: true,
      },
      {
        id: 616, name: 'Cold Brew Coffee', description: 'Slow-steeped 12-hour cold brew over ice', price: 120, offerPrice: null, image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300&h=200&fit=crop', isVeg: true, prepTime: '5 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
    ],
    'Tea': [
      {
        id: 617, name: 'Masala Chai', description: 'Premium Darjeeling tea with ginger and cardamom', price: 40, offerPrice: null, image: 'https://images.unsplash.com/photo-1547825407-2d060104b7f8?w=300&h=200&fit=crop', isVeg: true, prepTime: '5 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
    ],
    'Cold Drinks': [
      {
        id: 618, name: 'Strawberry Milkshake', description: 'Thick creamy milkshake with fresh strawberries', price: 120, offerPrice: null, image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=300&h=200&fit=crop', isVeg: true, prepTime: '8 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
      {
        id: 619, name: 'Mango Smoothie', description: 'Blended mango with yogurt and honey', price: 110, offerPrice: null, image: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=300&h=200&fit=crop', isVeg: true, prepTime: '5 min', isAvailable: true, isBestSeller: false, customizable: false,
      },
    ],
  },
};

export const getMenuByRestaurant = (restaurantId) => menuData[restaurantId] || {};
export const getAllItemsFlat = (restaurantId) => {
  const menu = menuData[restaurantId] || {};
  return Object.values(menu).flat();
};
export const getItemById = (restaurantId, itemId) => {
  const items = getAllItemsFlat(restaurantId);
  return items.find(item => item.id === itemId);
};
