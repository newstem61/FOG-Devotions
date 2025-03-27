import Papa from 'papaparse';
import { Devotion, DEVOTION_SECTIONS, DevotionSection } from '../types';

export async function loadDevotionsFromCsv(csvContent: string): Promise<Devotion[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvContent, {
      delimiter: ',',
      quoteChar: '"',
      escapeChar: '"',
      skipEmptyLines: true,
      header: false, // Don't treat first row as header
      complete: (results) => {
        console.log('CSV Parse Results:', {
          totalRows: results.data.length,
          firstRow: results.data[0],
          lastRow: results.data[results.data.length - 1]
        });

        const validRows = results.data.filter((row: any[]) => row.length >= 13 && row[0]);
        
        console.log('Data Validation:', {
          totalRows: results.data.length,
          validRows: validRows.length,
          invalidRows: results.data.length - validRows.length
        });

        if (validRows.length !== results.data.length) {
          console.warn('Some rows were invalid:', {
            invalidRows: results.data.filter((row: any[]) => row.length < 13 || !row[0])
          });
        }

        const devotions: Devotion[] = validRows.map((row: any[], index: number) => {
          const rawSection = (row[11] || '').trim();
          const section = DEVOTION_SECTIONS.find(
            s => s.toLowerCase() === rawSection.toLowerCase()
          );
          
          if (!section) {
            console.warn(
              `Invalid section "${rawSection}" for devotion "${row[0]}". Using default section "${DEVOTION_SECTIONS[0]}".`
            );
          }

          const dayNumber = parseInt(row[12], 10);
          const validDay = !isNaN(dayNumber) && dayNumber > 0 && dayNumber <= 200
            ? dayNumber
            : index + 1;

          if (validDay !== dayNumber) {
            console.warn(`Invalid day number ${dayNumber} for devotion "${row[0]}". Using ${validDay} instead.`);
          }

          const devotion = {
            id: index + 1,
            title: row[0]?.trim() || '',
            authorQuote: {
              text: row[1]?.trim() || '',
              author: row[2]?.trim() || ''
            },
            theme: row[3]?.trim() || '',
            description: row[4]?.trim() || '',
            verse: row[5]?.trim() || '',
            parable: {
              title: row[6]?.trim() || '',
              content: row[7]?.trim() || ''
            },
            reflection: (row[8] || '')
              .split('|')
              .map((item: string) => item.trim())
              .filter(Boolean),
            actionSteps: (row[9] || '')
              .split('|')
              .map((item: string) => item.trim())
              .filter(Boolean),
            prayer: row[10]?.trim() || '',
            section: (section || DEVOTION_SECTIONS[0]) as DevotionSection,
            day: validDay
          };

          // Log any empty required fields
          const requiredFields = ['title', 'theme', 'description', 'verse', 'prayer'];
          const emptyFields = requiredFields.filter(field => !devotion[field as keyof typeof devotion]);
          if (emptyFields.length > 0) {
            console.warn(`Devotion ${devotion.id} (Day ${devotion.day}) has empty required fields:`, emptyFields);
          }

          return devotion;
        });

        // Validate unique days
        const dayCount = new Map<number, number>();
        devotions.forEach(d => {
          dayCount.set(d.day, (dayCount.get(d.day) || 0) + 1);
        });

        const duplicateDays = Array.from(dayCount.entries())
          .filter(([_, count]) => count > 1)
          .map(([day]) => day);

        if (duplicateDays.length > 0) {
          console.warn('Found duplicate day numbers:', duplicateDays);
        }

        // Final validation summary
        console.log('Devotions Summary:', {
          totalDevotions: devotions.length,
          dayRange: {
            min: Math.min(...devotions.map(d => d.day)),
            max: Math.max(...devotions.map(d => d.day))
          },
          sections: Array.from(new Set(devotions.map(d => d.section))),
          duplicateDays: duplicateDays
        });

        resolve(devotions);
      },
      error: (error) => {
        console.error('CSV Parsing Error:', error);
        reject(new Error(`Error parsing CSV: ${error}`));
      }
    });
  });
}