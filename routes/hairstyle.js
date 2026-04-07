const express = require('express');
const multer = require('multer');
const { createHairstyleAdapter, VALID_HAIRSTYLES } = require('../services/hairstyleAdapter');

const router = express.Router();

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
    const hairstyle = req.body.hairstyle;
    const file = req.file;

    if (!file || !file.buffer) {
      return res.status(400).json({ error: 'Image file is required (field name: image).' });
    }
    if (!hairstyle) {
      return res.status(400).json({ error: 'Hairstyle is required.' });
    }
    if (!VALID_HAIRSTYLES.includes(hairstyle)) {
      return res.status(400).json({
        error: `Invalid hairstyle. Must be one of: ${VALID_HAIRSTYLES.join(', ')}`,
      });
    }

    const base64 = file.buffer.toString('base64');
    const mimeType = file.mimetype || 'image/jpeg';

    const adapter = createHairstyleAdapter();
    const result = await adapter.generate(base64, hairstyle, mimeType);
    const elapsed = Date.now() - startTime;
    console.log(`[Hairstyle] generated "${hairstyle}" in ${elapsed}ms`);

    return res.json({ imageUrl: result.imageUrl, hairstyle });
  } catch (err) {
    const elapsed = Date.now() - startTime;
    console.error(`[Hairstyle] error after ${elapsed}ms:`, err.message);

    if (err.status === 401 || err.code === 'invalid_api_key' || err.message?.includes('API key')) {
      return res.status(500).json({ error: 'AI service authentication failed. Check API key.' });
    }

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Image too large (max 25MB).' });
    }

    return res.status(500).json({
      error: err.message || 'Hairstyle generation failed. Please try again.',
    });
  }
});

module.exports = router;
