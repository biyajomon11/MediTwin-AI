import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Sparkles,
  Loader2,
  Copy,
  Printer,
  AlertTriangle,
  AlertCircle,
  FileText,
  HeartPulse,
  Pill,
  ShieldCheck,
  Building,
  Calendar,
  FlaskConical,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  User,
  Volume2,
  Check,
  Activity,
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
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [readingAloud, setReadingAloud] = useState(false);

  const LOADING_STEPS = [
    'Connecting to Secure Health Record Vault...',
    'Gathering Diagnoses, Surgeries & Medical History...',
    'Reconciling Active Prescriptions & Medication Schedules...',
    'Evaluating Laboratory Diagnostics & Biomarkers...',
    'Synthesizing Your Personal AI Health Summary...',
  ];

  const handleGenerateSummary = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setLoadingStep(0);

    const stepTimer = setInterval(() => {
      setLoadingStep((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
    }, 450);

    try {
      const data = await generateAIHealthSummary();
      clearInterval(stepTimer);
      setSummary(data);
      setHasGenerated(true);
    } catch (err: any) {
      clearInterval(stepTimer);
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

  const handleReadAloud = () => {
    if (!summary) return;
    if ('speechSynthesis' in window) {
      if (readingAloud) {
        window.speechSynthesis.cancel();
        setReadingAloud(false);
        return;
      }
      const textToRead = [
        `Personal Health Summary for ${summary.patientInfo.name}.`,
        summary.healthOverview.summaryText,
        summary.currentMedications.length > 0
          ? `You have ${summary.currentMedications.length} active medications: ${summary.currentMedications.map(m => `${m.medicineName}, ${m.dosage}, ${m.frequency}`).join('. ')}.`
          : 'You have no active medications currently recorded.',
        summary.allergies.length > 0
          ? `Recorded allergies include: ${summary.allergies.map(a => `${a.substance}, causing ${a.reaction}`).join('. ')}.`
          : 'No known allergies are recorded in your chart.',
        summary.importantInformation.length > 0
          ? `Important health points: ${summary.importantInformation.join('. ')}`
          : '',
      ].filter(Boolean).join(' ');

      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => setReadingAloud(false);
      utterance.onerror = () => setReadingAloud(false);
      setReadingAloud(true);
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Text-to-speech audio is not supported in this browser.');
    }
  };

  return (
    <div className="space-y-6 text-left max-w-7xl mx-auto pb-12 print:p-0 print:m-0 print:space-y-4" id="patient-summary-printable">
      {/* ── Page Header with Glowing Badges ──────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-accent/20 to-primary/20 border border-accent/30 text-accent text-[11px] font-bold tracking-wide flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
              MediTwin Digital Health Engine
            </span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              EHR Verified & Encrypted
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-accent/20 to-primary/20 border border-accent/30 text-accent shadow-glow-primary">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                AI Health Summary
              </h1>
              <p className="text-xs sm:text-sm text-gray-300 mt-0.5">
                A clear, comprehensive, and easy-to-understand overview of your electronic health records.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center flex-wrap gap-2.5 print:hidden">
          {hasGenerated && summary && (
            <>
              {/* Listen / Text-to-Speech Button */}
              <button
                onClick={handleReadAloud}
                title="Listen to summary audio"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                  readingAloud
                    ? 'bg-accent text-slate-900 border-accent shadow-glow-accent'
                    : 'bg-white/10 hover:bg-white/20 text-gray-200 border-white/15'
                }`}
              >
                <Volume2 className={`w-4 h-4 ${readingAloud ? 'animate-bounce text-slate-900' : 'text-accent'}`} />
                <span>{readingAloud ? 'Stop Voice' : 'Listen'}</span>
              </button>

              {/* Copy Button */}
              <button
                onClick={handleCopySummary}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 text-xs font-semibold border border-white/15 transition-all shadow-sm active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Summary</span>
                  </>
                )}
              </button>

              {/* Print Button */}
              <button
                onClick={handlePrintSummary}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 text-xs font-semibold border border-white/15 transition-all shadow-sm active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>
            </>
          )}

          {/* Generate / Regenerate Button */}
          <button
            onClick={handleGenerateSummary}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary via-accent/90 to-primary text-white text-xs font-bold shadow-glow-primary hover:brightness-110 active:scale-95 disabled:opacity-40 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Synthesizing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-accent" />
                <span>{hasGenerated ? 'Regenerate Summary' : 'Generate Health Summary'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Informational Disclaimer Alert ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 backdrop-blur-md flex items-start gap-3.5 shadow-sm"
      >
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        </div>
        <div className="space-y-0.5 text-xs text-amber-200/90 leading-relaxed">
          <span className="font-bold text-amber-300 uppercase tracking-wide">Patient Information Notice: </span>
          This summary is synthesized by AI from your authorized hospital records for informational review. It does <strong>not</strong> substitute for direct clinical advice, diagnosis, or treatment from your doctor.
        </div>
      </motion.div>

      {/* ── Error Banner ───────────────────────────────────────────── */}
      {errorMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3 shadow-sm"
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
          className="glass-card p-8 sm:p-12 text-center rounded-3xl border border-white/10 bg-gradient-to-b from-navy-900/90 to-[#0B132B]/90 backdrop-blur-xl relative overflow-hidden shadow-2xl space-y-6"
        >
          <div className="relative mx-auto w-24 h-24">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-accent/20 to-primary/20 border border-accent/30 flex items-center justify-center text-accent shadow-glow-primary">
              <Brain className="w-12 h-12 text-accent animate-pulse" />
            </div>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              className="absolute -inset-2 rounded-3xl border-2 border-dashed border-accent/30 pointer-events-none"
            />
          </div>

          <div className="max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Ready to view your personalized AI health summary?
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              MediTwin AI will compile your authorized medical records, active medications, recorded allergies, and recent laboratory reports into an intuitive, audio-enabled health recap.
            </p>
          </div>

          {/* Key Feature Perks Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto pt-2 text-xs">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2.5 text-left">
              <HeartPulse className="w-5 h-5 text-accent flex-shrink-0" />
              <div>
                <span className="font-bold text-white block">Vital Overview</span>
                <span className="text-gray-400 text-[11px]">Key metrics & conditions</span>
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2.5 text-left">
              <Pill className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <span className="font-bold text-white block">Medication Schedule</span>
                <span className="text-gray-400 text-[11px]">Reconciled dosages</span>
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2.5 text-left">
              <Volume2 className="w-5 h-5 text-purple-400 flex-shrink-0" />
              <div>
                <span className="font-bold text-white block">Voice Readout</span>
                <span className="text-gray-400 text-[11px]">Listen to summary</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleGenerateSummary}
              className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-primary via-accent to-primary text-white text-sm font-extrabold shadow-glow-primary hover:shadow-glow-accent hover:brightness-110 active:scale-95 transition-all shadow-xl"
            >
              <Sparkles className="w-5 h-5 text-accent" />
              <span>Generate Health Summary</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Loading Animation State with Live Stepper ──────────────── */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12 text-center rounded-3xl border border-accent/30 bg-gradient-to-b from-navy-900/90 to-[#0B132B]/90 backdrop-blur-xl space-y-6 shadow-2xl"
        >
          <div className="relative w-20 h-20 mx-auto">
            <div className="w-20 h-20 rounded-3xl bg-accent/20 border border-accent/40 flex items-center justify-center shadow-glow-accent">
              <Brain className="w-10 h-10 text-accent animate-pulse" />
            </div>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="absolute -inset-2 rounded-3xl border-2 border-dashed border-accent/40 pointer-events-none"
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-extrabold text-white">Synthesizing Your Health Profile...</h3>
            <p className="text-xs text-accent font-semibold transition-all">
              {LOADING_STEPS[loadingStep]}
            </p>
          </div>

          {/* Step Progress Bar */}
          <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
            {LOADING_STEPS.map((_, i) => (
              <motion.div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i <= loadingStep ? 'w-6 bg-accent shadow-glow-accent' : 'w-2 bg-white/20'
                }`}
              />
            ))}
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
          {/* Executive Patient Identity & Timestamp Banner */}
          <div className="glass-card p-6 rounded-2xl border border-accent/40 bg-gradient-to-r from-accent/15 via-primary/10 to-transparent shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center text-slate-900 shadow-glow-accent font-black text-lg">
                  {summary.patientInfo.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold text-white">{summary.patientInfo.name}</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                      <Activity className="w-3 h-3 text-emerald-400" /> Active EHR
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Patient ID: #{summary.patientInfo.patientId} • Synthesized on {new Date(summary.generatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-300 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 font-medium">
                  {summary.healthOverview.gender} • {summary.healthOverview.age} Years • Blood Group: <strong className="text-accent">{summary.healthOverview.bloodGroup}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Grid Layout: 2 Columns on Desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ── Left Column (2 Cols wide on Desktop) ─────────────── */}
            <div className="lg:col-span-2 space-y-6">
              {/* SECTION 1: Health Overview */}
              <div className="glass-card p-6 rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-600/15 via-blue-500/5 to-transparent backdrop-blur-xl relative overflow-hidden space-y-4 shadow-lg">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                      <User className="w-4 h-4" />
                    </div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">1. Health Overview & Biometrics</h2>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300">
                    Biometric Profile
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Age</span>
                    <span className="text-base font-extrabold text-white mt-0.5 block">{summary.healthOverview.age} yrs</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Gender</span>
                    <span className="text-base font-extrabold text-white mt-0.5 block capitalize">{summary.healthOverview.gender}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Blood Group</span>
                    <span className="text-base font-extrabold text-accent mt-0.5 block">{summary.healthOverview.bloodGroup}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Recorded Weight</span>
                    <span className="text-sm font-semibold text-white mt-0.5 block">{summary.healthOverview.weight || 'Recorded on File'}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-200 leading-relaxed">
                  <p className="font-semibold text-white mb-1">Clinical Recapitulation:</p>
                  {summary.healthOverview.summaryText}
                </div>
              </div>

              {/* SECTION 2: Medical History */}
              <div className="glass-card p-6 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-600/15 via-purple-500/5 to-transparent backdrop-blur-xl space-y-4 shadow-lg">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                      <HeartPulse className="w-4 h-4" />
                    </div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">2. Recorded Medical History</h2>
                  </div>
                  {onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab('medical-history')}
                      className="text-xs text-purple-300 hover:text-purple-200 flex items-center gap-1 font-semibold"
                    >
                      View Timeline <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {summary.medicalHistory.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-2">
                    No prior medical history has been recorded in your profile.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {summary.medicalHistory.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 hover:border-purple-500/40 transition-all text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-white text-sm">{item.conditionOrEvent}</span>
                          <span className="text-[11px] text-gray-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-purple-400" />
                            {item.date}
                          </span>
                        </div>
                        <p className="text-gray-300 leading-relaxed">{item.description}</p>
                        <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1.5 border-t border-white/5">
                          <span>Source: {item.hospitalOrProvider}</span>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold">
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 3: Current Medications */}
              <div className="glass-card p-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-600/15 via-emerald-500/5 to-transparent backdrop-blur-xl space-y-4 shadow-lg">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                      <Pill className="w-4 h-4" />
                    </div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">3. Current Medications & Dosing</h2>
                  </div>
                  {onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab('prescriptions')}
                      className="text-xs text-emerald-300 hover:text-emerald-200 flex items-center gap-1 font-semibold"
                    >
                      Prescriptions <ChevronRight className="w-3.5 h-3.5" />
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
                        className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 hover:border-emerald-500/40 transition-all text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-sm flex items-center gap-2">
                            <Pill className="w-4 h-4 text-emerald-400" />
                            {med.medicineName} — {med.dosage}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/35 text-emerald-300 font-bold text-[10px]">
                            {med.frequency}
                          </span>
                        </div>
                        {med.instructions && (
                          <p className="text-gray-200 italic bg-white/5 p-2.5 rounded-xl border border-white/5">
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

                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                  <span>Always consult your attending physician before modifying prescribed dosages.</span>
                </div>
              </div>

              {/* SECTION 5: Laboratory Reports */}
              <div className="glass-card p-6 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-600/15 via-cyan-500/5 to-transparent backdrop-blur-xl space-y-4 shadow-lg">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                      <FlaskConical className="w-4 h-4" />
                    </div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">5. Laboratory Diagnostics</h2>
                  </div>
                  {onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab('documents')}
                      className="text-xs text-cyan-300 hover:text-cyan-200 flex items-center gap-1 font-semibold"
                    >
                      All Documents <ChevronRight className="w-3.5 h-3.5" />
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
                        className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-cyan-500/40 transition-all"
                      >
                        <div className="space-y-1">
                          <span className="font-bold text-white text-sm block">{lab.testName}</span>
                          <div className="text-gray-400 text-[11px] flex items-center gap-2">
                            <span>Date: {lab.date}</span>
                            <span>•</span>
                            <span>Source: {lab.hospitalOrProvider}</span>
                          </div>
                          <span className="text-emerald-300 block text-xs mt-1 font-semibold">{lab.result}</span>
                        </div>
                        {onNavigateTab && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onNavigateTab('documents')}
                            className="text-[11px] py-1 px-3 self-start sm:self-center border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/20"
                            icon={<ExternalLink className="w-3.5 h-3.5" />}
                          >
                            View Report
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
              <div className="glass-card p-6 rounded-2xl border border-accent/40 bg-gradient-to-b from-accent/15 via-primary/10 to-navy-900/90 backdrop-blur-xl space-y-3.5 shadow-glow-primary">
                <div className="flex items-center gap-2 border-b border-accent/20 pb-3">
                  <ShieldAlert className="w-5 h-5 text-accent" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    8. Key Health Guidance
                  </h2>
                </div>

                <ul className="space-y-2.5 text-xs text-gray-200">
                  {summary.importantInformation.map((info, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="text-accent font-bold mt-0.5">•</span>
                      <span className="leading-relaxed">{info}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* SECTION 4: Allergies */}
              <div className="glass-card p-6 rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-600/15 via-rose-500/5 to-transparent backdrop-blur-xl space-y-3.5 shadow-lg">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">4. Recorded Allergies</h2>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold">
                    Safety Flag
                  </span>
                </div>

                {summary.allergies.length === 0 ? (
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300">
                    No allergy information is currently recorded.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {summary.allergies.map((allergy, idx) => (
                      <div
                        key={allergy.id || idx}
                        className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-rose-200">{allergy.substance}</span>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-200">
                            {allergy.severity}
                          </span>
                        </div>
                        <p className="text-gray-200 text-[11px] leading-relaxed">{allergy.reaction}</p>
                        {allergy.source && (
                          <span className="text-[10px] text-gray-400 block pt-1 border-t border-white/5">
                            Verified: {allergy.source}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 6: Recent Hospital Visits */}
              <div className="glass-card p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-600/15 via-amber-500/5 to-transparent backdrop-blur-xl space-y-3.5 shadow-lg">
                <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                  <Building className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">6. Hospital Visits</h2>
                </div>

                {summary.recentVisits.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-1">No hospital visits recorded.</p>
                ) : (
                  <div className="space-y-2.5 text-xs">
                    {summary.recentVisits.map((visit) => (
                      <div
                        key={visit.id}
                        className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5 hover:border-amber-500/40 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{visit.hospital}</span>
                          <span className="text-[10px] text-amber-300 font-mono">{visit.caseSheetNumber}</span>
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

              {/* SECTION 7: Care Plans & Recovery */}
              <div className="glass-card p-6 rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-600/15 via-teal-500/5 to-transparent backdrop-blur-xl space-y-3.5 shadow-lg">
                <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                  <FileText className="w-4 h-4 text-teal-400" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">7. Care Plans & Recovery</h2>
                </div>

                {summary.treatmentInformation.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-1">No active care plans recorded.</p>
                ) : (
                  <div className="space-y-2.5 text-xs">
                    {summary.treatmentInformation.map((trt) => (
                      <div
                        key={trt.id}
                        className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1 hover:border-teal-500/40 transition-all"
                      >
                        <span className="font-bold text-white block">{trt.title}</span>
                        <p className="text-gray-300 text-[11px]">{trt.details}</p>
                        <span className="text-[10px] text-gray-400 block pt-1 border-t border-white/5">
                          Source: {trt.sourceHospital} ({trt.date})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Security Badge */}
          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-400 gap-2">
            <span>MediTwin AI Health Intelligence System • Patient Health Portal</span>
            <div className="flex items-center gap-1.5 text-accent font-semibold">
              <ShieldCheck className="w-4 h-4 text-accent" /> HIPAA Secured Digital Health Record
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AIHealthSummaryPage;
