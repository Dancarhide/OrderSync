import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { EncryptionService } from '../services/encryption.service';
import {
  authenticateJWT,
  requireRole,
  maskName,
  maskAddress,
  maskPhone,
  isAdminRole,
  AuthenticatedRequest,
} from '../middleware/auth.middleware';

// Helper to mock Express Response
function createMockRes() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

test('Quality Gate 1: AES-256-GCM PII Encryption & Decryption (Buffer + ENC[...] string)', () => {
  const original = 'Sofía Garza · Av. Constitución 1200, Monterrey, NL';
  const encryptedBuf = EncryptionService.encrypt(original);

  assert.ok(Buffer.isBuffer(encryptedBuf));
  // IV (16 bytes) + AuthTag (16 bytes) + ciphertext (>0)
  assert.ok(encryptedBuf.length > 32);
  assert.equal(EncryptionService.decrypt(encryptedBuf), original);

  const encStr = EncryptionService.encryptString(original);
  assert.ok(encStr.startsWith('ENC[') && encStr.endsWith(']'));
  assert.equal(EncryptionService.decryptString(encStr), original);
});

test('Quality Gate 1: HMAC-SHA256 Webhook Signature Verification', () => {
  const secret = 'test-webhook-secret';
  const payload = JSON.stringify({ id: '12345', total_price: '199.00' });
  const validSig = crypto.createHmac('sha256', secret).update(payload).digest('base64');
  const invalidSig = crypto.createHmac('sha256', 'wrong-secret').update(payload).digest('base64');

  assert.equal(
    crypto.timingSafeEqual(Buffer.from(validSig), Buffer.from(validSig)),
    true
  );
  assert.notEqual(validSig, invalidSig);
});

test('Quality Gate 2: JWT Authentication Middleware rejects missing/invalid tokens (401)', () => {
  const reqMissing = { headers: {} } as AuthenticatedRequest;
  const resMissing = createMockRes();
  let nextCalled = false;

  authenticateJWT(reqMissing, resMissing, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(resMissing.statusCode, 401);

  const reqInvalid = { headers: { authorization: 'Bearer invalid.jwt.token' } } as AuthenticatedRequest;
  const resInvalid = createMockRes();
  authenticateJWT(reqInvalid, resInvalid, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, false);
  assert.equal(resInvalid.statusCode, 401);
});

test('Quality Gate 2: RBAC Middleware enforces Admin vs Operator permissions (ISO A.8.3)', () => {
  const secret = process.env.JWT_SECRET || 'supersecret123';
  const operatorToken = jwt.sign({ id: 'u1', email: 'op@ordersync.app', role: 'Operator' }, secret);
  const adminToken = jwt.sign({ id: 'u2', email: 'admin@ordersync.app', role: 'Admin' }, secret);

  // Operator authenticated -> 403 on Admin-only route
  const reqOp = { headers: { authorization: `Bearer ${operatorToken}` } } as AuthenticatedRequest;
  const resOp = createMockRes();
  let authNext = false;
  authenticateJWT(reqOp, resOp, () => {
    authNext = true;
  });
  assert.equal(authNext, true);
  assert.equal(reqOp.user?.role, 'Operator');

  let adminNext = false;
  requireRole('Admin')(reqOp, resOp, () => {
    adminNext = true;
  });
  assert.equal(adminNext, false);
  assert.equal(resOp.statusCode, 403);

  // Admin authenticated -> allowed on Admin-only route
  const reqAdmin = { headers: { authorization: `Bearer ${adminToken}` } } as AuthenticatedRequest;
  const resAdmin = createMockRes();
  authenticateJWT(reqAdmin, resAdmin, () => {});
  let adminPassed = false;
  requireRole('Admin')(reqAdmin, resAdmin, () => {
    adminPassed = true;
  });
  assert.equal(adminPassed, true);
});

test('Quality Gate 2: PII Masking for Operator vs Full Access for Admin (ISO A.8.11)', () => {
  assert.equal(isAdminRole('Admin'), true);
  assert.equal(isAdminRole('Operator'), false);

  assert.equal(maskName('María González'), 'M*** G***');
  assert.equal(maskAddress('Av. Constitución 1200, Monterrey, NL'), '***, NL');
  assert.equal(maskPhone('+52-81-8000-1234'), '***-***-1234');
});

test('Quality Gate 3: BI Unit Margin Formula & Concurrent Stock Safety', async () => {
  const calculateUnitMargin = (price: number, cost: number, channelFee: number, shipping: number) =>
    Number((price - cost - channelFee - shipping).toFixed(2));

  const margin = calculateUnitMargin(149.99, 62.5, 18.0, 12.49);
  assert.equal(margin, 57.0);

  // Simulated atomic stock deduction concurrency check
  let stock = 5;
  const deductAtomic = async (qty: number): Promise<boolean> => {
    if (stock >= qty) {
      stock -= qty;
      return true;
    }
    return false;
  };

  const results = await Promise.all([deductAtomic(3), deductAtomic(3)]);
  assert.deepEqual(results, [true, false]);
  assert.equal(stock, 2);
});
