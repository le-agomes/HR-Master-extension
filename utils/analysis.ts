import { AnalysisResult } from '../types';

export const analyzeJD = (text: string): AnalysisResult => {
  const cleanText = text.trim();
  
  // 1. Basic Stats
  // Split by spaces, filter out empty strings
  const words = cleanText.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  
  // Split by sentence terminators (. ! ?)
  const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = Math.max(1, sentences.length);

  // Syllable Counter (Heuristic)
  const countSyllables = (word: string) => {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const syllables = word.match(/[aeiouy]{1,2}/g);
    return syllables ? syllables.length : 1;
  };

  const syllableCount = words.reduce((acc, word) => acc + countSyllables(word), 0);

  // 2. Flesch-Kincaid Grade Level
  // Formula: 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSyllablesPerWord = syllableCount / wordCount;
  
  let gradeLevelScore = (0.39 * avgWordsPerSentence) + (11.8 * avgSyllablesPerWord) - 15.59;
  
  // Clamp and format
  gradeLevelScore = Math.max(0, gradeLevelScore);
  
  let gradeLevel = "";
  if (gradeLevelScore < 5) gradeLevel = "Easy (5th Grade)";
  else if (gradeLevelScore < 8) gradeLevel = "Standard (8th Grade)";
  else if (gradeLevelScore < 12) gradeLevel = "Complex (High School)";
  else gradeLevel = "Academic (College)";

  // 3. Bias Check
  // Common exclusionary or 'bro-culture' words
  const biasWords = [
    'ninja', 'rockstar', 'guru', 'hacker', 'wizard', 'superhero', 
    'crushing it', 'kill it', 'dominate', 'work hard play hard',
    'aggressive', 'assertive', 'native english'
  ];

  const foundBiasWords: string[] = [];
  const lowerText = cleanText.toLowerCase();

  biasWords.forEach(bias => {
    if (lowerText.includes(bias)) {
      foundBiasWords.push(bias);
    }
  });

  return {
    readabilityScore: parseFloat(gradeLevelScore.toFixed(1)),
    gradeLevel,
    wordCount,
    biasCount: foundBiasWords.length,
    biasWordsFound: foundBiasWords
  };
};