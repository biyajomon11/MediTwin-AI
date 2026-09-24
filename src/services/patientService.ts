/**
 * patientService.ts
 * Patient Module Service Layer with strict PostgreSQL database connectivity & graceful fallback
 *
 * Architecture:
 * - No JWT / demo mode -> Use mock data
 * - Valid JWT -> Call PostgreSQL API (/api/patient/*)
 * - 200 OK -> Use database data
 * - Network offline / connection refused -> Warn and fall back gracefully
 * - 401/403/422/500 -> Throw real server error (never swallow real database/API bugs)
 */

import {
  MOCK_PATIENT_PROFILE,
  MOCK_PATIENT_PRESCRIPTIONS,
  MOCK_PATIENT_HISTORY,
  MOCK_PATIENT_DOCUMENTS,
  MOCK_MEDICINE_REMINDERS,
  MOCK_PATIENT_NOTIFICATIONS,
  DEMO_PATIENT_ID,
} from '../data/patientMockData';

import type {
  PatientHealthProfile,
  PatientPrescriptionItem,
  PatientMedicalHistoryRecord,
  PatientUploadedDocument,
  MedicineReminder,
  PatientNotification,
  PrescriptionStatus,
} from '../types';

// ── In-memory mutable state for Demo Mode ────────────────────────────────────
let _profile: PatientHealthProfile = { ...MOCK_PATIENT_PROFILE };
let _prescriptions: PatientPrescriptionItem[] = [...MOCK_PATIENT_PRESCRIPTIONS];
let _history: PatientMedicalHistoryRecord[] = [...MOCK_PATIENT_HISTORY];
let _documents: PatientUploadedDocument[] = [...MOCK_PATIENT_DOCUMENTS];
let _reminders: MedicineReminder[] = [...MOCK_MEDICINE_REMINDERS];
let _notifications: PatientNotification[] = [...MOCK_PATIENT_NOTIFICATIONS];

const DELAY = 300;
const delay = (ms = DELAY) => new Promise<void>((res) => setTimeout(res, ms));

// ─────────────────────────────────────────────────────────────────────────────
// Authentication / Token Helpers
// ─────────────────────────────────────────────────────────────────────────────
export function getAuthToken(): string | null {
  return localStorage.getItem('meditwin_token') || sessionStorage.getItem('meditwin_token');
}

export function isRealJwt(token: string | null): boolean {
  return !!token && token !== 'demo-token' && token !== 'google-token' && token.split('.').length === 3;
}

export function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function getCurrentPatientId(): number {
  try {
    const raw = localStorage.getItem('meditwin_user') || sessionStorage.getItem('meditwin_user');
    if (raw) {
      const stored = JSON.parse(raw);
      if (stored.patientId || stored.id || stored.userId) {
        return Number(stored.patientId || stored.id || stored.userId);
      }
    }
  } catch {
    // fallback to demo ID
  }
  return DEMO_PATIENT_ID;
}

