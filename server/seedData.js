// Seed catalogue: realistic Indian grocery products. Prices in INR.
// shape: box | pack | bottle | can | jar | fruit | bag | tub
export const CATEGORIES = [
  { id: 'fruits-vegetables', name: 'Fruits & Vegetables', aisle: 'A1' },
  { id: 'dairy-bread', name: 'Dairy & Bread', aisle: 'F1' },
  { id: 'snacks', name: 'Snacks & Munchies', aisle: 'A2' },
  { id: 'cold-drinks', name: 'Cold Drinks', aisle: 'F2' },
  { id: 'instant-food', name: 'Instant Food', aisle: 'A3' },
  { id: 'personal-care', name: 'Personal Care', aisle: 'A4' },
  { id: 'household', name: 'Household', aisle: 'A5' },
];

const P = (category, name, brand, unit, price, mrp, stock, color, shape, emoji) => ({
  category, name, brand, unit, price, mrp, stock, color, shape, emoji,
});

const raw = [
  // Fruits & Vegetables
  P('fruits-vegetables', 'Banana Robusta', 'Fresh', '6 pcs', 42, 55, 80, '#f2d23c', 'fruit', '🍌'),
  P('fruits-vegetables', 'Onion', 'Fresh', '1 kg', 38, 50, 120, '#b5525c', 'fruit', '🧅'),
  P('fruits-vegetables', 'Tomato Hybrid', 'Fresh', '500 g', 22, 30, 100, '#e53935', 'fruit', '🍅'),
  P('fruits-vegetables', 'Potato', 'Fresh', '1 kg', 32, 42, 120, '#c9a46a', 'fruit', '🥔'),
  P('fruits-vegetables', 'Shimla Apple', 'Fresh', '4 pcs', 129, 160, 50, '#d32f2f', 'fruit', '🍎'),
  P('fruits-vegetables', 'Coriander Bunch', 'Fresh', '100 g', 12, 20, 60, '#43a047', 'fruit', '🌿'),
  P('fruits-vegetables', 'Green Chilli', 'Fresh', '100 g', 9, 15, 70, '#2e7d32', 'fruit', '🌶️'),
  P('fruits-vegetables', 'Lemon', 'Fresh', '4 pcs', 25, 32, 80, '#fdd835', 'fruit', '🍋'),
  P('fruits-vegetables', 'Nagpur Orange', 'Fresh', '1 kg', 89, 120, 40, '#fb8c00', 'fruit', '🍊'),
  // Dairy & Bread
  P('dairy-bread', 'Amul Taaza Milk', 'Amul', '500 ml', 28, 28, 150, '#1e88e5', 'pack', '🥛'),
  P('dairy-bread', 'Amul Gold Milk', 'Amul', '500 ml', 34, 34, 120, '#f9a825', 'pack', '🥛'),
  P('dairy-bread', 'Amul Butter', 'Amul', '100 g', 58, 60, 90, '#fbc02d', 'box', '🧈'),
  P('dairy-bread', 'Mother Dairy Dahi', 'Mother Dairy', '400 g', 35, 40, 80, '#e3f2fd', 'tub', '🥣'),
  P('dairy-bread', 'Amul Masti Buttermilk', 'Amul', '500 ml', 18, 20, 100, '#81d4fa', 'pack', '🥛'),
  P('dairy-bread', 'Britannia Milk Bread', 'Britannia', '400 g', 45, 50, 60, '#d84315', 'bag', '🍞'),
  P('dairy-bread', 'Harvest Gold Brown Bread', 'Harvest Gold', '450 g', 55, 60, 50, '#8d6e63', 'bag', '🍞'),
  P('dairy-bread', 'Amul Malai Paneer', 'Amul', '200 g', 90, 99, 45, '#fafafa', 'box', '🧀'),
  P('dairy-bread', 'Farm Fresh Eggs', 'Eggoz', '6 pcs', 54, 60, 70, '#ffe0b2', 'box', '🥚'),
  P('dairy-bread', 'Amul Cheese Slices', 'Amul', '200 g', 135, 150, 40, '#ffca28', 'box', '🧀'),
  // Snacks & Munchies
  P('snacks', "Lay's Classic Salted", "Lay's", '52 g', 20, 20, 200, '#fdd835', 'bag', '🥔'),
  P('snacks', "Lay's Magic Masala", "Lay's", '52 g', 20, 20, 200, '#1565c0', 'bag', '🥔'),
  P('snacks', 'Kurkure Masala Munch', 'Kurkure', '90 g', 20, 20, 180, '#ef6c00', 'bag', '🌶️'),
  P('snacks', "Haldiram's Aloo Bhujia", "Haldiram's", '200 g', 55, 60, 120, '#c62828', 'bag', '🥨'),
  P('snacks', "Haldiram's Moong Dal", "Haldiram's", '200 g', 52, 58, 100, '#f9a825', 'bag', '🥜'),
  P('snacks', 'Bingo Mad Angles', 'Bingo', '72 g', 20, 20, 140, '#6a1b9a', 'bag', '🔺'),
  P('snacks', 'Parle-G Gold Biscuits', 'Parle', '200 g', 25, 30, 160, '#ffd54f', 'box', '🍪'),
  P('snacks', 'Britannia Good Day Cashew', 'Britannia', '200 g', 40, 45, 120, '#ff8f00', 'box', '🍪'),
  P('snacks', 'Dark Fantasy Choco Fills', 'Sunfeast', '75 g', 40, 40, 110, '#4e342e', 'box', '🍫'),
  P('snacks', 'Cadbury Dairy Milk Silk', 'Cadbury', '60 g', 80, 85, 90, '#5e35b1', 'box', '🍫'),
  // Cold Drinks
  P('cold-drinks', 'Coca-Cola', 'Coca-Cola', '750 ml', 40, 40, 140, '#d50000', 'bottle', '🥤'),
  P('cold-drinks', 'Thums Up', 'Thums Up', '750 ml', 40, 40, 140, '#263238', 'bottle', '🥤'),
  P('cold-drinks', 'Sprite', 'Sprite', '750 ml', 40, 40, 120, '#2e7d32', 'bottle', '🥤'),
  P('cold-drinks', 'Maaza Mango Drink', 'Maaza', '600 ml', 35, 38, 110, '#ffa000', 'bottle', '🥭'),
  P('cold-drinks', 'Real Mixed Fruit Juice', 'Real', '1 L', 110, 125, 60, '#ff7043', 'pack', '🧃'),
  P('cold-drinks', 'Red Bull Energy Drink', 'Red Bull', '250 ml', 125, 125, 80, '#1a237e', 'can', '⚡'),
  P('cold-drinks', 'Bisleri Water', 'Bisleri', '1 L', 20, 20, 200, '#4fc3f7', 'bottle', '💧'),
  P('cold-drinks', 'Paper Boat Aam Panna', 'Paper Boat', '250 ml', 30, 35, 90, '#9ccc65', 'pack', '🥭'),
  P('cold-drinks', 'Pepsi Can', 'Pepsi', '300 ml', 40, 40, 100, '#0d47a1', 'can', '🥤'),
  // Instant Food
  P('instant-food', 'Maggi 2-Minute Noodles', 'Maggi', '280 g (4 pack)', 56, 60, 200, '#fbc02d', 'box', '🍜'),
  P('instant-food', 'Yippee Magic Masala', 'Sunfeast', '240 g', 48, 52, 120, '#e65100', 'box', '🍜'),
  P('instant-food', 'Aashirvaad Atta', 'Aashirvaad', '5 kg', 249, 299, 60, '#f57f17', 'bag', '🌾'),
  P('instant-food', 'Tata Salt', 'Tata', '1 kg', 28, 30, 150, '#1565c0', 'pack', '🧂'),
  P('instant-food', 'Fortune Sunflower Oil', 'Fortune', '1 L', 165, 185, 70, '#fdd835', 'bottle', '🫙'),
  P('instant-food', 'India Gate Basmati Rice', 'India Gate', '1 kg', 145, 175, 60, '#c62828', 'bag', '🍚'),
  P('instant-food', 'MTR Poha', 'MTR', '180 g', 55, 60, 70, '#ef5350', 'box', '🥣'),
  P('instant-food', 'Kissan Tomato Ketchup', 'Kissan', '850 g', 125, 140, 80, '#d32f2f', 'bottle', '🍅'),
  P('instant-food', 'Tata Tea Gold', 'Tata Tea', '250 g', 155, 170, 70, '#bf360c', 'box', '🍵'),
  P('instant-food', 'Nescafe Classic Coffee', 'Nescafe', '50 g', 175, 190, 60, '#3e2723', 'jar', '☕'),
  // Personal Care
  P('personal-care', 'Dettol Original Soap', 'Dettol', '4 x 75 g', 165, 190, 80, '#2e7d32', 'box', '🧼'),
  P('personal-care', 'Colgate Strong Teeth', 'Colgate', '200 g', 105, 118, 90, '#d32f2f', 'box', '🪥'),
  P('personal-care', 'Clinic Plus Shampoo', 'Clinic Plus', '340 ml', 185, 210, 50, '#ec407a', 'bottle', '🧴'),
  P('personal-care', 'Dove Body Wash', 'Dove', '250 ml', 240, 275, 40, '#90caf9', 'bottle', '🧴'),
  P('personal-care', 'Nivea Soft Cream', 'Nivea', '100 ml', 185, 199, 45, '#1a237e', 'jar', '🫙'),
  P('personal-care', 'Parachute Coconut Oil', 'Parachute', '300 ml', 135, 150, 60, '#1e88e5', 'bottle', '🥥'),
  P('personal-care', 'Gillette Guard Razor', 'Gillette', '1 pc', 59, 65, 50, '#455a64', 'pack', '🪒'),
  P('personal-care', 'Himalaya Neem Face Wash', 'Himalaya', '150 ml', 175, 199, 55, '#558b2f', 'bottle', '🧴'),
  // Household
  P('household', 'Surf Excel Easy Wash', 'Surf Excel', '1 kg', 135, 150, 70, '#1565c0', 'bag', '🧺'),
  P('household', 'Vim Dishwash Bar', 'Vim', '3 x 200 g', 60, 66, 90, '#7cb342', 'box', '🍽️'),
  P('household', 'Harpic Toilet Cleaner', 'Harpic', '500 ml', 99, 110, 60, '#1e88e5', 'bottle', '🚽'),
  P('household', 'Lizol Floor Cleaner', 'Lizol', '975 ml', 199, 225, 50, '#8e24aa', 'bottle', '🧽'),
  P('household', 'Good Knight Gold Flash', 'Good Knight', '1 refill', 85, 95, 60, '#43a047', 'box', '🦟'),
  P('household', 'Origami Kitchen Towel', 'Origami', '2 rolls', 120, 140, 40, '#eeeeee', 'pack', '🧻'),
  P('household', 'Exo Dish Scrub', 'Exo', '3 pcs', 45, 50, 3, '#00897b', 'pack', '🧽'),
  P('household', 'Odonil Air Freshener', 'Odonil', '50 g', 55, 60, 4, '#f06292', 'box', '🌸'),
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export function buildSeedProducts() {
  const counters = {};
  return raw.map((p) => {
    const cat = CATEGORIES.find((c) => c.id === p.category);
    counters[p.category] = (counters[p.category] || 0) + 1;
    const idx = counters[p.category] - 1;
    return {
      ...p,
      slug: slug(`${p.brand}-${p.name}-${p.unit}`),
      aisle: cat.aisle,
      shelf: idx % 3, // shelf level 0..2
      slot: idx, // position along the fixture
      active: true,
    };
  });
}
