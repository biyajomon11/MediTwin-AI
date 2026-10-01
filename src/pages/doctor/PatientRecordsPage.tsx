import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, SortAsc, ChevronRight, ArrowLeft, User, Phone,
  Mail, MapPin, Calendar, AlertTriangle, Pill, FileText, FlaskConical,
  CheckCircle2, XCircle, Plus, Save, Loader2, Users,
  Activity, FolderOpen, Printer, ShieldAlert, StopCircle, Stethoscope,
  Eye, Download, X, HeartPulse, ArrowUp, ArrowDown, RotateCcw, FileCheck,
  Clock,
} from 'lucide-react';
import type {
  DoctorPatient, PatientStatus, ClinicalNote, Prescription, MedicalDocument,
} from '../../types';
import { getPatients, addClinicalNote, discontinuePrescription, updatePatientBed, type PatientSortField } from '../../services/doctorService';
import { CreatePrescriptionModal } from '../../components/doctor/CreatePrescriptionModal';
import { DischargeSummaryTab } from '../../components/doctor/DischargeSummaryTab';
import { DoctorNursingSummaryTab } from '../../components/doctor/DoctorNursingSummaryTab';
import { getTallManName } from '../../utils/medicationSafety';
import { formatPatientId, isPatientInpatient } from '../../utils/patientUtils';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const fmtDate = (d?: string) => {
  if (!d) return 'Aug 2026';
  try {
    const parsed = new Date(d);
    if (isNaN(parsed.getTime())) return d || 'Aug 2026';
    return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d || 'Aug 2026';
  }
};

export interface PatientAppointmentInfo {
  status: 'Completed' | 'Cancelled' | 'Scheduled' | 'Pending' | 'None';
  date?: string;
  time?: string;
  doctorName?: string;
  department?: string;
  reason?: string;
  isUpcoming: boolean;
}

export const getPatientAppointmentInfo = (p: DoctorPatient): PatientAppointmentInfo => {
  const todayStr = new Date().toISOString().split('T')[0];

  if (Array.isArray(p.appointments) && p.appointments.length > 0) {
    // Check if there is an upcoming / scheduled / pending appointment that is TODAY OR IN COMING DATES
    const upcoming = p.appointments
      .filter((a) => {
        const s = (a.status || '').toLowerCase();
        const isScheduled = s === 'scheduled' || s === 'upcoming' || s === 'pending' || s === 'confirmed';
        const isTodayOrFuture = a.date ? a.date >= todayStr : false;
        return isScheduled && isTodayOrFuture;
      })
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0];

    if (upcoming) {
      const s = (upcoming.status || '').toLowerCase();
      const normStatus: PatientAppointmentInfo['status'] =
        s === 'pending' ? 'Pending' : 'Scheduled';
      return {
        status: normStatus,
        date: upcoming.date,
        time: upcoming.time || '10:00 AM',
        doctorName: upcoming.doctorName,
        department: upcoming.department,
        reason: upcoming.reason,
        isUpcoming: true,
      };
    }

    // If nextAppointment is provided on the patient and is TODAY OR IN COMING DATES
    if (p.nextAppointment && p.nextAppointment >= todayStr) {
      return {
        status: 'Scheduled',
        date: p.nextAppointment,
        time: '10:00 AM',
        doctorName: 'Attending Physician',
        department: p.department || 'General Medicine',
        reason: 'Scheduled Consultation',
        isUpcoming: true,
      };
    }

    // Else take the latest past appointment (marked as isUpcoming: false)
    const latest = p.appointments[0];
    const s = (latest.status || '').toLowerCase();
    let normStatus: PatientAppointmentInfo['status'] = 'Completed';
    if (s.includes('cancel')) normStatus = 'Cancelled';
    else if (s.includes('no-show')) normStatus = 'Cancelled';

    return {
      status: normStatus,
      date: latest.date,
      time: latest.time || '10:00 AM',
      doctorName: latest.doctorName,
      department: latest.department,
      reason: latest.reason,
      isUpcoming: false,
    };
  }

  // Fallback to p.nextAppointment only if it's TODAY OR IN COMING DATES
  if (p.nextAppointment && p.nextAppointment >= todayStr) {
    return {
      status: 'Scheduled',
      date: p.nextAppointment,
      time: '10:00 AM',
      doctorName: 'Attending Physician',
      department: p.department || 'General Medicine',
      reason: 'Scheduled Consultation',
      isUpcoming: true,
    };
  }

  return {
    status: 'None',
    isUpcoming: false,
  };
};

const STATUS_COLORS: Record<PatientStatus, string> = {
  'Active':             'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'Admitted':           'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'Critical':           'bg-rose-500/20 text-rose-300 border-rose-500/30',
  'Under Observation':  'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'Discharged':         'bg-gray-500/20 text-gray-300 border-gray-500/30',
};

const LAB_COLORS = {
  Normal:   'bg-emerald-500/20 text-emerald-300',
  Abnormal: 'bg-amber-500/20 text-amber-300',
  Critical: 'bg-rose-500/20 text-rose-300',
  Pending:  'bg-gray-500/20 text-gray-300',
};

const NOTE_TYPE_COLORS = {
  'Progress Note':      'bg-blue-500/20 text-blue-300',
  'Consultation':       'bg-purple-500/20 text-purple-300',
  'Discharge Summary':  'bg-emerald-500/20 text-emerald-300',
  'Referral':           'bg-amber-500/20 text-amber-300',
  'General':            'bg-gray-500/20 text-gray-300',
};

const TABS = [
  { id: 'overview',          label: 'Overview',              icon: User         },
  { id: 'discharge-summary', label: 'Discharge Summary',     icon: FileCheck    },
  { id: 'nursing-summary',   label: 'Nursing Summary',       icon: FileText     },
  { id: 'labs',          label: 'Lab Reports',           icon: FlaskConical },
  { id: 'appointments',  label: 'Appointments',          icon: Calendar     },
  { id: 'prescriptions', label: 'Prescriptions',         icon: Pill         },
  { id: 'notes',         label: 'Clinical Notes',        icon: FileText     },
  { id: 'documents',     label: 'Medical Documents',     icon: FolderOpen   },
];

const DEPARTMENTS = ['Cardiology', 'Neurology', 'General Medicine', 'Oncology', 'Pediatrics'];
const STATUSES: PatientStatus[] = ['Active', 'Admitted', 'Critical', 'Under Observation', 'Discharged'];

export interface PatientSortOption {
  id: PatientSortField;
  label: string;
  defaultOrder: 'asc' | 'desc';
  descLabel: string;
  ascLabel: string;
}

const SORT_OPTIONS: PatientSortOption[] = [
  {
    id: 'criticalFirst',
    label: 'Triage Priority (Critical First)',
    defaultOrder: 'desc',
    descLabel: 'Critical First (Highest Acuity)',
    ascLabel: 'Stable / Discharged First (Lowest Acuity)',
  },
  {
    id: 'name',
    label: 'Name',
    defaultOrder: 'asc',
    descLabel: 'Z → A',
    ascLabel: 'A → Z',
  },
  {
    id: 'lastVisit',
    label: 'Last Visit',
    defaultOrder: 'desc',
    descLabel: 'Newest Visit First',
    ascLabel: 'Oldest Visit First',
  },
  {
    id: 'nextAppointment',
    label: 'Next Appt',
    defaultOrder: 'asc',
    descLabel: 'Furthest / None First',
    ascLabel: 'Soonest Upcoming First',
  },
  {
    id: 'age',
    label: 'Age',
    defaultOrder: 'desc',
    descLabel: 'Oldest Patients First',
    ascLabel: 'Youngest Patients First',
  },
  {
    id: 'labAlerts',
    label: 'Lab Alerts',
    defaultOrder: 'desc',
    descLabel: 'Critical & Pending Labs First',
    ascLabel: 'Normal Labs First',
  },
  {
    id: 'id',
    label: 'Patient ID',
    defaultOrder: 'asc',
    descLabel: 'Highest ID First',
    ascLabel: 'Lowest ID First (IP-001, OP-001...)',
  },
];

