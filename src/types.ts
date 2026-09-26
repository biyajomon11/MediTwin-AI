export interface Feature {
  id: string;
  iconName: string;
  title: string;
  description: string;
  category: 'clinical' | 'administrative' | 'patient' | 'system';
}

export interface ModuleRole {
  id: string;
  role: string;
  title: string;
  description: string;
  features: string[];
  icon: string;
  badge: string;
  previewMetrics: { label: string; value: string }[];
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  organization: string;
  comment: string;
  rating: number;
  avatarUrl: string;
}

export interface StatItem {
  id: string;
  label: string;
  value: string;
  numericTarget: number;
  suffix?: string;
  icon: string;
  description: string;
}

export interface WorkflowStep {
  step: number;
  title: string;
  description: string;
  icon: string;
  actor: string;
}

export interface WhyChooseItem {
  title: string;
  description: string;
  icon: string;
  highlight: string;
}

// ─────────────────────────────────────────────────────────────
// Nurse Module — Patient Observations & Vital Signs
// ─────────────────────────────────────────────────────────────

export interface PatientSummary {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  age?: number;
  phone?: string | null;
  gender?: { name: string } | null;
  bloodGroup?: { name: string } | null;
  user?: { email: string };
  department?: string;
  ward?: string;
  bedNumber?: string;
  patientCode?: string;
}

export interface ObservationFormData {
  patientId: number | '';
  observationDate: string;
  observationTime: string;
  temperature: string;
  pulseRate: string;
  respiratoryRate: string;
  systolicBp: string;
  diastolicBp: string;
  spo2: string;
  bloodGlucose: string;
  weight: string;
  painScore: string;
  consciousnessLevel: string;
  generalObservation: string;
  additionalNotes: string;
}

export interface PatientObservation {
  id: number;
  patientId: number;
  nurseId: number;
  observationDate: string;
  observationTime: string;
  temperature: number;
  pulseRate: number;
  respiratoryRate: number;
  systolicBp: number;
  diastolicBp: number;
  spo2: number;
  bloodGlucose?: number | null;
  weight?: number | null;
  painScore?: number | null;
  consciousnessLevel?: string | null;
  generalObservation?: string | null;
  additionalNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  patient?: {
    id: number;
    firstName: string;
    lastName: string;
    gender?: { name: string } | null;
  };
  nurse?: {
    id: number;
    firstName: string;
    lastName: string;
    department?: { name: string } | null;
  };
}

export interface ObservationFilters {
  dateFrom: string;
  dateTo: string;
  search: string;
}

// ─────────────────────────────────────────────────────────────
// Doctor Module — Patient Records, AI Summaries, Guidelines
// ─────────────────────────────────────────────────────────────

export type PatientStatus = 'Active' | 'Discharged' | 'Admitted' | 'Critical' | 'Under Observation';

export type AllergyVerificationStatus =
  | 'Verified by Doctor'
  | 'Verified by Nurse'
  | 'Self-Reported (Unverified)'
  | 'Suspected / Under Review';

export type AllergyReactionType = 'True IgE Allergy' | 'Drug Intolerance' | 'Adverse Effect';

export interface Allergy {
  id?: string;
  substance: string;
  reaction: string;
  severity: 'Mild' | 'Moderate' | 'Severe';
  verificationStatus?: AllergyVerificationStatus;
  verifiedBy?: string;
  verifiedDate?: string;
  reactionType?: AllergyReactionType;
  notes?: string;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  prescribedBy: string;
}

export interface MedicalHistoryEntry {
  id?: string;
  condition: string;
  diagnosedDate: string;
  diagnosedBy?: string;
  status: 'Active' | 'Resolved' | 'Chronic';
  notes?: string;
}

export interface Prescription {
  id: string;
  date: string;
  medications: Medication[];
  doctorName: string;
  notes?: string;
  status: 'Active' | 'Completed' | 'Cancelled' | 'Discontinued';
}

export interface LabReport {
  id: string;
  testName: string;
  date: string;
  result: string;
  referenceRange: string;
  unit: string;
  status: 'Normal' | 'Abnormal' | 'Critical' | 'Pending';
  orderedBy: string;
  notes?: string;
}

