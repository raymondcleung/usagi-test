import { test, expect, request } from '../src/index.js'; // Use local source
import express from 'express';

// 1. Create a "Mock API" inside the test to verify Usagi's behavior
const app = express();
app.use(express.json());

// Mock database
let users: any[] = [];

app.post('/api/users', (req, res) => {
  const auth = req.headers.authorization;
  if (auth !== 'Bearer secret-admin-token') return res.status(401).send();
  
  const newUser = { id: 1, ...req.body, token: 'user-jwt-xyz' };
  users.push(newUser);
  res.status(201).json(newUser);
});

app.put('/api/users/:id', (req, res) => {
  const auth = req.headers.authorization;
  // Verify that Usagi correctly injected the NEW user's token
  if (auth !== 'Bearer user-jwt-xyz') return res.status(401).send();
  
  res.status(200).json({ ...req.body, id: req.params.id });
});

// 2. The Test Case
test('Unit Test: User Lifecycle via Mock App', async () => {
  const superuserToken = 'secret-admin-token';
  const createPayload = { username: 'jdoe', email: 'jdoe@example.com' };
  const updatePayload = { email: 'john.doe.updated@example.com' };

  // Pass 'app' directly to request() to run as a Unit Test
  const usagi = request(app);

  // Step 2: Create User
  const createRes = await usagi
    .as(superuserToken)
    .post('/api/users')
    .send(createPayload);

  expect(createRes.status).toBe(201);
  const newUser = createRes.body;

  // Step 3: Update Self
  const updateRes = await usagi
    .as(newUser.token)
    .put(`/api/users/${newUser.id}`)
    .send(updatePayload);

  expect(updateRes.status).toBe(200);
  expect(updateRes.body.email).toBe(updatePayload.email);
});
