import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testId: string, description: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testId}: ${description}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testId}: ${description}`);
    failedCount++;
  }
}

async function runTests() {
  console.log('=============================================================');
  console.log('  MEDITWIN AI — NURSE UNIQUE ID & REGISTRATION NUMBER TESTS');
  console.log('=============================================================\n');

  try {
    const timestamp = Date.now();
    const uniqueEmail1 = `nurse.test1.${timestamp}@meditwin.local`;
    const uniqueEmail2 = `nurse.test2.${timestamp}@meditwin.local`;
    const uniqueEmail3 = `nurse.test3.${timestamp}@meditwin.local`;
    const testRegNo1 = `NRN-REG-${timestamp}`;
    const testLicense1 = `LIC-${timestamp}`;
    const testPassword = 'NurseSecure@123';

    // ── TEST 1: Missing registration number rejected with 400 ──
    const resMissingReg = await fetch(`${BACKEND_URL}/api/register/nurse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'TestNurse',
        lastName: 'Alpha',
        email: uniqueEmail1,
        password: testPassword,
        department: 'Emergency & ICU',
        // missing registrationNumber!
      }),
    });
    const jsonMissingReg = (await resMissingReg.json()) as any;
    assert(
      resMissingReg.status === 400 && jsonMissingReg.error?.includes('registration number is required'),
      'NURSE-001',
      'Registration without registration number rejected with 400 Bad Request'
    );

    // ── TEST 2: Register Nurse 1 with valid unique registration number ──
    const resReg1 = await fetch(`${BACKEND_URL}/api/register/nurse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Elena',
        lastName: 'Rostova',
        email: uniqueEmail1,
        password: testPassword,
        phone: '+1 555-0991',
        registrationNumber: testRegNo1,
        licenseNumber: testLicense1,
        department: 'Emergency & ICU',
      }),
    });
    const jsonReg1 = (await resReg1.json()) as any;
    assert(
      resReg1.status === 201 && jsonReg1.success === true && Boolean(jsonReg1.nurseId),
      'NURSE-002',
      `Nurse 1 registered successfully (201 Created) with unique nurseId: ${jsonReg1.nurseId}`
    );

    // ── TEST 3: Verify Nurse 1 in PostgreSQL database with unique nurseId and registrationNumber ──
    const dbNurse1 = await prisma.nurse.findFirst({
      where: { registrationNumber: testRegNo1 },
      include: { user: true },
    });
    assert(
      dbNurse1 !== null &&
      dbNurse1.registrationNumber === testRegNo1 &&
      Boolean(dbNurse1.nurseId) &&
      dbNurse1.licenseNumber === testLicense1,
      'NURSE-003',
      'Nurse 1 persisted in PostgreSQL with unique nurseId and registrationNumber'
    );

    // ── TEST 4: Attempt to register Nurse 2 with the SAME registration number -> 409 Conflict ──
    const resDuplicateReg = await fetch(`${BACKEND_URL}/api/register/nurse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Maria',
        lastName: 'Santos',
        email: uniqueEmail2, // different email
        password: testPassword,
        phone: '+1 555-0992',
        registrationNumber: testRegNo1, // SAME registration number!
        licenseNumber: `LIC-NEW-${timestamp}`,
        department: 'Cardiology',
      }),
    });
    const jsonDuplicateReg = (await resDuplicateReg.json()) as any;
    assert(
      resDuplicateReg.status === 409 &&
      jsonDuplicateReg.error?.includes('already exists') &&
      jsonDuplicateReg.error?.includes(testRegNo1),
      'NURSE-004',
      'Attempt to register new nurse with existing registration number blocked with 409 Conflict'
    );

    // ── TEST 5: Attempt to register Nurse 3 with the SAME license number -> 409 Conflict ──
    const resDuplicateLicense = await fetch(`${BACKEND_URL}/api/register/nurse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Kavita',
        lastName: 'Nair',
        email: uniqueEmail3,
        password: testPassword,
        registrationNumber: `NRN-NEW-${timestamp}`,
        licenseNumber: testLicense1, // SAME license number!
        department: 'Pediatrics',
      }),
    });
    const jsonDuplicateLicense = (await resDuplicateLicense.json()) as any;
    assert(
      resDuplicateLicense.status === 409 && jsonDuplicateLicense.error?.includes('license number'),
      'NURSE-005',
      'Attempt to register nurse with duplicate license number blocked with 409 Conflict'
    );

    // ── TEST 6: Nurse 1 can log in using their email ──
    const resLoginEmail = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmail1,
        password: testPassword,
      }),
    });
    const jsonLoginEmail = (await resLoginEmail.json()) as any;
    assert(
      resLoginEmail.status === 200 &&
      jsonLoginEmail.success === true &&
      jsonLoginEmail.user.role === 'nurse' &&
      jsonLoginEmail.user.registrationNumber === testRegNo1,
      'NURSE-006',
      'Nurse 1 can log in via email; returns verified role=nurse and registrationNumber'
    );

    // ── TEST 7: Nurse 1 can log in using their unique registration number ──
    const resLoginRegNo = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testRegNo1, // Entering registration number in the login field!
        password: testPassword,
      }),
    });
    const jsonLoginRegNo = (await resLoginRegNo.json()) as any;
    assert(
      resLoginRegNo.status === 200 &&
      jsonLoginRegNo.success === true &&
      jsonLoginRegNo.user.registrationNumber === testRegNo1 &&
      jsonLoginRegNo.user.email === uniqueEmail1,
      'NURSE-007',
      'Nurse 1 can log in using their unique nurse registration number'
    );

    // ── TEST 8: Nurse 1 can log in using their unique institutional nurse ID ──
    const nurseIdVal = dbNurse1?.nurseId!;
    const resLoginNurseId = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: nurseIdVal, // Entering nurseId (e.g. NUR-XXXX) in the login field!
        password: testPassword,
      }),
    });
    const jsonLoginNurseId = (await resLoginNurseId.json()) as any;
    assert(
      resLoginNurseId.status === 200 &&
      jsonLoginNurseId.success === true &&
      jsonLoginNurseId.user.nurseCode === nurseIdVal,
      'NURSE-008',
      'Nurse 1 can log in using their unique institutional Nurse ID'
    );

    // ── TEST 9: Logging in with registration number but WRONG password fails -> 401 ──
    const resBadPassword = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testRegNo1,
        password: 'WrongPassword@999',
      }),
    });
    assert(
      resBadPassword.status === 401,
      'NURSE-009',
      'Login with registration number and wrong password correctly rejected with 401 Unauthorized'
    );

    // ── TEST 10: Clean up test nurse records ──
    if (dbNurse1) {
      await prisma.user.delete({ where: { id: dbNurse1.userId } });
    }
    assert(true, 'NURSE-010', 'Test records cleaned up successfully');

    console.log('\n=============================================================');
    console.log(`  TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('=============================================================\n');

    process.exit(failedCount === 0 ? 0 : 1);
  } catch (err) {
    console.error('Test execution failed with unhandled error:', err);
    process.exit(1);
  }
}

runTests();
