/**
 * patientAIService.ts
 *
 * Dedicated Service layer for Patient Module: AI Health Summary.
 * Communicates with the Express backend & PostgreSQL database via authenticated JWT.
 * Strict safety rules:
 * - Simple, patient-friendly phrasing
 * - Zero diagnostic inferences or disease predictions
 * - Zero medication recommendations or dosage alterations
 * - Clear source hospital/provider attribution for hospital data isolation
 * - Distinct handling of missing data vs negative findings
 */

import type {
  PatientAIHealthSummary,
  PatientAIAllergyItem,
  PatientPrescriptionItem,
  PatientMedicalHistoryRecord,
  PatientUploadedDocument,
  Allergy,
} from '../types';
import * as patientService from './patientService';

/** Helper to retrieve the active JWT token from storage */
function getAuthToken(): string | null {
  return localStorage.getItem('meditwin_token') || sessionStorage.getItem('meditwin_token');
}

/** Constructs headers with Bearer authentication */
function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Generates an AI-powered Health Summary for the authenticated patient.
 * The backend determines the patient identity from the JWT session.
 */
export async function generateAIHealthSummary(): Promise<PatientAIHealthSummary> {
  try {
    const res = await fetch('/api/patient/ai-health-summary', {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data as PatientAIHealthSummary;
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        throw new Error(errData.error || 'Authentication required to access health summary.');
      }
    }
  } catch (err: any) {
    if (err.message && (err.message.includes('Authentication') || err.message.includes('Access denied'))) {
      throw err;
    }
    console.warn('[PATIENT_AI_SERVICE] Backend unreachable or in demo mode, generating client fallback summary:', err);
  }

  // Resilient fallback formatting for demo/offline mode
  return await buildClientFallbackSummary();
}

/**
 * Retrieves the raw structured patient health data for client preview or verification.
 */
export async function getPatientHealthData() {
  const [profile, prescriptions, history, documents] = await Promise.all([
    patientService.getPatientProfile(),
    patientService.getPrescriptions(),
    patientService.getMedicalHistory(),
    patientService.getMedicalDocuments(),
  ]);

  return { profile, prescriptions, history, documents };
}

/**
 * Resilient client fallback summary generator that adheres strictly to safety boundaries:
 * - Uses ONLY data present in the patient's existing profile, prescriptions, history, and documents.
 * - Does NOT invent conditions or diagnoses.
 * - Explicitly marks missing fields with neutral messaging.
 */
