import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, UserCheck, ClipboardList, Plus, X, Eye, Edit2, Trash2,
  CheckCircle2, AlertTriangle, AlertCircle, ChevronLeft, ChevronRight,
  Thermometer, Heart, Wind, Activity, Droplets, Scale, Brain,
  Calendar, Clock, Filter, RefreshCw, Save, Loader2,
} from 'lucide-react';
import { Button } from '../components/Button';
import * as nurseService from '../services/nurseService';
import type { PatientSummary, ObservationFormData, PatientObservation, ObservationFilters } from '../types';

// ─────────────────────────────────────────────────────────────────
// Constants & Helpers
// ─────────────────────────────────────────────────────────────────
// Note: API_BASE kept for any future backend-connected endpoints (auth, etc.)
// Observation and patient-search calls now use nurseService (mock data).
const API_BASE = 'http://localhost:5000/api';

const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentTimeString = (): string => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const getEmptyForm = (): ObservationFormData => ({
  patientId: '',
  observationDate: getTodayDateString(),
  observationTime: getCurrentTimeString(),
  temperature: '',
  pulseRate: '',
  respiratoryRate: '',
  systolicBp: '',
  diastolicBp: '',
  spo2: '',
  bloodGlucose: '',
  weight: '',
  painScore: '',
  consciousnessLevel: '',
  generalObservation: '',
  additionalNotes: '',
});

const EMPTY_FORM: ObservationFormData = getEmptyForm();

interface ClinicalRange {
  min: number;
  max: number;
  warnMin: number;
  warnMax: number;
  unit: string;
}

const RANGES: Record<string, ClinicalRange> = {
  temperature:     { min: 30, max: 45,  warnMin: 36,  warnMax: 37.5, unit: '°C' },
  pulseRate:       { min: 20, max: 300, warnMin: 60,  warnMax: 100,  unit: 'bpm' },
  respiratoryRate: { min: 4,  max: 60,  warnMin: 12,  warnMax: 20,   unit: '/min' },
  systolicBp:      { min: 50, max: 300, warnMin: 90,  warnMax: 140,  unit: 'mmHg' },
  diastolicBp:     { min: 20, max: 200, warnMin: 60,  warnMax: 90,   unit: 'mmHg' },
  spo2:            { min: 50, max: 100, warnMin: 95,  warnMax: 100,  unit: '%' },
  bloodGlucose:    { min: 1,  max: 1000,warnMin: 70,  warnMax: 140,  unit: 'mg/dL' },
  weight:          { min: 1,  max: 500, warnMin: 30,  warnMax: 300,  unit: 'kg' },
  painScore:       { min: 0,  max: 10,  warnMin: 0,   warnMax: 3,    unit: '/10' },
};

// ─────────────────────────────────────────────────────────────────
// Helper — get JWT token (kept for future backend auth bootstrap)
// ─────────────────────────────────────────────────────────────────
function getToken(): string | null {
  return localStorage.getItem('meditwin_token');
}

