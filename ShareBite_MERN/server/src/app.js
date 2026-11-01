
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import routes from './routes/index.js';
import { env } from './config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust Render's reverse proxy
app.set('trust proxy', 1);

app.disable('x-powered-by');

// Allow cross-origin images to load on the frontend
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Enable CORS with credentials
app.use(cors({
  origin: env.clientOrigin,
  credentials: true
}));

app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rate limiting for authentication routes
app.use('/api/v1/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false
}));

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok'
  });
});

// API routes
app.use('/api/v1', routes);

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found.'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  const status =
    err.name === 'ZodError' ? 400 :
    err.code === 11000 ? 409 :
    err.statusCode || 500;

  res.status(status).json({
    success: false,
    message:
      status === 500
        ? 'Something went wrong.'
        : err.code === 11000
          ? 'Email already exists.'
          : err.message
  });
});

export default app;
