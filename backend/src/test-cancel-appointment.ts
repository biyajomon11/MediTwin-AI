import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import patientRouter from './routes/patient';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-meditwin-jwt-key';

let passed = 0;
let failed = 0;

function assert(condition: any, testId: string, desc: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testId}: ${desc}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${testId}: ${desc}`);
    failed++;
  }
}

async function runTests() {
  console.log('=============================================================');
  console.log('  MEDITWIN AI — PATIENT CANCEL APPOINTMENT TEST SUITE');
  console.log('=============================================================\n');

  const app = express();
  app.use(express.json());
  app.use('/api/patient', patientRouter);
  const server = app.listen(5098);
  const BASE = 'http://localhost:5098/api/patient';

  try {
    // 1. Resolve or create test doctor, patient 1, and patient 2
    const doctor = await prisma.doctor.findFirst({
      include: { user: true, department: true },
    });
    if (!doctor) throw new Error('No doctor found in database');

    const patientRole = await prisma.role.findFirst({ where: { name: 'patient' } });
    if (!patientRole) throw new Error('No patient role found');

    const scheduledStatus = await prisma.appointmentStatus.findFirst({
      where: { name: { equals: 'scheduled', mode: 'insensitive' } },
    }) || await prisma.appointmentStatus.create({ data: { name: 'scheduled' } });

    const cancelledStatus = await prisma.appointmentStatus.findFirst({
      where: { name: { equals: 'cancelled', mode: 'insensitive' } },
    }) || await prisma.appointmentStatus.create({ data: { name: 'cancelled' } });

    const completedStatus = await prisma.appointmentStatus.findFirst({
      where: { name: { equals: 'completed', mode: 'insensitive' } },
    }) || await prisma.appointmentStatus.create({ data: { name: 'completed' } });

    // Create Patient 1 (Primary Test Patient)
    const p1Email = `cancel.test1.${Date.now()}@meditwin.local`;
    const user1 = await prisma.user.create({
      data: {
        email: p1Email,
        password_hash: 'hash',
        roleId: patientRole.id,
      },
    });
    const patient1 = await prisma.patient.create({
      data: {
        userId: user1.id,
        firstName: 'Primary',
        lastName: 'Patient',
        dateOfBirth: new Date('1990-01-01'),
      },
    });

    // Create Patient 2 (Unauthorized / Second Patient)
    const p2Email = `cancel.test2.${Date.now()}@meditwin.local`;
    const user2 = await prisma.user.create({
      data: {
        email: p2Email,
        password_hash: 'hash',
        roleId: patientRole.id,
      },
    });
    const patient2 = await prisma.patient.create({
      data: {
        userId: user2.id,
        firstName: 'Other',
        lastName: 'Patient',
        dateOfBirth: new Date('1992-05-15'),
      },
    });

    // Generate JWT tokens
    const tokenPatient1 = jwt.sign(
      { userId: user1.id, email: user1.email, role: 'patient', patientId: patient1.id },
      JWT_SECRET
    );
    const tokenPatient2 = jwt.sign(
      { userId: user2.id, email: user2.email, role: 'patient', patientId: patient2.id },
      JWT_SECRET
    );

    // Create future appointments for Patient 1
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    const futureDateOnly = new Date(Date.UTC(futureDate.getFullYear(), futureDate.getMonth(), futureDate.getDate()));
    const futureTime = new Date('1970-01-01T10:30:00.000Z');

    const apptUpcoming = await prisma.appointment.create({
      data: {
        patientId: patient1.id,
        doctorId: doctor.id,
        appointmentDate: futureDateOnly,
        appointmentTime: futureTime,
        statusId: scheduledStatus.id,
        reason: 'Follow-up consultation for blood pressure',
        notes: 'Initial booking notes',
      },
    });

    // Create a past appointment for Patient 1
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);
    const pastDateOnly = new Date(Date.UTC(pastDate.getFullYear(), pastDate.getMonth(), pastDate.getDate()));

    const apptPast = await prisma.appointment.create({
      data: {
        patientId: patient1.id,
        doctorId: doctor.id,
        appointmentDate: pastDateOnly,
        appointmentTime: futureTime,
        statusId: scheduledStatus.id,
        reason: 'Old checkup',
      },
    });

    // Create an already completed appointment
    const apptCompleted = await prisma.appointment.create({
      data: {
        patientId: patient1.id,
        doctorId: doctor.id,
        appointmentDate: futureDateOnly,
        appointmentTime: new Date('1970-01-01T14:00:00.000Z'),
        statusId: completedStatus.id,
        reason: 'Completed consultation',
      },
    });

    console.log('--- Phase 1: Security & Ownership Tests ---');

    // TEST 1: Unauthenticated request rejected
    const unauthRes = await fetch(`${BASE}/appointments/${apptUpcoming.id}/cancel`, {
      method: 'PATCH',
    });
    assert(unauthRes.status === 401, 'SEC-001', 'Unauthenticated cancellation request rejected with 401');

    // TEST 2: Patient 2 attempting to cancel Patient 1's appointment rejected
    const crossPatientRes = await fetch(`${BASE}/appointments/${apptUpcoming.id}/cancel`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${tokenPatient2}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason: 'Malicious attempt' }),
    });
    const crossData = await crossPatientRes.json();
    assert(crossPatientRes.status === 403, 'SEC-002', "Patient cannot cancel another patient's appointment (403 Forbidden)");
    assert(crossData.error?.includes('Access denied'), 'SEC-003', 'Clear authorization error message returned');

    // TEST 3: Invalid appointment ID returns 400
    const invalidIdRes = await fetch(`${BASE}/appointments/invalid-id/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenPatient1}` },
    });
    assert(invalidIdRes.status === 400, 'VAL-001', 'Invalid appointment ID returns 400 Bad Request');

    // TEST 4: Non-existent appointment ID returns 404
    const notFoundRes = await fetch(`${BASE}/appointments/999999/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenPatient1}` },
    });
    assert(notFoundRes.status === 404, 'VAL-002', 'Non-existent appointment ID returns 404 Not Found');

    console.log('\n--- Phase 2: Hospital Policy & Validation Tests ---');

    // TEST 5: Past appointment cannot be cancelled online
    const pastRes = await fetch(`${BASE}/appointments/${apptPast.id}/cancel`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${tokenPatient1}`,
        'Content-Type': 'application/json',
      },
    });
    const pastData = await pastRes.json();
    assert(pastRes.status === 400, 'POL-001', 'Past appointment cancellation blocked with 400 Bad Request');
    assert(pastData.error?.includes('Past appointments cannot be cancelled'), 'POL-002', 'Helpful hospital policy explanation returned');

    // TEST 6: Completed appointment cannot be cancelled
    const completedRes = await fetch(`${BASE}/appointments/${apptCompleted.id}/cancel`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${tokenPatient1}`,
        'Content-Type': 'application/json',
      },
    });
    assert(completedRes.status === 400, 'POL-003', 'Completed consultation cancellation blocked with 400 Bad Request');

    console.log('\n--- Phase 3: Successful Cancellation & Data Integrity ---');

    // TEST 7: Patient cancels their own upcoming appointment with optional reason
    const testReason = 'Personal schedule conflict with office meeting';
    const cancelRes = await fetch(`${BASE}/appointments/${apptUpcoming.id}/cancel`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${tokenPatient1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason: testReason }),
    });
    const cancelData = await cancelRes.json();
    assert(cancelRes.status === 200, 'CANCEL-001', 'Eligible upcoming appointment cancelled successfully (200 OK)');
    assert(cancelData.success === true, 'CANCEL-002', 'Success response flag is true');
    assert(cancelData.data?.status === 'cancelled', 'CANCEL-003', 'Returned appointment status is cancelled');

    // TEST 8: Verify in database that status is CANCELLED and notes/audit are preserved
    const dbAppt = await prisma.appointment.findUnique({
      where: { id: apptUpcoming.id },
      include: { status: true },
    });
    assert(dbAppt?.status.name.toLowerCase() === 'cancelled', 'DB-001', 'Appointment status in PostgreSQL updated to cancelled');
    assert(dbAppt?.notes?.includes(testReason), 'DB-002', 'Cancellation reason safely appended to notes');
    assert(dbAppt?.notes?.includes('CANCELLED'), 'DB-003', 'Cancellation timestamp recorded in notes');
    assert(dbAppt?.reason === 'Follow-up consultation for blood pressure', 'DB-004', 'Original clinical booking reason preserved');

    // TEST 9: Verify audit log was recorded
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        userId: user1.id,
        recordId: apptUpcoming.id,
        tableName: 'appointments',
      },
      orderBy: { createdAt: 'desc' },
    });
    assert(Boolean(auditLog), 'AUDIT-001', 'Audit log entry created for appointment cancellation');
    const auditValues = auditLog?.newValues as any;
    assert(auditValues?.cancellationReason === testReason, 'AUDIT-002', 'Audit log stores cancellation reason without sensitive credentials');

    console.log('\n--- Phase 4: Repeated / Idempotency & Slot Rebooking ---');

    // TEST 10: Repeated cancellation request returns 400
    const repeatRes = await fetch(`${BASE}/appointments/${apptUpcoming.id}/cancel`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${tokenPatient1}`,
        'Content-Type': 'application/json',
      },
    });
    const repeatData = await repeatRes.json();
    assert(repeatRes.status === 400, 'IDEMP-001', 'Repeated cancellation blocked with 400 Bad Request');
    assert(repeatData.error?.includes('already been cancelled'), 'IDEMP-002', 'Clear message stating appointment is already cancelled');

    // TEST 11: Released slot is now free for rebooking
    // Check doctor availability on that date/time
    const apptSlotTimeStr = '10:30 AM';
    const conflictQuery = await prisma.appointment.findFirst({
      where: {
        doctorId: doctor.id,
        appointmentDate: futureDateOnly,
        appointmentTime: futureTime,
        statusId: { not: cancelledStatus.id },
      },
    });
    assert(conflictQuery === null, 'SLOT-001', 'Cancelled appointment no longer blocks the doctor schedule slot');

    console.log('\n=============================================================');
    console.log(`  FINAL RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('=============================================================\n');

    if (failed > 0) {
      throw new Error(`${failed} tests failed`);
    }
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
