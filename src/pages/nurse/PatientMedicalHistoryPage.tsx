import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, Loader2, AlertCircle, ShieldAlert, ChevronDown,
  Heart, Pill, FlaskConical, Calendar, Target,
  BookOpen, Clock, CheckCircle2, AlertTriangle, Info,
  ClipboardList, UserCheck, Activity,
} from 'lucide-react';
import * as nurseService from '../../services/nurseService';
import type {
  NursePatient, NurseMedicalHistory, NurseTreatmentPlan,
} from '../../types';
import { getTallManName } from '../../utils/medicationSafety';

// ─────────────────────────────────────────────────────────────────────────────
// Tab type
// ─────────────────────────────────────────────────────────────────────────────
export type HistoryTab = 'overview' | 'medications' | 'labs' | 'appointments' | 'treatment-plan';

const TABS: { id: HistoryTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview',       label: 'Medical Overview',  icon: Heart        },
  { id: 'medications',    label: 'Medications',        icon: Pill         },
  { id: 'labs',           label: 'Lab Reports',        icon: FlaskConical },
  { id: 'appointments',   label: 'Appointments',       icon: Calendar     },
  { id: 'treatment-plan', label: 'Treatment Plan',     icon: Target       },
];

// ─────────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────────
function SeverityBadge({ severity }: { severity: string }) {
  const cls =
    severity === 'Severe'   ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
    severity === 'Moderate' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                              'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>{severity}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'Active'    ? 'bg-sky-500/20 text-sky-300 border-sky-500/30' :
    status === 'Chronic'   ? 'bg-violet-500/20 text-violet-300 border-violet-500/30' :
    status === 'Resolved'  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
    status === 'Completed' ? 'bg-gray-500/20 text-gray-400 border-gray-500/30' :
    status === 'Critical'  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
    status === 'Abnormal'  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
    status === 'Pending'   ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                             'bg-gray-500/20 text-gray-400 border-gray-500/30';
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>{status}</span>;
}

