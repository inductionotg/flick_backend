require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { rateLimit } = require('express-rate-limit');
const generateRoute = require('./routes/generate');
const hairstyleRoute = require('./routes/hairstyle');

const HOUR_MS = 60 * 60 * 1000;

const generateLimiter = rateLimit({
  windowMs: HOUR_MS,
  limit: 8,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many generation requests. Limit is 6 per hour. Try again later.',
    });
  },
});

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));

app.use((req, _res, next) => {
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/generate', generateLimiter, generateRoute);
app.use('/api/hairstyle', generateLimiter, hairstyleRoute);

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Image too large (max 25MB).' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err && err.message === 'File must be an image') {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Flick server running on http://0.0.0.0:${PORT}`);
  console.log(`[Server] Accessible at http://192.168.1.20:${PORT}`);
});
