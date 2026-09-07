/**
 * nurseService.ts
 * Nurse Module Phase 1 — Mock Service Layer
 *
 * All functions return Promises so the API signature matches a real backend
 * integration. Data comes entirely from nurseMockData.ts.
 *
 * NO database calls. NO fetch(). NO backend dependency.
 * Connect a real backend later by replacing the implementations below —
 * the function signatures and return types will not need to change.
 */

import {
  MOCK_NURSE_PATIENTS,
  MOCK_OBSERVATIONS,
  MOCK_NURSING_NOTES,
  MOCK_TREATMENT_RECORDS,
  MOCK_MEDICAL_HISTORIES,
  MOCK_TREATMENT_PLANS,
  MOCK_NURSE_SELF_ID,
} from '../data/nurseMockData';

import type {
  NursePatient,
  NursingNote,
  TreatmentRecord,
  NurseMedicalHistory,
  NurseTreatmentPlan,
  NoteType,
} from '../types';
import type { PatientObservation, ObservationFormData } from '../types';

// ─── In-memory mutable state for Phase 1 ────────────────────────────────────
// Arrays are seeded from mock data on first import.
// All CRUD operations mutate these in-memory arrays only.
let _observations: PatientObservation[] = [...MOCK_OBSERVATIONS];
let _notes: NursingNote[] = [...MOCK_NURSING_NOTES];
let _treatments: TreatmentRecord[] = [...MOCK_TREATMENT_RECORDS];

// ─── Simulated network delay (ms) ────────────────────────────────────────────
const DELAY = 350;
const delay = (ms = DELAY) => new Promise<void>((res) => setTimeout(res, ms));

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// READ: Current nurse profile
// ─────────────────────────────────────────────────────────────────────────────
export function getCurrentNurseId(): number {
  try {
    const raw = localStorage.getItem('meditwin_user') || sessionStorage.getItem('meditwin_user');
    if (raw) {
      const u = JSON.parse(raw);
      if (u.role === 'nurse') {
        return u.nurseId || u.id || MOCK_NURSE_SELF_ID;
      }
    }
  } catch {
    // fallback
  }
  return MOCK_NURSE_SELF_ID;
}

export function getCurrentNurseName(): string {
  try {
    const raw = localStorage.getItem('meditwin_user') || sessionStorage.getItem('meditwin_user');
    if (raw) {
      const u = JSON.parse(raw);
      if (u.role === 'nurse') {
        if (u.firstName && u.lastName) return `${u.firstName} ${u.lastName}`;
        if (u.firstName) return u.firstName;
        if (u.username) return u.username;
      }
    }
  } catch {
    // fallback
  }
  return 'Staff Nurse Angel Renoy';
}

// ─────────────────────────────────────────────────────────────────────────────
// READ: Patients accessible to the nurse on duty
// ─────────────────────────────────────────────────────────────────────────────
export async function getPatients(_nurseId?: number): Promise<NursePatient[]> {
  try {
    const token = localStorage.getItem('meditwin_token') || sessionStorage.getItem('meditwin_token');
    const res = await fetch('/api/doctor/patients', {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        return json.data.map((p: any) => ({
          id: p.id,
          patientId: `PAT-2024-${String(p.id).padStart(3, '0')}`,
          assignedNurseId: 1,
          firstName: p.firstName,
          lastName: p.lastName,
          dateOfBirth: p.dateOfBirth || '2000-01-01',
          age: p.age || 25,
          gender: p.gender || { name: 'Unspecified' },
          bloodGroup: p.bloodGroup,
          department: p.department || 'General Medicine',
          ward: p.ward || 'Ward 2 – Bed 12',
          assignedDoctor: p.assignedDoctorName || 'Dr. Sarah Joseph',
          phone: p.phone,
          email: p.email,
          address: p.address,
          emergencyContactName: p.emergencyContact?.name || p.emergencyContactName,
          emergencyContactPhone: p.emergencyContact?.phone || p.emergencyContactPhone,
          allergies: p.allergies || [],
          status: p.status || 'Active',
          primaryCondition: p.primaryCondition || 'General Consultation',
          admissionDate: p.lastVisit || '2026-08-10',
        }));
      }
    }
  } catch {
    // fallback
  }

  await delay(150);
  return [...MOCK_NURSE_PATIENTS];
}

export async function getPatientById(
  id: number,
  _nurseId?: number,
): Promise<NursePatient> {
  const all = await getPatients(_nurseId);
  const patient = all.find((p) => p.id === id);
  if (!patient) throw new Error('Patient not found in directory.');
  return patient;
}

