import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial Doctor Module data idempotently...');

  // 1. Seed Clinical Guidelines
  const guidelines = [
    {
      guidelineCode: 'CG-CARD-001',
      title: 'Management of Acute Coronary Syndrome (ACS)',
      category: 'Cardiology',
      department: 'Cardiology',
      version: 'v3.2',
      lastUpdated: new Date('2025-11-15'),
      summary: 'Evidence-based protocols for rapid assessment, risk stratification, antiplatelet therapy, and revascularization pathway selection in suspected ACS.',
      content: `1. Immediate Assessment (0-10 min)
- 12-lead ECG within 10 minutes of presentation.
- Measure high-sensitivity cardiac troponin (hs-cTn) at presentation and 1-3 hours.
- Continuous cardiac monitoring and IV access.

2. Initial Medical Management
- Aspirin 300 mg loading dose (orally or chewable).
- P2Y12 inhibitor loading (Ticagrelor 180 mg or Clopidogrel 300-600 mg).
- Sublingual nitroglycerin 0.4 mg every 5 min (max 3 doses) unless contraindicated (SBP < 90 mmHg).
- Supplemental oxygen only if SpO2 < 90%.

3. Risk Stratification & Cath Lab Activation
- STEMI: Immediate catheterization laboratory activation (door-to-balloon < 90 min).
- High-risk NSTEMI (GRACE > 140): Early invasive strategy within 24 hours.`,
      author: 'Dr. Sarah Joseph (Head of Cardiology)',
      tags: ['Cardiology', 'ACS', 'Emergency', 'ECG', 'Troponin'],
      status: 'PUBLISHED',
    },
    {
      guidelineCode: 'CG-EMERG-002',
      title: 'Adult Sepsis & Septic Shock Resuscitation Protocol',
      category: 'Emergency Care',
      department: 'Emergency Medicine',
      version: 'v4.0',
      lastUpdated: new Date('2026-01-10'),
      summary: 'Hourly bundle recommendations for early recognition, fluid resuscitation, lactate clearance, and broad-spectrum antimicrobial administration.',
      content: `1. Hour-1 Sepsis Bundle
- Measure blood lactate level; remeasure if initial lactate > 2 mmol/L.
- Obtain blood cultures prior to administration of antibiotics.
- Administer broad-spectrum empiric antibiotics within 1 hour of recognition.
- Begin rapid administration of 30 mL/kg crystalloid for hypotension (MAP < 65 mmHg) or lactate >= 4 mmol/L.
- Apply vasopressors if hypotensive during or after fluid resuscitation to maintain MAP >= 65 mmHg (Norepinephrine is first choice).

2. Reassessment
- Dynamic measures of fluid responsiveness (passive leg raise, stroke volume variation).
- Target urine output >= 0.5 mL/kg/h.`,
      author: 'Clinical Governance Committee',
      tags: ['Sepsis', 'Emergency', 'Critical Care', 'Antibiotics'],
      status: 'PUBLISHED',
    },
    {
      guidelineCode: 'CG-GEN-003',
      title: 'Inpatient Glycemic Control & Insulin Titration',
      category: 'General Medicine',
      department: 'General Medicine',
      version: 'v2.1',
      lastUpdated: new Date('2025-10-05'),
      summary: 'Target blood glucose ranges, basal-bolus correction scales, and hypoglycemia management protocols for hospitalized non-pregnant adults.',
      content: `1. Target Ranges
- General medical inpatients: 140-180 mg/dL (7.8-10.0 mmol/L).
- Tighter targets (110-140 mg/dL) may be appropriate for selected post-op surgical patients.

2. Regimen Selection
- Discontinue non-insulin oral hypoglycemics in acute illness where contraindicated (e.g., Metformin if eGFR < 30 or contrast planned).
- Standard: Basal-bolus-correction regimen (Basal insulin + Nutritional bolus + Correction scale).
- Avoid sliding-scale insulin alone without basal coverage.

3. Hypoglycemia Protocol (Rule of 15)
- If BG < 70 mg/dL: Administer 15-20 g fast-acting carbohydrates (or 25 mL 50% Dextrose IV if NPO).
- Recheck blood glucose in 15 minutes. Repeat if still < 70 mg/dL.`,
      author: 'Dr. Biya Jomon (Endocrinology Lead)',
      tags: ['Diabetes', 'Glycemic Control', 'Insulin', 'General Medicine'],
      status: 'PUBLISHED',
    },
    {
      guidelineCode: 'CG-INF-004',
      title: 'Hospital-Acquired Infection Prevention & Hand Hygiene',
      category: 'Infection Control',
      department: 'Infection Control',
      version: 'v5.0',
      lastUpdated: new Date('2026-02-01'),
      summary: 'Strict guidelines for WHO 5 moments of hand hygiene, contact precautions, catheter-associated UTI prevention, and surgical site infection bundles.',
      content: `1. WHO 5 Moments for Hand Hygiene
- 1. Before touching a patient.
- 2. Before clean/aseptic procedures.
- 3. After body fluid exposure risk.
- 4. After touching a patient.
- 5. After touching patient surroundings.

2. PPE & Contact Precautions
- Don gloves and gown upon entering room of patients with MRSA, VRE, or C. difficile.
- Dedicated disposable equipment for isolated patients.

3. CLABSI & CAUTI Bundles
- Maximal sterile barrier precautions during central line insertion.
- Daily review of line/catheter necessity and prompt removal when no longer indicated.`,
      author: 'Infection Control Unit',
      tags: ['Infection Control', 'Hygiene', 'Safety', 'WHO', 'Antibiotic Stewardship'],
      status: 'PUBLISHED',
    },
    {
      guidelineCode: 'CG-PED-005',
      title: 'Pediatric Status Epilepticus Management Algorithm',
      category: 'Pediatrics',
      department: 'Pediatrics',
      version: 'v1.4',
      lastUpdated: new Date('2025-08-20'),
      summary: 'Emergency medication dosages and airway management timelines for children presenting with generalized convulsive seizures lasting > 5 minutes.',
      content: `1. 0 - 5 Minutes
- Airway, Breathing, Circulation (ABC). High-flow oxygen.
- Check point-of-care blood glucose.

2. 5 - 10 Minutes (First-line Benzodiazepine)
- IV access present: Lorazepam 0.1 mg/kg (max 4 mg) or Midazolam 0.15 mg/kg IV.
- No IV access: Buccal Midazolam 0.3 mg/kg or Rectal Diazepam 0.5 mg/kg.

3. 10 - 20 Minutes (Second-line Antiepileptic)
- If seizure continues at 10 min: Repeat first-line dose once.
- If seizure continues at 15 min: Levetiracetam 60 mg/kg (max 4500 mg) over 10 min OR Fosphenytoin 20 mg PE/kg over 10-15 min.

4. > 30 Minutes (Refractory)
- Transfer to Pediatric ICU. Rapid sequence intubation and continuous Midazolam/Propofol infusion.`,
      author: 'Pediatric Emergency Committee',
      tags: ['Pediatrics', 'Neurology', 'Seizures', 'Emergency'],
      status: 'PUBLISHED',
    },
  ];

  for (const g of guidelines) {
    await prisma.clinicalGuideline.upsert({
      where: { guidelineCode: g.guidelineCode },
      update: {
        title: g.title,
        category: g.category,
        department: g.department,
        version: g.version,
        summary: g.summary,
        content: g.content,
        author: g.author,
        tags: g.tags,
        status: g.status,
        lastUpdated: g.lastUpdated,
      },
      create: g,
    });
  }
  console.log(`Ensured ${guidelines.length} clinical guidelines.`);

  // 2. Ensure Medicines
  const medicines = [
    { name: 'Metformin HCl', genericName: 'Metformin', category: 'Antidiabetic', unit: 'mg', description: 'Biguanide antidiabetic agent' },
    { name: 'Lisinopril', genericName: 'Lisinopril', category: 'Antihypertensive', unit: 'mg', description: 'ACE inhibitor' },
    { name: 'Atorvastatin', genericName: 'Atorvastatin', category: 'Lipid-lowering', unit: 'mg', description: 'HMG-CoA reductase inhibitor' },
    { name: 'Aspirin', genericName: 'Acetylsalicylic acid', category: 'Antiplatelet', unit: 'mg', description: 'NSAID / antiplatelet' },
    { name: 'Amoxicillin', genericName: 'Amoxicillin', category: 'Antibiotic', unit: 'mg', description: 'Penicillin-class antibiotic' },
  ];

  for (const med of medicines) {
    const existing = await prisma.medicine.findFirst({ where: { name: med.name } });
    if (!existing) {
      await prisma.medicine.create({ data: med });
    }
  }

  // 3. Connect Sample Appointments, Prescriptions & Medical Records if missing
  const doctors = await prisma.doctor.findMany({ include: { user: true } });
  const patients = await prisma.patient.findMany({ include: { user: true } });
  const apptStatusScheduled = await prisma.appointmentStatus.findFirst({ where: { name: 'scheduled' } });
  const apptStatusCompleted = await prisma.appointmentStatus.findFirst({ where: { name: 'completed' } });
  const recordTypeConsultation = await prisma.recordType.findFirst({ where: { name: 'consultation' } }) || { id: 1 };
  const recordTypeLab = await prisma.recordType.findFirst({ where: { name: 'lab_result' } }) || { id: 2 };
  const docTypeLab = await prisma.documentType.findFirst({ where: { name: 'Lab Report' } }) || { id: 3 };

  if (doctors.length > 0 && patients.length > 0 && apptStatusScheduled && apptStatusCompleted) {
    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      // Assign patient to doctors in round-robin or each doctor gets patients
      for (const doc of doctors) {
        // Check existing appointment
        const existingAppt = await prisma.appointment.findFirst({
          where: { patientId: patient.id, doctorId: doc.id },
        });

        if (!existingAppt) {
          const appt = await prisma.appointment.create({
            data: {
              patientId: patient.id,
              doctorId: doc.id,
              appointmentDate: new Date('2026-08-10'),
              appointmentTime: new Date('2026-08-10T10:30:00Z'),
              statusId: apptStatusCompleted.id,
              reason: 'Routine Medical Review & Vital Signs Monitoring',
              notes: 'Patient stable. Blood pressure within target range.',
            },
          });

          // Medical Record
          const medRecord = await prisma.medicalRecord.create({
            data: {
              patientId: patient.id,
              doctorId: doc.id,
              appointmentId: appt.id,
              recordTypeId: recordTypeConsultation.id,
              title: 'Comprehensive Health Evaluation',
              description: 'Routine general consultation. Cardiovascular and respiratory exams unremarkable.',
              recordDate: new Date('2026-08-14'),
            },
          });

          // Lab Record
          const labRecord = await prisma.medicalRecord.create({
            data: {
              patientId: patient.id,
              doctorId: doc.id,
              appointmentId: appt.id,
              recordTypeId: recordTypeLab.id,
              title: 'Complete Blood Count (CBC) & Metabolic Panel',
              description: 'Hemoglobin: 13.8 g/dL (Normal). Fasting Glucose: 98 mg/dL (Normal). Serum Creatinine: 0.9 mg/dL (Normal).',
              recordDate: new Date('2026-08-10'),
            },
          });

          // Attach document to lab record
          await prisma.medicalDocument.create({
            data: {
              patientId: patient.id,
              recordId: labRecord.id,
              documentTypeId: docTypeLab.id,
              fileName: `CBC_Metabolic_Panel_P${patient.id}.pdf`,
              filePath: `/documents/lab/CBC_Metabolic_Panel_P${patient.id}.pdf`,
              fileSizeKb: 245,
              uploadedById: doc.userId,
            },
          });

          // Prescription
          const allMeds = await prisma.medicine.findMany();
          if (allMeds.length > 0) {
            const rx = await prisma.prescription.create({
              data: {
                patientId: patient.id,
                doctorId: doc.id,
                appointmentId: appt.id,
                diagnosis: 'Mild Essential Hypertension & Preventative Care',
                notes: 'Take daily in the morning with food. Recheck in 3 months.',
                prescribedDate: new Date('2026-08-14'),
                validUntil: new Date('2026-11-14'),
              },
            });

            await prisma.prescriptionItem.create({
              data: {
                prescriptionId: rx.id,
                medicineId: allMeds[0].id,
                dosage: '500 mg',
                frequency: 'Once Daily with Breakfast',
                durationDays: 90,
                instructions: 'Take with full glass of water',
              },
            });
          }
        }
      }
    }
    console.log('Sample clinical relationships (appointments, records, prescriptions) ensured.');
  }

  console.log('Doctor module database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
  })
  .finally(() => prisma.$disconnect());