function getLoggedInPatient(): Partial<PatientHealthProfile> | null {
  try {
    const raw = localStorage.getItem('meditwin_user') || sessionStorage.getItem('meditwin_user');
    if (!raw) return null;
    const stored = JSON.parse(raw);

    // Also lookup in registered users for extra profile fields like dob, phone, etc.
    let localUsers: any[] = [];
    try {
      localUsers = JSON.parse(localStorage.getItem('meditwin_registered_users') || '[]');
    } catch {
      localUsers = [];
    }

    const matchingLocal = localUsers.find((u: any) =>
      (stored.email && u.email?.toLowerCase() === stored.email.toLowerCase()) ||
      (stored.username && u.username?.toLowerCase() === stored.username.toLowerCase()) ||
      (stored.userId && u.id === stored.userId) ||
      (stored.id && u.id === stored.id) ||
      (stored.firstName && u.firstName?.toLowerCase() === stored.firstName.toLowerCase())
    );

    const firstName = stored.firstName || matchingLocal?.firstName || (stored.email ? stored.email.split('@')[0] : stored.username || 'Patient');
    const lastName = stored.lastName || matchingLocal?.lastName || '';
    const email = stored.email || matchingLocal?.email || 'patient@meditwin.ai';
    const phone = matchingLocal?.phone || stored.phone || _profile.phone;
    const dob = matchingLocal?.dob || stored.dob || _profile.dateOfBirth;

    // Calculate age if dob is available
    let age = _profile.age;
    if (dob) {
      const birthDate = new Date(dob);
      const today = new Date();
      if (!isNaN(birthDate.getTime())) {
        age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }
    }

    return {
      id: Number(stored.patientId || stored.userId || stored.id || DEMO_PATIENT_ID),
      patientId: stored.patientId ? `PAT-${stored.patientId}` : (matchingLocal?.id ? String(matchingLocal.id) : _profile.patientId),
      firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
      lastName: lastName ? lastName.charAt(0).toUpperCase() + lastName.slice(1) : '',
      email,
      phone,
      dateOfBirth: dob,
      age: age > 0 ? age : _profile.age,
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Health Profile
// ─────────────────────────────────────────────────────────────────────────────
export async function getPatientProfile(_patientId: number = DEMO_PATIENT_ID): Promise<PatientHealthProfile> {
  const token = getAuthToken();
  if (isRealJwt(token)) {
    try {
      const res = await fetch('/api/patient/profile', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          _profile = { ..._profile, ...json.data };
          return _profile;
        }
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status}) while fetching patient profile`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[PATIENT] Network error, falling back to local cached profile:', err.message);
      } else {
        throw err;
      }
    }
  }

  await delay();
  const loggedIn = getLoggedInPatient();
  if (loggedIn) {
    return {
      ..._profile,
      ...loggedIn,
    };
  }
  return { ..._profile };
}

export async function updatePatientContactInfo(
  patientId: number,
  data: {
    phone?: string;
    email?: string;
    address?: string;
    emergencyContact?: { name: string; relationship: string; phone: string };
  }
): Promise<PatientHealthProfile> {
  const token = getAuthToken();
  if (isRealJwt(token)) {
    try {
      const res = await fetch('/api/patient/profile', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) {
        _profile = {
          ..._profile,
          phone: data.phone ?? _profile.phone,
          email: data.email ?? _profile.email,
          address: data.address ?? _profile.address,
          emergencyContact: data.emergencyContact ?? _profile.emergencyContact,
        };
        return getPatientProfile(patientId);
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status}) while updating patient profile`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[PATIENT] Network error updating profile, saving locally:', err.message);
      } else {
        throw err;
      }
    }
  }

  await delay();
  _profile = {
    ..._profile,
    phone: data.phone ?? _profile.phone,
    email: data.email ?? _profile.email,
    address: data.address ?? _profile.address,
    emergencyContact: data.emergencyContact ?? _profile.emergencyContact,
  };
  try {
    const raw = localStorage.getItem('meditwin_user');
    if (raw) {
      const u = JSON.parse(raw);
      if (data.email) u.email = data.email;
      if (data.phone) u.phone = data.phone;
      localStorage.setItem('meditwin_user', JSON.stringify(u));
    }
  } catch {}
  return getPatientProfile(patientId);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Prescriptions (Read-Only)
// ─────────────────────────────────────────────────────────────────────────────
export async function getPrescriptions(
  patientId: number = DEMO_PATIENT_ID,
  statusFilter?: PrescriptionStatus | 'All'
): Promise<PatientPrescriptionItem[]> {
  const token = getAuthToken();
  if (isRealJwt(token)) {
    try {
      const res = await fetch('/api/patient/prescriptions', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          let items: PatientPrescriptionItem[] = json.data;
          if (statusFilter && statusFilter !== 'All') {
            items = items.filter((p) => p.status === statusFilter);
          }
          return items;
        }
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status}) while fetching prescriptions`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[PATIENT] Network error, falling back to mock prescriptions:', err.message);
      } else {
        throw err;
      }
    }
  }

  await delay();
  if (patientId !== _profile.id && patientId !== DEMO_PATIENT_ID) {
    throw new Error('Unauthorized: Cannot view prescriptions for other patients.');
  }
  let items = _prescriptions.filter((p) => p.patientId === patientId || p.patientId === DEMO_PATIENT_ID);
  if (statusFilter && statusFilter !== 'All') {
    items = items.filter((p) => p.status === statusFilter);
  }
  return [...items];
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Medical History (Read-Only)
// ─────────────────────────────────────────────────────────────────────────────
export async function getMedicalHistory(
  patientId: number = DEMO_PATIENT_ID,
  categoryFilter?: string
): Promise<PatientMedicalHistoryRecord[]> {
  const token = getAuthToken();
  if (isRealJwt(token)) {
    try {
      const res = await fetch('/api/patient/medical-history', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          let items: PatientMedicalHistoryRecord[] = json.data;
          if (categoryFilter && categoryFilter !== 'All') {
            items = items.filter((h) => (h.category || (h as any).type || '').toLowerCase() === categoryFilter.toLowerCase());
          }
          return items;
        }
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status}) while fetching medical history`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[PATIENT] Network error, falling back to mock history:', err.message);
      } else {
        throw err;
      }
    }
  }

  await delay();
  if (patientId !== _profile.id && patientId !== DEMO_PATIENT_ID) {
    throw new Error('Unauthorized: Cannot view medical history for other patients.');
  }
  let items = _history.filter((h) => h.patientId === patientId || h.patientId === DEMO_PATIENT_ID);
  if (categoryFilter && categoryFilter !== 'All') {
    items = items.filter((h) => h.category.toLowerCase() === categoryFilter.toLowerCase());
  }
  return [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Medical Documents (Upload & Management)
// ─────────────────────────────────────────────────────────────────────────────
export async function getMedicalDocuments(
  patientId: number = DEMO_PATIENT_ID,
  categoryFilter?: string
): Promise<PatientUploadedDocument[]> {
  const token = getAuthToken();
  if (isRealJwt(token)) {
    try {
      const res = await fetch('/api/patient/documents', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          let items: PatientUploadedDocument[] = json.data;
          if (categoryFilter && categoryFilter !== 'All') {
            items = items.filter((d) => (d.documentType || '').toLowerCase() === categoryFilter.toLowerCase());
          }
          return items;
        }
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status}) while fetching medical documents`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[PATIENT] Network error, falling back to mock documents:', err.message);
      } else {
        throw err;
      }
    }
  }

  await delay();
  if (patientId !== _profile.id && patientId !== DEMO_PATIENT_ID) {
    throw new Error('Unauthorized: Cannot view documents for other patients.');
  }
  let items = _documents.filter((d) => d.patientId === patientId || d.patientId === DEMO_PATIENT_ID);
  if (categoryFilter && categoryFilter !== 'All') {
    items = items.filter((d) => d.documentType.toLowerCase() === categoryFilter.toLowerCase());
  }
  return [...items];
}

export interface DocumentUploadPayload {
  patientId: number;
  title: string;
  documentType: PatientUploadedDocument['documentType'];
  reportName: string;
  dateOfReport: string;
  healthcareProvider: string;
  description?: string;
  fileType: 'PDF' | 'JPG' | 'JPEG' | 'PNG';
  fileSize: string;
  fileName: string;
  fileDataUrl?: string;
}

export async function uploadMedicalDocument(
  payload: DocumentUploadPayload
): Promise<PatientUploadedDocument> {
  const token = getAuthToken();
  if (isRealJwt(token)) {
    try {
      const res = await fetch('/api/patient/documents', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          _documents = [json.data, ..._documents];
          return json.data;
        }
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status}) while uploading document`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[PATIENT] Network error during upload, saving locally:', err.message);
      } else {
        throw err;
      }
    }
  }

  await delay(600); // simulate upload time
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const newDoc: PatientUploadedDocument = {
    id: `doc-${Date.now()}`,
    patientId: payload.patientId,
    title: payload.title,
    documentType: payload.documentType,
    reportName: payload.reportName,
    dateOfReport: payload.dateOfReport,
    healthcareProvider: payload.healthcareProvider,
    description: payload.description,
    fileType: payload.fileType,
    fileSize: payload.fileSize,
    fileName: payload.fileName,
    uploadedDate: `${dateStr} ${timeStr}`,
    status: 'Pending Review',
    fileDataUrl: payload.fileDataUrl,
  };

  _documents = [newDoc, ..._documents];

  // Add auto notification for document upload confirmation
  const newNotif: PatientNotification = {
    id: `notif-${Date.now()}`,
    patientId: payload.patientId,
    title: 'Medical Document Upload Confirmation',
    message: `"${payload.title}" has been successfully uploaded and queued for clinical record archiving.`,
    dateTime: 'Just now',
    type: 'document',
    isRead: false,
    linkTab: 'documents',
  };
  _notifications = [newNotif, ..._notifications];

  return newDoc;
}

