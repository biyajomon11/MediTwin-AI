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
// OBSERVATIONS (PostgreSQL Live Connection + Mock Fallback)
// ─────────────────────────────────────────────────────────────────────────────

function isRealJwt(token: string | null): boolean {
  return !!token && token !== 'demo-token' && token !== 'google-token' && token.split('.').length === 3;
}

function formatObservationResponse(o: any): PatientObservation {
  const dateStr = o.observationDate ? new Date(o.observationDate).toISOString().split('T')[0] : '';
  let timeStr = '08:00';
  if (o.observationTime) {
    const t = new Date(o.observationTime);
    if (!isNaN(t.getTime())) {
      timeStr = t.toISOString().substring(11, 16);
    } else {
      timeStr = String(o.observationTime);
    }
  }
  return {
    id: o.id,
    patientId: o.patientId,
    nurseId: o.nurseId,
    observationDate: dateStr,
    observationTime: timeStr,
    temperature: typeof o.temperature === 'string' ? parseFloat(o.temperature) : o.temperature,
    pulseRate: typeof o.pulseRate === 'string' ? parseInt(o.pulseRate) : o.pulseRate,
    respiratoryRate: typeof o.respiratoryRate === 'string' ? parseInt(o.respiratoryRate) : o.respiratoryRate,
    systolicBp: typeof o.systolicBp === 'string' ? parseInt(o.systolicBp) : o.systolicBp,
    diastolicBp: typeof o.diastolicBp === 'string' ? parseInt(o.diastolicBp) : o.diastolicBp,
    spo2: typeof o.spo2 === 'string' ? parseFloat(o.spo2) : o.spo2,
    bloodGlucose: o.bloodGlucose ? parseFloat(o.bloodGlucose) : null,
    weight: o.weight ? parseFloat(o.weight) : null,
    painScore: o.painScore !== null && o.painScore !== undefined && o.painScore !== '' ? parseInt(o.painScore) : null,
    consciousnessLevel: o.consciousnessLevel || null,
    generalObservation: o.generalObservation || null,
    additionalNotes: o.additionalNotes || null,
    createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: o.updatedAt ? new Date(o.updatedAt).toISOString() : new Date().toISOString(),
    patient: o.patient,
    nurse: o.nurse,
  };
}

