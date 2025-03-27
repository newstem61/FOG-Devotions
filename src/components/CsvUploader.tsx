import React, { useRef } from 'react';
import { Upload } from 'lucide-react';
import { loadDevotionsFromCsv } from '../utils/dataLoader';
import { Devotion } from '../types';

interface CsvUploaderProps {
  onDevotionsLoaded: (devotions: Devotion[]) => void;
}

export const CsvUploader: React.FC<CsvUploaderProps> = ({ onDevotionsLoaded }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const devotions = await loadDevotionsFromCsv(text);
      onDevotionsLoaded(devotions);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error loading CSV:', error);
      alert('Error loading CSV file. Please check the format and try again.');
    }
  };

  return (
    <div className="mb-6">
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
      <div className="mt-4 text-sm text-gray-600">
        <p className="font-medium">CSV Format (columns in order):</p>
        <ol className="list-decimal list-inside mt-2 space-y-1">
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
          <li>Section</li>
          <li>Day Number (1-200)</li>
        </ol>
      </div>
    </div>
  );
};