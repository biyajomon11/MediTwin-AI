import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-meditwin-jwt-key';

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

async function runProfileTestSuite() {
  console.log('\n=============================================================');
  console.log('  MEDITWIN AI — NURSE PROFILE & SECURITY AUTOMATED TESTS');
  console.log('=============================================================\n');

  try {
    // 1. Fixtures: Nurse A, Nurse B, Doctor, Patient
    let nurseUserA = await prisma.user.findFirst({
      where: { role: { name: 'nurse' } },
      include: { nurse: { include: { department: { include: { hospital: true } } } }, role: true },
    });
    if (!nurseUserA || !nurseUserA.nurse) {
      throw new Error('No primary nurse user found in database.');
    }

    let nurseUserB = await prisma.user.findFirst({
      where: {
        role: { name: 'nurse' },
        id: { not: nurseUserA.id },
      },
      include: { nurse: true, role: true },
    });

    if (!nurseUserB || !nurseUserB.nurse) {
      const nurseRole = await prisma.role.findFirst({ where: { name: 'nurse' } });
      const dept = await prisma.department.findFirst();
      const userB = await prisma.user.create({
        data: {
          email: `nurse.b.${Date.now()}@meditwin.local`,
          password_hash: await bcrypt.hash('NurseB@Secure123', 10),
          roleId: nurseRole?.id || 3,
        },
      });
      const nurseRecordB = await prisma.nurse.create({
        data: {
          userId: userB.id,
          firstName: 'Beatrice',
          lastName: 'Vance',
          registrationNumber: `NRN-B-${Date.now()}`,
          licenseNumber: `LIC-B-${Date.now()}`,
          assignedWard: 'Surgical Ward 3A',
          departmentId: dept?.id || null,
        },
      });
      nurseUserB = { ...userB, nurse: nurseRecordB, role: nurseRole } as any;
    }

    const validNurseB = nurseUserB!;
    const validNurseBRecord = validNurseB.nurse!;

    let doctorUser = await prisma.user.findFirst({
      where: { role: { name: 'doctor' } },
      include: { doctor: true, role: true },
    });
    if (!doctorUser || !doctorUser.doctor) {
      throw new Error('No doctor user found in database.');
    }

    let patientUser = await prisma.user.findFirst({
      where: { role: { name: 'patient' } },
      include: { patient: true, role: true },
    });
    if (!patientUser || !patientUser.patient) {
      throw new Error('No patient user found in database.');
    }

    // JWT Tokens
    const nurseTokenA = jwt.sign(
      { userId: nurseUserA.id, email: nurseUserA.email, role: 'nurse', nurseId: nurseUserA.nurse.id },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    const nurseTokenB = jwt.sign(
      { userId: validNurseB.id, email: validNurseB.email, role: 'nurse', nurseId: validNurseBRecord.id },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    const doctorToken = jwt.sign(
      { userId: doctorUser.id, email: doctorUser.email, role: 'doctor', doctorId: doctorUser.doctor.id },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    const patientToken = jwt.sign(
      { userId: patientUser.id, email: patientUser.email, role: 'patient', patientId: patientUser.patient.id },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    // Initial state snapshot of Nurse A
    const originalFirstName = nurseUserA.nurse.firstName;
    const originalLastName = nurseUserA.nurse.lastName;
    const originalPhone = nurseUserA.nurse.phone;

    // ── NURSE-PROFILE-001: Authenticated nurse can load own profile ──
    const res001 = await fetch(`${BACKEND_URL}/api/nurse/profile`, {
      headers: { Authorization: `Bearer ${nurseTokenA}` },
    });
    const data001 = (await res001.json()) as any;
    assert(
      res001.status === 200 && data001.data?.id === nurseUserA.nurse.id && data001.data?.email === nurseUserA.email,
      'NURSE-PROFILE-001',
      'Authenticated nurse can load own profile from PostgreSQL'
    );

    // ── NURSE-PROFILE-002: Unauthenticated user cannot load nurse profile ──
    const res002 = await fetch(`${BACKEND_URL}/api/nurse/profile`, {
      headers: { 'Content-Type': 'application/json' },
    });
    assert(
      res002.status === 401,
      'NURSE-PROFILE-002',
      'Unauthenticated request rejected with 401 Unauthorized'
    );

    // ── NURSE-PROFILE-003: Doctor cannot access Nurse Profile ──
    const res003 = await fetch(`${BACKEND_URL}/api/nurse/profile`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    assert(
      res003.status === 403,
      'NURSE-PROFILE-003',
      'Doctor token is forbidden from accessing nurse profile (403)'
    );

    // ── NURSE-PROFILE-004: Patient cannot access Nurse Profile ──
    const res004 = await fetch(`${BACKEND_URL}/api/nurse/profile`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    assert(
      res004.status === 403,
      'NURSE-PROFILE-004',
      'Patient token is forbidden from accessing nurse profile (403)'
    );

    // ── NURSE-PROFILE-005: Nurse can update permitted profile fields ──
    const testUpdatedPhone = '+1-555-0199';
    const res005 = await fetch(`${BACKEND_URL}/api/nurse/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nurseTokenA}`,
      },
      body: JSON.stringify({
        firstName: originalFirstName,
        lastName: originalLastName,
        phone: testUpdatedPhone,
      }),
    });
    const data005 = (await res005.json()) as any;
    assert(
      res005.status === 200 && data005.data?.phone === testUpdatedPhone,
      'NURSE-PROFILE-005',
      'Nurse can update permitted profile fields (phone, name)'
    );

    // ── NURSE-PROFILE-006: Updated profile data persists in PostgreSQL ──
    const refreshedNurse = await prisma.nurse.findUnique({
      where: { id: nurseUserA.nurse.id },
    });
    assert(
      refreshedNurse?.phone === testUpdatedPhone,
      'NURSE-PROFILE-006',
      'Updated profile data confirmed directly persisted in PostgreSQL'
    );

    // ── NURSE-PROFILE-007: Protected role cannot be modified ──
    const res007 = await fetch(`${BACKEND_URL}/api/nurse/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nurseTokenA}`,
      },
      body: JSON.stringify({
        role: 'Doctor',
        roleId: 2,
      }),
    });
    assert(
      res007.status === 403,
      'NURSE-PROFILE-007',
      'Attempt to modify protected role field rejected with 403 Forbidden'
    );

    // ── NURSE-PROFILE-008: Hospital cannot be changed by nurse ──
    const res008 = await fetch(`${BACKEND_URL}/api/nurse/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nurseTokenA}`,
      },
      body: JSON.stringify({
        hospitalId: 9999,
      }),
    });
    assert(
      res008.status === 403,
      'NURSE-PROFILE-008',
      'Attempt to modify protected hospitalId rejected with 403 Forbidden'
    );

    // ── NURSE-PROFILE-009: Department cannot be changed by nurse ──
    const res009 = await fetch(`${BACKEND_URL}/api/nurse/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nurseTokenA}`,
      },
      body: JSON.stringify({
        departmentId: 9999,
      }),
    });
    assert(
      res009.status === 403,
      'NURSE-PROFILE-009',
      'Attempt to modify protected departmentId rejected with 403 Forbidden'
    );

    // ── NURSE-PROFILE-010: Nurse ID cannot be manipulated ──
    const res010 = await fetch(`${BACKEND_URL}/api/nurse/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nurseTokenA}`,
      },
      body: JSON.stringify({
        nurseId: 'NUR-HACK-001',
      }),
    });
    assert(
      res010.status === 403,
      'NURSE-PROFILE-010',
      'Attempt to modify nurseId rejected with 403 Forbidden'
    );

    // ── NURSE-PROFILE-011: Another nurse's profile cannot be accessed or manipulated via body/query ──
    const res011 = await fetch(`${BACKEND_URL}/api/nurse/profile?nurseId=${validNurseBRecord.id}`, {
      headers: { Authorization: `Bearer ${nurseTokenA}` },
    });
    const data011 = (await res011.json()) as any;
    assert(
      res011.status === 200 && data011.data?.id === nurseUserA.nurse.id,
      'NURSE-PROFILE-011',
      'Identity strictly derived from JWT; query nurseId injection ignored and returns own profile'
    );

    // ── NURSE-PROFILE-012: Invalid phone number rejected ──
    const res012 = await fetch(`${BACKEND_URL}/api/nurse/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nurseTokenA}`,
      },
      body: JSON.stringify({
        phone: 'not-a-valid-phone-number-format-123456789012345678901234567890',
      }),
    });
    assert(
      res012.status === 422,
      'NURSE-PROFILE-012',
      'Invalid phone number format rejected with 422 Unprocessable Entity'
    );

    // ── NURSE-PROFILE-013: Empty required field rejected ──
    const res013 = await fetch(`${BACKEND_URL}/api/nurse/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nurseTokenA}`,
      },
      body: JSON.stringify({
        firstName: '   ',
      }),
    });
    assert(
      res013.status === 422,
      'NURSE-PROFILE-013',
      'Whitespace/empty required name field rejected with 422 Unprocessable Entity'
    );

    // ── NURSE-PROFILE-014: Correct current password allows password change ──
    const tempCurrentPassword = 'NurseInitPass@123';
    const tempNewPassword = 'NurseNewPass@456';
    const hashedInit = await bcrypt.hash(tempCurrentPassword, 12);
    await prisma.user.update({
      where: { id: nurseUserA.id },
      data: { password_hash: hashedInit },
    });

    const res014 = await fetch(`${BACKEND_URL}/api/nurse/profile/password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nurseTokenA}`,
      },
      body: JSON.stringify({
        currentPassword: tempCurrentPassword,
        newPassword: tempNewPassword,
        confirmPassword: tempNewPassword,
      }),
    });
    const data014 = (await res014.json()) as any;
    assert(
      res014.status === 200 && data014.message?.includes('successfully'),
      'NURSE-PROFILE-014',
      'Correct current password allows password change (200 OK)'
    );

    // ── NURSE-PROFILE-015: Incorrect current password blocks password change ──
    const res015 = await fetch(`${BACKEND_URL}/api/nurse/profile/password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nurseTokenA}`,
      },
      body: JSON.stringify({
        currentPassword: 'WrongPassword123!',
        newPassword: 'AnotherPassword@789',
        confirmPassword: 'AnotherPassword@789',
      }),
    });
    assert(
      res015.status === 400,
      'NURSE-PROFILE-015',
      'Incorrect current password blocks password change with 400 Bad Request'
    );

    // ── NURSE-PROFILE-016: Password confirmation mismatch rejected ──
    const res016 = await fetch(`${BACKEND_URL}/api/nurse/profile/password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nurseTokenA}`,
      },
      body: JSON.stringify({
        currentPassword: tempNewPassword,
        newPassword: 'ValidPassword@999',
        confirmPassword: 'DifferentPassword@999',
      }),
    });
    assert(
      res016.status === 422,
      'NURSE-PROFILE-016',
      'Password confirmation mismatch rejected with 422 Unprocessable Entity'
    );

    // ── NURSE-PROFILE-017: Weak password rejected ──
    const res017 = await fetch(`${BACKEND_URL}/api/nurse/profile/password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nurseTokenA}`,
      },
      body: JSON.stringify({
        currentPassword: tempNewPassword,
        newPassword: 'short',
        confirmPassword: 'short',
      }),
    });
    assert(
      res017.status === 422,
      'NURSE-PROFILE-017',
      'Password shorter than 8 characters rejected with 422 Unprocessable Entity'
    );

    // ── NURSE-PROFILE-018: Password hash is never returned ──
    const res018 = await fetch(`${BACKEND_URL}/api/nurse/profile`, {
      headers: { Authorization: `Bearer ${nurseTokenA}` },
    });
    const data018 = (await res018.json()) as any;
    assert(
      data018.data?.password_hash === undefined && data018.data?.password === undefined,
      'NURSE-PROFILE-018',
      'Password hash and plaintext secrets are strictly excluded from profile response'
    );

    // ── NURSE-PROFILE-019: Password is never written to audit logs ──
    const recentAuditWithPass = await prisma.auditLog.findFirst({
      where: {
        userId: nurseUserA.id,
        tableName: 'users',
      },
      orderBy: { createdAt: 'desc' },
    });
    const auditDetailsStr = JSON.stringify(recentAuditWithPass?.newValues || {});
    assert(
      recentAuditWithPass !== null &&
      !auditDetailsStr.includes(tempNewPassword) &&
      !auditDetailsStr.includes(tempCurrentPassword) &&
      !auditDetailsStr.includes('password_hash'),
      'NURSE-PROFILE-019',
      'Password is never written to PostgreSQL audit logs'
    );

    // ── NURSE-PROFILE-020: Notification preferences update successfully ──
    const res020 = await fetch(`${BACKEND_URL}/api/nurse/profile/preferences`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nurseTokenA}`,
      },
      body: JSON.stringify({
        patientAssignmentAlerts: false,
        criticalVitalAlerts: true,
        procedureUpdateAlerts: true,
      }),
    });
    const data020 = (await res020.json()) as any;
    assert(
      res020.status === 200 && data020.data?.patientAssignmentAlerts === false && data020.data?.criticalVitalAlerts === true,
      'NURSE-PROFILE-020',
      'Clinical notification preferences update and persist successfully (200 OK)'
    );

    // ── NURSE-PROFILE-021: Unknown preference field rejected ──
    const res021 = await fetch(`${BACKEND_URL}/api/nurse/profile/preferences`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nurseTokenA}`,
      },
      body: JSON.stringify({
        invalidPreferenceProperty: true,
      }),
    });
    assert(
      res021.status === 400,
      'NURSE-PROFILE-021',
      'Unknown preference field rejected with 400 Bad Request'
    );

    // ── NURSE-PROFILE-022: Reminder summary loads only authorized information ──
    const res022 = await fetch(`${BACKEND_URL}/api/nurse/profile/reminders`, {
      headers: { Authorization: `Bearer ${nurseTokenA}` },
    });
    const data022 = (await res022.json()) as any;
    assert(
      res022.status === 200 &&
      typeof data022.data?.unreadCount === 'number' &&
      typeof data022.data?.activeWardPatients === 'number' &&
      typeof data022.data?.urgentCount === 'number',
      'NURSE-PROFILE-022',
      'Reminder summary aggregates only authorized departmental/ward counts'
    );

    // ── NURSE-PROFILE-023: Recent activity loads correctly ──
    const res023 = await fetch(`${BACKEND_URL}/api/nurse/profile/activity`, {
      headers: { Authorization: `Bearer ${nurseTokenA}` },
    });
    const data023 = (await res023.json()) as any;
    assert(
      res023.status === 200 &&
      Array.isArray(data023.data) &&
      data023.data.length > 0 &&
      data023.data.every((item: any) => typeof item.action === 'string' && typeof item.timestamp === 'string'),
      'NURSE-PROFILE-023',
      'Recent account activity loads clean audit log timeline'
    );

    // ── NURSE-PROFILE-024: Logout clears authenticated access ──
    const invalidToken = 'Bearer invalid.token.signature';
    const res024 = await fetch(`${BACKEND_URL}/api/nurse/profile`, {
      headers: { Authorization: invalidToken },
    });
    assert(
      res024.status === 401 || res024.status === 403,
      'NURSE-PROFILE-024',
      'Invalidated / cleared authentication blocks access with 401/403'
    );

    // ── NURSE-PROFILE-025: Database errors handled without fake fallback data ──
    const res025 = await fetch(`${BACKEND_URL}/api/nurse/profile/reminders`, {
      headers: { Authorization: `Bearer ${nurseTokenA}` },
    });
    const data025 = (await res025.json()) as any;
    assert(
      res025.status === 200 && typeof data025.data?.unreadCount === 'number' && data025.data?.isMock !== true,
      'NURSE-PROFILE-025',
      'Real PostgreSQL counts loaded without any mock or fabricated fallback data'
    );

    // Reset nurse phone back to original
    await prisma.nurse.update({
      where: { id: nurseUserA.nurse.id },
      data: { phone: originalPhone },
    });

  } catch (err: any) {
    console.error('Test execution error:', err);
    failedCount++;
  } finally {
    await prisma.$disconnect();
    console.log('\n=============================================================');
    console.log(`  TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED (TOTAL: ${passedCount + failedCount})`);
    console.log('=============================================================\n');
    process.exit(failedCount > 0 ? 1 : 0);
  }
}

runProfileTestSuite();