export async function getPatientObservations(
  patientId: number,
  _nurseId?: number,
): Promise<PatientObservation[]> {
  const token = localStorage.getItem('meditwin_token') || sessionStorage.getItem('meditwin_token');
  if (isRealJwt(token)) {
    try {
      const res = await fetch(`/api/nurse/observations?patientId=${patientId}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data.map(formatObservationResponse);
        }
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status}) while fetching observations`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[NURSE_OBS] Network offline, falling back to local observations:', err.message);
      } else {
        throw err;
      }
    }
  }

  await delay(150);
  return _observations
    .filter((o) => o.patientId === patientId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveObservation(
  form: ObservationFormData,
  nurseId: number = MOCK_NURSE_SELF_ID,
): Promise<PatientObservation> {
  const token = localStorage.getItem('meditwin_token') || sessionStorage.getItem('meditwin_token');
  if (isRealJwt(token)) {
    try {
      const payload = {
        patientId: Number(form.patientId),
        observationDate: form.observationDate,
        observationTime: form.observationTime,
        temperature: parseFloat(form.temperature),
        pulseRate: parseInt(form.pulseRate, 10),
        respiratoryRate: parseInt(form.respiratoryRate, 10),
        systolicBp: parseInt(form.systolicBp, 10),
        diastolicBp: parseInt(form.diastolicBp, 10),
        spo2: parseFloat(form.spo2),
        bloodGlucose: form.bloodGlucose ? parseFloat(form.bloodGlucose) : null,
        weight: form.weight ? parseFloat(form.weight) : null,
        painScore: form.painScore !== '' && form.painScore !== null ? parseInt(form.painScore as string, 10) : null,
        consciousnessLevel: form.consciousnessLevel || null,
        generalObservation: form.generalObservation || null,
        additionalNotes: form.additionalNotes || null,
      };

      const res = await fetch('/api/nurse/observations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const formatted = formatObservationResponse(json.data);
          _observations = [formatted, ..._observations];
          return formatted;
        }
      }
      const errData = await res.json().catch(() => ({}));
      const validationDetails = errData.errors ? Object.entries(errData.errors).map(([k, v]) => `${k}: ${(v as any[]).join(', ')}`).join('; ') : '';
      throw new Error(validationDetails || errData.error || `Server error (${res.status}) saving observation`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[NURSE_OBS] Network offline, saving locally in mock:', err.message);
      } else {
        throw err;
      }
    }
  }

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
  const token = localStorage.getItem('meditwin_token') || sessionStorage.getItem('meditwin_token');
  if (isRealJwt(token)) {
    try {
      const payload = {
        patientId: Number(form.patientId),
        observationDate: form.observationDate,
        observationTime: form.observationTime,
        temperature: parseFloat(form.temperature),
        pulseRate: parseInt(form.pulseRate, 10),
        respiratoryRate: parseInt(form.respiratoryRate, 10),
        systolicBp: parseInt(form.systolicBp, 10),
        diastolicBp: parseInt(form.diastolicBp, 10),
        spo2: parseFloat(form.spo2),
        bloodGlucose: form.bloodGlucose ? parseFloat(form.bloodGlucose) : null,
        weight: form.weight ? parseFloat(form.weight) : null,
        painScore: form.painScore !== '' && form.painScore !== null ? parseInt(form.painScore as string, 10) : null,
        consciousnessLevel: form.consciousnessLevel || null,
        generalObservation: form.generalObservation || null,
        additionalNotes: form.additionalNotes || null,
      };

      const res = await fetch(`/api/nurse/observations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const formatted = formatObservationResponse(json.data);
          const idx = _observations.findIndex((o) => o.id === id);
          if (idx !== -1) _observations[idx] = formatted;
          return formatted;
        }
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status}) updating observation`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[NURSE_OBS] Network offline, updating locally in mock:', err.message);
      } else {
        throw err;
      }
    }
  }

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
  const token = localStorage.getItem('meditwin_token') || sessionStorage.getItem('meditwin_token');
  if (isRealJwt(token)) {
    try {
      const res = await fetch(`/api/nurse/observations/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        _observations = _observations.filter((o) => o.id !== id);
        return;
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status}) deleting observation`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[NURSE_OBS] Network offline, deleting locally in mock:', err.message);
      } else {
        throw err;
      }
    }
  }

  await delay();
  _observations = _observations.filter((o) => o.id !== id);
}

// ─────────────────────────────────────────────────────────────────────────────
// NURSING NOTES (PostgreSQL Live Connection + Mock Fallback)
// ─────────────────────────────────────────────────────────────────────────────
export async function getNursingNotes(
  patientId: number,
  _nurseId?: number,
): Promise<NursingNote[]> {
  const token = localStorage.getItem('meditwin_token') || sessionStorage.getItem('meditwin_token');
  if (isRealJwt(token)) {
    try {
      const res = await fetch(`/api/nurse/notes?patientId=${patientId}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status}) fetching nursing notes`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[NURSE_NOTES] Network offline, using local notes:', err.message);
      } else {
        throw err;
      }
    }
  }

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
  const token = localStorage.getItem('meditwin_token') || sessionStorage.getItem('meditwin_token');
  if (isRealJwt(token)) {
    try {
      const res = await fetch('/api/nurse/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId: Number(data.patientId),
          date: data.date,
          time: data.time,
          nurseName: data.nurseName,
          noteType: data.noteType,
          nursingObservation: data.nursingObservation,
          patientResponse: data.patientResponse,
          treatmentCareProvided: data.treatmentCareProvided,
          additionalNotes: data.additionalNotes,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          _notes = [json.data, ..._notes];
          return json.data;
        }
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status}) creating nursing note`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[NURSE_NOTES] Network offline, creating locally in mock:', err.message);
      } else {
        throw err;
      }
    }
  }

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
  const token = localStorage.getItem('meditwin_token') || sessionStorage.getItem('meditwin_token');
  if (isRealJwt(token)) {
    try {
      const res = await fetch(`/api/nurse/notes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId: Number(data.patientId),
          date: data.date,
          time: data.time,
          nurseName: data.nurseName,
          noteType: data.noteType,
          nursingObservation: data.nursingObservation,
          patientResponse: data.patientResponse,
          treatmentCareProvided: data.treatmentCareProvided,
          additionalNotes: data.additionalNotes,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const idx = _notes.findIndex((n) => n.id === id);
          if (idx !== -1) _notes[idx] = json.data;
          return json.data;
        }
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status}) updating nursing note`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[NURSE_NOTES] Network offline, updating locally in mock:', err.message);
      } else {
        throw err;
      }
    }
  }

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
  const token = localStorage.getItem('meditwin_token') || sessionStorage.getItem('meditwin_token');
  if (isRealJwt(token)) {
    try {
      const res = await fetch(`/api/nurse/notes/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        _notes = _notes.filter((n) => n.id !== id);
        return;
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status}) deleting nursing note`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[NURSE_NOTES] Network offline, deleting locally in mock:', err.message);
      } else {
        throw err;
      }
    }
  }

  await delay(150);
  _notes = _notes.filter((n) => n.id !== id);
}

// ─────────────────────────────────────────────────────────────────────────────
// TREATMENT RECORDS (PostgreSQL Live Connection + Mock Fallback)
// ─────────────────────────────────────────────────────────────────────────────
export async function getTreatmentRecords(
  patientId: number,
  _nurseId?: number,
): Promise<TreatmentRecord[]> {
  const token = localStorage.getItem('meditwin_token') || sessionStorage.getItem('meditwin_token');
  if (isRealJwt(token)) {
    try {
      const res = await fetch(`/api/nurse/treatments?patientId=${patientId}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status}) fetching treatment records`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[TREATMENTS] Network offline, using local treatment records:', err.message);
      } else {
        throw err;
      }
    }
  }

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
  const token = localStorage.getItem('meditwin_token') || sessionStorage.getItem('meditwin_token');
  if (isRealJwt(token)) {
    try {
      const res = await fetch('/api/nurse/treatments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId: Number(data.patientId),
          date: data.date,
          time: data.time,
          treatmentName: data.treatmentName,
          description: data.description,
          performedBy: data.performedBy,
          patientResponse: data.patientResponse,
          additionalNotes: data.additionalNotes,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          _treatments = [json.data, ..._treatments];
          return json.data;
        }
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status}) creating treatment record`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[TREATMENTS] Network offline, creating locally in mock:', err.message);
      } else {
        throw err;
      }
    }
  }

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
  const token = localStorage.getItem('meditwin_token') || sessionStorage.getItem('meditwin_token');
  if (isRealJwt(token)) {
    try {
      const res = await fetch(`/api/nurse/treatments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId: Number(data.patientId),
          date: data.date,
          time: data.time,
          treatmentName: data.treatmentName,
          description: data.description,
          performedBy: data.performedBy,
          patientResponse: data.patientResponse,
          additionalNotes: data.additionalNotes,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const idx = _treatments.findIndex((t) => t.id === id);
          if (idx !== -1) _treatments[idx] = json.data;
          return json.data;
        }
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status}) updating treatment record`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[TREATMENTS] Network offline, updating locally in mock:', err.message);
      } else {
        throw err;
      }
    }
  }

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
  const token = localStorage.getItem('meditwin_token') || sessionStorage.getItem('meditwin_token');
  if (isRealJwt(token)) {
    try {
      const res = await fetch(`/api/nurse/treatments/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        _treatments = _treatments.filter((t) => t.id !== id);
        return;
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status}) deleting treatment record`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[TREATMENTS] Network offline, deleting locally in mock:', err.message);
      } else {
        throw err;
      }
    }
  }

  await delay(150);
  _treatments = _treatments.filter((t) => t.id !== id);
}

