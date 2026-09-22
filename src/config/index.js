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
