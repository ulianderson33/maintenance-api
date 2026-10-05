import { authService } from '../services/auth.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { config } from '../config/index.js';

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 дней

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: config.auth.cookie.secure,
    sameSite: config.auth.cookie.sameSite,
    domain: config.auth.cookie.domain,
    maxAge: REFRESH_MAX_AGE_MS,
    path: '/api/auth',
  });
}

export const authController = {
  register: asyncHandler(async (req, res) => {
    const user = await authService.register(req.body);
    res.status(201).json({ data: user });
  }),

  login: asyncHandler(async (req, res) => {
    const { user, accessToken, refreshToken } = await authService.login(req.body);
    setRefreshCookie(res, refreshToken);
    res.json({ data: { user, accessToken } });
  }),

  refresh: asyncHandler(async (req, res) => {
    const token = req.cookies[REFRESH_COOKIE];
    const { accessToken } = await authService.refresh(token);
    res.json({ data: { accessToken } });
  }),

  logout: asyncHandler(async (_req, res) => {
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
    res.status(204).send();
  }),
};