// ─────────────────────────────────────────────────────────────────
// Sub-component: RangeWarning
// ─────────────────────────────────────────────────────────────────
function RangeWarning({ field, value }: { field: string; value: string }) {
  const range = RANGES[field];
  if (!range || value === '') return null;
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  if (num < range.min || num > range.max) {
    return (
      <p className="text-rose-400 text-xs mt-1 flex items-center gap-1">
        <AlertCircle className="w-3 h-3 flex-shrink-0" />
        Value outside acceptable limits ({range.min}–{range.max} {range.unit}).
      </p>
    );
  }
  if (num < range.warnMin || num > range.warnMax) {
    return (
      <p className="text-amber-400 text-xs mt-1 flex items-center gap-1">
        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
        Value is outside the expected range. Please verify the reading.
      </p>
    );
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────
// Sub-component: FormField
// ─────────────────────────────────────────────────────────────────
interface FormFieldProps {
  label: string;
  field: keyof ObservationFormData;
  form: ObservationFormData;
  setForm: React.Dispatch<React.SetStateAction<ObservationFormData>>;
  errors: Partial<Record<keyof ObservationFormData, string>>;
  type?: string;
  placeholder?: string;
  required?: boolean;
  step?: string;
  icon?: React.ReactNode;
}

function FormField({ label, field, form, setForm, errors, type = 'number', placeholder, required, step = '0.1', icon }: FormFieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>}
        <input
          type={type}
          step={type === 'number' ? step : undefined}
          min={type === 'number' ? '0' : undefined}
          value={form[field] as string}
          onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
          placeholder={placeholder}
          className={`w-full py-2.5 ${icon ? 'pl-9' : 'pl-3'} pr-3 text-sm text-white bg-white/5 border rounded-xl focus:outline-none focus:ring-1 transition-all placeholder:text-gray-600 ${
            errors[field]
              ? 'border-rose-500/60 focus:border-rose-400 focus:ring-rose-500/30'
              : 'border-white/15 focus:border-accent/60 focus:ring-accent/30'
          }`}
        />
      </div>
      {errors[field] && (
        <p className="text-rose-400 text-xs mt-0.5 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />{errors[field]}
        </p>
      )}
      <RangeWarning field={field} value={form[field] as string} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sub-component: ViewModal
// ─────────────────────────────────────────────────────────────────
function ViewModal({ obs, onClose }: { obs: PatientObservation; onClose: () => void }) {
  const rows: [string, string | number | null | undefined][] = [
    ['Date', obs.observationDate?.toString().split('T')[0]],
    ['Time', obs.observationTime?.toString().split('T')[1]?.slice(0, 5) ?? obs.observationTime],
    ['Temperature', obs.temperature != null ? `${obs.temperature} °C` : '—'],
    ['Pulse Rate', obs.pulseRate != null ? `${obs.pulseRate} bpm` : '—'],
    ['Respiratory Rate', obs.respiratoryRate != null ? `${obs.respiratoryRate} /min` : '—'],
    ['Blood Pressure', `${obs.systolicBp}/${obs.diastolicBp} mmHg`],
    ['SpO2', obs.spo2 != null ? `${obs.spo2} %` : '—'],
    ['Blood Glucose', obs.bloodGlucose != null ? `${obs.bloodGlucose} mg/dL` : '—'],
    ['Weight', obs.weight != null ? `${obs.weight} kg` : '—'],
    ['Pain Score', obs.painScore != null ? `${obs.painScore} / 10` : '—'],
    ['Level of Consciousness', obs.consciousnessLevel ?? '—'],
    ['General Observation', obs.generalObservation ?? '—'],
    ['Additional Notes', obs.additionalNotes ?? '—'],
    ['Recorded By', obs.nurse ? `${obs.nurse.firstName} ${obs.nurse.lastName}` : '—'],
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card max-w-lg w-full p-6 border border-white/20 bg-navy-900/95 max-h-[85vh] overflow-y-auto rounded-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-accent" /> Observation Details
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        {obs.patient && (
          <div className="mb-4 p-3 rounded-xl bg-accent/10 border border-accent/20">
            <p className="text-xs text-gray-400">Patient</p>
            <p className="font-bold text-white">{obs.patient.firstName} {obs.patient.lastName}</p>
          </div>
        )}
        <div className="space-y-2">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between py-1.5 border-b border-white/5 gap-4">
              <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
              <span className="text-xs text-white text-right break-words max-w-[60%]">{value ?? '—'}</span>
            </div>
          ))}
        </div>
        <Button variant="glass" size="sm" className="mt-5 w-full justify-center" onClick={onClose}>Close</Button>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────
export const NurseObservationsPage: React.FC = () => {
  // Auth / token
  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem('meditwin_user') || '{}'); } catch { return {}; }
  })();

  // ── State ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab]       = useState<'record' | 'history'>('record');
  const [tokenReady, setTokenReady]     = useState(!!getToken());

  // Patient search
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState<PatientSummary[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);

  // Form
  const [form, setForm]                 = useState<ObservationFormData>(EMPTY_FORM);
  const [errors, setErrors]             = useState<Partial<Record<keyof ObservationFormData, string>>>({});
  const [formLoading, setFormLoading]   = useState(false);
  const [editingId, setEditingId]       = useState<number | null>(null);
  const [successMsg, setSuccessMsg]     = useState('');
  const [apiError, setApiError]         = useState('');

  // History
  const [observations, setObservations] = useState<PatientObservation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [filters, setFilters]           = useState<ObservationFilters>({ dateFrom: '', dateTo: '', search: '' });
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [viewObs, setViewObs]           = useState<PatientObservation | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // ── Token bootstrap ────────────────────────────────────────────
  useEffect(() => {
    if (tokenReady) return;
    const { username, role } = storedUser;
    if (!username) return;
    fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: username, password: 'demo', role }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.token) { localStorage.setItem('meditwin_token', d.token); setTokenReady(true); }
      })
      .catch(() => {});
  }, []);

  // ── Patient Search (nurseService — mock data) ─────────────────
  const searchPatients = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const results = await nurseService.searchPatients(q, nurseService.getCurrentNurseId());
      // PatientSummary is a subset of NursePatient — cast is safe
      setSearchResults(results as unknown as PatientSummary[]);
    } catch { setSearchResults([]); }
    finally { setSearchLoading(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchPatients(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery, searchPatients]);

  const selectPatient = (p: PatientSummary) => {
    setSelectedPatient(p);
    setSearchResults([]);
    setSearchQuery('');
    setForm((f) => ({ ...f, patientId: p.id }));
  };

  // ── Fetch history (nurseService — mock data) ───────────────────
  const fetchHistory = useCallback(async (_pg = 1) => {
    if (!selectedPatient) return;
    setHistoryLoading(true);
    try {
      let data = await nurseService.getPatientObservations(
        Number(selectedPatient.id),
        nurseService.getCurrentNurseId(),
      );
      // Apply date filters client-side
      if (filters.dateFrom)
        data = data.filter((o) => o.observationDate >= filters.dateFrom);
      if (filters.dateTo)
        data = data.filter((o) => o.observationDate <= filters.dateTo);
      setObservations(data);
      setTotalPages(1); // single page in mock mode
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Unable to load observations.');
    } finally { setHistoryLoading(false); }
  }, [selectedPatient, filters]);

  useEffect(() => {
    if (activeTab === 'history') fetchHistory(page);
  }, [activeTab, page, fetchHistory]);

  // ── Validation ─────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: Partial<Record<keyof ObservationFormData, string>> = {};
    const today = getTodayDateString();
    const currentTime = getCurrentTimeString();

    if (!form.patientId) e.patientId = 'Patient is required.';

    if (!form.observationDate) {
      e.observationDate = 'Date is required.';
    } else if (form.observationDate > today) {
      e.observationDate = 'Observation date cannot be in the future.';
    }

    if (!form.observationTime) {
      e.observationTime = 'Time is required.';
    } else if (form.observationDate === today && form.observationTime > currentTime) {
      e.observationTime = 'Observation time cannot run beyond current time.';
    }

    const numFields: { field: keyof ObservationFormData; label: string; required: boolean }[] = [
      { field: 'temperature',     label: 'Temperature',      required: true  },
      { field: 'pulseRate',       label: 'Pulse Rate',       required: true  },
      { field: 'respiratoryRate', label: 'Respiratory Rate', required: true  },
      { field: 'systolicBp',      label: 'Systolic BP',      required: true  },
      { field: 'diastolicBp',     label: 'Diastolic BP',     required: true  },
      { field: 'spo2',            label: 'SpO2',             required: true  },
      { field: 'bloodGlucose',    label: 'Blood Glucose',    required: false },
      { field: 'weight',          label: 'Weight',           required: false },
      { field: 'painScore',       label: 'Pain Score',       required: false },
    ];

    for (const { field, label, required } of numFields) {
      const v = (form[field] as string).trim();
      if (!v && required) { e[field] = `${label} is required.`; continue; }
      if (!v) continue;
      const n = parseFloat(v);
      if (isNaN(n) || n < 0) { e[field] = `${label} must be a valid non-negative number.`; continue; }
      const range = RANGES[field];
      if (range && (n < range.min || n > range.max)) {
        e[field] = `${label} must be between ${range.min} and ${range.max} ${range.unit}.`;
      }
    }

    // General Observation validation: min 50 characters, no numbers
    const genObs = (form.generalObservation || '').trim();
    if (!genObs) {
      e.generalObservation = 'General patient observation is required (minimum 50 characters).';
    } else if (/\d/.test(genObs)) {
      e.generalObservation = 'Numbers are not allowed in general patient observation.';
    } else if (genObs.length < 50) {
      e.generalObservation = `Must contain at least 50 characters (currently ${genObs.length}/50).`;
    }

    // Additional Notes validation: min 50 characters, no numbers
    const addNotes = (form.additionalNotes || '').trim();
    if (!addNotes) {
      e.additionalNotes = 'Additional notes are required (minimum 50 characters).';
    } else if (/\d/.test(addNotes)) {
      e.additionalNotes = 'Numbers are not allowed in additional notes.';
    } else if (addNotes.length < 50) {
      e.additionalNotes = `Must contain at least 50 characters (currently ${addNotes.length}/50).`;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    setSuccessMsg('');
    if (!validate()) return;

    setFormLoading(true);
    try {
      if (editingId) {
        await nurseService.updateObservation(editingId as number, form);
        setSuccessMsg('Observation updated successfully!');
      } else {
        const saved = await nurseService.saveObservation(form, nurseService.getCurrentNurseId());
        // Prepend to local list so it appears immediately in history
        setObservations((prev) => [saved, ...prev]);
        setSuccessMsg('Patient observation recorded successfully.');
      }
      setForm({ ...getEmptyForm(), patientId: form.patientId, observationDate: getTodayDateString(), observationTime: getCurrentTimeString() });
      setEditingId(null);
      setErrors({});
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  // ── Edit ───────────────────────────────────────────────────────
  const handleEdit = (obs: PatientObservation) => {
    const dateStr = obs.observationDate?.toString().split('T')[0] ?? '';
    const rawTime = obs.observationTime?.toString() ?? '';
    // Time may come as "1970-01-01T06:00:00.000Z" or "06:00:00"
    const timeStr = rawTime.includes('T') ? rawTime.split('T')[1].slice(0, 5) : rawTime.slice(0, 5);
    setForm({
      patientId:          obs.patientId,
      observationDate:    dateStr,
      observationTime:    timeStr,
      temperature:        String(obs.temperature ?? ''),
      pulseRate:          String(obs.pulseRate ?? ''),
      respiratoryRate:    String(obs.respiratoryRate ?? ''),
      systolicBp:         String(obs.systolicBp ?? ''),
      diastolicBp:        String(obs.diastolicBp ?? ''),
      spo2:               String(obs.spo2 ?? ''),
      bloodGlucose:       obs.bloodGlucose != null ? String(obs.bloodGlucose) : '',
      weight:             obs.weight != null ? String(obs.weight) : '',
      painScore:          obs.painScore != null ? String(obs.painScore) : '',
      consciousnessLevel: obs.consciousnessLevel ?? '',
      generalObservation: obs.generalObservation ?? '',
      additionalNotes:    obs.additionalNotes ?? '',
    });
    setEditingId(obs.id);
    setActiveTab('record');
    setApiError('');
    setSuccessMsg('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Delete (nurseService) ──────────────────────────────────────
  const handleDelete = async (id: number) => {
    try {
      await nurseService.deleteObservation(id);
      setObservations((prev) => prev.filter((o) => o.id !== id));
      setDeleteConfirm(null);
      setSuccessMsg('Observation deleted.');
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  // ── Age helper ─────────────────────────────────────────────────
  function calcAge(dob: string): number {
    const d = new Date(dob);
    const n = new Date();
    return n.getFullYear() - d.getFullYear() -
      (n < new Date(n.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
  }

  // ──────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Page Header ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 border border-accent/30 bg-gradient-to-r from-navy-900/90 via-navy-800/80 to-navy-900/90">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-glow-primary flex-shrink-0">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">Patient Observations & Vital Signs</h2>
              <p className="text-xs text-gray-400 mt-0.5">Record and manage nursing observations securely</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('record')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'record' ? 'bg-primary text-white shadow-glow-primary' : 'bg-white/10 text-gray-300 hover:bg-white/15'}`}
            ><Plus className="w-3.5 h-3.5 inline mr-1" />Record Vitals</button>
            <button
              onClick={() => { setActiveTab('history'); fetchHistory(1); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'history' ? 'bg-primary text-white shadow-glow-primary' : 'bg-white/10 text-gray-300 hover:bg-white/15'}`}
            ><ClipboardList className="w-3.5 h-3.5 inline mr-1" />Observation History</button>
          </div>
        </div>
      </motion.div>

      {/* ── Global messages ── */}
      <AnimatePresence>
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            {successMsg}
            <button onClick={() => setSuccessMsg('')} className="ml-auto text-emerald-400 hover:text-white"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
        {apiError && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            {apiError}
            <button onClick={() => setApiError('')} className="ml-auto text-rose-400 hover:text-white"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════
          TAB: RECORD VITALS
      ═══════════════════════════════════════════════════ */}
      {activeTab === 'record' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

          {/* ── Patient Search Card ── */}
          <div className="glass-card p-5 border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-accent" /> Select Patient
            </h3>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by patient name or email…"
                className="w-full py-2.5 pl-10 pr-4 text-sm text-white bg-white/5 border border-white/15 rounded-xl focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30 placeholder:text-gray-600"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              {searchLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent animate-spin" />}
            </div>

            {/* Search dropdown */}
            {searchResults.length > 0 && (
              <div className="border border-white/15 rounded-xl overflow-hidden bg-navy-900/95 shadow-xl">
                {searchResults.map((p) => (
                  <button key={p.id} onClick={() => selectPatient(p)}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 transition-colors border-b border-white/5 last:border-0 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {p.firstName[0]}{p.lastName[0]}
                    </div>
                    <div>
                      <p className="text-white font-medium">{p.firstName} {p.lastName}</p>
                      <p className="text-gray-400 text-xs">{p.user?.email} · {p.gender?.name ?? '—'}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Selected patient card */}
            {selectedPatient && (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-xl bg-accent/10 border border-accent/25 relative">
                <button onClick={() => { setSelectedPatient(null); setForm((f) => ({ ...f, patientId: '' })); }}
                  className="absolute top-3 right-3 p-1 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold text-sm">
                    {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
                  </div>
                  <div>
                    <p className="font-bold text-white">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                    <p className="text-xs text-accent font-medium">Patient ID: #{selectedPatient.id}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    ['Age', selectedPatient.age != null ? `${selectedPatient.age} yrs` : calcAge(selectedPatient.dateOfBirth) + ' yrs'],
                    ['Gender', selectedPatient.gender?.name ?? '—'],
                    ['Blood Group', selectedPatient.bloodGroup?.name ?? '—'],
                    ['Phone', selectedPatient.phone ?? '—'],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-white/5 rounded-lg p-2">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
                      <p className="text-sm text-white font-semibold mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* No-DB hint */}
            {!selectedPatient && (
              <p className="text-xs text-gray-500 text-center">
                No patients in database? You can still record observations — enter the Patient ID manually below.
              </p>
            )}
          </div>

          {/* ── Vital Signs Form ── */}
          <form onSubmit={handleSubmit} noValidate className="glass-card p-5 border border-white/10 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-accent" />
                {editingId ? `Editing Observation #${editingId}` : 'Record Vital Signs'}
              </h3>
              {editingId && (
                <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY_FORM); setErrors({}); }}
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <X className="w-3 h-3" /> Cancel Edit
                </button>
              )}
            </div>

            {/* Patient ID (manual fallback) */}
            {!selectedPatient && (
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Patient ID <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number" min="1"
                  value={form.patientId === '' ? '' : form.patientId}
                  onChange={(e) => setForm((p) => ({ ...p, patientId: e.target.value === '' ? '' : parseInt(e.target.value) }))}
                  placeholder="Enter Patient ID"
                  className={`w-full py-2.5 pl-3 pr-3 text-sm text-white bg-white/5 border rounded-xl focus:outline-none focus:ring-1 transition-all placeholder:text-gray-600 ${errors.patientId ? 'border-rose-500/60 focus:border-rose-400 focus:ring-rose-500/30' : 'border-white/15 focus:border-accent/60 focus:ring-accent/30'}`}
                />
                {errors.patientId && <p className="text-rose-400 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.patientId}</p>}
              </div>
            )}

            {/* Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Observation Date <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={form.observationDate}
                    max={getTodayDateString()}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setForm((p) => ({ ...p, observationDate: newDate }));
                      const today = getTodayDateString();
                      const currTime = getCurrentTimeString();
                      setErrors((prev) => {
                        const next = { ...prev };
                        if (!newDate) {
                          next.observationDate = 'Date is required.';
                        } else if (newDate > today) {
                          next.observationDate = 'Observation date cannot be in the future.';
                        } else {
                          delete next.observationDate;
                        }

                        if (newDate === today && form.observationTime && form.observationTime > currTime) {
                          next.observationTime = 'Observation time cannot run beyond current time.';
                        } else if (next.observationTime === 'Observation time cannot run beyond current time.') {
                          delete next.observationTime;
                        }
                        return next;
                      });
                    }}
                    className={`w-full py-2.5 pl-9 pr-3 text-sm text-white bg-white/5 border rounded-xl focus:outline-none focus:ring-1 transition-all [color-scheme:dark] ${errors.observationDate ? 'border-rose-500/60' : 'border-white/15 focus:border-accent/60 focus:ring-accent/30'}`}
                  />
                </div>
                {errors.observationDate && <p className="text-rose-400 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.observationDate}</p>}
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Observation Time <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="time"
                    value={form.observationTime}
                    max={form.observationDate === getTodayDateString() ? getCurrentTimeString() : undefined}
                    onChange={(e) => {
                      const newTime = e.target.value;
                      setForm((p) => ({ ...p, observationTime: newTime }));
                      const today = getTodayDateString();
                      const currTime = getCurrentTimeString();
                      setErrors((prev) => {
                        const next = { ...prev };
                        if (!newTime) {
                          next.observationTime = 'Time is required.';
                        } else if (form.observationDate === today && newTime > currTime) {
                          next.observationTime = 'Observation time cannot run beyond current time.';
                        } else {
                          delete next.observationTime;
                        }
                        return next;
                      });
                    }}
                    className={`w-full py-2.5 pl-9 pr-3 text-sm text-white bg-white/5 border rounded-xl focus:outline-none focus:ring-1 transition-all [color-scheme:dark] ${errors.observationTime ? 'border-rose-500/60' : 'border-white/15 focus:border-accent/60 focus:ring-accent/30'}`}
                  />
                </div>
                {errors.observationTime && <p className="text-rose-400 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.observationTime}</p>}
              </div>
            </div>

            {/* Required vitals section */}
            <div>
              <p className="text-xs text-gray-400 mb-3 font-semibold uppercase tracking-wider border-b border-white/10 pb-2">
                Required Vital Signs
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField label="Body Temperature (°C)"     field="temperature"     form={form} setForm={setForm} errors={errors} icon={<Thermometer className="w-4 h-4" />} placeholder="36.6" required step="0.1" />
                <FormField label="Pulse Rate (bpm)"          field="pulseRate"        form={form} setForm={setForm} errors={errors} icon={<Heart className="w-4 h-4" />}        placeholder="72"   required step="1"   />
                <FormField label="Respiratory Rate (/min)"   field="respiratoryRate"  form={form} setForm={setForm} errors={errors} icon={<Wind className="w-4 h-4" />}         placeholder="16"   required step="1"   />
                <FormField label="Systolic BP (mmHg)"        field="systolicBp"       form={form} setForm={setForm} errors={errors} icon={<Activity className="w-4 h-4" />}     placeholder="120"  required step="1"   />
                <FormField label="Diastolic BP (mmHg)"       field="diastolicBp"      form={form} setForm={setForm} errors={errors} icon={<Activity className="w-4 h-4" />}     placeholder="80"   required step="1"   />
                <FormField label="SpO2 / Oxygen Sat. (%)"   field="spo2"             form={form} setForm={setForm} errors={errors} icon={<Droplets className="w-4 h-4" />}     placeholder="98"   required step="0.1" />
              </div>
            </div>

            {/* Optional vitals section */}
            <div>
              <p className="text-xs text-gray-400 mb-3 font-semibold uppercase tracking-wider border-b border-white/10 pb-2">
                Optional Measurements
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField label="Blood Glucose (mg/dL)"     field="bloodGlucose"     form={form} setForm={setForm} errors={errors} icon={<Droplets className="w-4 h-4" />}     placeholder="90"   step="0.1" />
                <FormField label="Weight (kg)"               field="weight"           form={form} setForm={setForm} errors={errors} icon={<Scale className="w-4 h-4" />}         placeholder="70"   step="0.1" />
                <FormField label="Pain Score (0–10)"         field="painScore"        form={form} setForm={setForm} errors={errors} icon={<AlertTriangle className="w-4 h-4" />} placeholder="0"    step="1"   />
              </div>
            </div>

            {/* Consciousness level */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Level of Consciousness
              </label>
              <div className="relative">
                <Brain className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select value={form.consciousnessLevel}
                  onChange={(e) => setForm((p) => ({ ...p, consciousnessLevel: e.target.value }))}
                  className="w-full py-2.5 pl-9 pr-4 text-sm text-white bg-navy-900 border border-white/15 rounded-xl focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30 cursor-pointer appearance-none">
                  <option value="" className="bg-navy-900">— Select —</option>
                  {['Alert', 'Confused', 'Drowsy', 'Unresponsive'].map((v) => (
                    <option key={v} value={v} className="bg-navy-900">{v}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Text areas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    General Patient Observation <span className="text-rose-400">*</span>
                  </label>
                  <span className={`text-[11px] font-mono ${(form.generalObservation || '').trim().length >= 50 && !/\d/.test(form.generalObservation || '') ? 'text-emerald-400' : (form.generalObservation || '').trim().length > 0 ? 'text-amber-400' : 'text-gray-400'}`}>
                    {(form.generalObservation || '').trim().length}/50 min chars
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={form.generalObservation}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((p) => ({ ...p, generalObservation: val }));
                    setErrors((prev) => {
                      const next = { ...prev };
                      const trimmed = val.trim();
                      if (!trimmed) {
                        next.generalObservation = 'General patient observation is required (minimum 50 characters).';
                      } else if (/\d/.test(val)) {
                        next.generalObservation = 'Numbers are not allowed in general patient observation.';
                      } else if (trimmed.length < 50) {
                        next.generalObservation = `Must contain at least 50 characters (currently ${trimmed.length}/50).`;
                      } else {
                        delete next.generalObservation;
                      }
                      return next;
                    });
                  }}
                  placeholder="Describe the patient's general condition, appearance, behaviour (min 50 characters, letters only)…"
                  className={`w-full py-2.5 px-3 text-sm text-white bg-white/5 border rounded-xl focus:outline-none focus:ring-1 transition-all placeholder:text-gray-600 resize-none ${
                    errors.generalObservation
                      ? 'border-rose-500/60 focus:border-rose-400 focus:ring-rose-500/30'
                      : 'border-white/15 focus:border-accent/60 focus:ring-accent/30'
                  }`}
                />
                {errors.generalObservation && (
                  <p className="text-rose-400 text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    {errors.generalObservation}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Additional Notes <span className="text-rose-400">*</span>
                  </label>
                  <span className={`text-[11px] font-mono ${(form.additionalNotes || '').trim().length >= 50 && !/\d/.test(form.additionalNotes || '') ? 'text-emerald-400' : (form.additionalNotes || '').trim().length > 0 ? 'text-amber-400' : 'text-gray-400'}`}>
                    {(form.additionalNotes || '').trim().length}/50 min chars
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={form.additionalNotes}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((p) => ({ ...p, additionalNotes: val }));
                    setErrors((prev) => {
                      const next = { ...prev };
                      const trimmed = val.trim();
                      if (!trimmed) {
                        next.additionalNotes = 'Additional notes are required (minimum 50 characters).';
                      } else if (/\d/.test(val)) {
                        next.additionalNotes = 'Numbers are not allowed in additional notes.';
                      } else if (trimmed.length < 50) {
                        next.additionalNotes = `Must contain at least 50 characters (currently ${trimmed.length}/50).`;
                      } else {
                        delete next.additionalNotes;
                      }
                      return next;
                    });
                  }}
                  placeholder="Any additional clinical notes, interventions, or alerts (min 50 characters, letters only)…"
                  className={`w-full py-2.5 px-3 text-sm text-white bg-white/5 border rounded-xl focus:outline-none focus:ring-1 transition-all placeholder:text-gray-600 resize-none ${
                    errors.additionalNotes
                      ? 'border-rose-500/60 focus:border-rose-400 focus:ring-rose-500/30'
                      : 'border-white/15 focus:border-accent/60 focus:ring-accent/30'
                  }`}
                />
                {errors.additionalNotes && (
                  <p className="text-rose-400 text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    {errors.additionalNotes}
                  </p>
                )}
              </div>
            </div>

            {/* Submit button */}
            <div className="flex gap-3 pt-2">
              <Button type="submit" variant="primary" size="md" disabled={formLoading}
                icon={formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                className="flex-1 justify-center">
                {formLoading ? 'Saving…' : editingId ? 'Update Observation' : 'Save Observation'}
              </Button>
              <Button type="button" variant="glass" size="md"
                onClick={() => { setForm(EMPTY_FORM); setErrors({}); setEditingId(null); setSuccessMsg(''); setApiError(''); }}>
                <RefreshCw className="w-4 h-4" /> Reset
              </Button>
            </div>
          </form>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════
          TAB: OBSERVATION HISTORY
      ═══════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

          {/* Filters */}
          <div className="glass-card p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-accent" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Filters</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-gray-400">From Date</label>
                <input type="date" value={filters.dateFrom}
                  onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                  className="w-full py-2 px-3 text-sm text-white bg-white/5 border border-white/15 rounded-xl focus:outline-none focus:border-accent/60 [color-scheme:dark]" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">To Date</label>
                <input type="date" value={filters.dateTo}
                  onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                  className="w-full py-2 px-3 text-sm text-white bg-white/5 border border-white/15 rounded-xl focus:outline-none focus:border-accent/60 [color-scheme:dark]" />
              </div>
              <div className="flex items-end gap-2">
                <Button variant="accent" size="sm" onClick={() => { setPage(1); fetchHistory(1); }} className="flex-1 justify-center">
                  <Search className="w-3.5 h-3.5" /> Apply
                </Button>
                <Button variant="glass" size="sm" onClick={() => { setFilters({ dateFrom: '', dateTo: '', search: '' }); setPage(1); fetchHistory(1); }}>
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Context — selected patient */}
          {selectedPatient && (
            <div className="flex items-center gap-2 text-xs text-gray-300 px-1">
              <UserCheck className="w-4 h-4 text-accent" />
              Showing history for <strong className="text-white">{selectedPatient.firstName} {selectedPatient.lastName}</strong>
            </div>
          )}

          {/* Table */}
          <div className="glass-card border border-white/10 overflow-hidden">
            {historyLoading ? (
              <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
                <span className="text-sm">Loading observations…</span>
              </div>
            ) : observations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
                <ClipboardList className="w-10 h-10 text-gray-600" />
                <p className="text-sm">No observations found. Select a patient and record their vitals.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      {['Date','Time','Temp °C','Pulse','RR','BP','SpO2','Glucose','Pain','Recorded By','Actions'].map((h) => (
                        <th key={h} className="px-3 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {observations.map((obs, i) => (
                      <tr key={obs.id} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                        <td className="px-3 py-3 text-gray-300 whitespace-nowrap">{obs.observationDate?.toString().split('T')[0]}</td>
                        <td className="px-3 py-3 text-gray-300 whitespace-nowrap">
                          {(() => {
                            const t = obs.observationTime?.toString() ?? '';
                            return t.includes('T') ? t.split('T')[1].slice(0,5) : t.slice(0,5);
                          })()}
                        </td>
                        <td className="px-3 py-3 text-white font-medium">{obs.temperature}</td>
                        <td className="px-3 py-3 text-white font-medium">{obs.pulseRate}</td>
                        <td className="px-3 py-3 text-white font-medium">{obs.respiratoryRate}</td>
                        <td className="px-3 py-3 text-white font-medium whitespace-nowrap">{obs.systolicBp}/{obs.diastolicBp}</td>
                        <td className="px-3 py-3 text-white font-medium">{obs.spo2}%</td>
                        <td className="px-3 py-3 text-gray-300">{obs.bloodGlucose ?? '—'}</td>
                        <td className="px-3 py-3 text-gray-300">{obs.painScore ?? '—'}</td>
                        <td className="px-3 py-3 text-gray-300 whitespace-nowrap">
                          {obs.nurse ? `${obs.nurse.firstName} ${obs.nurse.lastName}` : '—'}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setViewObs(obs)} title="View"
                              className="p-1.5 rounded-lg bg-accent/10 hover:bg-accent/25 text-accent transition-colors">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleEdit(obs)} title="Edit"
                              className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/25 text-primary-light transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteConfirm(obs.id)} title="Delete"
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
                <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <button onClick={() => { setPage((p) => Math.max(1, p-1)); fetchHistory(page-1); }} disabled={page <= 1}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setPage((p) => Math.min(totalPages, p+1)); fetchHistory(page+1); }} disabled={page >= totalPages}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── View Modal ── */}
      <AnimatePresence>
        {viewObs && <ViewModal obs={viewObs} onClose={() => setViewObs(null)} />}
      </AnimatePresence>

      {/* ── Delete Confirmation ── */}
      <AnimatePresence>
        {deleteConfirm !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="glass-card max-w-sm w-full p-6 border border-rose-500/30 bg-navy-900/95 rounded-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Delete Observation?</h3>
              <p className="text-sm text-gray-300">This action cannot be undone. The record will be permanently removed and an audit log will be created.</p>
              <div className="flex gap-3">
                <Button variant="glass" size="sm" className="flex-1 justify-center" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                <button onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold transition-colors">
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NurseObservationsPage;
