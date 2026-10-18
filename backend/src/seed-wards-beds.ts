import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const DEFAULT_WARDS = [
  {
    wardNumber: 'Ward 1',
    name: 'Ward 1 – General Medicine',
    department: 'General Medicine',
    totalBeds: 15,
  },
  {
    wardNumber: 'Ward 2',
    name: 'Ward 2 – Surgical / Semi-Private',
    department: 'General Surgery',
    totalBeds: 15,
  },
  {
    wardNumber: 'Ward 3',
    name: 'Ward 3 – Medical Inpatient',
    department: 'Internal Medicine',
    totalBeds: 15,
  },
  {
    wardNumber: 'Ward 4',
    name: 'Ward 4 – Specialty Care / Stepdown',
    department: 'Specialty Care',
    totalBeds: 15,
  },
  {
    wardNumber: 'ICU',
    name: 'ICU – Intensive & Critical Care Unit',
    department: 'Critical Care (ICU)',
    totalBeds: 15,
  },
  {
    wardNumber: 'General Ward 2B',
    name: 'General Ward 2B – Medical Stepdown',
    department: 'General Medicine',
    totalBeds: 15,
  },
];

export async function seedWardsAndBeds(): Promise<void> {
  console.log('[SEED_WARDS_BEDS] Initializing Ward & Bed inventory in PostgreSQL...');

  // 1. Seed or update each Ward
  for (const w of DEFAULT_WARDS) {
    const ward = await prisma.ward.upsert({
      where: { wardNumber: w.wardNumber },
      update: {
        name: w.name,
        department: w.department,
        totalBeds: w.totalBeds,
        isActive: true,
      },
      create: {
        wardNumber: w.wardNumber,
        name: w.name,
        department: w.department,
        totalBeds: w.totalBeds,
        isActive: true,
      },
    });

    // 2. Ensure standard beds (Bed 01 to Bed 15) exist for this ward
    for (let i = 1; i <= w.totalBeds; i++) {
      const bedNum = `Bed ${i < 10 ? '0' + i : i}`;
      await prisma.bed.upsert({
        where: {
          wardId_bedNumber: {
            wardId: ward.id,
            bedNumber: bedNum,
          },
        },
        update: {},
        create: {
          wardId: ward.id,
          bedNumber: bedNum,
          status: 'AVAILABLE',
        },
      });
    }
  }

  // 3. Sync bed occupancy with existing admitted patients
  const admittedPatients = await prisma.patient.findMany({
    where: {
      admissionStatus: { in: ['Admitted', 'Critical', 'Under Observation'] },
      ward: { not: null },
    },
    include: {
      user: true,
    },
  });

  // Reset all beds to AVAILABLE initially, then mark actively occupied ones
  await prisma.bed.updateMany({
    data: { status: 'AVAILABLE' },
  });

  const allWards = await prisma.ward.findMany({ include: { beds: true } });

  // Doctor fallback for initial admission records
  const defaultDoctor = await prisma.doctor.findFirst();

  let occupiedCount = 0;

  for (const patient of admittedPatients) {
    const wardStr = patient.ward || '';
    const bedStr = patient.bedNumber || (wardStr.match(/Bed\s*([0-9]+)/i) ? `Bed ${wardStr.match(/Bed\s*([0-9]+)/i)![1].padStart(2, '0')}` : null);

    // Find matching ward
    const targetWard = allWards.find((w) =>
      wardStr.toLowerCase().includes(w.wardNumber.toLowerCase()) ||
      (w.wardNumber === 'ICU' && wardStr.toLowerCase().includes('icu')) ||
      (w.wardNumber === 'General Ward 2B' && (wardStr.toLowerCase().includes('2b') || wardStr.toLowerCase().includes('general ward 2b')))
    );

    if (targetWard && bedStr) {
      // Normalize bed number, e.g. "Bed 05"
      const normalizedBed = bedStr.startsWith('Bed') ? bedStr : `Bed ${bedStr.padStart(2, '0')}`;
      const targetBed = targetWard.beds.find((b) => b.bedNumber.toLowerCase() === normalizedBed.toLowerCase());

      if (targetBed) {
        await prisma.bed.update({
          where: { id: targetBed.id },
          data: { status: 'OCCUPIED' },
        });
        occupiedCount++;

        // Ensure an InpatientAdmission record exists for this admitted patient
        const existingAdmission = await prisma.inpatientAdmission.findFirst({
          where: {
            patientId: patient.id,
            admissionStatus: { in: ['ADMITTED', 'UNDER_OBSERVATION'] },
          },
        });

        if (!existingAdmission && defaultDoctor) {
          const admStatus = patient.admissionStatus === 'Under Observation' ? 'UNDER_OBSERVATION' : 'ADMITTED';
          const acuity = patient.admissionStatus === 'Critical' ? 'CRITICAL' : 'MODERATE';
          const admNum = `ADM-${new Date().getFullYear()}-${String(patient.id).padStart(4, '0')}`;

          await prisma.inpatientAdmission.create({
            data: {
              admissionNumber: admNum,
              patientId: patient.id,
              admittingDoctorId: defaultDoctor.id,
              wardId: targetWard.id,
              bedId: targetBed.id,
              admissionDiagnosis: 'Clinical Inpatient Monitoring & Medical Stabilization',
              chiefComplaint: 'Referred for inpatient observation and therapy management.',
              nursingHandoverInstructions: 'Administer routine medication rounds, assess vital signs every 4 hours, and report clinical variations.',
              admissionStatus: admStatus,
              acuityLevel: acuity,
              admissionDateTime: patient.updatedAt || new Date(),
            },
          });
        }
      }
    }
  }

  console.log(`[SEED_WARDS_BEDS] Successfully initialized 6 Wards, 90 Beds (${occupiedCount} occupied by active inpatients).`);
}

if (require.main === module) {
  seedWardsAndBeds()
    .then(() => prisma.$disconnect())
    .catch((err) => {
      console.error('[SEED_WARDS_BEDS] Error:', err);
      prisma.$disconnect();
      process.exit(1);
    });
}
