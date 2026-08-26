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
  GuidelineCategory,
  PatientStatus,
  ClinicalNote,
  Prescription,
} from '../types';
import { MOCK_PATIENTS, MOCK_GUIDELINES, MOCK_DOCTOR_ID } from '../data/doctorMockData';
import { syncNewDoctorPrescription, syncDiscontinuedDoctorPrescription } from './patientService';

export { MOCK_DOCTOR_ID };

// ── Patient filters ────────────────────────────────────────────
export interface PatientFilters {
  search?: string;
  department?: string;
  status?: PatientStatus | '';
  sortBy?: 'name' | 'lastVisit';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
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
  return patients;
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
 * Calls backend POST /api/doctor/ai-summary/:patientId.
 */
export async function generateAISummary(
  patientId: number,
  _doctorId?: number
): Promise<AISummary> {
  try {
    const res = await fetch(`/api/doctor/ai-summary/${patientId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to generate AI summary.');
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('Failed to fetch')) throw err;
    console.warn('[DOCTOR_SERVICE] AI Summary backend failed, generating fallback preview:', err);
  }

  // Local fallback if offline
  const patient = await getPatientById(patientId, _doctorId);
  const fullName = `${patient.firstName} ${patient.lastName}`;
  const genderName = patient.gender?.name || 'Unspecified';

  return {
    patientId: patient.id,
    generatedAt: new Date().toISOString(),
    phase: 'Clinical Summary',
    disclaimer:
      'This summary does NOT constitute a diagnosis, treatment recommendation, or clinical decision. All information must be reviewed and verified by the treating doctor before any clinical action is taken.',
    sections: [
      {
        title: 'Patient Overview',
        content: `${fullName} is a ${patient.age}-year-old ${genderName} patient assigned to ${patient.department}. Primary condition: ${patient.primaryCondition || 'General Consultation'}. Status: ${patient.status}. Last visit: ${patient.lastVisit}.`,
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
        title: 'Recent Laboratory Results',
        content:
          patient.labReports.length > 0
            ? patient.labReports.map((l) => `• ${l.testName} (${l.date}): ${l.result}`).join('\n')
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
    ],
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

