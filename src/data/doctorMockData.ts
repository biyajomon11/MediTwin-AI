import type {
  DoctorPatient, ClinicalGuideline,
} from '../types';

// The mock "current doctor" ID. In production this comes from the JWT.
export const MOCK_DOCTOR_ID = 1;

export const MOCK_PATIENTS: DoctorPatient[] = [
  {
    id: 101,
    assignedDoctorId: 1,
    firstName: 'Arjun',
    lastName: 'Mehta',
    dateOfBirth: '1978-04-12',
    age: 46,
    phone: '+91 98200 11234',
    email: 'arjun.mehta@email.com',
    gender: { name: 'Male' },
    bloodGroup: { name: 'B+' },
    department: 'Cardiology',
    ward: 'Ward 3A',
    address: '14 Marine Lines, Mumbai, Maharashtra',
    status: 'Active',
    lastVisit: '2026-08-10',
    nextAppointment: '2026-08-22',
    primaryCondition: 'Hypertensive Heart Disease',
    emergencyContactName: 'Priya Mehta',
    emergencyContactPhone: '+91 98200 55678',
    allergies: [
      {
        substance: 'Penicillin',
        reaction: 'Anaphylaxis (Angioedema, Bronchospasm)',
        severity: 'Severe',
        verificationStatus: 'Verified by Doctor',
        verifiedBy: 'Dr. Priya Sharma (Cardiology)',
        verifiedDate: '2025-01-15',
        reactionType: 'True IgE Allergy',
        notes: 'Confirmed IgE-mediated allergy. Absolute contraindication for all beta-lactams.',
      },
      {
        substance: 'Aspirin',
        reaction: 'Gastric Irritation & Epigastric Pain',
        severity: 'Moderate',
        verificationStatus: 'Verified by Nurse',
        verifiedBy: 'Staff Nurse Ananya Krishnan',
        verifiedDate: '2026-08-10',
        reactionType: 'Drug Intolerance',
        notes: 'Gastric intolerance. Administer with PPI gastroprotection if required.',
      },
    ],
    currentMedications: [
      { name: 'Amlodipine', dosage: '5 mg', frequency: 'Once daily', startDate: '2025-01-15', prescribedBy: 'Dr. Sharma' },
      { name: 'Atorvastatin', dosage: '40 mg', frequency: 'Once daily at night', startDate: '2025-01-15', prescribedBy: 'Dr. Sharma' },
      { name: 'Metoprolol', dosage: '50 mg', frequency: 'Twice daily', startDate: '2025-03-10', prescribedBy: 'Dr. Sharma' },
    ],
    medicalHistory: [
      { condition: 'Hypertension', diagnosedDate: '2018-06-20', status: 'Chronic', notes: 'Well controlled on medication' },
      { condition: 'Type 2 Diabetes Mellitus', diagnosedDate: '2020-02-14', status: 'Active' },
      { condition: 'Appendectomy', diagnosedDate: '2005-11-03', status: 'Resolved' },
    ],
    prescriptions: [
      {
        id: 'RX-101-001', date: '2026-08-10', doctorName: 'Dr. Sharma', status: 'Active',
        notes: 'Continue current regimen. Review in 4 weeks.',
        medications: [
          { name: 'Amlodipine', dosage: '5 mg', frequency: 'Once daily', startDate: '2026-08-10', prescribedBy: 'Dr. Sharma' },
          { name: 'Metoprolol', dosage: '50 mg', frequency: 'Twice daily', startDate: '2026-08-10', prescribedBy: 'Dr. Sharma' },
        ],
      },
    ],
    labReports: [
      { id: 'LR-101-001', testName: 'Complete Blood Count (CBC)', date: '2026-08-08', result: 'WBC 7.2, RBC 4.8, Hb 13.5, Platelets 220K', referenceRange: 'WBC 4-11K, Hb 13-17 g/dL', unit: 'Various', status: 'Normal', orderedBy: 'Dr. Sharma' },
      { id: 'LR-101-002', testName: 'HbA1c', date: '2026-08-08', result: '7.8', referenceRange: '< 7.0', unit: '%', status: 'Abnormal', orderedBy: 'Dr. Sharma', notes: 'Diabetes management needs review' },
      { id: 'LR-101-003', testName: 'Lipid Profile', date: '2026-08-08', result: 'Total Cholesterol: 185, LDL: 110, HDL: 45, TG: 150', referenceRange: 'Total < 200, LDL < 100, HDL > 40', unit: 'mg/dL', status: 'Abnormal', orderedBy: 'Dr. Sharma' },
      { id: 'LR-101-004', testName: 'ECG', date: '2026-08-10', result: 'Normal sinus rhythm. Left ventricular hypertrophy noted.', referenceRange: 'Normal sinus rhythm', unit: '-', status: 'Abnormal', orderedBy: 'Dr. Sharma' },
    ],
    appointments: [
      { id: 'APT-101-001', date: '2026-08-10', time: '10:30 AM', reason: 'Routine cardiac follow-up', doctorName: 'Dr. Sharma', department: 'Cardiology', status: 'Completed', notes: 'BP 145/90. Medication adjusted.' },
      { id: 'APT-101-002', date: '2026-07-01', time: '11:00 AM', reason: 'Diabetes management', doctorName: 'Dr. Sharma', department: 'Cardiology', status: 'Completed' },
      { id: 'APT-101-003', date: '2026-08-22', time: '10:00 AM', reason: 'Follow-up post medication change', doctorName: 'Dr. Sharma', department: 'Cardiology', status: 'Upcoming' },
    ],
    clinicalNotes: [
      { id: 'CN-101-001', date: '2026-08-10', time: '11:15 AM', authorName: 'Dr. Sharma', authorRole: 'Cardiologist', type: 'Progress Note', content: 'Patient presents with BP 145/90 mmHg. Left ventricular hypertrophy noted on ECG. HbA1c elevated at 7.8%. Increased Metoprolol dose. Referred to endocrinology for diabetes management. Patient counselled on diet and lifestyle.' },
      { id: 'CN-101-002', date: '2026-07-01', time: '12:00 PM', authorName: 'Dr. Sharma', authorRole: 'Cardiologist', type: 'Progress Note', content: 'Stable BP on current regimen. Lipid profile shows borderline LDL. Atorvastatin continued. Next review in 6 weeks.' },
    ],
    documents: [
      { id: 'DOC-101-001', name: 'ECG Report 10-Aug-2026.pdf', type: 'PDF', uploadedDate: '2026-08-10', uploadedBy: 'Lab Technician', size: '1.2 MB', category: 'Lab Report' },
      { id: 'DOC-101-002', name: 'Echocardiogram 2025.pdf', type: 'PDF', uploadedDate: '2025-12-15', uploadedBy: 'Dr. Sharma', size: '3.4 MB', category: 'Radiology' },
    ],
  },
  {
    id: 102,
    assignedDoctorId: 1,
    firstName: 'Sneha',
    lastName: 'Iyer',
    dateOfBirth: '1992-09-25',
    age: 33,
    phone: '+91 94400 77890',
    email: 'sneha.iyer@email.com',
    gender: { name: 'Female' },
    bloodGroup: { name: 'O+' },
    department: 'Neurology',
    ward: 'Ward 5B',
    address: '7 Banjara Hills, Hyderabad, Telangana',
    status: 'Admitted',
    lastVisit: '2026-08-14',
    primaryCondition: 'Migraine with Aura',
    emergencyContactName: 'Rajan Iyer',
    emergencyContactPhone: '+91 94400 11223',
    allergies: [
      {
        substance: 'Sulfonamides',
        reaction: 'Erythematous Maculopapular Skin Rash',
        severity: 'Moderate',
        verificationStatus: 'Self-Reported (Unverified)',
        verifiedBy: 'Pending Clinical Consultation',
        reactionType: 'Adverse Effect',
        notes: 'Self-reported by patient during registration. Triage clinical skin evaluation pending.',
      },
    ],
    currentMedications: [
      { name: 'Topiramate', dosage: '50 mg', frequency: 'Twice daily', startDate: '2025-06-01', prescribedBy: 'Dr. Sharma' },
      { name: 'Sumatriptan', dosage: '50 mg', frequency: 'As needed for migraine', startDate: '2025-06-01', prescribedBy: 'Dr. Sharma' },
    ],
    medicalHistory: [
      { condition: 'Migraine with Aura', diagnosedDate: '2019-03-10', status: 'Chronic', notes: 'Triggered by stress and bright lights' },
      { condition: 'Anxiety Disorder', diagnosedDate: '2021-07-22', status: 'Active' },
    ],
    prescriptions: [
      {
        id: 'RX-102-001', date: '2026-08-14', doctorName: 'Dr. Sharma', status: 'Active',
        notes: 'Headache diary advised. Avoid triggers.',
        medications: [
          { name: 'Topiramate', dosage: '50 mg', frequency: 'Twice daily', startDate: '2026-08-14', prescribedBy: 'Dr. Sharma' },
        ],
      },
    ],
    labReports: [
      { id: 'LR-102-001', testName: 'MRI Brain with Contrast', date: '2026-08-13', result: 'No space-occupying lesion. Mild white matter changes noted bilaterally.', referenceRange: 'Normal brain parenchyma', unit: '-', status: 'Abnormal', orderedBy: 'Dr. Sharma', notes: 'Further correlation advised' },
      { id: 'LR-102-002', testName: 'CBC', date: '2026-08-12', result: 'Within normal limits', referenceRange: 'Normal', unit: 'Various', status: 'Normal', orderedBy: 'Dr. Sharma' },
    ],
    appointments: [
      { id: 'APT-102-001', date: '2026-08-14', time: '09:00 AM', reason: 'Acute migraine episode admission', doctorName: 'Dr. Sharma', department: 'Neurology', status: 'Completed' },
      { id: 'APT-102-002', date: '2026-08-25', time: '02:00 PM', reason: 'Post-admission review', doctorName: 'Dr. Sharma', department: 'Neurology', status: 'Upcoming' },
    ],
    clinicalNotes: [
      { id: 'CN-102-001', date: '2026-08-14', time: '09:30 AM', authorName: 'Dr. Sharma', authorRole: 'Neurologist', type: 'Progress Note', content: 'Patient admitted with severe migraine (VAS 9/10). IV fluids and IV Paracetamol administered. MRI ordered. Neurological examination: no focal deficits.' },
    ],
    documents: [
      { id: 'DOC-102-001', name: 'MRI Brain Report Aug 2026.pdf', type: 'PDF', uploadedDate: '2026-08-13', uploadedBy: 'Radiology Dept', size: '8.7 MB', category: 'Radiology' },
    ],
  },
  {
    id: 103,
    assignedDoctorId: 1,
    firstName: 'Ramesh',
    lastName: 'Nair',
    dateOfBirth: '1955-01-30',
    age: 71,
    phone: '+91 99000 34567',
    email: 'ramesh.nair@email.com',
    gender: { name: 'Male' },
    bloodGroup: { name: 'A+' },
    department: 'General Medicine',
    ward: 'Ward 2C',
    address: '22 Thrissur Road, Ernakulam, Kerala',
    status: 'Critical',
    lastVisit: '2026-08-15',
    primaryCondition: 'COPD Exacerbation',
    emergencyContactName: 'Meena Nair',
    emergencyContactPhone: '+91 99000 12345',
    allergies: [],
    currentMedications: [
      { name: 'Salbutamol Inhaler', dosage: '2 puffs', frequency: 'Every 4 hours as needed', startDate: '2022-03-01', prescribedBy: 'Dr. Sharma' },
      { name: 'Tiotropium', dosage: '18 mcg', frequency: 'Once daily (inhaled)', startDate: '2022-03-01', prescribedBy: 'Dr. Sharma' },
      { name: 'Prednisolone', dosage: '40 mg', frequency: 'Once daily (5-day course)', startDate: '2026-08-15', prescribedBy: 'Dr. Sharma' },
    ],
    medicalHistory: [
      { condition: 'Chronic Obstructive Pulmonary Disease (COPD)', diagnosedDate: '2020-01-10', status: 'Chronic' },
      { condition: 'Smoking History (40 pack-years)', diagnosedDate: '2020-01-10', status: 'Resolved', notes: 'Quit smoking 2020' },
      { condition: 'Cor Pulmonale', diagnosedDate: '2023-05-14', status: 'Active' },
    ],
    prescriptions: [
      {
        id: 'RX-103-001', date: '2026-08-15', doctorName: 'Dr. Sharma', status: 'Active',
        notes: 'Acute exacerbation management. Oxygen supplementation ongoing.',
        medications: [
          { name: 'Prednisolone', dosage: '40 mg', frequency: 'Once daily', startDate: '2026-08-15', prescribedBy: 'Dr. Sharma' },
          { name: 'Amoxicillin-Clavulanate', dosage: '625 mg', frequency: 'Thrice daily', startDate: '2026-08-15', prescribedBy: 'Dr. Sharma' },
        ],
      },
    ],
    labReports: [
      { id: 'LR-103-001', testName: 'Arterial Blood Gas (ABG)', date: '2026-08-15', result: 'pH 7.32, pCO2 58, pO2 52, HCO3 29', referenceRange: 'pH 7.35-7.45, pCO2 35-45, pO2 75-100', unit: 'mmHg', status: 'Critical', orderedBy: 'Dr. Sharma', notes: 'Respiratory acidosis with hypoxia' },
      { id: 'LR-103-002', testName: 'Chest X-Ray', date: '2026-08-15', result: 'Hyperinflated lungs. Flattened diaphragm. No pneumonia consolidation.', referenceRange: 'Normal chest radiograph', unit: '-', status: 'Abnormal', orderedBy: 'Dr. Sharma' },
      { id: 'LR-103-003', testName: 'Sputum Culture', date: '2026-08-14', result: 'Pending', referenceRange: 'No growth', unit: '-', status: 'Pending', orderedBy: 'Dr. Sharma' },
    ],
    appointments: [
      { id: 'APT-103-001', date: '2026-08-15', time: '08:00 AM', reason: 'Emergency admission — COPD exacerbation', doctorName: 'Dr. Sharma', department: 'General Medicine', status: 'Completed' },
    ],
    clinicalNotes: [
      { id: 'CN-103-001', date: '2026-08-15', time: '08:45 AM', authorName: 'Dr. Sharma', authorRole: 'General Physician', type: 'Progress Note', content: 'Elderly male, known COPD, presenting with acute exacerbation. SpO2 82% on room air. Started on controlled oxygen 2L/min via nasal prongs. Nebulised Salbutamol and Ipratropium given. ABG shows respiratory acidosis. ICU consultation pending.' },
    ],
    documents: [
      { id: 'DOC-103-001', name: 'Chest X-Ray Aug 15 2026.pdf', type: 'PDF', uploadedDate: '2026-08-15', uploadedBy: 'Radiology Dept', size: '2.1 MB', category: 'Radiology' },
    ],
  },
  {
    id: 104,
    assignedDoctorId: 1,
    firstName: 'Kavitha',
    lastName: 'Reddy',
    dateOfBirth: '1988-12-05',
    age: 37,
    phone: '+91 87890 23456',
    email: 'kavitha.reddy@email.com',
    gender: { name: 'Female' },
    bloodGroup: { name: 'AB+' },
    department: 'Oncology',
    ward: 'Ward 7A',
    address: '45 Road No. 12, Banjara Hills, Hyderabad',
    status: 'Under Observation',
    lastVisit: '2026-08-12',
    nextAppointment: '2026-08-19',
    primaryCondition: 'Breast Cancer — Stage II (Post Chemotherapy)',
    emergencyContactName: 'Suresh Reddy',
    emergencyContactPhone: '+91 87890 67890',
    allergies: [
      {
        substance: 'Docetaxel',
        reaction: 'Severe Fluid Retention & Capillary Leak',
        severity: 'Severe',
        verificationStatus: 'Verified by Doctor',
        verifiedBy: 'Dr. Priya Sharma (Oncology)',
        verifiedDate: '2025-10-15',
        reactionType: 'True IgE Allergy',
        notes: 'Severe hypersensitivity reaction during Cycle 2 chemo infusion. Paclitaxel/Docetaxel substitution required.',
      },
    ],
    currentMedications: [
      { name: 'Tamoxifen', dosage: '20 mg', frequency: 'Once daily', startDate: '2026-01-10', prescribedBy: 'Dr. Sharma' },
      { name: 'Letrozole', dosage: '2.5 mg', frequency: 'Once daily', startDate: '2026-01-10', prescribedBy: 'Dr. Sharma' },
    ],
    medicalHistory: [
      { condition: 'Breast Cancer (Right Breast) Stage IIA', diagnosedDate: '2025-06-15', status: 'Active' },
      { condition: 'Modified Radical Mastectomy (Right)', diagnosedDate: '2025-08-02', status: 'Resolved', notes: 'Margins clear. 3/15 lymph nodes positive.' },
      { condition: '4 Cycles AC Chemotherapy Completed', diagnosedDate: '2025-10-15', status: 'Resolved' },
    ],
    prescriptions: [
      {
        id: 'RX-104-001', date: '2026-01-10', doctorName: 'Dr. Sharma', status: 'Active',
        notes: 'Hormone therapy. Review every 3 months. Monitor bone density annually.',
        medications: [
          { name: 'Tamoxifen', dosage: '20 mg', frequency: 'Once daily', startDate: '2026-01-10', prescribedBy: 'Dr. Sharma' },
        ],
      },
    ],
    labReports: [
      { id: 'LR-104-001', testName: 'CA 15-3 (Tumour Marker)', date: '2026-08-10', result: '28.4', referenceRange: '< 30 U/mL', unit: 'U/mL', status: 'Normal', orderedBy: 'Dr. Sharma', notes: 'Stable. Continue monitoring.' },
      { id: 'LR-104-002', testName: 'Complete Blood Count', date: '2026-08-10', result: 'WBC 4.1, RBC 3.9, Hb 11.2, Platelets 180K', referenceRange: 'Hb > 12 g/dL', unit: 'Various', status: 'Abnormal', orderedBy: 'Dr. Sharma', notes: 'Mild anaemia — monitor' },
      { id: 'LR-104-003', testName: 'Liver Function Tests', date: '2026-08-10', result: 'ALT 32, AST 28, Bilirubin 0.8', referenceRange: 'ALT < 40, AST < 40', unit: 'U/L', status: 'Normal', orderedBy: 'Dr. Sharma' },
    ],
    appointments: [
      { id: 'APT-104-001', date: '2026-08-12', time: '02:30 PM', reason: 'Oncology follow-up — post chemotherapy review', doctorName: 'Dr. Sharma', department: 'Oncology', status: 'Completed' },
      { id: 'APT-104-002', date: '2026-08-19', time: '03:00 PM', reason: 'Review CA 15-3 results and hormone therapy response', doctorName: 'Dr. Sharma', department: 'Oncology', status: 'Upcoming' },
    ],
    clinicalNotes: [
      { id: 'CN-104-001', date: '2026-08-12', time: '03:00 PM', authorName: 'Dr. Sharma', authorRole: 'Oncologist', type: 'Progress Note', content: 'Patient on Tamoxifen for 7 months. CA 15-3 stable at 28.4. Mild anaemia noted. Patient reports fatigue and hot flushes related to hormone therapy. Counselled on symptoms management. Bone density scan scheduled for September.' },
    ],
    documents: [
      { id: 'DOC-104-001', name: 'Histopathology Report 2025.pdf', type: 'PDF', uploadedDate: '2025-08-15', uploadedBy: 'Pathology Dept', size: '1.8 MB', category: 'Lab Report' },
      { id: 'DOC-104-002', name: 'Post-Op Summary Aug 2025.pdf', type: 'PDF', uploadedDate: '2025-08-10', uploadedBy: 'Dr. Sharma', size: '0.9 MB', category: 'Discharge Summary' },
    ],
  },
  {
    id: 105,
    assignedDoctorId: 1,
    firstName: 'Vikram',
    lastName: 'Singh',
    dateOfBirth: '2010-07-14',
    age: 16,
    phone: '+91 98100 45678',
    email: 'vikram.parent@email.com',
    gender: { name: 'Male' },
    bloodGroup: { name: 'O-' },
    department: 'Pediatrics',
    ward: 'Paediatric Ward',
    address: '8 Model Town, New Delhi',
    status: 'Active',
    lastVisit: '2026-08-08',
    nextAppointment: '2026-09-05',
    primaryCondition: 'Type 1 Diabetes Mellitus',
    emergencyContactName: 'Harpreet Singh (Father)',
    emergencyContactPhone: '+91 98100 11111',
    allergies: [],
    currentMedications: [
      { name: 'Insulin Glargine (Lantus)', dosage: '20 units', frequency: 'Once daily at bedtime', startDate: '2023-04-01', prescribedBy: 'Dr. Sharma' },
      { name: 'Insulin Aspart (NovoRapid)', dosage: 'Carb-based dosing', frequency: 'Before meals', startDate: '2023-04-01', prescribedBy: 'Dr. Sharma' },
    ],
    medicalHistory: [
      { condition: 'Type 1 Diabetes Mellitus', diagnosedDate: '2023-03-20', status: 'Chronic', notes: 'Managed on basal-bolus insulin regimen' },
      { condition: 'Diabetic Ketoacidosis (DKA) — 1 episode', diagnosedDate: '2023-03-18', status: 'Resolved' },
    ],
    prescriptions: [
      {
        id: 'RX-105-001', date: '2026-08-08', doctorName: 'Dr. Sharma', status: 'Active',
        notes: 'Adjust insulin doses per CGM readings. Review in 4 weeks.',
        medications: [
          { name: 'Insulin Glargine', dosage: '20 units', frequency: 'Once daily', startDate: '2026-08-08', prescribedBy: 'Dr. Sharma' },
        ],
      },
    ],
    labReports: [
      { id: 'LR-105-001', testName: 'HbA1c', date: '2026-08-05', result: '8.2', referenceRange: '< 7.5 (paediatric target)', unit: '%', status: 'Abnormal', orderedBy: 'Dr. Sharma', notes: 'Above target. Insulin optimisation required.' },
      { id: 'LR-105-002', testName: 'Urine Microalbumin', date: '2026-08-05', result: '18', referenceRange: '< 30 mg/g Cr', unit: 'mg/g Cr', status: 'Normal', orderedBy: 'Dr. Sharma' },
      { id: 'LR-105-003', testName: 'Fasting Blood Glucose', date: '2026-08-08', result: '182', referenceRange: '70-100', unit: 'mg/dL', status: 'Abnormal', orderedBy: 'Dr. Sharma' },
    ],
    appointments: [
      { id: 'APT-105-001', date: '2026-08-08', time: '10:00 AM', reason: 'Quarterly diabetes review', doctorName: 'Dr. Sharma', department: 'Pediatrics', status: 'Completed' },
      { id: 'APT-105-002', date: '2026-09-05', time: '10:00 AM', reason: 'Insulin dose review + school physical exam', doctorName: 'Dr. Sharma', department: 'Pediatrics', status: 'Upcoming' },
    ],
    clinicalNotes: [
      { id: 'CN-105-001', date: '2026-08-08', time: '10:30 AM', authorName: 'Dr. Sharma', authorRole: 'Paediatric Endocrinologist', type: 'Progress Note', content: 'Adolescent with T1DM. HbA1c 8.2% — above target. CGM data shows frequent post-meal hyperglycaemia. Increased Glargine by 2 units. Patient and parent counselled on carb counting. Dietitian referral made. Next review in 4 weeks.' },
    ],
    documents: [],
  },
  {
    id: 106,
    assignedDoctorId: 1,
    firstName: 'Deepa',
    lastName: 'Krishnamurthy',
    dateOfBirth: '1965-08-19',
    age: 60,
    phone: '+91 96300 54321',
    email: 'deepa.k@email.com',
    gender: { name: 'Female' },
    bloodGroup: { name: 'A-' },
    department: 'General Medicine',
    ward: 'OPD',
    address: '3 Rajaji Nagar, Bengaluru, Karnataka',
    status: 'Discharged',
    lastVisit: '2026-08-01',
    primaryCondition: 'Rheumatoid Arthritis',
    emergencyContactName: 'Mohan Krishnamurthy',
    emergencyContactPhone: '+91 96300 11111',
    allergies: [
      { substance: 'NSAIDs', reaction: 'Peptic ulcer aggravation', severity: 'Moderate' },
    ],
    currentMedications: [
      { name: 'Methotrexate', dosage: '15 mg', frequency: 'Once weekly', startDate: '2024-02-01', prescribedBy: 'Dr. Sharma' },
      { name: 'Folic Acid', dosage: '5 mg', frequency: 'Once daily (except MTX day)', startDate: '2024-02-01', prescribedBy: 'Dr. Sharma' },
      { name: 'Hydroxychloroquine', dosage: '200 mg', frequency: 'Twice daily', startDate: '2024-02-01', prescribedBy: 'Dr. Sharma' },
    ],
    medicalHistory: [
      { condition: 'Rheumatoid Arthritis', diagnosedDate: '2022-09-10', status: 'Chronic', notes: 'Seropositive RA (RF+, anti-CCP+)' },
      { condition: 'Osteoporosis', diagnosedDate: '2023-06-01', status: 'Active' },
    ],
    prescriptions: [
      {
        id: 'RX-106-001', date: '2026-08-01', doctorName: 'Dr. Sharma', status: 'Active',
        notes: 'Continue DMARD therapy. Monitor LFTs monthly.',
        medications: [
          { name: 'Methotrexate', dosage: '15 mg', frequency: 'Once weekly', startDate: '2026-08-01', prescribedBy: 'Dr. Sharma' },
          { name: 'Folic Acid', dosage: '5 mg', frequency: 'Once daily', startDate: '2026-08-01', prescribedBy: 'Dr. Sharma' },
        ],
      },
    ],
    labReports: [
      { id: 'LR-106-001', testName: 'Liver Function Tests (LFT)', date: '2026-07-28', result: 'ALT 38, AST 35, Bilirubin 0.9', referenceRange: 'ALT < 40, AST < 40', unit: 'U/L', status: 'Normal', orderedBy: 'Dr. Sharma', notes: 'Within acceptable range on MTX' },
      { id: 'LR-106-002', testName: 'Rheumatoid Factor (RF)', date: '2026-07-28', result: '128', referenceRange: '< 20 IU/mL', unit: 'IU/mL', status: 'Abnormal', orderedBy: 'Dr. Sharma' },
      { id: 'LR-106-003', testName: 'ESR', date: '2026-07-28', result: '55', referenceRange: '< 20 mm/hr', unit: 'mm/hr', status: 'Abnormal', orderedBy: 'Dr. Sharma', notes: 'Elevated, disease activity present' },
    ],
    appointments: [
      { id: 'APT-106-001', date: '2026-08-01', time: '04:00 PM', reason: 'Rheumatology follow-up', doctorName: 'Dr. Sharma', department: 'General Medicine', status: 'Completed' },
      { id: 'APT-106-002', date: '2026-09-01', time: '04:00 PM', reason: 'Monthly MTX monitoring', doctorName: 'Dr. Sharma', department: 'General Medicine', status: 'Upcoming' },
    ],
    clinicalNotes: [
      { id: 'CN-106-001', date: '2026-08-01', time: '04:30 PM', authorName: 'Dr. Sharma', authorRole: 'General Physician', type: 'Progress Note', content: 'Patient on MTX and HCQ for RA. LFTs stable. ESR still elevated — disease moderately active. DAS28 score 4.2. Added Sulfasalazine 1g BD to regimen. Eye exam referral for HCQ monitoring. Bone density review scheduled.' },
    ],
    documents: [
      { id: 'DOC-106-001', name: 'X-Ray Hands Aug 2026.pdf', type: 'PDF', uploadedDate: '2026-07-30', uploadedBy: 'Radiology Dept', size: '1.5 MB', category: 'Radiology' },
    ],
  },
];

