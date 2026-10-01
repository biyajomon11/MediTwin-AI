import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

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

async function runTestSuite() {
  console.log('\n=============================================================');
  console.log('  MEDITWIN AI — NURSING PATIENT SUMMARY AUTOMATED TEST SUITE');
  console.log('=============================================================\n');

  try {
    // ── 1. Setup Test Users & Fixtures ──
    // Resolve or find doctor
    let doctorUser = await prisma.user.findFirst({
      where: { role: { name: 'doctor' } },
      include: { doctor: true, role: true },
    });
    if (!doctorUser || !doctorUser.doctor) {
      throw new Error('No doctor user found in database.');
    }

    // Resolve or find primary nurse (Ward 2B)
    let nurseUser = await prisma.user.findFirst({
      where: { role: { name: 'nurse' } },
      include: { nurse: true, role: true },
    });
    if (!nurseUser || !nurseUser.nurse) {
      throw new Error('No nurse user found in database.');
    }

    // Ensure primary nurse is assigned to General Ward 2B
    await prisma.nurse.update({
      where: { id: nurseUser.nurse.id },
      data: {
        assignedWard: 'General Ward 2B',
        registrationNumber: nurseUser.nurse.registrationNumber || 'NRN-TEST-001',
      },
    });
    // Refresh
    nurseUser = await prisma.user.findUnique({
      where: { id: nurseUser.id },
      include: { nurse: true, role: true },
    }) as any;

    // Resolve or create a secondary nurse in a different ward (e.g., ICU / Ward 5A) for ward-isolation test
    let otherWardNurse = await prisma.nurse.findFirst({
      where: {
        id: { not: nurseUser!.nurse!.id },
      },
      include: { user: { include: { role: true } } },
    });

    if (!otherWardNurse) {
      // Find nurse role
      const nurseRole = await prisma.role.findFirst({ where: { name: 'nurse' } });
      const dept = await prisma.department.findFirst();
      const otherUser = await prisma.user.create({
        data: {
          email: `icu.nurse.${Date.now()}@meditwin.local`,
          password_hash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
          roleId: nurseRole?.id || 3,
        },
      });
      otherWardNurse = await prisma.nurse.create({
        data: {
          userId: otherUser.id,
          firstName: 'Sarah',
          lastName: 'Miller',
          registrationNumber: `NRN-ICU-${Date.now()}`,
          licenseNumber: `LIC-ICU-${Date.now()}`,
          assignedWard: 'Cardiology ICU',
          departmentId: dept?.id || null,
        },
        include: { user: { include: { role: true } } },
      });
    } else {
      await prisma.nurse.update({
        where: { id: otherWardNurse.id },
        data: { assignedWard: 'Cardiology ICU' },
      });
    }

    // Resolve test patient in General Ward 2B
    let patient = await prisma.patient.findFirst({
      where: {
        ward: { contains: 'Ward 2B' },
      },
      include: { user: true },
    });

    if (!patient) {
      patient = await prisma.patient.findFirst({
        include: { user: true },
      });
      if (patient) {
        await prisma.patient.update({
          where: { id: patient.id },
          data: { ward: 'General Ward 2B', bedNumber: 'Bed 08' },
        });
        patient.ward = 'General Ward 2B';
      }
    }

    if (!patient) {
      throw new Error('No patient found in database.');
    }

    const patientId = patient.id;

    // Generate JWT Tokens
    const nurseToken = jwt.sign(
      { userId: nurseUser!.id, email: nurseUser!.email, role: 'nurse', nurseId: nurseUser!.nurse!.id, assignedWard: 'General Ward 2B' },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    const otherWardNurseToken = jwt.sign(
      { userId: otherWardNurse.userId, email: otherWardNurse.user.email, role: 'nurse', nurseId: otherWardNurse.id, assignedWard: 'Cardiology ICU' },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    const doctorToken = jwt.sign(
      { userId: doctorUser.id, email: doctorUser.email, role: 'doctor', doctorId: doctorUser.doctor.id },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    // Clean up any test nursing summaries for this patient prior to test
    await prisma.nursingPatientSummary.deleteMany({
      where: { patientId },
    });

    console.log(`[TEST SETUP] Nurse: ${nurseUser!.nurse!.firstName} ${nurseUser!.nurse!.lastName} (Ward: General Ward 2B)`);
    console.log(`[TEST SETUP] Other Nurse: ${otherWardNurse.firstName} ${otherWardNurse.lastName} (Ward: Cardiology ICU)`);
    console.log(`[TEST SETUP] Doctor: ${doctorUser.doctor.firstName} ${doctorUser.doctor.lastName}`);
    console.log(`[TEST SETUP] Patient: ${patient.firstName} ${patient.lastName} (ID: ${patient.id}, Ward: ${patient.ward})\n`);

    // ── TEST 1: NURSING-001: Unauthenticated request rejected with 401 ──
    const resUnauth = await fetch(`${BACKEND_URL}/api/nurse/patients/${patientId}/nursing-summaries`);
    assert(resUnauth.status === 401, 'NURSING-001', 'Unauthenticated request rejected with 401 Unauthorized');

    // ── TEST 2: NURSING-002: Doctor attempting to author nursing summary rejected with 403 ──
    const resDoctorBlock = await fetch(`${BACKEND_URL}/api/nurse/patients/${patientId}/nursing-summaries`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${doctorToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patientCurrentCondition: 'Stable post op',
        summaryStatus: 'DRAFT',
      }),
    });
    assert(resDoctorBlock.status === 403, 'NURSING-002', 'Doctor role forbidden from creating nursing summary (403)');

    // ── TEST 3: NURSING-003: Ward Isolation - Nurse from other ward blocked with 403 ──
    const resWardBlock = await fetch(`${BACKEND_URL}/api/nurse/patients/${patientId}/nursing-summaries`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${otherWardNurseToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patientCurrentCondition: 'Attempting cross-ward summary',
        summaryStatus: 'DRAFT',
      }),
    });
    assert(resWardBlock.status === 403, 'NURSING-003', 'Cross-ward authoring blocked with 403 Forbidden (Ward Isolation)');

    // ── TEST 4: NURSING-004: Validation failure on missing condition rejected with 400 ──
    const resValidationFail = await fetch(`${BACKEND_URL}/api/nurse/patients/${patientId}/nursing-summaries`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${nurseToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patientCurrentCondition: '', // Empty condition!
        summaryStatus: 'DRAFT',
      }),
    });
    assert(resValidationFail.status === 422 || resValidationFail.status === 400, 'NURSING-004', 'Missing patientCurrentCondition rejected with 422/400 Validation Error');

    // ── TEST 5: NURSING-005: Clinical Context Retrieval ──
    const resClinicalCtx = await fetch(`${BACKEND_URL}/api/nurse/patients/${patientId}/clinical-context`, {
      headers: { Authorization: `Bearer ${nurseToken}` },
    });
    const jsonCtx = (await resClinicalCtx.json()) as any;
    assert(
      resClinicalCtx.status === 200 && jsonCtx.success === true && jsonCtx.data?.patient?.id === patientId,
      'NURSING-005',
      'Clinical context successfully aggregates demographics, vitals, prescriptions, and notes (200)'
    );

    // ── TEST 6: NURSING-006: Create DRAFT Nursing Summary with Spoofed Nurse ID ──
    const resCreateDraft = await fetch(`${BACKEND_URL}/api/nurse/patients/${patientId}/nursing-summaries`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${nurseToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nurseId: 99999, // Intentional spoof attempt!
        summaryDate: new Date().toISOString().split('T')[0],
        status: 'DRAFT',
        patientCurrentCondition: 'Conscious, oriented, vital signs within normal parameters.',
        levelOfConsciousness: 'Alert',
        mobilityStatus: 'Ambulatory with minimal assistance',
        painStatus: 'Mild (2/10)',
        vitalSignsSummary: 'BP: 120/80 mmHg, HR: 74 bpm, SpO2: 99% on room air, Temp: 98.4 F',
        observationsSummary: 'Surgical wound clean and dry, surgical dressing intact. No signs of infection.',
        nursingCareProvided: 'Morning hygiene completed. Assisted with progressive ambulation. Incentive spirometry encouraged.',
        treatmentSummary: 'Dressing changed per aseptic protocol. IV line flushed.',
        medicationSummary: 'Oral analgesics administered on schedule. Tolerating oral intake well.',
        patientEducation: 'Instructed on deep breathing exercises and wound site protection.',
        dischargeInstructions: 'Continue prescribed wound care, report fever or increased pain immediately.',
        doctorCommunication: 'Attending physician notified of morning stability and dressing condition.',
      }),
    });
    const jsonDraft = (await resCreateDraft.json()) as any;
    assert(
      resCreateDraft.status === 201 && jsonDraft.success === true && jsonDraft.data?.id,
      'NURSING-006',
      'Authorized nurse successfully creates DRAFT nursing summary (201 Created)'
    );

    const summaryId = jsonDraft.data.id;

    // Verify in database: nurseId MUST be genuine nurse's ID, NOT 99999
    const dbSummary = await prisma.nursingPatientSummary.findUnique({ where: { id: summaryId } });
    assert(
      dbSummary !== null &&
      dbSummary.status === 'DRAFT' &&
      dbSummary.nurseId === nurseUser!.nurse!.id &&
      dbSummary.nurseId !== 99999,
      'NURSING-007',
      'PostgreSQL persistence verified: nurseId derived strictly from JWT session (spoofing prevented)'
    );

    // ── TEST 7: NURSING-008: Prevent Duplicate Active Draft for Same Patient ──
    const resDupDraft = await fetch(`${BACKEND_URL}/api/nurse/patients/${patientId}/nursing-summaries`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${nurseToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summaryDate: new Date().toISOString().split('T')[0],
        patientCurrentCondition: 'Second draft attempt',
        status: 'DRAFT',
      }),
    });
    assert(resDupDraft.status === 409, 'NURSING-008', 'Duplicate active DRAFT summary rejected with 409 Conflict');

    // ── TEST 8: NURSING-009: Update DRAFT Nursing Summary ──
    const resUpdate = await fetch(`${BACKEND_URL}/api/nurse/nursing-summaries/${summaryId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${nurseToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patientCurrentCondition: 'Patient stable, alert, walking independently with full appetite.',
        mobilityStatus: 'Independent',
        painStatus: 'Zero pain (0/10)',
      }),
    });
    const jsonUpdate = (await resUpdate.json()) as any;
    assert(
      resUpdate.status === 200 &&
      jsonUpdate.success === true &&
      jsonUpdate.data?.mobilityStatus === 'Independent',
      'NURSING-009',
      'Nurse can update draft summary fields (200 OK)'
    );

    // ── TEST 9: NURSING-010: Transition to SUBMITTED ──
    const resSubmit = await fetch(`${BACKEND_URL}/api/nurse/nursing-summaries/${summaryId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${nurseToken}` },
    });
    const jsonSubmit = (await resSubmit.json()) as any;
    assert(
      resSubmit.status === 200 && jsonSubmit.data?.status === 'SUBMITTED',
      'NURSING-010',
      'Summary transitions to SUBMITTED state (200 OK)'
    );

    // ── TEST 10: NURSING-011: Finalize & Sign Nursing Summary ──
    const resFinalize = await fetch(`${BACKEND_URL}/api/nurse/nursing-summaries/${summaryId}/finalize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${nurseToken}` },
    });
    const jsonFinalize = (await resFinalize.json()) as any;
    assert(
      resFinalize.status === 200 &&
      jsonFinalize.data?.status === 'FINALIZED' &&
      jsonFinalize.data?.finalizedAt !== null,
      'NURSING-011',
      'Nurse finalizes & signs summary (status = FINALIZED, finalizedAt stamped)'
    );

    // ── TEST 11: NURSING-012: Immutable Seal - Edits to Finalized Summary Rejected with 409 ──
    const resEditFinalized = await fetch(`${BACKEND_URL}/api/nurse/nursing-summaries/${summaryId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${nurseToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patientCurrentCondition: 'Attempted modification of sealed document',
      }),
    });
    assert(
      resEditFinalized.status === 409,
      'NURSING-012',
      'Modification of FINALIZED record strictly rejected with 409 Conflict (Immutability Seal)'
    );

    // ── TEST 12: NURSING-013: Attending Doctor Can Read Finalized Nursing Summary ──
    const resDoctorRead = await fetch(`${BACKEND_URL}/api/nurse/patients/${patientId}/nursing-summaries`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    const jsonDoctorRead = (await resDoctorRead.json()) as any;
    assert(
      resDoctorRead.status === 200 &&
      Array.isArray(jsonDoctorRead.data) &&
      jsonDoctorRead.data.some((s: any) => s.id === summaryId && s.status === 'FINALIZED'),
      'NURSING-013',
      'Attending Doctor can read finalized nursing summaries for clinical review (200 OK)'
    );

    // ── TEST 13: NURSING-014: Official Printable Document Payload ──
    const resPrint = await fetch(`${BACKEND_URL}/api/nurse/nursing-summaries/${summaryId}/print`, {
      headers: { Authorization: `Bearer ${nurseToken}` },
    });
    const jsonPrint = (await resPrint.json()) as any;
    assert(
      resPrint.status === 200 &&
      jsonPrint.success === true &&
      jsonPrint.data?.hospitalName &&
      jsonPrint.data?.patient?.patientId &&
      jsonPrint.data?.nurseRegistrationNumber,
      'NURSING-014',
      'Print endpoint returns official hospital payload with verified signatures and patient metadata'
    );

    // ── TEST 14: NURSING-015: Audit Log Verification (Zero PHI) ──
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        tableName: 'nursing_patient_summaries',
        recordId: summaryId,
      },
      orderBy: { id: 'desc' },
      take: 10,
    });

    const hasCreateAudit = auditLogs.some((l) => (l.newValues as any)?.action?.includes('CREATE'));
    const hasFinalizeAudit = auditLogs.some((l) => (l.newValues as any)?.action?.includes('FINALIZE'));

    // Check for absence of sensitive clinical PHI text inside audit log newValues
    const containsRawClinicalText = auditLogs.some((l) => {
      const valStr = JSON.stringify(l.newValues || {});
      return valStr.includes('Surgical wound clean and dry') || valStr.includes('Incentive spirometry');
    });

    assert(
      auditLogs.length > 0 && hasCreateAudit && hasFinalizeAudit && !containsRawClinicalText,
      'NURSING-015',
      'Audit logging verifies actions recorded without persisting clinical narrative/PHI'
    );

    console.log('\n=============================================================');
    console.log(`  TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('=============================================================\n');

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal test execution error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTestSuite();
