import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Sparkles,
  RefreshCw,
  Copy,
  Printer,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileText,
  HeartPulse,
  Pill,
  ShieldCheck,
  Building,
  Calendar,
  FlaskConical,
  Clock,
  ExternalLink,
  ChevronRight,
  Info,
  ShieldAlert,
  User,
} from 'lucide-react';
import { Button } from '../../components/Button';
import { generateAIHealthSummary } from '../../services/patientAIService';
import type { PatientAIHealthSummary } from '../../types';

interface AIHealthSummaryPageProps {
  onNavigateTab?: (tab: string) => void;
}

export const AIHealthSummaryPage: React.FC<AIHealthSummaryPageProps> = ({ onNavigateTab }) => {
  const [summary, setSummary] = useState<PatientAIHealthSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleGenerateSummary = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await generateAIHealthSummary();
      setSummary(data);
      setHasGenerated(true);
    } catch (err: any) {
      console.error('Error generating summary:', err);
      setErrorMsg(err.message || 'Unable to generate your health summary. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySummary = async () => {
    if (!summary) return;
    try {
      const overview = `HEALTH OVERVIEW:\n- Age: ${summary.healthOverview.age}\n- Gender: ${summary.healthOverview.gender}\n- Blood Group: ${summary.healthOverview.bloodGroup}\n- Height: ${summary.healthOverview.height || 'N/A'}\n- Weight: ${summary.healthOverview.weight || 'N/A'}\n\n`;

      const meds = summary.currentMedications.length > 0
        ? `CURRENT MEDICATIONS:\n${summary.currentMedications.map((m) => `- ${m.medicineName} (${m.dosage}) — ${m.frequency} [Source: ${m.hospitalOrSource}]`).join('\n')}\n\n`
        : 'CURRENT MEDICATIONS:\nNo active medications recorded.\n\n';

      const allergies = summary.allergies.length > 0
        ? `ALLERGIES:\n${summary.allergies.map((a) => `- ${a.substance}: ${a.reaction} (${a.severity})`).join('\n')}\n\n`
        : 'ALLERGIES:\nNo allergy information is currently recorded.\n\n';

      const labs = summary.laboratoryReports.length > 0
        ? `LABORATORY REPORTS:\n${summary.laboratoryReports.map((l) => `- ${l.testName} (${l.date}): ${l.result} [${l.hospitalOrProvider}]`).join('\n')}\n\n`
        : 'LABORATORY REPORTS:\nNo laboratory reports are currently available.\n\n';

      const visits = summary.recentVisits.length > 0
        ? `RECENT VISITS:\n${summary.recentVisits.map((v) => `- ${v.visitDate} at ${v.hospital} (${v.visitType})`).join('\n')}\n\n`
        : 'RECENT VISITS:\nNo hospital visits recorded.\n\n';

      const fullText = `MEDITWIN AI — PATIENT HEALTH SUMMARY\nPatient: ${summary.patientInfo.name} (${summary.patientInfo.patientId})\nGenerated: ${new Date(summary.generatedAt).toLocaleString()}\n\n${summary.disclaimer}\n\n${overview}${meds}${allergies}${labs}${visits}`;

      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Failed to copy text:', e);
    }
  };

  const handlePrintSummary = () => {
    window.print();
  };

  return (
    <div className="space-y-6 text-left max-w-7xl mx-auto pb-12 print:p-0 print:m-0 print:space-y-4">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-accent/20 to-primary/20 border border-accent/30 text-accent shadow-glow-primary">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                AI Health Summary
              </h1>
              <p className="text-xs sm:text-sm text-gray-300 mt-0.5">
                An easy-to-understand overview of your available health information.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5 print:hidden">
          {hasGenerated && summary && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopySummary}
                className="text-xs"
                icon={copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              >
                {copied ? 'Copied to Clipboard' : 'Copy Summary'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintSummary}
                className="text-xs"
                icon={<Printer className="w-4 h-4" />}
              >
                Print Summary
              </Button>
            </>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={handleGenerateSummary}
            disabled={isLoading}
            className="text-xs shadow-glow-primary"
            icon={isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-accent" />}
          >
            {isLoading ? 'Preparing...' : hasGenerated ? 'Refresh Summary' : 'Generate Health Summary'}
          </Button>
        </div>
      </div>

      {/* ── Informational Disclaimer Alert ─────────────────────────── */}
      <div className="p-4 rounded-2xl bg-navy-900/80 border border-accent/20 backdrop-blur-md flex items-start gap-3.5 shadow-sm">
        <Info className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
        <div className="text-xs text-gray-300 leading-relaxed">
          <span className="font-semibold text-white">AI Informational Notice: </span>
          AI-generated summary based on your available health records. This summary is for informational purposes only and does not replace advice from a qualified healthcare professional.
        </div>
      </div>

      {/* ── Error Banner ───────────────────────────────────────────── */}
      {errorMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleGenerateSummary} className="text-xs py-1 px-3 border-rose-500/40 text-rose-200">
            Try Again
          </Button>
        </motion.div>
      )}

      {/* ── Initial CTA State (Before First Generation) ────────────── */}
      {!hasGenerated && !isLoading && !errorMsg && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 sm:p-12 text-center rounded-3xl border border-white/10 bg-navy-900/60 backdrop-blur-xl relative overflow-hidden"
        >
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-accent/20 to-primary/20 border border-accent/30 flex items-center justify-center mx-auto text-accent shadow-glow-primary">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Ready to view your health summary?
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              MediTwin AI will compile your authorized medical records, current medications, recorded allergies, and recent laboratory reports into an easy-to-read summary.
            </p>
            <div className="pt-2">
              <Button
                variant="primary"
                size="lg"
                onClick={handleGenerateSummary}
                className="shadow-glow-primary font-bold"
                icon={<Sparkles className="w-5 h-5 text-accent" />}
              >
                Generate Health Summary
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Loading Animation State ────────────────────────────────── */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-12 text-center rounded-3xl border border-white/10 bg-navy-900/60 backdrop-blur-xl space-y-4"
        >
          <div className="relative w-16 h-16 mx-auto">
            <div className="w-16 h-16 rounded-full border-4 border-accent/20 border-t-accent animate-spin" />
            <Brain className="w-7 h-7 text-accent absolute inset-0 m-auto animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Preparing your health summary...</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Analyzing authorized health records, active prescriptions, and laboratory reports...
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Rendered Summary Sections ──────────────────────────────── */}
      {summary && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Metadata Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-gray-400 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-accent" />
              <span>
                Generated:{' '}
                <strong className="text-gray-200">
                  {new Date(summary.generatedAt).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </strong>
              </span>
            </div>
            <span className="text-gray-400 italic">
              Based on health information available at the time of generation.
            </span>
          </div>

          {/* Grid Layout: Desktop / Tablet */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ── Left Column (2 Cols wide on Desktop) ─────────────── */}
            <div className="lg:col-span-2 space-y-6">
              {/* SECTION 1: Health Overview */}
              <div className="glass-card p-6 rounded-2xl border border-white/15 bg-navy-900/80 backdrop-blur-xl relative overflow-hidden space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <User className="w-5 h-5 text-accent" />
                    <h2 className="text-base font-bold text-white">1. Health Overview</h2>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-accent">
                    Patient Profile
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Age</span>
                    <span className="text-base font-bold text-white mt-0.5 block">{summary.healthOverview.age}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Gender</span>
                    <span className="text-base font-bold text-white mt-0.5 block capitalize">{summary.healthOverview.gender}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Blood Group</span>
                    <span className="text-base font-bold text-accent mt-0.5 block">{summary.healthOverview.bloodGroup}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Recorded Weight</span>
                    <span className="text-sm font-semibold text-white mt-0.5 block">{summary.healthOverview.weight || 'Not available in your current records.'}</span>
                  </div>
                </div>

                <p className="text-xs text-gray-300 leading-relaxed bg-white/5 p-3.5 rounded-xl border border-white/10">
                  {summary.healthOverview.summaryText}
                </p>
              </div>

              {/* SECTION 2: Medical History */}
              <div className="glass-card p-6 rounded-2xl border border-white/15 bg-navy-900/80 backdrop-blur-xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <HeartPulse className="w-5 h-5 text-accent" />
                    <h2 className="text-base font-bold text-white">2. Medical History</h2>
                  </div>
                  {onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab('medical-history')}
                      className="text-xs text-accent hover:underline flex items-center gap-1"
                    >
                      View Full History <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {summary.medicalHistory.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-2">
                    No medical history has been recorded in the available records.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {summary.medicalHistory.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5 hover:border-white/20 transition-all text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-white text-sm">{item.conditionOrEvent}</span>
                          <span className="text-[11px] text-gray-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-accent" />
                            {item.date}
                          </span>
                        </div>
                        <p className="text-gray-300 leading-relaxed">{item.description}</p>
                        <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-white/5">
                          <span>Source: {item.hospitalOrProvider}</span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 font-medium">
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 3: Current Medications */}
              <div className="glass-card p-6 rounded-2xl border border-white/15 bg-navy-900/80 backdrop-blur-xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Pill className="w-5 h-5 text-accent" />
                    <h2 className="text-base font-bold text-white">3. Current Prescriptions & Medications</h2>
                  </div>
                  {onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab('prescriptions')}
                      className="text-xs text-accent hover:underline flex items-center gap-1"
                    >
                      View Prescriptions <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {summary.currentMedications.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-2">
                    No active medications currently recorded in your profile.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {summary.currentMedications.map((med) => (
                      <div
                        key={med.id}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 hover:border-white/20 transition-all text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-sm flex items-center gap-1.5">
                            <Pill className="w-4 h-4 text-accent" />
                            {med.medicineName} — {med.dosage}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent font-semibold text-[10px]">
                            {med.frequency}
                          </span>
                        </div>
                        {med.instructions && (
                          <p className="text-gray-300 italic bg-white/5 p-2 rounded-lg">
                            Instructions: {med.instructions}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-400 pt-1">
                          <span>Prescribed by: {med.prescribedBy}</span>
                          <span>Source: {med.hospitalOrSource}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                  <span>Please follow your healthcare professional's instructions regarding your medications.</span>
                </div>
              </div>

              {/* SECTION 5: Laboratory Reports */}
              <div className="glass-card p-6 rounded-2xl border border-white/15 bg-navy-900/80 backdrop-blur-xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <FlaskConical className="w-5 h-5 text-accent" />
                    <h2 className="text-base font-bold text-white">5. Laboratory & Diagnostic Reports</h2>
                  </div>
                  {onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab('documents')}
                      className="text-xs text-accent hover:underline flex items-center gap-1"
                    >
                      View All Reports <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {summary.laboratoryReports.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-2">
                    No laboratory reports are currently available in your records.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {summary.laboratoryReports.map((lab) => (
                      <div
                        key={lab.id}
                        className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <span className="font-bold text-white text-sm block">{lab.testName}</span>
                          <div className="text-gray-400 text-[11px] flex items-center gap-2">
                            <span>Date: {lab.date}</span>
                            <span>•</span>
                            <span>Source: {lab.hospitalOrProvider}</span>
                          </div>
                          <span className="text-gray-300 block text-xs mt-1 font-medium">{lab.result}</span>
                        </div>
                        {onNavigateTab && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onNavigateTab('documents')}
                            className="text-[11px] py-1 px-3 self-start sm:self-center"
                            icon={<ExternalLink className="w-3.5 h-3.5" />}
                          >
                            View Original Report
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Right Column (1 Col wide on Desktop) ────────────── */}
            <div className="space-y-6">
              {/* SECTION 8: Important Health Information (Highlighted Box) */}
              <div className="glass-card p-6 rounded-2xl border border-accent/30 bg-gradient-to-b from-accent/10 to-navy-900/90 backdrop-blur-xl space-y-3 shadow-glow-primary">
                <div className="flex items-center gap-2 border-b border-accent/20 pb-2.5">
                  <ShieldAlert className="w-5 h-5 text-accent" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    8. Important Health Info
                  </h2>
                </div>

                <ul className="space-y-2 text-xs text-gray-300">
                  {summary.importantInformation.map((info, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-accent font-bold mt-0.5">•</span>
                      <span>{info}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* SECTION 4: Allergies */}
              <div className="glass-card p-6 rounded-2xl border border-white/15 bg-navy-900/80 backdrop-blur-xl space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">4. Recorded Allergies</h2>
                  </div>
                </div>

                {summary.allergies.length === 0 ? (
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300">
                    No allergy information is currently recorded.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {summary.allergies.map((allergy, idx) => (
                      <div
                        key={allergy.id || idx}
                        className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-rose-300">{allergy.substance}</span>
                          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                            {allergy.severity}
                          </span>
                        </div>
                        <p className="text-gray-300">{allergy.reaction}</p>
                        {allergy.source && (
                          <span className="text-[10px] text-gray-400 block pt-1">
                            Verified by: {allergy.source}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 6: Recent Visits / Hospital Isolation */}
              <div className="glass-card p-6 rounded-2xl border border-white/15 bg-navy-900/80 backdrop-blur-xl space-y-3">
                <div className="flex items-center gap-2 border-b border-white/10 pb-2.5">
                  <Building className="w-4 h-4 text-accent" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">6. Recent Visits</h2>
                </div>

                {summary.recentVisits.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-1">No hospital visits recorded.</p>
                ) : (
                  <div className="space-y-2.5 text-xs">
                    {summary.recentVisits.map((visit) => (
                      <div
                        key={visit.id}
                        className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1 hover:border-white/20 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{visit.hospital}</span>
                          <span className="text-[10px] text-accent font-semibold">{visit.caseSheetNumber}</span>
                        </div>
                        <div className="text-[11px] text-gray-400">{visit.visitDate} — {visit.visitType}</div>
                        {visit.treatmentSummary && (
                          <p className="text-gray-300 text-[11px] pt-1">{visit.treatmentSummary}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 7: Treatment Information */}
              <div className="glass-card p-6 rounded-2xl border border-white/15 bg-navy-900/80 backdrop-blur-xl space-y-3">
                <div className="flex items-center gap-2 border-b border-white/10 pb-2.5">
                  <FileText className="w-4 h-4 text-accent" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">7. Treatment Care Plans</h2>
                </div>

                {summary.treatmentInformation.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-1">No active treatment plans recorded.</p>
                ) : (
                  <div className="space-y-2.5 text-xs">
                    {summary.treatmentInformation.map((trt) => (
                      <div
                        key={trt.id}
                        className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1"
                      >
                        <span className="font-bold text-white block">{trt.title}</span>
                        <p className="text-gray-300 text-[11px]">{trt.details}</p>
                        <span className="text-[10px] text-gray-400 block pt-1">
                          Source: {trt.sourceHospital} ({trt.date})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-400 gap-2">
            <span>MediTwin AI Health Intelligence System • Patient Module</span>
            <div className="flex items-center gap-1 text-accent">
              <ShieldCheck className="w-4 h-4" /> HIPAA Secured Clinical Summary
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AIHealthSummaryPage;
