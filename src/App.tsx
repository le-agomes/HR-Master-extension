import React, { useState, useEffect } from 'react';
import { analyzeWithAI } from './utils/aiAnalysis';
import { AnalysisResult, IgnoreList } from './types';
import { Loader2, Zap, AlertTriangle, FileText, CheckCircle2, RotateCcw, Copy, Check, MessageSquare, TrendingUp, Shield, Sparkles, Wand2, Settings, X, Plus, Trash2, Search, Target } from 'lucide-react';

const App: React.FC = () => {
  const [initializing, setInitializing] = useState(true);
  const [text, setText] = useState<string>("");
  const [textSource, setTextSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ignoredWords, setIgnoredWords] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [newIgnoreWord, setNewIgnoreWord] = useState('');
  const [fixing, setFixing] = useState(false);

  // Load ignore list from chrome.storage on mount
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['ignoreList'], (data) => {
        if (data.ignoreList && data.ignoreList.words) {
          setIgnoredWords(data.ignoreList.words);
        }
      });
    }
  }, []);

  // Save ignore list to chrome.storage whenever it changes
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const ignoreList: IgnoreList = {
        words: ignoredWords,
        lastUpdated: Date.now()
      };
      chrome.storage.local.set({ ignoreList });
    }
  }, [ignoredWords]);

  // Inject script and get text on mount
  useEffect(() => {
    const init = async () => {
      try {
        if (typeof chrome === 'undefined' || !chrome.tabs) {
          // Dev fallback
          setText("This is a sample job description seeking a ninja developer who can dominate the codebase.");
          setInitializing(false);
          return;
        }

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.id) throw new Error("No active tab.");

        const foundText = await new Promise<{text: string, source?: string}>((resolve) => {
          const listener = (message: any) => {
            if (message.type === 'JD_TEXT_FOUND') {
              chrome.runtime.onMessage.removeListener(listener);
              resolve({ text: message.text, source: message.source });
            } else if (message.type === 'JD_TEXT_ERROR') {
              chrome.runtime.onMessage.removeListener(listener);
              resolve({ text: "" });
              if (message.error) console.warn(message.error);
            }
          };

          chrome.runtime.onMessage.addListener(listener);

          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['contentScript.js'],
          }).catch((err: any) => {
            chrome.runtime.onMessage.removeListener(listener);
            console.error("Injection failed", err);
            resolve({ text: "" });
          });

          setTimeout(() => resolve({ text: "" }), 1000);
        });

        setText(foundText.text);
        if (foundText.source) {
          setTextSource(foundText.source);
        }
      } catch (err: any) {
        console.error(err);
        setError("Could not connect to page. You can still paste text below.");
      } finally {
        setInitializing(false);
      }
    };

    init();
  }, []);

  const handleAnalyze = async () => {
    if (!text.trim()) {
      setError("Please enter some text to analyze.");
      return;
    }

    setError(null);
    setAnalyzing(true);

    try {
      // Backend handles API key, no need to pass it
      const analysis = await analyzeWithAI(text, '', ignoredWords);
      setResult(analysis);
    } catch (err: any) {
      setError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setCopied(false);
  };

  const handleFixAll = async () => {
    if (!result || !result.cleanedText) return;

    setFixing(true);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) throw new Error("No active tab.");

      // Send REPLACE_TEXT message to content script with both cleanedText and suggestions
      // Suggestions allow preserving formatting by doing smart text node replacement
      chrome.tabs.sendMessage(
        tab.id,
        {
          type: 'REPLACE_TEXT',
          cleanedText: result.cleanedText,
          suggestions: result.suggestions
        },
        (response) => {
          setFixing(false);
          if (response && response.success) {
            const preservedMsg = response.preserved ? ` (${response.preserved} preserved)` : '';
            alert(`✓ Fixed! Method: ${response.method}${preservedMsg}`);
          } else {
            alert(`⚠ Could not replace text: ${response?.error || 'Unknown error'}`);
          }
        }
      );
    } catch (err: any) {
      setFixing(false);
      alert(`❌ Error: ${err.message}`);
    }
  };

  const handleCopyResults = () => {
    if (!result) return;

    const resultText = `
JD SCORER ANALYSIS RESULTS
=========================

OVERALL QUALITY: ${result.qualityScore}/100
${result.qualityScore >= 80 ? '✅ Excellent' : result.qualityScore >= 60 ? '✓ Good' : result.qualityScore >= 40 ? '⚠ Needs Improvement' : '❌ Poor'}

READABILITY
- Grade Level: ${result.gradeLevel}
- Score: ${result.readabilityScore}
- Word Count: ${result.wordCount}
- Quality: ${result.qualityBreakdown.readability}/100

INCLUSIVITY
- Bias Words Found: ${result.biasCount}
- Score: ${result.qualityBreakdown.inclusivity}/100
${result.biasCategories.length > 0 ? '\nBias Categories:' : ''}
${result.biasCategories.map(cat => `  - ${cat.category} (${cat.severity}): ${cat.words.join(', ')}`).join('\n')}

CLARITY & JARGON
- Jargon Score: ${result.jargonScore}/100 ${result.isJargonHeavy ? '⚠ Heavy Jargon' : '✓ Clear'}
- ${result.jargonReason}
- Clarity Score: ${result.qualityBreakdown.clarity}/100

SEO OPTIMIZATION
- SEO Score: ${result.seoScore || 0}/100
${result.seoIssues && result.seoIssues.length > 0 ? `- Issues: ${result.seoIssues.join(', ')}` : ''}
${result.missingKeywords && result.missingKeywords.length > 0 ? `- Missing Keywords: ${result.missingKeywords.join(', ')}` : ''}

SUGGESTIONS (${result.suggestions.length})
${result.suggestions.map((s, i) => `${i + 1}. [${s.type.toUpperCase()}] "${s.originalWord}" → "${s.replacement}"\n   Reason: ${s.reason}`).join('\n')}

Generated by JD Scorer Chrome Extension (AI-Powered)
    `.trim();

    navigator.clipboard.writeText(resultText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleAddIgnoreWord = () => {
    const word = newIgnoreWord.trim().toLowerCase();
    if (word && !ignoredWords.includes(word)) {
      setIgnoredWords([...ignoredWords, word]);
      setNewIgnoreWord('');
    }
  };

  const handleRemoveIgnoreWord = (word: string) => {
    setIgnoredWords(ignoredWords.filter(w => w !== word));
  };

  if (initializing) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
        <p className="text-sm text-slate-500">Connecting to page...</p>
      </div>
    );
  }

  // Main Interface
  return (
    <div className="flex flex-col h-full w-full bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">JD Scorer</h1>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">AI-Powered</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-xs font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md transition-colors"
          >
            <Settings className="w-3 h-3" /> Settings
          </button>
          {result && (
            <button onClick={handleReset} className="text-xs font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md transition-colors">
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          )}
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">Settings</h2>
              <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-4 space-y-6 flex-1 overflow-y-auto">
              {/* Company Dictionary Section */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-800">Company Dictionary</h3>
                <p className="text-xs text-slate-600">
                  Add company-specific terms to ignore (e.g., product names, internal jargon).
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newIgnoreWord}
                    onChange={(e) => setNewIgnoreWord(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddIgnoreWord()}
                    placeholder="Add word to ignore..."
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={handleAddIgnoreWord}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1 text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {ignoredWords.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No ignored words yet</p>
                  ) : (
                    ignoredWords.map((word) => (
                      <div key={word} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg">
                        <span className="text-sm text-slate-700 font-mono">{word}</span>
                        <button
                          onClick={() => handleRemoveIgnoreWord(word)}
                          className="p-1 hover:bg-red-100 rounded text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">

        {!result ? (
          <div className="flex flex-col h-full space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  Job Description Text
                </label>
                {textSource && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                    ✓ {textSource}
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400">{text.length} chars</span>
            </div>

            <textarea
              className="flex-1 w-full p-4 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all resize-none text-sm text-slate-700 leading-relaxed shadow-sm font-mono"
              placeholder="Paste job description here or click a field on the page..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Overall Quality Score - Hero Card */}
            <div className={`rounded-2xl p-6 shadow-lg border-2 text-center ${
              result.qualityScore >= 80 ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200' :
              result.qualityScore >= 60 ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200' :
              result.qualityScore >= 40 ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200' :
              'bg-gradient-to-br from-red-50 to-pink-50 border-red-200'
            }`}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className={`w-5 h-5 ${
                  result.qualityScore >= 80 ? 'text-emerald-600' :
                  result.qualityScore >= 60 ? 'text-blue-600' :
                  result.qualityScore >= 40 ? 'text-amber-600' : 'text-red-600'
                }`} />
                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">Overall Quality</h3>
              </div>
              <div className={`text-6xl font-black mb-2 ${
                result.qualityScore >= 80 ? 'text-emerald-600' :
                result.qualityScore >= 60 ? 'text-blue-600' :
                result.qualityScore >= 40 ? 'text-amber-600' : 'text-red-600'
              }`}>
                {result.qualityScore}
              </div>
              <p className="text-sm font-semibold text-slate-700">
                {result.qualityScore >= 80 ? '✨ Excellent Job Description' :
                 result.qualityScore >= 60 ? '✓ Good Job Description' :
                 result.qualityScore >= 40 ? '⚠ Needs Improvement' : '❌ Major Issues Detected'}
              </p>

              {/* Action Buttons */}
              <div className="mt-4 flex gap-2">
                {result.cleanedText && (
                  <button
                    onClick={handleFixAll}
                    disabled={fixing}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-medium transition-all shadow-sm"
                  >
                    {fixing ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Fixing...</>
                    ) : (
                      <><Wand2 className="w-4 h-4" /> Fix All Issues</>
                    )}
                  </button>
                )}
                <button
                  onClick={handleCopyResults}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/80 hover:bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 transition-all shadow-sm"
                >
                  {copied ? (
                    <><Check className="w-4 h-4 text-emerald-600" /> Copied!</>
                  ) : (
                    <><Copy className="w-4 h-4" /> Copy Results</>
                  )}
                </button>
              </div>
            </div>

            {/* Quality Breakdown */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-lg p-3 border border-slate-200 text-center">
                <div className="text-xs text-slate-500 mb-1">Readability</div>
                <div className="text-xl font-bold text-slate-800">{result.qualityBreakdown.readability}</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-slate-200 text-center">
                <div className="text-xs text-slate-500 mb-1">Inclusivity</div>
                <div className="text-xl font-bold text-slate-800">{result.qualityBreakdown.inclusivity}</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-slate-200 text-center">
                <div className="text-xs text-slate-500 mb-1">Clarity</div>
                <div className="text-xl font-bold text-slate-800">{result.qualityBreakdown.clarity}</div>
              </div>
            </div>

            {/* SEO Score Card */}
            {result.seoScore !== undefined && (
              <div className={`rounded-xl p-4 border-2 ${
                result.seoScore >= 70 ? 'bg-green-50 border-green-200' :
                result.seoScore >= 50 ? 'bg-amber-50 border-amber-200' :
                'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Search className={`w-5 h-5 ${
                    result.seoScore >= 70 ? 'text-green-600' :
                    result.seoScore >= 50 ? 'text-amber-600' :
                    'text-red-600'
                  }`} />
                  <span className={`font-bold ${
                    result.seoScore >= 70 ? 'text-green-900' :
                    result.seoScore >= 50 ? 'text-amber-900' :
                    'text-red-900'
                  }`}>
                    Job Board SEO Score
                  </span>
                  <span className={`ml-auto text-sm font-bold ${
                    result.seoScore >= 70 ? 'text-green-600' :
                    result.seoScore >= 50 ? 'text-amber-600' :
                    'text-red-600'
                  }`}>
                    {result.seoScore}/100
                  </span>
                </div>

                {result.seoIssues && result.seoIssues.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-semibold text-slate-700">Issues:</p>
                    {result.seoIssues.map((issue, i) => (
                      <p key={i} className="text-xs text-slate-600">• {issue}</p>
                    ))}
                  </div>
                )}

                {result.missingKeywords && result.missingKeywords.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-slate-700 mb-1">Missing Keywords:</p>
                    <div className="flex flex-wrap gap-1">
                      {result.missingKeywords.map((keyword, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {result.titleRecommendations && result.titleRecommendations.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-slate-700 mb-1">Better Job Titles:</p>
                    {result.titleRecommendations.slice(0, 2).map((title, i) => (
                      <p key={i} className="text-xs text-slate-600">• {title}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Jargon Detection Card */}
            <div className={`rounded-xl p-4 border-2 ${
              result.isJargonHeavy ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className={`w-5 h-5 ${result.isJargonHeavy ? 'text-amber-600' : 'text-green-600'}`} />
                <span className={`font-bold ${result.isJargonHeavy ? 'text-amber-900' : 'text-green-900'}`}>
                  {result.isJargonHeavy ? 'Heavy Jargon Detected' : 'Clear Language'}
                </span>
                <span className={`ml-auto text-sm font-bold ${result.isJargonHeavy ? 'text-amber-600' : 'text-green-600'}`}>
                  {result.jargonScore}%
                </span>
              </div>
              <p className="text-xs text-slate-600">{result.jargonReason}</p>
            </div>

            {/* Suggestions Card */}
            {result.suggestions.length > 0 && (
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    AI Suggestions
                  </h3>
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">
                    {result.suggestions.length} issues
                  </span>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {result.suggestions.map((suggestion, idx) => (
                    <div key={idx} className="p-2 bg-slate-50 rounded-lg text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          suggestion.type === 'bias' ? 'bg-red-100 text-red-700' :
                          suggestion.type === 'jargon' ? 'bg-amber-100 text-amber-700' :
                          suggestion.type === 'seo' ? 'bg-blue-100 text-blue-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {suggestion.type}
                        </span>
                      </div>
                      <div className="text-slate-700">
                        <span className="font-mono bg-red-100 px-1 py-0.5 rounded line-through">{suggestion.originalWord}</span>
                        {' → '}
                        <span className="font-mono bg-green-100 px-1 py-0.5 rounded">{suggestion.replacement}</span>
                      </div>
                      <div className="text-slate-500 mt-1">{suggestion.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Readability Details */}
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Readability
                </h3>
                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded font-medium">
                  {result.gradeLevel}
                </span>
              </div>
              <div className="text-sm text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Grade Level:</span>
                  <span className="font-semibold">{result.readabilityScore}</span>
                </div>
                <div className="flex justify-between">
                  <span>Word Count:</span>
                  <span className="font-semibold">{result.wordCount}</span>
                </div>
              </div>
            </div>

            {/* Bias Detection Card */}
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  Bias Check
                </h3>
                {result.biasCount === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">
                    {result.biasCount} Found
                  </span>
                )}
              </div>

              {result.biasCount === 0 ? (
                <p className="text-sm text-emerald-600 font-medium">✓ No biased language detected!</p>
              ) : (
                <div className="space-y-3">
                  {result.biasCategories.map((category, idx) => (
                    <div key={idx} className="pb-2 border-b border-slate-100 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-700">{category.category}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          category.severity === 'high' ? 'bg-red-100 text-red-700' :
                          category.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {category.severity}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {category.words.map((word, i) => (
                          <div key={i} className="text-xs">
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded font-mono">{word}</span>
                            <span className="text-slate-400 mx-1">→</span>
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded font-mono">{category.replacements[i]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* Footer / Action */}
      {!result && (
        <footer className="bg-white border-t border-slate-200 p-4 sticky bottom-0 z-10">
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3.5 px-4 rounded-xl transition-all active:scale-[0.98] shadow-md shadow-indigo-200 flex items-center justify-center gap-2"
          >
            {analyzing ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing with AI...</>
            ) : (
              <><Zap className="w-5 h-5" /> Analyze with AI</>
            )}
          </button>
        </footer>
      )}
    </div>
  );
};

export default App;
