import React, { useState, useEffect } from 'react';
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
  ArrowRightLeft,
  LogOut,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { InpatientAdmissionRecord, AdmissionTimelineEvent } from '../../types';
import { getAdmissionTimeline } from '../../services/doctorService';

interface InpatientAdmissionDetailsModalProps {
  admission: InpatientAdmissionRecord | null;
  onClose: () => void;
  onOpenPatientChart?: (patientId: number) => void;
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

export const InpatientAdmissionDetailsModal: React.FC<InpatientAdmissionDetailsModalProps> = ({
  admission,
  onClose,
  onOpenPatientChart,
  onTransferBed,
  onStartDischarge,
}) => {
  const [timeline, setTimeline] = useState<AdmissionTimelineEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'timeline'>('details');

  useEffect(() => {
    if (!admission) {
      setTimeline([]);
      return;
    }

    const loadTimeline = async () => {
      setLoadingTimeline(true);
      try {
        const res = await getAdmissionTimeline(admission.id);
        if (res.success && res.data && Array.isArray(res.data.timeline)) {
          setTimeline(res.data.timeline);
        } else {
          // Default synthetic event
          setTimeline([
            {
              id: `adm-created-${admission.id}`,
              eventType: 'ADMISSION_CREATED',
              timestamp: admission.admissionDateTime,
              title: 'Patient Admitted to Hospital',
              description: `Admitted under ${admission.doctorName} to ${admission.wardName} (${admission.bedNumber})`,
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

  const admissionDateFormatted = admission.admissionDateTime
    ? new Date(admission.admissionDateTime).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recent Admission';

  const patientInitials = (admission.patientName || 'PT').slice(0, 2).toUpperCase();
  const isDischarged = admission.admissionStatus === 'DISCHARGED';

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
                    {admission.admissionNumber || 'ADM'}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  Admitted {admissionDateFormatted} • Recorded in Hospital Database
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="px-5 pt-3 pb-1 border-b border-white/10 flex items-center gap-3 bg-navy-950/40">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`pb-2.5 text-xs font-semibold transition-all relative cursor-pointer ${
                activeTab === 'details' ? 'text-accent border-b-2 border-accent' : 'text-gray-400 hover:text-white'
              }`}
            >
              Clinical Details & Ward
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              className={`pb-2.5 text-xs font-semibold transition-all relative flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'timeline' ? 'text-accent border-b-2 border-accent' : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>Admission Timeline</span>
              {timeline.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-accent/20 text-accent font-bold">
                  {timeline.length}
                </span>
              )}
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
            {activeTab === 'details' ? (
              <>
                {/* Patient Header Card */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-accent font-bold text-sm">
                      {patientInitials}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm flex items-center gap-2">
                        <span>{admission.patientName || 'Patient'}</span>
                        <span className="text-xs font-mono text-gray-400 font-normal">
                          ({admission.patientCode || `PT-${admission.patientId}`})
                        </span>
                      </h4>
                      <p className="text-xs text-gray-400">
                        {formatGender(admission.patientGender || admission.gender)} • {admission.patientAge || admission.age} yrs • Blood Group:{' '}
                        <span className="text-accent font-semibold">
                          {formatBloodGroup(admission.bloodGroup)}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${
                        statusColors[admission.admissionStatus] || statusColors.ADMITTED
                      }`}
                    >
                      {admission.admissionStatus === 'UNDER_OBSERVATION' ? 'Under Observation' : admission.admissionStatus}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${
                        acuityColors[admission.acuityLevel] || acuityColors.MODERATE
                      }`}
                    >
                      {admission.acuityLevel} Acuity
                    </span>
                  </div>
                </div>

                {/* Ward & Bed Allocation Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
                    <span className="text-gray-400 block text-[11px] mb-1 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-accent" />
                      <span>Hospital Ward & Department</span>
                    </span>
                    <div className="text-sm font-semibold text-white">{admission.wardName}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {admission.wardDepartment || 'Inpatient Services'} • Code: {admission.wardNumber}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
                    <span className="text-gray-400 block text-[11px] mb-1 flex items-center gap-1">
                      <Bed className="w-3.5 h-3.5 text-accent" />
                      <span>Assigned Hospital Bed</span>
                    </span>
                    <div className="text-sm font-semibold text-white flex items-center gap-2">
                      <span>{admission.bedNumber}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-normal">
                        Active Assignment
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">Telemetry & Vitals Linked</div>
                  </div>
                </div>

                {/* Clinical Notes & Diagnoses */}
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5 mb-1.5">
                      <Stethoscope className="w-3.5 h-3.5 text-accent" />
                      <span>Admission Diagnosis</span>
                    </span>
                    <p className="text-xs text-gray-200 leading-relaxed font-medium">
                      {admission.admissionDiagnosis}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5 mb-1.5">
                      <Activity className="w-3.5 h-3.5 text-accent" />
                      <span>Chief Complaint & Clinical Presentation</span>
                    </span>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      {admission.chiefComplaint}
                    </p>
                  </div>

                  {admission.nursingHandoverInstructions && (
                    <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mb-1">
                        <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Nursing Handover & Immediate Telemetry Instructions</span>
                      </span>
                      <div className="text-xs text-emerald-200 leading-relaxed whitespace-pre-wrap">
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
                      <span>Admission Status & Dates</span>
                    </span>
                    <span className="text-white font-semibold">{admissionDateFormatted}</span>
                    <span className="text-gray-400 block text-[11px] mt-0.5">
                      Discharge Date: {admission.dischargeDate ? new Date(admission.dischargeDate).toLocaleDateString() : 'Active Inpatient'}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              /* Timeline Tab */
              <div className="space-y-4 py-2">
                {loadingTimeline ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin text-accent mb-2" />
                    <span className="text-xs">Loading admission history and bed transfers...</span>
                  </div>
                ) : timeline.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-xs">
                    No historical events recorded for this admission.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-white/10">
                    {timeline.map((event, idx) => {
                      const isAdmission = event.eventType === 'ADMISSION_CREATED';
                      const isTransfer = event.eventType === 'BED_TRANSFERRED';
                      const isDischarge = event.eventType === 'DISCHARGE_COMPLETED';

                      return (
                        <div key={event.id || idx} className="relative group">
                          {/* Dot Icon */}
                          <div
                            className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center text-white border text-[10px] ${
                              isAdmission
                                ? 'bg-primary border-primary-light'
                                : isTransfer
                                ? 'bg-amber-500 border-amber-400'
                                : isDischarge
                                ? 'bg-emerald-500 border-emerald-400'
                                : 'bg-gray-600 border-gray-500'
                            }`}
                          >
                            {isAdmission ? (
                              <Bed className="w-2.5 h-2.5" />
                            ) : isTransfer ? (
                              <ArrowRightLeft className="w-2.5 h-2.5" />
                            ) : (
                              <CheckCircle2 className="w-2.5 h-2.5" />
                            )}
                          </div>

                          {/* Event Card */}
                          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <h5 className="text-xs font-bold text-white flex items-center gap-2">
                                <span>{event.title}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold uppercase bg-white/10 text-gray-300">
                                  {event.eventType}
                                </span>
                              </h5>
                              <span className="text-[11px] text-gray-400 font-mono">
                                {event.timestamp ? new Date(event.timestamp).toLocaleString() : ''}
                              </span>
                            </div>

                            <p className="text-xs text-gray-300 leading-relaxed mb-1">
                              {event.description}
                            </p>

                            {event.reason && (
                              <div className="text-[11px] text-amber-300 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 mt-1">
                                <strong>Reason:</strong> {event.reason}
                              </div>
                            )}

                            {event.performedBy && (
                              <span className="text-[10px] text-gray-400 block mt-1">
                                Performed by: {event.performedBy}
                              </span>
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

          {/* Footer Actions */}
          <div className="px-5 py-3.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 bg-navy-950/70">
            <span className="text-[11px] text-gray-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Immutable Clinical Admission Log</span>
            </span>

            <div className="flex items-center gap-2">
              {!isDischarged && onTransferBed && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onTransferBed(admission);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Transfer Bed</span>
                </button>
              )}

              {!isDischarged && onStartDischarge && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartDischarge(admission);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Discharge Workflow</span>
                </button>
              )}

              {onOpenPatientChart && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPatientChart(admission.patientId);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-accent hover:text-white bg-accent/10 hover:bg-accent/20 border border-accent/30 transition-colors cursor-pointer"
                >
                  Patient Chart
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
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
