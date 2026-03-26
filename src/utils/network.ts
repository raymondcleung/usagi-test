import supertest from 'supertest';
import type { Test } from 'supertest';
import { inject } from 'vitest';

declare module 'vitest' {
  export interface ProvidedContext {
    athena: {
      baseUrl?: string;
      auth?: {
        type?: 'Bearer' | 'Basic';
        value: string | (() => string);
        header?: string;
      };
    };
  }
}

export interface AthenaTest extends Test {
  as(token: string | null, opts?: AsOptions): this;
}

export interface AthenaAgent {
  get(url: string): AthenaTest;
  post(url: string): AthenaTest;
  put(url: string): AthenaTest;
  delete(url: string): AthenaTest;
  patch(url: string): AthenaTest;
  as(token: string | null, opts?: AsOptions): AthenaAgent; 
}

interface AsOptions {
  type?: 'Bearer' | 'Basic' | 'ApiKey' | 'None';
  header?: string;
}

const resolveBaseUrl = () => {
  if (process.env.ATHENA_BASE_URL) return process.env.ATHENA_BASE_URL;
  const provided = inject('athena');
  return provided?.baseUrl || 'http://localhost:3000';
};

export const request = (target?: unknown): AthenaAgent => {
  const baseUrl = resolveBaseUrl();
  // We use a fresh supertest instance per request() call to avoid state pollution
  const agent = target ? supertest(target as any) : supertest(baseUrl);
  const globalAuth = inject('athena')?.auth;

  let activeToken: string | null | undefined;
  let activeOpts: AsOptions | undefined;

  const applyAuth = (req: any, token?: string | null, opts?: AsOptions) => {
    const t = token !== undefined ? token : activeToken;
    const o = opts || activeOpts;

    // 1. If explicitly set to null or 'None', return immediately (clean request)
    if (t === null || o?.type === 'None') {
      return req;
    }

    // 2. Use token from .as()
    if (t) {
      const type = o?.type || 'Bearer';
      const header = o?.header || 'Authorization';
      const prefix = type === 'Bearer' ? 'Bearer ' : '';
      return req.set(header, `${prefix}${t}`);
    }

    // 3. Use Global Auth only if no local token was attempted
    if (globalAuth && t === undefined) {
      const type = globalAuth.type || 'Bearer';
      const prefix = type === 'Bearer' ? 'Bearer ' : '';
      const value = typeof globalAuth.value === 'function' ? globalAuth.value() : globalAuth.value;
      const header = globalAuth.header || 'Authorization';
      return req.set(header, `${prefix}${value}`);
    }

    return req;
  };

  const createMethod = (name: string) => (url: string): AthenaTest => {
    const req = (agent as any)[name](url);
    req.as = (token: string | null, opts?: AsOptions) => applyAuth(req, token, opts);
    return applyAuth(req) as AthenaTest;
  };

  const athenaAgent: AthenaAgent = {
    as: (token: string | null, opts?: AsOptions) => {
      activeToken = token;
      activeOpts = opts;
      return athenaAgent;
    },
    get: createMethod('get'),
    post: createMethod('post'),
    put: createMethod('put'),
    delete: createMethod('delete'),
    patch: createMethod('patch'),
  };

  return athenaAgent;
};
