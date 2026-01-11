import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

// Routes
import restaurantRoutes from './routes/restaurantRoutes';
import reservationRoutes from './routes/reservationRoutes';
import waitlistRoutes from './routes/waitlistRoutes';

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((_req, _res, next) => {
  logger.info(`${_req.method} ${_req.path}`, {
    ip: _req.ip,
    userAgent: _req.get('user-agent'),
  });
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// API routes
const apiPrefix = `/api/${env.API_VERSION}`;

app.get(apiPrefix, (_req, res) => {
  res.json({
    message: 'Welcome to Tallie Restaurant System API',
    version: env.API_VERSION,
    documentation: `${apiPrefix}/docs`,
  });
});

app.use(`${apiPrefix}/restaurants`, restaurantRoutes);
app.use(`${apiPrefix}/reservations`, reservationRoutes);
app.use(`${apiPrefix}/waitlist`, waitlistRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;