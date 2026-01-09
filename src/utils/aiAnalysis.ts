import { GoogleGenerativeAI } from '@google/generative-ai';
import { AnalysisResult, BiasCategory, Suggestion } from '../types';

export interface AIAnalysisResult extends AnalysisResult {
  seoScore: number;
  seoIssues: string[];
  seoSuggestions: string[];
  missingKeywords: string[];
  titleRecommendations: string[];
}

const ANALYSIS_PROMPT = `You are an expert in job description analysis, focusing on bias detection, clarity, and SEO optimization for job boards (LinkedIn, Indeed, Google Jobs).

Analyze the following job description and return a JSON response with this exact structure:

{
  "biasCategories": [
    {
      "category": "Gender Bias" | "Age Bias" | "Ability Bias" | "Cultural Bias" | "Bro Culture",
      "severity": "high" | "medium" | "low",
      "words": ["word1", "word2"],
      "replacements": ["replacement1", "replacement2"]
    }
  ],
  "jargonScore": 0-100,
  "isJargonHeavy": boolean,
  "jargonReason": "brief explanation",
  "jargonTerms": ["term1", "term2"],
  "suggestions": [
    {
      "type": "bias" | "jargon" | "readability" | "seo",
      "originalWord": "word",
      "replacement": "better word",
      "reason": "why this change matters"
    }
  ],
  "qualityScore": 0-100,
  "qualityBreakdown": {
    "readability": 0-100,
    "inclusivity": 0-100,
    "clarity": 0-100
  },
  "seoScore": 0-100,
  "seoIssues": ["issue1", "issue2"],
  "seoSuggestions": ["suggestion1", "suggestion2"],
  "missingKeywords": ["keyword1", "keyword2"],
  "titleRecommendations": ["better title 1", "better title 2"]
}

Analysis Guidelines:

1. BIAS DETECTION (Critical):
   - Gender: he/she, salesman, chairman, guys, manpower, brotherhood
   - Age: young, energetic, recent graduate, digital native, old-timer
   - Ability: able-bodied terms, physically fit, stamina, vision requirements
   - Cultural: native speaker, cultural fit, work hard/play hard
   - Bro Culture: rockstar, ninja, guru, hustler, dominate, aggressive

2. JARGON & CLARITY (Important):
   - Corporate buzzwords: synergy, leverage, disrupt, game-changer
   - Vague terms: fast-paced, dynamic, world-class
   - Passive voice and complexity
   - Rate jargon 0-100 (higher = more jargon)
   - Flag if jargonScore > 45

3. SEO OPTIMIZATION (Critical for job boards):
   - Job title: Must be standard, searchable (not "Marketing Ninja")
   - Keywords: Check for industry-standard skills, tools, certifications
   - Length: 300-800 words ideal (too short = low rank, too long = abandoned)
   - Missing keywords: Common terms candidates search for
   - Structure: Clear sections (responsibilities, requirements, benefits)
   - Location keywords if applicable
   - Suggest adding: specific technologies, seniority level, industry terms

4. QUALITY SCORING:
   - Overall: Weighted average (30% inclusivity, 35% clarity, 35% readability)
   - Inclusivity: 100 - (bias_count * 10), max penalties
   - Clarity: 100 - jargonScore
   - Readability: Based on complexity (you assess)

5. SUGGESTIONS:
   - Be specific: exact word → replacement
   - Explain WHY each change matters
   - Prioritize high-severity issues
   - Include SEO improvements

Return ONLY valid JSON, no markdown, no explanations outside JSON.`;

export async function analyzeWithAI(
  text: string,
  apiKey: string,
  ignoredWords: string[] = []
): Promise<AIAnalysisResult> {
  if (!apiKey) {
    throw new Error('API key is required. Please add your Gemini API key in Settings.');
  }

  if (!text || text.trim().length < 50) {
    throw new Error('Job description is too short to analyze.');
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Build the full prompt
    const fullPrompt = `${ANALYSIS_PROMPT}

${ignoredWords.length > 0 ? `IGNORE THESE WORDS (company-specific terms): ${ignoredWords.join(', ')}\n` : ''}

JOB DESCRIPTION TO ANALYZE:
${text}`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const responseText = response.text();

    // Parse JSON response
    let aiResult;
    try {
      // Remove markdown code blocks if present
      const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      aiResult = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      throw new Error('AI returned invalid response. Please try again.');
    }

    // Calculate additional metrics
    const wordCount = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const avgWordsPerSentence = Math.round(wordCount / Math.max(sentences, 1));

    // Simple readability estimation
    let gradeLevel = 'College';
    if (avgWordsPerSentence < 15) gradeLevel = 'High School';
    if (avgWordsPerSentence < 12) gradeLevel = 'Middle School';
    if (avgWordsPerSentence > 20) gradeLevel = 'Graduate';

    // Build cleaned text by applying all suggestions
    let cleanedText = text;
    if (aiResult.suggestions && aiResult.suggestions.length > 0) {
      aiResult.suggestions.forEach((suggestion: Suggestion) => {
        const regex = new RegExp(`\\b${suggestion.originalWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        cleanedText = cleanedText.replace(regex, suggestion.replacement);
      });
    }

    // Combine AI results with calculated metrics
    return {
      wordCount,
      readabilityScore: avgWordsPerSentence,
      gradeLevel,
      biasCount: aiResult.biasCategories?.reduce((sum: number, cat: any) => sum + cat.words.length, 0) || 0,
      biasCategories: aiResult.biasCategories || [],
      jargonScore: aiResult.jargonScore || 0,
      isJargonHeavy: aiResult.isJargonHeavy || false,
      jargonReason: aiResult.jargonReason || 'Analysis complete',
      qualityScore: Math.round(aiResult.qualityScore || 70),
      qualityBreakdown: aiResult.qualityBreakdown || {
        readability: 70,
        inclusivity: 70,
        clarity: 70
      },
      suggestions: aiResult.suggestions || [],
      cleanedText,
      seoScore: Math.round(aiResult.seoScore || 50),
      seoIssues: aiResult.seoIssues || [],
      seoSuggestions: aiResult.seoSuggestions || [],
      missingKeywords: aiResult.missingKeywords || [],
      titleRecommendations: aiResult.titleRecommendations || []
    };
  } catch (error: any) {
    // Handle specific API errors
    if (error.message?.includes('API_KEY_INVALID')) {
      throw new Error('Invalid API key. Please check your Gemini API key in Settings.');
    }
    if (error.message?.includes('QUOTA_EXCEEDED')) {
      throw new Error('API quota exceeded. Please check your Gemini usage limits.');
    }
    if (error.message?.includes('RATE_LIMIT')) {
      throw new Error('Rate limit reached. Please wait a moment and try again.');
    }

    console.error('AI Analysis Error:', error);
    throw new Error(`Analysis failed: ${error.message || 'Unknown error'}`);
  }
}

// Helper to validate API key format
export function isValidGeminiApiKey(apiKey: string): boolean {
  // Gemini API keys start with "AIza" and are typically 39 characters
  return apiKey.startsWith('AIza') && apiKey.length >= 30;
}
