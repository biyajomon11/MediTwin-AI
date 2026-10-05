import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Initializing MediTwin Cloud Database Seed...');

  // 1. Roles
  const roles = ['admin', 'doctor', 'nurse', 'patient'];
  for (const r of roles) {
    await prisma.role.upsert({
      where: { name: r },
      update: {},
      create: { name: r },
    });
  }
  console.log('✓ Roles seeded.');

  // 2. Genders
  const genders = ['Male', 'Female', 'Other', 'Prefer not to say'];
  for (const g of genders) {
    await prisma.gender.upsert({
      where: { name: g },
      update: {},
      create: { name: g },
    });
  }
  console.log('✓ Genders seeded.');

  // 3. Blood Groups
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  for (const bg of bloodGroups) {
    await prisma.bloodGroup.upsert({
      where: { name: bg },
      update: {},
      create: { name: bg },
    });
  }
  console.log('✓ Blood groups seeded.');

  // 4. Specializations
  const specializations = ['Cardiology', 'Neurology', 'Pediatrics', 'Orthopedics', 'General Medicine', 'Dermatology'];
  for (const s of specializations) {
    await prisma.specialization.upsert({
      where: { name: s },
      update: {},
      create: { name: s },
    });
  }
  console.log('✓ Specializations seeded.');

  // 5. Appointment Statuses
  const apptStatuses = ['scheduled', 'completed', 'cancelled', 'no_show'];
  for (const st of apptStatuses) {
    await prisma.appointmentStatus.upsert({
      where: { name: st },
      update: {},
      create: { name: st },
    });
  }

  // 6. Action Types
  const actionTypes = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'];
  for (const at of actionTypes) {
    await prisma.actionType.upsert({
      where: { name: at },
      update: {},
      create: { name: at },
    });
  }

  // 7. Notification Types
  const notifTypes = ['APPOINTMENT', 'PRESCRIPTION', 'REMINDER', 'DOCUMENT', 'SYSTEM'];
  for (const nt of notifTypes) {
    await prisma.notificationType.upsert({
      where: { name: nt },
      update: {},
      create: { name: nt },
    });
  }

  // 8. Reminder Statuses
  const reminderStatuses = ['ACTIVE', 'TAKEN', 'MISSED', 'CANCELLED'];
  for (const rs of reminderStatuses) {
    await prisma.reminderStatus.upsert({
      where: { name: rs },
      update: {},
      create: { name: rs },
    });
  }

  // 9. Hospitals
  let hospital1 = await prisma.hospital.findFirst({ where: { name: 'MediTwin Central Hospital' } });
  if (!hospital1) {
    hospital1 = await prisma.hospital.create({
      data: {
        name: 'MediTwin Central Hospital',
        address: '100 Medical Center Blvd',
        city: 'Metro City',
        state: 'CA',
        phone: '+1 555-0100',
        email: 'info@meditwin.hospital',
      },
    });
  }

  let hospital2 = await prisma.hospital.findFirst({ where: { name: 'St. Jude Memorial Hospital' } });
  if (!hospital2) {
    hospital2 = await prisma.hospital.create({
      data: {
        name: 'St. Jude Memorial Hospital',
        address: '450 Healthcare Way',
        city: 'South District',
        state: 'CA',
        phone: '+1 555-0200',
        email: 'contact@stjude-memorial.hospital',
      },
    });
  }
  console.log('✓ Hospitals seeded.');

  // 10. Departments
  const deptsH1 = [
    { name: 'Cardiology Department', description: 'Advanced cardiovascular care and diagnostics' },
    { name: 'General Medicine Department', description: 'Comprehensive inpatient and outpatient medical care' },
    { name: 'Neurology Department', description: 'Neurological treatment, stroke care, and cognitive rehabilitation' },
    { name: 'Pediatrics Department', description: 'Child healthcare, vaccinations, and adolescent medicine' },
  ];
  for (const d of deptsH1) {
    const existing = await prisma.department.findFirst({
      where: { hospitalId: hospital1.id, name: d.name },
    });
    if (!existing) {
      await prisma.department.create({
        data: { hospitalId: hospital1.id, ...d },
      });
    }
  }

  const deptsH2 = [
    { name: 'Orthopedics Department', description: 'Musculoskeletal surgery and sports medicine' },
  ];
  for (const d of deptsH2) {
    const existing = await prisma.department.findFirst({
      where: { hospitalId: hospital2.id, name: d.name },
    });
    if (!existing) {
      await prisma.department.create({
        data: { hospitalId: hospital2.id, ...d },
      });
    }
  }
  console.log('✓ Departments seeded.');

  // 11. Seed Admin Accounts
  const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
  if (adminRole) {
    // Admin 1
    const adminPassHash = await bcrypt.hash('AdminPass@123', 12);
    let adminUser = await prisma.user.findUnique({ where: { email: 'test.admin@meditwin.local' } });
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          email: 'test.admin@meditwin.local',
          password_hash: adminPassHash,
          roleId: adminRole.id,
          isActive: true,
        },
      });
      await prisma.admin.create({
        data: {
          userId: adminUser.id,
          firstName: 'John',
          lastName: 'Administrator',
          phone: '+1 555-0105',
          hospitalId: hospital1.id,
        },
      });
    }

    // Secondary Admin
    let adminUser2 = await prisma.user.findUnique({ where: { email: 'rohithadmin99@gmail.com' } });
    if (!adminUser2) {
      adminUser2 = await prisma.user.create({
        data: {
          email: 'rohithadmin99@gmail.com',
          password_hash: adminPassHash,
          roleId: adminRole.id,
          isActive: true,
        },
      });
      await prisma.admin.create({
        data: {
          userId: adminUser2.id,
          firstName: 'Rohith',
          lastName: 'Admin',
          phone: '+1 555-0106',
          hospitalId: hospital1.id,
        },
      });
    }
  }

  // 12. Seed Doctor Account
  const doctorRole = await prisma.role.findUnique({ where: { name: 'doctor' } });
  const cardDept = await prisma.department.findFirst({ where: { name: 'Cardiology Department' } });
  const cardSpec = await prisma.specialization.findUnique({ where: { name: 'Cardiology' } });
  if (doctorRole) {
    const docPassHash = await bcrypt.hash('DoctorPass@123', 12);
    let docUser = await prisma.user.findUnique({ where: { email: 'test.doctor@meditwin.local' } });
    if (!docUser) {
      docUser = await prisma.user.create({
        data: {
          email: 'test.doctor@meditwin.local',
          password_hash: docPassHash,
          roleId: doctorRole.id,
          isActive: true,
        },
      });
      await prisma.doctor.create({
        data: {
          userId: docUser.id,
          firstName: 'Sarah',
          lastName: 'Joseph',
          phone: '+1 555-0101',
          licenseNumber: 'DOC-CARD-001',
          yearsOfExperience: 12,
          departmentId: cardDept?.id,
          specializationId: cardSpec?.id,
        },
      });
    }
  }

  // 13. Seed Nurse Account
  const nurseRole = await prisma.role.findUnique({ where: { name: 'nurse' } });
  if (nurseRole) {
    const nursePassHash = await bcrypt.hash('NursePass@123', 12);
    let nurseUser = await prisma.user.findUnique({ where: { email: 'test.nurse@meditwin.local' } });
    if (!nurseUser) {
      nurseUser = await prisma.user.create({
        data: {
          email: 'test.nurse@meditwin.local',
          password_hash: nursePassHash,
          roleId: nurseRole.id,
          isActive: true,
        },
      });
      await prisma.nurse.create({
        data: {
          userId: nurseUser.id,
          firstName: 'Elena',
          lastName: 'Rostova',
          phone: '+1 555-0102',
          licenseNumber: 'NURSE-ICU-001',
          departmentId: cardDept?.id,
        },
      });
    }
  }

  // 14. Seed Patient Account
  const patientRole = await prisma.role.findUnique({ where: { name: 'patient' } });
  const maleGender = await prisma.gender.findUnique({ where: { name: 'Male' } });
  const oPos = await prisma.bloodGroup.findUnique({ where: { name: 'O+' } });
  if (patientRole) {
    const patientPassHash = await bcrypt.hash('PatientPass@123', 12);
    let patientUser = await prisma.user.findUnique({ where: { email: 'test.patient@meditwin.local' } });
    if (!patientUser) {
      patientUser = await prisma.user.create({
        data: {
          email: 'test.patient@meditwin.local',
          password_hash: patientPassHash,
          roleId: patientRole.id,
          isActive: true,
        },
      });
      await prisma.patient.create({
        data: {
          userId: patientUser.id,
          firstName: 'Alex',
          lastName: 'Mercer',
          phone: '+1 555-0103',
          dateOfBirth: new Date('1990-05-15'),
          genderId: maleGender?.id,
          bloodGroupId: oPos?.id,
          city: 'Metro City',
          state: 'CA',
          address: '42 Main St, Apt 3B',
          emergencyContactName: 'Jane Mercer',
          emergencyContactPhone: '+1 555-0199',
        },
      });
    }
  }

  console.log('✅ Master Database Seed Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
