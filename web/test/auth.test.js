import test from 'node:test';
import assert from 'node:assert/strict';
import { createToken, hashPassword, readToken, verifyPassword } from '../lib/auth.js';

test('password hashes are verified without exposing the password', async () => {
  const hash = await hashPassword('strong passphrase');
  assert.notEqual(hash, 'strong passphrase');
  assert.equal(await verifyPassword('strong passphrase', hash), true);
  assert.equal(await verifyPassword('wrong passphrase', hash), false);
});

test('signed tokens cannot be modified', () => {
  const token = createToken('user-id', 'test-secret');
  assert.equal(readToken(token, 'test-secret').sub, 'user-id');
  assert.equal(readToken(`${token}x`, 'test-secret'), null);
});