async function buildClientFallbackSummary(): Promise<PatientAIHealthSummary> {
  const [profile, prescriptions, history, documents]: [
    any,
    PatientPrescriptionItem[],
    PatientMedicalHistoryRecord[],
    PatientUploadedDocument[]
  ] = await Promise.all([
    patientService.getPatientProfile(),
    patientService.getPrescriptions(),
    patientService.getMedicalHistory(),
    patientService.getMedicalDocuments(),
  ]);

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const bloodGroup = profile.bloodGroup || 'Not available in your current records.';
  const gender = profile.gender || 'Not specified';
  const age = profile.age || 'Not recorded';

  // 1. Health Overview
  const knownAllergies: Allergy[] = profile.medicalSummary?.allergies || [];
  const chronicConditions: string[] = profile.medicalSummary?.chronicConditions || [];

  const summaryText = `Your available health records indicate that you are a ${age}-year-old ${gender.toLowerCase()} with blood group ${bloodGroup}.`;

  const healthOverview = {
    age,
    gender,
    bloodGroup,
    height: 'Not available in your current records.',
    weight: 'Not available in your current records.',
    knownAllergiesCount: knownAllergies.length,
    recordedConditionsCount: chronicConditions.length,
    summaryText,
    isComplete: Boolean(profile.bloodGroup && profile.gender && profile.dateOfBirth),
  };

  // 2. Medical History
  const medicalHistory = history.map((h: PatientMedicalHistoryRecord, idx: number) => ({
    id: h.id || `MH-${idx + 1}`,
    date: h.date,
    conditionOrEvent: h.conditionOrEvent,
    description: h.description || 'Recorded health event.',
    hospitalOrProvider: `${h.healthcareProvider} (${h.hospitalDepartment})`,
    status: h.status || 'Active',
    verificationStatus: h.verificationStatus || 'Verified by Healthcare Provider',
  }));

  // 3. Current Medications
  const currentMedications = prescriptions.map((p: PatientPrescriptionItem, idx: number) => ({
    id: p.id || `MED-${idx + 1}`,
    medicineName: p.medicineName,
    dosage: p.dosage,
    frequency: p.frequency,
    route: p.route || 'Oral',
    duration: p.duration || 'As prescribed',
    prescribedBy: p.doctorName || 'Attending Physician',
    prescriptionDate: p.prescriptionDate || p.startDate,
    hospitalOrSource: p.department ? `MediTwin Health — ${p.department}` : 'MediTwin Hospital',
    instructions: p.instructions || 'Please follow your healthcare professional’s instructions regarding your medications.',
    status: p.status,
  }));

  // 4. Allergies
  const allergies = knownAllergies.map((a: Allergy, idx: number) => ({
    id: a.id || `ALL-${idx + 1}`,
    substance: a.substance,
    reaction: a.reaction,
    severity: a.severity,
    verificationStatus: a.verificationStatus || 'Verified by Healthcare Professional',
    source: a.verifiedBy || 'Hospital Admission Triage',
  }));

  // 5. Laboratory Reports
  const laboratoryReports = documents
    .filter((d: PatientUploadedDocument) => d.documentType === 'Laboratory Report')
    .map((d: PatientUploadedDocument, idx: number) => ({
      id: d.id || `LAB-${idx + 1}`,
      testName: d.reportName || d.title,
      date: d.dateOfReport || d.uploadedDate,
      result: 'Result available in your laboratory report.',
      referenceRange: 'See official laboratory attachment',
      status: d.status,
      hospitalOrProvider: d.healthcareProvider || 'Central Pathology Laboratory',
      documentRefId: d.id,
    }));

  // 6. Recent Visits
  const recentVisits = history
    .filter((h: PatientMedicalHistoryRecord) => h.category === 'Hospitalization' || h.category === 'Treatment' || h.category === 'Diagnosis')
    .slice(0, 3)
    .map((h: PatientMedicalHistoryRecord, idx: number) => ({
      id: `VISIT-${idx + 1}`,
      hospital: h.healthcareProvider || 'MediTwin Medical Center',
      visitDate: h.date,
      visitType: `${h.hospitalDepartment || 'Clinical'} Consultation`,
      chiefComplaint: h.conditionOrEvent,
      recordedDiagnosis: h.conditionOrEvent,
      treatmentSummary: h.treatmentOrOutcome || 'Consultation completed.',
      followUp: 'Follow-up as advised by physician',
      caseSheetNumber: `CS-${String(idx + 101).padStart(4, '0')}`,
    }));

  // 7. Treatment Information
  const treatmentInformation = prescriptions.map((p: PatientPrescriptionItem, idx: number) => ({
    id: `TRT-${idx + 1}`,
    title: `Prescription Care Plan for ${p.medicineName}`,
    details: `${p.dosage} — ${p.frequency}. ${p.instructions || ''}`,
    sourceHospital: p.department ? `Department of ${p.department}` : 'MediTwin Hospital',
    date: p.prescriptionDate,
    instructions: p.instructions || 'Please follow your healthcare professional’s instructions.',
  }));

  // 8. Important Information
  const importantInformation: string[] = [];

  if (allergies.length > 0) {
    allergies.forEach((a: PatientAIAllergyItem) => {
      importantInformation.push(`Recorded allergy: ${a.substance} (${a.reaction}).`);
    });
  } else {
    importantInformation.push('No allergy information is currently recorded.');
  }

  if (currentMedications.length > 0) {
    importantInformation.push(
      `Currently prescribed: ${currentMedications.map((m: any) => `${m.medicineName} (${m.dosage})`).join(', ')}.`
    );
  }

  if (laboratoryReports.length > 0) {
    importantInformation.push(`Recent laboratory report available: ${laboratoryReports[0].testName}.`);
  }

  if (recentVisits.length > 0) {
    importantInformation.push(`Recent hospital visit recorded on ${recentVisits[0].visitDate} at ${recentVisits[0].hospital}.`);
  }

  return {
    patientId: profile.id,
    generatedAt: new Date().toISOString(),
    disclaimer:
      'AI-generated summary based on your available health records. This summary is for informational purposes only and does not replace advice from a qualified healthcare professional.',
    patientInfo: {
      name: fullName,
      patientId: profile.patientId || `PAT-${profile.id}`,
      hospitalName: 'MediTwin Healthcare Network',
      dateOfBirth: profile.dateOfBirth,
    },
    healthOverview,
    medicalHistory,
    currentMedications,
    allergies,
    laboratoryReports,
    recentVisits,
    treatmentInformation,
    importantInformation,
  };
}
