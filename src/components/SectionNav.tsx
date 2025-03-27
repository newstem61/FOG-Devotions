import React from 'react';
import { Book } from 'lucide-react';
import { DevotionSection, DEVOTION_SECTIONS } from '../types';

interface SectionNavProps {
  currentSection: DevotionSection | 'all';
  onSectionChange: (section: DevotionSection | 'all') => void;
  devotionCounts: Record<DevotionSection | 'all', number>;
}

const sectionColors: Record<DevotionSection, string> = {
  "Faith for Divine Fulfilled Expectations": "#EF4444",
  "Personal Relationship with God": "#8B5CF6",
  "The Abrahamic Way": "#10B981",
  "Church Building and Service": "#F59E0B",
  "Divine Achievements": "#3B82F6"
};

export const SectionNav: React.FC<SectionNavProps> = ({
  currentSection,
  onSectionChange,
  devotionCounts,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center space-x-2 mb-4">
        <Book className="text-blue-600" size={24} />
        <h2 className="text-xl font-semibold text-gray-800">Devotional Sections</h2>
      </div>
      <div className="space-y-2">
        {/* All Devotions Header */}
        <div className="px-4 py-2 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-700">All Devotions</span>
            <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-sm">
              {devotionCounts.all}
            </span>
          </div>
        </div>

        {/* Individual Sections */}
        {DEVOTION_SECTIONS.map((section) => (
          <button
            key={section}
            onClick={() => onSectionChange(section)}
            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
              currentSection === section
                ? 'bg-blue-100 text-blue-700'
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: sectionColors[section] }}
                />
                <span className="truncate">{section}</span>
              </div>
              <span 
                className="px-2 py-1 rounded-full text-sm text-white flex-shrink-0 ml-2"
                style={{ backgroundColor: sectionColors[section] }}
              >
                {devotionCounts[section]}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};