// Adding a minimal declaration for the chrome API to avoid TS errors
// In a real project, you would install @types/chrome
declare global {
  const chrome: any;
}

export interface AnalysisResult {
  readabilityScore: number;
  gradeLevel: string;
  wordCount: number;
  biasCount: number;
  biasWordsFound: string[];
}
