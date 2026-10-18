import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { seedWardsAndBeds } from './seed-wards-beds';
import './index'; // Automatically starts MediTwin backend server on port 5000

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
  console.log('  MEDITWIN AI — 50 BEDS PER WARD & INPATIENT ALLOCATION TESTS');
  console.log('=============================================================\n');

  // Allow server startup time
  await new Promise((r) => setTimeout(r, 1500));

  let testUser1: any = null;
  let testPatient1: any = null;
  let testUser2: any = null;
  let testPatient2: any = null;
  let admittedAdmissionId: number | null = null;
  let initialBed: any = null;
  let transferTargetBed: any = null;

  try {
    // ─────────────────────────────────────────────────────────────
    // PHASE 0: 50 Beds Per Ward Capacity & Idempotency Verification
    // ─────────────────────────────────────────────────────────────
    console.log('--- Phase 0: 50 Beds Per Ward Capacity & Idempotent Migration ---');
    
    // Ensure 50 beds seeded
    await seedWardsAndBeds();

    const activeWards = await prisma.ward.findMany({
      where: { isActive: true },
      include: {
        beds: { orderBy: { bedNumber: 'asc' } },
      },
      orderBy: { id: 'asc' },
    });

    assert(activeWards.length >= 6, 'WARD-001', `At least 6 active wards configured in database (found: ${activeWards.length})`);

    let allWardsHave50Beds = true;
    let allBedNumbersDeterministic = true;
    let totalHospitalPhysicalBeds = 0;

    for (const ward of activeWards) {
      totalHospitalPhysicalBeds += ward.beds.length;
      if (ward.beds.length !== 50) {
        allWardsHave50Beds = false;
        console.error(`Ward ${ward.name} (${ward.wardNumber}) has ${ward.beds.length} beds instead of 50.`);
      }

      // Check deterministic formatting Bed 01 .. Bed 50
      const bedNums = ward.beds.map((b) => b.bedNumber);
      if (bedNums[0] !== 'Bed 01' || bedNums[49] !== 'Bed 50') {
        allBedNumbersDeterministic = false;
        console.error(`Ward ${ward.name} first bed: ${bedNums[0]}, 50th bed: ${bedNums[49]}`);
      }
    }

    assert(allWardsHave50Beds, 'WARD-002', 'Every active ward has exactly 50 physical beds in PostgreSQL');
    assert(allBedNumbersDeterministic, 'WARD-003', 'Deterministic bed numbering: Bed 01 through Bed 50');
    assert(totalHospitalPhysicalBeds >= 300, 'WARD-004', `Total physical hospital beds count is 300+ (found: ${totalHospitalPhysicalBeds})`);

    // Test Idempotency: re-running seedWardsAndBeds must not add duplicate beds
    const countBefore = await prisma.bed.count();
    await seedWardsAndBeds();
    const countAfter = await prisma.bed.count();
    assert(countBefore === countAfter, 'WARD-005', `Seed script is idempotent (bed count before: ${countBefore}, after: ${countAfter})`);

    // Verify existing active admissions remain intact
    const activeAdmissions = await prisma.inpatientAdmission.findMany({
      where: { admissionStatus: { in: ['ADMITTED', 'UNDER_OBSERVATION'] } },
      include: { bed: true },
    });
    assert(activeAdmissions.length >= 8, 'WARD-006', `Pre-existing inpatient admissions preserved without data loss (active: ${activeAdmissions.length})`);

    const allAssignedBedsOccupied = activeAdmissions.every((adm) => adm.bed && adm.bed.status === 'OCCUPIED');
    assert(allAssignedBedsOccupied, 'WARD-007', 'All beds assigned to active inpatients retain OCCUPIED status');

    // ─────────────────────────────────────────────────────────────
    // PHASE 1: Security, RBAC & Isolation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Phase 1: Security, RBAC & Isolation ---');

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

    const resUnauth = await fetch(`${BACKEND_URL}/api/doctor/inpatient-admissions`, {
      headers: { Authorization: `Bearer ${unauthorizedToken}` },
    });
    assert(resUnauth.status === 403, 'SEC-001', 'Patient role forbidden from accessing doctor inpatient registry (403)');

    const resNoToken = await fetch(`${BACKEND_URL}/api/doctor/inpatient-admissions`);
    assert(resNoToken.status === 401, 'SEC-002', 'Unauthenticated request rejected with 401');

    // ─────────────────────────────────────────────────────────────
    // PHASE 2: Bed Allocation Statistics & Metrics (50 Beds)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Phase 2: Bed Allocation Statistics & Ward API ---');
    const resSummary = await fetch(`${BACKEND_URL}/api/doctor/bed-allocation/summary`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    const summaryJson = await resSummary.json();
    assert(resSummary.status === 200 && summaryJson.success === true, 'METRIC-001', 'GET /bed-allocation/summary returns 200 OK');
    assert(summaryJson.data?.totalHospitalBeds >= 300, 'METRIC-002', `Total hospital beds reflects 50 beds per ward (${summaryJson.data?.totalHospitalBeds} beds)`);
    assert(typeof summaryJson.data?.totalAvailableBeds === 'number' && summaryJson.data.totalAvailableBeds > 0, 'METRIC-003', `Available beds counted accurately (${summaryJson.data?.totalAvailableBeds} available)`);
    assert(typeof summaryJson.data?.overallOccupancyPercentage === 'number', 'METRIC-004', `Overall hospital occupancy calculated correctly (${summaryJson.data?.overallOccupancyPercentage}%)`);

    // Verify GET /api/doctor/wards/:wardId/beds returns all 50 beds
    const sourceWard = activeWards[0];
    const destWard = activeWards[1];

    const resWardBeds = await fetch(`${BACKEND_URL}/api/doctor/wards/${sourceWard.id}/beds`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    const wardBedsJson = await resWardBeds.json();
    assert(resWardBeds.status === 200 && wardBedsJson.success === true, 'API-001', `GET /wards/${sourceWard.id}/beds returns 200 OK`);
    assert(wardBedsJson.data?.beds?.length === 50, 'API-002', `Ward beds API returns all 50 physical beds (received: ${wardBedsJson.data?.beds?.length})`);
    assert(wardBedsJson.data?.total === 50, 'API-003', `Ward total property equals 50`);

    // ─────────────────────────────────────────────────────────────
    // PHASE 3: Create Test Patients
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Phase 3: Setup Test Patient Records ---');
    const patientRole = await prisma.role.findFirst({ where: { name: 'patient' } });

    testUser1 = await prisma.user.create({
      data: {
        email: `inpatient.test1.${Date.now()}@meditwin.local`,
        password_hash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
        roleId: patientRole!.id,
      },
    });

    testPatient1 = await prisma.patient.create({
      data: {
        userId: testUser1.id,
        firstName: 'Primary',
        lastName: 'Inpatient',
        dateOfBirth: new Date('1988-03-15'),
        admissionStatus: 'Active',
      },
    });

    testUser2 = await prisma.user.create({
      data: {
        email: `inpatient.test2.${Date.now()}@meditwin.local`,
        password_hash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
        roleId: patientRole!.id,
      },
    });

    testPatient2 = await prisma.patient.create({
      data: {
        userId: testUser2.id,
        firstName: 'Concurrent',
        lastName: 'Candidate',
        dateOfBirth: new Date('1992-07-20'),
        admissionStatus: 'Active',
      },
    });

    assert(Boolean(testPatient1.id) && Boolean(testPatient2.id), 'SETUP-001', 'Test patients created successfully in database');

    // Pick an available bed in source ward (e.g. Bed 45)
    initialBed = await prisma.bed.findFirst({
      where: { wardId: sourceWard.id, status: 'AVAILABLE' },
      orderBy: { id: 'desc' },
    });
    if (!initialBed) {
      throw new Error(`No available bed found in ward ${sourceWard.name}`);
    }

    // Pick an available bed in dest ward (e.g. Bed 48)
    transferTargetBed = await prisma.bed.findFirst({
      where: { wardId: destWard.id, status: 'AVAILABLE' },
      orderBy: { id: 'desc' },
    });
    if (!transferTargetBed) {
      throw new Error(`No available bed found in ward ${destWard.name}`);
    }

    // ─────────────────────────────────────────────────────────────
    // PHASE 4: Valid Inpatient Admission (Quick Allocate Workflow)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Phase 4: Quick Allocate Inpatient Admission ---');
    const resAdmit = await fetch(`${BACKEND_URL}/api/doctor/inpatient-admissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${doctorToken}` },
      body: JSON.stringify({
        patientId: testPatient1.id,
        wardId: sourceWard.id,
        bedId: initialBed.id,
        admissionDiagnosis: 'Bacterial Pneumonia with hypoxemia',
        chiefComplaint: 'Fever, cough, dyspnea',
        nursingHandoverInstructions: 'Oxygen 2L via nasal cannula, IV Ceftriaxone 1g daily',
        acuityLevel: 'HIGH',
        admissionStatus: 'ADMITTED',
      }),
    });
    const admitJson = await resAdmit.json();
    assert(resAdmit.status === 201 && admitJson.success === true, 'ADM-001', `Quick Allocate created admission on ${initialBed.bedNumber}`);
    admittedAdmissionId = admitJson.data?.id;

    // Verify bed status became OCCUPIED
    const freshInitialBed = await prisma.bed.findUnique({ where: { id: initialBed.id } });
    assert(freshInitialBed?.status === 'OCCUPIED', 'ADM-002', `${initialBed.bedNumber} atomically marked as OCCUPIED`);

    // Verify patient admission status
    const freshPatient1 = await prisma.patient.findUnique({ where: { id: testPatient1.id } });
    assert(freshPatient1?.admissionStatus === 'Admitted' && freshPatient1?.bedNumber === initialBed.bedNumber, 'ADM-003', 'Patient record updated with ward and bed assignment');

    // ─────────────────────────────────────────────────────────────
    // PHASE 5: Concurrent Allocation Prevention (Race Condition Test)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Phase 5: Concurrent Allocation Conflict Prevention ---');
    // Attempt to allocate the already-occupied initialBed to testPatient2
    const resConflictAdmit = await fetch(`${BACKEND_URL}/api/doctor/inpatient-admissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${doctorToken}` },
      body: JSON.stringify({
        patientId: testPatient2.id,
        wardId: sourceWard.id,
        bedId: initialBed.id,
        admissionDiagnosis: 'Concurrent attempt test',
        chiefComplaint: 'Complaint',
      }),
    });
    assert(resConflictAdmit.status === 409 || resConflictAdmit.status === 400, 'CONC-001', 'Allocation to already occupied bed is blocked (409 Conflict)');

    // Test simultaneous race: pick a free bed and fire 2 requests at once
    const raceBed = await prisma.bed.findFirst({
      where: { wardId: sourceWard.id, status: 'AVAILABLE', id: { not: initialBed.id } },
    });

    if (raceBed) {
      // Create temporary patient 3
      const u3 = await prisma.user.create({
        data: {
          email: `race.test.${Date.now()}@meditwin.local`,
          password_hash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
          roleId: patientRole!.id,
        },
      });
      const p3 = await prisma.patient.create({
        data: { userId: u3.id, firstName: 'Race3', lastName: 'Patient', dateOfBirth: new Date('1995-01-01') },
      });

      const [raceRes1, raceRes2] = await Promise.all([
        fetch(`${BACKEND_URL}/api/doctor/inpatient-admissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${doctorToken}` },
          body: JSON.stringify({
            patientId: testPatient2.id,
            wardId: sourceWard.id,
            bedId: raceBed.id,
            admissionDiagnosis: 'Race contender 1',
            chiefComplaint: 'Chest pain',
          }),
        }),
        fetch(`${BACKEND_URL}/api/doctor/inpatient-admissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${doctorToken}` },
          body: JSON.stringify({
            patientId: p3.id,
            wardId: sourceWard.id,
            bedId: raceBed.id,
            admissionDiagnosis: 'Race contender 2',
            chiefComplaint: 'Abdominal pain',
          }),
        }),
      ]);

      const statuses = [raceRes1.status, raceRes2.status];
      const has201 = statuses.includes(201);
      const hasConflict = statuses.includes(409) || statuses.includes(400);
      assert(has201 && hasConflict, 'CONC-002', 'Simultaneous race condition resolved: exactly one succeeded (201) and one rejected (409)');

      // Cleanup race winner
      const raceAdm = await prisma.inpatientAdmission.findFirst({
        where: { bedId: raceBed.id, admissionStatus: 'ADMITTED' },
      });
      if (raceAdm) {
        await prisma.inpatientAdmission.delete({ where: { id: raceAdm.id } });
      }
      await prisma.bed.update({ where: { id: raceBed.id }, data: { status: 'AVAILABLE' } });
      await prisma.patient.delete({ where: { id: p3.id } });
      await prisma.user.delete({ where: { id: u3.id } });
    }

    // ─────────────────────────────────────────────────────────────
    // PHASE 6: Transactional Bed Transfer & History Logging
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Phase 6: Transactional Bed Transfer ---');
    const resTransfer = await fetch(`${BACKEND_URL}/api/doctor/inpatient-admissions/${admittedAdmissionId}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${doctorToken}` },
      body: JSON.stringify({
        destinationWardId: destWard.id,
        destinationBedId: transferTargetBed.id,
        transferReason: 'Step-down transfer to medical inpatient ward',
      }),
    });
    const transferJson = await resTransfer.json();
    assert(resTransfer.status === 200 && transferJson.success === true, 'XFER-001', 'POST /inpatient-admissions/:id/transfer succeeded');

    // Verify destination bed became OCCUPIED
    const freshDestBed = await prisma.bed.findUnique({ where: { id: transferTargetBed.id } });
    assert(freshDestBed?.status === 'OCCUPIED', 'XFER-002', `Destination bed ${transferTargetBed.bedNumber} is now OCCUPIED`);

    // Verify source bed became AVAILABLE
    const releasedSourceBed = await prisma.bed.findUnique({ where: { id: initialBed.id } });
    assert(releasedSourceBed?.status === 'AVAILABLE', 'XFER-003', `Source bed ${initialBed.bedNumber} atomically released to AVAILABLE`);

    // Verify BedTransferHistory was recorded
    const transferHistory = await prisma.bedTransferHistory.findFirst({
      where: { admissionId: admittedAdmissionId! },
    });
    assert(Boolean(transferHistory) && transferHistory?.toBedId === transferTargetBed.id, 'XFER-004', 'BedTransferHistory record persisted with accurate audit details');

    // ─────────────────────────────────────────────────────────────
    // PHASE 7: Admission Timeline & Audit Events
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Phase 7: Chronological Admission Timeline ---');
    const resTimeline = await fetch(`${BACKEND_URL}/api/doctor/inpatient-admissions/${admittedAdmissionId}/history`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    const timelineJson = await resTimeline.json();
    assert(resTimeline.status === 200 && Array.isArray(timelineJson.data?.timeline), 'TIMELINE-001', 'GET /inpatient-admissions/:id/history returns timeline');
    const events = timelineJson.data?.timeline || [];
    assert(events.some((e: any) => e.eventType === 'ADMISSION_CREATED'), 'TIMELINE-002', 'Timeline includes initial ADMISSION_CREATED event');
    assert(events.some((e: any) => e.eventType === 'BED_TRANSFERRED'), 'TIMELINE-003', 'Timeline includes subsequent BED_TRANSFERRED event');

    // ─────────────────────────────────────────────────────────────
    // PHASE 8: Inpatient Discharge & Bed Inventory Release
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Phase 8: Discharge Workflow & Inventory Release ---');
    const resDischarge = await fetch(`${BACKEND_URL}/api/doctor/inpatient-admissions/${admittedAdmissionId}/discharge`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    const dischargeJson = await resDischarge.json();
    assert(resDischarge.status === 200 && dischargeJson.success === true, 'DISCH-001', 'POST /inpatient-admissions/:id/discharge returns success');

    // Verify bed is released to AVAILABLE
    const finalBed = await prisma.bed.findUnique({ where: { id: transferTargetBed.id } });
    assert(finalBed?.status === 'AVAILABLE', 'DISCH-002', `${transferTargetBed.bedNumber} released back to AVAILABLE inventory`);

    // Clean up test records
    if (admittedAdmissionId) {
      await prisma.bedTransferHistory.deleteMany({ where: { admissionId: admittedAdmissionId } });
      await prisma.inpatientAdmission.deleteMany({ where: { id: admittedAdmissionId } });
    }
    const patientIds = [testPatient1?.id, testPatient2?.id].filter(Boolean);
    if (patientIds.length > 0) {
      await prisma.medicalRecord.deleteMany({ where: { patientId: { in: patientIds } } });
      await prisma.patient.deleteMany({ where: { id: { in: patientIds } } });
    }
    const userIds = [testUser1?.id, testUser2?.id].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }

  } catch (err: any) {
    console.error('Fatal test execution error:', err);
    failedCount++;
  }

  console.log('\n=============================================================');
  console.log(`  FINAL RESULT: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('=============================================================\n');

  await prisma.$disconnect();
  process.exit(failedCount > 0 ? 1 : 0);
}

runInpatientManagementTestSuite();
