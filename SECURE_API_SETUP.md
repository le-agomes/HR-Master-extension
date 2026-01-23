# Secure API Key Setup Guide

## Problem
Browser extensions cannot securely store API keys. Any key embedded in client-side code can be extracted by users.

## Solution: Backend Proxy Server

Create a backend server that holds your Gemini API key and proxies requests from your extension.

---

## Step 1: Create a Backend Server

### Option A: Node.js + Express (Recommended)

**File: `backend/server.js`**

```javascript
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Load API key from environment variable (NEVER hardcode)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY environment variable not set');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Configure CORS to only allow your extension
const EXTENSION_ID = 'your-extension-id'; // Replace with your actual extension ID
app.use(cors({
  origin: `chrome-extension://${EXTENSION_ID}`,
  methods: ['POST'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Rate limiting middleware (prevent abuse)
const rateLimitMap = new Map();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60000; // 1 minute

function rateLimiter(req, res, next) {
  const clientId = req.ip;
  const now = Date.now();

  if (!rateLimitMap.has(clientId)) {
    rateLimitMap.set(clientId, { count: 1, resetTime: now + RATE_WINDOW });
    return next();
  }

  const clientData = rateLimitMap.get(clientId);

  if (now > clientData.resetTime) {
    clientData.count = 1;
    clientData.resetTime = now + RATE_WINDOW;
    return next();
  }

  if (clientData.count >= RATE_LIMIT) {
    return res.status(429).json({
      error: 'Rate limit exceeded. Please wait before trying again.'
    });
  }

  clientData.count++;
  next();
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Main analysis endpoint
app.post('/api/analyze', rateLimiter, async (req, res) => {
  try {
    const { text, ignoredWords = [], prompt } = req.body;

    // Validation
    if (!text || text.trim().length < 50) {
      return res.status(400).json({
        error: 'Job description is too short to analyze.'
      });
    }

    if (text.length > 50000) {
      return res.status(400).json({
        error: 'Job description is too long.'
      });
    }

    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const fullPrompt = `${prompt}

${ignoredWords.length > 0 ? `IGNORE THESE WORDS (company-specific terms): ${ignoredWords.join(', ')}\n` : ''}

JOB DESCRIPTION TO ANALYZE:
${text}`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const responseText = response.text();

    res.json({ success: true, response: responseText });

  } catch (error) {
    console.error('Analysis error:', error);

    // Handle specific Gemini API errors
    if (error.message?.includes('API_KEY_INVALID')) {
      return res.status(500).json({ error: 'Server configuration error' });
    }
    if (error.message?.includes('QUOTA_EXCEEDED')) {
      return res.status(503).json({ error: 'Service temporarily unavailable. Please try again later.' });
    }

    res.status(500).json({ error: 'Analysis failed. Please try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`✓ Backend server running on port ${PORT}`);
  console.log(`✓ API key loaded: ${GEMINI_API_KEY.substring(0, 10)}...`);
});
```

**File: `backend/package.json`**

```json
{
  "name": "jd-scorer-backend",
  "version": "1.0.0",
  "description": "Backend proxy for JD Scorer extension",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "@google/generative-ai": "^0.21.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

**File: `backend/.env`** (NEVER commit this file)

```
GEMINI_API_KEY=AIzaYourActualGeminiAPIKeyHere
PORT=3000
```

**File: `backend/.gitignore`**

```
.env
node_modules/
*.log
```

---

## Step 2: Deploy Your Backend

### Option A: Railway (Easy, Free Tier)

1. Create account at [railway.app](https://railway.app)
2. Create new project
3. Deploy from GitHub
4. Add environment variable: `GEMINI_API_KEY=your-key`
5. Get your deployment URL: `https://your-app.railway.app`

### Option B: Render (Free Tier)

1. Create account at [render.com](https://render.com)
2. New Web Service → Connect GitHub repo
3. Add environment variable: `GEMINI_API_KEY`
4. Get URL: `https://your-app.onrender.com`

### Option C: Heroku

```bash
heroku create jd-scorer-backend
heroku config:set GEMINI_API_KEY=your-key
git push heroku main
```

### Option D: Your Own VPS (DigitalOcean, AWS, etc.)

```bash
# SSH into your server
cd /var/www/
git clone your-repo
cd backend
npm install
pm2 start server.js --name jd-scorer
pm2 save
pm2 startup
```

---

## Step 3: Update Extension to Use Backend

**File: `src/utils/aiAnalysis.ts`**

Replace the direct API call with a backend call:

```typescript
// BEFORE (insecure - direct API call)
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
const result = await model.generateContent(fullPrompt);

// AFTER (secure - backend proxy)
const BACKEND_URL = 'https://your-backend-url.railway.app';

const response = await fetch(`${BACKEND_URL}/api/analyze`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: text,
    ignoredWords: ignoredWords,
    prompt: ANALYSIS_PROMPT
  })
});

if (!response.ok) {
  const error = await response.json();
  throw new Error(error.error || 'Analysis failed');
}

const data = await response.json();
const responseText = data.response;
```

---

## Step 4: Remove API Key Input from Extension

Update `src/App.tsx`:

1. **Remove** the API key state and settings UI
2. **Remove** chrome.storage API key management
3. **Remove** API key validation

The user never needs to see or provide an API key!

---

## Step 5: Security Best Practices

### ✅ DO:
- Store API key in environment variables only
- Use rate limiting on your backend
- Monitor API usage and costs
- Use CORS to restrict which domains can call your API
- Log suspicious activity
- Set up billing alerts in Google Cloud
- Consider adding user authentication if needed

### ❌ DON'T:
- Hardcode API keys anywhere
- Commit `.env` files to git
- Deploy without rate limiting
- Allow unlimited requests
- Skip monitoring

---

## Cost Management

### Track Usage:
1. Google AI Studio → [API Usage Dashboard](https://aistudio.google.com)
2. Set up billing alerts
3. Monitor your backend logs

### Rate Limiting Example:
```javascript
// Limit per user: 10 requests per minute
// Limit per extension: 1000 requests per day
```

### Monetization (Optional):
If costs become significant:
- Add user authentication
- Implement subscription model
- Use Stripe/PayPal for payments
- Offer free tier + premium

---

## Testing

### Test your backend:
```bash
# Health check
curl https://your-backend.railway.app/health

# Test analysis
curl -X POST https://your-backend.railway.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "text": "We are looking for a rockstar developer...",
    "ignoredWords": [],
    "prompt": "Analyze this job description..."
  }'
```

### Test from extension:
1. Update BACKEND_URL in your code
2. Build extension: `npm run build`
3. Load unpacked extension in Chrome
4. Test analysis on a job description

---

## Alternative: Use Extension ID for Basic Auth

Add simple auth to prevent random people using your API:

**Backend:**
```javascript
const ALLOWED_EXTENSION_ID = 'your-extension-id';

app.use((req, res, next) => {
  const origin = req.get('origin');
  if (origin !== `chrome-extension://${ALLOWED_EXTENSION_ID}`) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});
```

**Extension manifest.json:**
```json
{
  "host_permissions": [
    "https://your-backend-url.railway.app/*"
  ]
}
```

---

## Summary

1. ✅ **Backend holds API key** → Users can't steal it
2. ✅ **Rate limiting** → Prevents abuse
3. ✅ **Cost control** → Monitor usage, set limits
4. ✅ **Better UX** → Users don't need to get their own key
5. ✅ **Scalable** → Can add auth, analytics, etc.

**This is the ONLY secure way to provide API access in a browser extension.**
