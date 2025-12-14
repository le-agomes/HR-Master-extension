import { AnalysisResult, BiasCategory } from '../types';

// Bias word categories
const BIAS_CATEGORIES = {
  broCulture: {
    category: 'Bro Culture',
    words: ['ninja', 'rockstar', 'guru', 'hacker', 'wizard', 'superhero', 'rock star', 'crushing it', 'kill it', 'dominate', 'work hard play hard', 'hustle'],
    severity: 'high' as const
  },
  gender: {
    category: 'Gender Bias',
    words: ['he', 'him', 'his', 'manpower', 'chairman', 'salesman', 'policeman', 'fireman', 'aggressive', 'assertive', 'dominant'],
    severity: 'high' as const
  },
  age: {
    category: 'Age Bias',
    words: ['young', 'energetic', 'digital native', 'recent graduate', 'mature', 'experienced professional'],
    severity: 'medium' as const
  },
  ability: {
    category: 'Ability Bias',
    words: ['must stand', 'must lift', 'physically demanding', 'able-bodied', 'seeing', 'hearing'],
    severity: 'medium' as const
  },
  cultural: {
    category: 'Cultural Bias',
    words: ['native english', 'native speaker', 'cultural fit', 'english only', 'american only'],
    severity: 'high' as const
  }
};

// AI-generated text indicators
const AI_INDICATORS = {
  overusedWords: ['leverage', 'utilize', 'facilitate', 'optimize', 'streamline', 'synergy', 'paradigm', 'robust', 'cutting-edge', 'state-of-the-art', 'best-in-class', 'world-class'],
  genericPhrases: ['fast-paced environment', 'team player', 'self-starter', 'go-getter', 'thinks outside the box', 'hit the ground running', 'wear many hats'],
  excessiveFormal: ['furthermore', 'moreover', 'notwithstanding', 'aforementioned', 'henceforth'],
};

