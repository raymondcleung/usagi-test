# 🚀 Usagi

**The Zero-Config API Integration Testing Suite for Node.js.**

Usagi is a high-performance, batteries-included testing SDK built on top of **Vitest** and **Supertest**. It eliminates "decision fatigue" by providing a unified entry point for API assertions, smart retries, and network interception.

## 🌟 Why Usagi?

Modern Node.js testing often requires manual wiring of multiple libraries. Usagi solves this by offering:

* **Unified API**: `import { test, expect, request, retry, waitUntil, sleep, faker, intercept } from 'usagi-test'`—one import to rule them all.
* **Zero-Config Startup**: Get a professional testing environment running in seconds with `npx usagi init`.
* **Identity Swapping**: Effortlessly switch between User, Admin, or Guest roles using the `.as()` helper.
* **Network Interception**: Built-in mocking of 3rd-party APIs (Stripe, GitHub) at the network level using MSW.
* **Smart Resilience**: Built-in `retry`, `waitUntil`, and `sleep` utilities to handle eventual consistency and async operations.

---

## ⚙️ Global Configuration

Create an `usagi.config.ts` in your root directory to set your environment defaults. Usagi automatically injects these into your test workers.

```typescript
import { defineConfig } from 'usagi-test/config';

export default defineConfig({
  usagi: {
    baseUrl: '[https://jsonplaceholder.typicode.com](https://jsonplaceholder.typicode.com)',
    auth: {
      type: 'Bearer',
      value: 'my-global-admin-token-123', // Applies to all request() calls by default
      header: 'Authorization'
    }
  }
});
```

---

## 🛠️ Key Features

### 1. Identity & Auth Priority
Usagi follows a strict priority logic to determine which headers are sent:

1. **Global Auth**: Applied automatically from config if no local override exists.
2. **`.as(token)`**: Overwrites global auth for that specific request chain.
3. **`.as(null)`**: **The Clean Request Fix.** Explicitly strips all authentication headers. This is required for public APIs (like ReqRes) that return `403 Forbidden` when receiving unexpected Bearer tokens.

```typescript
// 1. Uses Global Admin Token from config
await request().get('/settings'); 

// 2. Overrides Global Auth with a specific user
await request().as('user-123-token').get('/profile'); 

// 3. Sends NO Authorization header (Required for clean/public APIs)
await request().as(null).get('/public/users'); 
```

### 2. Usagi Trace (Debug Mode)
Stop guessing why your tests are failing. Usagi provides a terminal-based "Live Trace" that visualizes every network event.
```bash
npx usagi --debug
```
**Output includes:**
* 🛡️ **[MOCK]**: Visible confirmation when an outbound call is intercepted.
* 🔄 **[RETRY]**: Real-time logs of polling attempts and backoff delays.
* ⚠️ **[WARN]**: Alerts for unhandled outbound requests to external domains.

### 4. Smart Resilience & Time Utilities
Usagi provides built-in utilities for handling eventual consistency and asynchronous operations.

**Default Values:**
- `retry()`: 3 retries with delays [1000, 2000, 5000]ms
- `waitUntil()`: 5000ms timeout, 100ms interval
- `sleep()`: No default, requires duration in ms

```typescript
// Retry with defaults (3 attempts, exponential backoff)
await retry(async () => {
  const res = await request().get('/api/status');
  if (res.body.status !== 'ready') throw new Error('Not ready');
  return res;
});

// Retry with custom options
await retry(async () => {
  const res = await request().get('/api/status');
  if (res.body.status !== 'ready') throw new Error('Not ready');
  return res;
}, { retries: 5, delays: [1000, 2000, 4000] });

// Wait for condition with defaults (5s timeout, 100ms checks)
await waitUntil(() => {
  return request().get('/api/health').then(res => res.body.migrated);
});

// Wait for condition with custom timeout
await waitUntil(() => {
  return request().get('/api/health').then(res => res.body.migrated);
}, { timeout: 30000, interval: 500 });

// Simple sleep utility
await sleep(2000); // or await wait(2000);
```

### 5. Embedded Faker for Test Data
Generate realistic test data without external dependencies. Usagi embeds `@faker-js/faker` for instant access—no additional setup required.

```typescript
import { test, expect, request, faker } from 'usagi-test';

// Basic faker usage - works out of the box
test('create user with minimal data', async () => {
  const userData = {
    name: faker.person.fullName(),
    email: faker.internet.email()
  };

  const res = await request().post('/users').send(userData);
  expect(res.status).toBe(201);
});

// Advanced faker with realistic data
test('create user with comprehensive data', async () => {
  const userData = {
    name: faker.person.fullName(),
    email: faker.internet.email(),
    address: {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      zipCode: faker.location.zipCode()
    },
    bio: faker.lorem.sentence(),
    age: faker.number.int({ min: 18, max: 80 })
  };

  const res = await request().post('/users').send(userData);
  expect(res.status).toBe(201);
  expect(res.body.email).toBe(userData.email);
});

// Faker for various data types
test('generate diverse test data', async () => {
  const product = {
    name: faker.commerce.productName(),
    price: faker.commerce.price(),
    description: faker.commerce.productDescription(),
    company: faker.company.name(),
    phone: faker.phone.number()
  };

  const res = await request().post('/products').send(product);
  expect(res.body.price).toBe(product.price);
});
```

---

## 🚀 Getting Started

### 1. Installation
```bash
npm install usagi-test --save-dev
```

### 2. Initialize
```bash
npx usagi init
```

### 3. AI-Powered Developer Experience
Generate a context file for LLMs (like Claude or ChatGPT) to make them experts in writing Usagi tests.
```bash
npx usagi skill
```

### 4. Run Tests
```bash
# Normal run (watch mode by default)
npx usagi

# Run once, non-watch
npx usagi --run
# or
npx usagi run

# Watch mode (explicit)
npx usagi --watch
# or  
npx usagi watch

# With Vitest options
npx usagi --json             # JSON output
npx usagi -t="SMOKE"         # Filter by test name
npx usagi --coverage         # With coverage
npx usagi --debug            # Enable Usagi trace logging

# Show all available options
npx usagi --help
```

**Note**: Usagi requires **Pure ESM Mode**. Ensure your `package.json` contains `"type": "module"`.

---

## 📊 Test Reports & Logs
Usagi leverages Vitest's native reporting engine. To generate a static report in your root directory:

```bash
npx usagi --reporter=json --outputFile=./logs/results.json
```

For a complete list of supported Vitest options, run:
```bash
npx usagi --help
```

---

## 🏗️ Architectural Philosophy
Built with 15+ years of software delivery experience, Usagi follows:
* **Inversion of Control**: Global configuration injection via Vitest `provide` for environment-agnostic tests.
* **Stateful Chaining**: The `UsagiAgent` allows for fluent, readable test scripts.
* **Network Interception**: Modern, port-free mocking via MSW.

---

## 👨‍💻 About the Author
I am a seasoned Software Engineer in Test with over 15 years of experience. **Usagi** is a demonstration of my commitment to high-quality test automation and clean code architecture.
