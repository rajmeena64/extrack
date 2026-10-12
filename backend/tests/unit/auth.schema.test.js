const assert = require('assert');
const { signupSchema, loginSchema } = require('../../src/domains/auth/auth.schema');
const authService = require('../../src/domains/auth/auth.service');
const jwt = require('jsonwebtoken');
const env = require('../../src/core/config/env');

function testSchemas() {
  const validSignup = signupSchema.safeParse({
    email: 'trader@example.com',
    password: 'password1234',
    firstName: 'John'
  });
  assert.strictEqual(validSignup.success, true);

  const invalidSignup = signupSchema.safeParse({
    email: 'not-an-email',
    password: 'short'
  });
  assert.strictEqual(invalidSignup.success, false);

  const validLogin = loginSchema.safeParse({
    email: 'trader@example.com',
    password: 'password1234'
  });
  assert.strictEqual(validLogin.success, true);
}

function testTokenSigning() {
  const token = authService.signAccessToken(123);
  assert.strictEqual(typeof token, 'string');

  const decoded = jwt.verify(token, env.jwt.accessSecret);
  assert.strictEqual(decoded.userId, 123);
}

function run() {
  testSchemas();
  testTokenSigning();
}

run();
