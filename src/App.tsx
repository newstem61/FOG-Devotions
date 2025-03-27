import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Book, Search, Calendar, AlertTriangle, LogIn, Menu, X } from 'lucide-react';
import { format, parseISO, addDays, isValid, startOfDay, isSameDay } from 'date-fns';
import { devotions as initialDevotions } from './data/devotions';
import { DevotionCard } from './components/DevotionCard';
import { SectionNav } from './components/SectionNav';
import { DevotionCalendar } from './components/DevotionCalendar';
import { Devotion, DevotionSection } from './types';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { useAuth } from './hooks/useAuth';
import { useDevotions } from './hooks/useDevotions';
import { getUserProgress, resetUserProgress, clearUserData } from './lib/progress';
import { SettingsProvider } from './contexts/SettingsContext';
import { SettingsButton } from './components/SettingsButton';
import 'react-day-picker/dist/style.css';

const sectionColors: Record<DevotionSection, string> = {
  "Faith for Divine Fulfilled Expectations": "#EF4444",
  "Personal Relationship with God": "#8B5CF6",
  "The Abrahamic Way": "#10B981",
  "Church Building and Service": "#F59E0B",
  "Divine Achievements": "#3B82F6"
};

function App() {
  const { session, userProgress, setUserProgress } = useAuth();
  const { 
    completedDevotions, 
    toggleDevotion, 
    resetDevotions, 
    isSyncing 
  } = useDevotions(session, userProgress);

  const [searchTerm, setSearchTerm] = useState('');
  const [devotions] = useState<Devotion[]>(initialDevotions);
  const [currentSection, setCurrentSection] = useState<DevotionSection | 'all'>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [isSearching, setIsSearching] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  useEffect(() => {
    if (currentSection !== 'all') {
      setViewMode('list');
    }
  }, [currentSection]);

  const devotionDates = useMemo(() => {
    const startDate = userProgress?.start_date 
      ? startOfDay(parseISO(userProgress.start_date))
      : startOfDay(new Date());

    const dates = new Map<number, Date>();
    const sortedDevotions = [...devotions].sort((a, b) => a.day - b.day);
    
    sortedDevotions.forEach(devotion => {
      const date = addDays(startDate, devotion.day - 1);
      dates.set(devotion.id, date);
    });

    return dates;
  }, [devotions, userProgress?.start_date]);

  useEffect(() => {
    if (userProgress?.start_date) {
      const startDate = startOfDay(parseISO(userProgress.start_date));
      setSelectedDate(startDate);
    } else {
      const today = startOfDay(new Date());
      setSelectedDate(today);
    }
  }, [userProgress?.start_date]);

  const devotionSections = useMemo(() => {
    return new Map(devotions.map(devotion => [devotion.id, devotion.section]));
  }, [devotions]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setIsSearching(value.length > 0);
    setShowSidebar(false);
    if (value.length > 0) {
      setViewMode('list');
    }
  };

  const handleSectionChange = (section: DevotionSection | 'all') => {
    setCurrentSection(section);
    setSearchTerm('');
    setIsSearching(false);
    setShowSidebar(false);
    setViewMode(section === 'all' ? 'calendar' : 'list');
  };

  const handleDateSelect = (date: Date) => {
    if (!date || !isValid(date)) return;
    const normalizedDate = startOfDay(date);
    setSelectedDate(normalizedDate);
    setIsSearching(false);
    setSearchTerm('');
    setShowSidebar(false);
    setViewMode('calendar');
    setCurrentSection('all');
  };

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const handleSignOut = async () => {
    try {
      setIsResetting(true);
      await clearUserData();
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Failed to sign out. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const confirmReset = async () => {
    if (!session?.user) return;

    try {
      setIsResetting(true);
      const progress = await resetUserProgress(session.user.id);
      
      if (progress) {
        await resetDevotions();
        setUserProgress(progress);
        const newDate = startOfDay(parseISO(progress.start_date));
        setSelectedDate(newDate);
        setSearchTerm('');
        setIsSearching(false);
        setCurrentSection('all');
        setShowResetConfirm(false);
        setResetKey(prev => prev + 1);
        setViewMode('calendar');
      } else {
        throw new Error('Failed to reset progress');
      }
    } catch (error) {
      console.error('Error during reset:', error);
      alert('Failed to reset. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const searchResults = useMemo(() => {
    if (!searchTerm) return [];
    
    const searchLower = searchTerm.toLowerCase();
    return devotions.filter(devotion => 
      devotion.title.toLowerCase().includes(searchLower) ||
      devotion.description.toLowerCase().includes(searchLower) ||
      devotion.theme.toLowerCase().includes(searchLower) ||
      devotion.verse.toLowerCase().includes(searchLower) ||
      devotion.prayer.toLowerCase().includes(searchLower) ||
      devotion.parable.title.toLowerCase().includes(searchLower) ||
      devotion.parable.content.toLowerCase().includes(searchLower) ||
      devotion.reflection.some(item => item.toLowerCase().includes(searchLower)) ||
      devotion.actionSteps.some(step => step.toLowerCase().includes(searchLower))
    );
  }, [devotions, searchTerm]);

  const filteredDevotions = useMemo(() => {
    if (isSearching) {
      return searchResults;
    }

    let filtered = devotions;

    if (currentSection !== 'all') {
      filtered = filtered.filter(devotion => devotion.section === currentSection);
      filtered.sort((a, b) => a.day - b.day);
      return filtered;
    }

    if (viewMode === 'calendar' && selectedDate && isValid(selectedDate)) {
      const normalizedSelectedDate = startOfDay(selectedDate);
      filtered = filtered.filter(devotion => {
        const devotionDate = devotionDates.get(devotion.id);
        if (!devotionDate) return false;
        return isSameDay(devotionDate, normalizedSelectedDate);
      });
    }

    return filtered;
  }, [devotions, currentSection, selectedDate, isSearching, searchResults, devotionDates, viewMode]);

  const devotionCounts = useMemo(() => {
    const counts = devotions.reduce((acc, devotion) => {
      acc[devotion.section] = (acc[devotion.section] || 0) + 1;
      return acc;
    }, {} as Record<DevotionSection | 'all', number>);
    counts.all = devotions.length;
    return counts;
  }, [devotions]);

  const getContentTitle = () => {
    if (isSearching) {
      return `Search Results (${filteredDevotions.length} found)`;
    }
    if (viewMode === 'calendar' && selectedDate && isValid(selectedDate)) {
      return `Devotions for ${format(selectedDate, 'MMMM d, yyyy')}`;
    }
    if (currentSection !== 'all') {
      return `${currentSection} (${filteredDevotions.length} devotions)`;
    }
    return 'All Devotions';
  };

  if (showAuth) {
    return <Auth onClose={() => setShowAuth(false)} />;
  }

  return (
    <SettingsProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <header className="bg-blue-600 dark:bg-blue-800 text-white shadow-lg fixed top-0 left-0 right-0 z-50 transition-colors">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="md:hidden p-2 hover:bg-blue-700 dark:hover:bg-blue-900 rounded-lg"
                >
                  {showSidebar ? <X size={24} /> : <Menu size={24} />}
                </button>
                <div className="flex items-center space-x-2">
                  <Book size={28} className="hidden sm:block" />
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold">Daily Devotions</h1>
                    <p className="text-blue-100 text-xs sm:text-sm hidden sm:block">
                      A Year of Spiritual Growth
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4">
                <SettingsButton />
                {session ? (
                  <>
                    <button
                      onClick={handleReset}
                      disabled={isResetting || isSyncing}
                      className={`px-3 py-1.5 sm:px-4 sm:py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors ${
                        (isResetting || isSyncing) ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {isResetting ? 'Resetting...' : 'Reset'}
                    </button>
                    <button
                      onClick={handleSignOut}
                      disabled={isResetting || isSyncing}
                      className={`px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-700 text-white text-sm rounded-lg hover:bg-blue-800 transition-colors ${
                        (isResetting || isSyncing) ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {isResetting ? 'Signing Out...' : 'Sign Out'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowAuth(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors"
                  >
                    <LogIn size={20} />
                    <span className="hidden sm:inline">Sign In</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {showResetConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full relative">
              <div className="flex items-center space-x-3 text-red-600 mb-4">
                <AlertTriangle size={24} />
                <h3 className="text-xl font-semibold">Reset Confirmation</h3>
              </div>
              <div className="text-gray-600 mb-6">
                <div className="mb-2">This will:</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>Remove all completed devotions</li>
                  <li>Delete all personal notes</li>
                  <li>Reset to today's devotion</li>
                </ul>
                <div className="mt-4">
                  This action cannot be undone. Are you sure you want to continue?
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={isResetting}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReset}
                  disabled={isResetting}
                  className={`px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors ${
                    isResetting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isResetting ? 'Resetting...' : 'Reset Everything'}
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="container mx-auto px-4 py-8 mt-16 md:mt-20">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className={`
              fixed md:relative inset-0 z-40 bg-gray-50 md:bg-transparent
              transform transition-transform duration-300 ease-in-out
              ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
              md:translate-x-0 md:col-span-3 space-y-6 p-4 md:p-0
              overflow-y-auto
            `}>
              <SectionNav
                currentSection={currentSection}
                onSectionChange={handleSectionChange}
                devotionCounts={devotionCounts}
              />
              <DevotionCalendar
                key={resetKey}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                completedDays={completedDevotions}
                devotionDates={devotionDates}
                sectionColors={sectionColors}
                devotionSections={devotionSections}
              />
            </div>

            <div className="md:col-span-9">
              <div className="mb-8">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search all devotions..."
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>
              </div>

              {!isSearching && viewMode === 'calendar' && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">Your Progress</h2>
                    <Calendar size={24} className="text-blue-600" />
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${(completedDevotions.length / devotions.length) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-gray-600 mt-2">
                    {completedDevotions.length} of {devotions.length} devotions completed
                  </p>
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-800">
                  {getContentTitle()}
                </h2>
              </div>

              <div className="space-y-4">
                {filteredDevotions.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
                    {isSearching 
                      ? 'No devotions found matching your search'
                      : 'No devotions found for the selected criteria'
                    }
                  </div>
                ) : (
                  filteredDevotions.map(devotion => (
                    <DevotionCard
                      key={`${devotion.id}-${resetKey}`}
                      devotion={{
                        ...devotion,
                        completed: completedDevotions.includes(devotion.id)
                      }}
                      onComplete={toggleDevotion}
                      isSearchResult={viewMode === 'list' || isSearching}
                      session={session}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </SettingsProvider>
  );
}

export default App;