export async function deleteMedicalDocument(docId: string): Promise<void> {
  const token = getAuthToken();
  if (isRealJwt(token)) {
    try {
      const res = await fetch(`/api/patient/documents/${docId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        _documents = _documents.filter((d) => d.id !== docId);
        return;
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status}) while deleting document`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[PATIENT] Network error during document delete, falling back:', err.message);
      } else {
        throw err;
      }
    }
  }

  await delay(250);
  _documents = _documents.filter((d) => d.id !== docId);
}

export async function verifyMedicalDocument(
  docId: string,
  verifiedBy: string = 'Dr. Priya Sharma, MD (Cardiology)',
  verificationSource: string = 'Clinical Attending Sign-Off & Diagnostic Reconciliation'
): Promise<PatientUploadedDocument> {
  const token = getAuthToken();
  if (isRealJwt(token)) {
    try {
      const res = await fetch(`/api/patient/documents/${docId}/verify`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ verifiedBy, verificationSource }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const updated = json.data;
          _documents = _documents.map((d) => (d.id === docId ? updated : d));
          return updated;
        }
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status}) while verifying document`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[PATIENT] Network error during document verification, falling back:', err.message);
      } else {
        throw err;
      }
    }
  }

  await delay(300);
  const idx = _documents.findIndex((d) => d.id === docId);
  if (idx === -1) throw new Error('Document not found.');

  const todayStr = new Date().toISOString().split('T')[0];
  const updated: PatientUploadedDocument = {
    ..._documents[idx],
    status: 'Verified',
    verificationStatus: 'Verified & Authenticated',
    verifiedBy,
    verificationSource,
    verifiedDate: todayStr,
  };

  _documents[idx] = updated;

  // Add auto notification for document verification confirmation
  const newNotif: PatientNotification = {
    id: `notif-${Date.now()}`,
    patientId: updated.patientId,
    title: 'Medical Document Verified',
    message: `"${updated.title}" has been reviewed and clinically verified by ${verifiedBy}.`,
    dateTime: 'Just now',
    type: 'document',
    isRead: false,
    linkTab: 'documents',
  };
  _notifications = [newNotif, ..._notifications];

  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Medicine Reminders
// ─────────────────────────────────────────────────────────────────────────────
export async function getMedicineReminders(
  patientId: number = DEMO_PATIENT_ID
): Promise<MedicineReminder[]> {
  const token = getAuthToken();
  if (isRealJwt(token)) {
    try {
      const res = await fetch('/api/patient/reminders', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status}) while fetching reminders`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[PATIENT] Network error, falling back to mock reminders:', err.message);
      } else {
        throw err;
      }
    }
  }

  await delay();
  if (patientId !== _profile.id && patientId !== DEMO_PATIENT_ID) {
    throw new Error('Unauthorized: Cannot view medicine reminders for other patients.');
  }
  return [..._reminders.filter((r) => r.patientId === patientId || r.patientId === DEMO_PATIENT_ID)];
}

