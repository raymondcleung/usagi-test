import supertest from 'supertest';
import type { Test } from 'supertest';
import { inject } from 'vitest';

declare module 'vitest' {
  export interface ProvidedContext {
    usagi: {
      baseUrl?: string;
      auth?: {
        type?: 'Bearer' | 'Basic';
        value: string | (() => string);
        header?: string;
      };
    };
  }
}

export interface UsagiTest extends Test {
  as(token: string | null, opts?: AsOptions): this;
}

export interface UsagiAgent {
  get(url: string): UsagiTest;
  post(url: string): UsagiTest;
  put(url: string): UsagiTest;
  delete(url: string): UsagiTest;
  patch(url: string): UsagiTest;
  as(token: string | null, opts?: AsOptions): UsagiAgent; 
}

interface AsOptions {
  type?: 'Bearer' | 'Basic' | 'ApiKey' | 'None';
  header?: string;
}

const resolveBaseUrl = () => {
  if (process.env.USAGI_BASE_URL) return process.env.USAGI_BASE_URL;
  
  const provided = inject('usagi');
  if (provided?.baseUrl) return provided.baseUrl;

  // Throw a clear error so the user isn't confused!
  throw new Error(
    "Usagi Error: No baseUrl provided. " +
    "Please define it in usagi.config.ts, pass it via the --baseUrl CLI flag, " +
    "or set the USAGI_BASE_URL environment variable."
  );
};

export const request = (target?: unknown): UsagiAgent => {
  // We use a fresh supertest instance per request() call to avoid state pollution.
  // We ONLY resolve the Base URL if there isn't a custom target (like an Express app).
  const agent = target ? supertest(target as any) : supertest(resolveBaseUrl());
  const globalAuth = inject('usagi')?.auth;

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

  const createMethod = (name: string) => (url: string): UsagiTest => {
    let req;
    
    // If there is no custom target (like an Express app) AND the URL is absolute
    if (!target && (url.startsWith('http://') || url.startsWith('https://'))) {
      // Create a fresh request specifically for this absolute URL, bypassing the baseUrl
      req = (supertest(url) as any)[name]('');
    } else {
      // Standard behavior: use the pre-configured agent (baseUrl or Express app target)
      req = (agent as any)[name](url);
    }

    req.as = (token: string | null, opts?: AsOptions) => applyAuth(req, token, opts);
    return applyAuth(req) as UsagiTest;
  };

  const usagiAgent: UsagiAgent = {
    as: (token: string | null, opts?: AsOptions) => {
      activeToken = token;
      activeOpts = opts;
      return usagiAgent;
    },
    get: createMethod('get'),
    post: createMethod('post'),
    put: createMethod('put'),
    delete: createMethod('delete'),
    patch: createMethod('patch'),
  };

  return usagiAgent;
};
