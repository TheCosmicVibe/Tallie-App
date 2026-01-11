import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { DataSource } from 'typeorm';
import { env } from './env';
import { Restaurant } from '../models/Restaurant';
import { Table } from '../models/Table';
import { Reservation } from '../models/Reservation';
import { Waitlist } from '../models/Waitlist';
import { logger } from '../utils/logger';

/**
 * TypeORM DataSource configuration
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
  synchronize: env.DB_SYNC,
  logging: env.DB_LOGGING,
  entities: [Restaurant, Table, Reservation, Waitlist],
  migrations: ['src/migrations/*.ts'], // <-- make sure this matches your migrations folder
  subscribers: [],
  extra: {
    connectionTimeoutMillis: 5000,
    query_timeout: 10000,
    statement_timeout: 10000,
    max: 20,
  },
});

/**
 * Initialize database connection (use in app startup)
 */
export const initializeDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    logger.info('Database connection established successfully');

        if (env.NODE_ENV === 'production') {
      await AppDataSource.runMigrations();
      logger.info('Database migrations executed successfully');
    }
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

/**
 * Close database connection
 */
export const closeDatabase = async (): Promise<void> => {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      logger.info('Database connection closed');
    }
  } catch (error) {
    logger.error('Error closing database connection:', error);
    throw error;
  }
};