import { Router } from 'express';
import auth from '../middleware/auth.js';
import { upload, handleUpload } from '../controllers/uploadController.js';

const router = Router();

router.post('/', auth, upload.single('attachment'), handleUpload);

// Error handling middleware for multer
router.use((err, req, res, next) => {
  if (err.name === 'MulterError') {
    return res.status(400).json({ message: err.message });
  } else if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
});

export default router;
