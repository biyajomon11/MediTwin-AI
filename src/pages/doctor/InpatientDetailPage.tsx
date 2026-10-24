import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Bed,
  Building2,
  Activity,
  FileText,
  Pill,
  User,
  Clock,
  ArrowRightLeft,
  LogOut,
  HeartPulse,
  Phone,
  Calendar,
  ShieldCheck,
  Stethoscope,
  ChevronRight,
  ClipboardList,
  FlaskConical,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import type { InpatientAdmissionRecord, AdmissionTimelineEvent, DoctorPatient, Prescription, LabReport } from '../../types';
import { getAdmissionTimeline, getPatientById } from '../../services/doctorService';
import { CreatePrescriptionModal } from '../../components/doctor/CreatePrescriptionModal';
import { CreateLabReportModal } from '../../components/doctor/CreateLabReportModal';
import { getTallManName } from '../../utils/medicationSafety';

interface InpatientDetailPageProps {
  admission: InpatientAdmissionRecord;
  patient?: DoctorPatient;
  onBack: () => void;
  onNavigateToPatient?: (patientId: number, tab?: string) => void;
  onTransferBed?: (admission: InpatientAdmissionRecord) => void;
  onStartDischarge?: (admission: InpatientAdmissionRecord) => void;
}

const formatGender = (g: any): string => {
  if (!g) return 'Unspecified';
  if (typeof g === 'string') return g;
  if (typeof g === 'object' && g.name) return String(g.name);
  return 'Unspecified';
};

const formatBloodGroup = (bg: any): string => {
  if (!bg) return 'Unknown';
  if (typeof bg === 'string') return bg;
  if (typeof bg === 'object' && bg.name) return String(bg.name);
  return 'Unknown';
};

// Calculate human readable length of stay
const calculateLengthOfStay = (dateTimeStr?: string): string => {
  if (!dateTimeStr) return 'Active Admission';
  const start = new Date(dateTimeStr).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - start);
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffHours / 24);
  const hours = diffHours % 24;
  if (days === 0 && hours === 0) return 'Just admitted (< 1 hour)';
  if (days === 0) return `${hours} hr${hours > 1 ? 's' : ''}`;
  return `${days} day${days > 1 ? 's' : ''}, ${hours} hr${hours > 1 ? 's' : ''}`;
};

