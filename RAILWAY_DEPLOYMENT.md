# Railway Deployment Guide

This guide explains how to properly deploy the JD Scorer backend to Railway.

## 🔧 What Was Fixed

The project had several critical issues that prevented Railway deployment:

### **Critical Issues Fixed:**
1. ✅ **No Railway configuration** - Added `railway.json` with proper build/start commands
2. ✅ **Security vulnerability** - Removed `backend/.env` from git tracking
3. ✅ **Missing dependencies** - Generated `package-lock.json` for consistent builds
4. ✅ **Hardcoded URLs** - Added environment variable support
5. ✅ **Confusing UX** - Removed API key UI from extension (backend handles it)

---

## 📋 Prerequisites

- GitHub repository with this code
- Railway account ([railway.app](https://railway.app))
- Google Gemini API key ([Get one here](https://aistudio.google.com/app/apikey))

---

## 🚀 Deployment Steps

### 1. Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your `HR-Master-extension` repository
5. Railway will detect the `railway.json` configuration automatically

### 2. Configure Environment Variables

**CRITICAL**: You must set these environment variables in Railway:

1. In your Railway project dashboard, go to **Variables** tab
2. Add the following variables:

   ```
   GEMINI_API_KEY=AIza... (your actual API key from Google AI Studio)
   NODE_ENV=production
   PORT=3000
   ```

   **Important Notes:**
   - The `GEMINI_API_KEY` is the only one that's absolutely required
   - Railway will automatically set `PORT` if you don't, but setting it to 3000 ensures consistency
   - Get your Gemini API key at: https://aistudio.google.com/app/apikey

### 3. Deploy

1. Railway will automatically deploy after you add the environment variables
2. Wait for the build to complete (usually 1-2 minutes)
3. Check the **Deployments** tab to see build logs

### 4. Get Your Backend URL

1. Once deployed, Railway will give you a public URL like:
   ```
   https://your-app-name.up.railway.app
   ```
2. Copy this URL - you'll need it for the extension

### 5. Test Your Deployment

Test the `/health` endpoint to ensure the backend is running:

```bash
curl https://your-app-name.up.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-23T...",
  "message": "JD Scorer API is running"
}
```

---

## 🔌 Connect Extension to Backend

### For Production (Default)

The extension is already configured to use the production Railway URL:
```
https://hr-master-extension-production.up.railway.app
```

If your Railway deployment has a **different URL**, update it in:

**File:** `src/utils/aiAnalysis.ts`
```typescript
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://YOUR_NEW_URL.up.railway.app';
```

### For Local Development

1. Create a `.env` file in the root directory:
   ```bash
   VITE_BACKEND_URL=http://localhost:3000
   ```

2. Start the backend locally:
   ```bash
   cd backend
   # Add your API key to backend/.env first
   npm start
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

---

## 🛠️ Backend Configuration Files

### `railway.json` (Root Directory)
Tells Railway how to build and deploy:
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd backend && npm ci"
  },
  "deploy": {
    "startCommand": "cd backend && npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### `backend/.env.example`
Documents required environment variables (reference only):
```
GEMINI_API_KEY=your_api_key_here
PORT=3000
NODE_ENV=production
```

**DO NOT commit your actual `.env` file to git!**

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Backend `/health` endpoint returns `{"status": "ok"}`
- [ ] Backend `/api/analyze` endpoint works (test with curl/Postman)
- [ ] Extension can analyze job descriptions
- [ ] No API key UI appears in the extension settings
- [ ] Railway environment variables are set correctly
- [ ] No sensitive data in git history

### Test the `/api/analyze` Endpoint

```bash
curl -X POST https://your-app-name.up.railway.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "text": "We are seeking a ninja developer to dominate our codebase.",
    "prompt": "Analyze this job description for bias.",
    "ignoredWords": []
  }'
```

Expected: JSON response with bias analysis

---

## 🐛 Troubleshooting

### Deployment fails with "GEMINI_API_KEY not set"

**Fix:** Add `GEMINI_API_KEY` to Railway environment variables (see Step 2)

### Extension shows "Network error"

**Fixes:**
1. Check Railway deployment logs for errors
2. Verify the backend URL is correct in `src/utils/aiAnalysis.ts`
3. Test the `/health` endpoint directly
4. Check browser console for CORS errors

### "Invalid API key" errors

**Fixes:**
1. Verify your Gemini API key is valid at [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Ensure the API key starts with `AIza`
3. Check Railway environment variables for typos

### Railway build fails

**Fixes:**
1. Check `railway.json` is in the root directory
2. Verify `backend/package-lock.json` exists
3. Check Railway build logs for specific errors
4. Ensure all dependencies are in `backend/package.json`

### CORS errors in browser console

**Fix:** The backend already allows all origins for now. If you see CORS errors:
1. Check that the backend is running
2. Verify the request is going to the correct URL
3. Check Railway logs for blocked requests

---

## 🔒 Security Best Practices

1. **Never commit API keys** - Use Railway environment variables
2. **Keep `.env` files out of git** - Already configured in `.gitignore`
3. **Use environment variables** - Don't hardcode sensitive data
4. **Rotate API keys regularly** - Update in Railway dashboard
5. **Monitor usage** - Check Google AI Studio for API usage

---

## 📊 Monitoring

### Railway Dashboard

- **Deployments**: View build logs and deployment history
- **Metrics**: CPU, memory, and network usage
- **Logs**: Real-time application logs
- **Environment**: Manage environment variables

### Google AI Studio

- Monitor API usage and quota
- Track costs and request counts
- Manage API keys

---

## 🎯 Next Steps

1. Deploy to Railway using this guide
2. Test the `/health` and `/api/analyze` endpoints
3. Build the extension: `npm run build`
4. Load the extension in Chrome: Load unpacked from `dist/` folder
5. Test analyzing a job description
6. Monitor Railway logs for any errors

---

## 📝 Additional Resources

- [Railway Documentation](https://docs.railway.app/)
- [Google Gemini API Docs](https://ai.google.dev/docs)
- [Chrome Extension Developer Guide](https://developer.chrome.com/docs/extensions/)

---

## 🆘 Support

If you encounter issues:

1. Check Railway deployment logs
2. Test backend endpoints with curl
3. Check browser console for extension errors
4. Verify environment variables are set correctly
5. Review this deployment guide

**Common Issues Fixed:**
- ✅ Railway not deploying → `railway.json` added
- ✅ API key in git → `.env` removed from tracking
- ✅ Dependencies mismatch → `package-lock.json` added
- ✅ Extension confused about API key → UI removed
- ✅ Hardcoded URLs → Environment variable support added

---

## 🎉 Success Criteria

Your deployment is successful when:

1. ✅ Railway shows "Deployed" status
2. ✅ `/health` endpoint returns 200 OK
3. ✅ Extension can analyze job descriptions
4. ✅ No errors in Railway logs
5. ✅ No API key UI in extension settings
6. ✅ Analysis results appear correctly

**You're done!** 🚀

---

*This guide was created to fix the issues that were causing the project to get worse with each change. All critical issues have been addressed.*
