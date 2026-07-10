import { Router } from 'express';
import multer from 'multer';
import { upload, uploadVoice, transcribeVoice } from '../controllers/voiceController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.post('/upload', auth, upload.single('audio'), uploadVoice);
router.post('/transcribe/:messageId', auth, transcribeVoice);

// Multer error handler — returns 400 for file size / MIME type rejections
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 25 MB.' });
    }
    return res.status(400).json({ message: err.message });
  }
  if (err?.message?.startsWith('Invalid audio file type')) {
    return res.status(400).json({ message: err.message });
  }
  next(err);
});

export default router;
