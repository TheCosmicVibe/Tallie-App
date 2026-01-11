import app from './app';
import { env } from './config/env';
import { initializeDatabase, closeDatabase } from './config/database';
import { redisClient } from './config/redis';
import { logger } from './utils/logger';

let server: ReturnType<typeof app.listen> | undefined;

const startServer = async (): Promise<void> => {
  try {
    // Initialize database
    await initializeDatabase();
    logger.info('✅ Database initialized');

    // Initialize Redis
    await redisClient.connect();
    logger.info('✅ Redis connected');

    // Start server
    server = app.listen(env.PORT, () => {
      logger.info(`🚀 Server is running on port ${env.PORT}`);
      logger.info(`📍 Environment: ${env.NODE_ENV}`);
      logger.info(`🌐 API: http://localhost:${env.PORT}/api/${env.API_VERSION}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`\n${signal} received. Starting graceful shutdown...`);

  try {
    // Close server
    if (server) {
      server.close(() => {
        logger.info('✅ Server closed');
      });
    }

    // Close database connection
    await closeDatabase();
    logger.info('✅ Database connection closed');

    // Close Redis connection
    await redisClient.disconnect();
    logger.info('✅ Redis connection closed');

    logger.info('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the server
startServer();