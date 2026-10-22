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
    } else if (userJolda.roleId !== doctorRole.id) {
      userJolda = await prisma.user.update({
        where: { id: userJolda.id },
        data: { roleId: doctorRole.id },
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

    // 10. Ensure InpatientAdmission record for Thomas Varghese
    const ward2B = await prisma.ward.findFirst({
      where: {
        OR: [
          { wardNumber: 'General Ward 2B' },
          { name: { contains: 'General Ward 2B', mode: 'insensitive' } },
        ],
      },
    });

    if (ward2B) {
      let bed08 = await prisma.bed.findFirst({
        where: {
          wardId: ward2B.id,
          bedNumber: { equals: 'Bed 08', mode: 'insensitive' },
        },
      });

      if (!bed08) {
        bed08 = await prisma.bed.create({
          data: {
            wardId: ward2B.id,
            bedNumber: 'Bed 08',
            status: 'OCCUPIED',
          },
        });
      } else {
        await prisma.bed.update({
          where: { id: bed08.id },
          data: { status: 'OCCUPIED' },
        });
      }

      const existingAdm = await prisma.inpatientAdmission.findFirst({
        where: { patientId: patientThomas.id },
      });

      if (!existingAdm) {
        await prisma.inpatientAdmission.create({
          data: {
            admissionNumber: 'ADM-2026-0104',
            patientId: patientThomas.id,
            admittingDoctorId: doctorJolda.id,
            wardId: ward2B.id,
            bedId: bed08.id,
            admissionDateTime: new Date('2026-10-08T09:30:00.000Z'),
            admissionDiagnosis: 'Acute Bronchitis & Type 2 Diabetes Monitoring',
            chiefComplaint: 'Severe productive cough, shortness of breath on exertion, and elevated blood glucose.',
            nursingHandoverInstructions: 'Assess vitals q4h, monitor blood glucose pre-meals and at bedtime, ensure IV Ceftriaxone 1g daily.',
            admissionStatus: 'ADMITTED',
            acuityLevel: 'MODERATE',
          },
        });
      } else {
        await prisma.inpatientAdmission.update({
          where: { id: existingAdm.id },
          data: {
            admittingDoctorId: doctorJolda.id,
            wardId: ward2B.id,
            bedId: bed08.id,
            admissionStatus: 'ADMITTED',
            acuityLevel: 'MODERATE',
          },
        });
      }
    }

    console.log(`[INIT_INPATIENT] ✓ Successfully established Inpatient Thomas Varghese (#${patientThomas.id}) under Dr. Jolda Jomon (#${doctorJolda.id}) and Nurse Angel Renoy (Ward: General Ward 2B, Bed: Bed 08).`);
  } catch (err) {
    console.error('[INIT_INPATIENT] Warning during inpatient establishment (non-fatal):', err);
  }
}

/**
 * Ensures that 5 comprehensive, live Inpatients are established under Dr. Bittu Jomon:
 * 1. Surya Chacko (Ward 1, Bed 05) - High Acuity, Asthma Exacerbation
 * 2. Joslin Shaju (Ward 3, Bed 08) - Critical Acuity, DKA & Severe Sepsis
 * 3. Naveena Elsa (Ward 1, Bed 01) - Moderate Acuity, Congestive Heart Failure (Observation)
 * 4. Alice Wonderland (General Ward 2B, Bed 14) - Moderate Acuity, Dengue Fever
 * 5. Jolda Jomon (Ward 2, Bed 12) - Moderate Acuity, Hypertensive Urgency
 */
export async function ensureInpatientsForBittuJomon(): Promise<void> {
  try {
    console.log('[INIT_INPATIENT] Establishing live Inpatient admissions under Dr. Bittu Jomon...');

    const doctorRole = await prisma.role.findFirst({ where: { name: { equals: 'doctor', mode: 'insensitive' } } });
    const patientRole = await prisma.role.findFirst({ where: { name: { equals: 'patient', mode: 'insensitive' } } });
    const femaleGender = await prisma.gender.findFirst({ where: { name: { equals: 'Female', mode: 'insensitive' } } });
    const maleGender = await prisma.gender.findFirst({ where: { name: { equals: 'Male', mode: 'insensitive' } } });

    if (!doctorRole || !patientRole) {
      console.log('[INIT_INPATIENT] Basic roles missing for Dr. Bittu Jomon seeding.');
      return;
    }

    const defaultPassword = await bcrypt.hash('Doctor@123', 10);

    // 1. Ensure Dr. Bittu Jomon User & Doctor record
    let userBittu = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'bittujomon50@gmail.com' },
          { email: { contains: 'bittu', mode: 'insensitive' } },
        ],
      },
    });

    if (!userBittu) {
      userBittu = await prisma.user.create({
        data: {
          email: 'bittujomon50@gmail.com',
          password_hash: defaultPassword,
          roleId: doctorRole.id,
          isActive: true,
        },
      });
    }

    let deptGenMed = await prisma.department.findFirst({
      where: { name: { contains: 'General Medicine', mode: 'insensitive' } },
    });
    let specGenMed = await prisma.specialization.findFirst({
      where: { name: { contains: 'General Medicine', mode: 'insensitive' } },
    });

    let doctorBittu = await prisma.doctor.findFirst({
      where: {
        OR: [
          { userId: userBittu.id },
          { firstName: { contains: 'Bittu', mode: 'insensitive' } },
        ],
      },
    });

    if (!doctorBittu) {
      doctorBittu = await prisma.doctor.create({
        data: {
          userId: userBittu.id,
          firstName: 'Bittu',
          lastName: 'Jomon',
          departmentId: deptGenMed?.id,
          specializationId: specGenMed?.id,
          licenseNumber: 'LIC-1578',
          phone: '+91 62724 56688',
          yearsOfExperience: 8,
        },
      });
    } else if (doctorBittu.userId !== userBittu.id) {
      await prisma.doctor.update({
        where: { id: doctorBittu.id },
        data: {
          userId: userBittu.id,
          departmentId: deptGenMed?.id || doctorBittu.departmentId,
          specializationId: specGenMed?.id || doctorBittu.specializationId,
        },
      });
    }

    // Ensure Admission Note recordType exists
    let noteType = await prisma.recordType.findFirst({ where: { name: 'Admission Note' } });
    if (!noteType) {
      noteType = await prisma.recordType.create({ data: { name: 'Admission Note' } });
    }

    // Inpatient Definitions
    const inpatientSpecs = [
      {
        email: 'suryachacko01@gmail.com',
        firstName: 'Surya',
        lastName: 'Chacko',
        gender: femaleGender?.id,
        dob: new Date('1999-05-14'),
        phone: '+91 94977 92724',
        wardNumber: 'Ward 1',
        bedNumber: 'Bed 05',
        admissionStatus: 'ADMITTED',
        acuityLevel: 'HIGH',
        patientStatus: 'Admitted',
        diagnosis: 'Acute Severe Asthma Exacerbation & Bronchospasm',
        complaint: 'Severe shortness of breath, audible expiratory wheezing, tachypnea, and chest tightness.',
        handover: 'Administer continuous nebulization with Salbutamol + Ipratropium q4h. IV Hydrocortisone 100mg q8h. Target SpO2 > 95% on 2L nasal cannula.',
        vitals: { bpSys: 132, bpDia: 86, hr: 104, rr: 24, spo2: 94, temp: 37.2, pain: 4, alert: 'Alert' },
      },
      {
        email: 'joslinshaju67@gmail.com',
        firstName: 'Joslin',
        lastName: 'Shaju',
        gender: femaleGender?.id,
        dob: new Date('1999-11-20'),
        phone: '+91 70121 46284',
        wardNumber: 'Ward 3',
        bedNumber: 'Bed 08',
        admissionStatus: 'ADMITTED',
        acuityLevel: 'CRITICAL',
        patientStatus: 'Critical',
        diagnosis: 'Diabetic Ketoacidosis (DKA) with Severe Sepsis',
        complaint: 'Profound lethargy, Kussmaul respirations, persistent vomiting, severe dehydration, blood glucose > 480 mg/dL.',
        handover: 'Hourly fingerstick blood glucose & arterial blood gas checks. Titrate IV Regular Insulin infusion at 0.1 U/kg/hr. IV Piperacillin-Tazobactam 4.5g q6h.',
        vitals: { bpSys: 92, bpDia: 58, hr: 122, rr: 28, spo2: 93, temp: 38.6, pain: 6, alert: 'Lethargic' },
      },
      {
        email: 'naveena01@gmail.com',
        firstName: 'Naveena',
        lastName: 'Elsa',
        gender: maleGender?.id,
        dob: new Date('2003-08-10'),
        phone: '+91 94977 88990',
        wardNumber: 'Ward 1',
        bedNumber: 'Bed 01',
        admissionStatus: 'UNDER_OBSERVATION',
        acuityLevel: 'MODERATE',
        patientStatus: 'Under Observation',
        diagnosis: 'Decompensated Congestive Heart Failure (NYHA Class III)',
        complaint: 'Bilateral lower extremity 3+ pitting edema, orthopnea requiring 3 pillows, paroxysmal nocturnal dyspnea.',
        handover: 'Strict fluid restriction to 1.5 L/24h. Daily weights at 06:00. IV Furosemide 40mg BID. Monitor renal panel and serum potassium.',
        vitals: { bpSys: 144, bpDia: 92, hr: 82, rr: 18, spo2: 96, temp: 36.8, pain: 2, alert: 'Alert' },
      },
      {
        email: 'alice.wonderland@meditwin.org',
        firstName: 'Alice',
        lastName: 'Wonderland',
        gender: femaleGender?.id,
        dob: new Date('2001-02-18'),
        phone: '+91 98450 11223',
        wardNumber: 'General Ward 2B',
        bedNumber: 'Bed 14',
        admissionStatus: 'ADMITTED',
        acuityLevel: 'MODERATE',
        patientStatus: 'Admitted',
        diagnosis: 'Suspected Dengue Fever with Severe Thrombocytopenia',
        complaint: 'High-grade remittent fever (39.2°C), retro-orbital eye pain, petechial rash on both forearms, severe myalgia.',
        handover: 'Serial CBC q12h to monitor platelet trend and hematocrit. IV Isolyte-P for volume maintenance. Strict prohibition of NSAIDs/Aspirin; use Paracetamol only.',
        vitals: { bpSys: 112, bpDia: 74, hr: 90, rr: 17, spo2: 98, temp: 38.4, pain: 4, alert: 'Alert' },
      },
      {
        email: 'joldamathew00@gmail.com',
        firstName: 'Jolda',
        lastName: 'Jomon',
        gender: femaleGender?.id,
        dob: new Date('1968-07-24'),
        phone: '+91 81570 78993',
        wardNumber: 'Ward 2',
        bedNumber: 'Bed 12',
        admissionStatus: 'ADMITTED',
        acuityLevel: 'MODERATE',
        patientStatus: 'Admitted',
        diagnosis: 'Hypertensive Urgency & Accelerated Essential Hypertension',
        complaint: 'Pounding occipital headache, blurred vision, systolic BP sustained above 190 mmHg at triage, epistaxis.',
        handover: 'Q2H automated blood pressure monitoring. Titrate oral Amlodipine 10mg + Telmisartan 40mg. Avoid abrupt drop in mean arterial pressure.',
        vitals: { bpSys: 182, bpDia: 108, hr: 80, rr: 16, spo2: 97, temp: 36.9, pain: 3, alert: 'Alert' },
      },
    ];

    for (const spec of inpatientSpecs) {
      // 1. Ensure Patient User
      let pUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: spec.email },
            { email: { contains: spec.firstName.toLowerCase(), mode: 'insensitive' } },
          ],
        },
      });

      if (!pUser) {
        pUser = await prisma.user.create({
          data: {
            email: spec.email,
            password_hash: defaultPassword,
            roleId: patientRole.id,
            isActive: true,
          },
        });
      }

      // 2. Ensure Patient Profile
      let patient = await prisma.patient.findFirst({
        where: {
          OR: [
            { userId: pUser.id },
            { firstName: spec.firstName, lastName: spec.lastName },
          ],
        },
      });

      if (!patient) {
        patient = await prisma.patient.create({
          data: {
            userId: pUser.id,
            firstName: spec.firstName,
            lastName: spec.lastName,
            dateOfBirth: spec.dob,
            genderId: spec.gender,
            phone: spec.phone,
            address: `${spec.firstName} Residence, Medical City`,
            city: 'Kochi',
            state: 'Kerala',
            ward: `${spec.wardNumber} – ${spec.bedNumber}`,
            bedNumber: spec.bedNumber,
            admissionStatus: spec.patientStatus,
          },
        });
      } else {
        patient = await prisma.patient.update({
          where: { id: patient.id },
          data: {
            ward: `${spec.wardNumber} – ${spec.bedNumber}`,
            bedNumber: spec.bedNumber,
            admissionStatus: spec.patientStatus,
          },
        });
      }

      // 3. Resolve Ward
      let ward = await prisma.ward.findFirst({
        where: {
          OR: [
            { wardNumber: { equals: spec.wardNumber, mode: 'insensitive' } },
            { name: { contains: spec.wardNumber, mode: 'insensitive' } },
          ],
        },
      });

      if (!ward) {
        ward = await prisma.ward.create({
          data: {
            wardNumber: spec.wardNumber,
            name: `${spec.wardNumber} – Inpatient Care`,
            department: 'General Medicine',
            totalBeds: 50,
            isActive: true,
          },
        });
      }

      // 4. Resolve Bed
      let bed = await prisma.bed.findFirst({
        where: {
          wardId: ward.id,
          bedNumber: { equals: spec.bedNumber, mode: 'insensitive' },
        },
      });

      if (!bed) {
        bed = await prisma.bed.create({
          data: {
            wardId: ward.id,
            bedNumber: spec.bedNumber,
            status: 'OCCUPIED',
          },
        });
      } else {
        await prisma.bed.update({
          where: { id: bed.id },
          data: { status: 'OCCUPIED' },
        });
      }

      // 5. Ensure Inpatient Admission Record under Dr. Bittu Jomon
      const admissionNum = `ADM-2026-${String(patient.id).padStart(4, '0')}`;
      const existingAdm = await prisma.inpatientAdmission.findFirst({
        where: { patientId: patient.id },
      });

      if (!existingAdm) {
        await prisma.inpatientAdmission.create({
          data: {
            admissionNumber: admissionNum,
            patientId: patient.id,
            admittingDoctorId: doctorBittu.id,
            wardId: ward.id,
            bedId: bed.id,
            admissionDateTime: new Date(),
            admissionDiagnosis: spec.diagnosis,
            chiefComplaint: spec.complaint,
            nursingHandoverInstructions: spec.handover,
            admissionStatus: spec.admissionStatus,
            acuityLevel: spec.acuityLevel,
          },
        });
      } else {
        await prisma.inpatientAdmission.update({
          where: { id: existingAdm.id },
          data: {
            admittingDoctorId: doctorBittu.id,
            wardId: ward.id,
            bedId: bed.id,
            admissionDiagnosis: spec.diagnosis,
            chiefComplaint: spec.complaint,
            nursingHandoverInstructions: spec.handover,
            admissionStatus: spec.admissionStatus,
            acuityLevel: spec.acuityLevel,
          },
        });
      }

      // 6. Ensure Prescription linking Patient to Dr. Bittu Jomon
      const existingRx = await prisma.prescription.findFirst({
        where: {
          patientId: patient.id,
          doctorId: doctorBittu.id,
        },
      });

      if (!existingRx) {
        await prisma.prescription.create({
          data: {
            patientId: patient.id,
            doctorId: doctorBittu.id,
            diagnosis: spec.diagnosis,
            notes: `Inpatient medication orders in ${spec.wardNumber} (${spec.bedNumber}). Attending: Dr. Bittu Jomon.`,
            prescribedDate: new Date(),
          },
        });
      }

      // 7. Ensure Medical Record / Admission Note under Dr. Bittu Jomon
      const existingMR = await prisma.medicalRecord.findFirst({
        where: {
          patientId: patient.id,
          doctorId: doctorBittu.id,
        },
      });

      if (!existingMR) {
        await prisma.medicalRecord.create({
          data: {
            patientId: patient.id,
            doctorId: doctorBittu.id,
            recordTypeId: noteType.id,
            title: `Inpatient Admission Order — ${spec.wardNumber} ${spec.bedNumber}`,
            description: `Admitted under Dr. Bittu Jomon. Acuity: ${spec.acuityLevel}. ${spec.handover}`,
            recordDate: new Date(),
          },
        });
      }

      // 8. Ensure Patient Observation / Vitals telemetry
      const anyNurse = await prisma.nurse.findFirst();
      const dutyNurseId = anyNurse ? anyNurse.id : 1;

      const existingObs = await prisma.patientObservation.findFirst({
        where: { patientId: patient.id },
      });

      if (!existingObs) {
        await prisma.patientObservation.create({
          data: {
            patientId: patient.id,
            nurseId: dutyNurseId,
            systolicBp: spec.vitals.bpSys,
            diastolicBp: spec.vitals.bpDia,
            pulseRate: spec.vitals.hr,
            respiratoryRate: spec.vitals.rr,
            spo2: spec.vitals.spo2,
            temperature: spec.vitals.temp,
            painScore: spec.vitals.pain,
            consciousnessLevel: spec.vitals.alert,
            generalObservation: `Telemetry logged in ${spec.wardNumber} (${spec.bedNumber}). Attending: Dr. Bittu Jomon.`,
            additionalNotes: spec.handover,
            observationDate: new Date(),
            observationTime: new Date(),
          },
        });
      } else {
        await prisma.patientObservation.update({
          where: { id: existingObs.id },
          data: {
            systolicBp: spec.vitals.bpSys,
            diastolicBp: spec.vitals.bpDia,
            pulseRate: spec.vitals.hr,
            respiratoryRate: spec.vitals.rr,
            spo2: spec.vitals.spo2,
            temperature: spec.vitals.temp,
            painScore: spec.vitals.pain,
            consciousnessLevel: spec.vitals.alert,
            generalObservation: `Telemetry active in ${spec.wardNumber} (${spec.bedNumber}) under Dr. Bittu Jomon.`,
          },
        });
      }

      console.log(`[INIT_INPATIENT] ✓ Established Inpatient ${spec.firstName} ${spec.lastName} (#${patient.id}) in ${spec.wardNumber} ${spec.bedNumber} [${spec.acuityLevel}] under Dr. Bittu Jomon.`);
    }

    console.log('[INIT_INPATIENT] ✓ All 5 Inpatients successfully seeded and linked to Dr. Bittu Jomon.');
  } catch (err) {
    console.error('[INIT_INPATIENT] Error establishing Inpatients for Dr. Bittu Jomon (non-fatal):', err);
  }
}

if (require.main === module) {
  (async () => {
    await ensureInpatientJoldaAndAngel();
    await ensureInpatientsForBittuJomon();
  })()
    .then(() => {
      console.log('[INIT_INPATIENT] Done!');
      return prisma.$disconnect();
    })
    .catch((err) => {
      console.error(err);
      prisma.$disconnect();
      process.exit(1);
    });
}
