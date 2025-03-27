import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadDevotionsFromCsv } from '../src/utils/dataLoader';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  if (process.argv.length < 3) {
    console.error('Please provide the path to your CSV file');
    console.error('Usage: npm run load-devotions -- <path-to-csv>');
    process.exit(1);
  }

  const csvPath = process.argv[2];
  
  try {
    console.log('Reading CSV file:', csvPath);
    
    // Read the CSV file
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    console.log('CSV file read successfully:', {
      size: csvContent.length,
      lines: csvContent.split('\n').length
    });
    
    // Load devotions
    console.log('Processing devotions...');
    const devotions = await loadDevotionsFromCsv(csvContent);
    
    // Update the devotions.ts file
    const devotionsPath = path.join(__dirname, '../src/data/devotions.ts');
    const devotionsContent = `import { Devotion } from '../types';

export const devotions: Devotion[] = ${JSON.stringify(devotions, null, 2)};
`;

    await fs.writeFile(devotionsPath, devotionsContent, 'utf-8');
    
    console.log('\nDevotions Loading Summary:');
    console.log('---------------------------');
    console.log(`✅ Successfully loaded ${devotions.length} devotions`);
    console.log(`📝 File updated: ${devotionsPath}`);
    console.log('\nDay Range:');
    console.log(`  First Day: ${Math.min(...devotions.map(d => d.day))}`);
    console.log(`  Last Day: ${Math.max(...devotions.map(d => d.day))}`);
    console.log('\nSections:');
    const sectionCounts = devotions.reduce((acc, d) => {
      acc[d.section] = (acc[d.section] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    Object.entries(sectionCounts).forEach(([section, count]) => {
      console.log(`  ${section}: ${count} devotions`);
    });
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();