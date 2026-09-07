import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding clinical data for registered patients (Jolda, Surya, Joslin, Alice, Naveena)...');

  // 1. Ensure Record Types
  const recordTypes = ['diagnosis', 'surgery', 'hospitalization', 'consultation', 'lab_result'];
  for (const name of recordTypes) {
    const existing = await prisma.recordType.findUnique({ where: { name } });
    if (!existing) {
      await prisma.recordType.create({ data: { name } });
    }
  }

  const recTypeDiagnosis = await prisma.recordType.findUnique({ where: { name: 'diagnosis' } });
  const recTypeSurgery = await prisma.recordType.findUnique({ where: { name: 'surgery' } });
  const recTypeHospitalization = await prisma.recordType.findUnique({ where: { name: 'hospitalization' } });
  const recTypeConsultation = await prisma.recordType.findUnique({ where: { name: 'consultation' } });
  const recTypeLab = await prisma.recordType.findUnique({ where: { name: 'lab_result' } });

  const apptScheduled = await prisma.appointmentStatus.findFirst({ where: { name: 'scheduled' } }) || { id: 1 };
  const apptCompleted = await prisma.appointmentStatus.findFirst({ where: { name: 'completed' } }) || { id: 2 };
  const docTypeLab = await prisma.documentType.findFirst({ where: { name: 'Lab Report' } }) || { id: 3 };

  // Ensure default doctor and nurse
  let doctor = await prisma.doctor.findFirst();
  if (!doctor) {
    console.log('No doctor found, skipping DB link');
    return;
  }

  // Ensure Medicines
  const medicinesData = [
    { name: 'Amlodipine Besylate', genericName: 'Amlodipine', category: 'Antihypertensive', unit: 'mg' },
    { name: 'Metformin Hydrochloride', genericName: 'Metformin', category: 'Antidiabetic', unit: 'mg' },
    { name: 'Atorvastatin Calcium', genericName: 'Atorvastatin', category: 'Lipid Lowering', unit: 'mg' },
    { name: 'Montelukast Sodium', genericName: 'Montelukast', category: 'Antiasthmatic', unit: 'mg' },
    { name: 'Levothyroxine Sodium', genericName: 'Levothyroxine', category: 'Thyroid Hormone', unit: 'mcg' },
    { name: 'Amoxicillin Trihydrate', genericName: 'Amoxicillin', category: 'Antibiotic', unit: 'mg' },
    { name: 'Paracetamol', genericName: 'Acetaminophen', category: 'Analgesic', unit: 'mg' },
  ];

  for (const m of medicinesData) {
    const ex = await prisma.medicine.findFirst({ where: { name: m.name } });
    if (!ex) {
      await prisma.medicine.create({ data: m });
    }
  }

  const allMeds = await prisma.medicine.findMany();

  // Clinical Profiles for Patients
  const patientProfiles: Record<string, {
    diagnoses: { title: string; desc: string; date: string }[];
    surgeries: { title: string; desc: string; date: string }[];
    hospitalizations: { title: string; desc: string; date: string }[];
    labs: { title: string; desc: string; date: string }[];
    appointments: { reason: string; notes: string; date: string; time: string; status: 'completed' | 'scheduled' }[];
    prescriptions: { diagnosis: string; notes: string; medName: string; dosage: string; freq: string }[];
    observations: { temp: number; pulse: number; resp: number; sbp: number; dbp: number; spo2: number; obs: string }[];
  }> = {
    'joldamathew00@gmail.com': {
      diagnoses: [
        { title: 'Mild Essential Hypertension', desc: 'Stage 1 essential hypertension documented. Maintained on lifestyle modification and low-dose ACE inhibitor.', date: '2024-03-12' },
        { title: 'Seasonal Allergic Rhinitis', desc: 'IgE-mediated nasal congestion and sneezing triggered by pollen and dust mites. Responds to non-sedating antihistamines.', date: '2023-08-20' },
        { title: 'Iron Deficiency Anemia (Mild)', desc: 'Mild microcytic hypochromic anemia secondary to dietary deficiency. Responded well to oral iron therapy.', date: '2025-01-14' },
      ],
      surgeries: [
        { title: 'Diagnostic Laparoscopy & Appendectomy', desc: 'Elective laparoscopic appendectomy performed without complications. Uneventful recovery.', date: '2021-06-18' },
      ],
      hospitalizations: [
        { title: 'Inpatient Observation for Acute Gastroenteritis', desc: 'Admitted for IV fluid rehydration and electrolyte correction. Discharged stable within 48 hours.', date: '2022-09-04' },
      ],
      labs: [
        { title: 'Complete Blood Count (CBC) & Serum Ferritin', desc: 'Hemoglobin: 12.8 g/dL (Normal). Platelets: 240,000 /mcL. Serum Ferritin: 45 ng/mL (Optimal).', date: '2026-08-10' },
        { title: 'Comprehensive Lipid Profile', desc: 'Total Cholesterol: 184 mg/dL. HDL: 56 mg/dL. LDL: 104 mg/dL. Triglycerides: 120 mg/dL.', date: '2026-06-15' },
        { title: 'Fasting Plasma Glucose & HbA1c', desc: 'Fasting Glucose: 92 mg/dL. HbA1c: 5.4% (Normal glycemic control).', date: '2026-05-20' },
      ],
      appointments: [
        { reason: 'Cardiology & Blood Pressure Review', notes: 'Blood pressure well-controlled at 122/78 mmHg. Continue current medication regimen.', date: '2026-08-10', time: '10:30:00Z', status: 'completed' },
        { reason: 'Comprehensive Annual Preventive Health Checkup', notes: 'Scheduled annual wellness check and routine screening.', date: '2026-09-15', time: '09:00:00Z', status: 'scheduled' },
      ],
      prescriptions: [
        { diagnosis: 'Mild Essential Hypertension & Preventative Care', notes: 'Take once daily in the morning with a glass of water.', medName: 'Amlodipine Besylate', dosage: '5 mg', freq: 'Once daily (Morning)' },
        { diagnosis: 'Seasonal Allergic Rhinitis', notes: 'Take at night before bed during pollen flare-ups.', medName: 'Montelukast Sodium', dosage: '10 mg', freq: 'Once daily at bedtime' },
      ],
      observations: [
        { temp: 98.4, pulse: 74, resp: 16, sbp: 122, dbp: 78, spo2: 99.0, obs: 'Patient alert, oriented, and resting comfortably. Normal vital signs.' },
      ],
    },
    'joslinshaju67@gmail.com': {
      diagnoses: [
        { title: 'Type 2 Diabetes Mellitus (Well-Controlled)', desc: 'Diagnosed 3 years ago. Well managed with oral Metformin and dietary carbohydrate restriction. Target HbA1c < 6.5%.', date: '2023-04-10' },
        { title: 'Hyperlipidemia / Elevated LDL', desc: 'Primary hypercholesterolemia. Baseline lipid profile controlled with Atorvastatin 20mg.', date: '2024-02-18' },
        { title: 'Vitamin D Deficiency', desc: 'Vitamin D 25-OH level 18 ng/mL. Successfully corrected with weekly cholecalciferol supplementation.', date: '2025-05-12' },
      ],
      surgeries: [
        { title: 'Right Knee Arthroscopy & Meniscal Repair', desc: 'Minimally invasive arthroscopic repair of medial meniscus tear following sports injury.', date: '2022-11-05' },
      ],
      hospitalizations: [
        { title: 'Day-Care Surgical Admission (Arthroscopy)', desc: 'Admitted for scheduled arthroscopy. Discharged same day with physical therapy regimen.', date: '2022-11-05' },
      ],
      labs: [
        { title: 'HbA1c & Fasting Glycemic Panel', desc: 'HbA1c: 6.2% (Target Achieved). Fasting Blood Glucose: 108 mg/dL. Post-prandial: 138 mg/dL.', date: '2026-07-22' },
        { title: 'Lipid Panel & Liver Function Tests (LFT)', desc: 'Total Cholesterol: 168 mg/dL. LDL: 92 mg/dL. ALT/AST: 22/24 U/L (Normal hepatic tolerance).', date: '2026-07-22' },
        { title: 'Renal Function Panel & Serum Creatinine', desc: 'eGFR: > 90 mL/min/1.73m2. Serum Creatinine: 0.82 mg/dL. Blood Urea Nitrogen: 14 mg/dL.', date: '2026-04-10' },
      ],
      appointments: [
        { reason: 'Endocrinology & Diabetic Foot Examination', notes: 'Bilateral pedal pulses strong. No signs of peripheral neuropathy. Excellent glycemic adherence.', date: '2026-07-22', time: '11:00:00Z', status: 'completed' },
        { reason: 'Routine 3-Month Diabetic Follow-up', notes: 'Scheduled review of fasting glucose log and HbA1c.', date: '2026-10-20', time: '10:00:00Z', status: 'scheduled' },
      ],
      prescriptions: [
        { diagnosis: 'Type 2 Diabetes Mellitus', notes: 'Take with morning and evening meals to minimize GI side effects.', medName: 'Metformin Hydrochloride', dosage: '500 mg', freq: 'Twice daily with meals' },
        { diagnosis: 'Hyperlipidemia', notes: 'Take once daily at bedtime.', medName: 'Atorvastatin Calcium', dosage: '20 mg', freq: 'Once daily at night' },
      ],
      observations: [
        { temp: 98.6, pulse: 78, resp: 17, sbp: 126, dbp: 82, spo2: 98.5, obs: 'Patient energetic and responsive. Postprandial blood glucose 134 mg/dL.' },
      ],
    },
    'naveena01@gmail.com': {
      diagnoses: [
        { title: 'Bronchial Asthma (Moderate Persistent)', desc: 'History of nocturnal cough and exercise-induced wheezing. Managed with inhaled corticosteroid and bronchodilator as needed.', date: '2022-03-15' },
        { title: 'Hypothyroidism (Hashimoto Thyroiditis)', desc: 'Elevated TSH on routine screening. Euthyroid maintained on Levothyroxine 50 mcg daily.', date: '2023-09-08' },
        { title: 'Generalized Migraine with Aura', desc: 'Episodic visual aura followed by unilateral throbbing headache. Triggered by irregular sleep and stress.', date: '2024-06-20' },
      ],
      surgeries: [
        { title: 'Tonsillectomy', desc: 'Bilateral tonsillectomy performed for recurrent streptococcal pharyngitis in childhood.', date: '2016-08-14' },
      ],
      hospitalizations: [
        { title: 'Emergency Room Observation for Acute Asthma Flare', desc: 'Treated with nebulized salbutamol and short course of oral prednisolone. Full recovery.', date: '2023-11-12' },
      ],
      labs: [
        { title: 'Thyroid Function Panel (Free T4 & TSH)', desc: 'TSH: 2.15 mIU/L (Euthyroid target). Free T4: 1.28 ng/dL. Anti-TPO antibodies: Positive (78 IU/mL).', date: '2026-08-05' },
        { title: 'Pulmonary Function Spirometry Report', desc: 'FEV1/FVC ratio: 82% (Post-bronchodilator). Normal vital capacity and ventilatory reserve.', date: '2026-05-18' },
        { title: 'Complete Blood Count (CBC) with Differential', desc: 'Eosinophils: 4.2% (Mildly elevated, consistent with atopy). Total WBC: 6,800 /mcL.', date: '2026-08-05' },
      ],
      appointments: [
        { reason: 'Pulmonology & Respiratory Assessment', notes: 'Chest clear bilaterally. Peak expiratory flow rate 420 L/min. Asthma action plan renewed.', date: '2026-08-05', time: '14:00:00Z', status: 'completed' },
        { reason: 'Endocrine & Thyroid Screening Follow-up', notes: 'Review TSH response to 50 mcg Levothyroxine.', date: '2026-11-10', time: '11:30:00Z', status: 'scheduled' },
      ],
      prescriptions: [
        { diagnosis: 'Hypothyroidism', notes: 'Take first thing in the morning on an empty stomach with water, 30 min before breakfast.', medName: 'Levothyroxine Sodium', dosage: '50 mcg', freq: 'Once daily (Fasting)' },
        { diagnosis: 'Bronchial Asthma & Allergic Symptoms', notes: 'Take in the evening. Carry rescue inhaler as instructed.', medName: 'Montelukast Sodium', dosage: '10 mg', freq: 'Once daily (Night)' },
      ],
      observations: [
        { temp: 98.2, pulse: 72, resp: 15, sbp: 118, dbp: 74, spo2: 99.5, obs: 'Lungs clear to auscultation bilaterally. No wheeze or respiratory distress.' },
      ],
    },
    'suryachacko01@gmail.com': {
      diagnoses: [
        { title: 'Chronic Migraine & Tension Headache', desc: 'Documented neurological evaluation. Responds to hydration, prophylactic lifestyle modification, and NSAIDs.', date: '2023-01-10' },
        { title: 'Gastroesophageal Reflux Disease (GERD)', desc: 'Mild reflux symptoms exacerbated by acidic foods. Controlled with occasional antacids and dietary adjustments.', date: '2024-05-14' },
      ],
      surgeries: [],
      hospitalizations: [],
      labs: [
        { title: 'Metabolic & Electrolyte Panel', desc: 'Sodium: 140 mEq/L. Potassium: 4.2 mEq/L. Calcium: 9.4 mg/dL. All within optimal reference range.', date: '2026-07-15' },
      ],
      appointments: [
        { reason: 'Neurology Consultation for Headache Management', notes: 'Neurological exam normal. Advised lifestyle modifications and headache diary.', date: '2026-07-15', time: '15:00:00Z', status: 'completed' },
      ],
      prescriptions: [
        { diagnosis: 'Acute Migraine Symptom Relief', notes: 'Take at onset of severe headache symptoms as needed.', medName: 'Paracetamol', dosage: '650 mg', freq: 'As needed (Max 3/day)' },
      ],
      observations: [
        { temp: 98.4, pulse: 70, resp: 16, sbp: 120, dbp: 76, spo2: 99.0, obs: 'Patient calm and alert. Vitals completely stable.' },
      ],
    },
    'alice.test@example.com': {
      diagnoses: [
        { title: 'Mild Allergic Dermatitis', desc: 'Contact allergy to certain cosmetic fragrances. Managed with topical emollients.', date: '2024-09-10' },
      ],
      surgeries: [],
      hospitalizations: [],
      labs: [
        { title: 'Basic Health & Vital Chemistry Profile', desc: 'All routine parameters within standard clinical limits.', date: '2026-06-01' },
      ],
      appointments: [
        { reason: 'General Wellness Review', notes: 'Routine checkup. In good overall health.', date: '2026-06-01', time: '09:30:00Z', status: 'completed' },
      ],
      prescriptions: [],
      observations: [
        { temp: 98.6, pulse: 72, resp: 16, sbp: 116, dbp: 74, spo2: 99.0, obs: 'Normal general examination.' },
      ],
    },
  };

  const allPatients = await prisma.patient.findMany({ include: { user: true } });

  for (const p of allPatients) {
    const email = p.user?.email || '';
    const profile = patientProfiles[email] || patientProfiles['joldamathew00@gmail.com'];

    console.log(`Processing patient #${p.id} (${p.firstName} ${p.lastName}, ${email})...`);

    // Clean existing dummy / duplicate records for this patient to ensure pristine structure
    await prisma.prescriptionItem.deleteMany({ where: { prescription: { patientId: p.id } } });
    await prisma.prescription.deleteMany({ where: { patientId: p.id } });
    await prisma.medicalDocument.deleteMany({ where: { patientId: p.id } });
    await prisma.medicalRecord.deleteMany({ where: { patientId: p.id } });
    await prisma.patientObservation.deleteMany({ where: { patientId: p.id } });
    await prisma.appointment.deleteMany({ where: { patientId: p.id } });

    // 1. Insert Appointments
    const createdAppts = [];
    for (const a of profile.appointments) {
      const statusId = a.status === 'scheduled' ? apptScheduled.id : apptCompleted.id;
      const appt = await prisma.appointment.create({
        data: {
          patientId: p.id,
          doctorId: doctor.id,
          appointmentDate: new Date(a.date),
          appointmentTime: new Date(`2026-08-10T${a.time}`),
          statusId,
          reason: a.reason,
          notes: a.notes,
        },
      });
      createdAppts.push(appt);
    }

    const firstApptId = createdAppts[0]?.id;

    // 2. Insert Diagnoses (Medical History Conditions)
    for (const d of profile.diagnoses) {
      await prisma.medicalRecord.create({
        data: {
          patientId: p.id,
          doctorId: doctor.id,
          appointmentId: firstApptId,
          recordTypeId: recTypeDiagnosis?.id || 1,
          title: d.title,
          description: d.desc,
          recordDate: new Date(d.date),
        },
      });
    }

    // 3. Insert Surgeries
    for (const s of profile.surgeries) {
      await prisma.medicalRecord.create({
        data: {
          patientId: p.id,
          doctorId: doctor.id,
          appointmentId: firstApptId,
          recordTypeId: recTypeSurgery?.id || 1,
          title: s.title,
          description: s.desc,
          recordDate: new Date(s.date),
        },
      });
    }

    // 4. Insert Hospitalizations
    for (const h of profile.hospitalizations) {
      await prisma.medicalRecord.create({
        data: {
          patientId: p.id,
          doctorId: doctor.id,
          appointmentId: firstApptId,
          recordTypeId: recTypeHospitalization?.id || 1,
          title: h.title,
          description: h.desc,
          recordDate: new Date(h.date),
        },
      });
    }

    // 5. Insert Lab Reports
    for (const l of profile.labs) {
      const labRec = await prisma.medicalRecord.create({
        data: {
          patientId: p.id,
          doctorId: doctor.id,
          appointmentId: firstApptId,
          recordTypeId: recTypeLab?.id || 2,
          title: l.title,
          description: l.desc,
          recordDate: new Date(l.date),
        },
      });

      // Attach PDF Document
      await prisma.medicalDocument.create({
        data: {
          patientId: p.id,
          recordId: labRec.id,
          documentTypeId: docTypeLab.id,
          fileName: `${l.title.replace(/[^a-zA-Z0-9]/g, '_')}_P${p.id}.pdf`,
          filePath: `/documents/lab/${l.title.replace(/[^a-zA-Z0-9]/g, '_')}_P${p.id}.pdf`,
          fileSizeKb: 180,
          uploadedById: doctor.userId,
        },
      });
    }

    // 6. Insert Consultation Progress Notes
    await prisma.medicalRecord.create({
      data: {
        patientId: p.id,
        doctorId: doctor.id,
        appointmentId: firstApptId,
        recordTypeId: recTypeConsultation?.id || 1,
        title: `Progress Note by Dr. ${doctor.firstName} ${doctor.lastName}`,
        description: `Comprehensive clinical review conducted. Patient vitals stable and within expected parameters. Current treatment plan and home medication regimen reviewed and re-authorized. Follow-up scheduled as indicated.`,
        recordDate: new Date('2026-08-10'),
      },
    });

    // 7. Insert Prescriptions
    for (const rx of profile.prescriptions) {
      const med = allMeds.find(m => m.name.toLowerCase().includes(rx.medName.toLowerCase().split(' ')[0])) || allMeds[0];
      const createdRx = await prisma.prescription.create({
        data: {
          patientId: p.id,
          doctorId: doctor.id,
          appointmentId: firstApptId,
          diagnosis: rx.diagnosis,
          notes: rx.notes,
          prescribedDate: new Date('2026-08-10'),
          validUntil: new Date('2026-11-10'),
        },
      });

      await prisma.prescriptionItem.create({
        data: {
          prescriptionId: createdRx.id,
          medicineId: med.id,
          dosage: rx.dosage,
          frequency: rx.freq,
          durationDays: 90,
          instructions: rx.notes,
        },
      });
    }

    // 8. Insert Patient Observations (Vitals)
    for (const obs of profile.observations) {
      await prisma.patientObservation.create({
        data: {
          patientId: p.id,
          nurseId: 1,
          observationDate: new Date('2026-08-10'),
          observationTime: new Date('2026-08-10T08:30:00Z'),
          temperature: obs.temp,
          pulseRate: obs.pulse,
          respiratoryRate: obs.resp,
          systolicBp: obs.sbp,
          diastolicBp: obs.dbp,
          spo2: obs.spo2,
          generalObservation: obs.obs,
        },
      });
    }
  }

  console.log('✅ Successfully seeded comprehensive clinical records for all registered patients in the database!');
}

main().finally(() => prisma.$disconnect());
