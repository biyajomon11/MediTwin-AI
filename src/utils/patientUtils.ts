/**
 * Utility functions for Patient identifiers and Care Classification (Inpatient vs Outpatient)
 */

export type PatientCareType = 'Inpatient' | 'Outpatient';

/**
 * Determines whether a patient is currently an Inpatient or Outpatient based on clinical status and ward assignment.
 * - Inpatients (IP): Admitted, Critical, Under Observation, or assigned to an active inpatient ward/bed.
 * - Outpatients (OP): Active ambulatory clinics, consultations, or post-discharge follow-up.
 */
export function isPatientInpatient(status?: string, ward?: string): boolean {
  if (!status) {
    return Boolean(ward && ward.trim() !== '' && !ward.toLowerCase().includes('outpatient'));
  }
  const s = status.toLowerCase();
  if (s === 'admitted' || s === 'critical' || s === 'under observation') {
    return true;
  }
  if (s === 'active') {
    // If assigned to a dedicated inpatient ward/bed (e.g. "Ward 1 – Bed 5", "ICU", "Ward 3A", "Paediatric Ward")
    if (ward && /bed|icu|ccu|ward\s*[0-9]|paediatric|pediatric/i.test(ward)) {
      return true;
    }
  }
  return false;
}

export function getPatientCareType(status?: string, ward?: string): PatientCareType {
  return isPatientInpatient(status, ward) ? 'Inpatient' : 'Outpatient';
}

/**
 * Formats a meaningful healthcare identifier (MRN / Patient ID) based on Inpatient (IP) vs Outpatient (OP).
 * Examples:
 * - Inpatient: IP-102, IP-103, IP-001
 * - Outpatient: OP-101, OP-105, OP-003
 */
export function formatPatientId(patient?: {
  id: number | string;
  status?: string;
  ward?: string;
  patientCode?: string;
} | null): string {
  if (!patient) return 'PAT-000';
  if (patient.patientCode && patient.patientCode.trim()) {
    return patient.patientCode;
  }

  const isInpatient = isPatientInpatient(patient.status, patient.ward);
  const prefix = isInpatient ? 'IP' : 'OP';

  const rawId = patient.id;
  const num = typeof rawId === 'string' ? parseInt(rawId.replace(/\D/g, ''), 10) || 1 : rawId;
  const formattedNumber = num < 100 ? String(num).padStart(3, '0') : String(num);

  return `${prefix}-${formattedNumber}`;
}
