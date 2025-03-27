export interface Devotion {
  id: number;
  title: string;
  authorQuote: {
    text: string;
    author: string;
  };
  theme: string;
  description: string;
  verse: string;
  parable: {
    title: string;
    content: string;
  };
  reflection: string[];
  actionSteps: string[];
  prayer: string;
  completed?: boolean;
  section: DevotionSection;
  day: number;
  personalNote?: string;
}

export interface UserProgress {
  id: string;
  user_id: string;
  start_date: string;
  current_devotion: number;
  completed_devotions: number[];
  created_at: string;
  updated_at: string;
}

export type DevotionSection = 
  | "Faith for Divine Fulfilled Expectations"
  | "Personal Relationship with God"
  | "The Abrahamic Way"
  | "Church Building and Service"
  | "Divine Achievements";

export const DEVOTION_SECTIONS: DevotionSection[] = [
  "Faith for Divine Fulfilled Expectations",
  "Personal Relationship with God",
  "The Abrahamic Way",
  "Church Building and Service",
  "Divine Achievements"
];