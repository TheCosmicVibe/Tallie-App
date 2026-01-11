import { DataSource } from 'typeorm';
import { env } from './env';
import { Restaurant } from '../models/Restaurant';
import { Table } from '../models/Table';
import { Reservation } from '../models/Reservation';
import { Waitlist } from '../models/Waitlist';
import { logger } from '../utils/logger';

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
  migrations: [],
  subscribers: [],
  extra: {
    connectionTimeoutMillis: 5000,
    query_timeout: 10000,
    statement_timeout: 10000,
    max: 20,
  },
});

export const initializeDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    logger.info('Database connection established successfully');

    // Run migrations if needed
    if (env.NODE_ENV === 'production') {
      await AppDataSource.runMigrations();
      logger.info('Database migrations executed successfully');
    }
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

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
