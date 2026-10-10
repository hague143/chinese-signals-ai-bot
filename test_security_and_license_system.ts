// test_security_and_license_system.ts

import { AuthService, rateLimiter } from './src/server/auth';
import { LicenseDB } from './src/server/db';
import validateKeyHandler from './api/validate-key';
import adminKeysHandler from './api/admin/keys';
import signalsHandler from './api/signals';

function mockReqRes(method: string, body: any = {}, headers: Record<string, string> = {}, query: Record<string, string> = {}) {
  const req: any = {
    method,
    body,
    headers,
    query,
    socket: { remoteAddress: '127.0.0.1' },
  };

  let statusCode = 200;
  let responseData: any = null;
  const responseHeaders: Record<string, string> = {};

  const res: any = {
    setHeader(name: string, value: string) {
      responseHeaders[name.toLowerCase()] = value;
    },
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: any) {
      responseData = data;
      return res;
    },
    end(data?: any) {
      if (data && typeof data === 'string') {
        try { responseData = JSON.parse(data); } catch { responseData = data; }
      }
    },
  };

  return { req, res, getResult: () => ({ statusCode, responseData, responseHeaders }) };
}

async function runTests() {
  console.log('--- STARTING SECURITY & LICENSE AUTH SYSTEM TESTS ---');

  // Test 1: Key Generation Format & Entropy
  const generatedKey = AuthService.generateLicenseKey();
  console.log('1. Generated Key:', generatedKey);
  const keyPattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  if (!keyPattern.test(generatedKey)) {
    throw new Error('Key generation does not match format XXXX-XXXX-XXXX-XXXX: ' + generatedKey);
  }
  console.log('✓ Key format verified');

  // Test 2: In-Memory DB has no hardcoded test keys initially
  const initialKeys = await LicenseDB.getAll();
  console.log(`2. Initial Keys in DB: ${initialKeys.length}`);
  if (initialKeys.length !== 0) {
    throw new Error('Initial keys should be empty in clean DB, but found: ' + initialKeys.length);
  }
  console.log('✓ In-memory database has zero hardcoded keys');

  // Test 3: Admin API requires ADMIN_PASSWORD
  delete process.env.ADMIN_PASSWORD;
  const { req: adminReq1, res: adminRes1, getResult: getAdminRes1 } = mockReqRes('GET');
  await adminKeysHandler(adminReq1, adminRes1);
  const adminRes1Result = getAdminRes1();
  if (adminRes1Result.statusCode !== 500 || !adminRes1Result.responseData?.error?.includes('Server not configured')) {
    throw new Error('Expected 500 Server not configured when ADMIN_PASSWORD missing, got: ' + JSON.stringify(adminRes1Result));
  }
  console.log('✓ Missing ADMIN_PASSWORD properly returns 500 Server not configured');

  // Set ADMIN_PASSWORD for subsequent admin tests
  process.env.ADMIN_PASSWORD = 'test-secure-admin-pass-999';

  // Admin authorization failure check
  const { req: adminReq2, res: adminRes2, getResult: getAdminRes2 } = mockReqRes('GET', {}, { authorization: 'Bearer wrong-pass' });
  await adminKeysHandler(adminReq2, adminRes2);
  const adminRes2Result = getAdminRes2();
  if (adminRes2Result.statusCode !== 401) {
    throw new Error('Expected 401 Unauthorized for bad admin pass, got: ' + adminRes2Result.statusCode);
  }
  console.log('✓ Unauthorized admin access rejected with 401');

  // Create key via Admin API
  const { req: createReq, res: createRes, getResult: getCreateRes } = mockReqRes(
    'POST',
    { durationDays: 30, note: 'Customer Alpha' },
    { 'x-admin-password': 'test-secure-admin-pass-999' }
  );
  await adminKeysHandler(createReq, createRes);
  const createResult = getCreateRes();
  if (createResult.statusCode !== 201 || !createResult.responseData?.key?.key) {
    throw new Error('Failed to create key via Admin API: ' + JSON.stringify(createResult));
  }
  const createdLicenseKey = createResult.responseData.key.key;
  console.log('✓ Admin successfully created license key:', createdLicenseKey);

  // Test 4: Missing JWT_SECRET throws error
  delete process.env.JWT_SECRET;
  let jwtErrorCaught = false;
  try {
    AuthService.getJwtSecret();
  } catch (err: any) {
    if (err.message.includes('Server not configured: Missing JWT_SECRET')) {
      jwtErrorCaught = true;
    }
  }
  if (!jwtErrorCaught) {
    throw new Error('AuthService.getJwtSecret() should throw when JWT_SECRET missing');
  }
  console.log('✓ Missing JWT_SECRET properly throws Server not configured');

  process.env.JWT_SECRET = 'super-secret-jwt-test-key-2026';

  // Test 5: First Activation on Device A binds device_id and sets httpOnly cookie
  const deviceA = 'device-uuid-aaa-111';
  const { req: valReqA, res: valResA, getResult: getValResA } = mockReqRes('POST', {
    key: createdLicenseKey,
    deviceId: deviceA,
    fingerprint: 'fp-mac-safari-1',
  });
  await validateKeyHandler(valReqA, valResA);
  const valResultA = getValResA();
  if (valResultA.statusCode !== 200 || !valResultA.responseHeaders['set-cookie']) {
    throw new Error('Activation failed for Device A: ' + JSON.stringify(valResultA));
  }
  console.log('✓ Device A activated license successfully. Cookie received:', valResultA.responseHeaders['set-cookie'].split(';')[0]);

  // Test 6: Rejection on Device B (Device mismatch)
  const deviceB = 'device-uuid-bbb-222';
  const { req: valReqB, res: valResB, getResult: getValResB } = mockReqRes('POST', {
    key: createdLicenseKey,
    deviceId: deviceB,
    fingerprint: 'fp-win-chrome-2',
  });
  await validateKeyHandler(valReqB, valResB);
  const valResultB = getValResB();
  if (valResultB.statusCode !== 403 || !valResultB.responseData?.error?.includes('another device')) {
    throw new Error('Expected 403 device mismatch for Device B, got: ' + JSON.stringify(valResultB));
  }
  console.log('✓ Device B rejected with device mismatch error');

  // Test 7: Protected Route /api/signals without auth returns 401
  const { req: sigReqNoAuth, res: sigResNoAuth, getResult: getSigNoAuth } = mockReqRes('GET', {}, {}, { symbol: 'EUR/USD OTC' });
  await signalsHandler(sigReqNoAuth, sigResNoAuth);
  const sigNoAuthResult = getSigNoAuth();
  if (sigNoAuthResult.statusCode !== 401) {
    throw new Error('Protected route /api/signals did not reject unauthenticated request: ' + sigNoAuthResult.statusCode);
  }
  console.log('✓ Unauthenticated request to /api/signals rejected with 401');

  // Test 8: Protected Route /api/signals with valid Cookie & deviceId returns 200 and signal
  const authCookie = valResultA.responseHeaders['set-cookie'].split(';')[0];
  const { req: sigReqAuth, res: sigResAuth, getResult: getSigAuth } = mockReqRes(
    'GET',
    {},
    { cookie: authCookie, 'x-device-id': deviceA },
    { symbol: 'EUR/USD OTC' }
  );
  await signalsHandler(sigReqAuth, sigResAuth);
  const sigAuthResult = getSigAuth();
  if (sigAuthResult.statusCode !== 200 || !sigAuthResult.responseData?.signal) {
    throw new Error('Protected route /api/signals failed with valid auth: ' + JSON.stringify(sigAuthResult));
  }
  console.log('✓ Authenticated request to /api/signals succeeded with signal:', sigAuthResult.responseData.signal.direction, 'confidence:', sigAuthResult.responseData.signal.confidence);

  // Test 9: Admin Reset Device allows Device B to activate
  const { req: resetReq, res: resetRes, getResult: getResetRes } = mockReqRes(
    'PATCH',
    { key: createdLicenseKey, action: 'reset_device' },
    { 'x-admin-password': 'test-secure-admin-pass-999' }
  );
  await adminKeysHandler(resetReq, resetRes);
  const resetResult = getResetRes();
  if (resetResult.statusCode !== 200) {
    throw new Error('Admin reset device failed: ' + JSON.stringify(resetResult));
  }
  console.log('✓ Admin reset device binding successfully');

  // Device B can now activate
  const { req: valReqB2, res: valResB2, getResult: getValResB2 } = mockReqRes('POST', {
    key: createdLicenseKey,
    deviceId: deviceB,
  });
  await validateKeyHandler(valReqB2, valResB2);
  const valResultB2 = getValResB2();
  if (valResultB2.statusCode !== 200) {
    throw new Error('Device B failed to activate after reset: ' + JSON.stringify(valResultB2));
  }
  console.log('✓ Device B activated successfully after device reset');

  // Test 10: Admin Revoke
  const { req: revokeReq, res: revokeRes, getResult: getRevokeRes } = mockReqRes(
    'PATCH',
    { key: createdLicenseKey, action: 'revoke' },
    { 'x-admin-password': 'test-secure-admin-pass-999' }
  );
  await adminKeysHandler(revokeReq, revokeRes);
  const revokeResult = getRevokeRes();
  if (revokeResult.statusCode !== 200) {
    throw new Error('Admin revoke failed: ' + JSON.stringify(revokeResult));
  }
  console.log('✓ Key revoked by admin');

  // Revoked key validation rejected
  const { req: valReqRevoked, res: valResRevoked, getResult: getValResRevoked } = mockReqRes('POST', {
    key: createdLicenseKey,
    deviceId: deviceB,
  });
  await validateKeyHandler(valReqRevoked, valResRevoked);
  const valResultRevoked = getValResRevoked();
  if (valResultRevoked.statusCode !== 403 || !valResultRevoked.responseData?.error?.includes('revoked')) {
    throw new Error('Revoked key validation should return 403 revoked, got: ' + JSON.stringify(valResultRevoked));
  }
  console.log('✓ Revoked key successfully rejected on validate-key');

  // Test 11: Production environment without Supabase config throws error
  const origNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  let prodErrorThrown = false;
  try {
    LicenseDB.getSupabaseClient();
  } catch (err: any) {
    if (err.message.includes('Server not configured: Missing required Supabase environment variables in production')) {
      prodErrorThrown = true;
    }
  }
  process.env.NODE_ENV = origNodeEnv;
  if (!prodErrorThrown) {
    throw new Error('LicenseDB should throw when Supabase credentials missing in production mode');
  }
  console.log('✓ Production mode correctly blocks execution when Supabase credentials are missing');

  console.log('\n========================================');
  console.log('ALL 11 SECURITY & LICENSE TESTS PASSED!');
  console.log('========================================\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
