import fs from 'node:fs';
import path from 'node:path';

function loadEnvFile(filePath = '.env') {
  const full = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(full)) return;
  for (const raw of fs.readFileSync(full, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile();

const parseList = (s) =>
  (s ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

export const config = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',

  corsOrigins: parseList(process.env.CORS_ORIGINS),

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60000),
    max: Number(process.env.RATE_LIMIT_MAX ?? 100),
  },

  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    name: process.env.DB_NAME ?? 'maintenance',
    user: process.env.DB_USER ?? 'maintenance',
    password: process.env.DB_PASSWORD ?? 'maintenance_secret',
    pool: {
      max: Number(process.env.DB_POOL_MAX ?? 10),
      min: Number(process.env.DB_POOL_MIN ?? 0),
      acquire: Number(process.env.DB_POOL_ACQUIRE ?? 30000),
      idle: Number(process.env.DB_POOL_IDLE ?? 10000),
    },
  },

  auth: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev_access_secret_change_me',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev_refresh_secret_change_me',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 10),
    cookie: {
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: process.env.COOKIE_SAMESITE ?? 'lax',
      domain: process.env.COOKIE_DOMAIN || undefined,
    },
  },

  weather: {
    forecastUrl: process.env.WEATHER_API_URL ?? 'https://api.open-meteo.com/v1/forecast',
    geocodingUrl:
      process.env.GEOCODING_API_URL ?? 'https://geocoding-api.open-meteo.com/v1/search',
    timeoutMs: Number(process.env.REQUEST_TIMEOUT_MS ?? 5000),
    maxWindMs: Number(process.env.WEATHER_MAX_WIND_MS ?? 10),
    maxPrecipitationMm: Number(process.env.WEATHER_MAX_PRECIPITATION_MM ?? 0.5),
  },

  dataDir: process.env.DATA_DIR ?? 'data',
};