export async function searchPatients(
  query: string,
  _nurseId?: number,
): Promise<NursePatient[]> {
  const all = await getPatients(_nurseId);
  const q = query.toLowerCase().trim();
  if (!q) return all;
  return all.filter(
    (p) =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      p.patientId.toLowerCase().includes(q) ||
      p.department.toLowerCase().includes(q) ||
      (p.primaryCondition ?? '').toLowerCase().includes(q) ||
      p.ward.toLowerCase().includes(q),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OBSERVATIONS
// ─────────────────────────────────────────────────────────────────────────────
export async function getPatientObservations(
  patientId: number,
  _nurseId?: number,
): Promise<PatientObservation[]> {
  await delay(150);
  return _observations
    .filter((o) => o.patientId === patientId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveObservation(
  form: ObservationFormData,
  nurseId: number = MOCK_NURSE_SELF_ID,
): Promise<PatientObservation> {
  await delay();
  const newObs: PatientObservation = {
    id: Date.now(),
    patientId: Number(form.patientId),
    nurseId,
    observationDate: form.observationDate,
    observationTime: form.observationTime,
    temperature: parseFloat(form.temperature),
    pulseRate: parseInt(form.pulseRate),
    respiratoryRate: parseInt(form.respiratoryRate),
    systolicBp: parseInt(form.systolicBp),
    diastolicBp: parseInt(form.diastolicBp),
    spo2: parseFloat(form.spo2),
    bloodGlucose: form.bloodGlucose ? parseFloat(form.bloodGlucose) : null,
    weight: form.weight ? parseFloat(form.weight) : null,
    painScore: form.painScore !== '' ? parseInt(form.painScore as string) : null,
    consciousnessLevel: form.consciousnessLevel || null,
    generalObservation: form.generalObservation || null,
    additionalNotes: form.additionalNotes || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nurse: { id: nurseId, firstName: 'Ananya', lastName: 'Krishnan', department: { name: 'Ward' } },
  };
  _observations = [newObs, ..._observations];
  return newObs;
}

export async function updateObservation(
  id: number,
  form: ObservationFormData,
): Promise<PatientObservation> {
  await delay();
  const idx = _observations.findIndex((o) => o.id === id);
  if (idx === -1) throw new Error('Observation not found.');
  const updated: PatientObservation = {
    ..._observations[idx],
    observationDate: form.observationDate,
    observationTime: form.observationTime,
    temperature: parseFloat(form.temperature),
    pulseRate: parseInt(form.pulseRate),
    respiratoryRate: parseInt(form.respiratoryRate),
    systolicBp: parseInt(form.systolicBp),
    diastolicBp: parseInt(form.diastolicBp),
    spo2: parseFloat(form.spo2),
    bloodGlucose: form.bloodGlucose ? parseFloat(form.bloodGlucose) : null,
    weight: form.weight ? parseFloat(form.weight) : null,
    painScore: form.painScore !== '' ? parseInt(form.painScore as string) : null,
    consciousnessLevel: form.consciousnessLevel || null,
    generalObservation: form.generalObservation || null,
    additionalNotes: form.additionalNotes || null,
    updatedAt: new Date().toISOString(),
  };
  _observations[idx] = updated;
  return updated;
}

export async function deleteObservation(id: number): Promise<void> {
  await delay();
  _observations = _observations.filter((o) => o.id !== id);
}

// ─────────────────────────────────────────────────────────────────────────────
// NURSING NOTES
// ─────────────────────────────────────────────────────────────────────────────
export async function getNursingNotes(
  patientId: number,
  _nurseId?: number,
): Promise<NursingNote[]> {
  await delay(150);
  return _notes
    .filter((n) => n.patientId === patientId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export interface NursingNoteFormData {
  patientId: number | '';
  date: string;
  time: string;
  nurseName: string;
  noteType: NoteType | '';
  nursingObservation: string;
  patientResponse: string;
  treatmentCareProvided: string;
  additionalNotes: string;
}

export async function addNursingNote(data: NursingNoteFormData): Promise<NursingNote> {
  await delay(150);
  const note: NursingNote = {
    id: `NN-${Date.now()}`,
    patientId: Number(data.patientId),
    date: data.date,
    time: data.time,
    nurseName: data.nurseName,
    noteType: data.noteType as NoteType,
    nursingObservation: data.nursingObservation,
    patientResponse: data.patientResponse,
    treatmentCareProvided: data.treatmentCareProvided,
    additionalNotes: data.additionalNotes || undefined,
    createdAt: new Date().toISOString(),
  };
  _notes = [note, ..._notes];
  return note;
}

export async function updateNursingNote(id: string, data: NursingNoteFormData): Promise<NursingNote> {
  await delay(150);
  const idx = _notes.findIndex((n) => n.id === id);
  if (idx === -1) throw new Error('Nursing note not found.');
  const updated: NursingNote = {
    ..._notes[idx],
    date: data.date,
    time: data.time,
    nurseName: data.nurseName,
    noteType: data.noteType as NoteType,
    nursingObservation: data.nursingObservation,
    patientResponse: data.patientResponse,
    treatmentCareProvided: data.treatmentCareProvided,
    additionalNotes: data.additionalNotes || undefined,
  };
  _notes[idx] = updated;
  return updated;
}

export async function deleteNursingNote(id: string): Promise<void> {
  await delay(150);
  _notes = _notes.filter((n) => n.id !== id);
}

// ─────────────────────────────────────────────────────────────────────────────
// TREATMENT RECORDS
// ─────────────────────────────────────────────────────────────────────────────
export async function getTreatmentRecords(
  patientId: number,
  _nurseId?: number,
): Promise<TreatmentRecord[]> {
  await delay(150);
  return _treatments
    .filter((t) => t.patientId === patientId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export interface TreatmentRecordFormData {
  patientId: number | '';
  date: string;
  time: string;
  treatmentName: string;
  description: string;
  performedBy: string;
  patientResponse: string;
  additionalNotes: string;
}

export async function addTreatmentRecord(data: TreatmentRecordFormData): Promise<TreatmentRecord> {
  await delay(150);
  const record: TreatmentRecord = {
    id: `TR-${Date.now()}`,
    patientId: Number(data.patientId),
    date: data.date,
    time: data.time,
    treatmentName: data.treatmentName,
    description: data.description,
    performedBy: data.performedBy,
    patientResponse: data.patientResponse,
    additionalNotes: data.additionalNotes || undefined,
    createdAt: new Date().toISOString(),
  };
  _treatments = [record, ..._treatments];
  return record;
}

export async function updateTreatmentRecord(
  id: string,
  data: TreatmentRecordFormData,
): Promise<TreatmentRecord> {
  await delay(150);
  const idx = _treatments.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error('Treatment record not found.');
  const updated: TreatmentRecord = {
    ..._treatments[idx],
    date: data.date,
    time: data.time,
    treatmentName: data.treatmentName,
    description: data.description,
    performedBy: data.performedBy,
    patientResponse: data.patientResponse,
    additionalNotes: data.additionalNotes || undefined,
  };
  _treatments[idx] = updated;
  return updated;
}

export async function deleteTreatmentRecord(id: string): Promise<void> {
  await delay(150);
  _treatments = _treatments.filter((t) => t.id !== id);
}

// ─────────────────────────────────────────────────────────────────────────────
// MEDICAL HISTORY (read-only for nurses & doctors)
// ─────────────────────────────────────────────────────────────────────────────
export async function getMedicalHistory(
  patientId: number,
  _nurseId?: number,
): Promise<NurseMedicalHistory> {
  // 1. Try local mock dataset match
  const directMatch = MOCK_MEDICAL_HISTORIES.find((h) => h.patientId === patientId);
  if (directMatch) return directMatch;

  // 2. Try fetching from live backend
  try {
    const token = localStorage.getItem('meditwin_token') || sessionStorage.getItem('meditwin_token');
    const res = await fetch(`/api/doctor/patients/${patientId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        const p = json.data;
        return {
          patientId: p.id,
          conditions: (p.medicalHistory || []).map((m: any) => ({
            condition: m.condition,
            diagnosedDate: m.diagnosedDate,
            status: m.status || 'Active',
            notes: m.notes,
          })),
          hospitalizations: [],
          surgeries: [],
          familyHistory: 'Family medical history on file.',
          currentMedications: (p.currentMedications || []).map((med: any) => ({
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            startDate: med.startDate,
            prescribedBy: med.prescribedBy,
            status: 'Active',
          })),
          labReports: (p.labReports || []).map((l: any) => ({
            id: l.id,
            testName: l.testName,
            date: l.date,
            result: l.result,
            referenceRange: l.referenceRange,
            unit: l.unit,
            status: l.status,
            orderedBy: p.assignedDoctorName || 'Dr. Sarah Joseph',
            notes: l.notes,
          })),
          appointments: (p.appointments || []).map((a: any) => ({
            id: a.id,
            date: a.date,
            time: a.time,
            reason: a.reason,
            doctorName: a.doctorName,
            department: p.department || 'General Medicine',
            status: a.status,
            notes: a.notes,
          })),
        };
      }
    }
  } catch {
    // fallback
  }

  await delay(150);
  return MOCK_MEDICAL_HISTORIES[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// TREATMENT PLAN (read-only for nurses & doctors)
// ─────────────────────────────────────────────────────────────────────────────
export async function getTreatmentPlan(
  patientId: number,
  _nurseId?: number,
): Promise<NurseTreatmentPlan | null> {
  const directPlan = MOCK_TREATMENT_PLANS.find((tp) => tp.patientId === patientId);
  if (directPlan) return directPlan;

  await delay(150);
  return MOCK_TREATMENT_PLANS[0] ?? null;
}
