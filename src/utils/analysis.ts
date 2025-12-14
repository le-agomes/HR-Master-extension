import { AnalysisResult, BiasCategory, Suggestion } from '../types';

// Bias word categories with suggested replacements
const BIAS_CATEGORIES = {
  broCulture: {
    category: 'Bro Culture',
    words: ['ninja', 'rockstar', 'guru', 'hacker', 'wizard', 'superhero', 'rock star', 'crushing it', 'kill it', 'dominate', 'work hard play hard', 'hustle'],
    replacements: ['expert', 'top performer', 'subject matter expert', 'security expert', 'expert', 'exceptional performer', 'top performer', 'excel at', 'succeed at', 'lead', 'balance work and life', 'work diligently'],
    severity: 'high' as const
  },
  gender: {
    category: 'Gender Bias',
    words: ['he', 'him', 'his', 'manpower', 'chairman', 'salesman', 'policeman', 'fireman', 'aggressive', 'assertive', 'dominant'],
    replacements: ['they', 'them', 'their', 'workforce', 'chairperson', 'salesperson', 'police officer', 'firefighter', 'ambitious', 'confident', 'leading'],
    severity: 'high' as const
  },
  age: {
    category: 'Age Bias',
    words: ['young', 'energetic', 'digital native', 'recent graduate', 'mature', 'experienced professional'],
    replacements: ['enthusiastic', 'motivated', 'tech-savvy', 'early-career professional', 'seasoned', 'professional with X years experience'],
    severity: 'medium' as const
  },
  ability: {
    category: 'Ability Bias',
    words: ['must stand', 'must lift', 'physically demanding', 'able-bodied', 'seeing', 'hearing'],
    replacements: ['may require standing', 'may require lifting', 'may require physical activity', 'physically capable', 'visual abilities', 'auditory abilities'],
    severity: 'medium' as const
  },
  cultural: {
    category: 'Cultural Bias',
    words: ['native english', 'native speaker', 'cultural fit', 'english only', 'american only'],
    replacements: ['fluent in english', 'proficient english speaker', 'values alignment', 'english proficiency required', 'eligible to work in the US'],
    severity: 'high' as const
  }
};

// Jargon indicators (renamed from AI indicators)
const JARGON_INDICATORS = {
  // Corporate buzzwords that obscure meaning
  buzzwords: ['leverage', 'utilize', 'facilitate', 'optimize', 'streamline', 'synergy', 'paradigm', 'robust', 'cutting-edge', 'state-of-the-art', 'best-in-class', 'world-class', 'innovative', 'dynamic', 'proactive', 'strategic', 'collaborative'],
  replacements: ['use', 'use', 'help', 'improve', 'simplify', 'cooperation', 'model', 'reliable', 'modern', 'current', 'high-quality', 'top-rated', 'new', 'active', 'forward-thinking', 'planned', 'team-oriented'],

  // Generic clichés
  genericPhrases: ['fast-paced environment', 'team player', 'self-starter', 'go-getter', 'thinks outside the box', 'hit the ground running', 'wear many hats', 'driven individual', 'results-oriented', 'detail-oriented', 'highly motivated'],
  replacementsGeneric: ['active workplace', 'collaborative', 'independent worker', 'motivated person', 'creative thinker', 'quick to learn', 'handle multiple responsibilities', 'motivated person', 'focused on outcomes', 'attentive to details', 'self-motivated'],
};

// Context checking helper
function checkContext(text: string, word: string, position: number): boolean {
  // Special cases where certain words are acceptable in context
  const contextExceptions: { [key: string]: string[] } = {
    'aggressive': ['goals', 'targets', 'timeline', 'growth'],
    'young': ['company', 'startup', 'team'],
    'energetic': ['environment', 'atmosphere', 'culture']
  };

  if (contextExceptions[word.toLowerCase()]) {
    const afterWord = text.substring(position + word.length, position + word.length + 50).toLowerCase();
    return contextExceptions[word.toLowerCase()].some(exception =>
      afterWord.includes(exception)
    );
  }

  return false;
}

