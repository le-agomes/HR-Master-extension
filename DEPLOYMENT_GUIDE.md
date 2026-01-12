# 🚀 Quick Deployment Guide - JD Scorer Backend

## ⏱️ 5-Minute Setup

### Step 1: Test Backend Locally (2 minutes)

```bash
cd backend
npm install
# Edit .env and add your Gemini API key
npm start
```

Open http://localhost:3000/health - should see `{"status":"ok"}`

### Step 2: Deploy to Railway (3 minutes)

**Easiest option - Recommended:**

1. Go to https://railway.app
2. Click "Start a New Project"
3. Select "Deploy from GitHub repo"
4. Select your repo → Set root directory to `backend`
5. Add environment variable:
   - Key: `GEMINI_API_KEY`
   - Value: Your actual API key (starts with AIza...)
6. Click Deploy

Railway will give you a URL like: `https://your-app.up.railway.app`

### Step 3: Update Extension (1 minute)

Create `/backend/.env.production`:
```
BACKEND_URL=https://your-app.up.railway.app
```

Or set environment variable in Railway:
```
VITE_BACKEND_URL=https://your-app.up.railway.app
```

### Step 4: Build & Test

```bash
cd ..  # back to root
npm run build
```

Load unpacked extension from `dist/` folder and test!

---

## Alternative: Render.com

1. Go to https://render.com
2. New Web Service → Connect GitHub
3. Root directory: `backend`
4. Build: `npm install`
5. Start: `npm start`
6. Add env var: `GEMINI_API_KEY`

Done! URL: `https://your-app.onrender.com`

---

## Testing Your Backend

```bash
# Health check
curl https://your-app.up.railway.app/health

# Test analysis
curl -X POST https://your-app.up.railway.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "text": "We need a rockstar ninja developer",
    "ignoredWords": [],
    "prompt": "Analyze this for bias"
  }'
```

---

## Troubleshooting

**"GEMINI_API_KEY not set"**
→ Add environment variable in Railway/Render dashboard

**CORS errors**
→ Backend allows all chrome-extension:// origins by default

**"Rate limit exceeded"**
→ Wait 15 minutes or increase limit in server.js

---

## Cost Monitoring

- Railway: Free tier = $5 credit/month
- Render: Free tier = 750 hours/month
- Gemini API: Track at https://aistudio.google.com

---

**That's it! Backend is secure, users don't need API keys. 🎉**
