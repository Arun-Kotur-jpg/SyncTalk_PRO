import 'dotenv/config';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});

import { z } from 'zod';
import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import connectDB from './config/db.js';
import setupSocket from './socket/socketHandler.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './utils/logger.js';

// Validate required environment variables at startup
const envSchema = z.object({
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  PORT: z.string().min(1, 'PORT is required'),
  CLIENT_URL: z.string().min(1, 'CLIENT_URL is required'),
  GEMINI_API_KEY: z.string().optional(),
  JWT_ACCESS_EXPIRY: z.string().optional(),
  JWT_REFRESH_EXPIRY: z.string().optional(),
});

const envResult = envSchema.safeParse(process.env);
if (!envResult.success) {
  logger.fatal('Environment variable validation failed:');
  envResult.error.issues.forEach((issue) => {
    logger.fatal(`   • ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught Exception thrown');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({ err: reason, promise }, 'Unhandled Rejection at Promise');
  process.exit(1);
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure uploads directory exists
const voiceDir = path.join(__dirname, 'uploads', 'voice');
if (!fs.existsSync(voiceDir)) {
  fs.mkdirSync(voiceDir, { recursive: true });
}

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
  });

  setupSocket(io);


  app.set('io', io);

  httpServer.listen(PORT, () => {
    logger.info(`🚀 SyncTalk server running on port ${PORT}`);
    logger.info(`   API: http://localhost:${PORT}/api`);
    logger.info(`   WebSocket: ws://localhost:${PORT}`);
  });
};

startServer().catch((error) => {
  logger.fatal({ err: error }, 'Failed to start server');
  process.exit(1);
});