export interface DoctorAppointment {
  id: string;
  date: string;
  time: string;
  reason: string;
  doctorName: string;
  department: string;
  status: 'Completed' | 'Upcoming' | 'Cancelled' | 'No-show';
  notes?: string;
}

export interface ClinicalNote {
  id: string;
  date: string;
  time: string;
  authorName: string;
  authorRole: string;
  content: string;
  type: 'Progress Note' | 'Consultation' | 'Discharge Summary' | 'Referral' | 'General';
}

export interface MedicalDocument {
  id: string;
  name: string;
  type: string;
  uploadedDate: string;
  uploadedBy: string;
  size: string;
  category: 'Lab Report' | 'Radiology' | 'Prescription' | 'Discharge Summary' | 'Referral' | 'Other';
}

/** Full patient record visible to the assigned doctor */
export interface DoctorPatient extends PatientSummary {
  assignedDoctorId: number;
  status: PatientStatus;
  email?: string;
  address?: string;
  lastVisit: string;
  nextAppointment?: string;
  allergies: Allergy[];
  currentMedications: Medication[];
  medicalHistory: MedicalHistoryEntry[];
  prescriptions: Prescription[];
  labReports: LabReport[];
  appointments: DoctorAppointment[];
  clinicalNotes: ClinicalNote[];
  documents: MedicalDocument[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  primaryCondition?: string;
}

// ── AI Summary (Phase 1 — Doctor-Tailored Clinical Synthesis) ──

export type AISummaryPreset =
  | 'rapid'      // ⚡ 30-Second Rapid Triage
  | 'pharma'     // 💊 Pharmacology & Drug Safety
  | 'labs'       // 🧪 Abnormal Labs & Diagnostics
  | 'cardio'     // 🫀 Cardio-Metabolic Profile
  | 'preop'      // 📋 Pre-Operative Clearance
  | 'full'       // 🔍 Longitudinal EHR Review
  | 'custom';    // 🎯 Doctor-Directed Query

export type AISummaryFormat = 'bullets' | 'structured' | 'direct';

export interface AISummaryOptions {
  preset?: AISummaryPreset;
  customQuery?: string;
  selectedSections?: string[];
  formatStyle?: AISummaryFormat;
}

export interface AISummarySection {
  title: string;
  content: string;
  isHighlight?: boolean;
}

/**
 * Doctor-tailored AI clinical summary.
 * Derived from structured patient record data with focus on physician requirements.
 */
export interface AISummary {
  patientId: number;
  generatedAt: string;
  sections: AISummarySection[];
  disclaimer: string;
  phase: string;
  preset?: AISummaryPreset;
  formatStyle?: AISummaryFormat;
  customQuery?: string;
  keyAlerts?: string[];
  readingTimeMinutes?: number;
}

// ── Clinical Guidelines ────────────────────────────────────────

export type GuidelineCategory =
  | 'General Medicine'
  | 'Emergency Care'
  | 'Nursing Procedures'
  | 'Medication Guidelines'
  | 'Infection Control'
  | 'Patient Safety'
  | 'Hospital Procedures';

export interface ClinicalGuideline {
  id: string;
  title: string;
  category: GuidelineCategory;
  department: string;
  version: string;
  effectiveDate: string;
  lastUpdated: string;
  uploadedBy: string;
  description: string;
  content: string;
  /** Phase 1: always false — no real PDF files in demo */
  downloadAvailable: false;
  accessLevel: 'All Staff' | 'Medical Staff' | 'Doctors Only';
  tags: string[];
}

// ─────────────────────────────────────────────────────────────────
// Nurse Module Phase 1 — Nursing Notes, Treatment Records, History
// ─────────────────────────────────────────────────────────────────

export interface NursePatient extends PatientSummary {
  patientId: string;           // display ID e.g. PAT-2024-101
  assignedNurseId: number;     // authorisation — nurse can only see their patients
  department: string;
  ward: string;
  assignedDoctor: string;
  email?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  allergies: Allergy[];
  status: PatientStatus;
  primaryCondition?: string;
  admissionDate?: string;
}

export type NoteType =
  | 'General Nursing Note'
  | 'Patient Observation'
  | 'Medication Administration'
  | 'Treatment/Procedure'
  | 'Patient Response'
  | 'Follow-up Note';

export interface NursingNote {
  id: string;
  patientId: number;
  date: string;
  time: string;
  nurseName: string;
  noteType: NoteType;
  nursingObservation: string;
  patientResponse: string;
  treatmentCareProvided: string;
  additionalNotes?: string;
  createdAt: string;
}

export interface TreatmentRecord {
  id: string;              // treatmentId — will become PK in DB
  patientId: number;
  date: string;
  time: string;
  treatmentName: string;
  description: string;
  performedBy: string;     // nurse who performed the treatment
  patientResponse: string;
  additionalNotes?: string;
  createdAt: string;
}

export interface NurseCurrentMedication {
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  prescribedBy: string;
  status: 'Active' | 'Completed' | 'Discontinued';
}

export interface NurseMedicalHistory {
  patientId: number;
  conditions: MedicalHistoryEntry[];
  hospitalizations: {
    date: string;
    reason: string;
    hospital: string;
    duration: string;
    outcome: string;
  }[];
  surgeries: {
    date: string;
    procedure: string;
    hospital: string;
    notes?: string;
  }[];
  familyHistory: string;
  currentMedications: NurseCurrentMedication[];
  labReports: LabReport[];
  appointments: DoctorAppointment[];
}

export interface NurseTreatmentMedication {
  name: string;
  instructions: string;
}

export interface NurseTreatmentPlan {
  id: string;
  patientId: number;
  title: string;
  diagnosisCondition: string;
  treatmentGoals: string[];
  plannedProcedures: string[];
  medications: NurseTreatmentMedication[];
  treatmentFrequency: string;
  startDate: string;
  expectedFollowUp: string;
  assignedDoctor: string;
  importantInstructions: string;
}

// ─────────────────────────────────────────────────────────────────
// Patient Module Phase 1 — Documents, Prescriptions, History & Reminders
// ─────────────────────────────────────────────────────────────────

export type PatientDocumentCategory =
  | 'Laboratory Report'
  | 'Prescription'
  | 'Medical Report'
  | 'Scan/Imaging Report'
  | 'Discharge Summary'
  | 'Vaccination Record'
  | 'Other Medical Document';

export type MedicalHistoryVerificationStatus =
  | 'Verified by Physician'
  | 'Verified by Surgeon'
  | 'Verified by Pathologist'
  | 'Verified by Nurse'
  | 'Verified by Radiologist'
  | 'Patient Self-Reported (Unverified)';

export interface PatientUploadedDocument {
  id: string;
  patientId: number;
  title: string;
  documentType: PatientDocumentCategory;
  reportName: string;
  dateOfReport: string;
  healthcareProvider: string;
  description?: string;
  fileType: 'PDF' | 'JPG' | 'JPEG' | 'PNG';
  fileSize: string;
  fileName: string;
  uploadedDate: string;
  status: 'Verified' | 'Pending Review' | 'Archived';
  verificationStatus?: 'Verified & Authenticated' | 'Clinically Reconciled' | 'Pending Clinical Review';
  verifiedBy?: string;
  verificationSource?: string;
  verifiedDate?: string;
  fileDataUrl?: string;
}

export type PrescriptionStatus = 'Active' | 'Completed' | 'Upcoming';

export interface PatientPrescriptionItem {
  id: string;
  prescriptionId: string;
  patientId: number;
  doctorName: string;
  department: string;
  prescriptionDate: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  route: string;
  duration: string;
  startDate: string;
  endDate: string;
  instructions: string;
  status: PrescriptionStatus;
}

export interface PatientVaccinationRecord {
  vaccine: string;
  date: string;
  provider: string;
  status: 'Completed' | 'Due' | 'Upcoming';
  batchNumber?: string;
  verificationStatus?: 'Verified by Nurse' | 'Verified by Physician' | 'Self-Reported';
  verifiedBy?: string;
  verificationSource?: string;
  verifiedDate?: string;
}

export interface PatientHealthProfile {
  id: number;
  patientId: string; // e.g. PAT-2024-101
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  age: number;
  gender: string;
  bloodGroup: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  medicalSummary: {
    allergies: Allergy[];
    chronicConditions: string[];
    currentMedications: Medication[];
    previousMajorConditions: string[];
    vaccinationStatus: PatientVaccinationRecord[];
  };
}

export interface PatientMedicalHistoryRecord {
  id: string;
  patientId: number;
  date: string;
  category: 'Diagnosis' | 'Hospitalization' | 'Surgery' | 'Treatment' | 'Lab Result' | 'Clinical Note' | 'Vaccination';
  conditionOrEvent: string;
  description: string;
  healthcareProvider: string;
  hospitalDepartment: string;
  treatmentOrOutcome: string;
  status?: string;
  verificationStatus?: MedicalHistoryVerificationStatus;
  verifiedBy?: string;
  verificationSource?: string;
  verifiedDate?: string;
  documentRefId?: string;
}

export type MedicineReminderStatus = 'Upcoming' | 'Due Now' | 'Taken' | 'Missed' | 'Completed';

export interface MedicineReminder {
  id: string;
  patientId: number;
  prescriptionId: string;
  medicineName: string;
  dosage: string;
  scheduledTime: string; // e.g. "08:00 AM"
  frequency: string;
  duration: string;
  doctorName: string;
  instructions: string;
  status: MedicineReminderStatus;
  takenAt?: string;
  snoozedUntil?: string;
}

export type PatientNotificationType =
  | 'medicine_reminder'
  | 'prescription'
  | 'lab_report'
  | 'document'
  | 'appointment'
  | 'general';

export interface PatientNotification {
  id: string;
  patientId: number;
  title: string;
  message: string;
  dateTime: string;
  type: PatientNotificationType;
  isRead: boolean;
  linkTab?: string;
}

// ─────────────────────────────────────────────────────────────────
// Hospital Administrator Module Phase 1 — Notifications, Reports & Activity
// ─────────────────────────────────────────────────────────────────

export type HospitalNotificationType =
  | 'General Announcement'
  | 'Hospital Notice'
  | 'Health Awareness'
  | 'Emergency Notice'
  | 'Maintenance Notice'
  | 'Policy Update';

export type HospitalTargetAudience =
  | 'All Users'
  | 'Doctors'
  | 'Nurses'
  | 'Patients'
  | 'Healthcare Professionals';

export type HospitalNotificationPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type HospitalNotificationStatus = 'Draft' | 'Published' | 'Scheduled' | 'Expired';

export interface HospitalNotification {
  id: string;
  title: string;
  message: string;
  notificationType: HospitalNotificationType;
  targetAudience: HospitalTargetAudience;
  priority: HospitalNotificationPriority;
  status: HospitalNotificationStatus;
  createdDate: string;
  publishDate: string;
  expiryDate: string;
  createdBy: string;
  department?: string;
  acknowledgedCount?: number;
}

export interface DepartmentMetric {
  name: string;
  patients: number;
  doctors: number;
  nurses: number;
  appointments: number;
  occupancyRate: number;
}

export interface AppointmentMonthlyTrend {
  month: string;
  scheduled: number;
  completed: number;
  cancelled: number;
}

export interface HospitalStatistics {
  totalPatients: number;
  totalDoctors: number;
  totalNurses: number;
  totalDepartments: number;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  scheduledAppointments: number;
  activeUsers: number;
  bedOccupancyRate: number;
  averageWaitTimeMinutes: number;
  patientDemographics: { ageGroup: string; male: number; female: number; total: number }[];
  departmentStats: DepartmentMetric[];
  appointmentTrends: AppointmentMonthlyTrend[];
  userDistribution: { role: string; count: number; active: number; verified: number }[];
}

export type HospitalReportType =
  | 'Appointment Report'
  | 'Patient Statistics'
  | 'Staff Statistics'
  | 'Department Statistics'
  | 'Hospital Activity Report';

export interface HospitalReport {
  id: string;
  name: string;
  reportType: HospitalReportType;
  generatedDate: string;
  dateRange: string;
  generatedBy: string;
  department: string;
  status: 'Ready' | 'Archived' | 'Generating';
  summary: string;
  metrics: { label: string; value: string | number }[];
  detailsTable?: { [key: string]: any }[];
}

export type HospitalActivityType =
  | 'New patient registered'
  | 'Doctor account created'
  | 'Nurse account created'
  | 'Appointment scheduled'
  | 'Appointment completed'
  | 'Appointment cancelled'
  | 'Hospital notification published'
  | 'Clinical guideline updated'
  | 'Hospital document uploaded'
  | 'User account deactivated';

export type HospitalActivityStatus = 'Completed' | 'Pending' | 'Flagged' | 'System Automated';

export interface HospitalActivity {
  id: string;
  activityType: HospitalActivityType;
  description: string;
  actor: string;
  actorRole: string;
  department: string;
  dateTime: string;
  status: HospitalActivityStatus;
  metadata?: string;
}

// ─────────────────────────────────────────────────────────────────
// Patient Module Phase 1 — AI Health Summary Types
// ─────────────────────────────────────────────────────────────────

export interface PatientAIHealthOverview {
  age: number | string;
  gender: string;
  bloodGroup: string;
  height?: string;
  weight?: string;
  knownAllergiesCount: number;
  recordedConditionsCount: number;
  summaryText: string;
  isComplete: boolean;
}

export interface PatientAIMedicalHistoryItem {
  id: string;
  date: string;
  conditionOrEvent: string;
  description: string;
  hospitalOrProvider: string;
  status: string;
  verificationStatus?: string;
}

export interface PatientAIMedicationItem {
  id: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  route?: string;
  duration?: string;
  prescribedBy: string;
  prescriptionDate: string;
  hospitalOrSource: string;
  instructions?: string;
  status?: string;
}

export interface PatientAIAllergyItem {
  id?: string;
  substance: string;
  reaction: string;
  severity: string;
  verificationStatus?: string;
  source?: string;
}

export interface PatientAILabReportItem {
  id: string;
  testName: string;
  date: string;
  result: string;
  referenceRange?: string;
  status?: string;
  hospitalOrProvider: string;
  documentRefId?: string;
}

export interface PatientAIRecentVisitItem {
  id: string;
  hospital: string;
  visitDate: string;
  visitType: string;
  chiefComplaint?: string;
  recordedDiagnosis?: string;
  treatmentSummary?: string;
  followUp?: string;
  caseSheetNumber?: string;
}

export interface PatientAITreatmentItem {
  id: string;
  title: string;
  details: string;
  sourceHospital: string;
  date: string;
  instructions?: string;
}

export interface PatientAIHealthSummary {
  patientId: number | string;
  generatedAt: string;
  disclaimer: string;
  patientInfo: {
    name: string;
    patientId: string;
    hospitalName?: string;
    dateOfBirth?: string;
  };
  healthOverview: PatientAIHealthOverview;
  medicalHistory: PatientAIMedicalHistoryItem[];
  currentMedications: PatientAIMedicationItem[];
  allergies: PatientAIAllergyItem[];
  laboratoryReports: PatientAILabReportItem[];
  recentVisits: PatientAIRecentVisitItem[];
  treatmentInformation: PatientAITreatmentItem[];
  importantInformation: string[];
}

// ─────────────────────────────────────────────────────────────
// Nurse Module — Medication Reminder & Scheduling System
// ─────────────────────────────────────────────────────────────

export type NurseReminderStatus =
  | 'PENDING'
  | 'DUE'
  | 'ADMINISTERED'
  | 'MISSED'
  | 'SKIPPED'
  | 'CANCELLED'
  | 'NEEDS_REVIEW';

export type MedicationSkipReason =
  | 'Patient unavailable'
  | 'Patient refused'
  | 'Medication unavailable'
  | 'Clinical instruction'
  | 'Other';

export interface NurseMedicationReminder {
  id: string;
  patientId: number;
  patientName: string;
  patientCode?: string; // e.g. "PT-1024"
  prescriptionId: string;
  medicineName: string;
  strength: string;
  dose: string;
  route: string; // 'Oral' | 'IV' | 'IM' | 'Subcutaneous' | 'Inhalation' | 'Topical' | 'Other'
  frequency: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm (e.g. "10:00")
  status: NurseReminderStatus;
  doctorName?: string;
  prescribingDoctorId?: number;
  notes?: string;
  reminderType?: string;
  administeredAt?: string;
  administeredByNurseId?: number;
  administeredByNurseName?: string;
  skippedAt?: string;
  skipReason?: MedicationSkipReason;
  skipNotes?: string;
  patientAllergies?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface NurseReminderStats {
  total: number;
  pending: number;
  dueNow: number;
  completed: number;
  needsReview: number;
  missedOrSkipped: number;
}

// ─────────────────────────────────────────────────────────────
// Doctor Module — Doctor Profile, Settings & Security
// ─────────────────────────────────────────────────────────────

export interface DoctorProfile {
  id: string;
  doctorId: string;
  userId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  specialization?: string;
  department?: string;
  hospital?: string;
  licenseNumber?: string;
  yearsOfExperience?: number;
  qualification?: string;
  accountStatus?: string;
  createdAt?: string;
  joiningDate?: string;
  role: 'DOCTOR';
  authMethod: string;
  profileImageUrl?: string;
}

export interface DoctorProfileUpdateInput {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  yearsOfExperience?: number | null;
}

export interface DoctorNotificationPreferences {
  appointmentAlerts: boolean;
  criticalLabAlerts: boolean;
  prescriptionAlerts: boolean;
  patientRecordAlerts: boolean;
  aiSummaryAlerts: boolean;
  guidelineUpdates: boolean;
}

export interface DoctorReminderSummary {
  unreadCount: number;
  upcomingAppointments: number;
  reportsToReview: number;
  documentationTasks: number;
  otherNotifications: number;
}

export interface DoctorActivityItem {
  id: number;
  action: string;
  timestamp: string;
  timeFormatted: string;
  dateFormatted: string;
  status: 'Completed' | 'Pending';
}

export interface OverviewAppointment {
  id: number;
  patientId: number;
  patientName: string;
  condition: string;
  timeStatus: string;
  time?: string;
  status: string;
  isOngoing?: boolean;
  date: string;
  age: number;
  sex: 'M' | 'F';
  phone?: string;
  email?: string;
  symptoms: string[];
  prescription: string;
  notes?: string;
  vitals?: {
    bp: string;
    pulse: number;
    spo2: number;
    temp: number;
  };
}

export interface OverviewTimelineItem {
  id: number;
  time: string;
  title: string;
  status: string;
  patientName: string;
}

export interface OverviewRequestItem {
  id: number;
  name: string;
  date: string;
  time: string;
  status: string;
}

export interface DoctorClinicalOverviewData {
  doctor: {
    id: number;
    fullName: string;
    specialization: string;
    department: string;
  };
  stats: {
    appointmentsCount: number;
    activePatientsCount: number;
    pendingRequestsCount: number;
    prescriptionsCount: number;
    completedCount: number;
  };
  todaysAppointments: OverviewAppointment[];
  timeline: OverviewTimelineItem[];
  appointmentRequests: OverviewRequestItem[];
  patientDemographics: {
    total: number;
    femaleCount: number;
    maleCount: number;
    otherCount: number;
    femalePercent: number;
    malePercent: number;
    otherPercent: number;
    scheduledCount: number;
    completedCount: number;
  };
  activityTrends: {
    day: string;
    label: string;
    count: number;
  }[];
}

// ─────────────────────────────────────────────────────────────
// Patient Appointment Booking & Doctor Availability Types
// ─────────────────────────────────────────────────────────────

export interface AvailableDoctorSlot {
  time24: string;
  time12: string;
  isBooked: boolean;
}

export interface DoctorAvailabilityInfo {
  date: string;
  status: 'AVAILABLE' | 'ABSENT' | 'ON_LEAVE' | 'UNAVAILABLE';
  isAvailable: boolean;
  reason?: string | null;
  nextAvailableDate?: string | null;
  workingHours: string;
  slots: AvailableDoctorSlot[];
}

export interface DoctorOption {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  specialization: string;
  departmentId?: number;
  departmentName?: string;
  hospitalName?: string;
  yearsOfExperience: number;
  licenseNumber: string;
  phone: string;
  email: string;
  availability?: {
    date: string;
    status: 'AVAILABLE' | 'ABSENT' | 'ON_LEAVE' | 'UNAVAILABLE';
    isAvailable: boolean;
    reason: string | null;
    nextAvailableDate: string | null;
    startTime: string;
    endTime: string;
  };
}

export interface DepartmentOption {
  id: number;
  name: string;
  description: string;
  hospitalName: string;
  doctorCount: number;
  doctors: DoctorOption[];
}

export interface PatientBookedAppointment {
  id: number;
  appointmentId: string;
  date: string;
  time: string;
  rawDate: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  reason: string;
  notes: string;
  type: 'in-person' | 'video';
  doctor: {
    id: number;
    name: string;
    firstName: string;
    lastName: string;
    specialization: string;
    department: string;
    hospital: string;
    phone: string;
  };
  createdAt: string;
}
