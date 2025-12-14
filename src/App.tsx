import React, { useState, useEffect } from 'react';
import { analyzeJD } from './utils/analysis';
import { AnalysisResult } from './types';
import { Loader2, Zap, AlertTriangle, FileText, CheckCircle2, RotateCcw } from 'lucide-react';

const App: React.FC = () => {
  const [initializing, setInitializing] = useState(true);
  const [text, setText] = useState<string>("");
  const [textSource, setTextSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

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

  const handleAnalyze = () => {
    if (!text.trim()) {
      setError("Please enter some text to analyze.");
      return;
    }

    setError(null);
    setAnalyzing(true);

    // Small delay for UX - makes it feel more substantial
    setTimeout(() => {
      const analysis = analyzeJD(text);
      setResult(analysis);
      setAnalyzing(false);
    }, 300);
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
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
        </div>
        {result && (
           <button onClick={handleReset} className="text-xs font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md transition-colors">
             <RotateCcw className="w-3 h-3" /> Reset
           </button>
        )}
      </header>

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
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Grade Level Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 text-center">
               <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Readability</h3>
               <div className="text-4xl font-black text-slate-800 mb-1">{result.readabilityScore}</div>
               <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                 result.readabilityScore > 12 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
               }`}>
                 {result.gradeLevel}
               </div>
               <p className="mt-4 text-xs text-slate-500">
                 Word Count: <span className="font-medium text-slate-700">{result.wordCount}</span>
               </p>
            </div>

            {/* Bias Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Bias Check</h3>
                 {result.biasCount === 0 ? (
                   <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                 ) : (
                   <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                     {result.biasCount} Found
                   </span>
                 )}
               </div>

               {result.biasCount === 0 ? (
                 <p className="text-sm text-slate-600">No common biased words found. Great job!</p>
               ) : (
                 <div className="space-y-3">
                   <p className="text-sm text-slate-600">Potential exclusionary words found:</p>
                   <div className="flex flex-wrap gap-2">
                     {result.biasWordsFound.map((word, i) => (
                       <span key={i} className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-100 rounded-md text-sm font-medium">
                         {word}
                       </span>
                     ))}
                   </div>
                   <p className="text-xs text-slate-400 mt-2">
                     Consider replacing these with more inclusive language.
                   </p>
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
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Zap className="w-5 h-5" />
            )}
            {analyzing ? 'Analyzing...' : 'Analyze Description'}
          </button>
        </footer>
      )}
    </div>
  );
};

export default App;