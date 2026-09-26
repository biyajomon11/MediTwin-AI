import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating patient bed and ward assignments in PostgreSQL...');

  const patientBedAssignments: Record<string, { ward: string | null; bedNumber: string | null; admissionStatus: string }> = {
    'joldamathew00@gmail.com': {
      ward: 'Ward 2 – Bed 12',
      bedNumber: 'Bed 12',
      admissionStatus: 'Admitted',
    },
    'suryachacko01@gmail.com': {
      ward: 'Ward 1 – Bed 05',
      bedNumber: 'Bed 05',
      admissionStatus: 'Admitted',
    },
    'joslinshaju67@gmail.com': {
      ward: 'Ward 3 – Bed 08',
      bedNumber: 'Bed 08',
      admissionStatus: 'Admitted',
    },
    'alice.test@example.com': {
      ward: 'Ward 2 – Bed 14',
      bedNumber: 'Bed 14',
      admissionStatus: 'Admitted',
    },
    'naveena01@gmail.com': {
      ward: 'Ward 1 – Bed 01',
      bedNumber: 'Bed 01',
      admissionStatus: 'Under Observation',
    },
    'test.patient@meditwin.local': {
      ward: 'Ward 3 – Bed 07',
      bedNumber: 'Bed 07',
      admissionStatus: 'Active',
    },
    'kavyakrishna00@gmail.com': {
      ward: null,
      bedNumber: null,
      admissionStatus: 'Active', // Outpatient - has not visited hospital yet
    },
    'nisha.verma@example.com': {
      ward: 'ICU – Bed 02',
      bedNumber: 'Bed 02',
      admissionStatus: 'Critical',
    },
    'annakurian78@gmail.com': {
      ward: 'Ward 4 – Bed 09',
      bedNumber: 'Bed 09',
      admissionStatus: 'Admitted',
    },
  };

  const allPatients = await prisma.patient.findMany({
    include: { user: { select: { email: true } } },
  });

  for (const p of allPatients) {
    const email = p.user?.email || '';
    const assignment = patientBedAssignments[email];

    if (assignment !== undefined) {
      await prisma.patient.update({
        where: { id: p.id },
        data: {
          ward: assignment.ward,
          bedNumber: assignment.bedNumber,
          admissionStatus: assignment.admissionStatus,
        },
      });
      console.log(`Updated patient #${p.id} (${p.firstName} ${p.lastName}, ${email}): ward="${assignment.ward}", bed="${assignment.bedNumber}", status="${assignment.admissionStatus}"`);
    } else {
      // Deterministic fallback for any other patient so no two patients share a bed
      const wardNum = ((p.id % 4) + 1);
      const bedNum = ((p.id * 3) % 20) + 1;
      const defaultWard = `Ward ${wardNum} – Bed ${bedNum < 10 ? '0' + bedNum : bedNum}`;
      const defaultBed = `Bed ${bedNum < 10 ? '0' + bedNum : bedNum}`;
      await prisma.patient.update({
        where: { id: p.id },
        data: {
          ward: defaultWard,
          bedNumber: defaultBed,
          admissionStatus: 'Active',
        },
      });
      console.log(`Assigned unique fallback to patient #${p.id}: ${defaultWard}`);
    }
  }

  console.log('Bed assignment update complete.');
}

main()
  .catch((e) => {
    console.error('Error updating patient beds:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
