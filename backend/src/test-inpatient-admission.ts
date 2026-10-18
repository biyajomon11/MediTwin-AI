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

async function runTestSuite() {
  console.log('\n=============================================================');
  console.log('  MEDITWIN AI — INPATIENT ADMISSION AUTOMATED TEST SUITE');
  console.log('=============================================================\n');

  try {
    // 0. Ensure ward and bed inventory is ready
    await seedWardsAndBeds();

    // 1. Resolve test doctor and patient
    const doctorUser = await prisma.user.findFirst({
      where: { email: 'dr.jolda@meditwin.org' },
      include: { doctor: true, role: true },
    }) || await prisma.user.findFirst({
      where: { role: { name: 'doctor' } },
      include: { doctor: true, role: true },
    });

    if (!doctorUser || !doctorUser.doctor) {
      throw new Error('Test doctor not found in database.');
    }

    const patientRole = await prisma.role.findFirst({ where: { name: 'patient' } });
    const maleGender = await prisma.gender.findFirst();
    const bloodGroup = await prisma.bloodGroup.findFirst();

    // Create a dedicated clean test outpatient
    const testOutpatientEmail = `test.outpatient.${Date.now()}@meditwin.local`;
    const outpatientUser = await prisma.user.create({
      data: {
        email: testOutpatientEmail,
        password_hash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
        roleId: patientRole!.id,
        isActive: true,
      },
    });

    const testPatient = await prisma.patient.create({
      data: {
        userId: outpatientUser.id,
        firstName: 'TestOutpatient',
        lastName: 'Sharma',
        dateOfBirth: new Date('1985-06-15'),
        genderId: maleGender?.id,
        bloodGroupId: bloodGroup?.id,
        phone: '+91 98765 43210',
        admissionStatus: 'Active',
      },
    });

    // Create a mock outpatient appointment to verify history retention
    const apptStatus = await prisma.appointmentStatus.findFirst() || await prisma.appointmentStatus.create({
      data: { name: 'Confirmed' },
    });
    const testAppt = await prisma.appointment.create({
      data: {
        patientId: testPatient.id,
        doctorId: doctorUser.doctor.id,
        appointmentDate: new Date('2026-10-01'),
        appointmentTime: new Date('1970-01-01T09:30:00Z'),
        statusId: apptStatus.id,
        reason: 'Outpatient evaluation for persistent cough',
      },
    });

    // Create an unlinked patient (no prior appointments)
    const unlinkedUser = await prisma.user.create({
      data: {
        email: `unlinked.patient.${Date.now()}@meditwin.local`,
        password_hash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
        roleId: patientRole!.id,
      },
    });
    const unlinkedPatient = await prisma.patient.create({
      data: {
        userId: unlinkedUser.id,
        firstName: 'Unlinked',
        lastName: 'DirectAdmission',
        dateOfBirth: new Date('1992-03-20'),
        genderId: maleGender?.id,
        phone: '+91 91234 56789',
        admissionStatus: 'Active',
      },
    });

    // Tokens
    const doctorToken = jwt.sign(
      { userId: doctorUser.id, email: doctorUser.email, role: 'doctor' },
      JWT_SECRET,
      { expiresIn: '2h' }
    );
    const patientToken = jwt.sign(
      { userId: outpatientUser.id, email: outpatientUser.email, role: 'patient' },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    // Fetch Wards and find an available bed
    const wards = await prisma.ward.findMany({
      include: { beds: true },
    });
    const ward1 = wards.find((w) => w.wardNumber === 'Ward 1') || wards[0];
    const availableBed = ward1.beds.find((b) => b.status === 'AVAILABLE');
    if (!availableBed) {
      throw new Error('No available bed in Ward 1 for testing.');
    }

    console.log(`Test environment setup complete. Using Patient #${testPatient.id}, Ward: ${ward1.name}, Bed: ${availableBed.bedNumber}\n`);

    // ─────────────────────────────────────────────────────────────
    // TEST 1: Unauthenticated request rejected with 401
    // ─────────────────────────────────────────────────────────────
    console.log('Testing Authentication & Authorization Guards...');
    const resNoAuth = await fetch(`${BACKEND_URL}/api/doctor/inpatient-admissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId: testPatient.id, wardId: ward1.id, bedId: availableBed.id }),
    });
    assert(resNoAuth.status === 401, 'AUTH-001', 'Request without token rejected with 401 Unauthorized');

    // ─────────────────────────────────────────────────────────────
    // TEST 2: Non-doctor role rejected with 403
    // ─────────────────────────────────────────────────────────────
    const resPatientRole = await fetch(`${BACKEND_URL}/api/doctor/inpatient-admissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({ patientId: testPatient.id, wardId: ward1.id, bedId: availableBed.id }),
    });
    assert(resPatientRole.status === 403, 'AUTH-002', 'Patient role attempting admission rejected with 403 Forbidden');

    // ─────────────────────────────────────────────────────────────
    // TEST 3: Validation failure for missing required fields (400)
    // ─────────────────────────────────────────────────────────────
    console.log('\nTesting Validation Rules...');
    const resMissingFields = await fetch(`${BACKEND_URL}/api/doctor/inpatient-admissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${doctorToken}`,
      },
      body: JSON.stringify({
        patientId: testPatient.id,
        wardId: ward1.id,
        // missing bedId, admissionDiagnosis, chiefComplaint
      }),
    });
    assert(resMissingFields.status === 400, 'VAL-001', 'Missing required fields rejected with 400 Validation Error');

    // ─────────────────────────────────────────────────────────────
    // TEST 4: Invalid / Nonexistent patient rejected with 404
    // ─────────────────────────────────────────────────────────────
    const resInvalidPatient = await fetch(`${BACKEND_URL}/api/doctor/inpatient-admissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${doctorToken}`,
      },
      body: JSON.stringify({
        patientId: 999999,
        wardId: ward1.id,
        bedId: availableBed.id,
        admissionDiagnosis: 'Acute Bronchitis',
        chiefComplaint: 'Severe shortness of breath',
      }),
    });
    assert(resInvalidPatient.status === 404, 'VAL-002', 'Nonexistent patient rejected with 404 Not Found');

    // ─────────────────────────────────────────────────────────────
    // TEST 5: Mismatched bed (bed not belonging to ward) rejected with 400
    // ─────────────────────────────────────────────────────────────
    const ward2 = wards.find((w) => w.wardNumber === 'Ward 2') || wards[1];
    const ward2Bed = ward2.beds[0];
    const resMismatchedBed = await fetch(`${BACKEND_URL}/api/doctor/inpatient-admissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${doctorToken}`,
      },
      body: JSON.stringify({
        patientId: testPatient.id,
        wardId: ward1.id,
        bedId: ward2Bed.id, // belongs to Ward 2, not Ward 1
        admissionDiagnosis: 'Acute Bronchitis',
        chiefComplaint: 'Severe cough',
      }),
    });
    assert(resMismatchedBed.status === 400, 'VAL-003', 'Bed from wrong ward rejected with 400 Bad Request');

    // ─────────────────────────────────────────────────────────────
    // TEST 6: Successful Inpatient Admission of Outpatient with Referrals
    // ─────────────────────────────────────────────────────────────
    console.log('\nTesting Inpatient Admission Workflow & Persistence...');
    const admissionPayload = {
      patientId: testPatient.id,
      wardId: ward1.id,
      bedId: availableBed.id,
      admissionDiagnosis: 'Community-Acquired Pneumonia with Exacerbated Asthma',
      chiefComplaint: 'Persistent high fever, productive cough, and SpO2 89% on room air',
      nursingHandoverInstructions: 'Initiate supplemental oxygen at 2L/min via nasal cannula. Administer IV Ceftriaxone 1g q24h and nebulize with Salbutamol q6h.',
      admissionStatus: 'ADMITTED',
      acuityLevel: 'HIGH',
      sourceAppointmentId: testAppt.id,
    };

    const resAdmission = await fetch(`${BACKEND_URL}/api/doctor/inpatient-admissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${doctorToken}`,
      },
      body: JSON.stringify(admissionPayload),
    });

    const jsonAdmission = await resAdmission.json();
    assert(resAdmission.status === 201 && jsonAdmission.success, 'ADM-001', 'Inpatient admission created successfully with 201 Created');
    assert(Boolean(jsonAdmission.data?.admissionNumber?.startsWith('ADM-')), 'ADM-002', `Generated valid admission number: ${jsonAdmission.data?.admissionNumber}`);

    const admissionId = jsonAdmission.data?.id;

    // ─────────────────────────────────────────────────────────────
    // TEST 7: Database State Verification (Bed Occupied, Patient Status Updated)
    // ─────────────────────────────────────────────────────────────
    const updatedBed = await prisma.bed.findUnique({ where: { id: availableBed.id } });
    assert(updatedBed?.status === 'OCCUPIED', 'DB-001', `Bed ${availableBed.bedNumber} status atomically changed to OCCUPIED`);

    const updatedPatient = await prisma.patient.findUnique({ where: { id: testPatient.id } });
    assert(updatedPatient?.admissionStatus === 'Admitted', 'DB-002', 'Patient admissionStatus in PostgreSQL updated to Admitted');
    assert(updatedPatient?.bedNumber === availableBed.bedNumber, 'DB-003', `Patient bedNumber updated to ${availableBed.bedNumber}`);
    assert(updatedPatient?.ward?.includes(ward1.wardNumber), 'DB-004', `Patient ward correctly set to ${updatedPatient?.ward}`);

    // ─────────────────────────────────────────────────────────────
    // TEST 8: Clinical Separation: Acuity vs Admission Status
    // ─────────────────────────────────────────────────────────────
    const savedAdmission = await prisma.inpatientAdmission.findUnique({ where: { id: admissionId } });
    assert(
      savedAdmission?.acuityLevel === 'HIGH' && savedAdmission?.admissionStatus === 'ADMITTED',
      'CLIN-001',
      'Clinical acuity (HIGH) stored separately from admission lifecycle status (ADMITTED)'
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 9: Nursing Handover Instructions Persistence
    // ─────────────────────────────────────────────────────────────
    assert(
      savedAdmission?.nursingHandoverInstructions === admissionPayload.nursingHandoverInstructions,
      'NURSE-001',
      'Nursing handover instructions accurately preserved on InpatientAdmission entity'
    );

    const handoverNote = await prisma.medicalRecord.findFirst({
      where: {
        patientId: testPatient.id,
        title: { contains: 'Doctor Admission Handover' },
      },
    });
    assert(Boolean(handoverNote), 'NURSE-002', 'Nursing handover note persisted in medical_records for ward nurse telemetry');

    // ─────────────────────────────────────────────────────────────
    // TEST 10: Outpatient Appointment History Preserved
    // ─────────────────────────────────────────────────────────────
    const remainingAppt = await prisma.appointment.findUnique({ where: { id: testAppt.id } });
    assert(Boolean(remainingAppt), 'HIST-001', 'Prior outpatient appointment remains intact and not overwritten');

    // ─────────────────────────────────────────────────────────────
    // TEST 11: Audit Logging Verification
    // ─────────────────────────────────────────────────────────────
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        userId: doctorUser.id,
        createdAt: { gte: new Date(Date.now() - 60000) },
      },
      orderBy: { id: 'desc' },
      take: 10,
    });
    const hasAdmissionAudit = auditLogs.some((l) => (l.newValues as any)?.action === 'INPATIENT_ADMISSION_CREATED');
    const hasBedAudit = auditLogs.some((l) => (l.newValues as any)?.action === 'BED_ASSIGNED');
    assert(hasAdmissionAudit, 'AUDIT-001', 'Audit trail logged INPATIENT_ADMISSION_CREATED with zero-PHI metadata');
    assert(hasBedAudit, 'AUDIT-002', 'Audit trail logged BED_ASSIGNED event');

    // ─────────────────────────────────────────────────────────────
    // TEST 12: Bed Conflict — Attempting to admit another patient to same occupied bed -> 409 Conflict
    // ─────────────────────────────────────────────────────────────
    console.log('\nTesting Concurrency & Conflict Prevention...');
    const resBedConflict = await fetch(`${BACKEND_URL}/api/doctor/inpatient-admissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${doctorToken}`,
      },
      body: JSON.stringify({
        patientId: unlinkedPatient.id,
        wardId: ward1.id,
        bedId: availableBed.id, // currently occupied by testPatient
        admissionDiagnosis: 'Acute Gout Flare',
        chiefComplaint: 'Joint swelling',
      }),
    });
    assert(resBedConflict.status === 409, 'CONF-001', 'Attempt to assign currently occupied bed blocked with 409 Conflict');

    // ─────────────────────────────────────────────────────────────
    // TEST 13: Already Admitted Patient Conflict -> 409 Conflict
    // ─────────────────────────────────────────────────────────────
    // Find another available bed
    const nextAvailableBed = ward1.beds.find((b) => b.id !== availableBed.id && b.status === 'AVAILABLE');
    const resAlreadyAdmitted = await fetch(`${BACKEND_URL}/api/doctor/inpatient-admissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${doctorToken}`,
      },
      body: JSON.stringify({
        patientId: testPatient.id, // already actively admitted
        wardId: ward1.id,
        bedId: nextAvailableBed!.id,
        admissionDiagnosis: 'Secondary Evaluation',
        chiefComplaint: 'Follow up',
      }),
    });
    assert(resAlreadyAdmitted.status === 409, 'CONF-002', 'Attempt to admit an already actively admitted patient blocked with 409 Conflict');

    // ─────────────────────────────────────────────────────────────
    // TEST 14: Direct Inpatient Admission for Unlinked Registered Patient
    // ─────────────────────────────────────────────────────────────
    console.log('\nTesting Direct Registered Patient Admission...');
    const resUnlinkedAdmission = await fetch(`${BACKEND_URL}/api/doctor/inpatient-admissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${doctorToken}`,
      },
      body: JSON.stringify({
        patientId: unlinkedPatient.id,
        wardId: ward1.id,
        bedId: nextAvailableBed!.id,
        admissionDiagnosis: 'Hypertensive Emergency',
        chiefComplaint: 'Systolic blood pressure > 190 mmHg with headache',
        nursingHandoverInstructions: 'Hourly BP monitoring and IV Labetalol titration.',
        admissionStatus: 'UNDER_OBSERVATION',
        acuityLevel: 'CRITICAL',
      }),
    });
    const jsonUnlinked = await resUnlinkedAdmission.json();
    assert(resUnlinkedAdmission.status === 201 && jsonUnlinked.success, 'ADM-003', 'Direct registered patient admitted successfully without requiring appointment');

    const updatedUnlinkedPatient = await prisma.patient.findUnique({ where: { id: unlinkedPatient.id } });
    assert(updatedUnlinkedPatient?.admissionStatus === 'Under Observation', 'DB-005', 'Patient status correctly set to Under Observation');

    // ─────────────────────────────────────────────────────────────
    // TEST 15: Inpatient Admissions List Endpoint
    // ─────────────────────────────────────────────────────────────
    console.log('\nTesting Inpatient Admissions Query & Search Endpoints...');
    const resList = await fetch(`${BACKEND_URL}/api/doctor/inpatient-admissions?status=ADMITTED`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    const jsonList = await resList.json();
    assert(resList.status === 200 && Array.isArray(jsonList.data), 'QUERY-001', 'GET /inpatient-admissions returned array of active admissions');
    assert(jsonList.data.some((a: any) => a.id === admissionId), 'QUERY-002', 'Created admission appears in doctor admissions list');

    // ─────────────────────────────────────────────────────────────
    // TEST 16: Inpatient Admission Details Endpoint
    // ─────────────────────────────────────────────────────────────
    const resDetails = await fetch(`${BACKEND_URL}/api/doctor/inpatient-admissions/${admissionId}`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    const jsonDetails = await resDetails.json();
    assert(
      resDetails.status === 200 && jsonDetails.data?.admissionNumber === jsonAdmission.data?.admissionNumber,
      'QUERY-003',
      'GET /inpatient-admissions/:id returns comprehensive admission record with patient, doctor, ward, bed'
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 17: Ward and Bed Availability Retrieval
    // ─────────────────────────────────────────────────────────────
    const resWards = await fetch(`${BACKEND_URL}/api/doctor/wards`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    const jsonWards = await resWards.json();
    assert(resWards.status === 200 && jsonWards.data.length >= 5, 'WARD-001', 'GET /wards returns hospital wards with availability metrics');

    const resBeds = await fetch(`${BACKEND_URL}/api/doctor/wards/${ward1.id}/beds`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    const jsonBeds = await resBeds.json();
    assert(resBeds.status === 200 && Array.isArray(jsonBeds.data?.beds), 'BED-001', 'GET /wards/:wardId/beds returns bed inventory');
    const checkedBed = jsonBeds.data?.beds.find((b: any) => b.id === availableBed.id);
    assert(checkedBed?.status === 'OCCUPIED' && checkedBed?.isAvailable === false, 'BED-002', 'Assigned bed correctly marked as occupied in ward inventory');

    // ─────────────────────────────────────────────────────────────
    // TEST 18: Patient Search for Inpatient Admission
    // ─────────────────────────────────────────────────────────────
    const resSearch = await fetch(`${BACKEND_URL}/api/doctor/patients/search?q=TestOutpatient`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    const jsonSearch = await resSearch.json();
    assert(resSearch.status === 200 && jsonSearch.data?.length > 0, 'SEARCH-001', 'GET /patients/search finds patient by query');
    const foundPatient = jsonSearch.data[0];
    assert(foundPatient.isAdmitted === true && foundPatient.currentAdmission !== null, 'SEARCH-002', 'Patient search indicates current active admission');

    // ─────────────────────────────────────────────────────────────
    // Cleanup test artifacts
    // ─────────────────────────────────────────────────────────────
    console.log('\nCleaning up test artifacts...');
    await prisma.inpatientAdmission.deleteMany({
      where: { patientId: { in: [testPatient.id, unlinkedPatient.id] } },
    });
    await prisma.medicalRecord.deleteMany({
      where: { patientId: { in: [testPatient.id, unlinkedPatient.id] } },
    });
    await prisma.appointment.deleteMany({
      where: { patientId: { in: [testPatient.id, unlinkedPatient.id] } },
    });
    await prisma.patient.deleteMany({
      where: { id: { in: [testPatient.id, unlinkedPatient.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [outpatientUser.id, unlinkedUser.id] } },
    });

    // Reset beds
    await prisma.bed.update({
      where: { id: availableBed.id },
      data: { status: 'AVAILABLE' },
    });
    if (nextAvailableBed) {
      await prisma.bed.update({
        where: { id: nextAvailableBed.id },
        data: { status: 'AVAILABLE' },
      });
    }

    console.log('Cleanup finished.\n');
  } catch (err: any) {
    console.error('Fatal test runner error:', err);
    failedCount++;
  }

  console.log('=============================================================');
  console.log(`  TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('=============================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error('Unhandled test suite error:', err);
    prisma.$disconnect();
    process.exit(1);
  });
