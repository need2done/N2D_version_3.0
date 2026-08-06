import fs from 'fs';
import path from 'path';
import { mockProducts } from './frontend/src/data/mockProducts';

const dataPath = path.join(__dirname, 'frontend', 'data');
if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath, { recursive: true });
}

fs.writeFileSync(
  path.join(dataPath, 'products.json'), 
  JSON.stringify(mockProducts, null, 2)
);
console.log('Database initialized at frontend/data/products.json');
