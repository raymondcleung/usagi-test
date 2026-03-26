import { setupServer } from 'msw/node';
import { http, HttpResponse, delay } from 'msw';
import { styleText } from 'node:util';

const server = setupServer();

type InterceptResolver = (body: any) => any | Promise<any>;

/**
 * Internal helper to log events when USAGI_DEBUG is enabled
 */
const emitTrace = (type: 'MOCK' | 'WARN', message: string) => {
  if (process.env.USAGI_DEBUG === 'true') {
    const timestamp = new Date().toLocaleTimeString();
    const icon = type === 'MOCK' ? '🛡️' : '⚠️';
    const color = type === 'MOCK' ? 'magenta' : 'yellow';
    console.log(`${styleText('gray', timestamp)} ${icon} [${styleText(color, type)}] ${message}`);
  }
};

const createHandler = (method: keyof typeof http) => (url: string, resolver: InterceptResolver) => {
  server.use(
    (http[method] as any)(url, async ({ request }: any) => {
      let body = {};
      try {
        const contentType = request.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          body = await request.json();
        }
      } catch {
        body = {};
      }

      const result = await resolver(body);
      
      const isAdvanced = result && (typeof result === 'object') && (result.data !== undefined || result.status !== undefined);
      const responseData = isAdvanced ? result.data : result;
      const status = isAdvanced ? (result.status || 200) : 200;

      // Log the interception
      emitTrace('MOCK', `${method.toUpperCase()} ${url} -> ${status}`);

      if (isAdvanced && result.wait) {
        await delay(result.wait);
      }

      return HttpResponse.json(responseData, { 
        status, 
        headers: isAdvanced ? result.headers : {} 
      });
    })
  );
};

export const intercept = {
  _start: () => server.listen({ 
    onUnhandledRequest: (req) => {
      const url = new URL(req.url);
      // Ignore local traffic
      if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return;
      
      emitTrace('WARN', `Unhandled outbound request: ${req.method} ${req.url}`);
    } 
  }),
  _stop: () => server.close(),
  reset: () => server.resetHandlers(),

  get: createHandler('get'),
  post: createHandler('post'),
  put: createHandler('put'),
  delete: createHandler('delete'),
  patch: createHandler('patch'),
  
  error: (url: string, status = 500, message = 'Internal Server Error') => {
    server.use(
      http.all(url, () => {
        emitTrace('MOCK', `ERROR ${url} -> Forced ${status}`);
        return HttpResponse.json({ message }, { status });
      })
    );
  }
};
