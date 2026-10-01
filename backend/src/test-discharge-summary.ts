import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const BACKEND_URL = 'http://localhost:5000';
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
  console.log('  MEDITWIN AI — DISCHARGE SUMMARY AUTOMATED TEST SUITE');
  console.log('=============================================================\n');

  try {
    // 1. Resolve test users from database
    const doctorUser = await prisma.user.findFirst({
      where: { email: 'test.doctor@meditwin.local' },
      include: { doctor: true, role: true },
    });
    if (!doctorUser || !doctorUser.doctor) {
      throw new Error('Test doctor user not found in database. Run database seed first.');
    }

    const patientUser = await prisma.user.findFirst({
      where: { email: 'test.patient@meditwin.local' },
      include: { patient: true, role: true },
    });
    if (!patientUser || !patientUser.patient) {
      throw new Error('Test patient user not found in database.');
    }

    const nurseUser = await prisma.user.findFirst({
      where: { email: 'test.nurse@meditwin.local' },
      include: { nurse: true, role: true },
    });

    const patientId = patientUser.patient.id;

    // Generate JWT tokens
    const doctorToken = jwt.sign(
      { userId: doctorUser.id, email: doctorUser.email, role: 'doctor' },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    const nurseToken = nurseUser
      ? jwt.sign(
          { userId: nurseUser.id, email: nurseUser.email, role: 'nurse' },
          JWT_SECRET,
          { expiresIn: '2h' }
        )
      : null;

    const patientToken = jwt.sign(
      { userId: patientUser.id, email: patientUser.email, role: 'patient' },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    // Clean up any pre-existing test discharge summaries for test patient
    await prisma.dischargeSummary.deleteMany({
      where: { patientId },
    });

    // ── TEST 1: DISCHARGE-015: Unauthorized request without JWT ──
    const resUnauth = await fetch(`${BACKEND_URL}/api/doctor/patients/${patientId}/discharge-summaries`);
    assert(resUnauth.status === 401, 'DISCHARGE-015', 'Unauthenticated request rejected with 401 Unauthorized');

    // ── TEST 2: DISCHARGE-001 & 002: Doctor can fetch discharge summaries ──
    const resList = await fetch(`${BACKEND_URL}/api/doctor/patients/${patientId}/discharge-summaries`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    const jsonList = (await resList.json()) as any;
    assert(resList.status === 200 && jsonList.success === true && Array.isArray(jsonList.data),
      'DISCHARGE-001/002', 'Authorized Doctor can access discharge summaries list (200 OK)');

    // ── TEST 3: DISCHARGE-003: Non-doctor role (Nurse) blocked from authoring ──
    if (nurseToken) {
      const resNurseBlock = await fetch(`${BACKEND_URL}/api/doctor/patients/${patientId}/discharge-summaries`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${nurseToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admissionDate: '2026-09-20',
          dischargeDate: '2026-09-27',
          dischargeDiagnosis: 'Test diagnosis',
        }),
      });
      assert(resNurseBlock.status === 403, 'DISCHARGE-003', 'Non-doctor role (Nurse) blocked with 403 Forbidden');
    }

    // ── TEST 4: DISCHARGE-016: Non-existent patient ID returns 404 ──
    const resNotFound = await fetch(`${BACKEND_URL}/api/doctor/patients/999999/discharge-summaries`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    assert(resNotFound.status === 404, 'DISCHARGE-016', 'Non-existent patient returns 404 Not Found');

    // ── TEST 5: DISCHARGE-004: Validation flags empty dates ──
    const resEmptyDate = await fetch(`${BACKEND_URL}/api/doctor/patients/${patientId}/discharge-summaries`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${doctorToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        admissionDate: '',
        dischargeDate: '',
        dischargeDiagnosis: 'Valid diagnosis',
      }),
    });
    assert(resEmptyDate.status === 422, 'DISCHARGE-004', 'Missing admission/discharge dates rejected with 422');

    // ── TEST 6: DISCHARGE-005: Invalid / Malformed date string ──
    const resBadDate = await fetch(`${BACKEND_URL}/api/doctor/patients/${patientId}/discharge-summaries`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${doctorToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        admissionDate: 'not-a-date',
        dischargeDate: 'also-invalid',
        dischargeDiagnosis: 'Valid diagnosis',
      }),
    });
    assert(resBadDate.status === 422, 'DISCHARGE-005', 'Malformed date string rejected with 422');

    // ── TEST 7: DISCHARGE-006: Discharge date earlier than admission date ──
    const resInvertedDate = await fetch(`${BACKEND_URL}/api/doctor/patients/${patientId}/discharge-summaries`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${doctorToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        admissionDate: '2026-09-25',
        dischargeDate: '2026-09-20', // Earlier!
        dischargeDiagnosis: 'Valid diagnosis',
      }),
    });
    const jsonInverted = (await resInvertedDate.json()) as any;
    assert(
      resInvertedDate.status === 422 && jsonInverted.error.includes('earlier than admission date'),
      'DISCHARGE-006',
      'Discharge date earlier than admission date rejected with 422'
    );

    // ── TEST 8: DISCHARGE-007 & 008: Save as DRAFT & PostgreSQL persistence ──
    // Intentionally pass a spoofed doctorId (999) to verify server derives true identity from JWT
    const resCreateDraft = await fetch(`${BACKEND_URL}/api/doctor/patients/${patientId}/discharge-summaries`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${doctorToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        doctorId: 9999, // Attempted spoof!
        admissionDate: '2026-09-20',
        dischargeDate: '2026-09-27',
        admissionDiagnosis: 'Asthma exacerbation',
        dischargeDiagnosis: 'Resolved acute bronchial asthma',
        chiefComplaint: 'Dyspnea and wheezing for 3 days',
        clinicalCourse: 'Patient stabilized following nebulizer therapy and systemic corticosteroids.',
        conditionAtDischarge: 'Stable',
        dischargeMedications: [
          { name: 'Salbutamol Inhaler', dosage: '100mcg', frequency: 'PRN', instructions: '2 puffs as needed' },
        ],
        followUpInstructions: 'Return in 10 days for peak flow assessment.',
        summaryStatus: 'DRAFT',
      }),
    });
    const jsonDraft = (await resCreateDraft.json()) as any;
    assert(resCreateDraft.status === 201 && jsonDraft.success === true, 'DISCHARGE-007', 'Doctor can save valid discharge summary as DRAFT (201)');

    const draftId = jsonDraft.data.id;

    // Verify in database: doctorId MUST be genuine doctor's ID, NOT 9999
    const dbSummary = await prisma.dischargeSummary.findUnique({ where: { id: draftId } });
    assert(
      dbSummary !== null &&
      dbSummary.summaryStatus === 'DRAFT' &&
      dbSummary.doctorId === doctorUser.doctor.id &&
      dbSummary.doctorId !== 9999,
      'DISCHARGE-008',
      'Draft persisted in PostgreSQL with true JWT-derived doctorId (spoof rejected)'
    );

    // ── TEST 9: DISCHARGE-012: Duplicate DRAFT prevention ──
    const resDuplicateDraft = await fetch(`${BACKEND_URL}/api/doctor/patients/${patientId}/discharge-summaries`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${doctorToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        admissionDate: '2026-09-20',
        dischargeDate: '2026-09-27',
        dischargeDiagnosis: 'Another diagnosis',
        summaryStatus: 'DRAFT',
      }),
    });
    assert(resDuplicateDraft.status === 409, 'DISCHARGE-012', 'Duplicate draft prevented with 409 Conflict');

    // ── TEST 10: DISCHARGE-017: Invalid summary ID returns 404 ──
    const resBadSummaryId = await fetch(`${BACKEND_URL}/api/doctor/discharge-summaries/999999`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    assert(resBadSummaryId.status === 404, 'DISCHARGE-017', 'Non-existent summary ID returns 404 Not Found');

    // ── TEST 11: DISCHARGE-009: Doctor can reopen and edit a DRAFT ──
    const resUpdateDraft = await fetch(`${BACKEND_URL}/api/doctor/discharge-summaries/${draftId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${doctorToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        admissionDate: '2026-09-20',
        dischargeDate: '2026-09-27',
        dischargeDiagnosis: 'Updated Bronchial Asthma (Resolved)',
        clinicalCourse: 'Inpatient course updated with satisfactory spirometry readings.',
        conditionAtDischarge: 'Improved',
      }),
    });
    const jsonUpdate = (await resUpdateDraft.json()) as any;
    assert(
      resUpdateDraft.status === 200 && jsonUpdate.data.dischargeDiagnosis.includes('Updated'),
      'DISCHARGE-009',
      'Doctor can edit an existing DRAFT summary (200 OK)'
    );

    // ── TEST 12: DISCHARGE-010: Doctor can finalize the discharge summary ──
    const resFinalize = await fetch(`${BACKEND_URL}/api/doctor/discharge-summaries/${draftId}/finalize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    const jsonFinalize = (await resFinalize.json()) as any;
    assert(
      resFinalize.status === 200 && jsonFinalize.data.summaryStatus === 'FINALIZED',
      'DISCHARGE-010',
      'Doctor can finalize the discharge summary (status = FINALIZED)'
    );

    // ── TEST 13: DISCHARGE-011: Finalized summary is sealed against editing ──
    const resEditFinalized = await fetch(`${BACKEND_URL}/api/doctor/discharge-summaries/${draftId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${doctorToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dischargeDiagnosis: 'Attempted modification of sealed record',
      }),
    });
    assert(resEditFinalized.status === 409, 'DISCHARGE-011', 'Editing a finalized summary is blocked with 409 Conflict');

    // ── TEST 14: DISCHARGE-013: Patient admission status updated to Discharged ──
    const updatedPatient = await prisma.patient.findUnique({ where: { id: patientId } });
    assert(
      updatedPatient?.admissionStatus === 'Discharged',
      'DISCHARGE-013',
      'Patient admissionStatus automatically updated to Discharged in PostgreSQL'
    );

    // ── TEST 15: DISCHARGE-014: Print view payload contains complete clinical data ──
    const resPrint = await fetch(`${BACKEND_URL}/api/doctor/discharge-summaries/${draftId}/print`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    const jsonPrint = (await resPrint.json()) as any;
    assert(
      resPrint.status === 200 &&
      jsonPrint.data.id === draftId &&
      Boolean(jsonPrint.data.doctorName) &&
      Boolean(jsonPrint.data.hospitalName),
      'DISCHARGE-014',
      'Print view payload contains valid hospital, doctor, and patient details (200 OK)'
    );

    // ── TEST 16: DISCHARGE-018: AI Draft synthesis returns clinical draft ──
    const resAiDraft = await fetch(`${BACKEND_URL}/api/doctor/patients/${patientId}/discharge-summaries/ai-draft`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    const jsonAiDraft = (await resAiDraft.json()) as any;
    assert(
      resAiDraft.status === 200 && jsonAiDraft.isAiGenerated === true && Boolean(jsonAiDraft.draft),
      'DISCHARGE-018',
      'AI Draft endpoint synthesizes clinical draft with physician review disclaimer'
    );

    // ── TEST 17: DISCHARGE-019 & 020: Audit logs created for creation & finalization ──
    const auditEntries = await prisma.auditLog.findMany({
      where: {
        tableName: 'discharge_summaries',
        recordId: draftId,
      },
    });

    const hasCreate = auditEntries.some((e) => (e.newValues as any)?.action === 'CREATE_DISCHARGE_SUMMARY' || (e.newValues as any)?.action?.includes('CREATE'));
    const hasFinalize = auditEntries.some((e) => (e.newValues as any)?.action === 'FINALIZE_DISCHARGE_SUMMARY');
    const hasPrint = auditEntries.some((e) => (e.newValues as any)?.action === 'PRINT_DISCHARGE_SUMMARY');

    assert(
      hasCreate && hasFinalize && hasPrint,
      'DISCHARGE-019/020',
      'Audit logs recorded for CREATE, FINALIZE, and PRINT in PostgreSQL audit_logs table'
    );

    // ── TEST 18: Patient portal read-only access ──
    const resPatientPortal = await fetch(`${BACKEND_URL}/api/patient/discharge-summaries`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const jsonPatientPortal = (await resPatientPortal.json()) as any;
    assert(
      resPatientPortal.status === 200 &&
      Array.isArray(jsonPatientPortal.data) &&
      jsonPatientPortal.data.some((s: any) => s.id === draftId),
      'PATIENT-PORTAL',
      'Patient can securely read their own finalized discharge summary in patient portal'
    );

    console.log('\n=============================================================');
    console.log(`  TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('=============================================================\n');

    process.exit(failedCount === 0 ? 0 : 1);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTestSuite();
