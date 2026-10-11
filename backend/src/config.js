import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: resolve(backendRoot, '../.env') });

const defaultDatabaseUrl = 'postgresql://neondb_owner:npg_WdTJRZg7o4PV@ep-blue-glade-b4gdhddh-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require';
const defaultJwtSecret = 'campus-care-fallback-jwt-secret-2026-production';

export const config = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || defaultDatabaseUrl,
  jwtSecret: process.env.JWT_SECRET || defaultJwtSecret,
  clientOrigin: process.env.CLIENT_ORIGIN || '*',
  publicSiteUrl: (process.env.PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173')).replace(/\/$/, ''),
};