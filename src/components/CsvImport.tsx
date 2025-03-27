import React, { useRef } from 'react';
import { Upload } from 'lucide-react';
import Papa from 'papaparse';
import { Devotion, DevotionSection, DEVOTION_SECTIONS } from '../types';

interface CsvImportProps {
  onImport: (devotions: Devotion[]) => void;
}

export const CsvImport: React.FC<CsvImportProps> = ({ onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      delimiter: ',', // Explicitly set delimiter
      quoteChar: '"', // Use double quotes for field quoting
      escapeChar: '"', // Escape quotes with double quotes
      skipEmptyLines: true, // Skip empty lines
      complete: (results) => {
        const devotions: Devotion[] = results.data
          .slice(1) // Skip header row
          .filter((row: any[]) => row.length >= 13 && row[0]) // Ensure row has required fields
          .map((row: any[], index: number) => {
            // Clean and validate section
            const rawSection = (row[11] || '').trim();
            const section = DEVOTION_SECTIONS.find(
              s => s.toLowerCase() === rawSection.toLowerCase()
            );
            
            if (!section) {
              console.warn(
                `Invalid section "${rawSection}" for devotion "${row[0]}". Using default section "${DEVOTION_SECTIONS[0]}".`
              );
            }

            // Parse day number with fallback
            const dayNumber = parseInt(row[12], 10);
            const validDay = !isNaN(dayNumber) && dayNumber > 0 && dayNumber <= 200
              ? dayNumber
              : index + 1;

            return {
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
              section: section || DEVOTION_SECTIONS[0],
              day: validDay
            };
          });

        onImport(devotions);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        alert('Error parsing CSV file. Please check the file format and try again.');
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Upload size={20} />
          <span>Import Devotions (CSV)</span>
        </button>
      </div>
      <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
        <h3 className="font-semibold mb-2">CSV Format (columns in order):</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>Title</li>
          <li>Quote Text</li>
          <li>Quote Author</li>
          <li>Theme</li>
          <li>Description</li>
          <li>Verse</li>
          <li>Parable Title</li>
          <li>Parable Content</li>
          <li>Reflection (pipe-separated)</li>
          <li>Action Steps (pipe-separated)</li>
          <li>Prayer</li>
          <li>Section (must be exactly one of: {DEVOTION_SECTIONS.join(', ')})</li>
          <li>Day Number (1-200)</li>
        </ol>
        <div className="mt-4 text-xs bg-yellow-50 p-3 rounded border border-yellow-200">
          <p className="font-semibold text-yellow-800">Important CSV formatting tips:</p>
          <ul className="list-disc list-inside mt-1 text-yellow-700 space-y-1">
            <li>Use double quotes (") around fields containing commas or line breaks</li>
            <li>Escape double quotes by doubling them ("")</li>
            <li>Section names must match exactly (case-insensitive)</li>
            <li>Use pipe character (|) to separate items in reflection and action steps</li>
          </ul>
        </div>
      </div>
    </div>
  );
};