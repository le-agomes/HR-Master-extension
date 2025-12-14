// Adding a minimal declaration for the chrome API to avoid TS errors
// In a real project, you would install @types/chrome
declare global {
  const chrome: any;
}

export interface BiasCategory {
  category: string;
  words: string[];
  severity: 'low' | 'medium' | 'high';
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

  // AI Detection
  aiDetectionScore: number; // 0-100, higher = more likely AI
  aiDetectionReason: string;
  isLikelyAI: boolean;

  // Overall Quality
  qualityScore: number; // 0-100, higher = better
  qualityBreakdown: {
    readability: number;
    inclusivity: number;
    authenticity: number;
  };
}
