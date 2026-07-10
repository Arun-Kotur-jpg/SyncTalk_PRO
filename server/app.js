import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import crypto from 'crypto';
import compression from 'compression';
import pinoHttp from 'pino-http';
import * as Sentry from '@sentry/node';
import logger from './utils/logger.js';
import mongoose from 'mongoose';
import { generalLimiter } from './middleware/rateLimiter.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import summaryRoutes from './routes/summaryRoutes.js';
import voiceRoutes from './routes/voiceRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(generalLimiter);

// Parsing
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const id = req.headers['x-request-id'] || crypto.randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },
  })
);

// Static files for voice uploads — with correct audio headers
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    // Ensure correct Content-Type for audio files
    const ext = path.extname(filePath).toLowerCase();
    const audioMimes = {
      '.webm': 'audio/webm',
      '.ogg': 'audio/ogg',
      '.mp3': 'audio/mpeg',
      '.mp4': 'audio/mp4',
      '.m4a': 'audio/mp4',
      '.wav': 'audio/wav',
    };
    if (audioMimes[ext]) {
      res.setHeader('Content-Type', audioMimes[ext]);
    }
    // Allow cross-origin audio playback
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Accept-Ranges', 'bytes');
  },
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const isHealthy = dbStatus === 'connected';
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus
      }
    });
  } catch (error) {
    res.status(503).json({ status: 'error', timestamp: new Date().toISOString() });
  }
});

// Version endpoint
app.get('/api/version', (req, res) => {
  res.json({
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Serve client build in production if present
const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));

  // All non-API routes (except uploads) should serve the SPA index
  app.get('*', (req, res, next) => {
    // Skip API and uploads routes
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error({ err, req, res }, 'Unhandled error in Express');
  Sentry.captureException(err);
  res.status(500).json({ message: 'Internal server error' });
});

export default app;
