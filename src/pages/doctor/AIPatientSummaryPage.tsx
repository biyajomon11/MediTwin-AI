import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Copy, Printer, AlertTriangle, CheckCircle2,
  XCircle, Loader2, ChevronDown, User, Pill, FlaskConical,
  Calendar, FileText, Activity, HeartPulse, ClipboardList,
  Sparkles, ShieldCheck, Zap, Volume2, Check,
  SlidersHorizontal, RefreshCw, Clock, CheckSquare, Square,
} from 'lucide-react';
import type { AISummary, AISummaryPreset, AISummaryFormat, DoctorPatient } from '../../types';
import { getPatients, generateAISummary } from '../../services/doctorService';
import { formatPatientId } from '../../utils/patientUtils';

// ─────────────────────────────────────────────────────────────
// Clinical Requirement Presets
// ─────────────────────────────────────────────────────────────
interface PresetConfig {
  id: AISummaryPreset;
  label: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badge: string;
  borderColor: string;
  estimatedTime: string;
}

const PRESET_OPTIONS: PresetConfig[] = [
  {
    id: 'rapid',
    label: '30s Rapid Triage',
    shortDesc: 'High-yield vitals, red flags, urgent allergies & active meds',
    icon: Zap,
    color: 'from-amber-500/20 to-orange-500/10 text-amber-300',
    badge: '⚡ Fastest',
    borderColor: 'border-amber-500/40',
    estimatedTime: '~30 sec',
  },
  {
    id: 'pharma',
    label: 'Pharmacology & Safety',
    shortDesc: 'Active meds, dosages, verified allergies & cross-reactions',
    icon: Pill,
    color: 'from-emerald-500/20 to-teal-500/10 text-emerald-300',
    badge: '💊 Drug Safety',
    borderColor: 'border-emerald-500/40',
    estimatedTime: '~45 sec',
  },
  {
    id: 'labs',
    label: 'Abnormal Labs & Trends',
    shortDesc: 'Out-of-range markers, recent lab panels & trends',
    icon: FlaskConical,
    color: 'from-cyan-500/20 to-blue-500/10 text-cyan-300',
    badge: '🧪 Diagnostics',
    borderColor: 'border-cyan-500/40',
    estimatedTime: '~45 sec',
  },
  {
    id: 'cardio',
    label: 'Cardio-Metabolic',
    shortDesc: 'Blood pressure, cardiac history, lipid panel & glycemic status',
    icon: HeartPulse,
    color: 'from-rose-500/20 to-pink-500/10 text-rose-300',
    badge: '🫀 Vascular',
    borderColor: 'border-rose-500/40',
    estimatedTime: '~1 min',
  },
  {
    id: 'preop',
    label: 'Pre-Op Clearance',
    shortDesc: 'Airway flags, anticoagulants, bleeding risk & organ clearance',
    icon: ShieldCheck,
    color: 'from-indigo-500/20 to-purple-500/10 text-indigo-300',
    badge: '📋 Surgical',
    borderColor: 'border-indigo-500/40',
    estimatedTime: '~1 min',
  },
  {
    id: 'full',
    label: 'Full Longitudinal EHR',
    shortDesc: 'Comprehensive 8-domain review across complete medical history',
    icon: ClipboardList,
    color: 'from-purple-500/20 to-slate-800/40 text-purple-300',
    badge: '🔍 Complete',
    borderColor: 'border-purple-500/40',
    estimatedTime: '~2.5 min',
  },
];

// All available section options for selective generation
const AVAILABLE_SECTIONS = [
  'Patient Overview',
  'Recorded Medical History',
  'Current Medications',
  'Recorded Allergies',
  'Recent Laboratory Results',
  'Recent Clinical Events',
  'Active Prescriptions',
  'Recent Clinical Notes Summary',
];

