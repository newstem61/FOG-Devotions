import React, { useState, useEffect, useCallback } from 'react';
import { Volume2, VolumeX, Pause, Play } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

interface SpeechControlsProps {
  text: string;
  label?: string;
}

export function SpeechControls({ text, label = 'Read Aloud' }: SpeechControlsProps) {
  const { selectedVoice, speechRate } = useSettings();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(null);

  // Create utterance
  useEffect(() => {
    const newUtterance = new SpeechSynthesisUtterance(text);
    newUtterance.rate = speechRate;
    newUtterance.pitch = 0.9; // Slightly lower pitch for a mellower tone
    
    if (selectedVoice) {
      newUtterance.voice = selectedVoice;
    }

    setUtterance(newUtterance);

    return () => {
      speechSynthesis.cancel();
    };
  }, [text, selectedVoice, speechRate]);

  // Handle utterance events
  useEffect(() => {
    if (!utterance) return;

    const handleEnd = () => setIsPlaying(false);
    const handlePause = () => setIsPlaying(false);
    const handleStart = () => setIsPlaying(true);
    const handleResume = () => setIsPlaying(true);

    utterance.addEventListener('end', handleEnd);
    utterance.addEventListener('pause', handlePause);
    utterance.addEventListener('start', handleStart);
    utterance.addEventListener('resume', handleResume);

    return () => {
      utterance.removeEventListener('end', handleEnd);
      utterance.removeEventListener('pause', handlePause);
      utterance.removeEventListener('start', handleStart);
      utterance.removeEventListener('resume', handleResume);
    };
  }, [utterance]);

  const togglePlay = useCallback(() => {
    if (!utterance) return;

    if (isPlaying) {
      speechSynthesis.pause();
    } else {
      if (speechSynthesis.paused) {
        speechSynthesis.resume();
      } else {
        speechSynthesis.cancel(); // Cancel any ongoing speech
        speechSynthesis.speak(utterance);
      }
    }
  }, [isPlaying, utterance]);

  const toggleMute = useCallback(() => {
    if (!utterance) return;

    if (isMuted) {
      utterance.volume = 1;
    } else {
      utterance.volume = 0;
    }
    setIsMuted(!isMuted);
  }, [isMuted, utterance]);

  // Stop speech when component unmounts
  useEffect(() => {
    return () => {
      speechSynthesis.cancel();
    };
  }, []);

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={togglePlay}
        className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
      >
        {isPlaying ? (
          <Pause size={16} />
        ) : (
          <Play size={16} />
        )}
        <span className="text-sm">{label}</span>
      </button>
      <button
        onClick={toggleMute}
        className={`p-1.5 rounded-lg transition-colors ${
          isMuted 
            ? 'bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-800'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
      >
        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>
    </div>
  );
}