export const analyzeJD = (text: string, ignoredWords: string[] = []): AnalysisResult => {
  const cleanText = text.trim();
  const lowerText = cleanText.toLowerCase();
  const suggestions: Suggestion[] = [];

  // Normalize ignored words to lowercase
  const ignoredWordsLower = ignoredWords.map(w => w.toLowerCase());

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
  let readabilityQuality = 100;
  if (gradeLevelScore < 8) {
    readabilityQuality = 70 + (gradeLevelScore / 8) * 30;
  } else if (gradeLevelScore > 12) {
    const excess = gradeLevelScore - 12;
    readabilityQuality = Math.max(40, 100 - (excess * 8));
  }

  // Add readability suggestions if needed
  if (gradeLevelScore > 12) {
    suggestions.push({
      type: 'readability',
      originalWord: 'Complex sentences',
      replacement: 'Simplify sentence structure',
      reason: `Grade level is ${gradeLevelScore.toFixed(1)} (College+). Consider shorter sentences and simpler words.`
    });
  }

  // ===== 3. BIAS DETECTION WITH CONTEXT & REPLACEMENTS =====
  const detectedCategories: BiasCategory[] = [];
  const allBiasWords: string[] = [];

  Object.values(BIAS_CATEGORIES).forEach(categoryDef => {
    const foundWords: string[] = [];
    const foundReplacements: string[] = [];

    categoryDef.words.forEach((biasWord, index) => {
      // Skip if in ignore list
      if (ignoredWordsLower.includes(biasWord.toLowerCase())) {
        return;
      }

      // Use word boundary regex to avoid false positives
      const pattern = new RegExp(`\\b${biasWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      let match;

      while ((match = pattern.exec(lowerText)) !== null) {
        const position = match.index;

        // Context check - skip if contextually appropriate
        if (checkContext(cleanText, biasWord, position)) {
          continue;
        }

        if (!foundWords.includes(biasWord)) {
          foundWords.push(biasWord);
          foundReplacements.push(categoryDef.replacements[index] || 'neutral alternative');

          if (!allBiasWords.includes(biasWord)) {
            allBiasWords.push(biasWord);
          }

          // Add specific suggestion
          suggestions.push({
            type: 'bias',
            originalWord: biasWord,
            replacement: categoryDef.replacements[index] || 'neutral alternative',
            reason: `"${biasWord}" may be exclusionary (${categoryDef.category})`,
            position: position
          });
        }
      }
    });

    if (foundWords.length > 0) {
      detectedCategories.push({
        category: categoryDef.category,
        words: foundWords,
        replacements: foundReplacements,
        severity: categoryDef.severity
      });
    }
  });

  // Calculate inclusivity score
  const biasCount = allBiasWords.length;
  const biasWordsPerHundred = (biasCount / wordCount) * 100;
  let inclusivityScore = Math.max(0, 100 - (biasWordsPerHundred * 15));

  detectedCategories.forEach(cat => {
    if (cat.severity === 'high') {
      inclusivityScore -= cat.words.length * 3;
    }
  });
  inclusivityScore = Math.max(0, Math.min(100, inclusivityScore));

  // ===== 4. JARGON DETECTION (renamed from AI Detection) =====
  let jargonScore = 0;
  const jargonReasons: string[] = [];

  // 1. Check for corporate buzzwords
  const buzzwordMatches: { word: string, replacement: string }[] = [];
  JARGON_INDICATORS.buzzwords.forEach((word, index) => {
    const pattern = new RegExp(`\\b${word}\\b`, 'i');
    if (pattern.test(lowerText)) {
      buzzwordMatches.push({
        word: word,
        replacement: JARGON_INDICATORS.replacements[index]
      });
    }
  });

  if (buzzwordMatches.length >= 2) {
    const points = Math.min(35, buzzwordMatches.length * 6);
    jargonScore += points;
    jargonReasons.push(`${buzzwordMatches.length} corporate buzzwords`);

    // Add suggestions for each buzzword
    buzzwordMatches.forEach(match => {
      suggestions.push({
        type: 'jargon',
        originalWord: match.word,
        replacement: match.replacement,
        reason: `"${match.word}" is corporate jargon - use "${match.replacement}" for clarity`
      });
    });
  }

  // 2. Check for generic cliché phrases
  const clicheMatches: { phrase: string, replacement: string }[] = [];
  JARGON_INDICATORS.genericPhrases.forEach((phrase, index) => {
    if (lowerText.includes(phrase.toLowerCase())) {
      clicheMatches.push({
        phrase: phrase,
        replacement: JARGON_INDICATORS.replacementsGeneric[index]
      });
    }
  });

  if (clicheMatches.length >= 1) {
    const points = Math.min(30, clicheMatches.length * 10);
    jargonScore += points;
    jargonReasons.push(`${clicheMatches.length} generic clichés`);

    clicheMatches.forEach(match => {
      suggestions.push({
        type: 'jargon',
        originalWord: match.phrase,
        replacement: match.replacement,
        reason: `"${match.phrase}" is a cliché - be more specific: "${match.replacement}"`
      });
    });
  }

  // 3. Check for vague language
  const vagueWords = ['various', 'several', 'multiple', 'numerous', 'many', 'some', 'diverse', 'wide range'];
  const vagueCount = vagueWords.filter(word => lowerText.includes(word)).length;
  if (vagueCount >= 2) {
    jargonScore += 15;
    jargonReasons.push('vague language - use specific numbers');

    suggestions.push({
      type: 'jargon',
      originalWord: 'Vague quantifiers',
      replacement: 'Specific numbers',
      reason: 'Replace words like "several" or "various" with exact numbers (e.g., "3-5 years")'
    });
  }

  // 4. Check for lack of specifics
  const hasNumbers = /\d+/.test(cleanText);
  const numberCount = (cleanText.match(/\d+/g) || []).length;
  if (!hasNumbers || numberCount < 2) {
    jargonScore += 12;
    jargonReasons.push('lacks specific metrics');

    suggestions.push({
      type: 'jargon',
      originalWord: 'Missing metrics',
      replacement: 'Add specific numbers',
      reason: 'Include concrete details: years of experience, team size, salary range, etc.'
    });
  }

  // 5. Check for excessive passive voice
  const passiveIndicators = ['will be responsible', 'is required', 'are expected', 'will be expected', 'is preferred', 'are needed'];
  const passiveCount = passiveIndicators.filter(phrase => lowerText.includes(phrase.toLowerCase())).length;
  if (passiveCount >= 2) {
    jargonScore += 8;
    jargonReasons.push('passive voice overuse');

    suggestions.push({
      type: 'jargon',
      originalWord: 'Passive voice',
      replacement: 'Active voice',
      reason: 'Use active voice: "You will..." instead of "Will be responsible for..."'
    });
  }

  jargonScore = Math.min(100, jargonScore);
  const isJargonHeavy = jargonScore >= 40;

  let jargonReason = jargonScore < 25
    ? 'Clear and specific language'
    : jargonScore < 40
    ? 'Some jargon detected - could be clearer'
    : jargonScore < 60
    ? 'Heavy use of jargon - lacks clarity'
    : jargonScore < 75
    ? 'Excessive jargon - very generic'
    : 'Extremely jargon-heavy - template language';

  if (jargonReasons.length > 0) {
    jargonReason += ': ' + jargonReasons.join(', ');
  }

  // Clarity score (inverse of jargon)
  const clarityScore = 100 - jargonScore;

  // ===== 5. OVERALL QUALITY SCORE =====
  const qualityScore = Math.round(
    (readabilityQuality * 0.3) +
    (inclusivityScore * 0.4) +
    (clarityScore * 0.3)
  );

  // ===== 6. GENERATE CLEANED TEXT =====
  let cleanedText = cleanText;

  // Apply all replacements (bias + jargon)
  suggestions.forEach(suggestion => {
    if (suggestion.type === 'bias' || suggestion.type === 'jargon') {
      // Use word boundary regex for accurate replacement
      const pattern = new RegExp(`\\b${suggestion.originalWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      cleanedText = cleanedText.replace(pattern, suggestion.replacement);
    }
  });

  return {
    // Readability
    readabilityScore: parseFloat(gradeLevelScore.toFixed(1)),
    gradeLevel,
    wordCount,

    // Bias Detection
    biasCount,
    biasWordsFound: allBiasWords,
    biasCategories: detectedCategories,

    // Jargon Detection (renamed from AI Detection)
    jargonScore: Math.round(jargonScore),
    jargonReason,
    isJargonHeavy,

    // Overall Quality
    qualityScore,
    qualityBreakdown: {
      readability: Math.round(readabilityQuality),
      inclusivity: Math.round(inclusivityScore),
      clarity: Math.round(clarityScore)
    },

    // Actionable Suggestions
    suggestions,
    cleanedText: cleanedText !== cleanText ? cleanedText : undefined
  };
};
