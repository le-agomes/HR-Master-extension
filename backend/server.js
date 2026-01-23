import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
const PORT = process.env.PORT || 3000;

// ===== CONFIGURATION =====

// Load API key from environment variable (NEVER hardcode)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ ERROR: GEMINI_API_KEY environment variable not set');
  console.error('Please set it in your deployment platform or .env file');
  process.exit(1);
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// ===== MIDDLEWARE =====

// Parse JSON bodies (limit size to prevent abuse)
app.use(express.json({ limit: '100kb' }));

// CORS - Allow your extension to call this API
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Allow chrome-extension:// and edge-extension:// origins
    if (origin.startsWith('chrome-extension://') ||
        origin.startsWith('edge-extension://') ||
        origin.startsWith('moz-extension://')) {
      return callback(null, true);
    }

    // Allow localhost for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }

    callback(null, true); // For now, allow all (tighten in production)
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Rate Limiting - Prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Max 50 requests per 15 minutes per IP
  message: {
    error: 'Too many requests from this IP. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Request logging (basic)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ===== ROUTES =====

// Root endpoint - for Railway health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'JD Scorer API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      analyze: '/api/analyze'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    service: 'JD Scorer API'
  });
});

// Main analysis endpoint
app.post('/api/analyze', async (req, res) => {
  try {
    const { text, ignoredWords = [], prompt } = req.body;

    // ===== VALIDATION =====

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Invalid request: "text" field is required and must be a string'
      });
    }

    if (text.length < 50) {
      return res.status(400).json({
        error: 'Job description is too short to analyze (minimum 50 characters)'
      });
    }

    if (text.length > 50000) {
      return res.status(400).json({
        error: 'Job description is too long (maximum 50,000 characters)'
      });
    }

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        error: 'Invalid request: "prompt" field is required'
      });
    }

    // Validate ignoredWords is an array
    if (!Array.isArray(ignoredWords)) {
      return res.status(400).json({
        error: 'Invalid request: "ignoredWords" must be an array'
      });
    }

    // ===== CALL GEMINI API =====

    console.log(`Analyzing text (${text.length} chars, ${ignoredWords.length} ignored words)`);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Build full prompt
    const fullPrompt = `${prompt}

${ignoredWords.length > 0 ? `IGNORE THESE WORDS (company-specific terms): ${ignoredWords.join(', ')}\n` : ''}

JOB DESCRIPTION TO ANALYZE:
${text}`;

    // Generate content
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const responseText = response.text();

    console.log('✓ Analysis complete');

    // Return response
    res.json({
      success: true,
      response: responseText
    });

  } catch (error) {
    console.error('Analysis error:', error);

    // Handle specific Gemini API errors
    if (error.message?.includes('API_KEY_INVALID')) {
      return res.status(500).json({
        error: 'Server configuration error. Please contact support.'
      });
    }

    if (error.message?.includes('QUOTA_EXCEEDED')) {
      return res.status(503).json({
        error: 'Service temporarily unavailable due to high demand. Please try again in a few minutes.'
      });
    }

    if (error.message?.includes('RATE_LIMIT')) {
      return res.status(429).json({
        error: 'Rate limit reached. Please wait a moment and try again.'
      });
    }

    // Generic error (don't leak sensitive info)
    res.status(500).json({
      error: 'Analysis failed. Please try again.'
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    availableEndpoints: {
      health: 'GET /health',
      analyze: 'POST /api/analyze'
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error'
  });
});

// ===== START SERVER =====

app.listen(PORT, () => {
  console.log('');
  console.log('🚀 JD Scorer Backend API');
  console.log('========================');
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ API key loaded: ${GEMINI_API_KEY.substring(0, 10)}...`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('Available endpoints:');
  console.log(`  GET  http://localhost:${PORT}/health`);
  console.log(`  POST http://localhost:${PORT}/api/analyze`);
  console.log('');
});
