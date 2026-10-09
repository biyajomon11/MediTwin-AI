import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Ensures that Inpatient Thomas Varghese is created in the database and properly linked:
 * - Attending Physician: Dr. Jolda Jomon (Doctor record & User account)
 * - Ward & Nurse: General Ward 2B under Staff Nurse Angel Renoy
 */
export async function ensureInpatientJoldaAndAngel(): Promise<void> {
  try {
    console.log('[INIT_INPATIENT] Verifying Inpatient under Dr. Jolda Jomon and Nurse Angel Renoy...');

    // 1. Roles
    const doctorRole = await prisma.role.findFirst({ where: { name: { equals: 'doctor', mode: 'insensitive' } } });
    const nurseRole = await prisma.role.findFirst({ where: { name: { equals: 'nurse', mode: 'insensitive' } } });
    const patientRole = await prisma.role.findFirst({ where: { name: { equals: 'patient', mode: 'insensitive' } } });

    if (!doctorRole || !nurseRole || !patientRole) {
      console.log('[INIT_INPATIENT] Basic roles not yet available, deferring seeding.');
      return;
    }

    // 2. Department & Specialization
    let deptGenMed = await prisma.department.findFirst({
      where: { name: { contains: 'General Medicine', mode: 'insensitive' } },
    });
    let specGenMed = await prisma.specialization.findFirst({
      where: { name: { contains: 'General Medicine', mode: 'insensitive' } },
    });

    const defaultPassword = await bcrypt.hash('Doctor@123', 10);

    // 3. Ensure Doctor Jolda Jomon User & Doctor Record
    let userJolda = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { contains: 'jolda', mode: 'insensitive' } },
          { email: 'dr.jolda@meditwin.org' },
        ],
      },
    });

    if (!userJolda) {
      userJolda = await prisma.user.create({
        data: {
          email: 'dr.jolda@meditwin.org',
          password_hash: defaultPassword,
          roleId: doctorRole.id,
          isActive: true,
        },
      });
    }

    let doctorJolda = await prisma.doctor.findFirst({
      where: {
        OR: [
          { userId: userJolda.id },
          { firstName: { contains: 'Jolda', mode: 'insensitive' } },
        ],
      },
    });

    if (!doctorJolda) {
      doctorJolda = await prisma.doctor.create({
        data: {
          userId: userJolda.id,
          firstName: 'Jolda',
          lastName: 'Jomon',
          departmentId: deptGenMed?.id,
          specializationId: specGenMed?.id,
          licenseNumber: 'MID-123D-JOLDA',
          phone: '+91 81570 78993',
          yearsOfExperience: 6,
        },
      });
    } else if (doctorJolda.userId !== userJolda.id) {
      await prisma.doctor.update({
        where: { id: doctorJolda.id },
        data: { userId: userJolda.id },
      });
    }

    // 4. Ensure Nurse Angel Renoy
    let userAngel = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { contains: 'angel', mode: 'insensitive' } },
          { email: 'angel.renoy@meditwin.org' },
        ],
      },
    });

    if (!userAngel) {
      userAngel = await prisma.user.create({
        data: {
          email: 'angel.renoy@meditwin.org',
          password_hash: defaultPassword,
          roleId: nurseRole.id,
          isActive: true,
        },
      });
    }

    let nurseAngel = await prisma.nurse.findFirst({
      where: {
        OR: [
          { userId: userAngel.id },
          { firstName: { contains: 'Angel', mode: 'insensitive' } },
        ],
      },
    });

    if (!nurseAngel) {
      nurseAngel = await prisma.nurse.create({
        data: {
          userId: userAngel.id,
          firstName: 'Angel',
          lastName: 'Renoy',
          departmentId: deptGenMed?.id,
          nurseId: 'NUR-001',
          registrationNumber: 'NRN-2024-001',
          assignedWard: 'General Ward 2B',
          phone: '+91 94470 55667',
        },
      });
    } else {
      await prisma.nurse.update({
        where: { id: nurseAngel.id },
        data: {
          assignedWard: 'General Ward 2B',
          departmentId: deptGenMed?.id || nurseAngel.departmentId,
        },
      });
    }

    // 5. Gender & Blood Group lookups
    const maleGender = await prisma.gender.findFirst({ where: { name: { equals: 'Male', mode: 'insensitive' } } });
    const oPosBlood = await prisma.bloodGroup.findFirst({ where: { name: { equals: 'O+', mode: 'insensitive' } } });

    // 6. Ensure Inpatient Thomas Varghese
    let userThomas = await prisma.user.findFirst({
      where: { email: 'thomas.varghese@gmail.com' },
    });

    if (!userThomas) {
      userThomas = await prisma.user.create({
        data: {
          email: 'thomas.varghese@gmail.com',
          password_hash: defaultPassword,
          roleId: patientRole.id,
          isActive: true,
        },
      });
    }

    let patientThomas = await prisma.patient.findFirst({
      where: {
        OR: [
          { userId: userThomas.id },
          { firstName: 'Thomas', lastName: 'Varghese' },
        ],
      },
    });

    if (!patientThomas) {
      patientThomas = await prisma.patient.create({
        data: {
          userId: userThomas.id,
          firstName: 'Thomas',
          lastName: 'Varghese',
          dateOfBirth: new Date('1978-04-12'),
          genderId: maleGender?.id,
          bloodGroupId: oPosBlood?.id,
          phone: '+91 98471 23456',
          address: 'Varghese Villa, Kottayam, Kerala',
          city: 'Kottayam',
          state: 'Kerala',
          ward: 'General Ward 2B',
          bedNumber: 'Bed 08',
          admissionStatus: 'Active',
          emergencyContactName: 'Annamma Varghese (Wife)',
          emergencyContactPhone: '+91 98471 99887',
        },
      });
    } else {
      patientThomas = await prisma.patient.update({
        where: { id: patientThomas.id },
        data: {
          ward: 'General Ward 2B',
          bedNumber: 'Bed 08',
          admissionStatus: 'Active',
        },
      });
    }

    // 7. Ensure Prescription linking Inpatient to Dr. Jolda Jomon
    const existingRx = await prisma.prescription.findFirst({
      where: {
        patientId: patientThomas.id,
        doctorId: doctorJolda.id,
      },
    });

    if (!existingRx) {
      await prisma.prescription.create({
        data: {
          patientId: patientThomas.id,
          doctorId: doctorJolda.id,
          diagnosis: 'Acute Bronchitis & Type 2 Diabetes Monitoring',
          notes: 'Active inpatient in General Ward 2B (Bed 08). Attending: Dr. Jolda Jomon. Ward Nurse: Staff Nurse Angel Renoy.',
          prescribedDate: new Date(),
        },
      });
    }

    // 8. Ensure Medical Record / Inpatient Admission Note
    let recordType = await prisma.recordType.findFirst({ where: { name: 'Admission Note' } });
    if (!recordType) {
      recordType = await prisma.recordType.create({ data: { name: 'Admission Note' } });
    }

    const existingMR = await prisma.medicalRecord.findFirst({
      where: {
        patientId: patientThomas.id,
        doctorId: doctorJolda.id,
      },
    });

    if (!existingMR) {
      await prisma.medicalRecord.create({
        data: {
          patientId: patientThomas.id,
          doctorId: doctorJolda.id,
          recordTypeId: recordType.id,
          title: 'Inpatient Clinical Admission Order — Ward 2B Bed 08',
          description: 'Admitted under Dr. Jolda Jomon. Bed 08 allocated in General Ward 2B. Nursing protocols assigned to Staff Nurse Angel Renoy.',
          recordDate: new Date(),
        },
      });
    }

    // 9. Ensure Nursing Observation by Nurse Angel Renoy
    const existingObs = await prisma.patientObservation.findFirst({
      where: { patientId: patientThomas.id },
    });

    if (!existingObs) {
      await prisma.patientObservation.create({
        data: {
          patientId: patientThomas.id,
          nurseId: nurseAngel.id,
          systolicBp: 124,
          diastolicBp: 82,
          pulseRate: 76,
          respiratoryRate: 16,
          spo2: 98,
          temperature: 37.0,
          painScore: 2,
          consciousnessLevel: 'Alert',
          generalObservation: 'Admission vitals logged in General Ward 2B (Bed 08). Patient resting comfortably on room air.',
          additionalNotes: 'IV line verified patent. Vitals stable under Dr. Jolda Jomon care protocol.',
          observationDate: new Date(),
          observationTime: new Date(),
        },
      });
    }

    console.log(`[INIT_INPATIENT] ✓ Successfully established Inpatient Thomas Varghese (#${patientThomas.id}) under Dr. Jolda Jomon (#${doctorJolda.id}) and Nurse Angel Renoy (Ward: General Ward 2B, Bed: Bed 08).`);
  } catch (err) {
    console.error('[INIT_INPATIENT] Warning during inpatient establishment (non-fatal):', err);
  }
}