// ─────────────────────────────────────────────────────────────
// Section Icons & Gradients Configuration
// ─────────────────────────────────────────────────────────────
const SECTION_CONFIG: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  borderColor: string;
  badgeColor: string;
}> = {
  'Patient Overview': {
    icon: User,
    gradient: 'from-blue-600/15 via-blue-500/10 to-transparent',
    borderColor: 'border-blue-500/30',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
  'High-Yield Clinical Snapshot': {
    icon: Zap,
    gradient: 'from-amber-600/20 via-amber-500/10 to-transparent',
    borderColor: 'border-amber-500/40',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  'Immediate Action & Red Flags': {
    icon: AlertTriangle,
    gradient: 'from-rose-600/20 via-rose-500/10 to-transparent',
    borderColor: 'border-rose-500/40',
    badgeColor: 'bg-rose-500/25 text-rose-300 border-rose-500/40',
  },
  'Pharmacotherapy & Drug Safety Alerts': {
    icon: Pill,
    gradient: 'from-emerald-600/20 via-teal-500/10 to-transparent',
    borderColor: 'border-emerald-500/40',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  'Diagnostic Alert Summary': {
    icon: FlaskConical,
    gradient: 'from-cyan-600/20 via-blue-500/10 to-transparent',
    borderColor: 'border-cyan-500/40',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  },
  'Cardio-Metabolic Risk Overview': {
    icon: HeartPulse,
    gradient: 'from-rose-600/20 via-rose-500/10 to-transparent',
    borderColor: 'border-rose-500/40',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },
  'Pre-Op Surgical Risk & Airway Alerts': {
    icon: ShieldCheck,
    gradient: 'from-indigo-600/20 via-purple-500/10 to-transparent',
    borderColor: 'border-indigo-500/40',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  },
  'Recorded Medical History': {
    icon: HeartPulse,
    gradient: 'from-purple-600/15 via-purple-500/10 to-transparent',
    borderColor: 'border-purple-500/30',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },
  'Current Medications': {
    icon: Pill,
    gradient: 'from-emerald-600/15 via-emerald-500/10 to-transparent',
    borderColor: 'border-emerald-500/30',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  'Recorded Allergies': {
    icon: AlertTriangle,
    gradient: 'from-rose-600/15 via-rose-500/10 to-transparent',
    borderColor: 'border-rose-500/30',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  },
  'Recent Laboratory Results': {
    icon: FlaskConical,
    gradient: 'from-cyan-600/15 via-cyan-500/10 to-transparent',
    borderColor: 'border-cyan-500/30',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  },
  'Recent Clinical Events': {
    icon: Calendar,
    gradient: 'from-amber-600/15 via-amber-500/10 to-transparent',
    borderColor: 'border-amber-500/30',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  'Active Prescriptions': {
    icon: ClipboardList,
    gradient: 'from-indigo-600/15 via-indigo-500/10 to-transparent',
    borderColor: 'border-indigo-500/30',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  },
  'Recent Clinical Notes Summary': {
    icon: FileText,
    gradient: 'from-teal-600/15 via-teal-500/10 to-transparent',
    borderColor: 'border-teal-500/30',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  },
};

const DEFAULT_CONFIG = {
  icon: Brain,
  gradient: 'from-slate-700/20 via-slate-800/10 to-transparent',
  borderColor: 'border-slate-600/30',
  badgeColor: 'bg-slate-700/40 text-slate-300 border-slate-600/40',
};

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
export const AIPatientSummaryPage: React.FC = () => {
  const [patients, setPatients]               = useState<DoctorPatient[]>([]);
  const [patientsLoaded, setPatientsLoaded]   = useState(false);
  const [patientsLoading, setPatientsLoading] = useState(false);

  const [selectedId, setSelectedId]           = useState<number | ''>('');
  const [selectedPreset, setSelectedPreset]   = useState<AISummaryPreset>('rapid');
  const [formatStyle, setFormatStyle]         = useState<AISummaryFormat>('structured');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced]       = useState(false);

  const [summary, setSummary]                 = useState<AISummary | null>(null);
  const [generating, setGenerating]           = useState(false);
  const [genStep, setGenStep]                 = useState(0);
  const [genError, setGenError]               = useState<string | null>(null);
  const [copied, setCopied]                   = useState(false);
  const [readingAloud, setReadingAloud]       = useState(false);

  // Load patient list on mount
  const loadPatients = useCallback(async () => {
    if (patientsLoaded) return;
    setPatientsLoading(true);
    try {
      const data = await getPatients(undefined, { sortBy: 'criticalFirst' });
      setPatients(data);
      setPatientsLoaded(true);
    } catch {
      // fallback
    } finally {
      setPatientsLoading(false);
    }
  }, [patientsLoaded]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const GENERATING_STEPS = [
    'Parsing Electronic Health Record (EHR)...',
    'Applying Doctor Requirement Presets & Filters...',
    'Checking Clinical Allergies & Out-of-Range Labs...',
    'Synthesizing Clinical Profile...',
    'Assembling Doctor-Tailored AI Summary...',
  ];

  const handleGenerate = async (overridePreset?: AISummaryPreset) => {
    if (!selectedId) return;
    setGenerating(true);
    setGenError(null);
    setSummary(null);
    setGenStep(0);

    const stepInterval = setInterval(() => {
      setGenStep((prev) => (prev < GENERATING_STEPS.length - 1 ? prev + 1 : prev));
    }, 380);

    const activePreset = overridePreset || selectedPreset;

    try {
      const result = await generateAISummary(Number(selectedId), undefined, {
        preset: activePreset,
        selectedSections: selectedSections.length > 0 ? selectedSections : undefined,
        formatStyle,
      });
      clearInterval(stepInterval);
      setSummary(result);
    } catch (e: unknown) {
      clearInterval(stepInterval);
      setGenError(e instanceof Error ? e.message : 'Failed to generate summary. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const toggleSection = (sec: string) => {
    setSelectedSections((prev) =>
      prev.includes(sec) ? prev.filter((s) => s !== sec) : [...prev, sec]
    );
  };

  const handleCopy = async () => {
    if (!summary) return;
    const alertText = summary.keyAlerts && summary.keyAlerts.length > 0
      ? `=== KEY CLINICAL ALERTS ===\n${summary.keyAlerts.map(a => `• ${a}`).join('\n')}\n\n`
      : '';
    const text = summary.sections
      .map((s) => `=== ${s.title} ===\n${s.content}`)
      .join('\n\n');
    const full = `AI PATIENT SUMMARY — ${summary.phase}\nGenerated: ${new Date(summary.generatedAt).toLocaleString()}\n\n${alertText}${text}\n\n---\n${summary.disclaimer}`;
    await navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => window.print();

  const handleReadAloud = () => {
    if (!summary) return;
    if ('speechSynthesis' in window) {
      if (readingAloud) {
        window.speechSynthesis.cancel();
        setReadingAloud(false);
        return;
      }
      const alertSpeech = summary.keyAlerts && summary.keyAlerts.length > 0
        ? `Clinical Alerts: ${summary.keyAlerts.join('. ')}. `
        : '';
      const textToRead = alertSpeech + summary.sections.map((s) => `${s.title}. ${s.content}`).join(' ');
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.onend = () => setReadingAloud(false);
      utterance.onerror = () => setReadingAloud(false);
      setReadingAloud(true);
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Text-to-speech is not supported in this browser.');
    }
  };

  const selectedPatient = patients.find((p) => p.id === selectedId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12" id="ai-summary-printable">

      {/* Header with Glowing Badge */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="px-2.5 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-[11px] font-bold tracking-wide flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
              Doctor-Driven Clinical Intelligence Engine
            </span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Targeted Synthesis
            </span>
            <span className="px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[11px] font-semibold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              30s Rapid Triage Ready
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            AI Patient Clinical Summary & Information Fetcher
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Instant on-demand clinical summaries tailored specifically to your clinical focus, time constraint, or targeted medical query.
          </p>
        </div>
      </div>

      {/* Disclaimer Alert Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 flex items-start gap-3.5 shadow-sm"
      >
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-bold text-amber-300 uppercase tracking-wider">
            Clinical Decision Support Disclaimer
          </p>
          <p className="text-xs text-amber-200/85 leading-relaxed">
            Summaries and targeted queries are synthesized from verified EHR records. They do <strong>NOT</strong> replace physician judgment. Attending doctors must independently verify all critical alerts, medications, and laboratory values prior to clinical orders.
          </p>
        </div>
      </motion.div>

      {/* Main Control Card: Patient Selector & Requirement Modes */}
      <div className="glass-card p-6 border border-white/10 rounded-2xl shadow-xl space-y-6">

        {/* Critical Patient Quick Select Queue */}
        {patients.some((p) => p.status === 'Critical') && (
          <div className="flex flex-wrap items-center gap-2 p-3.5 rounded-xl bg-gradient-to-r from-rose-500/20 to-rose-900/10 border border-rose-500/30 text-xs">
            <span className="text-rose-300 font-bold flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Critical Triage Queue:
            </span>
            <div className="flex flex-wrap gap-2">
              {patients.filter((p) => p.status === 'Critical').map((cp) => (
                <button
                  key={cp.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(cp.id);
                    setSummary(null);
                    setGenError(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    selectedId === cp.id
                      ? 'bg-rose-600 text-white shadow-lg ring-2 ring-rose-400/80 scale-105'
                      : 'bg-rose-500/20 text-rose-200 hover:bg-rose-500/35 border border-rose-500/40'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-rose-300" />
                  <span>{cp.firstName} {cp.lastName} ({formatPatientId(cp)})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Patient Selection Row */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-accent" />
            1. Select Patient Record
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={selectedId}
                onFocus={loadPatients}
                onChange={(e) => {
                  setSelectedId(e.target.value === '' ? '' : Number(e.target.value));
                  setSummary(null);
                  setGenError(null);
                }}
                className="glass-input w-full pl-10 pr-10 py-3 text-sm text-white appearance-none rounded-xl border border-white/15 focus:border-accent shadow-inner bg-slate-900/60"
              >
                <option value="" className="bg-[#0F172A]">— Choose patient to synthesize —</option>
                {patientsLoading && <option disabled className="bg-[#0F172A]">Loading patients from database...</option>}
                {patients.map((p) => {
                  const isCrit = p.status === 'Critical';
                  return (
                    <option key={p.id} value={p.id} className={isCrit ? 'bg-rose-950 text-rose-200 font-bold' : 'bg-[#0F172A]'}>
                      {isCrit ? '🚨 [CRITICAL] ' : ''}{p.firstName} {p.lastName} ({formatPatientId(p)}) — {p.primaryCondition || p.department}
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <button
              onClick={() => handleGenerate()}
              disabled={!selectedId || generating}
              className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-primary via-accent/90 to-primary text-white text-sm font-bold disabled:opacity-40 hover:shadow-glow-accent hover:brightness-110 active:scale-95 transition-all shadow-lg flex-shrink-0 cursor-pointer"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 text-white" />
                  <span>Generate AI Summary</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Selected Patient Live Quick Metrics Bar */}
        {selectedPatient && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex flex-wrap items-center gap-3 pt-2 pb-2 border-t border-b border-white/10"
          >
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
              <span className="text-gray-400 text-xs">Patient:</span>
              <span className="text-white font-bold text-xs">{selectedPatient.firstName} {selectedPatient.lastName}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
              <span className="text-gray-400 text-xs">Age/Gender:</span>
              <span className="text-white text-xs font-semibold">{selectedPatient.age} yrs • {selectedPatient.gender?.name || 'Unspecified'}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
              <span className="text-gray-400 text-xs">Department:</span>
              <span className="text-white text-xs font-semibold">{selectedPatient.department}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
              <span className="text-gray-400 text-xs">Status:</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                selectedPatient.status === 'Critical'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {selectedPatient.status}
              </span>
            </div>
          </motion.div>
        )}

        {/* Section 2: Doctor Requirement Modes (Robust Styled Select Dropdown) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              2. Choose Doctor Requirement Preset
            </label>
            <span className="text-[11px] text-gray-400">
              {(() => {
                const current = PRESET_OPTIONS.find((p) => p.id === selectedPreset);
                return current ? `Reading time: ${current.estimatedTime}` : '';
              })()}
            </span>
          </div>

          {/* Select Dropdown */}
          <div className="relative">
            {(() => {
              const current = PRESET_OPTIONS.find((p) => p.id === selectedPreset) || PRESET_OPTIONS[0];
              const Icon = current.icon;
              return (
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-accent pointer-events-none">
                  <Icon className="w-4 h-4" />
                </div>
              );
            })()}

            <select
              value={selectedPreset}
              onChange={(e) => {
                const newPreset = e.target.value as AISummaryPreset;
                setSelectedPreset(newPreset);
                if (selectedId) {
                  handleGenerate(newPreset);
                }
              }}
              className="glass-input w-full pl-11 pr-10 py-3.5 text-xs sm:text-sm font-semibold text-white appearance-none rounded-xl border border-white/15 focus:border-accent shadow-inner bg-[#0b1220] cursor-pointer hover:border-accent/50 transition-colors"
            >
              {PRESET_OPTIONS.map((preset) => (
                <option
                  key={preset.id}
                  value={preset.id}
                  className="bg-[#0b1220] text-white py-2"
                >
                  {preset.label} — {preset.shortDesc} ({preset.estimatedTime})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Active Preset Quick Details Banner */}
          {(() => {
            const current = PRESET_OPTIONS.find((p) => p.id === selectedPreset) || PRESET_OPTIONS[0];
            const Icon = current.icon;
            return (
              <div className="p-3 rounded-xl bg-gradient-to-r from-accent/10 via-primary/10 to-transparent border border-accent/25 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-accent/20 border border-accent/40 flex items-center justify-center text-accent flex-shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-white">{current.label}: </span>
                    <span className="text-gray-300 text-[11px] truncate">{current.shortDesc}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="px-2 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-accent font-bold text-[10px]">
                    {current.badge}
                  </span>
                  <span className="text-gray-400 text-[11px] flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {current.estimatedTime}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Advanced Filters & Format Customizer Toggle */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-xs font-semibold text-gray-300 hover:text-white transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-accent" />
            <span>{showAdvanced ? 'Hide Custom Section & Format Filters' : 'Customize Specific Sections & Format (Optional)'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 p-4 rounded-xl bg-slate-900/60 border border-white/10 space-y-4 text-xs"
              >
                {/* Format Style Selector */}
                <div className="space-y-1.5">
                  <span className="font-bold text-gray-300 uppercase tracking-wider text-[11px]">
                    Summary Format Style:
                  </span>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setFormatStyle('structured')}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                        formatStyle === 'structured'
                          ? 'bg-accent text-slate-900 border-accent shadow-glow-accent'
                          : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      Structured Domain Cards
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormatStyle('bullets')}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                        formatStyle === 'bullets'
                          ? 'bg-accent text-slate-900 border-accent shadow-glow-accent'
                          : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      High-Yield Bullet Points
                    </button>
                  </div>
                </div>

                {/* Section Cherry-Pick Filter */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-300 uppercase tracking-wider text-[11px]">
                      Include Specific Sections Only (leave empty for automatic preset):
                    </span>
                    {selectedSections.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedSections([])}
                        className="text-[10px] text-accent underline cursor-pointer"
                      >
                        Reset to all
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {AVAILABLE_SECTIONS.map((sec) => {
                      const isChecked = selectedSections.includes(sec);
                      return (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => toggleSection(sec)}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-accent/20 border-accent/50 text-accent font-semibold'
                              : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                          }`}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                          )}
                          <span className="truncate text-[11px]">{sec}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* Empty State Illustration */}
      {!selectedId && !generating && !summary && (
        <motion.div
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card p-12 border border-white/10 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]"
        >
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-accent/10 border border-accent/20 flex items-center justify-center shadow-glow-accent">
              <Brain className="w-10 h-10 text-accent animate-pulse" />
            </div>
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent animate-ping" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-lg font-bold text-white">Select a Patient to Synthesize or Query</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              MediTwin will instantly generate a tailored summary matching your chosen preset (e.g. 30s Rapid Triage, Pharmacology & Allergies, or Specific Information Fetcher).
            </p>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-400 pt-2 border-t border-white/10">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-accent" /> 1. Pick Patient</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-accent" /> 2. Choose Preset or Ask Question</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-accent" /> 3. Instant Review</span>
          </div>
        </motion.div>
      )}

      {/* Generating Animated State */}
      <AnimatePresence>
        {generating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card p-10 border border-accent/30 rounded-2xl bg-gradient-to-b from-accent/10 to-transparent flex flex-col items-center justify-center text-center space-y-5 min-h-[320px]"
          >
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-accent/20 border border-accent/40 flex items-center justify-center shadow-glow-accent">
                <Brain className="w-10 h-10 text-accent animate-pulse" />
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="absolute -inset-2 rounded-3xl border-2 border-dashed border-accent/40"
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-extrabold text-white">Synthesizing Tailored Clinical Profile...</h3>
              <p className="text-xs text-accent font-medium transition-all">
                {GENERATING_STEPS[genStep]}
              </p>
            </div>

            {/* Neural step progress dots */}
            <div className="flex items-center gap-2">
              {GENERATING_STEPS.map((_, i) => (
                <motion.div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i <= genStep ? 'w-6 bg-accent' : 'w-2 bg-white/20'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error state */}
      <AnimatePresence>
        {genError && !generating && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="glass-card p-5 border border-rose-500/30 bg-rose-500/10 rounded-2xl flex items-center gap-3.5"
          >
            <XCircle className="w-6 h-6 text-rose-400 flex-shrink-0" />
            <div className="flex-1 text-xs">
              <p className="font-bold text-rose-300">Synthesis Failed</p>
              <p className="text-rose-200/80">{genError}</p>
            </div>
            <button
              onClick={() => handleGenerate()}
              className="px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition-colors flex-shrink-0 cursor-pointer"
            >
              Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Output */}
      <AnimatePresence>
        {summary && !generating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
            id="summary-content"
          >
            {/* Executive Health Scorecard Banner */}
            <div className="glass-card p-6 border border-accent/40 rounded-2xl bg-gradient-to-r from-accent/15 via-primary/10 to-transparent shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center text-slate-900 shadow-glow-accent flex-shrink-0">
                    <Brain className="w-8 h-8 text-slate-900" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-extrabold text-white">
                        {summary.phase}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                        <Activity className="w-3 h-3 text-emerald-400" /> Verified
                      </span>
                      {summary.readingTimeMinutes && (
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[11px] font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3 text-blue-400" /> ~{summary.readingTimeMinutes < 1 ? '30s' : `${summary.readingTimeMinutes} min`} read
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-300 mt-0.5">
                      Synthesized on {new Date(summary.generatedAt).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                {/* Toolbar Buttons */}
                <div className="flex items-center gap-2 flex-wrap no-print">
                  <button
                    onClick={() => handleGenerate()}
                    title="Regenerate this summary"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 text-xs font-semibold border border-white/10 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Re-Synthesize</span>
                  </button>
                  <button
                    onClick={handleReadAloud}
                    title="Read summary aloud using text-to-speech"
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                      readingAloud
                        ? 'bg-accent text-slate-900 border-accent shadow-glow-accent'
                        : 'bg-white/10 hover:bg-white/20 text-gray-200 border-white/10'
                    }`}
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>{readingAloud ? 'Stop Voice' : 'Listen'}</span>
                  </button>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 text-xs font-semibold border border-white/10 transition-all active:scale-95 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-300 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-slate-900 hover:bg-accent-light text-xs font-bold transition-all shadow-glow-accent active:scale-95 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print</span>
                  </button>
                </div>
              </div>
            </div>

            {/* High-Yield Critical Alerts Callout */}
            {summary.keyAlerts && summary.keyAlerts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-gradient-to-r from-rose-500/20 via-rose-950/30 to-slate-900/40 border border-rose-500/40 space-y-2 shadow-lg"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-rose-500/30 border border-rose-500/50 flex items-center justify-center text-rose-300">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-extrabold text-rose-300 uppercase tracking-wider">
                    Key Critical Alerts & High-Yield Safety Flags ({summary.keyAlerts.length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-rose-100/90 pt-1">
                  {summary.keyAlerts.map((alert, aIdx) => (
                    <div key={aIdx} className="flex items-start gap-2 p-2 rounded-lg bg-rose-900/20 border border-rose-500/20">
                      <span className="text-rose-400 font-bold">•</span>
                      <span className="leading-snug">{alert}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Structured Summary Section Cards Grid */}
            <div className={`grid gap-4 ${
              summary.sections.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'
            }`}>
              {summary.sections.map((section, idx) => {
                const conf = SECTION_CONFIG[section.title] ?? DEFAULT_CONFIG;
                const Icon = conf.icon;
                const isHighlight = section.isHighlight;

                return (
                  <motion.div
                    key={section.title}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className={`rounded-2xl p-5 border bg-gradient-to-br ${
                      isHighlight
                        ? 'from-accent/20 via-slate-900/80 to-slate-900 border-accent/50 ring-1 ring-accent/30'
                        : `${conf.gradient} ${conf.borderColor}`
                    } backdrop-blur-md shadow-lg space-y-3 hover:border-white/30 transition-all`}
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          isHighlight ? 'bg-accent/30 text-accent' : 'bg-white/10 text-white'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <h3 className={`text-xs font-bold uppercase tracking-wider ${
                          isHighlight ? 'text-accent' : 'text-white'
                        }`}>
                          {section.title}
                        </h3>
                      </div>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold border ${
                        isHighlight ? 'bg-accent/20 text-accent border-accent/40' : conf.badgeColor
                      }`}>
                        Section #{idx + 1}
                      </span>
                    </div>

                    <div className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap font-normal space-y-1.5">
                      {section.content.split('\n').map((line, lIdx) => {
                        if (line.startsWith('•')) {
                          return (
                            <div key={lIdx} className="flex items-start gap-2 py-0.5">
                              <span className="text-accent text-sm leading-none">•</span>
                              <span className="text-gray-100">{line.replace(/^•\s*/, '')}</span>
                            </div>
                          );
                        } else if (line.startsWith('🚨')) {
                          return (
                            <div key={lIdx} className="p-2 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-200 font-medium my-1">
                              {line}
                            </div>
                          );
                        } else if (line.startsWith('✅')) {
                          return (
                            <div key={lIdx} className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 font-medium my-1">
                              {line}
                            </div>
                          );
                        }
                        return <p key={lIdx}>{line}</p>;
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Safety Disclaimer Footer Box */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 text-xs text-amber-200/80 leading-relaxed shadow-sm">
              <ShieldCheck className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300 uppercase tracking-wide">Physician Verification Required: </span>
                {summary.disclaimer}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          #ai-summary-printable { color: black !important; }
        }
      `}</style>
    </div>
  );
};

export default AIPatientSummaryPage;
