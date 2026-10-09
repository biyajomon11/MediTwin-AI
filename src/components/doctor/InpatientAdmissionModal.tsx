import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Bed, User, AlertTriangle, CheckCircle2, Loader2,
  Stethoscope, Building2, FileText, Activity
} from 'lucide-react';
import type { DoctorPatient } from '../../types';
import { admitPatient } from '../../services/doctorService';
import { formatPatientId } from '../../utils/patientUtils';

interface InpatientAdmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: DoctorPatient[];
  initialPatientId?: number;
  onAdmitted: (patient: DoctorPatient) => void;
}

const WARDS = [
  { id: 'Ward 1', name: 'Ward 1 (General Medicine)', type: 'General', defaultBeds: ['Bed 01', 'Bed 02', 'Bed 05', 'Bed 08'] },
  { id: 'Ward 2', name: 'Ward 2 (Surgical / Semi-Private)', type: 'Surgical', defaultBeds: ['Bed 03', 'Bed 06', 'Bed 10', 'Bed 12'] },
  { id: 'Ward 3', name: 'Ward 3 (Medical Inpatient)', type: 'Medical', defaultBeds: ['Bed 04', 'Bed 07', 'Bed 08', 'Bed 11'] },
  { id: 'Ward 4', name: 'Ward 4 (Specialty Care / Stepdown)', type: 'Specialty', defaultBeds: ['Bed 02', 'Bed 09', 'Bed 14', 'Bed 15'] },
  { id: 'ICU', name: 'ICU (Intensive & Critical Care)', type: 'Critical', defaultBeds: ['Bed 01', 'Bed 02', 'Bed 03', 'Bed 04'] },
];

