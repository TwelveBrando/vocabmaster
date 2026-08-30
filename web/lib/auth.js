import crypto from 'node:crypto';

const b64url = (value) => Buffer.from(value).toString('base64url');
const safeEqual = (a, b) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

export const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const hashPassword = (password) => new Promise((resolve, reject) => {
  const salt = crypto.randomBytes(16).toString('hex');
  crypto.scrypt(password, salt, 64, (error, hash) => error ? reject(error) : resolve(`scrypt$${salt}$${hash.toString('hex')}`));
});

export const verifyPassword = (password, stored) => new Promise((resolve, reject) => {
  const [algorithm, salt, expected] = String(stored).split('$');
  if (algorithm !== 'scrypt' || !salt || !expected) return resolve(false);
  crypto.scrypt(password, salt, 64, (error, hash) => {
    if (error) return reject(error);
    resolve(safeEqual(hash.toString('hex'), expected));
  });
});

export const createToken = (userId, secret) => {
  const payload = { sub: userId, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 };
  const head = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${signature}`;
};

export const readToken = (token, secret) => {
  const [head, body, signature] = String(token || '').split('.');
  if (!head || !body || !signature) return null;
  const expected = crypto.createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url');
  if (!safeEqual(signature, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return payload.sub && payload.exp > Math.floor(Date.now() / 1000) ? payload : null;
  } catch { return null; }
};
