import React from 'react';
import {
  X,
  Bed,
  Building2,
  Activity,
  Stethoscope,
  FileText,
  User,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { InpatientAdmissionRecord } from '../../types';

interface InpatientAdmissionDetailsModalProps {
  admission: InpatientAdmissionRecord | null;
  onClose: () => void;
  onOpenPatientChart?: (patientId: number) => void;
}

export const InpatientAdmissionDetailsModal: React.FC<InpatientAdmissionDetailsModalProps> = ({
  admission,
  onClose,
  onOpenPatientChart,
}) => {
  if (!admission) return null;

  const acuityColors: Record<string, string> = {
    LOW: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    MODERATE: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    HIGH: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    CRITICAL: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  };

  const statusColors: Record<string, string> = {
    ADMITTED: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    UNDER_OBSERVATION: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    DISCHARGED: 'bg-slate-500/20 text-gray-400 border-slate-500/40',
  };

  const admissionDateFormatted = new Date(admission.admissionDateTime).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative w-full max-w-2xl bg-gradient-to-b from-navy-900 to-navy-950 border border-white/15 rounded-2xl shadow-2xl overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-navy-950/70">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent/15 border border-accent/30 text-accent">
                <Bed className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white tracking-wide">
                    Inpatient Admission Record
                  </h3>
                  <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-accent/20 text-accent border border-accent/40 font-bold">
                    {admission.admissionNumber}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  Admitted {admissionDateFormatted} • Recorded in Hospital Database
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
            {/* Patient Header Card */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-accent font-bold text-sm">
                  {admission.patientName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <span>{admission.patientName}</span>
                    <span className="text-xs font-mono text-gray-400 font-normal">
                      ({admission.patientCode || `PT-${admission.patientId}`})
                    </span>
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Age: {admission.age} • Gender: {admission.gender} • Blood Group: {admission.bloodGroup} • Phone: {admission.phone || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className={`text-xs px-2.5 py-1 rounded-lg border font-semibold ${statusColors[admission.admissionStatus] || 'bg-slate-500/20 text-gray-300'}`}>
                  {admission.admissionStatus}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-lg border font-semibold ${acuityColors[admission.acuityLevel] || 'bg-slate-500/20 text-gray-300'}`}>
                  {admission.acuityLevel} Acuity
                </span>
              </div>
            </div>

            {/* Ward & Bed Allocation Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
                <div className="text-gray-400 text-xs flex items-center gap-1.5 mb-1">
                  <Building2 className="w-3.5 h-3.5 text-accent" />
                  <span>Assigned Hospital Ward</span>
                </div>
                <div className="font-bold text-sm text-white">
                  {admission.wardName}
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  Department: {admission.wardDepartment || 'General Inpatient'}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
                <div className="text-gray-400 text-xs flex items-center gap-1.5 mb-1">
                  <Bed className="w-3.5 h-3.5 text-accent" />
                  <span>Assigned Bed</span>
                </div>
                <div className="font-bold text-sm text-accent">
                  {admission.bedNumber}
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  Status: Currently Occupied by Patient
                </div>
              </div>
            </div>

            {/* Clinical Details */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
              <div>
                <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5 mb-1">
                  <Stethoscope className="w-3.5 h-3.5 text-accent" />
                  <span>Admission Diagnosis</span>
                </span>
                <p className="text-xs text-white bg-slate-900/60 p-2.5 rounded-lg border border-white/5">
                  {admission.admissionDiagnosis}
                </p>
              </div>

              <div>
                <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5 mb-1">
                  <Activity className="w-3.5 h-3.5 text-accent" />
                  <span>Chief Complaint</span>
                </span>
                <p className="text-xs text-gray-200 bg-slate-900/60 p-2.5 rounded-lg border border-white/5">
                  {admission.chiefComplaint}
                </p>
              </div>

              {admission.nursingHandoverInstructions && (
                <div>
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mb-1">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Nursing Handover & Immediate Telemetry Instructions</span>
                  </span>
                  <div className="text-xs text-emerald-200 bg-emerald-950/20 border border-emerald-500/20 p-3 rounded-lg leading-relaxed whitespace-pre-wrap">
                    {admission.nursingHandoverInstructions}
                  </div>
                </div>
              )}
            </div>

            {/* Metadata & Physician Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10">
                <span className="text-gray-400 block text-[11px] mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-accent" />
                  <span>Admitting Physician</span>
                </span>
                <span className="text-white font-semibold">{admission.doctorName}</span>
                <span className="text-gray-400 block text-[11px] mt-0.5">
                  {admission.doctorSpecialization} ({admission.doctorDepartment})
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10">
                <span className="text-gray-400 block text-[11px] mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-accent" />
                  <span>Admission Timestamp</span>
                </span>
                <span className="text-white font-semibold">{admissionDateFormatted}</span>
                <span className="text-gray-400 block text-[11px] mt-0.5">
                  Discharge Date: {admission.dischargeDate ? new Date(admission.dischargeDate).toLocaleDateString() : 'Active Inpatient'}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-5 py-3.5 border-t border-white/10 flex items-center justify-between bg-navy-950/70">
            <span className="text-[11px] text-gray-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Immutable Clinical Admission Log</span>
            </span>

            <div className="flex items-center gap-2">
              {onOpenPatientChart && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPatientChart(admission.patientId);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-accent hover:text-white bg-accent/10 hover:bg-accent/20 border border-accent/30 transition-colors cursor-pointer"
                >
                  Open Patient Chart
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
