import React, { useState, useEffect } from 'react';
import { analyzeJD } from './utils/analysis';
import { AnalysisResult } from './types';
import { Loader2, Zap, AlertTriangle, FileText, CheckCircle2, RotateCcw, Lock, LogIn, User } from 'lucide-react';

const API_BASE_URL = "https://your-vercel-domain.vercel.app";

const App: React.FC = () => {
  const [initializing, setInitializing] = useState(true);
  const [text, setText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  
  // Auth & Usage States
  const [checkingUsage, setCheckingUsage] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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

        const foundText = await new Promise<string>((resolve) => {
          const listener = (message: any) => {
            if (message.type === 'JD_TEXT_FOUND') {
              chrome.runtime.onMessage.removeListener(listener);
              resolve(message.text);
            } else if (message.type === 'JD_TEXT_ERROR') {
              chrome.runtime.onMessage.removeListener(listener);
              resolve(""); 
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
            resolve("");
          });

          setTimeout(() => resolve(""), 1000);
        });

        setText(foundText);
      } catch (err: any) {
        console.error(err);
        setError("Could not connect to page. You can still paste text below.");
      } finally {
        setInitializing(false);
      }
    };

    init();
  }, []);

  const checkProAccess = async (): Promise<'ALLOW' | 'LIMIT_REACHED' | 'UNAUTHORIZED' | 'ERROR'> => {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      // Dev mode fallback
      return 'ALLOW';
    }

    try {
      const data = await chrome.storage.local.get(['jwt']);
      const token = data.jwt;

      if (!token) return 'UNAUTHORIZED';

      const res = await fetch(`${API_BASE_URL}/api/check-usage`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.status === 401) return 'UNAUTHORIZED';
      
      const json = await res.json();
      if (json.status === 'ALLOW') return 'ALLOW';
      if (json.status === 'LIMIT_REACHED') return 'LIMIT_REACHED';
      
      return 'ERROR';
    } catch (e) {
      console.error("API Check Error", e);
      // In a real app, you might fail open or closed. Failing open for now if API is down.
      // Or handle specific network errors. 
      // For this specific prompt, we handle API logic strictly.
      return 'ERROR';
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError(null);

    try {
      if (typeof chrome === 'undefined') {
        // Dev Mock
        setNeedsLogin(false);
        setIsLoggingIn(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });

      const json = await res.json();

      if (res.ok && json.token) {
        await chrome.storage.local.set({ jwt: json.token });
        setNeedsLogin(false);
        // Automatically trigger analysis after login
        handleAnalyze();
      } else {
        setError(json.error || "Login failed");
      }
    } catch (err) {
      setError("Network error during login");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAnalyze = async () => {
    if (!text.trim()) {
      setError("Please enter some text to analyze.");
      return;
    }
    
    setError(null);
    setCheckingUsage(true);

    const status = await checkProAccess();
    setCheckingUsage(false);

    if (status === 'UNAUTHORIZED') {
      setNeedsLogin(true);
      return;
    }

    if (status === 'LIMIT_REACHED') {
      setLimitReached(true);
      return;
    }

    if (status === 'ERROR') {
      setError("Unable to verify usage limits. Please try again.");
      return;
    }

    // Status is ALLOW
    const analysis = analyzeJD(text);
    setResult(analysis);
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setLimitReached(false);
    setNeedsLogin(false);
  };

  // -- RENDER STATES --

  if (initializing) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
        <p className="text-sm text-slate-500">Connecting to page...</p>
      </div>
    );
  }

  // 1. Paywall View
  if (limitReached) {
    return (
      <div className="flex flex-col h-full w-full bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-2">
           <Lock className="w-5 h-5 text-indigo-600" />
           <h1 className="text-xl font-bold text-slate-800">Limit Reached</h1>
        </header>
        <main className="flex-1 p-8 flex flex-col items-center justify-center text-center">
          <div className="bg-amber-100 p-4 rounded-full mb-6">
            <Lock className="w-12 h-12 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Unlock Unlimited Access</h2>
          <p className="text-slate-600 mb-8">
            You've used all your free analysis credits for today. Upgrade to Pro to continue analyzing job descriptions.
          </p>
          <button 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md shadow-indigo-200"
            onClick={() => window.open('https://your-vercel-domain.vercel.app/pricing', '_blank')}
          >
            Upgrade to Pro
          </button>
          <button onClick={handleReset} className="mt-4 text-sm text-slate-500 hover:text-slate-800">
            Back to Home
          </button>
        </main>
      </div>
    );
  }

  // 2. Login View
  if (needsLogin) {
    return (
      <div className="flex flex-col h-full w-full bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-2">
           <User className="w-5 h-5 text-indigo-600" />
           <h1 className="text-xl font-bold text-slate-800">Login Required</h1>
        </header>
        <main className="flex-1 p-6">
          <p className="text-sm text-slate-600 mb-6">Please log in to your account to verify your usage limits.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Username</label>
              <input 
                type="text" 
                required
                className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 outline-none"
                value={loginForm.username}
                onChange={e => setLoginForm({...loginForm, username: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Password</label>
              <input 
                type="password" 
                required
                className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 outline-none"
                value={loginForm.password}
                onChange={e => setLoginForm({...loginForm, password: e.target.value})}
              />
            </div>
            {error && <div className="text-xs text-red-600 font-medium">{error}</div>}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md shadow-indigo-200 flex justify-center items-center gap-2"
            >
              {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              Log In
            </button>
            <button 
              type="button" 
              onClick={() => setNeedsLogin(false)} 
              className="w-full text-sm text-slate-500 mt-2 hover:text-slate-700"
            >
              Cancel
            </button>
          </form>
        </main>
      </div>
    );
  }

  // 3. Main Interface
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
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                Job Description Text
              </label>
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
            disabled={checkingUsage}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3.5 px-4 rounded-xl transition-all active:scale-[0.98] shadow-md shadow-indigo-200 flex items-center justify-center gap-2"
          >
            {checkingUsage ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Zap className="w-5 h-5" />
            )}
            {checkingUsage ? 'Checking Limits...' : 'Analyze Description'}
          </button>
        </footer>
      )}
    </div>
  );
};

export default App;