function SectionCard({ title, icon: Icon, color = 'text-sky-400', children }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card border border-white/10 overflow-hidden">
      <div className={`flex items-center gap-2 px-5 py-3 border-b border-white/10 bg-white/[0.02]`}>
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs font-bold text-white uppercase tracking-wider">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-500">
      <Info className="w-8 h-8 text-gray-600" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Read-only notice banner
// ─────────────────────────────────────────────────────────────────────────────
function ReadOnlyNotice() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-medium">
      <ShieldAlert className="w-4 h-4 flex-shrink-0" />
      <span>
        <strong>Clinical Reference View.</strong> Comprehensive longitudinal medical history, prior hospitalizations, surgeries, contraindications, and active physician treatment plans.
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export const PatientMedicalHistoryPage: React.FC<{ initialTab?: HistoryTab }> = ({
  initialTab = 'overview',
}) => {
  const [activeTab, setActiveTab] = useState<HistoryTab>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // ── Patients ─────────────────────────────────────────────────────
  const [patients, setPatients]       = useState<NursePatient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<NursePatient | null>(null);
  const [patientSearch, setPatientSearch]     = useState('');
  const [patientDropdown, setPatientDropdown] = useState(false);

  // ── Data ─────────────────────────────────────────────────────────
  const [history, setHistory]           = useState<NurseMedicalHistory | null>(null);
  const [plan, setPlan]                 = useState<NurseTreatmentPlan | null>(null);
  const [dataLoading, setDataLoading]   = useState(false);
  const [errorMsg, setErrorMsg]         = useState('');

  // ── Load patients ─────────────────────────────────────────────────
  useEffect(() => {
    setPatientsLoading(true);
    nurseService.getPatients()
      .then((pts) => {
        setPatients(pts);
        if (pts.length > 0) {
          handleSelectPatient(pts[0]);
        }
      })
      .catch(() => setErrorMsg('Unable to load patient list. Please refresh.'))
      .finally(() => setPatientsLoading(false));
  }, []);

  const filteredPatients = patients.filter((p) => {
    const q = patientSearch.toLowerCase();
    return (
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      p.patientId.toLowerCase().includes(q) ||
      p.department.toLowerCase().includes(q)
    );
  });

  const handleSelectPatient = (p: NursePatient) => {
    setSelectedPatient(p);
    setPatientDropdown(false);
    setPatientSearch('');
    setHistory(null);
    setPlan(null);
    setErrorMsg('');
  };

  // ── Load history + plan when patient changes ──────────────────────
  const loadData = useCallback(async (patientId: number) => {
    setDataLoading(true);
    setErrorMsg('');
    try {
      const [h, tp] = await Promise.all([
        nurseService.getMedicalHistory(patientId),
        nurseService.getTreatmentPlan(patientId),
      ]);
      setHistory(h);
      setPlan(tp);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load patient information. Please try again.');
    } finally { setDataLoading(false); }
  }, []);

  useEffect(() => {
    if (selectedPatient) loadData(selectedPatient.id);
  }, [selectedPatient, loadData]);

  // ─────────────────────────────────────────────────────────────────
  // Render tab content
  // ─────────────────────────────────────────────────────────────────
  const renderOverview = () => {
    if (!history) return null;
    return (
      <div className="space-y-5">

        {/* Conditions */}
        <SectionCard title="Medical Conditions" icon={Heart} color="text-rose-400">
          {history.conditions.length === 0 ? (
            <EmptyState message="No conditions recorded." />
          ) : (
            <div className="space-y-3">
              {history.conditions.map((c, i) => (
                <div key={i} className="flex flex-wrap items-start justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div>
                    <p className="text-sm font-bold text-white">{c.condition}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Diagnosed: {c.diagnosedDate}</p>
                    {c.notes && <p className="text-xs text-gray-300 mt-1">{c.notes}</p>}
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Allergies & Triage Verification */}
        {selectedPatient && (
          <SectionCard title="Allergies & Contraindications" icon={AlertTriangle} color="text-rose-400">
            {selectedPatient.allergies.length === 0 ? (
              <div className="flex items-center gap-2 text-emerald-300 text-sm">
                <CheckCircle2 className="w-4 h-4" /> No known allergies documented (NKDA).
              </div>
            ) : (
              <div className="space-y-2">
                {selectedPatient.allergies.map((a, i) => {
                  const isVerified = a.verificationStatus?.startsWith('Verified');
                  return (
                    <div key={i} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white">{a.substance}</p>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isVerified
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            {a.verificationStatus || 'Self-Reported (Unverified)'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-300 mt-0.5">
                          {a.reaction}
                          {a.reactionType && <span className="text-gray-400 ml-1">· {a.reactionType}</span>}
                          {a.verifiedBy && <span className="text-gray-400 ml-1">· Verifier: {a.verifiedBy}</span>}
                        </p>
                      </div>
                      <SeverityBadge severity={a.severity} />
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        )}

        {/* Family History */}
        <SectionCard title="Family History" icon={UserCheck} color="text-violet-400">
          <p className="text-sm text-gray-200">{history.familyHistory || 'No family history recorded.'}</p>
        </SectionCard>

        {/* Hospitalizations */}
        <SectionCard title="Previous Hospitalizations" icon={Activity} color="text-amber-400">
          {history.hospitalizations.length === 0 ? (
            <EmptyState message="No previous hospitalizations recorded." />
          ) : (
            <div className="space-y-3">
              {history.hospitalizations.map((h, i) => (
                <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-white">{h.reason}</p>
                    <span className="text-xs text-gray-400">{h.date} · {h.duration}</span>
                  </div>
                  <p className="text-xs text-gray-400">{h.hospital}</p>
                  <p className="text-xs text-gray-300">{h.outcome}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Surgeries */}
        {history.surgeries.length > 0 && (
          <SectionCard title="Surgical History" icon={ClipboardList} color="text-cyan-400">
            <div className="space-y-3">
              {history.surgeries.map((s, i) => (
                <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-white">{s.procedure}</p>
                    <span className="text-xs text-gray-400">{s.date}</span>
                  </div>
                  <p className="text-xs text-gray-400">{s.hospital}</p>
                  {s.notes && <p className="text-xs text-gray-300">{s.notes}</p>}
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </div>
    );
  };

  const renderMedications = () => {
    if (!history) return null;
    return (
      <SectionCard title="Current Medications" icon={Pill} color="text-violet-400">
        {history.currentMedications.length === 0 ? (
          <EmptyState message="No current medications recorded." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  {['Medication', 'Dosage', 'Frequency', 'Start Date', 'Prescribed By', 'Status'].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.currentMedications.map((med, i) => (
                  <tr key={i} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                    <td className="px-3 py-3 text-white font-semibold whitespace-nowrap font-mono">{getTallManName(med.name)}</td>
                    <td className="px-3 py-3 text-gray-200 whitespace-nowrap">{med.dosage}</td>
                    <td className="px-3 py-3 text-gray-300">{med.frequency}</td>
                    <td className="px-3 py-3 text-gray-400 whitespace-nowrap">{med.startDate}</td>
                    <td className="px-3 py-3 text-gray-400 whitespace-nowrap">{med.prescribedBy}</td>
                    <td className="px-3 py-3"><StatusBadge status={med.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    );
  };

  const renderLabs = () => {
    if (!history) return null;
    return (
      <SectionCard title="Laboratory Reports" icon={FlaskConical} color="text-cyan-400">
        {history.labReports.length === 0 ? (
          <EmptyState message="No laboratory reports available." />
        ) : (
          <div className="space-y-3">
            {history.labReports.map((lab) => (
              <div key={lab.id} className={`p-4 rounded-xl border ${
                lab.status === 'Abnormal' || lab.status === 'Critical'
                  ? 'bg-amber-500/5 border-amber-500/20'
                  : lab.status === 'Pending'
                  ? 'bg-blue-500/5 border-blue-500/20'
                  : 'bg-white/5 border-white/10'
              }`}>
                <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-sm font-bold text-white">{lab.testName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{lab.date} · Ordered by {lab.orderedBy}</p>
                  </div>
                  <StatusBadge status={lab.status} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Result</p>
                    <p className="text-sm font-bold text-white mt-0.5">{lab.result} {lab.unit}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Reference</p>
                    <p className="text-xs text-gray-300 mt-0.5">{lab.referenceRange}</p>
                  </div>
                </div>
                {lab.notes && (
                  <p className="text-xs text-gray-400 mt-2 italic">{lab.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    );
  };

  const renderAppointments = () => {
    if (!history) return null;
    return (
      <SectionCard title="Appointment History" icon={Calendar} color="text-sky-400">
        {history.appointments.length === 0 ? (
          <EmptyState message="No appointments recorded." />
        ) : (
          <div className="space-y-3">
            {history.appointments.map((apt) => (
              <div key={apt.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
                  <div>
                    <p className="text-sm font-bold text-white">{apt.reason}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{apt.date} {apt.time} · {apt.doctorName} · {apt.department}</p>
                  </div>
                  <StatusBadge status={apt.status} />
                </div>
                {apt.notes && <p className="text-xs text-gray-300 mt-1">{apt.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    );
  };

  const renderTreatmentPlan = () => {
    if (!plan) {
      return (
        <div className="glass-card border border-white/10 p-8">
          <div className="flex flex-col items-center justify-center gap-3 text-gray-500">
            <Target className="w-10 h-10 text-gray-600" />
            <p className="text-sm">No treatment plan available for this patient.</p>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-5">

        {/* Header card */}
        <div className="glass-card p-5 border border-sky-400/20 bg-gradient-to-r from-navy-900/90 to-navy-800/80">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">Treatment Plan</span>
              <h3 className="text-lg font-extrabold text-white mt-1">{plan.title}</h3>
              <p className="text-sm text-gray-300 mt-0.5">{plan.diagnosisCondition}</p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-xs text-gray-400">Assigned Doctor: <span className="text-white font-semibold">{plan.assignedDoctor}</span></p>
              <p className="text-xs text-gray-400">Start: <span className="text-white">{plan.startDate}</span></p>
              <p className="text-xs text-gray-400">Follow-up: <span className="text-white">{plan.expectedFollowUp}</span></p>
            </div>
          </div>
        </div>

        {/* Important Instructions */}
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-rose-300 uppercase tracking-wider mb-1">Important Nursing Instructions</p>
            <p className="text-sm text-gray-200">{plan.importantInstructions}</p>
          </div>
        </div>

        {/* Treatment Goals */}
        <SectionCard title="Treatment Goals" icon={Target} color="text-emerald-400">
          <ul className="space-y-2">
            {plan.treatmentGoals.map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />{g}
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Planned Procedures */}
        <SectionCard title="Planned Procedures & Monitoring" icon={ClipboardList} color="text-cyan-400">
          <ul className="space-y-2">
            {plan.plannedProcedures.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-200">
                <Activity className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />{p}
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Medications in plan */}
        <SectionCard title="Prescribed Medications" icon={Pill} color="text-violet-400">
          <div className="space-y-2">
            {plan.medications.map((m, i) => (
              <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-sm font-bold text-white">{m.name}</p>
                <p className="text-xs text-gray-300 mt-0.5">{m.instructions}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Frequency */}
        <SectionCard title="Monitoring Frequency" icon={Clock} color="text-amber-400">
          <p className="text-sm text-gray-200">{plan.treatmentFrequency}</p>
        </SectionCard>

        {/* Read-only footer */}
        <div className="flex items-center gap-2 text-xs text-gray-500 px-1">
          <BookOpen className="w-3.5 h-3.5" />
          This treatment plan is authored by the assigned physician and is <strong className="text-gray-400">read-only</strong> for nursing staff.
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Page Header ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 border border-violet-400/30 bg-gradient-to-r from-navy-900/90 via-navy-800/80 to-navy-900/90">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-purple-400 flex items-center justify-center shadow-lg flex-shrink-0">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Patient Medical History &amp; Treatment Plans</h2>
            <p className="text-xs text-gray-400 mt-0.5">Clinical Reference — Longitudinal medical history, prior hospitalizations, surgeries, and treatment plans</p>
          </div>
        </div>
      </motion.div>

      {/* ── Read-only notice ── */}
      <ReadOnlyNotice />

      {/* ── Error ── */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            {errorMsg}
            <button onClick={() => setErrorMsg('')} className="ml-auto"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Patient Selector ── */}
      <div className="glass-card p-5 border border-white/10 space-y-3 relative z-30">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Search className="w-4 h-4 text-violet-400" /> Select Patient
        </h3>
        <div className="relative">
          <button
            type="button"
            onClick={() => setPatientDropdown((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm bg-white/5 border border-white/15 rounded-xl hover:border-violet-400/50 transition-all text-left cursor-pointer"
          >
            {selectedPatient
              ? <span className="text-white font-semibold">{selectedPatient.firstName} {selectedPatient.lastName} — <span className="text-violet-400 text-xs font-mono">{selectedPatient.patientId}</span></span>
              : <span className="text-gray-400 font-medium">Choose an assigned patient…</span>}
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${patientDropdown ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {patientDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setPatientDropdown(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-full mt-1.5 left-0 right-0 z-50 bg-[#0F172A] border border-white/20 rounded-xl shadow-2xl overflow-hidden"
                >
                  <div className="p-2.5 border-b border-white/10 bg-white/5">
                    <input
                      type="text"
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      placeholder="Search patient by name, ID, or ward…"
                      autoFocus
                      className="w-full py-2 px-3 text-sm text-white bg-black/40 border border-white/15 rounded-lg focus:outline-none focus:border-violet-400/60 placeholder:text-gray-500"
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {patientsLoading ? (
                      <div className="p-4 text-center text-gray-400 text-sm flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading patients…
                      </div>
                    ) : filteredPatients.length === 0 ? (
                      <div className="p-4 text-center text-gray-400 text-sm">No patients found.</div>
                    ) : filteredPatients.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPatient(p)}
                        className={`w-full text-left px-4 py-3 hover:bg-violet-500/10 transition-colors border-b border-white/5 last:border-0 flex items-center gap-3 cursor-pointer ${
                          selectedPatient?.id === p.id ? 'bg-violet-500/15 border-l-2 border-violet-400' : ''
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-purple-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {p.firstName[0]}{p.lastName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-semibold truncate">{p.firstName} {p.lastName}</p>
                          <p className="text-xs text-gray-400">{p.patientId} · {p.department} · {p.ward}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                          p.status === 'Critical' ? 'bg-rose-500/20 text-rose-300' :
                          p.status === 'Admitted' ? 'bg-amber-500/20 text-amber-300' :
                          'bg-emerald-500/20 text-emerald-300'
                        }`}>{p.status}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {selectedPatient && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-violet-500/5 border border-violet-500/20">
            {[
              ['Ward', selectedPatient.ward],
              ['Doctor', selectedPatient.assignedDoctor],
              ['Condition', selectedPatient.primaryCondition ?? '—'],
              ['Blood Group', selectedPatient.bloodGroup?.name ?? '—'],
            ].map(([l, v]) => (
              <div key={l} className="bg-white/5 rounded-lg p-2">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">{l}</p>
                <p className="text-xs text-white font-semibold mt-0.5 truncate">{v}</p>
              </div>
            ))}
          </motion.div>
        )}
      </div>

      {/* ── No patient selected ── */}
      {!selectedPatient && (
        <div className="glass-card border border-white/10 p-12 flex flex-col items-center justify-center gap-4 text-gray-500">
          <BookOpen className="w-12 h-12 text-gray-600" />
          <p className="text-sm">Select an assigned patient to view their medical history and treatment plan.</p>
        </div>
      )}

      {/* ── Loading ── */}
      {selectedPatient && dataLoading && (
        <div className="glass-card border border-white/10 p-14 flex items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
          <span className="text-sm">Loading patient information…</span>
        </div>
      )}

      {/* ── Data loaded ── */}
      {selectedPatient && !dataLoading && history && (
        <>
          {/* Tab bar */}
          <div className="flex flex-wrap gap-2">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === id
                    ? 'bg-violet-600 text-white shadow-lg'
                    : 'bg-white/10 text-gray-400 hover:bg-white/15 hover:text-white'
                }`}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {activeTab === 'overview'       && renderOverview()}
              {activeTab === 'medications'    && renderMedications()}
              {activeTab === 'labs'           && renderLabs()}
              {activeTab === 'appointments'   && renderAppointments()}
              {activeTab === 'treatment-plan' && renderTreatmentPlan()}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </div>
  );
};

export default PatientMedicalHistoryPage;
