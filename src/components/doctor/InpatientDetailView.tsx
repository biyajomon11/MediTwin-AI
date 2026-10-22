import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
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
  Loader2,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  Pill,
  HeartPulse,
  ClipboardList,
} from 'lucide-react';
import type { InpatientAdmissionRecord, AdmissionTimelineEvent } from '../../types';
import { getAdmissionTimeline } from '../../services/doctorService';

interface InpatientDetailViewProps {
  admission: InpatientAdmissionRecord;
  onBack: () => void;
  onOpenPatientChart?: (patientId: number, tab?: string) => void;
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

export const InpatientDetailView: React.FC<InpatientDetailViewProps> = ({
  admission,
  onBack,
  onOpenPatientChart,
  onTransferBed,
  onStartDischarge,
}) => {
  const [timeline, setTimeline] = useState<AdmissionTimelineEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline'>('overview');

  useEffect(() => {
    const loadTimeline = async () => {
      setLoadingTimeline(true);
      try {
        const res = await getAdmissionTimeline(admission.id);
        if (res.success && res.data && Array.isArray(res.data.timeline)) {
          setTimeline(res.data.timeline);
        } else {
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
  }, [admission.id]);

  const acuityColors: Record<string, { badge: string; border: string }> = {
    LOW: { badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', border: 'border-emerald-500/30' },
    MODERATE: { badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40', border: 'border-blue-500/30' },
    HIGH: { badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40', border: 'border-amber-500/30' },
    CRITICAL: { badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40', border: 'border-rose-500/30' },
  };

  const statusColors: Record<string, string> = {
    ADMITTED: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    UNDER_OBSERVATION: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    DISCHARGED: 'bg-slate-500/20 text-gray-400 border-slate-500/40',
  };

  const admissionDateFormatted = admission.admissionDateTime
    ? new Date(admission.admissionDateTime).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recent Admission';

  const patientInitials = (admission.patientName || 'PT').slice(0, 2).toUpperCase();
  const isDischarged = admission.admissionStatus === 'DISCHARGED';
  const acuityStyle = acuityColors[admission.acuityLevel] || acuityColors.MODERATE;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Navigation & Sticky Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-white font-medium text-xs sm:text-sm transition-all hover:border-accent shadow-sm group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-accent group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Inpatients</span>
          </button>

          <div className="h-6 w-px bg-white/15 hidden sm:block" />

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {admission.patientName}
              </h2>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-accent/20 text-accent border border-accent/40 font-bold">
                {admission.admissionNumber}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Inpatient Detail File • {admission.wardName} ({admission.bedNumber})
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {!isDischarged && onTransferBed && (
            <button
              type="button"
              onClick={() => onTransferBed(admission)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-medium text-xs transition-colors cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Transfer Bed</span>
            </button>
          )}

          {!isDischarged && onStartDischarge && (
            <button
              type="button"
              onClick={() => onStartDischarge(admission)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-medium text-xs transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Discharge Summary</span>
            </button>
          )}

          {onOpenPatientChart && (
            <button
              type="button"
              onClick={() => onOpenPatientChart(admission.patientId, 'overview')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent text-navy-950 font-bold text-xs hover:bg-accent/90 transition-colors shadow-sm cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Open Patient Chart</span>
            </button>
          )}
        </div>
      </div>

      {/* Hero Patient Overview Banner */}
      <div className={`p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-navy-900/90 via-navy-900/60 to-navy-950/90 border ${acuityStyle.border} shadow-xl backdrop-blur-sm`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-accent/20 border-2 border-accent/40 flex items-center justify-center text-accent font-extrabold text-2xl shadow-inner flex-shrink-0">
              {patientInitials}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-xl font-bold text-white tracking-wide">
                  {admission.patientName}
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/[0.08] text-gray-300 border border-white/10">
                  MRN: {admission.patientCode || `PT-${admission.patientId}`}
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${statusColors[admission.admissionStatus] || statusColors.ADMITTED}`}>
                  {admission.admissionStatus === 'UNDER_OBSERVATION' ? 'Under Observation' : admission.admissionStatus}
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold ${acuityStyle.badge}`}>
                  {admission.acuityLevel} ACUITY
                </span>
              </div>

              <div className="flex items-center gap-4 mt-2 text-xs text-gray-300 flex-wrap">
                <span>
                  <strong>Gender:</strong> {formatGender(admission.patientGender || admission.gender)}
                </span>
                <span>•</span>
                <span>
                  <strong>Age:</strong> {admission.patientAge || admission.age} yrs
                </span>
                <span>•</span>
                <span>
                  <strong>Blood Group:</strong>{' '}
                  <span className="text-accent font-semibold">{formatBloodGroup(admission.bloodGroup)}</span>
                </span>
                <span>•</span>
                <span>
                  <strong>Admission Date:</strong> {admissionDateFormatted}
                </span>
              </div>
            </div>
          </div>

          {/* Location Quick Pill */}
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.04] border border-white/10 self-start md:self-auto">
            <div className="p-2.5 rounded-lg bg-accent/15 border border-accent/30 text-accent">
              <Bed className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-gray-400 block font-medium">Assigned Location</span>
              <div className="text-sm font-bold text-white">{admission.wardName}</div>
              <div className="text-xs text-accent font-mono font-semibold">{admission.bedNumber}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === 'overview'
              ? 'text-accent border-b-2 border-accent'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Full Clinical & Admission Details</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('timeline')}
          className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === 'timeline'
              ? 'text-accent border-b-2 border-accent'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Admission Timeline & Movements</span>
          {timeline.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-accent/20 text-accent font-bold">
              {timeline.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Full Clinical & Admission Details */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1 & 2: Clinical Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Primary Diagnosis & Complaint */}
              <div className="p-5 rounded-2xl bg-navy-900/60 border border-white/10 shadow-lg space-y-4">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
                  <Activity className="w-4 h-4 text-accent" />
                  <span>Clinical Admission Profile</span>
                </h4>

                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                    Primary Admission Diagnosis
                  </label>
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-white font-medium text-sm">
                    {admission.admissionDiagnosis || 'No admission diagnosis recorded'}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                    Chief Complaint & Symptoms
                  </label>
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-gray-300 text-sm leading-relaxed">
                    {admission.chiefComplaint || 'No chief complaint recorded'}
                  </div>
                </div>

                {admission.nursingHandoverInstructions && (
                  <div>
                    <label className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>Nursing Handover & Special Care Instructions</span>
                    </label>
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-100 text-sm leading-relaxed">
                      {admission.nursingHandoverInstructions}
                    </div>
                  </div>
                )}
              </div>

              {/* Attending Physician & Department */}
              <div className="p-5 rounded-2xl bg-navy-900/60 border border-white/10 shadow-lg">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3 mb-4">
                  <Stethoscope className="w-4 h-4 text-accent" />
                  <span>Attending Medical Team</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                    <span className="text-[11px] text-gray-400 block font-medium mb-1">
                      Admitting Physician
                    </span>
                    <div className="text-sm font-bold text-white">
                      {admission.admittingDoctorName || admission.doctorName || 'Attending Physician'}
                    </div>
                    <div className="text-xs text-accent mt-0.5">
                      {admission.admittingDoctorSpecialization || admission.doctorSpecialization || 'Physician'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                    <span className="text-[11px] text-gray-400 block font-medium mb-1">
                      Department
                    </span>
                    <div className="text-sm font-bold text-white">
                      {admission.doctorDepartment || admission.wardDepartment || 'General Medicine'}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Doctor ID: #{admission.admittingDoctorId || 'DOC-01'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 3: Ward, Demographics, & Quick Actions */}
            <div className="space-y-6">
              {/* Ward & Bed Allocation */}
              <div className="p-5 rounded-2xl bg-navy-900/60 border border-white/10 shadow-lg space-y-4">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
                  <Building2 className="w-4 h-4 text-accent" />
                  <span>Ward & Bed Placement</span>
                </h4>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Hospital Ward:</span>
                    <span className="font-semibold text-white">{admission.wardName}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Ward Code:</span>
                    <span className="font-mono text-gray-300">{admission.wardNumber}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Department:</span>
                    <span className="text-gray-300">{admission.wardDepartment || 'Inpatient Services'}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs border-t border-white/10 pt-2.5">
                    <span className="text-gray-400">Assigned Bed:</span>
                    <span className="font-bold text-accent font-mono text-sm">{admission.bedNumber}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Bed Allocation ID:</span>
                    <span className="font-mono text-gray-400">#BED-{admission.bedId}</span>
                  </div>
                </div>
              </div>

              {/* Patient Contact & Demographics */}
              <div className="p-5 rounded-2xl bg-navy-900/60 border border-white/10 shadow-lg space-y-4">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
                  <User className="w-4 h-4 text-accent" />
                  <span>Contact Information</span>
                </h4>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-2 text-gray-300">
                    <Phone className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                    <span>{admission.patientPhone || admission.phone || '+1 (555) 019-2831'}</span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-300">
                    <Mail className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                    <span className="truncate">{admission.email || 'patient@meditwin.health'}</span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-300">
                    <MapPin className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                    <span>Inpatient Facility Wing A</span>
                  </div>
                </div>
              </div>

              {/* Fast Chart Jump Shortcuts */}
              {onOpenPatientChart && (
                <div className="p-5 rounded-2xl bg-accent/10 border border-accent/20 shadow-lg space-y-3">
                  <h4 className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Clinical Navigation</span>
                  </h4>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Jump straight to this inpatient's clinical chart modules:
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onOpenPatientChart(admission.patientId, 'overview')}
                      className="p-2 rounded-xl bg-navy-900/80 hover:bg-navy-900 border border-white/15 text-white text-xs font-medium text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <User className="w-3 h-3 text-accent" />
                      <span>Overview</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenPatientChart(admission.patientId, 'labs')}
                      className="p-2 rounded-xl bg-navy-900/80 hover:bg-navy-900 border border-white/15 text-white text-xs font-medium text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <HeartPulse className="w-3 h-3 text-emerald-400" />
                      <span>Vitals & Labs</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenPatientChart(admission.patientId, 'prescriptions')}
                      className="p-2 rounded-xl bg-navy-900/80 hover:bg-navy-900 border border-white/15 text-white text-xs font-medium text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Pill className="w-3 h-3 text-cyan-400" />
                      <span>Medications</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenPatientChart(admission.patientId, 'documents')}
                      className="p-2 rounded-xl bg-navy-900/80 hover:bg-navy-900 border border-white/15 text-white text-xs font-medium text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-3 h-3 text-purple-400" />
                      <span>Documents</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Admission Timeline */}
      {activeTab === 'timeline' && (
        <div className="p-6 rounded-2xl bg-navy-900/60 border border-white/10 shadow-lg space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h4 className="text-base font-bold text-white tracking-wide">
                Admission Stay & Movement Timeline
              </h4>
              <p className="text-xs text-gray-400 mt-0.5">
                Chronological log of admissions, bed transfers, and clinical assessments.
              </p>
            </div>
          </div>

          {loadingTimeline ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-7 h-7 text-accent animate-spin" />
              <span className="text-xs text-gray-400">Loading timeline events...</span>
            </div>
          ) : timeline.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              No timeline movements recorded yet for this admission.
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/15">
              {timeline.map((event, idx) => (
                <div key={event.id || idx} className="relative group">
                  {/* Timeline dot */}
                  <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-navy-950 border-2 border-accent flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 group-hover:border-accent/40 transition-colors">
                    <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
                      <span className="font-bold text-white text-sm">{event.title}</span>
                      <span className="text-[11px] text-gray-400 font-mono">
                        {event.timestamp
                          ? new Date(event.timestamp).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </span>
                    </div>

                    <p className="text-xs text-gray-300 leading-relaxed">{event.description}</p>

                    {(event.diagnosis || event.acuityLevel) && (
                      <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 flex-wrap text-[11px]">
                        {event.diagnosis && (
                          <span className="text-gray-300">
                            <strong>Diagnosis:</strong> {event.diagnosis}
                          </span>
                        )}
                        {event.acuityLevel && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${acuityColors[event.acuityLevel]?.badge || ''}`}>
                            {event.acuityLevel}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