export const InpatientDetailPage: React.FC<InpatientDetailPageProps> = ({
  admission,
  patient,
  onBack,
  onNavigateToPatient,
  onTransferBed,
  onStartDischarge,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'timeline'>('details');
  const [timeline, setTimeline] = useState<AdmissionTimelineEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Inpatient Clinical Record States
  const [currentPatient, setCurrentPatient] = useState<DoctorPatient | null>(patient || null);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showLabModal, setShowLabModal] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (patient) {
      setCurrentPatient(patient);
    }
    const pid = patient?.id || admission.patientId;
    if (pid) {
      getPatientById(pid)
        .then((p) => {
          if (p) setCurrentPatient(p);
        })
        .catch((e) => console.warn('[INPATIENT_DETAIL] Could not fetch detailed patient:', e));
    }
  }, [patient, admission.patientId]);

  const handlePrescriptionCreated = (newRx: Prescription) => {
    if (currentPatient) {
      const updated: DoctorPatient = {
        ...currentPatient,
        prescriptions: [newRx, ...(currentPatient.prescriptions || [])],
        currentMedications: [
          ...newRx.medications.map((m) => ({
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            startDate: newRx.date,
            prescribedBy: newRx.doctorName,
          })),
          ...(currentPatient.currentMedications || []),
        ],
      };
      setCurrentPatient(updated);
    }
    setActionSuccessMsg(`Prescription #${newRx.id} created and available in Inpatient Medical Records.`);
    setTimeout(() => setActionSuccessMsg(null), 5000);
  };

  const handleLabReportCreated = (newLab: LabReport) => {
    if (currentPatient) {
      const updated: DoctorPatient = {
        ...currentPatient,
        labReports: [newLab, ...(currentPatient.labReports || []).filter((l) => l.id !== newLab.id)],
      };
      setCurrentPatient(updated);
    }
    setActionSuccessMsg(`Laboratory report "${newLab.testName}" recorded in Inpatient Medical Records.`);
    setTimeout(() => setActionSuccessMsg(null), 5000);
  };

  const resolvedPatientId = currentPatient?.id || admission.patientId;
  const activeMeds =
    currentPatient?.currentMedications && currentPatient.currentMedications.length > 0
      ? currentPatient.currentMedications
      : (currentPatient?.prescriptions || []).filter((r) => r.status === 'Active').flatMap((r) => r.medications || []);
  const labReports = currentPatient?.labReports || [];

  const fallbackPatient: DoctorPatient = currentPatient || ({
    id: admission.patientId,
    firstName: admission.patientName?.split(' ')[0] || 'Inpatient',
    lastName: admission.patientName?.split(' ').slice(1).join(' ') || '',
    age: admission.patientAge || admission.age || 45,
    gender: { name: admission.patientGender || admission.gender || 'Unknown' },
    bloodGroup: { name: admission.bloodGroup || 'O+' },
    phone: admission.patientPhone || admission.phone || '',
    email: admission.email || '',
    department: admission.wardDepartment || 'General Medicine',
    ward: `${admission.wardName} (${admission.bedNumber})`,
    bedNumber: admission.bedNumber,
    status: 'Admitted',
    assignedDoctorId: 0,
    lastVisit: admission.admissionDateTime || new Date().toISOString(),
    allergies: [],
    currentMedications: [],
    medicalHistory: [],
    prescriptions: [],
    labReports: [],
    appointments: [],
    clinicalNotes: [],
    documents: [],
  } as unknown as DoctorPatient);

  useEffect(() => {
    const loadTimeline = async () => {
      setLoadingTimeline(true);
      try {
        const res = await getAdmissionTimeline(admission.id);
        if (res.success && res.data && Array.isArray(res.data.timeline)) {
          setTimeline(res.data.timeline);
        } else {
          // Fallback baseline event
          setTimeline([
            {
              id: `adm-created-${admission.id}`,
              eventType: 'ADMISSION_CREATED',
              timestamp: admission.admissionDateTime,
              title: 'Patient Admitted to Inpatient Ward',
              description: `Admitted under ${admission.doctorName || 'Attending Physician'} to ${admission.wardName} (${admission.bedNumber})`,
              diagnosis: admission.admissionDiagnosis,
              chiefComplaint: admission.chiefComplaint,
              acuityLevel: admission.acuityLevel,
            },
          ]);
        }
      } catch (err) {
        console.error('Failed to load admission timeline:', err);
      } finally {
        setLoadingTimeline(false);
      }
    };

    loadTimeline();
  }, [admission]);

  // Acuity Badge colors
  const getAcuityColor = (level?: string) => {
    switch ((level || '').toUpperCase()) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'MODERATE':
      case 'MEDIUM':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'LOW':
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  // Status Badge colors
  const getStatusColor = (status?: string) => {
    switch ((status || '').toUpperCase()) {
      case 'DISCHARGED':
        return 'bg-slate-500/20 text-gray-400 border-slate-500/40';
      case 'UNDER_OBSERVATION':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'ADMITTED':
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  const isDischarged = admission.admissionStatus === 'DISCHARGED';
  const patientInitials = (admission.patientName || 'PT').slice(0, 2).toUpperCase();

  const formattedAdmitDate = admission.admissionDateTime
    ? new Date(admission.admissionDateTime).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recent Admission';

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* ── Top Header & Breadcrumb Bar ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.05] border border-white/10 hover:bg-white/15 text-gray-200 hover:text-white transition-all text-xs font-semibold cursor-pointer shadow-sm group"
            title="Return to Inpatients List"
          >
            <ArrowLeft className="w-4 h-4 text-accent group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Inpatients</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
            <span>Inpatients</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
            <span className="font-mono text-accent">{admission.admissionNumber}</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
            <span className="text-white font-medium">{admission.patientName}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {!isDischarged && onTransferBed && (
            <button
              type="button"
              onClick={() => onTransferBed(admission)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer shadow-sm"
              title="Transfer to another Bed or Ward"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Transfer Bed</span>
            </button>
          )}

          {onNavigateToPatient && (
            <button
              type="button"
              onClick={() => onNavigateToPatient(admission.patientId, 'overview')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent/15 hover:bg-accent text-accent hover:text-navy-950 border border-accent/40 text-xs font-bold transition-all cursor-pointer shadow-sm"
              title="Open Complete Patient Medical Record (EMR)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Open Patient Chart</span>
            </button>
          )}

          {!isDischarged && onNavigateToPatient && (
            <button
              type="button"
              onClick={() => {
                if (onStartDischarge) {
                  onStartDischarge(admission);
                } else {
                  onNavigateToPatient(admission.patientId, 'discharge-summary');
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-all cursor-pointer shadow-sm"
              title="Initiate Discharge Summary Workflow"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Discharge Patient</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Patient Hero Banner ─────────────────────────────────────── */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-navy-900 via-navy-900 to-navy-950 border border-white/10 shadow-xl relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Patient Core Info */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-accent/20 border-2 border-accent/40 flex items-center justify-center text-accent font-black text-2xl flex-shrink-0 shadow-lg shadow-accent/10">
              {patientInitials}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
                  {admission.patientName}
                </h1>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-white/[0.08] text-gray-200 border border-white/15 font-semibold">
                  {admission.patientCode || `PT-${admission.patientId}`}
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${getStatusColor(
                    admission.admissionStatus
                  )}`}
                >
                  {admission.admissionStatus === 'UNDER_OBSERVATION' ? 'Under Observation' : admission.admissionStatus}
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full border font-bold ${getAcuityColor(
                    admission.acuityLevel
                  )}`}
                >
                  {admission.acuityLevel} Acuity
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-300">
                <span>
                  {formatGender(admission.patientGender || admission.gender)} • {admission.patientAge || admission.age} years
                </span>
                <span className="text-gray-500">•</span>
                <span>
                  Blood Group: <strong className="text-accent">{formatBloodGroup(admission.bloodGroup)}</strong>
                </span>
                {patient?.emergencyContactPhone && (
                  <>
                    <span className="text-gray-500">•</span>
                    <span className="flex items-center gap-1 text-gray-300">
                      <Phone className="w-3 h-3 text-accent" />
                      <span>{patient.emergencyContactPhone}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Admission ID & Stay Duration Pill */}
          <div className="flex flex-wrap items-center gap-3 bg-white/[0.03] border border-white/10 p-3 rounded-xl">
            <div className="border-r border-white/10 pr-4">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block">
                Admission Number
              </span>
              <span className="font-mono text-sm font-bold text-white tracking-wide">
                {admission.admissionNumber}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block flex items-center gap-1">
                <Clock className="w-3 h-3 text-accent" />
                <span>Length of Stay</span>
              </span>
              <span className="text-sm font-bold text-accent font-mono">
                {calculateLengthOfStay(admission.admissionDateTime)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs: Clinical Details vs Timeline ───────────────────────── */}
      <div className="flex items-center gap-3 border-b border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === 'details'
              ? 'text-accent border-b-2 border-accent'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Inpatient Clinical Details</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('timeline')}
          className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === 'timeline'
              ? 'text-accent border-b-2 border-accent'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Admission Timeline</span>
          {timeline.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-accent/20 text-accent font-bold">
              {timeline.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────── */}
      {activeTab === 'details' ? (
        <div className="space-y-6">
          {/* Grid 1: Ward & Bed Placement + Admission Profile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ward & Bed Card */}
            <div className="p-5 rounded-2xl bg-navy-900/90 border border-white/10 space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Building2 className="w-4 h-4 text-accent" />
                  <span>Ward & Bed Allocation</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
                  Active Bed
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <span className="text-gray-400 text-[11px] block mb-1">Ward Name</span>
                  <span className="font-semibold text-white block text-sm">{admission.wardName}</span>
                  <span className="text-[10px] text-gray-500 block mt-0.5">
                    {admission.wardDepartment || 'Inpatient Services'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <span className="text-gray-400 text-[11px] block mb-1">Assigned Bed</span>
                  <span className="font-mono font-bold text-accent block text-sm flex items-center gap-1.5">
                    <Bed className="w-4 h-4 text-accent" />
                    <span>{admission.bedNumber}</span>
                  </span>
                  <span className="text-[10px] text-gray-500 block mt-0.5">
                    {(admission as any).bedType || 'Standard Care'}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-gray-400">
                <span>Floor / Unit Code: <strong className="text-white font-mono">{admission.wardNumber || 'W-01'}</strong></span>
                {!isDischarged && onTransferBed && (
                  <button
                    type="button"
                    onClick={() => onTransferBed(admission)}
                    className="text-xs text-accent hover:underline flex items-center gap-1 font-semibold"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Change Bed</span>
                  </button>
                )}
              </div>
            </div>

            {/* Admission Information Card */}
            <div className="p-5 rounded-2xl bg-navy-900/90 border border-white/10 space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Stethoscope className="w-4 h-4 text-accent" />
                  <span>Admission Profile & Doctor</span>
                </div>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-white/[0.08] text-gray-200 border border-white/15 font-semibold">
                  {admission.admissionNumber}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <span className="text-gray-400 text-[11px] block mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-accent" />
                    <span>Admission Date</span>
                  </span>
                  <span className="font-semibold text-white block">{formattedAdmitDate}</span>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <span className="text-gray-400 text-[11px] block mb-1 flex items-center gap-1">
                    <User className="w-3 h-3 text-accent" />
                    <span>Attending Physician</span>
                  </span>
                  <span className="font-semibold text-white block">
                    {admission.doctorName ? `Dr. ${admission.doctorName.replace(/^Dr\.\s*/i, '')}` : 'Attending MD'}
                  </span>
                  <span className="text-[10px] text-gray-500 block mt-0.5">Primary Inpatient Care</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-gray-400">
                <span>Discharge Status: <strong className="text-white">{isDischarged ? 'Discharged' : 'Active Inpatient'}</strong></span>
                {admission.dischargeDate && (
                  <span className="text-gray-400">
                    Discharged on {new Date(admission.dischargeDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Grid 2: Diagnosis, Chief Complaint & Clinical Notes */}
          <div className="p-5 rounded-2xl bg-navy-900/90 border border-white/10 space-y-4 shadow-lg">
            <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-white/10 pb-3">
              <Activity className="w-4 h-4 text-accent" />
              <span>Diagnosis, Presenting Symptoms & Clinical Assessment</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Primary Diagnosis */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
                <span className="text-xs font-semibold text-accent uppercase tracking-wider block">
                  Primary Admission Diagnosis
                </span>
                <p className="text-sm font-semibold text-white leading-relaxed">
                  {admission.admissionDiagnosis || 'Clinical investigation ongoing'}
                </p>
              </div>

              {/* Chief Complaint */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
                <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider block">
                  Chief Complaint at Presentation
                </span>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {admission.chiefComplaint || 'Patient admitted for in-hospital monitoring'}
                </p>
              </div>
            </div>

            {/* Doctor's Clinical Notes / Nursing Handover Instructions */}
            {(admission.nursingHandoverInstructions || (admission as any).clinicalNotes) && (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                  Physician Admission Notes & Instructions
                </span>
                <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">
                  {admission.nursingHandoverInstructions || (admission as any).clinicalNotes}
                </p>
              </div>
            )}
          </div>

          {/* Grid 3: Quick Navigation to Patient EMR Modules & Medical Records */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 border border-white/10 shadow-lg space-y-4">
            {/* Header with Title and Direct Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-accent" />
                  <span>Inpatient Care Shortcuts & Medical Records</span>
                </span>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Direct clinical workflows, active medications, and diagnostic investigation records
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPrescriptionModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary-light text-xs font-semibold transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Prescribe Medication</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowLabModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Order / Add Lab Test</span>
                </button>
              </div>
            </div>

            {/* Action Feedback Banner */}
            {actionSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                <span>{actionSuccessMsg}</span>
              </div>
            )}

            {/* 4 Shortcut Buttons */}
            {onNavigateToPatient && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigateToPatient(resolvedPatientId, 'overview')}
                  className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-accent/15 border border-white/10 hover:border-accent/40 text-left transition-all group cursor-pointer"
                >
                  <FileText className="w-5 h-5 text-accent mb-2 group-hover:scale-110 transition-transform" />
                  <div className="font-semibold text-white text-xs group-hover:text-accent">Full EMR Chart</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Summary & History</div>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateToPatient(resolvedPatientId, 'prescriptions')}
                  className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-primary-light/15 border border-white/10 hover:border-primary-light/40 text-left transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Pill className="w-5 h-5 text-primary-light group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary-light font-bold">
                      {activeMeds.length}
                    </span>
                  </div>
                  <div className="font-semibold text-white text-xs group-hover:text-primary-light">Prescriptions</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Active Medications</div>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateToPatient(resolvedPatientId, 'labs')}
                  className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-emerald-400/15 border border-white/10 hover:border-emerald-400/40 text-left transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <HeartPulse className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                      {labReports.length}
                    </span>
                  </div>
                  <div className="font-semibold text-white text-xs group-hover:text-emerald-300">Vitals & Labs</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Diagnostics & Labs</div>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateToPatient(resolvedPatientId, 'discharge-summary')}
                  className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-emerald-500/15 border border-white/10 hover:border-emerald-500/40 text-left transition-all group cursor-pointer"
                >
                  <LogOut className="w-5 h-5 text-emerald-300 mb-2 group-hover:scale-110 transition-transform" />
                  <div className="font-semibold text-white text-xs group-hover:text-emerald-200">Discharge</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Summary & Orders</div>
                </button>
              </div>
            )}

            {/* Inpatient Medical Records: Active Medications & Lab Reports */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
              {/* Card 1: Active Prescriptions & Medications */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-primary-light" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Active Inpatient Medications ({activeMeds.length})
                    </span>
                  </div>
                  {onNavigateToPatient && (
                    <button
                      type="button"
                      onClick={() => onNavigateToPatient(resolvedPatientId, 'prescriptions')}
                      className="text-[11px] text-primary-light hover:underline font-semibold"
                    >
                      View All in Chart →
                    </button>
                  )}
                </div>

                {activeMeds.length === 0 ? (
                  <div className="py-6 text-center text-xs text-gray-400 space-y-2">
                    <p>No active medications entered yet for this inpatient.</p>
                    <button
                      type="button"
                      onClick={() => setShowPrescriptionModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/20 text-primary-light text-xs font-semibold hover:bg-primary/30"
                    >
                      <Plus className="w-3.5 h-3.5" /> Prescribe First Medicine
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {activeMeds.map((med: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white font-mono">
                              {getTallManName(med.name)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-accent/20 text-accent font-semibold text-[10px]">
                              {med.dosage}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400">
                            {med.frequency || 'Daily schedule'} {med.startDate ? `· Started ${med.startDate}` : ''}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-bold flex-shrink-0">
                          Active
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card 2: Diagnostic Laboratory Reports */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Diagnostic Lab Reports ({labReports.length})
                    </span>
                  </div>
                  {onNavigateToPatient && (
                    <button
                      type="button"
                      onClick={() => onNavigateToPatient(resolvedPatientId, 'labs')}
                      className="text-[11px] text-emerald-300 hover:underline font-semibold"
                    >
                      View All in Chart →
                    </button>
                  )}
                </div>

                {labReports.length === 0 ? (
                  <div className="py-6 text-center text-xs text-gray-400 space-y-2">
                    <p>No laboratory reports recorded yet for this inpatient.</p>
                    <button
                      type="button"
                      onClick={() => setShowLabModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/30"
                    >
                      <Plus className="w-3.5 h-3.5" /> Record First Lab Test
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {labReports.map((lab: any) => {
                      const statusColor =
                        lab.status === 'Critical'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : lab.status === 'Abnormal'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : lab.status === 'Pending'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

                      return (
                        <div
                          key={lab.id}
                          className="p-3 rounded-lg bg-white/[0.03] border border-white/5 flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5">
                            <p className="font-bold text-white text-xs">{lab.testName}</p>
                            <p className="text-sm font-semibold text-teal-300">
                              {lab.result} {lab.unit && lab.unit !== '-' ? <span className="text-xs text-gray-400">{lab.unit}</span> : ''}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {lab.date} {lab.orderedBy ? `· ${lab.orderedBy}` : ''}
                            </p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColor} flex-shrink-0`}>
                            {lab.status || 'Normal'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modals for Direct Inpatient Creation */}
            <CreatePrescriptionModal
              isOpen={showPrescriptionModal}
              onClose={() => setShowPrescriptionModal(false)}
              patient={fallbackPatient}
              onPrescriptionCreated={handlePrescriptionCreated}
            />

            <CreateLabReportModal
              isOpen={showLabModal}
              onClose={() => setShowLabModal(false)}
              patient={fallbackPatient}
              onLabReportCreated={handleLabReportCreated}
            />
          </div>
        </div>
      ) : (
        /* ── Timeline Tab ───────────────────────────────────────────── */
        <div className="p-6 rounded-2xl bg-navy-900/90 border border-white/10 shadow-lg">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent" />
                <span>Hospital Stay Chronology & Clinical Events</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Audit log of all ward assignments, triage updates, doctor notes, and clinical events
              </p>
            </div>
            <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-white/[0.05] text-accent border border-white/10">
              {timeline.length} Recorded Events
            </span>
          </div>

          {loadingTimeline ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-2">
              <Clock className="w-6 h-6 animate-spin text-accent" />
              <span className="text-xs">Loading clinical timeline...</span>
            </div>
          ) : timeline.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Clock className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p className="text-xs">No timeline events recorded yet for this admission.</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
              {timeline.map((event, idx) => {
                const eventDate = event.timestamp
                  ? new Date(event.timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Recorded';

                return (
                  <div key={event.id || idx} className="relative group">
                    {/* Timeline bullet */}
                    <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-navy-950 border-2 border-accent flex items-center justify-center group-hover:scale-110 transition-transform">
                      <div className="w-2 h-2 rounded-full bg-accent" />
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                        <span className="text-xs font-bold text-white tracking-wide">
                          {event.title || 'Inpatient Event'}
                        </span>
                        <span className="text-[11px] font-mono text-gray-400">{eventDate}</span>
                      </div>

                      <p className="text-xs text-gray-300 leading-relaxed">
                        {event.description}
                      </p>

                      {event.diagnosis && (
                        <div className="mt-2 text-[11px] text-accent">
                          <strong>Diagnosis:</strong> {event.diagnosis}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
