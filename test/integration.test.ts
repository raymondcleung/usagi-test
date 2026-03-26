import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express, { Request, Response } from 'express';
import { request } from '../src/utils/network.js';
import { Server } from 'node:http';

describe('Athena Integration: BaseURL Logic', () => {
  let server: Server;
  let baseUrl: string;
  const originalEnvUrl = process.env.ATHENA_BASE_URL; // Save original state

  beforeAll(async () => {
    // Explicitly add <void> to the Promise constructor
    return new Promise<void>((resolve) => {
      const app = express();
      
      app.get('/health', (_req: Request, res: Response) => {
        res.status(200).json({ status: 'ok' });
      });
      
      const runningServer = app.listen(0, () => {
        const address = runningServer.address();
        if (address && typeof address !== 'string') {
          baseUrl = `http://localhost:${address.port}`;
          
          // Ensure the network helper finds the dynamic port
          process.env.ATHENA_BASE_URL = baseUrl;
        }
        server = runningServer;
        resolve(); // Now resolve() can be called without arguments
      });
    });
  });

  afterAll(() => {
    // Restore original environment state
    process.env.ATHENA_BASE_URL = originalEnvUrl;
    if (server) server.close();
  });

  it('should automatically use the baseUrl from config when no target is passed', async () => {
    // This will now correctly resolve the dynamic port from process.env
    const res = await request().get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('should allow overriding the baseUrl by passing a specific target', async () => {
    const app2 = express();
    app2.get('/override', (_req: Request, res: Response) => {
      res.sendStatus(201);
    });

    // Passing an explicit target bypasses baseUrl logic entirely
    const res = await request(app2).get('/override');
    expect(res.status).toBe(201);
  });
});
