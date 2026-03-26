import { describe, it, expect, beforeEach } from 'vitest';
import { intercept } from '../src/index.js'; 

describe('Athena Interceptor', () => {
  beforeEach(() => {
    intercept.reset();
  });

  it('should intercept a basic GET request', async () => {
    const mockData = { id: 1, name: 'Athena' };
    intercept.get('https://api.example.com/data', () => mockData);

    const response = await fetch('https://api.example.com/data');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(mockData);
  });

  it('should intercept a POST request and read the body', async () => {
    // Note: marking this async to test the 'await' fix in interceptor.ts
    intercept.post('https://api.example.com/users', async (body) => {
      return { received: body.username };
    });

    const response = await fetch('https://api.example.com/users', {
      method: 'POST',
      body: JSON.stringify({ username: 'tester' }),
      headers: { 'Content-Type': 'application/json' }
    });

    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.received).toBe('tester');
  });

  it('should handle custom status codes', async () => {
    intercept.get('https://api.example.com/404', () => ({
      status: 404,
      data: { error: 'Not Found' }
    }));

    const response = await fetch('https://api.example.com/404');
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Not Found' });
  });

  it('should handle simulated delays', async () => {
    intercept.get('https://api.example.com/delay', () => ({
      data: { ok: true },
      wait: 100
    }));

    const start = Date.now();
    await fetch('https://api.example.com/delay');
    expect(Date.now() - start).toBeGreaterThanOrEqual(100);
  });

  it('should support async resolvers', async () => {
    // Explicitly use an async function as the resolver
    intercept.get('https://api.example.com/async', async () => {
        // Simulate a small internal delay inside the resolver itself
        await new Promise(resolve => setTimeout(resolve, 10));
        return { async: 'success' };
    });

    const response = await fetch('https://api.example.com/async');
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.async).toBe('success');
    });
});
