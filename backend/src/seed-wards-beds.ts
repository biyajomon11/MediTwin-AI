import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const DEFAULT_WARDS = [
  {
    wardNumber: 'Ward 1',
    name: 'Ward 1 – General Medicine',
    department: 'General Medicine',
    totalBeds: 50,
  },
  {
    wardNumber: 'Ward 2',
    name: 'Ward 2 – Surgical / Semi-Private',
    department: 'General Surgery',
    totalBeds: 50,
  },
  {
    wardNumber: 'Ward 3',
    name: 'Ward 3 – Medical Inpatient',
    department: 'Internal Medicine',
    totalBeds: 50,
  },
  {
    wardNumber: 'Ward 4',
    name: 'Ward 4 – Specialty Care / Stepdown',
    department: 'Specialty Care',
    totalBeds: 50,
  },
  {
    wardNumber: 'ICU',
    name: 'ICU – Intensive & Critical Care Unit',
    department: 'Critical Care (ICU)',
    totalBeds: 50,
  },
  {
    wardNumber: 'General Ward 2B',
    name: 'General Ward 2B – Medical Stepdown',
    department: 'General Medicine',
    totalBeds: 50,
  },
];

/**
 * Idempotently upgrades and initializes the hospital bed inventory to 50 beds per ward.
 * Safety requirements:
 * 1. Preserves existing occupied and maintenance beds — does not reset active admissions.
 * 2. Idempotent: Can be run multiple times safely without duplicate bed records.
 * 3. Expands wards with <50 beds up to exactly 50 beds (Bed 01 to Bed 50).
 * 4. If a ward has >50 beds, preserves all existing beds and logs the discrepancy.
 * 5. Synchronizes bed status with active InpatientAdmission records.
 */
export async function seedWardsAndBeds(): Promise<void> {
  try {
    console.log('[SEED_WARDS_BEDS] Upgrading Ward & Bed inventory to 50 beds per ward in PostgreSQL...');

    // 1. Ensure default wards are created or updated
    for (const w of DEFAULT_WARDS) {
      await prisma.ward.upsert({
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
    }

    // 2. Fetch all active wards from database to ensure complete hospital coverage
    const allWards = await prisma.ward.findMany({
      include: {
        beds: true,
      },
      orderBy: { id: 'asc' },
    });

    let totalBedsCreated = 0;
    let totalBedsPreserved = 0;

    // 3. For each ward, ensure exactly 50 physical beds exist (Bed 01 to Bed 50)
    for (const ward of allWards) {
      const existingBeds = ward.beds;
      const existingBedNumbers = new Set(existingBeds.map((b) => b.bedNumber.toLowerCase()));

      if (existingBeds.length > 50) {
        console.warn(
          `[SEED_WARDS_BEDS] Notice: Ward #${ward.id} [${ward.wardNumber}] has ${existingBeds.length} beds (>50). Preserving all existing beds without reduction.`
        );
      }

      const targetBedCount = Math.max(50, existingBeds.length);

      for (let i = 1; i <= targetBedCount; i++) {
        const bedNum = `Bed ${String(i).padStart(2, '0')}`;
        const bedNumLower = bedNum.toLowerCase();

        if (existingBedNumbers.has(bedNumLower)) {
          // Bed already exists - preserve current record and its status!
          totalBedsPreserved++;
        } else {
          // Add missing bed record with status AVAILABLE
          await prisma.bed.create({
            data: {
              wardId: ward.id,
              bedNumber: bedNum,
              status: 'AVAILABLE',
            },
          });
          totalBedsCreated++;
        }
      }

      // Update ward totalBeds count to reflect physical reality
      const updatedCount = await prisma.bed.count({ where: { wardId: ward.id } });
      await prisma.ward.update({
        where: { id: ward.id },
        data: { totalBeds: updatedCount },
      });
    }

    // 4. Synchronize bed OCCUPIED status with active InpatientAdmission records
    const activeAdmissions = await prisma.inpatientAdmission.findMany({
      where: {
        admissionStatus: { in: ['ADMITTED', 'UNDER_OBSERVATION'] },
      },
      include: {
        bed: true,
      },
    });

    let occupiedBedsCount = 0;
    for (const adm of activeAdmissions) {
      if (adm.bedId) {
        await prisma.bed.update({
          where: { id: adm.bedId },
          data: { status: 'OCCUPIED' },
        });
        occupiedBedsCount++;
      }
    }

    // 5. Also check admitted patients that might not yet have an InpatientAdmission record
    const admittedPatients = await prisma.patient.findMany({
      where: {
        admissionStatus: { in: ['Admitted', 'Critical', 'Under Observation'] },
        ward: { not: null },
      },
    });

    const refreshedWards = await prisma.ward.findMany({ include: { beds: true } });
    const defaultDoctor = await prisma.doctor.findFirst();

    for (const patient of admittedPatients) {
      const wardStr = patient.ward || '';
      const bedStr = patient.bedNumber || (wardStr.match(/Bed\s*([0-9]+)/i) ? `Bed ${wardStr.match(/Bed\s*([0-9]+)/i)![1].padStart(2, '0')}` : null);

      const targetWard = refreshedWards.find((w) =>
        wardStr.toLowerCase().includes(w.wardNumber.toLowerCase()) ||
        (w.wardNumber === 'ICU' && wardStr.toLowerCase().includes('icu')) ||
        (w.wardNumber === 'General Ward 2B' && (wardStr.toLowerCase().includes('2b') || wardStr.toLowerCase().includes('general ward 2b')))
      );

      if (targetWard && bedStr) {
        const normalizedBed = bedStr.startsWith('Bed') ? bedStr : `Bed ${bedStr.padStart(2, '0')}`;
        const targetBed = targetWard.beds.find((b) => b.bedNumber.toLowerCase() === normalizedBed.toLowerCase());

        if (targetBed) {
          await prisma.bed.update({
            where: { id: targetBed.id },
            data: { status: 'OCCUPIED' },
          });

          // Check if admission record exists
          const existingAdm = await prisma.inpatientAdmission.findFirst({
            where: {
              patientId: patient.id,
              admissionStatus: { in: ['ADMITTED', 'UNDER_OBSERVATION'] },
            },
          });

          if (!existingAdm && defaultDoctor) {
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

    const finalBedsTotal = await prisma.bed.count();
    const finalOccupiedTotal = await prisma.bed.count({ where: { status: 'OCCUPIED' } });
    const finalAvailableTotal = await prisma.bed.count({ where: { status: 'AVAILABLE' } });
    const finalMaintenanceTotal = await prisma.bed.count({ where: { status: 'MAINTENANCE' } });

    console.log(
      `[SEED_WARDS_BEDS] ✓ Ward & Bed upgrade completed: ${refreshedWards.length} wards configured with 50 beds each (Total: ${finalBedsTotal} beds, ${finalOccupiedTotal} occupied, ${finalAvailableTotal} available, ${finalMaintenanceTotal} maintenance, ${totalBedsCreated} newly created, ${totalBedsPreserved} preserved).`
    );
  } catch (err) {
    console.error('[SEED_WARDS_BEDS] Error during ward & bed 50-bed initialization:', err);
    throw err;
  }
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