export const analyzeJD = (text: string): AnalysisResult => {
  const cleanText = text.trim();
  const lowerText = cleanText.toLowerCase();

  // ===== 1. BASIC STATS =====
  const words = cleanText.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = Math.max(1, sentences.length);

  // ===== 2. READABILITY ANALYSIS =====
  const countSyllables = (word: string) => {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const syllables = word.match(/[aeiouy]{1,2}/g);
    return syllables ? syllables.length : 1;
  };

  const syllableCount = words.reduce((acc, word) => acc + countSyllables(word), 0);
  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSyllablesPerWord = syllableCount / wordCount;

  let gradeLevelScore = (0.39 * avgWordsPerSentence) + (11.8 * avgSyllablesPerWord) - 15.59;
  gradeLevelScore = Math.max(0, gradeLevelScore);

  let gradeLevel = "";
  if (gradeLevelScore < 5) gradeLevel = "Easy (5th Grade)";
  else if (gradeLevelScore < 8) gradeLevel = "Standard (8th Grade)";
  else if (gradeLevelScore < 12) gradeLevel = "Complex (High School)";
  else gradeLevel = "Academic (College)";

  // Calculate readability score (0-100, higher is better)
  // Optimal range is 8-12 grade level
  let readabilityQuality = 100;
  if (gradeLevelScore < 8) {
    readabilityQuality = 70 + (gradeLevelScore / 8) * 30;
  } else if (gradeLevelScore > 12) {
    const excess = gradeLevelScore - 12;
    readabilityQuality = Math.max(40, 100 - (excess * 8));
  }

  // ===== 3. BIAS DETECTION =====
  const detectedCategories: BiasCategory[] = [];
  const allBiasWords: string[] = [];

  Object.values(BIAS_CATEGORIES).forEach(categoryDef => {
    const foundWords: string[] = [];
    categoryDef.words.forEach(biasWord => {
      if (lowerText.includes(biasWord.toLowerCase())) {
        foundWords.push(biasWord);
        if (!allBiasWords.includes(biasWord)) {
          allBiasWords.push(biasWord);
        }
      }
    });

    if (foundWords.length > 0) {
      detectedCategories.push({
        category: categoryDef.category,
        words: foundWords,
        severity: categoryDef.severity
      });
    }
  });

  // Calculate inclusivity score (0-100, higher is better)
  const biasCount = allBiasWords.length;
  const biasWordsPerHundred = (biasCount / wordCount) * 100;
  let inclusivityScore = Math.max(0, 100 - (biasWordsPerHundred * 15));

  // Penalize high-severity bias more
  detectedCategories.forEach(cat => {
    if (cat.severity === 'high') {
      inclusivityScore -= cat.words.length * 3;
    }
  });
  inclusivityScore = Math.max(0, Math.min(100, inclusivityScore));

  // ===== 4. AI DETECTION =====
  let aiScore = 0;
  const aiReasons: string[] = [];

  // Check for overused AI words
  const overusedCount = AI_INDICATORS.overusedWords.filter(word =>
    lowerText.includes(word.toLowerCase())
  ).length;
  if (overusedCount >= 3) {
    aiScore += 25;
    aiReasons.push(`${overusedCount} corporate buzzwords`);
  }

  // Check for generic phrases
  const genericCount = AI_INDICATORS.genericPhrases.filter(phrase =>
    lowerText.includes(phrase.toLowerCase())
  ).length;
  if (genericCount >= 2) {
    aiScore += 20;
    aiReasons.push(`${genericCount} generic phrases`);
  }

  // Check for excessive formality
  const formalCount = AI_INDICATORS.excessiveFormal.filter(word =>
    lowerText.includes(word.toLowerCase())
  ).length;
  if (formalCount >= 2) {
    aiScore += 15;
    aiReasons.push('overly formal language');
  }

  // Check for repetitive sentence structure
  const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).length);
  const avgSentenceLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
  const variance = sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgSentenceLength, 2), 0) / sentenceLengths.length;
  if (variance < 10 && sentenceLengths.length > 3) {
    aiScore += 15;
    aiReasons.push('repetitive sentence structure');
  }

  // Check for lack of specifics (too many vague words)
  const vagueWords = ['various', 'several', 'multiple', 'numerous', 'many', 'some'];
  const vagueCount = vagueWords.filter(word => lowerText.includes(word)).length;
  if (vagueCount >= 3) {
    aiScore += 15;
    aiReasons.push('vague descriptions');
  }

  // Check for perfect grammar (no contractions, very formal)
  const hasContractions = /\b(don't|won't|can't|we'll|you'll|it's|we're|you're)\b/i.test(lowerText);
  if (!hasContractions && wordCount > 100) {
    aiScore += 10;
    aiReasons.push('no casual language');
  }

  aiScore = Math.min(100, aiScore);
  const isLikelyAI = aiScore >= 50;

  let aiDetectionReason = aiScore < 30
    ? 'Appears human-written with personal touch'
    : aiScore < 50
    ? 'Some AI-like patterns detected'
    : aiScore < 70
    ? 'Likely AI-generated with generic language'
    : 'Very likely AI-generated - lacks authenticity';

  if (aiReasons.length > 0) {
    aiDetectionReason += ': ' + aiReasons.join(', ');
  }

  // Authenticity score (inverse of AI score)
  const authenticityScore = 100 - aiScore;

  // ===== 5. OVERALL QUALITY SCORE =====
  const qualityScore = Math.round(
    (readabilityQuality * 0.3) +
    (inclusivityScore * 0.4) +
    (authenticityScore * 0.3)
  );

  return {
    // Readability
    readabilityScore: parseFloat(gradeLevelScore.toFixed(1)),
    gradeLevel,
    wordCount,

    // Bias Detection
    biasCount,
    biasWordsFound: allBiasWords,
    biasCategories: detectedCategories,

    // AI Detection
    aiDetectionScore: Math.round(aiScore),
    aiDetectionReason,
    isLikelyAI,

    // Overall Quality
    qualityScore,
    qualityBreakdown: {
      readability: Math.round(readabilityQuality),
      inclusivity: Math.round(inclusivityScore),
      authenticity: Math.round(authenticityScore)
    }
  };
};