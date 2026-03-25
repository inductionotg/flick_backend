const express = require('express');
const multer = require('multer');
const { createAdapter } = require('../services/aiAdapter');
const { sanitizePromptExtra } = require('../utils/promptGuard');

const router = express.Router();

const VALID_STYLES = ['cartoon', 'flat', 'anime', 'pixel', 'sketch'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('File must be an image'));
    }
  },
});

router.post('/', upload.single('image'), async (req, res) => {
  const startTime = Date.now();
  try {
    const style = req.body.style;
    const file = req.file;

    const extraResult = sanitizePromptExtra(req.body.promptExtra);
    if (!extraResult.ok) {
      console.error(`[Route] rejected promptExtra: ${extraResult.error}`);
      return res.status(400).json({ error: extraResult.error });
    }
    const promptExtra = extraResult.value;

    

    if (!file || !file.buffer) {
      return res.status(400).json({ error: 'Image file is required (field name: image).' });
    }
    if (!style) {
      return res.status(400).json({ error: 'Style is required.' });
    }
    if (!VALID_STYLES.includes(style)) {
      return res.status(400).json({ error: `Invalid style. Must be one of: ${VALID_STYLES.join(', ')}` });
    }

    const base64 = file.buffer.toString('base64');
    const mimeType = file.mimetype || 'image/jpeg';

    const adapter = createAdapter();
    const result = await adapter.generate(base64, style, mimeType, promptExtra);
    const elapsed = Date.now() - startTime;

    return res.json({ imageUrl: result.imageUrl, style });
  } catch (err) {
    const elapsed = Date.now() - startTime;
    
    if (err.status === 401 || err.code === 'invalid_api_key') {
      return res.status(500).json({ error: 'AI service authentication failed. Check API key.' });
    }

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Image too large (max 25MB).' });
    }

    return res.status(500).json({ error: err.message || 'Image generation failed. Please try again.' });
  }
});

module.exports = router;
