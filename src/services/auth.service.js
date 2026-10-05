import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../db/models/index.js';
import { config } from '../config/index.js';
import { AppError } from '../errors/AppError.js';
import { ConflictError } from '../errors/ConflictError.js';

export class AuthService {
  async register({ email, password, fullName }) {
    const existing = await User.findOne({ where: { email } });
    if (existing) throw new ConflictError('Email уже занят', { code: 'EMAIL_TAKEN' });

    const passwordHash = await bcrypt.hash(password, config.auth.bcryptRounds);
    const user = await User.create({ email, passwordHash, fullName });
    return { id: user.id, email: user.email, fullName: user.fullName, role: user.role };
  }

  async login({ email, password }) {
    const user = await User.scope('withPassword').findOne({ where: { email } });

    if (!user) {
      throw new AppError('Неверный email или пароль', {
        code: 'INVALID_CREDENTIALS',
        statusCode: 401,
      });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError('Неверный email или пароль', {
        code: 'INVALID_CREDENTIALS',
        statusCode: 401,
      });
    }

    return {
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
      accessToken: this.#signAccess({ sub: user.id, role: user.role }),
      refreshToken: this.#signRefresh({ sub: user.id }),
    };
  }

  async refresh(refreshToken) {
    if (!refreshToken) {
      throw new AppError('Отсутствует refresh-токен', {
        code: 'INVALID_REFRESH',
        statusCode: 401,
      });
    }
    try {
      const payload = jwt.verify(refreshToken, config.auth.refreshSecret);
      const user = await User.findByPk(payload.sub);
      if (!user) throw new Error('User not found');
      return { accessToken: this.#signAccess({ sub: user.id, role: user.role }) };
    } catch {
      throw new AppError('Недействительный refresh-токен', {
        code: 'INVALID_REFRESH',
        statusCode: 401,
      });
    }
  }

  #signAccess(payload) {
    return jwt.sign(payload, config.auth.accessSecret, {
      expiresIn: config.auth.accessExpiresIn,
    });
  }

  #signRefresh(payload) {
    return jwt.sign(payload, config.auth.refreshSecret, {
      expiresIn: config.auth.refreshExpiresIn,
    });
  }
}

export const authService = new AuthService();