export const InpatientAdmissionModal: React.FC<InpatientAdmissionModalProps> = ({
  isOpen,
  onClose,
  patients,
  initialPatientId,
  onAdmitted,
}) => {
  const [selectedPatientId, setSelectedPatientId] = useState<number>(() => {
    return initialPatientId || (patients.length > 0 ? patients[0].id : 1);
  });
  const [selectedWard, setSelectedWard] = useState<string>('Ward 1');
  const [selectedBed, setSelectedBed] = useState<string>('Bed 01');
  const [acuityStatus, setAcuityStatus] = useState<'Admitted' | 'Critical' | 'Under Observation'>('Admitted');
  const [diagnosis, setDiagnosis] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (initialPatientId) {
      setSelectedPatientId(initialPatientId);
    } else if (patients.length > 0 && !patients.some((p) => p.id === selectedPatientId)) {
      setSelectedPatientId(patients[0].id);
    }
  }, [initialPatientId, patients]);

  const activePatient = patients.find((p) => p.id === selectedPatientId) || patients[0];

  useEffect(() => {
    if (activePatient) {
      setDiagnosis(activePatient.primaryCondition || '');
    }
  }, [selectedPatientId, activePatient]);

  // Automatically switch acuity when ICU is selected
  const handleWardChange = (wardId: string) => {
    setSelectedWard(wardId);
    if (wardId === 'ICU') {
      setAcuityStatus('Critical');
      setSelectedBed('Bed 02');
    } else {
      if (acuityStatus === 'Critical') setAcuityStatus('Admitted');
      const wObj = WARDS.find((w) => w.id === wardId);
      if (wObj && wObj.defaultBeds.length > 0) {
        setSelectedBed(wObj.defaultBeds[0]);
      }
    }
  };

  const handleConfirmAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedPatientId) {
      setErrorMsg('Please select a patient to admit.');
      return;
    }
    if (!selectedWard) {
      setErrorMsg('Please select an inpatient ward.');
      return;
    }

    setSubmitting(true);
    try {
      const cleanBed = selectedBed.trim()
        ? (selectedBed.trim().toLowerCase().startsWith('bed') ? selectedBed.trim() : `Bed ${selectedBed.trim()}`)
        : 'Bed 01';

      const res = await admitPatient(selectedPatientId, {
        ward: selectedWard,
        bedNumber: cleanBed,
        admissionStatus: acuityStatus,
        diagnosis: diagnosis.trim() || undefined,
        reason: reason.trim() || undefined,
      });

      if (res.success) {
        const updatedTarget: DoctorPatient = {
          ...activePatient,
          ward: `${selectedWard} – ${cleanBed}`,
          bedNumber: cleanBed,
          status: acuityStatus,
          admissionDate: new Date().toISOString().split('T')[0],
          primaryCondition: diagnosis.trim() || activePatient.primaryCondition,
        };
        onAdmitted(updatedTarget);
        onClose();
      } else {
        setErrorMsg(res.error || 'Failed to complete admission.');
      }
    } catch (err: any) {
      console.error('Admission failed:', err);
      setErrorMsg(err.message || 'An unexpected error occurred during admission.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-gradient-to-b from-[#131b2e] to-[#0b101d] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden my-8"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                <Bed className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  Hospital Inpatient Admission
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase">
                    Step 3 • Inpatient Workflow
                  </span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Allocate an inpatient bed and record immediate admission vitals & diagnosis
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={submitting}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleConfirmAdmission} className="p-6 space-y-5">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Patient Selection */}
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-accent" />
                <span>Select Patient for Admission</span>
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(Number(e.target.value))}
                className="w-full bg-slate-900/90 border border-white/20 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-accent outline-none transition-colors"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    {p.firstName} {p.lastName} ({formatPatientId(p)}) • Age: {p.age} • Status: {p.status || 'Active'} • {p.ward || 'Outpatient (No Bed)'}
                  </option>
                ))}
              </select>
            </div>

            {/* Active Patient Snapshot Card */}
            {activePatient && (
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-gray-400 block text-[11px]">Selected Patient</span>
                  <span className="text-white font-bold text-sm">
                    {activePatient.firstName} {activePatient.lastName}
                  </span>
                  <span className="ml-2 font-mono text-[11px] text-cyan-300 px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                    {formatPatientId(activePatient)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Current Placement</span>
                  <span className="text-gray-200 font-medium">
                    {activePatient.ward || 'Outpatient (Ambulatory Clinic)'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Department</span>
                  <span className="text-accent font-medium">
                    {activePatient.department || 'General Medicine'}
                  </span>
                </div>
              </div>
            )}

            {/* Ward & Bed Allocation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-accent" />
                  <span>Assigned Hospital Ward</span>
                </label>
                <select
                  value={selectedWard}
                  onChange={(e) => handleWardChange(e.target.value)}
                  className="w-full bg-slate-900/90 border border-white/20 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-accent outline-none"
                >
                  {WARDS.map((w) => (
                    <option key={w.id} value={w.id} className="bg-slate-900 text-white">
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5 flex items-center gap-1.5">
                  <Bed className="w-3.5 h-3.5 text-accent" />
                  <span>Bed Number / Unit</span>
                </label>
                <input
                  type="text"
                  value={selectedBed}
                  onChange={(e) => setSelectedBed(e.target.value)}
                  placeholder="e.g. Bed 05"
                  className="w-full bg-slate-900/90 border border-white/20 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-accent outline-none"
                  required
                />
                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[10px] text-gray-400 mr-1">Presets:</span>
                  {['Bed 01', 'Bed 02', 'Bed 05', 'Bed 08', 'Bed 12', 'Bed 14'].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setSelectedBed(b)}
                      className={`text-[10px] px-2 py-0.5 rounded-md transition-colors cursor-pointer border ${
                        selectedBed === b
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                          : 'bg-white/5 text-gray-400 hover:text-white border-white/10'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Admission Care Acuity / Status */}
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1.5 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-accent" />
                <span>Clinical Acuity Level</span>
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'Admitted', label: 'Admitted', desc: 'Standard inpatient care', color: 'border-blue-500/40 text-blue-300 bg-blue-500/10' },
                  { id: 'Critical', label: 'Critical Care', desc: 'ICU / Continuous monitoring', color: 'border-rose-500/40 text-rose-300 bg-rose-500/10' },
                  { id: 'Under Observation', label: 'Observation', desc: '24-48h stepdown watch', color: 'border-amber-500/40 text-amber-300 bg-amber-500/10' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setAcuityStatus(st.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      acuityStatus === st.id
                        ? `${st.color} ring-1 ring-white/20 shadow-md`
                        : 'border-white/10 bg-white/[0.02] text-gray-400 hover:bg-white/[0.05]'
                    }`}
                  >
                    <span className="font-bold text-xs block text-white">{st.label}</span>
                    <span className="text-[10px] text-gray-400 mt-0.5 block leading-tight">{st.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Admission Diagnosis */}
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1.5 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-accent" />
                <span>Admission Diagnosis / Chief Complaint</span>
              </label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="e.g. Acute Bronchitis exacerbation, Uncontrolled Hypertension"
                className="w-full bg-slate-900/90 border border-white/20 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-accent outline-none"
              />
            </div>

            {/* Clinical Admission Instructions / Notes */}
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-accent" />
                <span>Admission Nursing & Handover Instructions (Optional)</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="e.g. Admitted via outpatient evaluation for IV antibiotic stabilization. Monitor SpO2 and blood glucose q4h."
                className="w-full bg-slate-900/90 border border-white/20 rounded-xl px-3.5 py-2 text-xs text-white focus:border-accent outline-none resize-none"
              />
            </div>

            {/* Form Actions */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-gray-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Syncs live with PostgreSQL and Ward Telemetry</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-accent to-emerald-400 hover:from-accent/90 hover:to-emerald-400/90 text-navy-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-accent/20 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Admitting...</span>
                    </>
                  ) : (
                    <>
                      <Bed className="w-3.5 h-3.5" />
                      <span>Admit Inpatient</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
