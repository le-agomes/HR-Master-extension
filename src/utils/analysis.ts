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
  // Corporate buzzwords AI loves
  buzzwords: ['leverage', 'utilize', 'facilitate', 'optimize', 'streamline', 'synergy', 'paradigm', 'robust', 'cutting-edge', 'state-of-the-art', 'best-in-class', 'world-class', 'innovative', 'dynamic', 'proactive', 'strategic', 'collaborative'],

  // Generic clichés
  genericPhrases: ['fast-paced environment', 'team player', 'self-starter', 'go-getter', 'thinks outside the box', 'hit the ground running', 'wear many hats', 'driven individual', 'results-oriented', 'detail-oriented', 'highly motivated'],

  // Excessive formality
  formalWords: ['furthermore', 'moreover', 'notwithstanding', 'aforementioned', 'henceforth', 'whereby', 'herein', 'thereof'],

  // Superlatives AI overuses
  superlatives: ['excellent', 'outstanding', 'exceptional', 'premier', 'leading', 'top-tier', 'world-class', 'best-in-class', 'unparalleled', 'premier'],

  // Vague descriptors
  vagueWords: ['various', 'several', 'multiple', 'numerous', 'many', 'some', 'diverse', 'wide range'],

  // AI filler phrases
  fillerPhrases: ['we are looking for', 'we are seeking', 'the ideal candidate will', 'the successful candidate will', 'you will be responsible for', 'in this role you will'],

  // Passive voice indicators (AI loves passive voice)
  passiveIndicators: ['will be responsible', 'is required', 'are expected', 'will be expected', 'is preferred', 'are needed'],
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
      // Use word boundary regex to avoid false positives (e.g., "he" in "the")
      const pattern = new RegExp(`\\b${biasWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (pattern.test(lowerText)) {
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

  // 1. Check for corporate buzzwords (AI loves these)
  const buzzwordCount = AI_INDICATORS.buzzwords.filter(word =>
    lowerText.includes(word.toLowerCase())
  ).length;
  if (buzzwordCount >= 2) {
    const points = Math.min(30, buzzwordCount * 5);
    aiScore += points;
    aiReasons.push(`${buzzwordCount} corporate buzzwords`);
  }

  // 2. Check for generic cliché phrases
  const genericCount = AI_INDICATORS.genericPhrases.filter(phrase =>
    lowerText.includes(phrase.toLowerCase())
  ).length;
  if (genericCount >= 1) {
    const points = Math.min(25, genericCount * 8);
    aiScore += points;
    aiReasons.push(`${genericCount} generic clichés`);
  }

  // 3. Check for superlatives overuse
  const superlativeCount = AI_INDICATORS.superlatives.filter(word =>
    new RegExp(`\\b${word}\\b`, 'i').test(lowerText)
  ).length;
  if (superlativeCount >= 2) {
    aiScore += 15;
    aiReasons.push(`${superlativeCount} superlatives`);
  }

  // 4. Check for vague language (AI lacks specifics)
  const vagueCount = AI_INDICATORS.vagueWords.filter(word =>
    lowerText.includes(word)
  ).length;
  if (vagueCount >= 2) {
    aiScore += 10;
    aiReasons.push('vague descriptions');
  }

  // 5. Check for AI filler phrases
  const fillerCount = AI_INDICATORS.fillerPhrases.filter(phrase =>
    lowerText.includes(phrase.toLowerCase())
  ).length;
  if (fillerCount >= 2) {
    aiScore += 15;
    aiReasons.push('repetitive filler phrases');
  }

  // 6. Check for passive voice overuse
  const passiveCount = AI_INDICATORS.passiveIndicators.filter(phrase =>
    lowerText.includes(phrase.toLowerCase())
  ).length;
  if (passiveCount >= 2) {
    aiScore += 10;
    aiReasons.push('excessive passive voice');
  }

  // 7. Check for excessive formality
  const formalCount = AI_INDICATORS.formalWords.filter(word =>
    lowerText.includes(word.toLowerCase())
  ).length;
  if (formalCount >= 1) {
    aiScore += 10;
    aiReasons.push('overly formal language');
  }

  // 8. Check for repetitive sentence structure
  const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).length);
  if (sentenceLengths.length > 3) {
    const avgSentenceLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
    const variance = sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgSentenceLength, 2), 0) / sentenceLengths.length;
    if (variance < 15) {
      aiScore += 12;
      aiReasons.push('uniform sentence structure');
    }
  }

  // 9. Check for lack of numbers/specifics (humans include metrics)
  const hasNumbers = /\d+/.test(cleanText);
  const numberCount = (cleanText.match(/\d+/g) || []).length;
  if (!hasNumbers || numberCount < 2) {
    aiScore += 8;
    aiReasons.push('lacks specific metrics');
  }

  // 10. Check for perfect grammar (no contractions = too formal)
  const hasContractions = /\b(don't|won't|can't|we'll|you'll|it's|we're|you're|they're|i'm)\b/i.test(lowerText);
  if (!hasContractions && wordCount > 100) {
    aiScore += 8;
    aiReasons.push('no casual language');
  }

  // 11. Check for bullet point overuse (AI loves lists)
  const bulletPoints = (cleanText.match(/^[\s]*[-•*]\s/gm) || []).length;
  if (bulletPoints > 10) {
    aiScore += 5;
    aiReasons.push('excessive bullet points');
  }

  // 12. Check for lack of company-specific details
  const hasCompanyName = /\b(we|our company|our team)\b/i.test(lowerText);
  const hasLocation = /\b(office|location|remote|hybrid|onsite|city|state)\b/i.test(lowerText);
  if (!hasCompanyName && !hasLocation && wordCount > 150) {
    aiScore += 5;
    aiReasons.push('generic company description');
  }

  aiScore = Math.min(100, aiScore);
  const isLikelyAI = aiScore >= 45; // Lowered threshold from 50

  let aiDetectionReason = aiScore < 25
    ? 'Appears authentically human-written'
    : aiScore < 45
    ? 'Some AI patterns detected, likely human-edited'
    : aiScore < 65
    ? 'Likely AI-generated with generic corporate language'
    : aiScore < 80
    ? 'Very likely AI-generated - lacks authenticity'
    : 'Almost certainly AI-generated - pure corporate template';

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