// ─────────────────────────────────────────────────────────────────────────────
// MEDICAL HISTORY (PostgreSQL Live Connection + Mock Fallback)
// ─────────────────────────────────────────────────────────────────────────────
export async function getMedicalHistory(
  patientId: number,
  _nurseId?: number,
): Promise<NurseMedicalHistory> {
  const token = localStorage.getItem('meditwin_token') || sessionStorage.getItem('meditwin_token');
  if (isRealJwt(token)) {
    try {
      const res = await fetch(`/api/nurse/patients/${patientId}/medical-history`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data;
        }
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status}) fetching medical history`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[NURSE_HISTORY] Network offline, using local mock medical history:', err.message);
      } else {
        throw err;
      }
    }
  }

  await delay(150);
  const directMatch = MOCK_MEDICAL_HISTORIES.find((h) => h.patientId === patientId);
  return directMatch || MOCK_MEDICAL_HISTORIES[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// TREATMENT PLAN (PostgreSQL Live Connection + Mock Fallback)
// ─────────────────────────────────────────────────────────────────────────────
export async function getTreatmentPlan(
  patientId: number,
  _nurseId?: number,
): Promise<NurseTreatmentPlan | null> {
  const token = localStorage.getItem('meditwin_token') || sessionStorage.getItem('meditwin_token');
  if (isRealJwt(token)) {
    try {
      const res = await fetch(`/api/nurse/patients/${patientId}/treatment-plan`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data;
        }
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status}) fetching treatment plan`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[NURSE_PLAN] Network offline, using local mock treatment plan:', err.message);
      } else {
        throw err;
      }
    }
  }

  await delay(150);
  const directPlan = MOCK_TREATMENT_PLANS.find((tp) => tp.patientId === patientId);
  return directPlan || (MOCK_TREATMENT_PLANS[0] ?? null);
}
