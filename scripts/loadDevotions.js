import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadDevotionsFromCsv } from '../src/utils/dataLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  if (process.argv.length < 3) {
    console.error('Please provide the path to your CSV file');
    console.error('Usage: node loadDevotions.js <path-to-csv>');
    process.exit(1);
  }

  const csvPath = process.argv[2];
  
  try {
    // Read the CSV file
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    
    // Load devotions
    const devotions = await loadDevotionsFromCsv(csvContent);
    
    // Update the devotions.ts file
    const devotionsPath = path.join(__dirname, '../src/data/devotions.ts');
    const devotionsContent = `import { Devotion } from '../types';

export const devotions: Devotion[] = ${JSON.stringify(devotions, null, 2)};
`;

    await fs.writeFile(devotionsPath, devotionsContent, 'utf-8');
    
    console.log(`✅ Successfully loaded ${devotions.length} devotions`);
    console.log('Devotions have been updated in src/data/devotions.ts');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();