// ─────────────────────────────────────────────────────────────
// Patient Record Detail
// ─────────────────────────────────────────────────────────────
const PatientRecord: React.FC<{
  patient: DoctorPatient;
  onBack: () => void;
  onNoteAdded: (note: ClinicalNote) => void;
  initialTab?: string;
}> = ({ patient, onBack, onNoteAdded, initialTab = 'overview' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showNoteForm, setShowNoteForm] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState<ClinicalNote['type']>('Progress Note');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  // ── Prescription CPOE States ──
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(patient.prescriptions || []);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [rxSuccessMsg, setRxSuccessMsg] = useState('');
  const [discontinueRxId, setDiscontinueRxId] = useState<string | null>(null);
  const [discontinueReason, setDiscontinueReason] = useState('Course completed / replaced with alternative therapy');
  const [discontinuing, setDiscontinuing] = useState(false);

  // ── Document Preview States ──
  const [selectedDoc, setSelectedDoc] = useState<MedicalDocument | null>(null);

  // ── Bed & Ward Assignment States ──
  const [currentWard, setCurrentWard] = useState(patient.ward || '');
  const [isEditingBed, setIsEditingBed] = useState(false);
  const [selectedWardOption, setSelectedWardOption] = useState(() => {
    if (!patient.ward) return 'Outpatient';
    if (patient.ward.includes('ICU')) return 'ICU';
    const match = patient.ward.match(/Ward\s*([0-9]+)/i);
    return match ? `Ward ${match[1]}` : 'Ward 1';
  });
  const [selectedBedInput, setSelectedBedInput] = useState(() => {
    if (patient.bedNumber) return patient.bedNumber;
    const match = (patient.ward || '').match(/Bed\s*([0-9]+)/i);
    return match ? `Bed ${match[1]}` : 'Bed 01';
  });
  const [savingBed, setSavingBed] = useState(false);
  const [bedSuccessMsg, setBedSuccessMsg] = useState('');

  useEffect(() => {
    setCurrentWard(patient.ward || '');
    if (!patient.ward) {
      setSelectedWardOption('Outpatient');
      setSelectedBedInput('');
    } else if (patient.ward.includes('ICU')) {
      setSelectedWardOption('ICU');
      const match = patient.ward.match(/Bed\s*([0-9]+)/i);
      setSelectedBedInput(match ? `Bed ${match[1]}` : 'Bed 02');
    } else {
      const match = patient.ward.match(/Ward\s*([0-9]+)/i);
      setSelectedWardOption(match ? `Ward ${match[1]}` : 'Ward 1');
      const bMatch = patient.ward.match(/Bed\s*([0-9]+)/i);
      setSelectedBedInput(bMatch ? `Bed ${bMatch[1]}` : 'Bed 01');
    }
  }, [patient]);

  const handleSaveBed = async () => {
    setSavingBed(true);
    try {
      let newWard: string | null = null;
      let newBed: string | null = null;
      let newStatus = patient.status;

      if (selectedWardOption === 'Outpatient') {
        newWard = null;
        newBed = null;
        newStatus = 'Active';
      } else {
        const bedNumClean = selectedBedInput.trim()
          ? (selectedBedInput.trim().toLowerCase().startsWith('bed') ? selectedBedInput.trim() : `Bed ${selectedBedInput.trim()}`)
          : 'Bed 01';
        newWard = `${selectedWardOption} – ${bedNumClean}`;
        newBed = bedNumClean;
        if (selectedWardOption === 'ICU') {
          newStatus = 'Critical';
        } else if (newStatus === 'Active' || newStatus === 'Discharged') {
          newStatus = 'Admitted';
        }
      }

      const res = await updatePatientBed(patient.id, {
        ward: newWard,
        bedNumber: newBed,
        admissionStatus: newStatus,
      });

      if (res.success) {
        setCurrentWard(newWard || '');
        patient.ward = newWard || undefined;
        patient.bedNumber = newBed || undefined;
        patient.status = newStatus;
        setIsEditingBed(false);
        setBedSuccessMsg(`Bed successfully updated to ${newWard || 'Outpatient'} in PostgreSQL.`);
        setTimeout(() => setBedSuccessMsg(''), 4000);
      }
    } catch (e) {
      console.error('Failed to update bed:', e);
    } finally {
      setSavingBed(false);
    }
  };

  useEffect(() => {
    setPrescriptions(patient.prescriptions || []);
  }, [patient]);

  const handlePrescriptionCreated = (newRx: Prescription) => {
    setPrescriptions((prev) => [newRx, ...prev]);
    setRxSuccessMsg(`Prescription #${newRx.id} successfully authorized and synced across Patient & Nurse portals.`);
    setTimeout(() => setRxSuccessMsg(''), 5000);
  };

  const handleDiscontinueConfirm = async () => {
    if (!discontinueRxId) return;
    setDiscontinuing(true);
    try {
      await discontinuePrescription(patient.id, discontinueRxId, discontinueReason);
      setPrescriptions((prev) =>
        prev.map((r) => (r.id === discontinueRxId ? { ...r, status: 'Discontinued' } : r))
      );
      setDiscontinueRxId(null);
      setRxSuccessMsg('Prescription successfully discontinued and archived.');
      setTimeout(() => setRxSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error discontinuing prescription:', err);
    } finally {
      setDiscontinuing(false);
    }
  };

  const handlePrintPrescription = (rx: Prescription) => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Electronic Prescription - ${patient.firstName} ${patient.lastName}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; background: #fff; }
          .header { border-bottom: 2px solid #0284c7; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-start; }
          .hospital-name { font-size: 22px; font-weight: bold; color: #0284c7; }
          .meta-info { font-size: 12px; color: #64748b; }
          .patient-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 25px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; }
          .rx-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          .rx-table th { background: #0284c7; color: white; text-align: left; padding: 10px; font-size: 12px; }
          .rx-table td { border-bottom: 1px solid #e2e8f0; padding: 12px 10px; font-size: 13px; }
          .footer { margin-top: 50px; border-top: 1px solid #cbd5e1; padding-top: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
          .signature-box { text-align: right; }
          .sig-line { width: 220px; border-bottom: 1px solid #334155; margin-bottom: 5px; }
          .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; background: #e0f2fe; color: #0369a1; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="hospital-name">🏥 MEDITWIN HEALTHCARE SYSTEM</div>
            <div class="meta-info">Tertiary Care Hospital & Research Center · Computerized Physician Order Entry (CPOE)</div>
          </div>
          <div style="text-align: right;">
            <div class="badge">Official Hospital Prescription</div>
            <div class="meta-info" style="margin-top: 5px;">Rx ID: <strong>${rx.id}</strong></div>
            <div class="meta-info">Date: ${fmtDate(rx.date)}</div>
          </div>
        </div>

        <div class="patient-box">
          <div><strong>Patient Name:</strong> ${patient.firstName} ${patient.lastName}</div>
          <div><strong>Patient ID:</strong> #${patient.id}</div>
          <div><strong>Age / Gender:</strong> ${patient.age} Yrs / ${patient.gender}</div>
          <div><strong>Attending Physician:</strong> ${rx.doctorName}</div>
          <div><strong>Known Allergies:</strong> ${patient.allergies?.length ? patient.allergies.map(a => typeof a === 'string' ? a : a.substance).join(', ') : 'NKDA (No Known Drug Allergies)'}</div>
          <div><strong>Prescription Status:</strong> ${rx.status}</div>
        </div>

        <h3 style="color: #0f172a; margin-bottom: 10px;">℞ Prescribed Medications</h3>
        <table class="rx-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Medication Name (Tall Man)</th>
              <th>Strength / Dosage</th>
              <th>Frequency & Timing</th>
              <th>Instructions</th>
            </tr>
          </thead>
          <tbody>
            ${rx.medications.map((m, i) => `
              <tr>
                <td>${i + 1}</td>
                <td><strong>${getTallManName(m.name)}</strong></td>
                <td>${m.dosage}</td>
                <td>${m.frequency}</td>
                <td>Take as directed by physician with water.</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${rx.notes ? `<div style="background: #f1f5f9; padding: 12px; border-radius: 6px; font-size: 12px; margin-bottom: 25px;"><strong>Clinical Remarks:</strong> ${rx.notes}</div>` : ''}

        <div class="footer">
          <div style="font-size: 11px; color: #94a3b8;">
            * Verified electronic prescription generated by MediTwin AI CPOE system.
          </div>
          <div class="signature-box">
            <div class="sig-line"></div>
            <div style="font-weight: bold; font-size: 13px;">${rx.doctorName}</div>
            <div style="font-size: 11px; color: #64748b;">Licensed Attending Physician</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    setShowConfirm(true);
  };

  const handleConfirmNote = async () => {
    setSavingNote(true);
    try {
      const savedNote = await addClinicalNote(patient.id, {
        content: noteText.trim(),
        type: noteType,
      });
      onNoteAdded(savedNote);
      setShowConfirm(false);
      setShowNoteForm(false);
      setNoteText('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Error saving note:', e);
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Patient List
        </button>
      </div>

      {/* Patient Banner */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 border border-accent/30"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white text-2xl font-black flex-shrink-0">
              {patient.firstName?.[0] || 'P'}{patient.lastName?.[0] || ''}
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">{patient.firstName} {patient.lastName}</h2>
              <p className="text-sm text-gray-400"><span className="font-mono font-bold text-white bg-white/10 px-1.5 py-0.5 rounded">{formatPatientId(patient)}</span> • <span className={isPatientInpatient(patient.status, currentWard) ? 'text-purple-300 font-semibold' : 'text-teal-300 font-semibold'}>{isPatientInpatient(patient.status, currentWard) ? 'Inpatient (IPD)' : 'Outpatient (OPD)'}</span> • {patient.age} yrs • {typeof patient.gender === 'string' ? patient.gender : patient.gender?.name || 'Unspecified'}</p>
              <p className="text-sm text-gray-400">{patient.department || 'General Medicine'} {currentWard ? `• ${currentWard}` : '• Outpatient (No Bed Assigned)'}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${STATUS_COLORS[patient.status] || 'border-white/20 text-gray-300'}`}>
              {patient.status}
            </span>
            {patient.status === 'Discharged' && (
              <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1 shadow-sm">
                <Calendar className="w-3 h-3 text-amber-400" />
                Discharged: {fmtDate(patient.dischargeDate || patient.lastVisit)}
              </span>
            )}
            {(() => {
              const apt = getPatientAppointmentInfo(patient);
              if (apt.isUpcoming && apt.date) {
                return (
                  <span className="px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-1 shadow-sm">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    Next Appt: {fmtDate(apt.date)} · {apt.time || '10:00 AM'} ({apt.status})
                  </span>
                );
              }
              return null;
            })()}
            {patient.primaryCondition && (
              <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium">
                {patient.primaryCondition}
              </span>
            )}
            {Array.isArray(patient.allergies) && patient.allergies.some(a => (typeof a === 'object' && a?.severity === 'Severe')) && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold">
                <AlertTriangle className="w-3 h-3" /> Severe Allergy
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Success Toast */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm"
          >
            <CheckCircle2 className="w-4 h-4" /> Clinical note saved successfully.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === id
                ? 'bg-primary text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Appointment & Clinical Status Overview Banner (Full Width) */}
            {(() => {
              const aptInfo = getPatientAppointmentInfo(patient);
              const isDischarged = patient.status === 'Discharged';
              const dischargeDateStr = patient.dischargeDate || (isDischarged ? patient.lastVisit : undefined);
              const aptDateFormatted = fmtDate(aptInfo.date || patient.nextAppointment || patient.lastVisit);
              const aptTimeStr = aptInfo.time || '10:00 AM';

              return (
                <div className="md:col-span-2 glass-card p-5 border border-white/10 bg-gradient-to-r from-navy-900/90 via-navy-900/70 to-slate-900/80 rounded-2xl shadow-xl space-y-4">
                  {/* Top row: Section title & quick status chips */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-white/10 gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300 shadow-sm">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          Appointment & Clinical Status Overview
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md">
                            Live Status
                          </span>
                        </h3>
                        <p className="text-xs text-gray-400">
                          Real-time clinical consultation schedule and patient admission tracking
                        </p>
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-gray-400 font-medium mr-1">Appt:</span>
                      {aptInfo.status === 'Pending' && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                          Pending
                        </span>
                      )}
                      {aptInfo.status === 'Scheduled' && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-cyan-400" />
                          Scheduled
                        </span>
                      )}
                      {aptInfo.status === 'Completed' && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          Completed
                        </span>
                      )}
                      {aptInfo.status === 'Cancelled' && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          Cancelled
                        </span>
                      )}
                      {aptInfo.status === 'None' && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-gray-400 border border-white/10">
                          No Appointment
                        </span>
                      )}

                      <span className="text-xs text-gray-400 font-medium ml-2 mr-1">Care:</span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${
                          isDischarged
                            ? 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                            : STATUS_COLORS[patient.status] || 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {patient.status}
                      </span>
                    </div>
                  </div>

                  {/* Grid of Key Status Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* 1. Appointment Status Card */}
                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between hover:border-cyan-500/30 transition-all">
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span className="font-semibold text-gray-300">Appointment Status</span>
                        <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                      <div className="my-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-black capitalize ${
                              aptInfo.status === 'Pending'
                                ? 'text-amber-300'
                                : aptInfo.status === 'Completed'
                                ? 'text-emerald-300'
                                : aptInfo.status === 'Cancelled'
                                ? 'text-rose-300'
                                : aptInfo.status === 'Scheduled'
                                ? 'text-cyan-300'
                                : 'text-gray-300'
                            }`}
                          >
                            {aptInfo.status === 'None' ? 'No Appointment' : aptInfo.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 line-clamp-1">
                          {aptInfo.isUpcoming
                            ? 'Upcoming clinical consultation'
                            : aptInfo.status === 'Completed'
                            ? 'Consultation finished & documented'
                            : aptInfo.status === 'Cancelled'
                            ? 'Appointment cancelled'
                            : 'Awaiting scheduled appointment'}
                        </p>
                      </div>
                      <div className="text-[11px] font-mono text-cyan-300/80 pt-2 border-t border-white/5 truncate">
                        {aptInfo.reason || 'General Medical Consultation'}
                      </div>
                    </div>

                    {/* 2. Appointment Time with Date (Mandatory Requirement) */}
                    <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/25 flex flex-col justify-between hover:border-cyan-500/40 transition-all">
                      <div className="flex items-center justify-between text-xs text-cyan-300/80">
                        <span className="font-semibold text-cyan-200">
                          {aptInfo.isUpcoming ? 'Next Appointment Date & Time' : 'Last Consultation Date & Time'}
                        </span>
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                      <div className="my-2">
                        <div className="text-sm font-black text-white flex items-center gap-1.5 flex-wrap">
                          <Calendar className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                          <span>{aptDateFormatted}</span>
                        </div>
                        <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 mt-1">
                          <Clock className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                          <span>{aptTimeStr}</span>
                        </div>
                      </div>
                      <div className="text-[11px] text-gray-300 pt-2 border-t border-cyan-500/20 truncate">
                        {aptInfo.doctorName || 'Attending Physician'} · {aptInfo.department || patient.department || 'General Medicine'}
                      </div>
                    </div>

                    {/* 3. Clinical Admission / Care Status (Active / Discharged / etc.) */}
                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between hover:border-emerald-500/30 transition-all">
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span className="font-semibold text-gray-300">Care / Admission Status</span>
                        <Activity className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="my-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-black ${
                              patient.status === 'Active'
                                ? 'text-emerald-300'
                                : isDischarged
                                ? 'text-gray-300'
                                : patient.status === 'Critical'
                                ? 'text-rose-300'
                                : 'text-blue-300'
                            }`}
                          >
                            {patient.status}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            ({isPatientInpatient(patient.status, currentWard) ? 'Inpatient' : 'Outpatient'})
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 line-clamp-1">
                          {currentWard ? currentWard : 'Outpatient (No Bed Assigned)'}
                        </p>
                      </div>
                      <div className="text-[11px] text-gray-400 pt-2 border-t border-white/5 truncate">
                        Dept: <strong className="text-gray-200">{patient.department || 'General Medicine'}</strong>
                      </div>
                    </div>

                    {/* 4. Discharge Status & Discharged Date (Mandatory Requirement) */}
                    <div
                      className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                        isDischarged
                          ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/50'
                          : 'bg-white/[0.03] border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-semibold ${isDischarged ? 'text-amber-300' : 'text-gray-300'}`}>
                          Discharge Status
                        </span>
                        <FileCheck className={`w-3.5 h-3.5 ${isDischarged ? 'text-amber-400' : 'text-gray-400'}`} />
                      </div>
                      <div className="my-2">
                        {isDischarged ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                Discharged
                              </span>
                            </div>
                            <div className="text-xs font-bold text-white mt-1.5 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                              <span>Discharged: {fmtDate(dischargeDateStr)}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                              <span>Active In Care</span>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-1">
                              Patient has not been discharged. Under active clinical management.
                            </p>
                          </>
                        )}
                      </div>
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                        {isDischarged ? (
                          <button
                            type="button"
                            onClick={() => setActiveTab('discharge-summary')}
                            className="text-amber-300 hover:text-amber-200 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>View Summary</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-gray-500">Stay ongoing</span>
                        )}
                        <span className="text-gray-500 text-[10px]">
                          {isDischarged ? 'Discharge Logged' : 'CPOE Monitored'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Discharged Notice Alert (if discharged) */}
                  {isDischarged && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 flex-shrink-0">
                          <FileCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-amber-200">
                            Patient Discharged on {fmtDate(dischargeDateStr)}
                          </p>
                          <p className="text-gray-300 text-[11px]">
                            Hospital stay completed. Follow-up appointments and post-discharge regimen recorded in EHR.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('discharge-summary')}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold text-xs flex items-center gap-1.5 transition-all flex-shrink-0 self-start sm:self-auto cursor-pointer"
                      >
                        <span>Open Discharge Summary Tab</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Contact */}
            <div className="glass-card p-5 border border-white/10 space-y-3">
              <h3 className="text-sm font-bold text-white">Contact Information</h3>
              {patient.phone && <p className="text-xs text-gray-300 flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-accent" />{patient.phone}</p>}
              {patient.email && <p className="text-xs text-gray-300 flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-accent" />{patient.email}</p>}
              {patient.address && <p className="text-xs text-gray-300 flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-accent" />{patient.address}</p>}
              {patient.bloodGroup && (
                <p className="text-xs text-gray-300 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-accent" />Blood Group: <span className="text-white font-semibold">{typeof patient.bloodGroup === 'string' ? patient.bloodGroup : patient.bloodGroup?.name}</span>
                </p>
              )}
            </div>

            {/* Emergency */}
            <div className="glass-card p-5 border border-white/10 space-y-3">
              <h3 className="text-sm font-bold text-white">Emergency Contact</h3>
              {(patient.emergencyContactName || patient.emergencyContact?.name) && (
                <p className="text-xs text-gray-300 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-accent" />{patient.emergencyContactName || patient.emergencyContact?.name}
                </p>
              )}
              {(patient.emergencyContactPhone || patient.emergencyContact?.phone) && (
                <p className="text-xs text-gray-300 flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-accent" />{patient.emergencyContactPhone || patient.emergencyContact?.phone}
                </p>
              )}
              <div className="pt-2 border-t border-white/10 space-y-1.5">
                <p className="text-xs text-gray-400">Last Visit: <span className="text-white">{fmtDate(patient.lastVisit)}</span></p>
                {(() => {
                  const apt = getPatientAppointmentInfo(patient);
                  if (apt.isUpcoming && apt.date) {
                    return (
                      <p className="text-xs text-gray-400 flex items-center gap-1.5 flex-wrap">
                        <span>Next Appointment:</span>
                        <span className="text-cyan-300 font-bold">{fmtDate(apt.date)} at {apt.time || '10:00 AM'}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold">{apt.status}</span>
                      </p>
                    );
                  }
                  return null;
                })()}
                {patient.status === 'Discharged' && (
                  <p className="text-xs text-amber-300/90 font-semibold flex items-center gap-1.5 pt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>Discharged Date: {fmtDate(patient.dischargeDate || patient.lastVisit)}</span>
                  </p>
                )}
              </div>
            </div>
            {/* Allergies & Verification */}
            <div className="glass-card p-5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Documented Allergies
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-400">
                  {(patient.allergies || []).length} Recorded
                </span>
              </div>
              {(!patient.allergies || patient.allergies.length === 0) ? (
                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>No Known Drug Allergies (NKDA) documented.</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {(patient.allergies || []).map((rawAllergy, i) => {
                    const a = typeof rawAllergy === 'string'
                      ? { substance: rawAllergy, reaction: 'Known Allergy', severity: 'Moderate' as const, verificationStatus: undefined, verifiedBy: undefined, verifiedDate: undefined, reactionType: undefined, notes: undefined }
                      : rawAllergy;
                    const isDoctorVerified = a.verificationStatus === 'Verified by Doctor';
                    const isNurseVerified = a.verificationStatus === 'Verified by Nurse';

                    return (
                      <div key={i} className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${a.severity === 'Severe' ? 'bg-rose-400 animate-pulse' : a.severity === 'Moderate' ? 'bg-amber-400' : 'bg-yellow-400'}`} />
                            <p className="text-xs font-bold text-white">{a.substance}</p>
                          </div>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                              isDoctorVerified
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : isNurseVerified
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            {a.verificationStatus || 'Self-Reported (Unverified)'}
                          </span>
                        </div>

                        <p className="text-[11px] text-gray-300">
                          {a.reaction} · <span className="font-semibold text-white">{a.severity}</span>
                          {a.reactionType && <span className="text-gray-400 ml-1">({a.reactionType})</span>}
                        </p>

                        {a.verifiedBy && (
                          <p className="text-[10px] text-gray-400">
                            Verified by: <span className="text-gray-200">{a.verifiedBy}</span>
                            {a.verifiedDate && <span> · {fmtDate(a.verifiedDate)}</span>}
                          </p>
                        )}
                        {a.notes && <p className="text-[10px] text-gray-400 italic">"{a.notes}"</p>}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400">
                <span>Allergy Reconciliation Protocol</span>
                <span className="text-accent font-semibold">GL-010 / GL-011 Active</span>
              </div>
            </div>
            {/* Clinical Care & Admission Summary */}
            <div className="glass-card p-5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-accent" /> Clinical Care & Department
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30">
                  {patient.status}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <p className="text-gray-300 flex items-center justify-between">
                  <span className="text-gray-400">Department:</span>
                  <span className="text-white font-semibold">{patient.department || 'General Medicine'}</span>
                </p>
                <p className="text-gray-300 flex items-center justify-between">
                  <span className="text-gray-400">Primary Condition:</span>
                  <span className="text-white font-semibold">{patient.primaryCondition || patient.medicalHistory?.[0]?.condition || 'Under Clinical Evaluation'}</span>
                </p>
                <div className="pt-1">
                  <div className="text-gray-300 flex items-center justify-between">
                    <span className="text-gray-400">Assigned Ward & Bed:</span>
                    <div className="flex items-center gap-2">
                      {currentWard ? (
                        <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono text-[11px] font-bold shadow-sm">
                          {currentWard}
                        </span>
                      ) : (
                        <span className="text-teal-300 text-xs font-semibold px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20">
                          Outpatient (No Bed)
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsEditingBed(!isEditingBed)}
                        className="text-[11px] px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-accent font-semibold transition-colors cursor-pointer"
                      >
                        {isEditingBed ? 'Cancel' : 'Change Bed'}
                      </button>
                    </div>
                  </div>

                  {bedSuccessMsg && (
                    <div className="mt-2 text-xs text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 flex items-center gap-1.5 animate-fadeIn">
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{bedSuccessMsg}</span>
                    </div>
                  )}

                  {isEditingBed && (
                    <div className="mt-2.5 p-3 rounded-xl bg-white/5 border border-accent/40 space-y-2.5 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Reassign Ward / Bed</span>
                        <span className="text-[10px] text-gray-400">Syncs to PostgreSQL</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-gray-400 block mb-1">Ward Selection</label>
                          <select
                            value={selectedWardOption}
                            onChange={(e) => setSelectedWardOption(e.target.value)}
                            className="w-full bg-slate-900 border border-white/20 rounded-lg px-2 py-1.5 text-xs text-white focus:border-accent outline-none"
                          >
                            <option value="Ward 1">Ward 1 (General)</option>
                            <option value="Ward 2">Ward 2 (Surgical / Semi-Private)</option>
                            <option value="Ward 3">Ward 3 (Medical Inpatient)</option>
                            <option value="Ward 4">Ward 4 (Specialty Care)</option>
                            <option value="ICU">ICU (Critical Care)</option>
                            <option value="Outpatient">Outpatient (Clear Bed)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 block mb-1">Bed Number</label>
                          <input
                            type="text"
                            value={selectedBedInput}
                            onChange={(e) => setSelectedBedInput(e.target.value)}
                            placeholder="e.g. Bed 05"
                            disabled={selectedWardOption === 'Outpatient'}
                            className="w-full bg-slate-900 border border-white/20 rounded-lg px-2 py-1.5 text-xs text-white focus:border-accent outline-none disabled:opacity-40"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsEditingBed(false)}
                          className="px-2.5 py-1 text-xs text-gray-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveBed}
                          disabled={savingBed}
                          className="px-3 py-1 bg-accent hover:bg-accent/80 text-black text-xs font-bold rounded-lg transition-all flex items-center gap-1 shadow-md cursor-pointer disabled:opacity-50"
                        >
                          {savingBed && <Loader2 className="w-3 h-3 animate-spin" />}
                          <span>{savingBed ? 'Saving...' : 'Save to Database'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-gray-300 flex items-center justify-between">
                  <span className="text-gray-400">Assigned Doctor ID:</span>
                  <span className="text-white font-mono">DOC-#{patient.assignedDoctorId}</span>
                </p>
                {patient.status === 'Discharged' && (
                  <p className="text-gray-300 flex items-center justify-between">
                    <span className="text-amber-400 font-medium flex items-center gap-1">
                      <FileCheck className="w-3.5 h-3.5 text-amber-400" /> Discharged Date:
                    </span>
                    <span className="text-amber-200 font-bold">{fmtDate(patient.dischargeDate || patient.lastVisit)}</span>
                  </p>
                )}
                {(() => {
                  const apt = getPatientAppointmentInfo(patient);
                  if (apt.isUpcoming && apt.date) {
                    return (
                      <p className="text-gray-300 flex items-center justify-between">
                        <span className="text-gray-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" /> Next Appointment:
                        </span>
                        <span className="text-cyan-300 font-bold">
                          {fmtDate(apt.date)} · {apt.time || '10:00 AM'} ({apt.status})
                        </span>
                      </p>
                    );
                  }
                  return null;
                })()}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <span className="text-gray-400">Active Prescriptions:</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('prescriptions')}
                    className="text-xs text-accent hover:underline font-bold"
                  >
                    View in Prescriptions Tab ({prescriptions.filter((r) => r.status === 'Active').length}) →
                  </button>
                </div>
              </div>
            </div>

            {/* Diagnosed Medical Conditions & History */}
            <div className="md:col-span-2 glass-card p-5 border border-white/10 space-y-3.5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-bold text-white">Diagnosed Medical Conditions & History</h3>
                </div>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                  {patient.medicalHistory?.length || 0} Diagnoses on Record
                </span>
              </div>

              {!patient.medicalHistory || patient.medicalHistory.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400 italic">No medical history entries recorded.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {patient.medicalHistory.map((item, idx) => {
                    const isResolved = item.status === 'Resolved';
                    const isChronic = item.status === 'Chronic';

                    return (
                      <div
                        key={item.id || idx}
                        className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5 hover:border-purple-500/40 transition-all text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold text-white">{item.condition}</p>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isResolved
                                ? 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                                : isChronic
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-gray-400 pt-0.5">
                          <span>Diagnosed: <strong className="text-gray-200">{fmtDate(item.diagnosedDate)}</strong></span>
                          {item.diagnosedBy && (
                            <span className="text-purple-300 font-semibold flex items-center gap-1">
                              <Stethoscope className="w-3 h-3 text-purple-400" />
                              {item.diagnosedBy}
                            </span>
                          )}
                        </div>

                        {item.notes && (
                          <p className="text-[11px] text-gray-300 italic pt-1 border-t border-white/5">
                            "{item.notes}"
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* LAB REPORTS */}
        {activeTab === 'labs' && (
          <div className="space-y-3">
            {(!patient.labReports || patient.labReports.length === 0) ? (
              <div className="glass-card p-8 border border-white/10 text-center text-gray-400 text-sm">No laboratory reports recorded.</div>
            ) : (patient.labReports || []).map((l) => (
              <div key={l.id} className="glass-card p-5 border border-white/10">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">{l.testName}</p>
                    <p className="text-xs text-gray-400">{fmtDate(l.date)} · Requisitioned by {l.orderedBy || 'Attending Physician'}</p>
                    <p className="text-sm text-white mt-2">{l.result} <span className="text-xs text-gray-400">{l.unit && l.unit !== '-' ? l.unit : ''}</span></p>
                    <p className="text-xs text-gray-400 mt-0.5">Reference: {l.referenceRange || 'Standard Reference Range'}</p>
                    {l.notes && <p className="text-xs text-amber-300 mt-1 italic">{l.notes}</p>}
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${LAB_COLORS[l.status as keyof typeof LAB_COLORS] || 'bg-blue-500/20 text-blue-300'}`}>
                    {l.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* APPOINTMENTS */}
        {activeTab === 'appointments' && (
          <div className="space-y-3">
            {(!patient.appointments || patient.appointments.length === 0) ? (
              <div className="glass-card p-8 border border-white/10 text-center text-gray-400 text-sm">No appointments recorded.</div>
            ) : (patient.appointments || []).map((a) => {
              const apptDate = a.date ? new Date(a.date) : new Date();
              const dayNum = isNaN(apptDate.getTime()) ? '—' : apptDate.getDate();
              const monthStr = isNaN(apptDate.getTime()) ? 'Appt' : apptDate.toLocaleDateString('en-IN', { month: 'short' });

              return (
                <div key={a.id} className="glass-card p-5 border border-white/10 flex gap-4">
                  <div className="flex-shrink-0 text-center w-14">
                    <p className="text-lg font-black text-accent">{dayNum}</p>
                    <p className="text-xs text-gray-400">{monthStr}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">{a.reason}</p>
                    <p className="text-xs text-gray-400">{a.time || '10:00 AM'} · {a.doctorName || 'Attending Physician'} · {a.department || 'General Medicine'}</p>
                    {a.notes && <p className="text-xs text-gray-300 mt-1">{a.notes}</p>}
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full h-fit flex-shrink-0 ${a.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-300' : a.status === 'Upcoming' ? 'bg-blue-500/20 text-blue-300' : 'bg-rose-500/20 text-rose-300'}`}>
                    {a.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* PRESCRIPTIONS */}
        {activeTab === 'prescriptions' && (
          <div className="space-y-6">
            {/* Header / Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Pill className="w-4 h-4 text-accent" /> Electronic Prescriptions & CPOE
                </h3>
                <p className="text-xs text-gray-400">
                  Total Records: <span className="text-white font-semibold">{prescriptions.length}</span> · Active Courses: <span className="text-emerald-400 font-semibold">{prescriptions.filter((r) => r.status === 'Active').length}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPrescriptionModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-xs font-bold hover:shadow-glow-primary transition-all flex-shrink-0"
              >
                <Plus className="w-4 h-4" /> Issue New Electronic Prescription
              </button>
            </div>

            {/* Success Banner */}
            {rxSuccessMsg && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                {rxSuccessMsg}
              </motion.div>
            )}

            {/* Medication Reconciliation (Med-Rec) Baseline View */}
            <div className="p-4 rounded-2xl bg-[#0F172A] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Medication Reconciliation (Med-Rec) · Active Patient Regimen
                  </span>
                </div>
                <span className="text-[11px] text-gray-400">Synced with Patient Digital Twin</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {patient.currentMedications && patient.currentMedications.length > 0 ? (
                  patient.currentMedications.map((cm, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white font-mono">{getTallManName(cm.name)}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          {cm.dosage}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400">{cm.frequency}</p>
                      <p className="text-[10px] text-gray-400 italic">By: {cm.prescribedBy}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-400 col-span-full py-2">No active baseline medications recorded.</p>
                )}
              </div>
            </div>

            {/* Prescription History Cards */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Issued Prescription Orders ({prescriptions.length})
              </h4>

              {prescriptions.length === 0 ? (
                <div className="glass-card p-12 border border-white/10 text-center space-y-3">
                  <Pill className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="text-sm text-gray-300 font-medium">No prescriptions issued yet for this patient.</p>
                  <button
                    type="button"
                    onClick={() => setShowPrescriptionModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/20 text-accent border border-accent/40 text-xs font-bold hover:bg-accent/30 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Issue First Prescription Order
                  </button>
                </div>
              ) : (
                prescriptions.map((rx) => (
                  <div key={rx.id} className="glass-card p-5 border border-white/10 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white font-mono">℞ {rx.id}</span>
                          <span className="text-xs text-gray-400">· {fmtDate(rx.date)}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">Prescribed by {rx.doctorName}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                            rx.status === 'Active'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : rx.status === 'Discontinued'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                          }`}
                        >
                          {rx.status}
                        </span>

                        <button
                          type="button"
                          onClick={() => handlePrintPrescription(rx)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors border border-white/15"
                          title="Print official hospital prescription document"
                        >
                          <Printer className="w-3.5 h-3.5" /> Print Rx
                        </button>

                        {rx.status === 'Active' && (
                          <button
                            type="button"
                            onClick={() => setDiscontinueRxId(rx.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-medium transition-colors border border-rose-500/30"
                            title="Discontinue prescription"
                          >
                            <StopCircle className="w-3.5 h-3.5" /> Discontinue
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(rx.medications || []).map((m, i) => (
                        <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-white font-mono">
                              {getTallManName(m.name)}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-md bg-accent/20 text-accent font-semibold">
                              {m.dosage}
                            </span>
                          </div>
                          <p className="text-xs text-gray-300">
                            Timing: <span className="text-white font-medium">{m.frequency}</span>
                          </p>
                          <p className="text-[11px] text-gray-400">
                            Started: {fmtDate(m.startDate || rx.date)}
                          </p>
                        </div>
                      ))}
                    </div>

                    {rx.notes && (
                      <p className="text-xs text-gray-400 italic bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
                        <span className="text-gray-300 font-semibold not-italic">Clinical Remarks:</span> {rx.notes}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Discontinue Modal Confirmation */}
            {discontinueRxId && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <div className="w-full max-w-md p-6 rounded-2xl bg-[#0F172A] border border-rose-500/30 shadow-2xl space-y-4">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
                    <ShieldAlert className="w-5 h-5" /> Confirm Prescription Discontinuation
                  </div>
                  <p className="text-xs text-gray-300">
                    Are you sure you want to discontinue prescription <strong className="text-white font-mono">{discontinueRxId}</strong>? This will notify the patient and remove active scheduled doses from nursing administration.
                  </p>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-300">Clinical Reason for Discontinuation *</label>
                    <input
                      type="text"
                      value={discontinueReason}
                      onChange={(e) => setDiscontinueReason(e.target.value)}
                      placeholder="e.g. Completed treatment course / Adverse reaction observed"
                      className="w-full py-2 px-3 text-xs text-white bg-white/5 border border-white/20 rounded-xl focus:outline-none focus:border-rose-400"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setDiscontinueRxId(null)}
                      disabled={discontinuing}
                      className="px-4 py-2 rounded-xl bg-white/10 text-xs font-semibold text-white hover:bg-white/15"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDiscontinueConfirm}
                      disabled={discontinuing || !discontinueReason.trim()}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition-colors"
                    >
                      {discontinuing ? 'Archiving...' : 'Discontinue Prescription'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Create Prescription Modal */}
            <CreatePrescriptionModal
              isOpen={showPrescriptionModal}
              onClose={() => setShowPrescriptionModal(false)}
              patient={patient}
              onPrescriptionCreated={handlePrescriptionCreated}
            />
          </div>
        )}

        {/* CLINICAL NOTES */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            {/* Add Note Button */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowNoteForm((v) => !v)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/80 transition-colors"
              >
                <Plus className="w-4 h-4" />{showNoteForm ? 'Cancel' : 'Add Clinical Note'}
              </button>
            </div>

            {/* Note Form */}
            <AnimatePresence>
              {showNoteForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="glass-card p-5 border border-accent/30 space-y-3"
                >
                  <h4 className="text-sm font-bold text-white">New Clinical Note</h4>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Note Type</label>
                    <select
                      value={noteType}
                      onChange={(e) => setNoteType(e.target.value as ClinicalNote['type'])}
                      className="glass-input w-full px-3 py-2 text-xs text-white"
                    >
                      {['Progress Note','Consultation','Discharge Summary','Referral','General'].map(t => (
                        <option key={t} value={t} className="bg-[#0F172A]">{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Note Content *</label>
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      rows={5}
                      placeholder="Enter clinical observations, assessments, and plan..."
                      className="glass-input w-full px-3 py-2 text-xs text-white resize-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowNoteForm(false)} className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                      Cancel
                    </button>
                    <button
                      onClick={handleAddNote}
                      disabled={!noteText.trim()}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold disabled:opacity-40"
                    >
                      <Save className="w-3.5 h-3.5" />Save Note
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Confirmation Dialog */}
            <AnimatePresence>
              {showConfirm && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                >
                  <motion.div
                    initial={{ scale: 0.95 }} animate={{ scale: 1 }}
                    className="glass-card p-6 border border-accent/30 max-w-sm w-full space-y-4"
                  >
                    <h3 className="text-base font-bold text-white">Confirm Clinical Note</h3>
                    <p className="text-xs text-gray-300">
                      You are about to add a clinical note to{' '}
                      <span className="font-semibold text-white">{patient.firstName} {patient.lastName}</span>'s record.
                      This action will be logged.
                    </p>
                    <div className="p-3 rounded-xl bg-white/5 text-xs text-gray-300 max-h-28 overflow-y-auto">
                      {noteText}
                    </div>
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => setShowConfirm(false)} disabled={savingNote} className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                        Cancel
                      </button>
                      <button onClick={handleConfirmNote} disabled={savingNote} className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/80 transition-colors flex items-center gap-1.5">
                        {savingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        <span>{savingNote ? 'Saving...' : 'Confirm & Save'}</span>
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Notes List */}
            {(!patient.clinicalNotes || patient.clinicalNotes.length === 0) ? (
              <div className="glass-card p-8 border border-white/10 text-center text-gray-400 text-sm">No clinical notes recorded.</div>
            ) : (patient.clinicalNotes || []).map((n) => (
              <div key={n.id} className="glass-card p-5 border border-white/10 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-white">{n.authorName || 'Attending Physician'} <span className="font-normal text-gray-400">({n.authorRole || 'Doctor'})</span></p>
                    <p className="text-[11px] text-gray-500">{fmtDate(n.date)}{n.time ? ` at ${n.time}` : ''}</p>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${NOTE_TYPE_COLORS[n.type as keyof typeof NOTE_TYPE_COLORS] || 'bg-gray-500/20 text-gray-300'}`}>
                    {n.type}
                  </span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{n.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="space-y-3">
            {(!patient.documents || patient.documents.length === 0) ? (
              <div className="glass-card p-8 border border-white/10 text-center text-gray-400 text-sm">No medical documents uploaded.</div>
            ) : (patient.documents || []).map((doc) => (
              <div
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className="glass-card p-4 border border-white/10 flex items-center gap-4 hover:border-accent/40 hover:bg-white/5 transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate group-hover:text-accent transition-colors">{doc.name}</p>
                  <p className="text-xs text-gray-400">{doc.category || 'Lab Report'} · {doc.size || '180 KB'} · Uploaded {fmtDate(doc.uploadedDate)} by {doc.uploadedBy || 'Hospital Diagnostic Lab'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-gray-300 font-medium">{doc.type || 'PDF'}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedDoc(doc); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/30 hover:bg-primary/50 border border-primary/50 text-xs font-semibold text-white transition-all shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5 text-accent" />
                    <span>View</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* DISCHARGE SUMMARY */}
        {activeTab === 'discharge-summary' && (
          <DischargeSummaryTab
            patient={patient}
            onPatientUpdated={() => {
              if (onNoteAdded) onNoteAdded({} as any);
            }}
          />
        )}

        {/* NURSING SUMMARY (READ-ONLY FOR ATTENDING PHYSICIAN) */}
        {activeTab === 'nursing-summary' && (
          <DoctorNursingSummaryTab patient={patient} />
        )}

        {/* ── Document Inspection Modal for Doctor ── */}
        <AnimatePresence>
          {selectedDoc && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
              onClick={() => setSelectedDoc(null)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }}
                className="glass-card max-w-2xl w-full p-6 border border-white/20 rounded-2xl shadow-2xl bg-[#0B132B]/95 space-y-5"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex justify-between items-start border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white leading-snug">{selectedDoc.name}</h3>
                      <p className="text-xs text-gray-400">
                        {selectedDoc.category || 'Lab Report'} • {selectedDoc.type || 'PDF'} ({selectedDoc.size || '180 KB'})
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDoc(null)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white/5 p-4 rounded-xl border border-white/10 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Patient Name</span>
                    <span className="text-white font-medium">{patient.firstName} {patient.lastName} (ID #{patient.id})</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Category</span>
                    <span className="text-white font-medium">{selectedDoc.category || 'Lab Report'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Uploaded Date</span>
                    <span className="text-white font-mono">{fmtDate(selectedDoc.uploadedDate)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Uploaded By</span>
                    <span className="text-emerald-400 font-semibold">{selectedDoc.uploadedBy || 'Hospital Diagnostic Lab'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Status</span>
                    <span className="text-accent font-semibold">Verified EHR Document</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">File Format</span>
                    <span className="text-white font-mono uppercase">{selectedDoc.type || 'PDF'}</span>
                  </div>
                </div>

                {/* Document Simulated Content / Preview Box */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Clinical Document Content</span>
                  <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/60 text-xs text-gray-200 space-y-2 font-mono max-h-48 overflow-y-auto">
                    <p className="text-emerald-400 font-bold border-b border-white/10 pb-1">📄 MEDITWIN DIAGNOSTIC LIS — CLINICAL ATTACHMENT</p>
                    <p><strong>Document ID:</strong> {selectedDoc.id}</p>
                    <p><strong>Record File:</strong> {selectedDoc.name}</p>
                    <p><strong>Verification:</strong> Authenticated digital certificate attached by Hospital Pathology & Diagnostic Services.</p>
                    <p className="text-gray-400 text-[11px] pt-1 italic">
                      This diagnostic report is permanently linked to patient #{patient.id} ({patient.firstName} {patient.lastName})'s Electronic Health Record (EHR).
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    onClick={() => {
                      const printWin = window.open('', '_blank', 'width=800,height=900');
                      if (printWin) {
                        printWin.document.write(`<html><head><title>${selectedDoc.name}</title></head><body style="font-family:sans-serif;padding:30px;"><h2>MediTwin AI - Medical Document</h2><p><strong>Patient:</strong> ${patient.firstName} ${patient.lastName}</p><p><strong>File:</strong> ${selectedDoc.name}</p><p><strong>Uploaded:</strong> ${fmtDate(selectedDoc.uploadedDate)} by ${selectedDoc.uploadedBy || 'Hospital Diagnostic Lab'}</p><hr/><p>Official Electronic Health Record attachment.</p></body></html>`);
                        printWin.document.close();
                        printWin.focus();
                        printWin.print();
                      }
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all"
                  >
                    <Printer className="w-4 h-4 text-gray-300" />
                    <span>Print Report</span>
                  </button>
                  <button
                    onClick={() => alert(`Initiating secure encrypted download for: ${selectedDoc.name}`)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-slate-900 hover:bg-accent-light text-xs font-bold transition-all shadow-glow-accent"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download File</span>
                  </button>
                  <button
                    onClick={() => setSelectedDoc(null)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-400 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export interface PatientRecordsPageProps {
  initialTab?: string;
  initialStatusFilter?: PatientStatus | '';
  initialPatientId?: number;
}

export const PatientRecordsPage: React.FC<PatientRecordsPageProps> = ({
  initialTab = 'overview',
  initialStatusFilter = '',
  initialPatientId,
}) => {
  const [patients, setPatients]               = useState<DoctorPatient[]>([]);
  const [allPatients, setAllPatients]         = useState<DoctorPatient[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<DoctorPatient | null>(null);
  const lastTabRef = useRef<string>(initialTab);

  const [search, setSearch]         = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus]         = useState<PatientStatus | ''>(initialStatusFilter);
  const [sortBy, setSortBy]         = useState<PatientSortField>('criticalFirst');
  const [sortOrder, setSortOrder]   = useState<'asc' | 'desc'>('desc');

  // Load all patients once for accurate filter counts & emergency alert banner
  const loadAllPatients = useCallback(async () => {
    try {
      const all = await getPatients(undefined, { sortBy: 'criticalFirst', sortOrder: 'desc' });
      setAllPatients(all);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => { loadAllPatients(); }, [loadAllPatients]);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPatients(undefined, { search, department, status, sortBy, sortOrder });
      setPatients(data);
    } catch (e) {
      setError('Failed to load patient records. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, department, status, sortBy, sortOrder]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const handleNoteAdded = (note: ClinicalNote) => {
    if (!selectedPatient) return;
    const updated = { ...selectedPatient, clinicalNotes: [note, ...selectedPatient.clinicalNotes] };
    setSelectedPatient(updated);
    setPatients(prev => prev.map(p => p.id === updated.id ? updated : p));
    setAllPatients(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  // Auto-select patient when initialPatientId is provided
  useEffect(() => {
    if (initialPatientId && allPatients.length > 0 && !selectedPatient) {
      const target = allPatients.find(p => p.id === initialPatientId);
      if (target) setSelectedPatient(target);
    }
  }, [initialPatientId, allPatients, selectedPatient]);

  // Only auto-select when the requested tab actually changes from the navigation sidebar
  useEffect(() => {
    if (initialTab !== lastTabRef.current) {
      lastTabRef.current = initialTab;
      if (initialTab !== 'overview' && !selectedPatient && patients.length > 0) {
        setSelectedPatient(patients[0]);
      }
    }
  }, [initialTab, patients, selectedPatient]);

  if (selectedPatient) {
    return (
      <PatientRecord
        patient={selectedPatient}
        onBack={() => setSelectedPatient(null)}
        onNoteAdded={handleNoteAdded}
        initialTab={initialTab}
      />
    );
  }

  // Calculate status counts
  const pool = allPatients.length > 0 ? allPatients : patients;
  const criticalCount   = pool.filter(p => p.status === 'Critical').length;
  const admittedCount   = pool.filter(p => p.status === 'Admitted').length;
  const obsCount        = pool.filter(p => p.status === 'Under Observation').length;
  const activeCount     = pool.filter(p => p.status === 'Active').length;
  const dischargedCount = pool.filter(p => p.status === 'Discharged').length;
  const criticalList    = pool.filter(p => p.status === 'Critical');

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-accent" /> Patient Records
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Showing patients assigned to your clinical care</p>
        </div>

        {criticalCount > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>{criticalCount} Critical Patient{criticalCount > 1 ? 's' : ''} on Duty</span>
          </div>
        )}
      </div>

      {/* ── Emergency Priority Triage Alert Banner (always visible when critical patients exist) ── */}
      {status !== 'Discharged' && criticalList.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-gradient-to-b from-rose-950/85 via-navy-900/95 to-navy-950/95 border-2 border-rose-500/60 shadow-[0_4px_25px_rgba(244,63,94,0.2)] space-y-4"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-rose-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 flex-shrink-0">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-black text-[10px] uppercase tracking-wider shadow-sm">
                    CRITICAL CARE TRIAGE
                  </span>
                  <span className="text-sm font-bold text-white">
                    {criticalList.length} Critical Patient{criticalList.length > 1 ? 's' : ''} on Service
                  </span>
                </div>
                <p className="text-xs text-rose-200/70 mt-0.5">
                  High-acuity clinical status — select any patient below for rapid chart evaluation
                </p>
              </div>
            </div>

            <button
              onClick={() => setStatus('Critical')}
              className={`self-start sm:self-auto px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                status === 'Critical'
                  ? 'bg-rose-600 text-white border border-rose-400 shadow-md'
                  : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 hover:text-white border border-rose-500/40'
              }`}
            >
              <span>{status === 'Critical' ? 'Filtering Critical' : 'Filter Critical Patients'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Clean Grid of Critical Patients */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {criticalList.map((cp) => (
              <div
                key={cp.id}
                className="p-3.5 rounded-xl bg-black/40 hover:bg-black/60 border border-rose-500/30 hover:border-rose-400/60 transition-all flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-400 flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-md">
                    {cp.firstName[0]}{cp.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-white truncate">{cp.firstName} {cp.lastName}</p>
                      <span className="text-[10px] text-rose-300 font-mono font-semibold px-1 rounded bg-rose-500/20 border border-rose-500/30">
                        {formatPatientId(cp)}
                      </span>
                    </div>
                    <p className="text-[11px] text-rose-200/90 font-medium truncate mt-0.5">
                      {cp.primaryCondition || 'Critical Care Needed'}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">
                      {cp.department} {cp.ward ? `• ${cp.ward}` : ''}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedPatient(cp)}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1 flex-shrink-0 cursor-pointer group-hover:scale-105 active:scale-95 whitespace-nowrap"
                >
                  <span>Chart</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── 1-Click Fast Status Filter Pills ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => setStatus('')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            status === ''
              ? 'bg-primary text-white border border-accent/40 shadow-glow-primary font-bold'
              : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/10'
          }`}
        >
          <span>All Patients</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 text-white font-bold">{pool.length}</span>
        </button>

        {criticalCount > 0 && (
          <button
            onClick={() => setStatus('Critical')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
              status === 'Critical'
                ? 'bg-rose-600 text-white border-rose-400 shadow-[0_0_18px_rgba(244,63,94,0.5)] ring-2 ring-rose-400/50'
                : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border-rose-500/40 hover:border-rose-400'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>🚨 Critical Priority</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/40 text-white border border-rose-400/40 font-black">
              {criticalCount}
            </span>
          </button>
        )}

        <button
          onClick={() => setStatus('Admitted')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            status === 'Admitted'
              ? 'bg-primary text-white border border-accent/40 shadow-glow-primary font-bold'
              : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/10'
          }`}
        >
          <span>Admitted</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-gray-300">{admittedCount}</span>
        </button>

        <button
          onClick={() => setStatus('Under Observation')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            status === 'Under Observation'
              ? 'bg-primary text-white border border-accent/40 shadow-glow-primary font-bold'
              : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/10'
          }`}
        >
          <span>Under Observation</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-gray-300">{obsCount}</span>
        </button>

        <button
          onClick={() => setStatus('Active')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            status === 'Active'
              ? 'bg-primary text-white border border-accent/40 shadow-glow-primary font-bold'
              : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/10'
          }`}
        >
          <span>Active</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-gray-300">{activeCount}</span>
        </button>

        <button
          onClick={() => setStatus('Discharged')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            status === 'Discharged'
              ? 'bg-primary text-white border border-accent/40 shadow-glow-primary font-bold'
              : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/10'
          }`}
        >
          <span>Discharged</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-gray-300">{dischargedCount}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative col-span-1 sm:col-span-2 lg:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, condition, or patient ID..."
            className="glass-input w-full pl-9 pr-4 py-2.5 text-sm text-white"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <select value={department} onChange={(e) => setDepartment(e.target.value)} className="glass-input w-full pl-8 pr-3 py-2.5 text-sm text-white appearance-none">
            <option value="" className="bg-[#0F172A]">All Departments</option>
            {DEPARTMENTS.map(d => <option key={d} value={d} className="bg-[#0F172A]">{d}</option>)}
          </select>
        </div>
        <div className="relative">
          <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <select value={status} onChange={(e) => setStatus(e.target.value as PatientStatus | '')} className="glass-input w-full pl-8 pr-3 py-2.5 text-sm text-white appearance-none">
            <option value="" className="bg-[#0F172A]">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s} className="bg-[#0F172A]">{s}</option>)}
          </select>
        </div>
      </div>

      {/* Enhanced Multi-Feature Sort Bar */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
          <div className="flex items-center gap-1.5 font-medium text-gray-300 mr-1">
            <SortAsc className="w-4 h-4 text-accent" />
            <span>Sort by:</span>
          </div>

          {SORT_OPTIONS.map((opt) => {
            const isActive = sortBy === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  if (isActive) {
                    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy(opt.id);
                    setSortOrder(opt.defaultOrder);
                  }
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-primary text-white font-bold shadow-md shadow-primary/30 ring-1 ring-white/30 scale-105'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
                }`}
                title={`Sort by ${opt.label}. ${isActive ? 'Click again to flip direction.' : ''}`}
              >
                <span>{opt.label}</span>
                {isActive && (
                  <span className="flex items-center text-[10px] bg-black/25 rounded px-1 py-0.5 ml-0.5">
                    {sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-white" /> : <ArrowDown className="w-3 h-3 text-white" />}
                  </span>
                )}
              </button>
            );
          })}

          {/* Direction Toggle Button */}
          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="px-2.5 py-1.5 rounded-full text-xs font-medium bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer ml-auto sm:ml-2"
            title="Toggle sort direction"
          >
            {sortOrder === 'asc' ? (
              <>
                <ArrowUp className="w-3.5 h-3.5 text-accent" />
                <span>Ascending</span>
              </>
            ) : (
              <>
                <ArrowDown className="w-3.5 h-3.5 text-accent" />
                <span>Descending</span>
              </>
            )}
          </button>

          {/* Reset Sort Button */}
          {(sortBy !== 'criticalFirst' || sortOrder !== 'desc') && (
            <button
              onClick={() => {
                setSortBy('criticalFirst');
                setSortOrder('desc');
              }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-rose-300 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-white/5"
              title="Reset to default triage priority"
            >
              <RotateCcw className="w-3 h-3 text-gray-400" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Active sort info hint */}
        <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
          <span>
            Active Sort: <strong className="text-white font-semibold">
              {SORT_OPTIONS.find(o => o.id === sortBy)?.label}
            </strong> (
            {sortOrder === 'desc'
              ? SORT_OPTIONS.find(o => o.id === sortBy)?.descLabel
              : SORT_OPTIONS.find(o => o.id === sortBy)?.ascLabel}
            )
          </span>
          <span className="text-gray-500 font-mono text-[10px]">Click active pill to flip order (↑ / ↓)</span>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
          <p className="text-sm text-gray-400">Loading patient records...</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="glass-card p-6 border border-rose-500/30 bg-rose-500/10 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <p className="text-sm text-rose-300">{error}</p>
          <button onClick={fetchPatients} className="ml-auto text-xs text-accent font-semibold hover:underline">Retry</button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && patients.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-center"
        >
          <Users className="w-12 h-12 text-gray-600" />
          <h3 className="text-lg font-bold text-white">No patients found</h3>
          <p className="text-sm text-gray-400">Try adjusting your search or filter criteria.</p>
        </motion.div>
      )}

      {/* Patient List */}
      {!loading && !error && patients.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">{patients.length} patient{patients.length !== 1 ? 's' : ''} found</p>
          {patients.map((p, i) => {
            const isCritical = p.status === 'Critical';

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`glass-card-interactive p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-all ${
                  isCritical
                    ? 'border-2 border-rose-500/60 bg-gradient-to-r from-rose-950/35 via-navy-900/85 to-navy-900/90 shadow-[0_0_20px_rgba(244,63,94,0.18)]'
                    : 'border border-white/10'
                }`}
              >
                {/* Avatar */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-base font-bold flex-shrink-0 ${
                  isCritical
                    ? 'bg-gradient-to-tr from-rose-600 to-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                    : 'bg-gradient-to-tr from-primary to-accent'
                }`}>
                  {p.firstName[0]}{p.lastName[0]}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-white flex items-center gap-1.5">
                      {p.firstName} {p.lastName}
                      {isCritical && (
                        <span className="relative flex h-2.5 w-2.5 ml-1">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                        </span>
                      )}
                    </p>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[p.status] || 'border-white/20 text-gray-300'}`}>{p.status}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    <span className="font-mono font-bold text-gray-200">{formatPatientId(p)}</span> · <span className={`font-semibold ${isPatientInpatient(p.status, p.ward) ? 'text-purple-300' : 'text-teal-300'}`}>{isPatientInpatient(p.status, p.ward) ? 'Inpatient' : 'Outpatient'}</span> · {p.age} yrs · {typeof p.gender === 'string' ? p.gender : p.gender?.name || 'Unspecified'} · {p.department || 'General Medicine'} {p.ward ? `· ${p.ward}` : '· Outpatient'}
                  </p>
                  {p.primaryCondition && (
                    <p className={`text-xs mt-0.5 truncate font-medium ${isCritical ? 'text-rose-200 font-bold' : 'text-gray-300'}`}>
                      {p.primaryCondition}
                    </p>
                  )}
                  <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
                    <span>Last visit: <strong className="text-gray-300">{fmtDate(p.lastVisit)}</strong></span>
                    {(() => {
                      const apt = getPatientAppointmentInfo(p);
                      if (apt.isUpcoming && apt.date) {
                        return (
                          <span>
                            · Next Appt: <strong className="text-cyan-300">{fmtDate(apt.date)} at {apt.time || '10:00 AM'}</strong>
                          </span>
                        );
                      }
                      return null;
                    })()}
                    {p.status === 'Discharged' && (
                      <span className="text-amber-300/90 font-semibold flex items-center gap-1">
                        · Discharged: {fmtDate(p.dischargeDate || p.lastVisit)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Alerts & Sort Badges */}
                <div className="flex flex-wrap gap-2 flex-shrink-0 items-center">
                  {isCritical && (
                    <span className="flex items-center gap-1 text-[11px] font-black text-white px-2.5 py-1 rounded-full bg-rose-600 border border-rose-400 shadow-sm animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5" />CRITICAL PRIORITY
                    </span>
                  )}
                  {/* Dynamic highlight for active sort dimensions */}
                  {sortBy === 'nextAppointment' && (() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const isFuture = Boolean(p.nextAppointment && p.nextAppointment >= todayStr);
                    return (
                      <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        isFuture ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-white/5 text-gray-400 border-white/10'
                      }`}>
                        <Calendar className="w-3 h-3 text-cyan-400" />
                        {isFuture ? `Next: ${fmtDate(p.nextAppointment!)}` : 'No upcoming visit'}
                      </span>
                    );
                  })()}
                  {sortBy === 'age' && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-300 px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40">
                      <User className="w-3 h-3 text-indigo-400" />
                      Age {p.age}
                    </span>
                  )}
                  {sortBy === 'id' && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-sky-300 px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-500/40">
                      <FileText className="w-3 h-3 text-sky-400" />
                      {formatPatientId(p)} ({isPatientInpatient(p.status, p.ward) ? 'Inpatient' : 'Outpatient'})
                    </span>
                  )}
                  {Array.isArray(p.labReports) && p.labReports.some(l => l.status === 'Critical') && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-rose-300 px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40">
                      <FlaskConical className="w-3 h-3 text-rose-400" /> Critical Labs
                    </span>
                  )}
                  {Array.isArray(p.labReports) && p.labReports.some(l => l.status === 'Pending') && (
                    <span className="text-[11px] font-medium text-amber-300 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30">Pending Labs</span>
                  )}
                </div>

                {/* Appointment Status Badge (Left of View Record) & View Action */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {(() => {
                    const apt = getPatientAppointmentInfo(p);
                    if (apt.status === 'Scheduled') {
                      return (
                        <span
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0 capitalize bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm"
                          title={`Scheduled appointment on ${fmtDate(apt.date)} at ${apt.time || '10:00 AM'}`}
                        >
                          Scheduled
                        </span>
                      );
                    } else if (apt.status === 'Completed') {
                      return (
                        <span
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0 capitalize bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                          title={`Completed appointment on ${fmtDate(apt.date)} at ${apt.time || '10:00 AM'}`}
                        >
                          Completed
                        </span>
                      );
                    } else if (apt.status === 'Cancelled') {
                      return (
                        <span
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0 capitalize bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm"
                          title={`Cancelled appointment on ${fmtDate(apt.date)} at ${apt.time || '10:00 AM'}`}
                        >
                          Cancelled
                        </span>
                      );
                    } else if (apt.status === 'Pending') {
                      return (
                        <span
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0 capitalize bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm"
                          title={`Pending appointment on ${fmtDate(apt.date)} at ${apt.time || '10:00 AM'}`}
                        >
                          Pending
                        </span>
                      );
                    } else if (p.status === 'Discharged') {
                      return (
                        <span
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0 capitalize bg-gray-500/20 text-gray-300 border border-gray-500/30"
                          title={`Discharged on ${fmtDate(p.dischargeDate || p.lastVisit)}`}
                        >
                          Discharged
                        </span>
                      );
                    }
                    return (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium flex-shrink-0 text-gray-400 bg-white/5 border border-white/10">
                        No Appointment
                      </span>
                    );
                  })()}

                  <button
                    onClick={() => setSelectedPatient(p)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 cursor-pointer ${
                      isCritical
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/40 hover:scale-105 active:scale-95'
                        : 'bg-primary text-white hover:bg-primary/80'
                    }`}
                  >
                    {isCritical ? 'Open Emergency Chart' : 'View Record'} <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
