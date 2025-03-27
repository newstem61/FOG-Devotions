import React, { useState, useEffect } from 'react';
import { Check, BookOpen, ChevronDown, ChevronUp, BookMarked, Heart, Footprints, PenTool, Edit3, Save, RefreshCw, X } from 'lucide-react';
import { Devotion } from '../types';
import { Session } from '@supabase/supabase-js';
import { useNotes } from '../hooks/useNotes';
import { SpeechControls } from './SpeechControls';

interface DevotionCardProps {
  devotion: Devotion & { completed?: boolean };
  onComplete: (id: number) => void;
  isSearchResult?: boolean;
  session: Session | null;
}

export const DevotionCard: React.FC<DevotionCardProps> = ({ 
  devotion, 
  onComplete, 
  isSearchResult = false, 
  session 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [localNote, setLocalNote] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const { 
    note, 
    isLoading, 
    error, 
    isSaving, 
    saveNote, 
    refreshNote 
  } = useNotes(devotion.id, session);

  useEffect(() => {
    setLocalNote(note);
  }, [note]);

  const handleSaveNote = async () => {
    setSaveError(null);
    
    try {
      await saveNote(localNote.trim());
      setIsEditingNote(false);
    } catch (error: any) {
      setSaveError(error.message || 'Failed to save note');
      console.error('Failed to save note:', error);
    }
  };

  const handleCancel = () => {
    setLocalNote(note);
    setIsEditingNote(false);
    setSaveError(null);
  };

  const handleStartEditing = () => {
    setIsEditingNote(true);
    setSaveError(null);
  };

  const devotionText = `
    ${devotion.title}.
    
    Theme: ${devotion.theme}.
    
    Scripture: ${devotion.verse}.
    
    Quote: ${devotion.authorQuote.text}
    By ${devotion.authorQuote.author}.
    
    Description: ${devotion.description}.
    
    Parable: ${devotion.parable.content}.
    
    For Reflection:
    ${devotion.reflection.map((item, index) => `${index + 1}. ${item}`).join('\n')}
    
    Action Steps:
    ${devotion.actionSteps.map((step, index) => `${index + 1}. ${step}`).join('\n')}
    
    Today's Prayer: ${devotion.prayer}
  `.trim();

  if (isSearchResult && !isExpanded) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full text-left p-4"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-800">{devotion.title}</h3>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{devotion.description}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Day {devotion.day}</span>
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">{devotion.section}</span>
              </div>
            </div>
            <ChevronDown size={20} className="text-gray-400 ml-4 flex-shrink-0" />
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-colors">
      <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-200">
              {devotion.title}
            </h2>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Day {devotion.day}</span>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <span className="text-sm text-blue-600 dark:text-blue-400">{devotion.section}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isSearchResult && (
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <ChevronUp size={20} />
              </button>
            )}
            <button
              onClick={() => onComplete(devotion.id)}
              className={`p-2 rounded-full transition-colors ${
                devotion.completed
                  ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Check size={20} />
            </button>
          </div>
        </div>

        <div className="mb-4">
          <SpeechControls text={devotionText} />
        </div>

        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <BookMarked size={18} className="text-blue-600" />
            <h3 className="font-semibold text-blue-800">Scripture</h3>
          </div>
          <blockquote className="italic text-blue-700 border-l-4 border-blue-300 pl-4 py-2">
            {devotion.verse}
          </blockquote>
        </div>
        
        <div className="mb-4 bg-teal-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <BookOpen size={18} className="text-teal-600" />
            <h3 className="font-semibold text-teal-800">Quote</h3>
          </div>
          <p className="text-teal-700 italic mb-2">{devotion.authorQuote.text}</p>
          <p className="text-teal-600 text-sm text-right">— {devotion.authorQuote.author}</p>
        </div>

        <div className="bg-rose-50 p-4 rounded-lg mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <Heart size={18} className="text-rose-600" />
            <h3 className="font-semibold text-rose-800">Theme</h3>
          </div>
          <p className="text-rose-700">{devotion.theme}</p>
        </div>

        <div className="bg-cyan-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <BookOpen size={18} className="text-cyan-600" />
            <h3 className="font-semibold text-cyan-800">Description</h3>
          </div>
          <p className="text-cyan-700">{devotion.description}</p>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="bg-violet-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <BookOpen size={18} className="text-violet-600" />
            <h3 className="font-semibold text-violet-800">Parable</h3>
          </div>
          <p className="text-violet-700">{devotion.parable.content}</p>
        </div>

        <div className="bg-amber-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <PenTool size={18} className="text-amber-600" />
            <h3 className="font-semibold text-amber-800">For Reflection</h3>
          </div>
          <ul className="list-disc list-inside space-y-2">
            {devotion.reflection.map((item, index) => (
              <li key={index} className="text-amber-700">{item}</li>
            ))}
          </ul>
        </div>

        <div className="bg-emerald-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Footprints size={18} className="text-emerald-600" />
            <h3 className="font-semibold text-emerald-800">Action Steps</h3>
          </div>
          <ul className="list-disc list-inside space-y-2">
            {devotion.actionSteps.map((step, index) => (
              <li key={index} className="text-emerald-700">{step}</li>
            ))}
          </ul>
        </div>

        <div className="bg-indigo-50 p-4 rounded-lg">
          <h3 className="font-semibold text-indigo-800 mb-2">Today's Prayer</h3>
          <p className="text-indigo-700 italic">{devotion.prayer}</p>
        </div>

        <div className="bg-fuchsia-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Edit3 size={18} className="text-fuchsia-600" />
              <h3 className="font-semibold text-fuchsia-800">Personal Notes</h3>
            </div>
            {session?.user ? (
              <div className="flex items-center space-x-2">
                {error && (
                  <button
                    onClick={refreshNote}
                    className="flex items-center space-x-1 text-sm text-fuchsia-600 hover:text-fuchsia-700"
                  >
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Retry</span>
                  </button>
                )}
                {isEditingNote ? (
                  <>
                    <button
                      onClick={handleCancel}
                      className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700"
                    >
                      <X size={16} />
                      <span>Cancel</span>
                    </button>
                    <button
                      onClick={handleSaveNote}
                      disabled={isSaving}
                      className={`flex items-center space-x-1 text-sm ${
                        isSaving 
                          ? 'text-fuchsia-400 cursor-not-allowed'
                          : 'text-fuchsia-600 hover:text-fuchsia-700'
                      }`}
                    >
                      <Save size={16} className={isSaving ? 'animate-pulse' : ''} />
                      <span>{isSaving ? 'Saving...' : 'Save'}</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleStartEditing}
                    className="flex items-center space-x-1 text-sm text-fuchsia-600 hover:text-fuchsia-700"
                  >
                    <Edit3 size={16} />
                    <span>Edit</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="text-sm text-fuchsia-600">
                Sign in to add notes
              </div>
            )}
          </div>
          {session?.user ? (
            isLoading ? (
              <div className="bg-white rounded p-3 min-h-[8rem] flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fuchsia-600 mx-auto mb-2"></div>
                  <p className="text-gray-500">Loading notes...</p>
                </div>
              </div>
            ) : error ? (
              <div className="bg-white rounded p-3 min-h-[8rem] flex items-center justify-center">
                <div className="text-center">
                  <p className="text-fuchsia-600 mb-2">{error}</p>
                  <button
                    onClick={refreshNote}
                    className="flex items-center space-x-1 text-sm text-fuchsia-600 hover:text-fuchsia-700 mx-auto"
                  >
                    <RefreshCw size={16} />
                    <span>Retry</span>
                  </button>
                </div>
              </div>
            ) : isEditingNote ? (
              <div className="space-y-2">
                <textarea
                  value={localNote}
                  onChange={(e) => setLocalNote(e.target.value)}
                  placeholder="Add your personal reflections, insights, and prayers..."
                  className="w-full h-32 p-3 rounded border border-fuchsia-200 focus:ring-2 focus:ring-fuchsia-300 focus:border-fuchsia-300 resize-none"
                />
                {saveError && (
                  <p className="text-sm text-fuchsia-600">{saveError}</p>
                )}
              </div>
            ) : (
              <div className="bg-white rounded p-3 min-h-[8rem] text-gray-700 whitespace-pre-wrap">
                {note || (
                  <p className="text-gray-400 italic">
                    Click edit to add your personal reflections, insights, and prayers...
                  </p>
                )}
              </div>
            )
          ) : (
            <div className="bg-white rounded p-3 min-h-[8rem] flex items-center justify-center">
              <p className="text-gray-500">
                Please sign in to add and save your personal notes
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};