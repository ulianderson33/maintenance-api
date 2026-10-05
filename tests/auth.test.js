import { test, expect, describe } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('Auth', () => {
  test('register creates user', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'u1@test.com',
      password: 'password123',
      fullName: 'User One',
    });
    expect(res.status).toBe(201);
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });

  test('login returns accessToken and sets cookie', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'u2@test.com',
      password: 'password123',
      fullName: 'User Two',
    });
    const res = await request(app).post('/api/auth/login').send({
      email: 'u2@test.com',
      password: 'password123',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.headers['set-cookie'].join(';')).toMatch(/HttpOnly/);
    expect(res.headers['set-cookie'].join(';')).toMatch(/SameSite/);
  });

  test('unauthenticated request → 401', async () => {
    const res = await request(app).get('/api/equipment');
    expect(res.status).toBe(401);
  });

  test('viewer cannot create equipment → 403', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'v@test.com',
      password: 'password123',
      fullName: 'Viewer User',
    });
    const login = await request(app).post('/api/auth/login').send({
      email: 'v@test.com',
      password: 'password123',
    });
    expect(login.status).toBe(200);
    const token = login.body.data.accessToken;

    const res = await request(app)
      .post('/api/equipment')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Equipment',
        type: 'sensor',
        serialNumber: 'SN-TEST-001',
        installedAt: '2024-01-01',
      });
    expect(res.status).toBe(403);
  });
});
