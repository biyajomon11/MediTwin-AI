import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, SortAsc, ChevronRight, ArrowLeft, User, Phone,
  Mail, MapPin, Calendar, AlertTriangle, Pill, FileText, FlaskConical,
  CheckCircle2, XCircle, Plus, Save, Loader2, Users,
  Activity, FolderOpen, RefreshCw, Printer, ShieldAlert, StopCircle, Stethoscope,
} from 'lucide-react';
import type {
  DoctorPatient, PatientStatus, ClinicalNote, Prescription,
} from '../../types';
import { getPatients, addClinicalNote, discontinuePrescription } from '../../services/doctorService';
import { CreatePrescriptionModal } from '../../components/doctor/CreatePrescriptionModal';
import { getTallManName } from '../../utils/medicationSafety';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
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
  { id: 'overview',      label: 'Overview',              icon: User         },
  { id: 'labs',          label: 'Lab Reports',           icon: FlaskConical },
  { id: 'appointments',  label: 'Appointments',          icon: Calendar     },
  { id: 'prescriptions', label: 'Prescriptions',         icon: Pill         },
  { id: 'notes',         label: 'Clinical Notes',        icon: FileText     },
  { id: 'documents',     label: 'Medical Documents',     icon: FolderOpen   },
];

const DEPARTMENTS = ['Cardiology', 'Neurology', 'General Medicine', 'Oncology', 'Pediatrics'];
const STATUSES: PatientStatus[] = ['Active', 'Admitted', 'Critical', 'Under Observation', 'Discharged'];

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
              {patient.firstName[0]}{patient.lastName[0]}
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">{patient.firstName} {patient.lastName}</h2>
              <p className="text-sm text-gray-400">ID: P-{patient.id} • {patient.age} yrs • {patient.gender?.name}</p>
              <p className="text-sm text-gray-400">{patient.department} • {patient.ward}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${STATUS_COLORS[patient.status]}`}>
              {patient.status}
            </span>
            {patient.primaryCondition && (
              <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium">
                {patient.primaryCondition}
              </span>
            )}
            {patient.allergies.some(a => a.severity === 'Severe') && (
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
            {/* Contact */}
            <div className="glass-card p-5 border border-white/10 space-y-3">
              <h3 className="text-sm font-bold text-white">Contact Information</h3>
              {patient.phone && <p className="text-xs text-gray-300 flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-accent" />{patient.phone}</p>}
              {patient.email && <p className="text-xs text-gray-300 flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-accent" />{patient.email}</p>}
              {patient.address && <p className="text-xs text-gray-300 flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-accent" />{patient.address}</p>}
              {patient.bloodGroup && <p className="text-xs text-gray-300 flex items-center gap-2"><Activity className="w-3.5 h-3.5 text-accent" />Blood Group: <span className="text-white font-semibold">{patient.bloodGroup.name}</span></p>}
            </div>
            {/* Emergency */}
            <div className="glass-card p-5 border border-white/10 space-y-3">
              <h3 className="text-sm font-bold text-white">Emergency Contact</h3>
              {patient.emergencyContactName && <p className="text-xs text-gray-300 flex items-center gap-2"><User className="w-3.5 h-3.5 text-accent" />{patient.emergencyContactName}</p>}
              {patient.emergencyContactPhone && <p className="text-xs text-gray-300 flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-accent" />{patient.emergencyContactPhone}</p>}
              <div className="pt-2 border-t border-white/10">
                <p className="text-xs text-gray-400">Last Visit: <span className="text-white">{fmtDate(patient.lastVisit)}</span></p>
                {patient.nextAppointment && <p className="text-xs text-gray-400 mt-1">Next Appointment: <span className="text-accent">{fmtDate(patient.nextAppointment)}</span></p>}
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
                  {patient.allergies.length} Recorded
                </span>
              </div>
              {patient.allergies.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>No Known Drug Allergies (NKDA) documented.</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {patient.allergies.map((a, i) => {
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
                <p className="text-gray-300 flex items-center justify-between">
                  <span className="text-gray-400">Assigned Doctor ID:</span>
                  <span className="text-white font-mono">DOC-#{patient.assignedDoctorId}</span>
                </p>
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
          </div>
        )}

        {/* LAB REPORTS */}
        {activeTab === 'labs' && (
          <div className="space-y-3">
            {patient.labReports.length === 0 ? (
              <div className="glass-card p-8 border border-white/10 text-center text-gray-400 text-sm">No laboratory reports recorded.</div>
            ) : patient.labReports.map((l) => (
              <div key={l.id} className="glass-card p-5 border border-white/10">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">{l.testName}</p>
                    <p className="text-xs text-gray-400">{fmtDate(l.date)} · Ordered by {l.orderedBy}</p>
                    <p className="text-sm text-white mt-2">{l.result} <span className="text-xs text-gray-400">{l.unit !== '-' ? l.unit : ''}</span></p>
                    <p className="text-xs text-gray-400 mt-0.5">Reference: {l.referenceRange}</p>
                    {l.notes && <p className="text-xs text-amber-300 mt-1 italic">{l.notes}</p>}
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${LAB_COLORS[l.status]}`}>
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
            {patient.appointments.length === 0 ? (
              <div className="glass-card p-8 border border-white/10 text-center text-gray-400 text-sm">No appointments recorded.</div>
            ) : patient.appointments.map((a) => (
              <div key={a.id} className="glass-card p-5 border border-white/10 flex gap-4">
                <div className="flex-shrink-0 text-center w-14">
                  <p className="text-lg font-black text-accent">{new Date(a.date).getDate()}</p>
                  <p className="text-xs text-gray-400">{new Date(a.date).toLocaleDateString('en-IN', { month: 'short' })}</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">{a.reason}</p>
                  <p className="text-xs text-gray-400">{a.time} · {a.doctorName} · {a.department}</p>
                  {a.notes && <p className="text-xs text-gray-300 mt-1">{a.notes}</p>}
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full h-fit flex-shrink-0 ${a.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-300' : a.status === 'Upcoming' ? 'bg-blue-500/20 text-blue-300' : 'bg-rose-500/20 text-rose-300'}`}>
                  {a.status}
                </span>
              </div>
            ))}
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
                      {rx.medications.map((m, i) => (
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
            {patient.clinicalNotes.length === 0 ? (
              <div className="glass-card p-8 border border-white/10 text-center text-gray-400 text-sm">No clinical notes recorded.</div>
            ) : patient.clinicalNotes.map((n) => (
              <div key={n.id} className="glass-card p-5 border border-white/10 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-white">{n.authorName} <span className="font-normal text-gray-400">({n.authorRole})</span></p>
                    <p className="text-[11px] text-gray-500">{fmtDate(n.date)} at {n.time}</p>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${NOTE_TYPE_COLORS[n.type]}`}>
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
            {patient.documents.length === 0 ? (
              <div className="glass-card p-8 border border-white/10 text-center text-gray-400 text-sm">No medical documents uploaded.</div>
            ) : patient.documents.map((doc) => (
              <div key={doc.id} className="glass-card p-4 border border-white/10 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{doc.name}</p>
                  <p className="text-xs text-gray-400">{doc.category} · {doc.size} · Uploaded {fmtDate(doc.uploadedDate)} by {doc.uploadedBy}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-400">{doc.type}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export interface PatientRecordsPageProps {
  initialTab?: string;
}

export const PatientRecordsPage: React.FC<PatientRecordsPageProps> = ({ initialTab = 'overview' }) => {
  const [patients, setPatients]           = useState<DoctorPatient[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<DoctorPatient | null>(null);
  const lastTabRef = useRef<string>(initialTab);

  const [search, setSearch]         = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus]         = useState<PatientStatus | ''>('');
  const [sortBy, setSortBy]         = useState<'name' | 'lastVisit'>('name');

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPatients(undefined, { search, department, status, sortBy });
      setPatients(data);
    } catch (e) {
      setError('Failed to load patient records. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, department, status, sortBy]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const handleNoteAdded = (note: ClinicalNote) => {
    if (!selectedPatient) return;
    const updated = { ...selectedPatient, clinicalNotes: [note, ...selectedPatient.clinicalNotes] };
    setSelectedPatient(updated);
    setPatients(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

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

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-accent" /> Patient Records
          </h1>
          <p className="text-sm text-gray-400 mt-1">Showing patients assigned to your care</p>
        </div>
        <button onClick={fetchPatients} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white transition-colors" aria-label="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative col-span-1 sm:col-span-2 lg:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or patient ID..."
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

      {/* Sort */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <SortAsc className="w-4 h-4" />
        <span>Sort by:</span>
        {[{ v: 'name', l: 'Name' }, { v: 'lastVisit', l: 'Last Visit' }].map(({ v, l }) => (
          <button
            key={v}
            onClick={() => setSortBy(v as 'name' | 'lastVisit')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${sortBy === v ? 'bg-primary text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
          >
            {l}
          </button>
        ))}
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
          {patients.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass-card-interactive p-4 sm:p-5 border border-white/10 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              {/* Avatar */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white text-base font-bold flex-shrink-0">
                {p.firstName[0]}{p.lastName[0]}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-white">{p.firstName} {p.lastName}</p>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">P-{p.id} · {p.age} yrs · {p.gender?.name} · {p.department}</p>
                {p.primaryCondition && <p className="text-xs text-gray-300 mt-0.5 truncate">{p.primaryCondition}</p>}
                <p className="text-[11px] text-gray-500 mt-1">Last visit: {fmtDate(p.lastVisit)}{p.nextAppointment ? ` · Next: ${fmtDate(p.nextAppointment)}` : ''}</p>
              </div>

              {/* Alerts */}
              <div className="flex flex-wrap gap-2 flex-shrink-0">
                {p.status === 'Critical' && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-rose-300 px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30">
                    <AlertTriangle className="w-3 h-3" />CRITICAL
                  </span>
                )}
                {p.labReports.some(l => l.status === 'Pending') && (
                  <span className="text-[11px] font-medium text-amber-300 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30">Pending Labs</span>
                )}
              </div>

              {/* View */}
              <button
                onClick={() => setSelectedPatient(p)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/80 transition-colors flex-shrink-0"
              >
                View Record <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
