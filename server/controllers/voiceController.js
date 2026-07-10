import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import Message from '../models/Message.js';
import { transcribeAudio } from '../services/voiceTranscriber.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Multer config for voice uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads', 'voice'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname) || '.webm'}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'audio/webm',
    'audio/webm;codecs=opus',
    'audio/ogg',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/x-m4a',
    'audio/mpeg',
    'audio/wav',
    'audio/x-wav',
    'audio/mp3',
  ];
  // Also accept if the base type matches (strip codec params for comparison)
  const baseType = file.mimetype.split(';')[0].trim();
  if (allowedTypes.includes(file.mimetype) || allowedTypes.includes(baseType)) {
    cb(null, true);
  } else {
    console.warn('Rejected audio upload with mimetype:', file.mimetype);
    cb(new Error(`Invalid audio file type: ${file.mimetype}`), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

// POST /api/voice/upload
export const uploadVoice = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No audio file provided' });
    }

    const voiceUrl = `/uploads/voice/${req.file.filename}`;
    res.json({ voiceUrl, filename: req.file.filename });
  } catch (error) {
    console.error('Voice upload error:', error);
    res.status(500).json({ message: 'Failed to upload voice message' });
  }
};

// POST /api/voice/transcribe/:messageId
export const transcribeVoice = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.type !== 'voice' || !message.voiceUrl) {
      return res.status(400).json({ message: 'Not a voice message' });
    }

    if (message.transcription) {
      return res.json({ transcription: message.transcription });
    }

    // Build full file path
    const filePath = path.join(__dirname, '..', message.voiceUrl);

    const transcription = await transcribeAudio(filePath);

    // Save transcription to message
    message.transcription = transcription;
    await message.save();

    res.json({ transcription });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({
      message: 'Transcription failed. Please try again later.',
      error: error.message,
    });
  }
};
