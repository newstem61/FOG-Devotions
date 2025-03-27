import React, { createContext, useContext, useState, useEffect } from 'react';

interface SettingsContextType {
  fontSize: number;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  selectedVoice: SpeechSynthesisVoice | null;
  setSelectedVoice: (voice: SpeechSynthesisVoice | null) => void;
  speechRate: number;
  setSpeechRate: (rate: number) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const MIN_FONT_SIZE = 14;
const MAX_FONT_SIZE = 24;
const FONT_SIZE_STEP = 2;

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('fontSize');
    return saved ? parseInt(saved, 10) : 16;
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [speechRate, setSpeechRate] = useState(() => {
    const saved = localStorage.getItem('speechRate');
    return saved ? parseFloat(saved) : 0.8;
  });

  useEffect(() => {
    localStorage.setItem('fontSize', fontSize.toString());
    document.documentElement.style.fontSize = `${fontSize}px`;
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('darkMode', isDarkMode.toString());
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('speechRate', speechRate.toString());
  }, [speechRate]);

  // Initialize voice selection
  useEffect(() => {
    const initVoices = () => {
      const voices = speechSynthesis.getVoices();
      const savedVoiceName = localStorage.getItem('selectedVoice');
      
      if (savedVoiceName) {
        const voice = voices.find(v => v.name === savedVoiceName);
        setSelectedVoice(voice || null);
      } else {
        // Default to first English voice
        const englishVoice = voices.find(voice => 
          voice.lang.startsWith('en') && !voice.name.toLowerCase().includes('zira')
        );
        setSelectedVoice(englishVoice || null);
      }
    };

    // Handle both immediate and async voice loading
    if (speechSynthesis.getVoices().length > 0) {
      initVoices();
    }
    speechSynthesis.onvoiceschanged = initVoices;

    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Save selected voice
  useEffect(() => {
    if (selectedVoice) {
      localStorage.setItem('selectedVoice', selectedVoice.name);
    }
  }, [selectedVoice]);

  const increaseFontSize = () => {
    setFontSize(prev => Math.min(prev + FONT_SIZE_STEP, MAX_FONT_SIZE));
  };

  const decreaseFontSize = () => {
    setFontSize(prev => Math.max(prev - FONT_SIZE_STEP, MIN_FONT_SIZE));
  };

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  return (
    <SettingsContext.Provider value={{
      fontSize,
      increaseFontSize,
      decreaseFontSize,
      isDarkMode,
      toggleDarkMode,
      selectedVoice,
      setSelectedVoice,
      speechRate,
      setSpeechRate
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}