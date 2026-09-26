import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding hospital departments, doctors, and doctor availability schedules...');

  // 1. Ensure Hospital
  let hospital = await prisma.hospital.findFirst({ where: { name: { contains: 'MediTwin', mode: 'insensitive' } } });
  if (!hospital) {
    hospital = await prisma.hospital.findFirst();
  }
  if (!hospital) {
    hospital = await prisma.hospital.create({
      data: {
        name: 'MediTwin Central Hospital',
        address: '100 Medical Centre Boulevard',
        city: 'Kochi',
        state: 'Kerala',
        phone: '+91 484 288 9000',
        email: 'info@meditwin-hospital.org',
      },
    });
  } else {
    hospital = await prisma.hospital.update({
      where: { id: hospital.id },
      data: {
        name: 'MediTwin Central Hospital',
        address: '100 Medical Centre Boulevard',
        city: 'Kochi',
        state: 'Kerala',
        phone: '+91 484 288 9000',
        email: 'info@meditwin-hospital.org',
      },
    });
  }

  // 2. Ensure Departments
  const deptDefs = [
    { name: 'Cardiology Department', description: 'Comprehensive diagnostic and interventional cardiovascular care' },
    { name: 'General Medicine Department', description: 'Primary care, preventive health, and internal medicine' },
    { name: 'Neurology Department', description: 'Advanced neurological disorders and stroke care' },
    { name: 'Pediatrics Department', description: 'Comprehensive infant, child, and adolescent healthcare' },
  ];

  const deptMap: Record<string, number> = {};
  for (const def of deptDefs) {
    let dept = await prisma.department.findFirst({ where: { name: def.name, hospitalId: hospital.id } });
    if (!dept) {
      dept = await prisma.department.create({
        data: {
          name: def.name,
          description: def.description,
          hospitalId: hospital.id,
        },
      });
    }
    deptMap[def.name] = dept.id;
  }

  // 3. Ensure Specializations
  const specDefs = ['Cardiology', 'General Medicine', 'Neurology', 'Pediatrics'];
  const specMap: Record<string, number> = {};
  for (const s of specDefs) {
    let spec = await prisma.specialization.findUnique({ where: { name: s } });
    if (!spec) {
      spec = await prisma.specialization.create({ data: { name: s } });
    }
    specMap[s] = spec.id;
  }

  // 4. Ensure Roles
  const doctorRole = await prisma.role.findUnique({ where: { name: 'doctor' } });
  if (!doctorRole) {
    throw new Error('Doctor role not found in database');
  }

  const defaultPasswordHash = await bcrypt.hash('Doctor@123', 10);

  // 5. Ensure Key Doctors (Dr. Sarah Joseph, Dr. Anil Kumar, Dr. Meera Joseph, Dr. Biya Jomon, Dr. Bittu Jomon)
  const doctorsToSeed = [
    {
      email: 'sarah01@gmail.com',
      firstName: 'Sarah',
      lastName: 'Joseph',
      specialization: 'Cardiology',
      department: 'Cardiology Department',
      phone: '+91 98450 11223',
      yearsOfExperience: 14,
      licenseNumber: 'MID-123D-456',
    },
    {
      email: 'anil.kumar@meditwin.org',
      firstName: 'Anil',
      lastName: 'Kumar',
      specialization: 'Cardiology',
      department: 'Cardiology Department',
      phone: '+91 98450 22334',
      yearsOfExperience: 16,
      licenseNumber: 'DOC-AK-4401',
    },
    {
      email: 'meera.joseph@meditwin.org',
      firstName: 'Meera',
      lastName: 'Joseph',
      specialization: 'General Medicine',
      department: 'General Medicine Department',
      phone: '+91 98450 33445',
      yearsOfExperience: 11,
      licenseNumber: 'DOC-MJ-5502',
    },
    {
      email: 'biyajomon966@gamil.com',
      firstName: 'Biya',
      lastName: 'Jomon',
      specialization: 'General Medicine',
      department: 'General Medicine Department',
      phone: '+91 98450 44556',
      yearsOfExperience: 15,
      licenseNumber: 'LIC-1255',
    },
    {
      email: 'bittujomon50@gmail.com',
      firstName: 'Bittu',
      lastName: 'Jomon',
      specialization: 'General Medicine',
      department: 'General Medicine Department',
      phone: '+91 62724 56688',
      yearsOfExperience: 8,
      licenseNumber: 'LIC-1578',
    },
  ];

  for (const docData of doctorsToSeed) {
    let user = await prisma.user.findUnique({ where: { email: docData.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: docData.email,
          password_hash: defaultPasswordHash,
          roleId: doctorRole.id,
          isActive: true,
        },
      });
    }

    let doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
    if (!doctor) {
      doctor = await prisma.doctor.create({
        data: {
          userId: user.id,
          firstName: docData.firstName,
          lastName: docData.lastName,
          specializationId: specMap[docData.specialization],
          departmentId: deptMap[docData.department],
          phone: docData.phone,
          yearsOfExperience: docData.yearsOfExperience,
          licenseNumber: docData.licenseNumber,
        },
      });
    } else {
      doctor = await prisma.doctor.update({
        where: { id: doctor.id },
        data: {
          specializationId: specMap[docData.specialization],
          departmentId: deptMap[docData.department],
          phone: docData.phone,
          yearsOfExperience: docData.yearsOfExperience,
        },
      });
    }
  }

  // 6. Seed Specific Doctor Availability Records
  console.log('Seeding doctor schedules and absence records...');

  const allDoctors = await prisma.doctor.findMany({
    include: { user: true, specialization: true },
  });

  const schedules: Array<{
    emailMatch: string;
    date: string;
    status: 'AVAILABLE' | 'ABSENT' | 'ON_LEAVE' | 'UNAVAILABLE';
    startTime?: string;
    endTime?: string;
    reason?: string;
    nextAvailableDate?: string;
  }> = [
    // ── Dr. Anil Kumar (Cardiology) ──
    { emailMatch: 'anil.kumar', date: '2026-09-28', status: 'AVAILABLE', startTime: '09:00', endTime: '13:00' },
    { emailMatch: 'anil.kumar', date: '2026-09-29', status: 'AVAILABLE', startTime: '09:00', endTime: '13:00' },
    { emailMatch: 'anil.kumar', date: '2026-09-30', status: 'ABSENT', reason: 'Attending National Cardiology Summit', nextAvailableDate: '2026-10-02' },
    { emailMatch: 'anil.kumar', date: '2026-10-01', status: 'ON_LEAVE', reason: 'Official Clinical Leave', nextAvailableDate: '2026-10-02' },
    { emailMatch: 'anil.kumar', date: '2026-10-02', status: 'AVAILABLE', startTime: '09:00', endTime: '14:00' },
    { emailMatch: 'anil.kumar', date: '2026-10-05', status: 'AVAILABLE', startTime: '09:00', endTime: '14:00' },
    { emailMatch: 'anil.kumar', date: '2026-10-06', status: 'AVAILABLE', startTime: '09:00', endTime: '13:00' },

    // ── Dr. Sarah Joseph (Cardiology) ──
    { emailMatch: 'sarah01', date: '2026-09-28', status: 'AVAILABLE', startTime: '09:00', endTime: '13:00' },
    { emailMatch: 'sarah01', date: '2026-09-29', status: 'AVAILABLE', startTime: '09:00', endTime: '13:00' },
    { emailMatch: 'sarah01', date: '2026-09-30', status: 'ABSENT', reason: 'Attending Annual Interventional Cardiology Symposium', nextAvailableDate: '2026-10-02' },
    { emailMatch: 'sarah01', date: '2026-10-01', status: 'ON_LEAVE', reason: 'Authorized Clinical Leave', nextAvailableDate: '2026-10-02' },
    { emailMatch: 'sarah01', date: '2026-10-02', status: 'AVAILABLE', startTime: '09:00', endTime: '13:00' },
    { emailMatch: 'sarah01', date: '2026-10-05', status: 'AVAILABLE', startTime: '09:00', endTime: '13:00' },

    // ── Dr. Meera Joseph (General Medicine) ──
    { emailMatch: 'meera.joseph', date: '2026-09-28', status: 'AVAILABLE', startTime: '09:00', endTime: '14:00' },
    { emailMatch: 'meera.joseph', date: '2026-09-29', status: 'AVAILABLE', startTime: '09:00', endTime: '14:00' },
    { emailMatch: 'meera.joseph', date: '2026-09-30', status: 'AVAILABLE', startTime: '09:00', endTime: '14:00' },
    { emailMatch: 'meera.joseph', date: '2026-10-01', status: 'ABSENT', reason: 'Conducting Outpatient Health Audit & Training', nextAvailableDate: '2026-10-02' },
    { emailMatch: 'meera.joseph', date: '2026-10-02', status: 'AVAILABLE', startTime: '09:00', endTime: '14:00' },
    { emailMatch: 'meera.joseph', date: '2026-10-05', status: 'AVAILABLE', startTime: '09:00', endTime: '14:00' },

    // ── Dr. Biya Jomon (General Medicine) ──
    { emailMatch: 'biyajomon', date: '2026-09-28', status: 'AVAILABLE', startTime: '09:00', endTime: '14:00' },
    { emailMatch: 'biyajomon', date: '2026-09-29', status: 'ABSENT', reason: 'Medical Grand Rounds & Department Audit', nextAvailableDate: '2026-09-30' },
    { emailMatch: 'biyajomon', date: '2026-09-30', status: 'AVAILABLE', startTime: '10:00', endTime: '15:00' },
    { emailMatch: 'biyajomon', date: '2026-10-01', status: 'AVAILABLE', startTime: '09:00', endTime: '14:00' },
    { emailMatch: 'biyajomon', date: '2026-10-02', status: 'AVAILABLE', startTime: '09:00', endTime: '14:00' },

    // ── Dr. Bittu Jomon (General Medicine) ──
    { emailMatch: 'bittujomon', date: '2026-09-28', status: 'ON_LEAVE', reason: 'Scheduled Academic Research Leave', nextAvailableDate: '2026-09-29' },
    { emailMatch: 'bittujomon', date: '2026-09-29', status: 'AVAILABLE', startTime: '10:00', endTime: '16:00' },
    { emailMatch: 'bittujomon', date: '2026-09-30', status: 'AVAILABLE', startTime: '10:00', endTime: '16:00' },
    { emailMatch: 'bittujomon', date: '2026-10-01', status: 'AVAILABLE', startTime: '10:00', endTime: '16:00' },
    { emailMatch: 'bittujomon', date: '2026-10-02', status: 'AVAILABLE', startTime: '10:00', endTime: '16:00' },
  ];

  for (const s of schedules) {
    const doc = allDoctors.find((d) => d.user?.email.includes(s.emailMatch));
    if (!doc) continue;

    const dateObj = new Date(s.date);
    const nextDateObj = s.nextAvailableDate ? new Date(s.nextAvailableDate) : null;

    await prisma.doctorAvailability.upsert({
      where: {
        doctorId_date: {
          doctorId: doc.id,
          date: dateObj,
        },
      },
      update: {
        status: s.status,
        startTime: s.startTime || '09:00',
        endTime: s.endTime || '17:00',
        reason: s.reason || null,
        nextAvailableDate: nextDateObj,
      },
      create: {
        doctorId: doc.id,
        date: dateObj,
        status: s.status,
        startTime: s.startTime || '09:00',
        endTime: s.endTime || '17:00',
        reason: s.reason || null,
        nextAvailableDate: nextDateObj,
      },
    });
  }

  // 7. Seed an existing appointment for Dr. Anil Kumar on 2026-09-28 at 10:00 AM
  // to verify slot availability filtering (so 10:00 AM shows as already booked/taken)
  const drAnil = allDoctors.find((d) => d.user?.email.includes('anil.kumar'));
  const firstPatient = await prisma.patient.findFirst();
  const scheduledStatus = await prisma.appointmentStatus.findFirst({ where: { name: 'scheduled' } });

  if (drAnil && firstPatient && scheduledStatus) {
    const existingConflictAppt = await prisma.appointment.findFirst({
      where: {
        doctorId: drAnil.id,
        appointmentDate: new Date('2026-09-28'),
        appointmentTime: new Date('1970-01-01T10:00:00.000Z'),
      },
    });

    if (!existingConflictAppt) {
      await prisma.appointment.create({
        data: {
          patientId: firstPatient.id,
          doctorId: drAnil.id,
          appointmentDate: new Date('2026-09-28'),
          appointmentTime: new Date('1970-01-01T10:00:00.000Z'),
          statusId: scheduledStatus.id,
          reason: 'Routine Cardiology Follow-up',
          notes: 'Occupied consultation slot',
        },
      });
      console.log('Seeded test appointment for Dr. Anil Kumar on 2026-09-28 at 10:00 AM (occupied slot test)');
    }
  }

  console.log('Doctor availability and hospital structures successfully seeded.');
}

main()
  .catch((e) => {
    console.error('Error seeding doctor availability:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
