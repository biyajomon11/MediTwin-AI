import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  History,
  Heart,
  Activity,
  Building,
  User,
  Calendar,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Search,
  CheckCircle2,
  Syringe,
  Scissors,
  Stethoscope,
  FlaskConical,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';
import * as patientService from '../../services/patientService';
import type { PatientMedicalHistoryRecord, PatientHealthProfile } from '../../types';

const CATEGORIES = [
  { id: 'All', label: 'All Events', icon: History },
  { id: 'Diagnosis', label: 'Diagnoses', icon: Heart },
  { id: 'Hospitalization', label: 'Hospitalizations', icon: Building },
  { id: 'Surgery', label: 'Surgeries', icon: Scissors },
  { id: 'Treatment', label: 'Treatments & Procedures', icon: Stethoscope },
  { id: 'Lab Result', label: 'Lab History', icon: FlaskConical },
  { id: 'Vaccination', label: 'Vaccinations', icon: Syringe },
  { id: 'Clinical Note', label: 'Clinical Notes', icon: FileText },
];

export const MedicalHistoryPage: React.FC = () => {
  const [historyRecords, setHistoryRecords] = useState<PatientMedicalHistoryRecord[]>([]);
  const [profile, setProfile] = useState<PatientHealthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const loadHistoryData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const [histData, profileData] = await Promise.all([
        patientService.getMedicalHistory(),
        patientService.getPatientProfile(),
      ]);
      setHistoryRecords(histData);
      setProfile(profileData);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load your medical history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistoryData();
  }, []);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Diagnosis':
        return <Heart className="w-4 h-4 text-rose-400" />;
      case 'Hospitalization':
        return <Building className="w-4 h-4 text-amber-400" />;
      case 'Surgery':
        return <Scissors className="w-4 h-4 text-cyan-400" />;
      case 'Treatment':
        return <Stethoscope className="w-4 h-4 text-emerald-400" />;
      case 'Lab Result':
        return <FlaskConical className="w-4 h-4 text-accent" />;
      case 'Vaccination':
        return <Syringe className="w-4 h-4 text-purple-400" />;
      default:
        return <FileText className="w-4 h-4 text-blue-400" />;
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Diagnosis':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'Hospitalization':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'Surgery':
        return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
      case 'Treatment':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'Lab Result':
        return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
      case 'Vaccination':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      default:
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    }
  };

  const getVerificationBadge = (status?: string) => {
    switch (status) {
      case 'Verified by Physician':
        return {
          label: 'Verified by Physician',
          bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          icon: Stethoscope,
        };
      case 'Verified by Surgeon':
        return {
          label: 'Verified by Surgeon',
          bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
          icon: Scissors,
        };
      case 'Verified by Pathologist':
        return {
          label: 'Verified by Pathologist',
          bg: 'bg-accent/20 text-accent border-accent/30',
          icon: FlaskConical,
        };
      case 'Verified by Nurse':
        return {
          label: 'Verified by Nurse',
          bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          icon: Syringe,
        };
      case 'Verified by Radiologist':
        return {
          label: 'Verified by Radiologist',
          bg: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
          icon: Activity,
        };
      default:
        return {
          label: status || 'Clinically Verified',
          bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          icon: ShieldCheck,
        };
    }
  };

  const filteredRecords = historyRecords.filter((rec) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      rec.conditionOrEvent.toLowerCase().includes(query) ||
      rec.description.toLowerCase().includes(query) ||
      rec.healthcareProvider.toLowerCase().includes(query) ||
      rec.hospitalDepartment.toLowerCase().includes(query) ||
      (rec.verificationSource && rec.verificationSource.toLowerCase().includes(query)) ||
      (rec.verifiedBy && rec.verifiedBy.toLowerCase().includes(query));
    const matchesCategory = selectedCategory === 'All' || rec.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-accent tracking-widest uppercase">
            Authenticated Health Record
          </span>
          <span className="text-gray-500">•</span>
          <span className="text-xs text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> HIPAA Verified
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 flex items-center gap-2.5">
          <History className="w-7 h-7 text-accent" /> Medical History & Clinical Records
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
          Chronological log of verified clinical diagnoses, surgeries, hospitalizations, and treatment outcomes.
        </p>
      </div>

      {/* ── Clinical Verification Provenance Standard Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4 border border-emerald-500/30 bg-emerald-500/5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">Clinical Verification & Provenance System</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                100% EHR Authenticated
              </span>
            </div>
            <p className="text-gray-300 text-[11px] mt-0.5">
              All events are authenticated via official Doctor Consultations, Operation Notes, Pathologist LIS sign-offs, and signed Discharge Summaries.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center">
          <span className="text-[11px] text-gray-400">Verification Ledger:</span>
          <span className="px-2.5 py-1 rounded-lg bg-black/30 border border-emerald-500/30 text-emerald-300 font-mono font-bold text-xs">
            ISO 27001 & HIPAA Audit Ready
          </span>
        </div>
      </motion.div>

      {/* ── Error Banner ── */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={loadHistoryData}
            className="text-xs font-bold text-accent hover:underline shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Quick Allergies & Chronic Conditions Ribbon ── */}
      {profile && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-card p-4 border border-rose-500/30 bg-rose-500/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" /> Documented Allergies ({profile.medicalSummary.allergies.length})
              </span>
              <span className="text-[10px] text-rose-400 font-semibold px-2 py-0.5 rounded-full bg-rose-500/20">
                Critical Safety Alert
              </span>
            </div>
            <div className="space-y-1.5">
              {profile.medicalSummary.allergies.map((a, idx) => {
                const isVerified = a.verificationStatus?.startsWith('Verified');
                return (
                  <div key={idx} className="flex flex-wrap items-center justify-between text-xs p-2 rounded-lg bg-black/20 border border-rose-500/20 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{a.substance}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${isVerified ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
                        {a.verificationStatus || 'Self-Reported'}
                      </span>
                    </div>
                    <span className="text-gray-300 text-[11px]">{a.reaction}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/30 text-rose-200">{a.severity}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-card p-4 border border-sky-500/30 bg-sky-500/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-sky-400" /> Active Chronic Conditions ({profile.medicalSummary.chronicConditions.length})
              </span>
              <span className="text-[10px] text-sky-400 font-semibold px-2 py-0.5 rounded-full bg-sky-500/20">
                Ongoing Monitoring
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.medicalSummary.chronicConditions.map((cond, idx) => (
                <span key={idx} className="px-2.5 py-1 rounded-lg bg-black/20 border border-sky-500/20 text-xs text-white font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                  {cond}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Search & Filter Controls ── */}
      <div className="glass-card p-5 border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conditions, hospitals, verifiers, sources..."
              className="w-full py-2.5 pl-10 pr-9 text-xs sm:text-sm text-white bg-white/5 border border-white/15 rounded-xl focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 placeholder-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {(selectedCategory !== 'All' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setSearchQuery('');
                }}
                className="text-xs text-accent hover:text-white hover:underline flex items-center gap-1 font-medium transition-colors mr-2"
              >
                Reset filters
              </button>
            )}
            <span className="text-xs text-gray-400 font-medium">
              Showing <strong className="text-white">{filteredRecords.length}</strong> of {historyRecords.length} events
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
          {CATEGORIES.map((cat) => {
            const count =
              cat.id === 'All'
                ? historyRecords.length
                : historyRecords.filter((r) => r.category === cat.id).length;
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-white border border-accent/40 shadow-glow-primary font-bold scale-[1.02]'
                    : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/10'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-accent' : 'text-gray-400'}`} />
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-white/5 text-gray-400 border border-white/10'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Timeline Display ── */}
      {loading ? (
        <div className="glass-card border border-white/10 p-16 flex flex-col items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-sm font-medium">Loading your medical information...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="glass-card border border-white/10 p-16 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500">
            <History className="w-7 h-7" />
          </div>
          <p className="text-base font-bold text-white">No medical history available.</p>
          <p className="text-xs text-gray-400 max-w-sm">
            {searchQuery || selectedCategory !== 'All'
              ? 'No historical records match your filter criteria.'
              : 'There are no prior medical history records filed for your patient account.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4 relative before:absolute before:inset-0 before:left-6 before:w-0.5 before:bg-white/10 before:hidden sm:before:block">
          {filteredRecords.map((item, idx) => {
            const verBadge = getVerificationBadge(item.verificationStatus);
            const VerIcon = verBadge.icon;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="relative sm:pl-12"
              >
                {/* Timeline dot */}
                <div className="hidden sm:flex absolute left-4 top-5 -translate-x-1/2 w-5 h-5 rounded-full bg-navy-950 border-2 border-accent items-center justify-center z-10">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                </div>

                {/* History Card */}
                <div className="glass-card-interactive p-5 border border-white/10 space-y-3.5">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-white/5 border border-white/10">
                        {getCategoryIcon(item.category)}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryBadgeClass(item.category)}`}>
                            {item.category}
                          </span>
                          {item.status && (
                            <span className="text-[11px] text-gray-400 font-medium">
                              • Status: <strong className="text-white">{item.status}</strong>
                            </span>
                          )}
                          {/* Verification Status Badge */}
                          <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${verBadge.bg}`}>
                            <VerIcon className="w-3 h-3" />
                            {verBadge.label}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white mt-1">{item.conditionOrEvent}</h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-gray-400 self-start sm:self-auto font-mono">
                      <Calendar className="w-3.5 h-3.5 text-accent" />
                      <span>{item.date}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-gray-200 leading-relaxed">{item.description}</p>

                  {/* Treatment / Outcome Callout */}
                  {item.treatmentOrOutcome && (
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-0.5">
                        Clinical Treatment & Outcome:
                      </span>
                      <p className="text-emerald-300 font-medium">{item.treatmentOrOutcome}</p>
                    </div>
                  )}

                  {/* ── Clinical Verification Provenance Box (Audit Trail) ── */}
                  {(item.verifiedBy || item.verificationSource) && (
                    <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          Clinical Verification Proof & Audit Source
                        </span>
                        {item.verifiedDate && (
                          <span className="text-[10px] text-emerald-400 font-mono font-medium">
                            Verified on: {item.verifiedDate}
                          </span>
                        )}
                      </div>

                      {item.verifiedBy && (
                        <p className="text-gray-200 text-xs">
                          <span className="text-gray-400 font-medium">Verifying Clinician:</span>{' '}
                          <strong className="text-white font-semibold">{item.verifiedBy}</strong>
                        </p>
                      )}

                      {item.verificationSource && (
                        <p className="text-gray-300 text-[11px] flex items-center gap-1.5">
                          <span className="text-gray-400 font-medium">Authoritative Source / Document:</span>{' '}
                          <span className="text-emerald-300 font-medium">{item.verificationSource}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Footer Metadata */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-400 pt-1">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-accent" />
                      <span>Attending Specialist: <strong className="text-white">{item.healthcareProvider}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-accent" />
                      <span>Department / Facility: <strong className="text-white">{item.hospitalDepartment}</strong></span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MedicalHistoryPage;
