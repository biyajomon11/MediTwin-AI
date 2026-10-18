import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import express from 'express';
import authRouter from './routes/auth';

const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

async function runTests() {
  console.log('=============================================================');
  console.log('  MEDITWIN AI — FORGOT & RESET PASSWORD INTEGRATION TESTS');
  console.log('=============================================================');

  const server = app.listen(5099);

  try {
    const testIdentifier = 'Jolda00';
    console.log(`\n1. Requesting password recovery for identifier "${testIdentifier}"...`);

    const forgotRes = await fetch('http://localhost:5099/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: testIdentifier }),
    });

    const forgotData = await forgotRes.json();
    console.log('Response Status:', forgotRes.status);
    console.log('Response Data:', forgotData);

    if (!forgotRes.ok || !forgotData.success || !forgotData.code) {
      throw new Error(`Forgot password failed: ${JSON.stringify(forgotData)}`);
    }
    console.log(`✅ [PASS] Recovery code generated: ${forgotData.code} for ${forgotData.emailMasked}`);

    // 2. Test code verification
    console.log('\n2. Verifying recovery code...');
    const verifyRes = await fetch('http://localhost:5099/api/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: testIdentifier, code: forgotData.code }),
    });
    const verifyData = await verifyRes.json();
    if (!verifyRes.ok || !verifyData.success) {
      throw new Error(`Code verification failed: ${JSON.stringify(verifyData)}`);
    }
    console.log('✅ [PASS] Verification code confirmed.');

    // 3. Test password reset
    const newPassword = 'DoctorPass@123New';
    console.log(`\n3. Submitting new password "${newPassword}"...`);
    const resetRes = await fetch('http://localhost:5099/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testIdentifier,
        code: forgotData.code,
        newPassword,
      }),
    });
    const resetData = await resetRes.json();
    console.log('Reset Response Status:', resetRes.status);
    console.log('Reset Response Data:', resetData);

    if (!resetRes.ok || !resetData.success) {
      throw new Error(`Reset password failed: ${JSON.stringify(resetData)}`);
    }
    console.log('✅ [PASS] Password reset successfully.');

    // 4. Test login with identifier Jolda00 and new password
    console.log(`\n4. Testing login with identifier "${testIdentifier}" and new password...`);
    const loginRes = await fetch('http://localhost:5099/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testIdentifier, password: newPassword }),
    });
    const loginData = await loginRes.json();
    console.log('Login Status:', loginRes.status);
    console.log('Login User:', loginData.user?.email, '| Role:', loginData.user?.role);

    if (!loginRes.ok || !loginData.success || !loginData.token) {
      throw new Error(`Login failed with new password: ${JSON.stringify(loginData)}`);
    }
    console.log('✅ [PASS] Login succeeded with new password and JWT issued.');

    console.log('\n=============================================================');
    console.log('  ALL FORGOT & RESET PASSWORD BACKEND TESTS PASSED (4/4)!');
    console.log('=============================================================\n');
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
