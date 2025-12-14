// Adding a minimal declaration for the chrome API to avoid TS errors
// In a real project, you would install @types/chrome
declare global {
  const chrome: any;
}

export interface BiasCategory {
  category: string;
  words: string[];
  replacements: string[]; // Suggested replacements for each biased word
  severity: 'low' | 'medium' | 'high';
}

export interface Suggestion {
  type: 'bias' | 'jargon' | 'readability';
  originalWord: string;
  replacement: string;
  reason: string;
  position?: number; // Optional: position in text where found
}

export interface AnalysisResult {
  // Readability
  readabilityScore: number;
  gradeLevel: string;
  wordCount: number;

  // Bias Detection
  biasCount: number;
  biasWordsFound: string[];
  biasCategories: BiasCategory[];

  // Jargon Detection (renamed from AI Detection)
  jargonScore: number; // 0-100, higher = more jargon
  jargonReason: string;
  isJargonHeavy: boolean;

  // Overall Quality
  qualityScore: number; // 0-100, higher = better
  qualityBreakdown: {
    readability: number;
    inclusivity: number;
    clarity: number; // Renamed from authenticity
  };

  // Actionable Suggestions
  suggestions: Suggestion[];
  cleanedText?: string; // Text with all fixes applied
}

export interface IgnoreList {
  words: string[];
  lastUpdated: number;
}
