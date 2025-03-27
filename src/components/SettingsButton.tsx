import React, { useState, useEffect } from 'react';
import { Settings, Sun, Moon, Type, Volume2 } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

export function SettingsButton() {
  const { 
    fontSize, 
    increaseFontSize, 
    decreaseFontSize, 
    isDarkMode, 
    toggleDarkMode,
    selectedVoice,
    setSelectedVoice,
    speechRate,
    setSpeechRate
  } = useSettings();

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      const englishVoices = voices.filter(voice => 
        voice.lang.startsWith('en') && !voice.name.toLowerCase().includes('zira')
      );
      setAvailableVoices(englishVoices);
    };

    if (speechSynthesis.getVoices().length > 0) {
      loadVoices();
    }
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  return (
    <div className="relative group">
      <button
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        aria-label="Settings"
      >
        <Settings size={20} className="text-gray-600 dark:text-gray-300" />
      </button>
      
      <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 min-w-[250px] invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Text Size
              </span>
              <Type size={16} className="text-gray-500 dark:text-gray-400" />
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={decreaseFontSize}
                disabled={fontSize <= 14}
                className="p-1.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                A-
              </button>
              <div className="flex-1 text-center text-sm text-gray-600 dark:text-gray-400">
                {fontSize}px
              </div>
              <button
                onClick={increaseFontSize}
                disabled={fontSize >= 24}
                className="p-1.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                A+
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Theme
              </span>
              {isDarkMode ? (
                <Moon size={16} className="text-gray-500 dark:text-gray-400" />
              ) : (
                <Sun size={16} className="text-gray-500 dark:text-gray-400" />
              )}
            </div>
            <button
              onClick={toggleDarkMode}
              className="w-full px-3 py-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm text-left"
            >
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Reading Voice
              </span>
              <Volume2 size={16} className="text-gray-500 dark:text-gray-400" />
            </div>
            <select
              value={selectedVoice?.name || ''}
              onChange={(e) => {
                const voice = availableVoices.find(v => v.name === e.target.value);
                setSelectedVoice(voice || null);
              }}
              className="w-full px-3 py-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
            >
              {availableVoices.map(voice => (
                <option key={voice.name} value={voice.name}>
                  {voice.name}
                </option>
              ))}
            </select>
            <div className="mt-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                Reading Speed
              </label>
              <input
                type="range"
                min="0.5"
                max="1"
                step="0.1"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>Slower</span>
                <span>Faster</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}