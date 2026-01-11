import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  API_VERSION: string;

  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_DATABASE: string;
  DB_SYNC: boolean;
  DB_LOGGING: boolean;

  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD: string;
  REDIS_DB: number;
  CACHE_TTL: number;

  TIMEZONE: string;
  DEFAULT_RESERVATION_DURATION: number;
  PEAK_HOURS_START: string;
  PEAK_HOURS_END: string;
  PEAK_HOURS_MAX_DURATION: number;
  MAX_ADVANCE_BOOKING_DAYS: number;

  ENABLE_NOTIFICATIONS: boolean;
  NOTIFICATION_FROM_EMAIL: string;
  NOTIFICATION_FROM_PHONE: string;

  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;

  LOG_LEVEL: string;
}

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value;
};

const getEnvAsNumber = (key: string, defaultValue?: number): number => {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value ? parseInt(value, 10) : defaultValue!;
};

const getEnvAsBoolean = (key: string, defaultValue: boolean = false): boolean => {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
};

export const env: EnvConfig = {
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  PORT: getEnvAsNumber('PORT', 3000),
  API_VERSION: getEnv('API_VERSION', 'v1'),

  DB_HOST: getEnv('DB_HOST', 'localhost'),
  DB_PORT: getEnvAsNumber('DB_PORT', 5432),
  DB_USERNAME: getEnv('DB_USERNAME', 'postgres'),
  DB_PASSWORD: getEnv('DB_PASSWORD', 'postgres'),
  DB_DATABASE: getEnv('DB_DATABASE', 'tallie_restaurant'),
  DB_SYNC: getEnvAsBoolean('DB_SYNC', false),
  DB_LOGGING: getEnvAsBoolean('DB_LOGGING', false),

  REDIS_HOST: getEnv('REDIS_HOST', 'localhost'),
  REDIS_PORT: getEnvAsNumber('REDIS_PORT', 6379),
  REDIS_PASSWORD: getEnv('REDIS_PASSWORD', ''),
  REDIS_DB: getEnvAsNumber('REDIS_DB', 0),
  CACHE_TTL: getEnvAsNumber('CACHE_TTL', 3600),

  TIMEZONE: getEnv('TIMEZONE', 'Africa/Lagos'),
  DEFAULT_RESERVATION_DURATION: getEnvAsNumber('DEFAULT_RESERVATION_DURATION', 120),
  PEAK_HOURS_START: getEnv('PEAK_HOURS_START', '18:00'),
  PEAK_HOURS_END: getEnv('PEAK_HOURS_END', '21:00'),
  PEAK_HOURS_MAX_DURATION: getEnvAsNumber('PEAK_HOURS_MAX_DURATION', 90),
  MAX_ADVANCE_BOOKING_DAYS: getEnvAsNumber('MAX_ADVANCE_BOOKING_DAYS', 30),

  ENABLE_NOTIFICATIONS: getEnvAsBoolean('ENABLE_NOTIFICATIONS', true),
  NOTIFICATION_FROM_EMAIL: getEnv('NOTIFICATION_FROM_EMAIL', 'reservations@tallie.com'),
  NOTIFICATION_FROM_PHONE: getEnv('NOTIFICATION_FROM_PHONE', '+1234567890'),

  RATE_LIMIT_WINDOW_MS: getEnvAsNumber('RATE_LIMIT_WINDOW_MS', 900000),
  RATE_LIMIT_MAX_REQUESTS: getEnvAsNumber('RATE_LIMIT_MAX_REQUESTS', 100),

  LOG_LEVEL: getEnv('LOG_LEVEL', 'info'),
};
