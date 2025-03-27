import React from 'react';
import { DayPicker } from 'react-day-picker';
import { format, isValid, parseISO, isSameDay } from 'date-fns';
import { Calendar as CalendarIcon, Check } from 'lucide-react';
import { DevotionSection } from '../types';

interface DevotionCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  completedDays: number[];
  devotionDates: Map<number, Date>;
  sectionColors: Record<DevotionSection, string>;
  devotionSections: Map<number, DevotionSection>;
}

export const DevotionCalendar: React.FC<DevotionCalendarProps> = ({
  selectedDate,
  onDateSelect,
  completedDays,
  devotionDates,
  sectionColors,
  devotionSections,
}) => {
  const modifiersStyles = {
    today: {
      fontWeight: 'bold',
      color: 'var(--rdp-accent-color)'
    },
    selected: {
      backgroundColor: 'var(--rdp-accent-color)',
      color: 'white',
      fontWeight: 'bold'
    },
  };

  const formatDateSafely = (date: Date | string | null | undefined): string | null => {
    if (!date) return null;
    
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return isValid(dateObj) ? format(dateObj, 'yyyy-MM-dd') : null;
  };

  const renderDay = (day: Date) => {
    const dateStr = formatDateSafely(day);
    if (!dateStr) return <div>{day.getDate()}</div>;

    // Find devotion for this date
    const devotionEntry = Array.from(devotionDates.entries()).find(([_, date]) => 
      date && isSameDay(date, day)
    );

    const devotionId = devotionEntry ? devotionEntry[0] : null;
    const section = devotionId ? devotionSections.get(devotionId) : null;
    const isCompleted = devotionId ? completedDays.includes(devotionId) : false;
    const isSelected = selectedDate && isSameDay(day, selectedDate);

    return (
      <button 
        onClick={() => onDateSelect(day)}
        className={`relative w-full h-full flex flex-col items-center justify-center cursor-pointer transition-colors rounded-lg
          ${isSelected ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}
          ${devotionId ? '' : 'opacity-50'}
        `}
        disabled={!devotionId}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="z-10">{day.getDate()}</span>
        </div>
        {isCompleted && (
          <div className="absolute top-0 right-0">
            <Check size={12} className="text-blue-600 dark:text-blue-400" />
          </div>
        )}
        {section && (
          <div
            className="absolute bottom-0 left-0 right-0 h-1 opacity-80"
            style={{ backgroundColor: sectionColors[section] }}
          />
        )}
      </button>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 transition-colors">
      <div className="flex items-center space-x-2 mb-4">
        <CalendarIcon className="text-blue-600 dark:text-blue-400" size={24} />
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Daily Devotions Calendar</h2>
      </div>
      <div className="bg-amber-50 dark:bg-gray-700 rounded-lg p-4 transition-colors">
        <DayPicker
          mode="single"
          selected={isValid(selectedDate) ? selectedDate : undefined}
          onSelect={(date) => date && isValid(date) && onDateSelect(date)}
          modifiersStyles={modifiersStyles}
          components={{
            Day: ({ date }) => renderDay(date)
          }}
          showOutsideDays
          className="!font-sans mx-auto"
          styles={{
            table: { width: '100%' },
            head_cell: { 
              padding: '0.5rem'
            },
            cell: { 
              width: '40px',
              height: '40px',
              padding: '2px'
            },
            day: { 
              margin: '0',
              width: '100%',
              height: '100%',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            },
            caption: { 
              padding: '0.5rem',
              fontWeight: '600'
            }
          }}
        />
      </div>
      <div className="mt-4 space-y-2">
        <h3 className="font-medium text-gray-700 dark:text-gray-300">Legend:</h3>
        <div className="grid grid-cols-1 gap-2">
          <div className="flex items-center space-x-2">
            <Check size={16} className="text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Completed</span>
          </div>
          {Object.entries(sectionColors).map(([section, color]) => (
            <div key={section} className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded opacity-80" style={{ backgroundColor: color }} />
              <span className="text-sm text-gray-600 dark:text-gray-400">{section}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};