export async function markMedicineTaken(reminderId: string): Promise<MedicineReminder> {
  const token = getAuthToken();
  if (isRealJwt(token)) {
    try {
      const res = await fetch(`/api/patient/reminders/${reminderId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: 'Taken' }),
      });
      if (res.ok) {
        const now = new Date();
        const timeStr = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        const idx = _reminders.findIndex((r) => r.id === reminderId);
        if (idx !== -1) {
          _reminders[idx] = { ..._reminders[idx], status: 'Taken', takenAt: timeStr };
          return _reminders[idx];
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (${res.status}) while updating reminder`);
      }
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[PATIENT] Network error marking medicine taken, saving locally:', err.message);
      } else {
        throw err;
      }
    }
  }

  await delay(200);
  const idx = _reminders.findIndex((r) => r.id === reminderId);
  if (idx === -1) throw new Error('Reminder not found.');

  const now = new Date();
  const timeStr = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  const updated: MedicineReminder = {
    ..._reminders[idx],
    status: 'Taken',
    takenAt: timeStr,
  };
  _reminders[idx] = updated;
  return updated;
}

export async function snoozeMedicineReminder(
  reminderId: string,
  minutes = 30
): Promise<MedicineReminder> {
  const snoozedTime = new Date(Date.now() + minutes * 60000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const token = getAuthToken();
  if (isRealJwt(token)) {
    try {
      const res = await fetch(`/api/patient/reminders/${reminderId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: 'Upcoming', snoozeUntil: snoozedTime }),
      });
      if (res.ok) {
        const idx = _reminders.findIndex((r) => r.id === reminderId);
        if (idx !== -1) {
          _reminders[idx] = { ..._reminders[idx], status: 'Upcoming', snoozedUntil: `Snoozed until ${snoozedTime}` };
          return _reminders[idx];
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (${res.status}) while snoozing reminder`);
      }
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[PATIENT] Network error snoozing reminder, saving locally:', err.message);
      } else {
        throw err;
      }
    }
  }

  await delay(200);
  const idx = _reminders.findIndex((r) => r.id === reminderId);
  if (idx === -1) throw new Error('Reminder not found.');

  const updated: MedicineReminder = {
    ..._reminders[idx],
    status: 'Upcoming',
    snoozedUntil: `Snoozed until ${snoozedTime}`,
  };
  _reminders[idx] = updated;
  return updated;
}