export const MOCK_GUIDELINES: ClinicalGuideline[] = [
  {
    id: 'GL-001',
    title: 'Hypertension Management Protocol',
    category: 'General Medicine',
    department: 'General Medicine',
    version: '3.2',
    effectiveDate: '2026-01-01',
    lastUpdated: '2025-12-15',
    uploadedBy: 'Dr. P. Kumar (CMO)',
    description: 'Evidence-based protocol for diagnosis, treatment, and monitoring of hypertension in adult inpatients and outpatients.',
    downloadAvailable: false,
    accessLevel: 'Medical Staff',
    tags: ['hypertension', 'BP', 'antihypertensives', 'cardiovascular'],
    content: `HYPERTENSION MANAGEMENT PROTOCOL — Version 3.2

1. CLASSIFICATION
   Stage 1 Hypertension: SBP 130-139 or DBP 80-89 mmHg
   Stage 2 Hypertension: SBP ≥140 or DBP ≥90 mmHg
   Hypertensive Crisis: SBP >180 and/or DBP >120 mmHg

2. INITIAL ASSESSMENT
   • Complete clinical history including secondary causes
   • Fasting lipid profile, HbA1c, eGFR, urine microalbumin
   • ECG, Echocardiogram if indicated
   • Fundus examination for hypertensive retinopathy

3. LIFESTYLE MODIFICATIONS (all stages)
   • DASH diet: reduce sodium to <2.3g/day
   • Regular aerobic exercise ≥30 min, 5 days/week
   • Weight reduction to BMI <25 kg/m²
   • Alcohol restriction: ≤1 unit/day (women), ≤2 units/day (men)
   • Smoking cessation

4. PHARMACOLOGICAL TREATMENT
   First-line agents: ACE Inhibitors / ARBs, Calcium Channel Blockers, Thiazide diuretics
   Compelling indications: Beta-blockers for post-MI, heart failure
   Second-line: Alpha-blockers, centrally acting agents
   Combination therapy preferred for Stage 2

5. MONITORING
   • Review BP at 1 month after initiation
   • Target BP: <130/80 mmHg (general), <140/90 mmHg (elderly >80 years)
   • Annual renal function, electrolytes, lipid profile
   • Medication adherence assessment at every visit

6. HYPERTENSIVE EMERGENCY MANAGEMENT
   • IV Labetalol or Nicardipine (ICU setting)
   • Controlled reduction: 25% within first hour, then gradual
   • Identify and treat underlying cause`,
  },
  {
    id: 'GL-002',
    title: 'Acute Myocardial Infarction — Emergency Response Protocol',
    category: 'Emergency Care',
    department: 'Cardiology',
    version: '2.5',
    effectiveDate: '2025-07-01',
    lastUpdated: '2025-06-20',
    uploadedBy: 'Dr. S. Bhat (Head of Cardiology)',
    description: 'Standardised emergency protocol for STEMI and NSTEMI management from first medical contact to definitive treatment.',
    downloadAvailable: false,
    accessLevel: 'Medical Staff',
    tags: ['MI', 'STEMI', 'NSTEMI', 'emergency', 'cardiac', 'thrombolysis'],
    content: `ACUTE MI EMERGENCY PROTOCOL — Version 2.5

STEMI MANAGEMENT (Door-to-Balloon Target: <90 minutes)

1. IMMEDIATE ACTIONS (within 10 minutes of presentation)
   • 12-lead ECG within 10 minutes
   • IV access × 2, oxygen if SpO2 <90%
   • Aspirin 300 mg loading dose (chew)
   • Ticagrelor 180 mg or Clopidogrel 600 mg loading dose
   • Morphine for pain (titrate 2-4 mg IV prn)
   • Nitrates if SBP >90 mmHg and no RV infarction

2. REPERFUSION STRATEGY
   Primary PCI (preferred): Activate cath lab immediately
   Thrombolysis (if PCI unavailable within 120 min): Tenecteplase weight-based dose

3. ADJUNCTIVE THERAPY
   • Unfractionated Heparin bolus 60 U/kg (max 4000 U)
   • Beta-blocker (oral) within 24 hours if haemodynamically stable
   • ACE Inhibitor within 24 hours (all STEMI)
   • Statin (high-intensity) immediately: Rosuvastatin 40 mg

4. POST-MI MONITORING
   • Continuous cardiac monitoring ×48 hours
   • Echo within 24 hours for LVEF assessment
   • Serial troponins every 6 hours ×3

5. DISCHARGE MEDICATIONS
   Dual antiplatelet (12 months), Statin, ACE Inhibitor, Beta-blocker, Aldosterone antagonist if EF <40%`,
  },
  {
    id: 'GL-003',
    title: 'Medication Administration — Standard Nursing Protocol',
    category: 'Nursing Procedures',
    department: 'All Departments',
    version: '4.0',
    effectiveDate: '2026-03-01',
    lastUpdated: '2026-02-10',
    uploadedBy: 'Head Nursing Officer',
    description: 'Standard procedures for safe medication preparation, verification, and administration by nursing staff across all wards.',
    downloadAvailable: false,
    accessLevel: 'All Staff',
    tags: ['medication', 'nursing', 'administration', 'safety', 'five rights'],
    content: `MEDICATION ADMINISTRATION PROTOCOL — Version 4.0

THE FIVE RIGHTS OF MEDICATION ADMINISTRATION
   1. Right Patient (verify two identifiers: name + DOB)
   2. Right Drug (check generic name, brand)
   3. Right Dose (verify against prescription)
   4. Right Route (oral, IV, IM, SC, topical)
   5. Right Time (check frequency, last dose)

PREPARATION
   • Perform hand hygiene before preparation
   • Prepare in designated medication area
   • Check expiry date and appearance
   • For IV medications: verify compatibility

ADMINISTRATION
   • Identify patient before every administration
   • Explain procedure to patient
   • Do not leave medications at bedside unsupervised
   • Document immediately after administration

HIGH-ALERT MEDICATIONS (double-check required)
   • Insulin — always double-checked by second nurse
   • Heparin — weight-based dosing verification
   • Concentrated electrolytes (KCl, NaCl 3%)
   • Opioids — controlled drug register entry required

ERROR REPORTING
   • Report all medication errors via incident reporting system within 1 hour
   • Notify treating physician immediately
   • Document in patient notes`,
  },
  {
    id: 'GL-004',
    title: 'Antimicrobial Stewardship — Antibiotic Prescribing Policy',
    category: 'Medication Guidelines',
    department: 'All Departments',
    version: '2.1',
    effectiveDate: '2025-09-01',
    lastUpdated: '2025-08-20',
    uploadedBy: 'Infectious Disease Committee',
    description: 'Evidence-based antibiotic prescribing guidelines to reduce antimicrobial resistance and ensure appropriate therapy.',
    downloadAvailable: false,
    accessLevel: 'Medical Staff',
    tags: ['antibiotics', 'AMR', 'stewardship', 'infection', 'prescribing'],
    content: `ANTIMICROBIAL STEWARDSHIP POLICY — Version 2.1

PRINCIPLES
   • Culture before antibiotics whenever possible
   • Use narrowest spectrum effective agent
   • Reassess at 48-72 hours (de-escalate if possible)
   • Shortest effective duration

EMPIRICAL THERAPY GUIDANCE
   Community-Acquired Pneumonia (Non-severe):
   → Amoxicillin 1g TDS ± Clarithromycin 500 mg BD (5-7 days)
   
   Hospital-Acquired Pneumonia:
   → Piperacillin-Tazobactam 4.5g TDS IV (7 days)
   → Add Vancomycin if MRSA risk
   
   Urinary Tract Infection (uncomplicated):
   → Nitrofurantoin 100 mg BD (5 days, women only)
   → Trimethoprim 200 mg BD (7 days)

RESTRICTED ANTIBIOTICS (require ID approval)
   • Carbapenems (Meropenem, Ertapenem)
   • Colistin
   • Linezolid
   • Daptomycin

MONITORING
   • Renal function for aminoglycosides and vancomycin
   • Therapeutic drug monitoring (vancomycin AUC/MIC preferred)`,
  },
  {
    id: 'GL-005',
    title: 'Hand Hygiene and Standard Precautions',
    category: 'Infection Control',
    department: 'All Departments',
    version: '5.1',
    effectiveDate: '2026-01-15',
    lastUpdated: '2025-12-30',
    uploadedBy: 'Infection Control Committee',
    description: 'WHO Five Moments of Hand Hygiene and standard precautions for all clinical areas to prevent healthcare-associated infections.',
    downloadAvailable: false,
    accessLevel: 'All Staff',
    tags: ['hand hygiene', 'infection control', 'HAI', 'PPE', 'WHO'],
    content: `HAND HYGIENE — STANDARD PRECAUTIONS — Version 5.1

WHO FIVE MOMENTS FOR HAND HYGIENE
   1. BEFORE touching a patient
   2. BEFORE clean/aseptic procedure
   3. AFTER body fluid exposure risk
   4. AFTER touching a patient
   5. AFTER touching patient surroundings

TECHNIQUE
   Alcohol-based hand rub (ABHR): 20-30 seconds
   Soap and water: 40-60 seconds (when hands visibly soiled or after C. difficile exposure)

STANDARD PRECAUTIONS (ALL patients)
   • Gloves: when contact with blood, body fluids anticipated
   • Apron/Gown: risk of splashing
   • Surgical Mask + Eye Protection: aerosol-generating procedures
   • N95 Respirator: airborne precautions (TB, COVID-19)

CONTACT PRECAUTIONS (MRSA, VRE, C. diff)
   • Single room or cohort nursing
   • Gloves and apron on entry
   • Dedicated patient equipment

AIRBORNE PRECAUTIONS
   • Negative pressure room
   • N95 respirator for all staff entering room
   • Door kept closed`,
  },
  {
    id: 'GL-006',
    title: 'Falls Prevention and Patient Safety Programme',
    category: 'Patient Safety',
    department: 'All Departments',
    version: '3.0',
    effectiveDate: '2026-02-01',
    lastUpdated: '2026-01-15',
    uploadedBy: 'Patient Safety Officer',
    description: 'Comprehensive falls prevention programme including risk stratification, prevention strategies, and post-fall management.',
    downloadAvailable: false,
    accessLevel: 'All Staff',
    tags: ['falls', 'patient safety', 'risk assessment', 'Morse scale'],
    content: `FALLS PREVENTION PROGRAMME — Version 3.0

RISK ASSESSMENT (Morse Fall Scale)
   Score 0-24: Low Risk — routine care
   Score 25-44: Moderate Risk — standard fall precautions
   Score ≥45: High Risk — intensive fall precautions

ASSESSMENT FREQUENCY
   • On admission and every shift change
   • After any change in clinical condition
   • After any fall event

PREVENTION STRATEGIES (High Risk)
   • Yellow wristband and bed sign
   • Bed in lowest position with brakes on
   • Call bell within reach at all times
   • Non-slip footwear
   • Toileting schedule every 2 hours
   • Remove clutter from patient area
   • Adequate lighting at all times

MEDICATIONS REVIEW
   • Review sedatives, hypnotics, antihypertensives, diuretics
   • Polypharmacy (>4 medications) — pharmacist referral

POST-FALL MANAGEMENT
   • Immediate safety assessment (head, spine, limbs)
   • Neurological observations every 30 min ×2 hours
   • Physician notification immediately
   • Incident report within 1 hour
   • Root cause analysis for all injurious falls`,
  },
  {
    id: 'GL-007',
    title: 'Discharge Planning and Patient Education Protocol',
    category: 'Hospital Procedures',
    department: 'All Departments',
    version: '2.3',
    effectiveDate: '2025-11-01',
    lastUpdated: '2025-10-20',
    uploadedBy: 'Quality & Patient Experience Team',
    description: 'Standardised discharge planning process to ensure safe patient discharge, continuity of care, and patient/carer education.',
    downloadAvailable: false,
    accessLevel: 'All Staff',
    tags: ['discharge', 'patient education', 'continuity of care', 'follow-up'],
    content: `DISCHARGE PLANNING PROTOCOL — Version 2.3

DISCHARGE PLANNING INITIATION
   • Begin discharge planning within 24 hours of admission
   • Identify anticipated discharge date and needs
   • Involve patient and family/carer from admission

DISCHARGE CRITERIA
   • Clinically stable, afebrile ×24 hours
   • Oral medication tolerated
   • Safe home environment confirmed
   • Follow-up appointment arranged
   • Patient/carer understands discharge instructions

DISCHARGE DOCUMENTATION (MANDATORY)
   • Discharge Summary completed by treating doctor
   • Medication reconciliation list (clear generic names, doses, duration)
   • Outpatient follow-up appointment confirmed
   • GP letter sent (or emailed) on day of discharge
   • Red flag symptoms documented and communicated

PATIENT EDUCATION (document completion)
   • Diagnosis explanation in patient's preferred language
   • Medication purpose, dose, and side effects
   • Activity restrictions and wound care
   • When to seek emergency care
   • Smoking/alcohol cessation advice where applicable

POST-DISCHARGE FOLLOW-UP
   • High-risk patients: phone call within 48 hours
   • Readmission risk screen (LACE score ≥10 = high risk)`,
  },
  {
    id: 'GL-008',
    title: 'Diabetes Management in Inpatients',
    category: 'Medication Guidelines',
    department: 'General Medicine',
    version: '2.0',
    effectiveDate: '2025-05-01',
    lastUpdated: '2025-04-15',
    uploadedBy: 'Endocrinology Department',
    description: 'Protocol for blood glucose monitoring and insulin management for inpatients with Type 1 and Type 2 Diabetes.',
    downloadAvailable: false,
    accessLevel: 'Medical Staff',
    tags: ['diabetes', 'insulin', 'blood glucose', 'inpatient', 'endocrinology'],
    content: `INPATIENT DIABETES MANAGEMENT — Version 2.0

TARGET BLOOD GLUCOSE
   General ward: 6-10 mmol/L (108-180 mg/dL)
   ICU: 6-8 mmol/L (108-144 mg/dL)
   Avoid: < 4 mmol/L (hypoglycaemia)

MONITORING FREQUENCY
   Non-critically ill: Before meals + at bedtime (4× daily)
   Critically ill (ICU): 1-2 hourly on insulin infusion
   NPO (nil by mouth): Every 4-6 hours

INSULIN REGIMENS
   Type 1 DM: Continue home basal dose. Use basal-bolus approach.
   Type 2 DM (insulin-naive): Start basal insulin 0.1-0.2 U/kg/day
   Correction scale: Add correction dose for hyperglycaemia

HYPOGLYCAEMIA MANAGEMENT (< 4 mmol/L)
   Conscious patient: 15-20g fast-acting carbohydrate orally
   Unconscious/unable to swallow: IV 20% Dextrose 100-200 mL
   Recheck glucose in 15 minutes

PERIOPERATIVE MANAGEMENT
   Omit oral hypoglycaemics on day of surgery
   Continue basal insulin (50% dose for Type 1 DM)
   Target 6-10 mmol/L intraoperatively`,
  },
  {
    id: 'GL-009',
    title: 'Paediatric Emergency Assessment (PEWS)',
    category: 'Emergency Care',
    department: 'Pediatrics',
    version: '1.5',
    effectiveDate: '2025-08-01',
    lastUpdated: '2025-07-10',
    uploadedBy: 'Dr. A. Menon (Head of Paediatrics)',
    description: 'Paediatric Early Warning Score (PEWS) for early identification and escalation of deteriorating paediatric patients.',
    downloadAvailable: false,
    accessLevel: 'Medical Staff',
    tags: ['paediatrics', 'PEWS', 'early warning', 'deterioration', 'emergency'],
    content: `PAEDIATRIC EARLY WARNING SCORE (PEWS) — Version 1.5

PEWS SCORING (assess every 4 hours)
   Parameters: Behaviour, Cardiovascular, Respiratory
   Each scored 0-3. Total score triggers escalation.

ESCALATION THRESHOLDS
   Score 0-1: Routine monitoring
   Score 2-3: Increase monitoring to 2-hourly. Notify Registrar if persistent.
   Score ≥4: Immediate medical review. Consider PICU referral.
   Score ≥7 or rapidly deteriorating: PICU transfer / code blue activation

PAEDIATRIC NORMAL RANGES BY AGE
   Heart Rate: Neonate 120-160, Infant 100-150, Child 70-120 bpm
   Respiratory Rate: Neonate 30-60, Infant 25-40, Child 20-30 bpm
   SBP: Infant ≥70, Child ≥80 mmHg (lower limit)

RED FLAGS (immediate escalation regardless of score)
   • Stridor or grunting
   • Cyanosis or SpO2 <90%
   • HR >200 or <50 bpm (infant)
   • Unresponsive or seizure activity
   • Signs of shock (prolonged capillary refill >2 seconds)`,
  },
  {
    id: 'GL-010',
    title: 'Emergency Anaphylaxis & Acute Drug Reaction Protocol',
    category: 'Emergency Care',
    department: 'All Departments',
    version: '3.2',
    effectiveDate: '2026-03-01',
    lastUpdated: '2026-02-15',
    uploadedBy: 'Resuscitation & Critical Care Committee',
    description: 'Immediate management protocol for severe allergic reactions, drug-induced anaphylaxis, and unexpected adverse medication events.',
    downloadAvailable: false,
    accessLevel: 'All Staff',
    tags: ['anaphylaxis', 'allergy', 'epinephrine', 'emergency', 'adrenaline', 'shock'],
    content: `EMERGENCY ANAPHYLAXIS PROTOCOL — Version 3.2

1. IMMEDIATE LIFE-SAVING ACTIONS (ABCDE Approach)
   • STOP the suspected medication / infusion immediately.
   • Call for HELP / Activate Medical Emergency Rapid Response Team (Code Blue / RRT).
   • FIRST-LINE DRUG: Intramuscular (IM) EPINEPHRINE / ADRENALINE (1:1000, 1 mg/mL)
     → Adult Dose: 0.5 mg (0.5 mL) IM into anterolateral aspect of middle third of thigh.
     → Repeat every 5 minutes if no improvement (max 3 doses before IV infusion).
     → DO NOT delay Epinephrine for antihistamines or steroids.

2. AIRWAY & OXYGENATION
   • High-flow Oxygen (10-15 L/min) via non-rebreather mask.
   • Position patient FLAT with legs elevated (unless airway compromised / breathing difficult).
   • Prepare for early endotracheal intubation if severe laryngeal oedema or stridor is present.

3. CIRCULATORY RESUSCITATION
   • Secure wide-bore IV access (16G or 14G cannula × 2).
   • Rapid IV Crystalloid Fluid bolus: 500-1000 mL 0.9% Saline (Adult), 20 mL/kg (Child).
   • Monitor continuous ECG, SpO2, NIBP every 2-5 minutes.

4. SECOND-LINE PHARMACOTHERAPY (after Epinephrine & Fluids)
   • IV Hydrocortisone 200 mg (or Dexamethasone 8 mg) to prevent biphasic reactions.
   • IV Chlorpheniramine 10 mg (H1 antihistamine) slow IV over 1 minute.
   • Inhaled Salbutamol 5 mg nebulised for persistent bronchospasm.

5. MANDATORY POST-EVENT EHR DOCUMENTATION
   • Document exact time, suspected offending drug, batch number, and clinical manifestations.
   • Perform serum Mast Cell Tryptase at 1-2 hours and 24 hours post-reaction.
   • IMMEDIATELY UPDATE PATIENT EHR: Flag as 'Critical Allergy' with verification badge.
   • Notify Hospital Pharmacovigilance & Adverse Drug Reaction (ADR) Monitoring Center.`,
  },
  {
    id: 'GL-011',
    title: 'Clinical Allergy Reconciliation & Pre-Administration Screening Guideline',
    category: 'Patient Safety',
    department: 'All Departments',
    version: '2.0',
    effectiveDate: '2026-01-10',
    lastUpdated: '2026-01-05',
    uploadedBy: 'Medication Safety & Pharmacy Board',
    description: 'Standard operating procedure for differentiating true IgE allergies from intolerances, pre-test dosing protocols, and triage verification.',
    downloadAvailable: false,
    accessLevel: 'Medical Staff',
    tags: ['allergy reconciliation', 'CPOE safety', 'test dose', 'triage verification', 'intolerance'],
    content: `CLINICAL ALLERGY RECONCILIATION GUIDELINE — Version 2.0

1. ALLERGY CLASSIFICATION & DIFFERENTIATION
   • True IgE-Mediated Allergy: Urticaria, angioedema, bronchospasm, hypotension, anaphylaxis.
     → ACTION: Absolute contraindication to drug class. Tag 'Verified by Clinician'.
   • Drug Intolerance / Adverse Effect: Nausea, epigastric pain, headache, mild diarrhoea.
     → ACTION: Dose adjustment or co-administration with protective agent (e.g., PPI).
   • Patient Self-Reported (Unverified): Entry provided during online/front-desk registration.
     → ACTION: Mandatory clinical interview by Nurse/Doctor before first medication order.

2. HIGH-RISK MEDICATION PRE-ADMINISTRATION PROTOCOL
   • Intravenous Beta-Lactam Antibiotics (Penicillins / Cephalosporins):
     → Verify allergy history directly with patient/carer before first dose.
     → If history equivocal: Perform intradermal skin test or graded test dose under supervision.
   • Radiopaque Contrast Media (CT / Angiography):
     → Screen for prior contrast allergy and renal function (eGFR).
     → Pre-medicate with oral Prednisolone + H1 antihistamine for moderate risk patients.
   • Biologicals & Chemotherapy (Monoclonal antibodies, Taxanes):
     → Standard pre-infusion dexamethasone, paracetamol, and antihistamine regimen.

3. NURSE TRIAGE & DOCTOR CPOE ORDERING RESPONSIBILITIES
   • Nurses must cross-verify known allergies upon hospital admission and at every shift handover.
   • Doctors must review computerized allergy conflict alerts in the CPOE prescription modal.
   • Any newly observed drug hypersensitivity must be escalated immediately to the attending consultant.`,
  },
];
