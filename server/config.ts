import dotenv from 'dotenv';

dotenv.config();

export interface AppConfig {
  env: 'development' | 'production' | 'test';
  port: number;
  appUrl: string;
  geminiApiKey: string | null;
  stripeWebhookSecret: string;
  redisUrl: string | null;
  sqlHost?: string;
  sqlDbName?: string;
  sqlUser?: string;
  sqlPassword?: string;
  workerConcurrency: number;
  maxUploadLimitMb: number;
  defaultPlanTokens: number;
  jobTimeoutMs: number;
}

export const config: AppConfig = {
  env: (process.env.NODE_ENV as any) || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  geminiApiKey: process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' ? process.env.GEMINI_API_KEY : null,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_prod_vibecode_demo_secret_2026',
  redisUrl: process.env.REDIS_URL || null,
  sqlHost: process.env.SQL_HOST,
  sqlDbName: process.env.SQL_DB_NAME,
  sqlUser: process.env.SQL_USER,
  sqlPassword: process.env.SQL_PASSWORD,
  workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  maxUploadLimitMb: 15,
  defaultPlanTokens: 500000,
  jobTimeoutMs: 120000, // 2 minutes max per generation
};
