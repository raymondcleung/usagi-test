import { test, expect, describe, beforeEach, afterEach } from 'vitest';
import { request, intercept } from '../src/index.js';
import express from 'express';

describe('Architecture: Base URL Priority & Target Resolution', () => {
  const originalEnv = process.env.USAGI_BASE_URL;

  beforeEach(() => {
    intercept.reset();
  });

  afterEach(() => {
    if (originalEnv) {
      process.env.USAGI_BASE_URL = originalEnv;
    } else {
      delete process.env.USAGI_BASE_URL;
    }
  });

  test('CLI properly injects the resolved Base URL into the environment', async () => {
    // bin.ts calculates priority and sets this before tests run
    process.env.USAGI_BASE_URL = 'https://priority.com';

    intercept.get('https://priority.com/check', () => {
      return { status: 200, data: { source: 'environment' } };
    });

    const res = await request().get('/check');
    
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('environment');
  });

  test('Throws a clear, helpful error when no Base URL is configured', () => {
    // Ensure the environment variable is completely empty
    delete process.env.USAGI_BASE_URL;

    // request() should throw immediately before even making a network call
    expect(() => request().get('/check')).toThrow(
      /Usagi Error: No baseUrl provided/
    );
  });

  test('Express Target overrides ALL Base URL requirements (The Fix!)', async () => {
    delete process.env.USAGI_BASE_URL;

    const app = express();
    app.get('/local-check', (req, res) => res.json({ source: 'local-app' }));

    const res = await request(app).get('/local-check');
    
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('local-app');
  });
});
