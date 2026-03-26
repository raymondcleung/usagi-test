# 🚀 Athena

**The Zero-Config API Integration Testing Suite for Node.js.**

Athena is a high-performance, batteries-included testing SDK built on top of **Vitest** and **Supertest**. It eliminates "decision fatigue" by providing a unified entry point for API assertions, smart retries, and network interception.

## 🌟 Why Athena?

Modern Node.js testing often requires manual wiring of multiple libraries. Athena solves this by offering:

* **Unified API**: `import { test, expect, request, retry, waitUntil, sleep, faker, intercept } from 'athena-test'`—one import to rule them all.
* **Zero-Config Startup**: Get a professional testing environment running in seconds with `npx athena init`.
* **Identity Swapping**: Effortlessly switch between User, Admin, or Guest roles using the `.as()` helper.
* **Network Interception**: Built-in mocking of 3rd-party APIs (Stripe, GitHub) at the network level using MSW.
* **Smart Resilience**: Built-in `retry`, `waitUntil`, and `sleep` utilities to handle eventual consistency and async operations.

---

## ⚙️ Global Configuration

Create an `athena.config.ts` in your root directory to set your environment defaults. Athena automatically injects these into your test workers.

```typescript
import { defineConfig } from 'athena-test/config';

export default defineConfig({
  athena: {
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
Athena follows a strict priority logic to determine which headers are sent:

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

### 2. Athena Trace (Debug Mode)
Stop guessing why your tests are failing. Athena provides a terminal-based "Live Trace" that visualizes every network event.
```bash
npx athena --debug
```
**Output includes:**
* 🛡️ **[MOCK]**: Visible confirmation when an outbound call is intercepted.
* 🔄 **[RETRY]**: Real-time logs of polling attempts and backoff delays.
* ⚠️ **[WARN]**: Alerts for unhandled outbound requests to external domains.

### 4. Smart Resilience & Time Utilities
Athena provides built-in utilities for handling eventual consistency and asynchronous operations.

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
Generate realistic test data without external dependencies. Athena embeds `@faker-js/faker` for instant access—no additional setup required.

```typescript
import { test, expect, request, faker } from 'athena-test';

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
npm install athena-test --save-dev
```

### 2. Initialize
```bash
npx athena init
```

### 3. AI-Powered Developer Experience
Generate a context file for LLMs (like Claude or ChatGPT) to make them experts in writing Athena tests.
```bash
npx athena skill
```

### 4. Run Tests
```bash
# Normal run (watch mode by default)
npx athena

# Run once, non-watch
npx athena --run
# or
npx athena run

# Watch mode (explicit)
npx athena --watch
# or  
npx athena watch

# With Vitest options
npx athena --json             # JSON output
npx athena -t="SMOKE"         # Filter by test name
npx athena --coverage         # With coverage
npx athena --debug            # Enable Athena trace logging

# Show all available options
npx athena --help
```

**Note**: Athena requires **Pure ESM Mode**. Ensure your `package.json` contains `"type": "module"`.

---

## 📊 Test Reports & Logs
Athena leverages Vitest's native reporting engine. To generate a static report in your root directory:

```bash
npx athena --reporter=json --outputFile=./logs/results.json
```

For a complete list of supported Vitest options, run:
```bash
npx athena --help
```

---

## 🏗️ Architectural Philosophy
Built with 15+ years of software delivery experience, Athena follows:
* **Inversion of Control**: Global configuration injection via Vitest `provide` for environment-agnostic tests.
* **Stateful Chaining**: The `AthenaAgent` allows for fluent, readable test scripts.
* **Network Interception**: Modern, port-free mocking via MSW.

---

## 👨‍💻 About the Author
I am a seasoned Software Engineer in Test with over 15 years of experience. **Athena** is a demonstration of my commitment to high-quality test automation and clean code architecture.
