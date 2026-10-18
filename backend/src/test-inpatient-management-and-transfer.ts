import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { seedWardsAndBeds } from './seed-wards-beds';

const prisma = new PrismaClient();
const BACKEND_URL = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-meditwin-jwt-key';

let passedCount = 0;
let failedCount = 0;

function assert(condition: any, testId: string, description: string) {
  if (Boolean(condition)) {
    console.log(`  ✅ [PASS] ${testId}: ${description}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testId}: ${description}`);
    failedCount++;
  }
}

async function runInpatientManagementTestSuite() {
  console.log('\n=============================================================');
  console.log('  MEDITWIN AI — INPATIENT MANAGEMENT & BED ALLOCATION TESTS');
  console.log('=============================================================\n');

  let testUser: any = null;
  let testPatient: any = null;
  let admittedAdmissionId: number | null = null;
  let initialBed: any = null;
  let transferTargetBed: any = null;

  try {
    // 0. Ensure ward inventory
    await seedWardsAndBeds();

    // 1. Resolve test doctor
    const doctorUser = await prisma.user.findFirst({
      where: { email: 'dr.jolda@meditwin.org' },
      include: { doctor: true, role: true },
    }) || await prisma.user.findFirst({
      where: { role: { name: 'doctor' } },
      include: { doctor: true, role: true },
    });

    if (!doctorUser || !doctorUser.doctor) {
      throw new Error('Test doctor user not found.');
    }

    const doctorToken = jwt.sign(
      {
        userId: doctorUser.id,
        email: doctorUser.email,
        role: 'doctor',
        roleId: doctorUser.roleId,
        doctorId: doctorUser.doctor.id,
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    const unauthorizedToken = jwt.sign(
      {
        userId: 9999,
        email: 'unauthorized@test.com',
        role: 'patient',
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    // 2. Create clean test patient
    const patientRole = await prisma.role.findFirst({ where: { name: 'patient' } });
    testUser = await prisma.user.create({
      data: {
        email: `inpatient.test.${Date.now()}@meditwin.local`,
        password_hash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
        roleId: patientRole!.id,
      },
    });

    testPatient = await prisma.patient.create({
      data: {
        userId: testUser.id,
        firstName: 'Transfer',
        lastName: 'Patient',
        dateOfBirth: new Date('1990-01-01'),
        admissionStatus: 'Active',
      },
    });

    // 3. Find source and destination wards & beds
    const wards = await prisma.ward.findMany({
      where: { isActive: true },
      include: { beds: true },
      orderBy: { id: 'asc' },
    });

    if (wards.length < 2) {
      throw new Error('Need at least 2 wards to test bed transfer.');
    }

    const sourceWard = wards[0];
    const destWard = wards[1];

    // Find available bed in source ward
    initialBed = await prisma.bed.findFirst({
      where: { wardId: sourceWard.id, status: 'AVAILABLE' },
    });
    if (!initialBed) {
      initialBed = sourceWard.beds[0];
      await prisma.bed.update({ where: { id: initialBed.id }, data: { status: 'AVAILABLE' } });
    }

    // Find available bed in dest ward
    transferTargetBed = await prisma.bed.findFirst({
      where: { wardId: destWard.id, status: 'AVAILABLE' },
    });
    if (!transferTargetBed) {
      transferTargetBed = destWard.beds[0];
      await prisma.bed.update({ where: { id: transferTargetBed.id }, data: { status: 'AVAILABLE' } });
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 1: Unauthorized access prevention
    // ─────────────────────────────────────────────────────────────
    console.log('--- Phase 1: Security, RBAC & Isolation ---');
    const resUnauth = await fetch(`${BACKEND_URL}/api/doctor/inpatient-admissions`, {
      headers: { Authorization: `Bearer ${unauthorizedToken}` },
    });
    assert(resUnauth.status === 403, 'SEC-001', 'Patient role forbidden from accessing doctor inpatient registry');

    const resNoToken = await fetch(`${BACKEND_URL}/api/doctor/inpatient-admissions`);
    assert(resNoToken.status === 401, 'SEC-002', 'Unauthenticated request rejected with 401');

    // ─────────────────────────────────────────────────────────────
    // TEST 2: Aggregated Bed Allocation Summary Calculation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Phase 2: Bed Allocation Statistics & Metrics ---');
    const resSummary = await fetch(`${BACKEND_URL}/api/doctor/bed-allocation/summary`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    const summaryJson = await resSummary.json();
    assert(resSummary.status === 200 && summaryJson.success === true, 'METRIC-001', 'GET /bed-allocation/summary returns 200 OK');
    assert(typeof summaryJson.data?.totalHospitalBeds === 'number' && summaryJson.data.totalHospitalBeds >= 40, 'METRIC-002', 'Total hospital beds accurately counted');
    assert(typeof summaryJson.data?.overallOccupancyPercentage === 'number', 'METRIC-003', 'Overall occupancy percentage calculated');
    assert(Array.isArray(summaryJson.data?.wards) && summaryJson.data.wards.length >= 2, 'METRIC-004', 'Ward breakdowns include occupancy metrics');

    // ─────────────────────────────────────────────────────────────
    // TEST 3: Validation: Invalid Patient / Ward
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Phase 3: Admission Validation & Constraints ---');
    const resInvalidPatient = await fetch(`${BACKEND_URL}/api/doctor/inpatient-admissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${doctorToken}` },
      body: JSON.stringify({
        patientId: 999999,
        wardId: sourceWard.id,
        bedId: initialBed.id,
        admissionDiagnosis: 'Test invalid',
        chiefComplaint: 'Complaint',
      }),
    });
    assert(resInvalidPatient.status === 404, 'VAL-001', 'Admission rejected when patient ID does not exist');

    // ─────────────────────────────────────────────────────────────
    // TEST 4: Valid Transactional Admission & Bed Assignment
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Phase 4: Valid Inpatient Admission ---');
    const resAdmit = await fetch(`${BACKEND_URL}/api/doctor/inpatient-admissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${doctorToken}` },
      body: JSON.stringify({
        patientId: testPatient.id,
        wardId: sourceWard.id,
        bedId: initialBed.id,
        admissionDiagnosis: 'Acute Exacerbation of Asthma',
        chiefComplaint: 'Dyspnea and wheezing',
        nursingHandoverInstructions: 'Nebulize with Salbutamol q4h',
        acuityLevel: 'HIGH',
        admissionStatus: 'ADMITTED',
      }),
    });
    const admitJson = await resAdmit.json();
    assert(resAdmit.status === 201 && admitJson.success === true, 'ADM-001', 'POST /inpatient-admissions creates admission record');
    admittedAdmissionId = admitJson.data?.id;

    // Verify bed status became OCCUPIED
    const freshInitialBed = await prisma.bed.findUnique({ where: { id: initialBed.id } });
    assert(freshInitialBed?.status === 'OCCUPIED', 'ADM-002', 'Initial bed atomically marked as OCCUPIED in database');

    // Verify patient admission status
    const freshPatient = await prisma.patient.findUnique({ where: { id: testPatient.id } });
    assert(freshPatient?.admissionStatus === 'Admitted' && freshPatient?.bedNumber === initialBed.bedNumber, 'ADM-003', 'Patient record updated with ward and bed location');

    // ─────────────────────────────────────────────────────────────
    // TEST 5: Duplicate Active Admission Prevention
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Phase 5: Duplicate Active Admission Prevention ---');
    const resDup = await fetch(`${BACKEND_URL}/api/doctor/inpatient-admissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${doctorToken}` },
      body: JSON.stringify({
        patientId: testPatient.id,
        wardId: destWard.id,
        bedId: transferTargetBed.id,
        admissionDiagnosis: 'Duplicate test',
        chiefComplaint: 'Complaint',
      }),
    });
    assert(resDup.status === 400 || resDup.status === 409, 'DUP-001', 'Second active admission for already admitted patient is blocked');

    // ─────────────────────────────────────────────────────────────
    // TEST 6: Atomic Bed Transfer & History Logging
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Phase 6: Transactional Bed Transfer ---');
    const resTransfer = await fetch(`${BACKEND_URL}/api/doctor/inpatient-admissions/${admittedAdmissionId}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${doctorToken}` },
      body: JSON.stringify({
        destinationWardId: destWard.id,
        destinationBedId: transferTargetBed.id,
        transferReason: 'Clinical step-down to specialized monitoring',
      }),
    });
    const transferJson = await resTransfer.json();
    assert(resTransfer.status === 200 && transferJson.success === true, 'XFER-001', 'POST /inpatient-admissions/:id/transfer succeeds');

    // Verify destination bed became OCCUPIED
    const freshDestBed = await prisma.bed.findUnique({ where: { id: transferTargetBed.id } });
    assert(freshDestBed?.status === 'OCCUPIED', 'XFER-002', 'Destination bed is now OCCUPIED');

    // Verify source bed became AVAILABLE
    const releasedSourceBed = await prisma.bed.findUnique({ where: { id: initialBed.id } });
    assert(releasedSourceBed?.status === 'AVAILABLE', 'XFER-003', 'Source bed was atomically released to AVAILABLE');

    // Verify BedTransferHistory was recorded
    const transferHistory = await prisma.bedTransferHistory.findFirst({
      where: { admissionId: admittedAdmissionId! },
    });
    assert(Boolean(transferHistory) && transferHistory?.toBedId === transferTargetBed.id, 'XFER-004', 'BedTransferHistory record persisted with accurate audit details');

    // ─────────────────────────────────────────────────────────────
    // TEST 7: Transfer Rollback on Occupied Destination Bed
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Phase 7: Transfer Conflict & Safe Rollback ---');
    // Try transferring to the destination bed that is now already occupied
    const resConflict = await fetch(`${BACKEND_URL}/api/doctor/inpatient-admissions/${admittedAdmissionId}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${doctorToken}` },
      body: JSON.stringify({
        destinationWardId: destWard.id,
        destinationBedId: transferTargetBed.id,
        transferReason: 'Conflict attempt',
      }),
    });
    assert(resConflict.status === 400 || resConflict.status === 409, 'XFER-005', 'Transfer to occupied bed is rejected with conflict error');

    // ─────────────────────────────────────────────────────────────
    // TEST 8: Admission Timeline & Audit Events
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Phase 8: Chronological Admission Timeline ---');
    const resTimeline = await fetch(`${BACKEND_URL}/api/doctor/inpatient-admissions/${admittedAdmissionId}/history`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    const timelineJson = await resTimeline.json();
    assert(resTimeline.status === 200 && Array.isArray(timelineJson.data?.timeline), 'TIMELINE-001', 'GET /inpatient-admissions/:id/history returns timeline');
    const events = timelineJson.data?.timeline || [];
    const hasAdmissionCreated = events.some((e: any) => e.eventType === 'ADMISSION_CREATED');
    const hasBedTransferred = events.some((e: any) => e.eventType === 'BED_TRANSFERRED');
    assert(hasAdmissionCreated, 'TIMELINE-002', 'Timeline includes initial ADMISSION_CREATED event');
    assert(hasBedTransferred, 'TIMELINE-003', 'Timeline includes subsequent BED_TRANSFERRED event');

    // ─────────────────────────────────────────────────────────────
    // TEST 9: Inpatient Discharge & Bed Inventory Release
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Phase 9: Discharge Workflow & Inventory Release ---');
    const resDischarge = await fetch(`${BACKEND_URL}/api/doctor/inpatient-admissions/${admittedAdmissionId}/discharge`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    const dischargeJson = await resDischarge.json();
    assert(resDischarge.status === 200 && dischargeJson.success === true, 'DISCH-001', 'POST /inpatient-admissions/:id/discharge returns success');

    // Verify bed is released to AVAILABLE
    const finalBed = await prisma.bed.findUnique({ where: { id: transferTargetBed.id } });
    assert(finalBed?.status === 'AVAILABLE', 'DISCH-002', 'Assigned bed released back to AVAILABLE inventory');

    // Verify duplicate discharge is prevented
    const resDupDischarge = await fetch(`${BACKEND_URL}/api/doctor/inpatient-admissions/${admittedAdmissionId}/discharge`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    assert(resDupDischarge.status === 400, 'DISCH-003', 'Duplicate discharge request rejected');

    console.log('\nCleaning up integration test records...');
    if (admittedAdmissionId) {
      await prisma.bedTransferHistory.deleteMany({ where: { admissionId: admittedAdmissionId } });
      await prisma.inpatientAdmission.deleteMany({ where: { id: admittedAdmissionId } });
    }
    if (testPatient) {
      await prisma.patient.deleteMany({ where: { id: testPatient.id } });
    }
    if (testUser) {
      await prisma.user.deleteMany({ where: { id: testUser.id } });
    }
    console.log('Cleanup finished.\n');
  } catch (err: any) {
    console.error('Fatal test execution error:', err);
    failedCount++;
  }

  console.log('=============================================================');
  console.log(`  FINAL RESULT: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('=============================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runInpatientManagementTestSuite()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error('Test runner failure:', err);
    prisma.$disconnect();
    process.exit(1);
  });
