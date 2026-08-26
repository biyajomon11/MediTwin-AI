import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, RefreshCw, Copy, Printer, AlertTriangle, CheckCircle2,
  XCircle, Loader2, ChevronDown, User, Pill, FlaskConical,
  Calendar, FileText, Activity, HeartPulse, ClipboardList,
} from 'lucide-react';
import type { AISummary, DoctorPatient } from '../../types';
import { getPatients, generateAISummary } from '../../services/doctorService';

// ─────────────────────────────────────────────────────────────
// Section icons map
// ─────────────────────────────────────────────────────────────
const SECTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'Patient Overview':              User,
  'Recorded Medical History':      HeartPulse,
  'Current Medications':           Pill,
  'Recorded Allergies':            AlertTriangle,
  'Recent Laboratory Results':     FlaskConical,
  'Recent Clinical Events':        Calendar,
  'Active Prescriptions':          ClipboardList,
  'Recent Clinical Notes Summary': FileText,
};

const SECTION_COLORS = [
  'from-blue-500/20 to-blue-600/10 border-blue-500/30',
  'from-purple-500/20 to-purple-600/10 border-purple-500/30',
  'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
  'from-amber-500/20 to-amber-600/10 border-amber-500/30',
  'from-rose-500/20 to-rose-600/10 border-rose-500/30',
  'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30',
  'from-indigo-500/20 to-indigo-600/10 border-indigo-500/30',
  'from-teal-500/20 to-teal-600/10 border-teal-500/30',
];

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
export const AIPatientSummaryPage: React.FC = () => {
  const [patients, setPatients]         = useState<DoctorPatient[]>([]);
  const [patientsLoaded, setPatientsLoaded] = useState(false);
  const [patientsLoading, setPatientsLoading] = useState(false);

  const [selectedId, setSelectedId]     = useState<number | ''>('');
  const [summary, setSummary]           = useState<AISummary | null>(null);
  const [generating, setGenerating]     = useState(false);
  const [genError, setGenError]         = useState<string | null>(null);
  const [copied, setCopied]             = useState(false);

  // Load patient list on mount (lazily on first interaction)
  const loadPatients = async () => {
    if (patientsLoaded) return;
    setPatientsLoading(true);
    try {
      const data = await getPatients();
      setPatients(data);
      setPatientsLoaded(true);
    } catch {
      // ignore
    } finally {
      setPatientsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedId) return;
    setGenerating(true);
    setGenError(null);
    setSummary(null);
    try {
      const result = await generateAISummary(Number(selectedId));
      setSummary(result);
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : 'Failed to generate summary. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!summary) return;
    const text = summary.sections
      .map((s) => `=== ${s.title} ===\n${s.content}`)
      .join('\n\n');
    const full = `AI PATIENT SUMMARY — ${summary.phase}\nGenerated: ${new Date(summary.generatedAt).toLocaleString()}\n\n${text}\n\n---\n${summary.disclaimer}`;
    await navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => window.print();

  const selectedPatient = patients.find((p) => p.id === selectedId);

  return (
    <div className="space-y-6" id="ai-summary-printable">

      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <Brain className="w-6 h-6 text-accent" /> AI Patient Summaries
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Generate structured summaries from patient record data
        </p>
      </div>

      {/* Disclaimer Banner — always visible */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex gap-3"
      >
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs font-bold text-amber-300 uppercase tracking-wider">
            AI-Generated Patient Summary
          </p>
          <p className="text-xs text-amber-200/80 leading-relaxed">
            This summary does <strong>NOT</strong> constitute a diagnosis, treatment recommendation, or clinical decision. All information must be reviewed and verified by the treating doctor before any clinical action is taken.
          </p>
        </div>
      </motion.div>

      {/* Patient Selector + Action Buttons */}
      <div className="glass-card p-5 border border-white/10 space-y-4">
        <h3 className="text-sm font-bold text-white">Select Patient</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={selectedId}
              onFocus={loadPatients}
              onChange={(e) => {
                setSelectedId(e.target.value === '' ? '' : Number(e.target.value));
                setSummary(null);
                setGenError(null);
              }}
              className="glass-input w-full pl-9 pr-4 py-2.5 text-sm text-white appearance-none"
            >
              <option value="" className="bg-[#0F172A]">— Select a patient —</option>
              {patientsLoading && <option disabled className="bg-[#0F172A]">Loading patients...</option>}
              {patients.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#0F172A]">
                  {p.firstName} {p.lastName} (P-{p.id}) — {p.department}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleGenerate}
              disabled={!selectedId || generating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold disabled:opacity-40 hover:bg-primary/80 transition-colors"
            >
              {generating
                ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</>
                : <><Brain className="w-4 h-4" />Generate Summary</>
              }
            </button>
            {summary && (
              <>
                <button
                  onClick={handleGenerate}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 text-gray-300 text-xs font-semibold hover:bg-white/20 transition-colors no-print"
                >
                  <RefreshCw className="w-4 h-4" />Refresh
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 text-gray-300 text-xs font-semibold hover:bg-white/20 transition-colors no-print"
                >
                  {copied ? <><CheckCircle2 className="w-4 h-4 text-emerald-400" />Copied!</> : <><Copy className="w-4 h-4" />Copy</>}
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 text-gray-300 text-xs font-semibold hover:bg-white/20 transition-colors no-print"
                >
                  <Printer className="w-4 h-4" />Print
                </button>
              </>
            )}
          </div>
        </div>

        {selectedPatient && (
          <div className="flex flex-wrap gap-3 pt-2 border-t border-white/10">
            <span className="text-xs text-gray-400">Patient: <span className="text-white font-semibold">{selectedPatient.firstName} {selectedPatient.lastName}</span></span>
            <span className="text-xs text-gray-400">Age: <span className="text-white">{selectedPatient.age} yrs</span></span>
            <span className="text-xs text-gray-400">Dept: <span className="text-white">{selectedPatient.department}</span></span>
            <span className="text-xs text-gray-400">Status: <span className="text-accent font-semibold">{selectedPatient.status}</span></span>
          </div>
        )}
      </div>

      {/* Empty state */}
      {!selectedId && !generating && !summary && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center min-h-[250px] gap-3 text-center"
        >
          <Brain className="w-14 h-14 text-gray-700" />
          <h3 className="text-lg font-bold text-white">No Patient Selected</h3>
          <p className="text-sm text-gray-400 max-w-sm">
            Select a patient from the dropdown above, then click "Generate Summary" to create a structured review of their records.
          </p>
        </motion.div>
      )}

      {/* Generating state */}
      <AnimatePresence>
        {generating && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-[250px] gap-4 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Brain className="w-8 h-8 text-accent animate-pulse" />
            </div>
            <div>
              <p className="text-base font-bold text-white">Generating Summary...</p>
              <p className="text-xs text-gray-400 mt-1">Analysing structured patient record data</p>
            </div>
            <div className="flex gap-1.5">
              {[0,1,2].map(i => (
                <motion.div key={i} className="w-2 h-2 rounded-full bg-accent"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
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
            className="glass-card p-5 border border-rose-500/30 bg-rose-500/10 flex items-center gap-3"
          >
            <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <p className="text-sm text-rose-300 flex-1">{genError}</p>
            <button onClick={handleGenerate} className="text-xs text-accent font-semibold hover:underline flex-shrink-0">Retry</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Output */}
      <AnimatePresence>
        {summary && !generating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
            id="summary-content"
          >
            {/* Summary Header */}
            <div className="glass-card p-5 border border-accent/30 bg-gradient-to-r from-accent/10 to-primary/10">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <Brain className="w-6 h-6 text-accent" />
                  <div>
                    <h2 className="text-base font-extrabold text-white">AI Patient Summary</h2>
                    <p className="text-xs text-gray-400">
                      Generated: {new Date(summary.generatedAt).toLocaleString('en-IN')} · {summary.phase}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400">Summary Ready</span>
                </div>
              </div>
            </div>

            {/* Summary Sections — 2 column on desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {summary.sections.map((section, idx) => {
                const Icon = SECTION_ICONS[section.title] ?? Brain;
                const colorClass = SECTION_COLORS[idx % SECTION_COLORS.length];
                return (
                  <motion.div
                    key={section.title}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`rounded-2xl p-5 border bg-gradient-to-br ${colorClass} space-y-3`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-white/80" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">{section.title}</h3>
                    </div>
                    <p className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap">{section.content}</p>
                  </motion.div>
                );
              })}
            </div>

            {/* Footer disclaimer */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200/80 leading-relaxed">
              <span className="font-bold text-amber-300">Disclaimer: </span>{summary.disclaimer}
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
