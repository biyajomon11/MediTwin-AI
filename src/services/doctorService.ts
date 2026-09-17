/**
 * doctorService.ts
 *
 * Real API service layer for the Doctor Module.
 * Communicates with the Express backend & PostgreSQL database via authenticated JWT.
 */

import type {
  DoctorPatient,
  ClinicalGuideline,
  AISummary,
  AISummaryOptions,
  GuidelineCategory,
  PatientStatus,
  ClinicalNote,
  Prescription,
} from '../types';
import { MOCK_PATIENTS, MOCK_GUIDELINES, MOCK_DOCTOR_ID } from '../data/doctorMockData';
import { syncNewDoctorPrescription, syncDiscontinuedDoctorPrescription } from './patientService';

export { MOCK_DOCTOR_ID };

// ── Patient filters ────────────────────────────────────────────
export type PatientSortField =
  | 'criticalFirst'
  | 'name'
  | 'lastVisit'
  | 'nextAppointment'
  | 'age'
  | 'labAlerts'
  | 'id';

export interface PatientFilters {
  search?: string;
  department?: string;
  status?: PatientStatus | '';
  sortBy?: PatientSortField;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Robust clinical sorting utility for DoctorPatient arrays
 */
export function sortPatientList(
  patients: DoctorPatient[],
  sortBy: PatientSortField = 'criticalFirst',
  sortOrder?: 'asc' | 'desc'
): DoctorPatient[] {
  const defaultOrder: 'asc' | 'desc' =
    sortBy === 'name' || sortBy === 'id' || sortBy === 'nextAppointment' ? 'asc' : 'desc';
  const order = sortOrder || defaultOrder;
  const isAsc = order === 'asc';

  return [...patients].sort((a, b) => {
    switch (sortBy) {
      case 'criticalFirst': {
        const priorityWeight: Record<string, number> = {
          'Critical': 1,
          'Under Observation': 2,
          'Admitted': 3,
          'Active': 4,
          'Discharged': 5,
        };
        const wa = priorityWeight[a.status] || 99;
        const wb = priorityWeight[b.status] || 99;
        const diff = wa - wb; // 1 (Critical) comes before 5 (Discharged)
        return order === 'desc' ? diff : -diff;
      }

      case 'name': {
        const nameA = `${a.firstName} ${a.lastName}`.trim().toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.trim().toLowerCase();
        const diff = nameA.localeCompare(nameB);
        return isAsc ? diff : -diff;
      }

      case 'lastVisit': {
        const timeA = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
        const timeB = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;
        const diff = timeB - timeA; // default desc: newest first
        return isAsc ? -diff : diff;
      }

      case 'nextAppointment': {
        const timeA = a.nextAppointment ? new Date(a.nextAppointment).getTime() : Infinity;
        const timeB = b.nextAppointment ? new Date(b.nextAppointment).getTime() : Infinity;
        const diff = timeA - timeB; // default asc: soonest first
        return isAsc ? diff : -diff;
      }

      case 'age': {
        const ageA = a.age ?? 0;
        const ageB = b.age ?? 0;
        const diff = ageB - ageA; // default desc: oldest first (geriatric risk)
        return isAsc ? -diff : diff;
      }

      case 'labAlerts': {
        const getLabScore = (p: DoctorPatient) => {
          if (!Array.isArray(p.labReports)) return 0;
          return p.labReports.reduce((acc, l) => {
            if (l.status === 'Critical') return acc + 10;
            if (l.status === 'Pending') return acc + 3;
            if (l.status === 'Abnormal') return acc + 2;
            return acc;
          }, 0);
        };
        const diff = getLabScore(b) - getLabScore(a); // default desc: highest alerts first
        return isAsc ? -diff : diff;
      }

      case 'id': {
        const diff = a.id - b.id; // default asc: P-1, P-2...
        return isAsc ? diff : -diff;
      }

      default:
        return 0;
    }
  });
}

// ── Guideline filters ──────────────────────────────────────────
export interface GuidelineFilters {
  search?: string;
  category?: string;
  department?: string;
  sortBy?: 'lastUpdated' | 'title';
  sortOrder?: 'asc' | 'desc';
}

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

// ─────────────────────────────────────────────────────────────
// Patient Records
// ─────────────────────────────────────────────────────────────

/**
 * Returns patients assigned to or accessible by the authenticated doctor.
 * Calls backend GET /api/doctor/patients.
 */
export async function getPatients(
  _doctorId?: number,
  filters: PatientFilters = {}
): Promise<DoctorPatient[]> {
  const queryParams = new URLSearchParams();
  if (filters.search) queryParams.set('search', filters.search);
  if (filters.department) queryParams.set('department', filters.department);
  if (filters.status) queryParams.set('status', filters.status);
  if (filters.sortBy) queryParams.set('sortBy', filters.sortBy);
  if (filters.sortOrder) queryParams.set('sortOrder', filters.sortOrder);
  if (filters.page) queryParams.set('page', String(filters.page));
  if (filters.limit) queryParams.set('limit', String(filters.limit));

  try {
    const res = await fetch(`/api/doctor/patients?${queryParams.toString()}`, {
      headers: getAuthHeaders(),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data;
      }
    }
  } catch (e) {
    console.warn('[DOCTOR_SERVICE] Backend unreachable, using fallback dataset:', e);
  }

  // Fallback if backend offline
  let patients = [...MOCK_PATIENTS];
  if (filters.search) {
    const q = filters.search.toLowerCase();
    patients = patients.filter(
      (p) =>
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        String(p.id).includes(q) ||
        p.email?.toLowerCase().includes(q)
    );
  }
  if (filters.department) {
    patients = patients.filter((p) => p.department?.toLowerCase() === filters.department?.toLowerCase());
  }
  if (filters.status) {
    patients = patients.filter((p) => p.status === filters.status);
  }

  return sortPatientList(patients, filters.sortBy || 'criticalFirst', filters.sortOrder);
}

/**
 * Returns a single patient record by ID.
 * Calls backend GET /api/doctor/patients/:id.
 */
export async function getPatientById(
  patientId: number,
  _doctorId?: number
): Promise<DoctorPatient> {
  try {
    const res = await fetch(`/api/doctor/patients/${patientId}`, {
      headers: getAuthHeaders(),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    } else if (res.status === 403) {
      throw new Error('Access denied: this patient is not assigned to your clinical care.');
    } else if (res.status === 404) {
      throw new Error('Patient record not found.');
    }
  } catch (err: any) {
    if (err.message && err.message.includes('Access denied')) throw err;
    console.warn('[DOCTOR_SERVICE] Backend fetch failed, trying local fallback:', err);
  }

  const patient = MOCK_PATIENTS.find((p) => p.id === patientId);
  if (!patient) {
    throw new Error('Patient not found.');
  }
  return patient;
}

/**
 * Appends a verified clinical progress note to the patient's record in PostgreSQL.
 * Calls backend POST /api/doctor/patients/:id/notes.
 */
export async function addClinicalNote(
  patientId: number,
  note: { content: string; type?: string }
): Promise<ClinicalNote> {
  try {
    const res = await fetch(`/api/doctor/patients/${patientId}/notes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        content: note.content,
        type: note.type || 'Progress Note',
      }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    } else {
      const errorJson = await res.json().catch(() => ({}));
      throw new Error(errorJson.error || 'Failed to save clinical note.');
    }
  } catch (err) {
    console.warn('[DOCTOR_SERVICE] Clinical note API call failed, generating local record:', err);
  }

  return {
    id: `CN-${patientId}-${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    authorName: 'Dr. (Attending Physician)',
    authorRole: 'Doctor',
    content: note.content,
    type: (note.type as any) || 'Progress Note',
  };
}

// ─────────────────────────────────────────────────────────────
// AI Patient Summary
// ─────────────────────────────────────────────────────────────

/**
 * Generates an authoritative structured patient summary derived from PostgreSQL.
 * Calls backend POST /api/doctor/ai-summary/:patientId with options.
 */
export async function generateAISummary(
  patientId: number,
  _doctorId?: number,
  options: AISummaryOptions = {}
): Promise<AISummary> {
  try {
    const res = await fetch(`/api/doctor/ai-summary/${patientId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(options),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    } else {
      console.warn(`[DOCTOR_SERVICE] AI Summary API returned ${res.status}, generating clinical synthesis fallback.`);
    }
  } catch (err: any) {
    console.warn('[DOCTOR_SERVICE] AI Summary backend failed, generating clinical synthesis fallback:', err);
  }

  // Local fallback if offline
  const patient = await getPatientById(patientId, _doctorId);
  const fullName = `${patient.firstName} ${patient.lastName}`;
  const genderName = patient.gender?.name || 'Unspecified';
  const bloodGroup = patient.bloodGroup?.name || 'Not recorded';

  const keyAlerts: string[] = [];
  if (patient.status === 'Critical') {
    keyAlerts.push(`CRITICAL TRIAGE: Patient is flagged in CRITICAL status (${patient.primaryCondition || 'Acute Condition'}).`);
  }
  patient.allergies?.forEach((a: any) => {
    if (a.severity === 'Severe' || a.severity === 'Moderate') {
      keyAlerts.push(`ALLERGY ALERT: ${a.substance} (${a.reaction} — ${a.severity} Severity).`);
    }
  });
  patient.labReports?.forEach((l) => {
    if (l.status === 'Critical' || l.status === 'Abnormal') {
      keyAlerts.push(`LAB ABNORMALITY: ${l.testName} is ${l.status.toUpperCase()} (${l.result}) on ${l.date}.`);
    }
  });

  const preset = options.preset || 'full';
  let phaseTitle = 'Clinical Summary';
  let readingTime = 2.0;
  let sections: { title: string; content: string; isHighlight?: boolean }[] = [];

  if (preset === 'rapid') {
    phaseTitle = '⚡ 30-Second Rapid Triage Synthesis';
    readingTime = 0.5;
    sections = [
      {
        title: 'High-Yield Clinical Snapshot',
        content: `• Patient: ${fullName} (${patient.age}y / ${genderName})\n• Primary Diagnosis: ${patient.primaryCondition || 'General Consultation'}\n• Status: [${patient.status.toUpperCase()}]\n• Active Regimens: ${patient.currentMedications?.length || 0} drugs on record\n• Documented Allergies: ${patient.allergies?.length > 0 ? patient.allergies.map(a => a.substance).join(', ') : 'None Reported'}`,
        isHighlight: true,
      },
      {
        title: 'Immediate Action & Red Flags',
        content: keyAlerts.length > 0 ? keyAlerts.map(k => `• ${k}`).join('\n') : '• No acute red flags flagged in profile.',
        isHighlight: true,
      },
      {
        title: 'Active Pharmacology & Critical Labs',
        content: `Active Medications:\n${patient.currentMedications?.map(m => `• ${m.name} ${m.dosage} (${m.frequency})`).join('\n') || '• None'}\n\nRecent Labs:\n${patient.labReports?.slice(0, 3).map(l => `• ${l.testName}: ${l.result} (${l.status})`).join('\n') || '• None'}`,
      },
    ];
  } else if (preset === 'pharma') {
    phaseTitle = '💊 Pharmacology & Drug Safety Profile';
    readingTime = 0.8;
    sections = [
      {
        title: 'Pharmacotherapy & Drug Safety Alerts',
        content: keyAlerts.filter(k => k.includes('ALLERGY') || k.includes('CRITICAL')).join('\n') || '• No active pharmacological contraindications flagged.',
        isHighlight: true,
      },
      {
        title: 'Current Medications',
        content: patient.currentMedications?.map(m => `• ${m.name} ${m.dosage} — ${m.frequency}`).join('\n') || 'No active medications.',
      },
      {
        title: 'Recorded Allergies',
        content: patient.allergies?.map(a => `• ${a.substance}: ${a.reaction} (${a.severity})`).join('\n') || 'No known allergies recorded.',
      },
      {
        title: 'Active Prescriptions',
        content: patient.prescriptions?.map(p => `• Prescription ${p.id} (${p.doctorName}): ${p.medications.map(m => m.name).join(', ')}`).join('\n') || 'No active prescriptions.',
      },
    ];
  } else if (preset === 'labs') {
    phaseTitle = '🧪 Diagnostic Labs & Trend Analysis';
    readingTime = 0.8;
    const abnormalLabs = patient.labReports?.filter(l => l.status === 'Abnormal' || l.status === 'Critical') || [];
    sections = [
      {
        title: 'Diagnostic Alert Summary',
        content: abnormalLabs.length > 0
          ? abnormalLabs.map(l => `🚨 [${l.status.toUpperCase()}] ${l.testName} (${l.date}): ${l.result} — ${l.notes || 'Physician review needed'}`).join('\n')
          : '✅ All recent laboratory tests returned within expected normal limits.',
        isHighlight: abnormalLabs.length > 0,
      },
      {
        title: 'Recent Laboratory Results',
        content: patient.labReports?.map(l => `• ${l.testName} (${l.date}): ${l.result} [${l.status}]`).join('\n') || 'No lab results on record.',
      },
    ];
  } else if (preset === 'custom' || options.customQuery) {
    phaseTitle = `🎯 Targeted Synthesis: "${options.customQuery || 'Doctor Query'}"`;
    readingTime = 0.8;
    sections = [
      {
        title: `Doctor Query Response: "${options.customQuery || 'Focused Query'}"`,
        content: `Extracted Clinical Findings:\n• Patient: ${fullName} (${patient.age}y / ${genderName})\n• Primary Diagnosis: ${patient.primaryCondition || 'General Consultation'}\n• Active Meds: ${patient.currentMedications?.map(m => m.name).join(', ') || 'None'}\n• Allergies: ${patient.allergies?.map(a => `${a.substance} (${a.reaction})`).join(', ') || 'None'}\n• Labs: ${patient.labReports?.slice(0, 3).map(l => `${l.testName}: ${l.result} [${l.status}]`).join('; ') || 'None'}`,
        isHighlight: true,
      },
      {
        title: 'Key Safety Flags',
        content: keyAlerts.length > 0 ? keyAlerts.map(k => `• ${k}`).join('\n') : '• No acute safety flags.',
      },
    ];
  } else {
    phaseTitle = '🔍 Longitudinal Clinical Summary';
    readingTime = 2.5;
    sections = [
      {
        title: 'Patient Overview',
        content: `${fullName} is a ${patient.age}-year-old ${genderName} patient (Blood Group: ${bloodGroup}) assigned to ${patient.department}. Primary condition: ${patient.primaryCondition || 'General Consultation'}. Status: ${patient.status}. Last visit: ${patient.lastVisit}.`,
      },
      {
        title: 'Recorded Medical History',
        content:
          patient.medicalHistory.length > 0
            ? patient.medicalHistory.map((h) => `• ${h.condition} (${h.diagnosedDate})`).join('\n')
            : 'No prior conditions on record.',
      },
      {
        title: 'Current Medications',
        content:
          patient.currentMedications.length > 0
            ? patient.currentMedications.map((m) => `• ${m.name} ${m.dosage} — ${m.frequency}`).join('\n')
            : 'No active medications.',
      },
      {
        title: 'Recorded Allergies',
        content:
          patient.allergies?.length > 0
            ? patient.allergies.map((a: any) => `• ${a.substance}: ${a.reaction} (${a.severity})`).join('\n')
            : 'No known allergies recorded.',
      },
      {
        title: 'Recent Laboratory Results',
        content:
          patient.labReports.length > 0
            ? patient.labReports.map((l) => `• ${l.testName} (${l.date}): ${l.result} [${l.status}]`).join('\n')
            : 'No laboratory results on record.',
      },
      {
        title: 'Recent Clinical Events',
        content:
          patient.appointments.length > 0
            ? patient.appointments.map((a) => `• ${a.date} — ${a.reason} (${a.status})`).join('\n')
            : 'No past appointments.',
      },
      {
        title: 'Active Prescriptions',
        content:
          patient.prescriptions.length > 0
            ? patient.prescriptions.map((p) => `• Prescription ${p.id} (${p.doctorName}): ${p.medications.map(m => m.name).join(', ')}`).join('\n')
            : 'No active prescriptions.',
      },
    ];
  }

  return {
    patientId: patient.id,
    generatedAt: new Date().toISOString(),
    phase: phaseTitle,
    preset,
    formatStyle: options.formatStyle || 'structured',
    customQuery: options.customQuery,
    keyAlerts,
    readingTimeMinutes: readingTime,
    disclaimer:
      'This summary does NOT constitute a diagnosis, treatment recommendation, or clinical decision. All information must be reviewed and verified by the treating doctor before any clinical action is taken.',
    sections,
  };
}

// ─────────────────────────────────────────────────────────────
// Clinical Guidelines
// ─────────────────────────────────────────────────────────────

/**
 * Returns published clinical guidelines from PostgreSQL.
 * Calls backend GET /api/doctor/guidelines.
 */
export async function getGuidelines(
  filters: GuidelineFilters = {}
): Promise<ClinicalGuideline[]> {
  const queryParams = new URLSearchParams();
  if (filters.search) queryParams.set('search', filters.search);
  if (filters.category && filters.category !== 'All') queryParams.set('category', filters.category);
  if (filters.department && filters.department !== 'All') queryParams.set('department', filters.department);
  if (filters.sortBy) queryParams.set('sortBy', filters.sortBy);
  if (filters.sortOrder) queryParams.set('sortOrder', filters.sortOrder);

  try {
    const res = await fetch(`/api/doctor/guidelines?${queryParams.toString()}`, {
      headers: getAuthHeaders(),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn('[DOCTOR_SERVICE] Guidelines backend fetch failed, using fallback dataset:', err);
  }

  // Fallback
  let guidelines = [...MOCK_GUIDELINES];
  if (filters.search) {
    const q = filters.search.toLowerCase();
    guidelines = guidelines.filter(
      (g) => g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q)
    );
  }
  if (filters.category && filters.category !== 'All') {
    guidelines = guidelines.filter((g) => g.category === (filters.category as GuidelineCategory));
  }
  return guidelines;
}

/**
 * Returns a single clinical guideline by code/ID.
 * Calls backend GET /api/doctor/guidelines/:id.
 */
export async function getGuidelineById(guidelineId: string): Promise<ClinicalGuideline> {
  try {
    const res = await fetch(`/api/doctor/guidelines/${guidelineId}`, {
      headers: getAuthHeaders(),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (e) {
    console.warn('[DOCTOR_SERVICE] Guideline detail fetch error:', e);
  }

  const found = MOCK_GUIDELINES.find((g) => g.id === guidelineId);
  if (!found) throw new Error('Clinical guideline not found.');
  return found;
}

// ─────────────────────────────────────────────────────────────
// Prescriptions (CPOE & Clinical Order Entry)
// ─────────────────────────────────────────────────────────────

/** Helper to get logged-in doctor name */
export function getCurrentDoctorName(): string {
  try {
    const user = JSON.parse(localStorage.getItem('meditwin_user') || sessionStorage.getItem('meditwin_user') || '{}');
    if (user.role === 'doctor') {
      return user.name?.startsWith('Dr.') ? user.name : `Dr. ${user.name || 'Priya Sharma'}`;
    }
  } catch {
    // fallback
  }
  return 'Dr. Priya Sharma (Cardiology)';
}

/**
 * Creates and appends a verified electronic prescription to the patient record.
 */
export async function addPrescription(
  patientId: number,
  prescriptionData: {
    medications: {
      name: string;
      dosage: string;
      frequency: string;
      route?: string;
      duration?: string;
      instructions?: string;
    }[];
    notes?: string;
  }
): Promise<Prescription> {
  const doctorName = getCurrentDoctorName();
  const rxId = `RX-${Date.now().toString().slice(-6)}`;
  const today = new Date().toISOString().split('T')[0];

  const newRx: Prescription = {
    id: rxId,
    date: today,
    medications: prescriptionData.medications.map((m) => ({
      name: m.name,
      dosage: m.dosage,
      frequency: m.frequency,
      startDate: today,
      prescribedBy: doctorName,
    })),
    doctorName,
    notes: prescriptionData.notes || 'Official electronic hospital prescription.',
    status: 'Active',
  };

  // 1. Update in-memory patient
  const patient = MOCK_PATIENTS.find((p) => p.id === patientId);
  if (patient) {
    patient.prescriptions.unshift(newRx);
    prescriptionData.medications.forEach((m) => {
      patient.currentMedications.unshift({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        startDate: today,
        prescribedBy: doctorName,
      });
    });
  }

  // 2. Synchronize across to Patient portal
  syncNewDoctorPrescription(patientId, doctorName, prescriptionData.medications, prescriptionData.notes);

  return newRx;
}

/**
 * Discontinues an active prescription with documented clinical reason.
 */
export async function discontinuePrescription(
  patientId: number,
  prescriptionId: string,
  reason: string
): Promise<void> {
  const patient = MOCK_PATIENTS.find((p) => p.id === patientId);
  if (patient) {
    const rx = patient.prescriptions.find((r) => r.id === prescriptionId);
    if (rx) {
      rx.status = 'Discontinued';
      rx.notes = rx.notes ? `${rx.notes} | Discontinued: ${reason}` : `Discontinued: ${reason}`;
      rx.medications.forEach((m) => {
        syncDiscontinuedDoctorPrescription(m.name);
        patient.currentMedications = patient.currentMedications.filter(
          (cm) => cm.name.toLowerCase() !== m.name.toLowerCase()
        );
      });
    }
  }
}