export async function dismissMedicineReminder(reminderId: string): Promise<MedicineReminder> {
  const token = getAuthToken();
  if (isRealJwt(token)) {
    try {
      const res = await fetch(`/api/patient/reminders/${reminderId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isActive: false, status: 'Completed' }),
      });
      if (res.ok) {
        const idx = _reminders.findIndex((r) => r.id === reminderId);
        if (idx !== -1) {
          _reminders[idx] = { ..._reminders[idx], status: 'Completed' };
          return _reminders[idx];
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (${res.status}) while dismissing reminder`);
      }
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[PATIENT] Network error dismissing reminder, saving locally:', err.message);
      } else {
        throw err;
      }
    }
  }

  await delay(200);
  const idx = _reminders.findIndex((r) => r.id === reminderId);
  if (idx === -1) throw new Error('Reminder not found.');

  const updated: MedicineReminder = {
    ..._reminders[idx],
    status: 'Completed',
  };
  _reminders[idx] = updated;
  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Notifications
// ─────────────────────────────────────────────────────────────────────────────
export async function getNotifications(
  patientId: number = DEMO_PATIENT_ID
): Promise<PatientNotification[]> {
  const token = getAuthToken();
  if (isRealJwt(token)) {
    try {
      const res = await fetch('/api/patient/notifications', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status}) while fetching notifications`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[PATIENT] Network error, falling back to mock notifications:', err.message);
      } else {
        throw err;
      }
    }
  }

  await delay();
  if (patientId !== _profile.id && patientId !== DEMO_PATIENT_ID) {
    throw new Error('Unauthorized: Cannot view notifications for other patients.');
  }
  return [..._notifications.filter((n) => n.patientId === patientId || n.patientId === DEMO_PATIENT_ID)];
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const token = getAuthToken();
  if (isRealJwt(token)) {
    try {
      const res = await fetch(`/api/patient/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        _notifications = _notifications.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        );
        return;
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status}) while updating notification`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[PATIENT] Network error marking notification read, saving locally:', err.message);
      } else {
        throw err;
      }
    }
  }

  await delay(150);
  _notifications = _notifications.map((n) =>
    n.id === notificationId ? { ...n, isRead: true } : n
  );
}

export async function markAllNotificationsRead(patientId: number = DEMO_PATIENT_ID): Promise<void> {
  const token = getAuthToken();
  if (isRealJwt(token)) {
    try {
      const res = await fetch('/api/patient/notifications/read-all', {
        method: 'PUT',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        _notifications = _notifications.map((n) => ({ ...n, isRead: true }));
        return;
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status}) while updating notifications`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[PATIENT] Network error marking all notifications read, saving locally:', err.message);
      } else {
        throw err;
      }
    }
  }

  await delay(200);
  _notifications = _notifications.map((n) =>
    n.patientId === patientId || n.patientId === DEMO_PATIENT_ID ? { ...n, isRead: true } : n
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Real-Time Sync with Doctor CPOE Module
// ─────────────────────────────────────────────────────────────────────────────
export function syncNewDoctorPrescription(
  patientId: number,
  doctorName: string,
  medications: { name: string; dosage: string; frequency: string; route?: string; duration?: string; instructions?: string }[],
  _notes?: string
) {
  const rxId = `RX-${Date.now().toString().slice(-6)}`;
  const today = new Date().toISOString().split('T')[0];

  medications.forEach((med, idx) => {
    const rxItem: PatientPrescriptionItem = {
      id: `${rxId}-${idx + 1}`,
      prescriptionId: rxId,
      patientId: patientId || DEMO_PATIENT_ID,
      doctorName: doctorName || 'Attending Physician',
      department: 'Cardiology',
      prescriptionDate: today,
      medicineName: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      route: med.route || 'Oral',
      duration: med.duration || '30 Days',
      startDate: today,
      endDate: 'Ongoing',
      instructions: med.instructions || 'Take as directed by your physician.',
      status: 'Active',
    };
    _prescriptions.unshift(rxItem);

    // Auto-create a medicine reminder
    const reminderItem: MedicineReminder = {
      id: `rem-doc-${Date.now()}-${idx}`,
      patientId: patientId || DEMO_PATIENT_ID,
      prescriptionId: rxId,
      medicineName: med.name,
      dosage: med.dosage,
      scheduledTime: med.frequency.toLowerCase().includes('night') ? '09:00 PM' : '08:00 AM',
      frequency: med.frequency,
      duration: med.duration || '30 Days',
      doctorName: doctorName || 'Attending Physician',
      instructions: med.instructions || 'Take as directed by doctor.',
      status: 'Upcoming',
    };
    _reminders.unshift(reminderItem);
  });

  // Push notification to patient
  _notifications.unshift({
    id: `notif-doc-${Date.now()}`,
    patientId: patientId || DEMO_PATIENT_ID,
    type: 'prescription',
    title: 'New Official Prescription Issued',
    message: `${doctorName} has issued a new prescription order (${medications.map((m) => m.name).join(', ')}). View details and printable slip in My Prescriptions.`,
    dateTime: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
    isRead: false,
    linkTab: 'prescriptions',
  });
}

export function syncDiscontinuedDoctorPrescription(rxMedicineName: string) {
  _prescriptions = _prescriptions.map((p) =>
    p.medicineName.toLowerCase() === rxMedicineName.toLowerCase()
      ? { ...p, status: 'Completed' }
      : p
  );
  _reminders = _reminders.map((r) =>
    r.medicineName.toLowerCase() === rxMedicineName.toLowerCase()
      ? { ...r, status: 'Completed' }
      : r
  );
}
