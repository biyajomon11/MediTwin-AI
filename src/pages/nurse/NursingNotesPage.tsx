import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ClipboardEdit, Plus, X, Eye, Edit2, Trash2, CheckCircle2,
  AlertCircle, Calendar, Clock, Save, Loader2,
  RefreshCw, FileText, Stethoscope, Activity, Filter, ChevronDown,
} from 'lucide-react';
import { Button } from '../../components/Button';
import * as nurseService from '../../services/nurseService';
import type {
  NursePatient, NursingNote, TreatmentRecord, NoteType,
} from '../../types';
import type {
  NursingNoteFormData, TreatmentRecordFormData,
} from '../../services/nurseService';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const NOTE_TYPES: NoteType[] = [
  'General Nursing Note',
  'Patient Observation',
  'Medication Administration',
  'Treatment/Procedure',
  'Patient Response',
  'Follow-up Note',
];

const NOTE_TYPE_COLORS: Record<NoteType, string> = {
  'General Nursing Note':    'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'Patient Observation':     'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'Medication Administration': 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  'Treatment/Procedure':     'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'Patient Response':        'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'Follow-up Note':          'bg-rose-500/20 text-rose-300 border-rose-500/30',
};

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

const getEmptyNoteForm = (): NursingNoteFormData => ({
  patientId: '',
  date: getTodayDateString(),
  time: getCurrentTimeString(),
  nurseName: nurseService.getCurrentNurseName(),
  noteType: '',
  nursingObservation: '',
  patientResponse: '',
  treatmentCareProvided: '',
  additionalNotes: '',
});

const getEmptyTreatmentForm = (): TreatmentRecordFormData => ({
  patientId: '',
  date: getTodayDateString(),
  time: getCurrentTimeString(),
  treatmentName: '',
  description: '',
  performedBy: nurseService.getCurrentNurseName(),
  patientResponse: '',
  additionalNotes: '',
});

const EMPTY_NOTE_FORM: NursingNoteFormData = getEmptyNoteForm();
const EMPTY_TREATMENT_FORM: TreatmentRecordFormData = getEmptyTreatmentForm();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function fmtDateTime(date: string, time: string) {
  return `${date}  ${time}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: StatusBadge
// ─────────────────────────────────────────────────────────────────────────────
function NoteTypeBadge({ type }: { type: NoteType }) {
  const cls = NOTE_TYPE_COLORS[type] ?? 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>
      {type}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: View Note Modal
// ─────────────────────────────────────────────────────────────────────────────
function ViewNoteModal({ note, onClose }: { note: NursingNote; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card max-w-2xl w-full p-6 border border-white/20 bg-navy-900/95 max-h-[90vh] overflow-y-auto rounded-2xl"
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent" /> Nursing Note
            </h3>
            <p className="text-xs text-gray-400 mt-1">{fmtDateTime(note.date, note.time)} · By {note.nurseName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mb-4"><NoteTypeBadge type={note.noteType} /></div>
        <div className="space-y-4">
          {[
            ['Nursing Observation', note.nursingObservation],
            ['Patient Response', note.patientResponse],
            ['Treatment / Care Provided', note.treatmentCareProvided],
            ...(note.additionalNotes ? [['Additional Notes', note.additionalNotes]] : []),
          ].map(([label, value]) => (
            <div key={label} className="space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
              <p className="text-sm text-gray-100 whitespace-pre-wrap bg-white/5 rounded-xl p-3 border border-white/10">{value}</p>
            </div>
          ))}
        </div>
        <Button variant="glass" size="sm" className="mt-5 w-full justify-center" onClick={onClose}>Close</Button>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: View Treatment Modal
// ─────────────────────────────────────────────────────────────────────────────
function ViewTreatmentModal({ record, onClose }: { record: TreatmentRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card max-w-2xl w-full p-6 border border-white/20 bg-navy-900/95 max-h-[90vh] overflow-y-auto rounded-2xl"
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-amber-400" /> Treatment Record
            </h3>
            <p className="text-xs text-gray-400 mt-1">{fmtDateTime(record.date, record.time)} · By {record.performedBy}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="font-bold text-white text-base mb-4">{record.treatmentName}</p>
        <div className="space-y-4">
          {[
            ['Description', record.description],
            ['Patient Response', record.patientResponse],
            ...(record.additionalNotes ? [['Additional Notes', record.additionalNotes]] : []),
          ].map(([label, value]) => (
            <div key={label} className="space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
              <p className="text-sm text-gray-100 whitespace-pre-wrap bg-white/5 rounded-xl p-3 border border-white/10">{value}</p>
            </div>
          ))}
        </div>
        <Button variant="glass" size="sm" className="mt-5 w-full justify-center" onClick={onClose}>Close</Button>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Field wrapper for consistent styling
// ─────────────────────────────────────────────────────────────────────────────
function Field({ label, required, error, headerRight, children }: { label: string; required?: boolean; error?: string; headerRight?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
          {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
        </label>
        {headerRight}
      </div>
      {children}
      {error && (
        <p className="text-rose-400 text-xs flex items-center gap-1">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />{error}
        </p>
      )}
    </div>
  );
}

const inputCls = (err?: string) =>
  `w-full py-2.5 px-3 text-sm text-white bg-white/5 border rounded-xl focus:outline-none focus:ring-1 transition-all placeholder:text-gray-600 ${
    err ? 'border-rose-500/60 focus:border-rose-400 focus:ring-rose-500/30' : 'border-white/15 focus:border-sky-400/60 focus:ring-sky-400/30'
  }`;

const textareaCls = (err?: string) =>
  `w-full py-2.5 px-3 text-sm text-white bg-white/5 border rounded-xl focus:outline-none focus:ring-1 transition-all placeholder:text-gray-600 resize-none ${
    err ? 'border-rose-500/60 focus:border-rose-400 focus:ring-rose-500/30' : 'border-white/15 focus:border-sky-400/60 focus:ring-sky-400/30'
  }`;

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export const NursingNotesPage: React.FC = () => {
  // ── Tab ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'notes' | 'treatments'>('notes');

  // ── Patients ─────────────────────────────────────────────────────
  const [patients, setPatients] = useState<NursePatient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<NursePatient | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientDropdown, setPatientDropdown] = useState(false);

  // ── Nursing Notes state ───────────────────────────────────────────
  const [notes, setNotes]               = useState<NursingNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteForm, setNoteForm]         = useState<NursingNoteFormData>(EMPTY_NOTE_FORM);
  const [noteErrors, setNoteErrors]     = useState<Partial<Record<keyof NursingNoteFormData, string>>>({});
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [editingNoteId, setEditingNoteId]   = useState<string | null>(null);
  const [viewNote, setViewNote]             = useState<NursingNote | null>(null);
  const [deleteNoteId, setDeleteNoteId]     = useState<string | null>(null);

  // ── Treatment Records state ───────────────────────────────────────
  const [treatments, setTreatments]             = useState<TreatmentRecord[]>([]);
  const [treatmentsLoading, setTreatmentsLoading] = useState(false);
  const [treatForm, setTreatForm]               = useState<TreatmentRecordFormData>(EMPTY_TREATMENT_FORM);
  const [treatErrors, setTreatErrors]           = useState<Partial<Record<keyof TreatmentRecordFormData, string>>>({});
  const [treatSubmitting, setTreatSubmitting]   = useState(false);
  const [editingTreatId, setEditingTreatId]     = useState<string | null>(null);
  const [viewTreat, setViewTreat]               = useState<TreatmentRecord | null>(null);
  const [deleteTreatId, setDeleteTreatId]       = useState<string | null>(null);

  // ── Global feedback ───────────────────────────────────────────────
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg]     = useState('');

  // Auto-dismiss success
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(''), 3500);
    return () => clearTimeout(t);
  }, [successMsg]);

  // ── Load patients ─────────────────────────────────────────────────
  useEffect(() => {
    setPatientsLoading(true);
    nurseService.getPatients()
      .then((pts) => {
        setPatients(pts);
        if (pts.length > 0) {
          handleSelectPatient(pts[0]);
        }
      })
      .catch(() => setErrorMsg('Unable to load patient list. Please refresh.'))
      .finally(() => setPatientsLoading(false));
  }, []);

  // ── Filtered patient list ─────────────────────────────────────────
  const filteredPatients = patients.filter((p) => {
    const q = patientSearch.toLowerCase();
    return (
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      p.patientId.toLowerCase().includes(q) ||
      p.department.toLowerCase().includes(q)
    );
  });

  // ── Select patient ────────────────────────────────────────────────
  const handleSelectPatient = (p: NursePatient) => {
    setSelectedPatient(p);
    setPatientDropdown(false);
    setPatientSearch('');
    setNoteForm((f) => ({ ...f, patientId: p.id }));
    setTreatForm((f) => ({ ...f, patientId: p.id }));
  };

  // ── Load notes & treatments when patient selected ────────────────
  const loadNotes = useCallback(async (patientId: number) => {
    setNotesLoading(true);
    try {
      const data = await nurseService.getNursingNotes(patientId);
      setNotes(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load nursing notes.');
    } finally { setNotesLoading(false); }
  }, []);

  const loadTreatments = useCallback(async (patientId: number) => {
    setTreatmentsLoading(true);
    try {
      const data = await nurseService.getTreatmentRecords(patientId);
      setTreatments(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load treatment records.');
    } finally { setTreatmentsLoading(false); }
  }, []);

  useEffect(() => {
    if (!selectedPatient) { setNotes([]); setTreatments([]); return; }
    loadNotes(selectedPatient.id);
    loadTreatments(selectedPatient.id);
  }, [selectedPatient, loadNotes, loadTreatments]);

  // ─────────────────────────────────────────────────────────────────
  // NURSING NOTE: Validate
  // ─────────────────────────────────────────────────────────────────
  const validateNote = (): boolean => {
    const e: Partial<Record<keyof NursingNoteFormData, string>> = {};
    const today = getTodayDateString();
    const currentTime = getCurrentTimeString();

    if (!noteForm.patientId)          e.patientId          = 'Patient is required.';
    if (!noteForm.date) {
      e.date = 'Date is required.';
    } else if (noteForm.date > today) {
      e.date = 'Note date cannot be in the future.';
    }

    if (!noteForm.time) {
      e.time = 'Time is required.';
    } else if (noteForm.date === today && noteForm.time > currentTime) {
      e.time = 'Note time cannot run beyond current time.';
    }

    if (!noteForm.noteType) e.noteType = 'Note type is required.';

    // Nursing observation (required, min 50 chars, no numbers)
    const obs = (noteForm.nursingObservation || '').trim();
    if (!obs) {
      e.nursingObservation = 'Nursing observation is required (minimum 50 characters).';
    } else if (/\d/.test(obs)) {
      e.nursingObservation = 'Numbers are not allowed in nursing observation.';
    } else if (obs.length < 50) {
      e.nursingObservation = `Must contain at least 50 characters (currently ${obs.length}/50).`;
    }

    // Treatment / care provided (required, min 50 chars, no numbers)
    const tcp = (noteForm.treatmentCareProvided || '').trim();
    if (!tcp) {
      e.treatmentCareProvided = 'Treatment / care provided is required (minimum 50 characters).';
    } else if (/\d/.test(tcp)) {
      e.treatmentCareProvided = 'Numbers are not allowed in treatment / care provided.';
    } else if (tcp.length < 50) {
      e.treatmentCareProvided = `Must contain at least 50 characters (currently ${tcp.length}/50).`;
    }

    // Patient response (optional, but if filled: min 50 chars, no numbers)
    const pr = (noteForm.patientResponse || '').trim();
    if (pr) {
      if (/\d/.test(pr)) {
        e.patientResponse = 'Numbers are not allowed in patient response.';
      } else if (pr.length < 50) {
        e.patientResponse = `Must contain at least 50 characters (currently ${pr.length}/50).`;
      }
    }

    // Additional notes (optional, but if filled: min 50 chars, no numbers)
    const an = (noteForm.additionalNotes || '').trim();
    if (an) {
      if (/\d/.test(an)) {
        e.additionalNotes = 'Numbers are not allowed in additional notes.';
      } else if (an.length < 50) {
        e.additionalNotes = `Must contain at least 50 characters (currently ${an.length}/50).`;
      }
    }

    setNoteErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─────────────────────────────────────────────────────────────────
  // NURSING NOTE: Submit
  // ─────────────────────────────────────────────────────────────────
  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!validateNote()) return;
    setNoteSubmitting(true);
    try {
      if (editingNoteId) {
        const updated = await nurseService.updateNursingNote(editingNoteId, noteForm);
        setNotes((prev) => prev.map((n) => n.id === editingNoteId ? updated : n));
        setSuccessMsg('Nursing note updated successfully.');
      } else {
        const created = await nurseService.addNursingNote(noteForm);
        setNotes((prev) => [created, ...prev]);
        setSuccessMsg('Nursing note recorded successfully.');
      }
      setNoteForm({ ...getEmptyNoteForm(), patientId: noteForm.patientId });
      setNoteErrors({});
      setEditingNoteId(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save note.');
    } finally { setNoteSubmitting(false); }
  };

  const handleNoteEdit = (note: NursingNote) => {
    setNoteForm({
      patientId: note.patientId,
      date: note.date,
      time: note.time,
      nurseName: note.nurseName,
      noteType: note.noteType,
      nursingObservation: note.nursingObservation,
      patientResponse: note.patientResponse,
      treatmentCareProvided: note.treatmentCareProvided,
      additionalNotes: note.additionalNotes ?? '',
    });
    setEditingNoteId(note.id);
    setNoteErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNoteDelete = async (id: string) => {
    try {
      await nurseService.deleteNursingNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      setDeleteNoteId(null);
      setSuccessMsg('Nursing note deleted.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // TREATMENT RECORD: Validate
  // ─────────────────────────────────────────────────────────────────
  const validateTreat = (): boolean => {
    const e: Partial<Record<keyof TreatmentRecordFormData, string>> = {};
    const today = getTodayDateString();
    const currentTime = getCurrentTimeString();

    if (!treatForm.patientId)              e.patientId      = 'Patient is required.';
    if (!treatForm.date) {
      e.date = 'Date is required.';
    } else if (treatForm.date > today) {
      e.date = 'Treatment date cannot be in the future.';
    }

    if (!treatForm.time) {
      e.time = 'Time is required.';
    } else if (treatForm.date === today && treatForm.time > currentTime) {
      e.time = 'Treatment time cannot run beyond current time.';
    }

    if (!treatForm.treatmentName.trim())   e.treatmentName  = 'Treatment name is required.';
    if (!treatForm.performedBy.trim())     e.performedBy    = 'Performed by is required.';

    // Description (required, min 50 chars, no numbers)
    const desc = (treatForm.description || '').trim();
    if (!desc) {
      e.description = 'Description is required (minimum 50 characters).';
    } else if (/\d/.test(desc)) {
      e.description = 'Numbers are not allowed in description.';
    } else if (desc.length < 50) {
      e.description = `Must contain at least 50 characters (currently ${desc.length}/50).`;
    }

    // Patient response (required, min 50 chars, no numbers)
    const pr = (treatForm.patientResponse || '').trim();
    if (!pr) {
      e.patientResponse = 'Patient response is required (minimum 50 characters).';
    } else if (/\d/.test(pr)) {
      e.patientResponse = 'Numbers are not allowed in patient response.';
    } else if (pr.length < 50) {
      e.patientResponse = `Must contain at least 50 characters (currently ${pr.length}/50).`;
    }

    // Additional notes (optional, but if filled: min 50 chars, no numbers)
    const an = (treatForm.additionalNotes || '').trim();
    if (an) {
      if (/\d/.test(an)) {
        e.additionalNotes = 'Numbers are not allowed in additional notes.';
      } else if (an.length < 50) {
        e.additionalNotes = `Must contain at least 50 characters (currently ${an.length}/50).`;
      }
    }

    setTreatErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─────────────────────────────────────────────────────────────────
  // TREATMENT RECORD: Submit
  // ─────────────────────────────────────────────────────────────────
  const handleTreatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!validateTreat()) return;
    setTreatSubmitting(true);
    try {
      if (editingTreatId) {
        const updated = await nurseService.updateTreatmentRecord(editingTreatId, treatForm);
        setTreatments((prev) => prev.map((t) => t.id === editingTreatId ? updated : t));
        setSuccessMsg('Treatment record updated successfully.');
      } else {
        const created = await nurseService.addTreatmentRecord(treatForm);
        setTreatments((prev) => [created, ...prev]);
        setSuccessMsg('Treatment record added successfully.');
      }
      setTreatForm({ ...getEmptyTreatmentForm(), patientId: treatForm.patientId });
      setTreatErrors({});
      setEditingTreatId(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save treatment record.');
    } finally { setTreatSubmitting(false); }
  };

  const handleTreatEdit = (rec: TreatmentRecord) => {
    setTreatForm({
      patientId: rec.patientId,
      date: rec.date,
      time: rec.time,
      treatmentName: rec.treatmentName,
      description: rec.description,
      performedBy: rec.performedBy,
      patientResponse: rec.patientResponse,
      additionalNotes: rec.additionalNotes ?? '',
    });
    setEditingTreatId(rec.id);
    setTreatErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTreatDelete = async (id: string) => {
    try {
      await nurseService.deleteTreatmentRecord(id);
      setTreatments((prev) => prev.filter((t) => t.id !== id));
      setDeleteTreatId(null);
      setSuccessMsg('Treatment record deleted.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Page Header ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 border border-sky-400/30 bg-gradient-to-r from-navy-900/90 via-navy-800/80 to-navy-900/90">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-400 flex items-center justify-center shadow-lg flex-shrink-0">
              <ClipboardEdit className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">Nursing Notes &amp; Treatment Records</h2>
              <p className="text-xs text-gray-400 mt-0.5">Record nursing observations, notes, and performed treatments</p>
            </div>
          </div>
          {/* Tab switcher */}
          <div className="flex gap-2">
            {(['notes', 'treatments'] as const).map((t) => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === t ? 'bg-sky-600 text-white shadow-lg' : 'bg-white/10 text-gray-300 hover:bg-white/15'}`}>
                {t === 'notes' ? <><FileText className="w-3.5 h-3.5 inline mr-1" />Nursing Notes</> : <><Stethoscope className="w-3.5 h-3.5 inline mr-1" />Treatment Records</>}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Global Feedback ── */}
      <AnimatePresence>
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            {successMsg}
            <button onClick={() => setSuccessMsg('')} className="ml-auto"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
        {errorMsg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            {errorMsg}
            <button onClick={() => setErrorMsg('')} className="ml-auto"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Patient Selector ── */}
      <div className="glass-card p-5 border border-white/10 space-y-3 relative z-30">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Search className="w-4 h-4 text-sky-400" /> Select Patient
        </h3>
        <div className="relative">
          <button
            type="button"
            onClick={() => setPatientDropdown((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm bg-white/5 border border-white/15 rounded-xl hover:border-sky-400/50 transition-all text-left cursor-pointer"
          >
            {selectedPatient
              ? <span className="text-white font-semibold">{selectedPatient.firstName} {selectedPatient.lastName} — <span className="text-sky-400 text-xs font-mono">{selectedPatient.patientId}</span></span>
              : <span className="text-gray-400 font-medium">Choose an assigned patient…</span>}
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${patientDropdown ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {patientDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setPatientDropdown(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-full mt-1.5 left-0 right-0 z-50 bg-[#0F172A] border border-white/20 rounded-xl shadow-2xl overflow-hidden"
                >
                  <div className="p-2.5 border-b border-white/10 bg-white/5">
                    <input
                      type="text"
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      placeholder="Search patient by name, ID, or ward…"
                      autoFocus
                      className="w-full py-2 px-3 text-sm text-white bg-black/40 border border-white/15 rounded-lg focus:outline-none focus:border-sky-400/60 placeholder:text-gray-500"
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {patientsLoading ? (
                      <div className="p-4 text-center text-gray-400 text-sm flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading patients…
                      </div>
                    ) : filteredPatients.length === 0 ? (
                      <div className="p-4 text-center text-gray-400 text-sm">No patients found.</div>
                    ) : filteredPatients.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPatient(p)}
                        className={`w-full text-left px-4 py-3 hover:bg-sky-500/10 transition-colors border-b border-white/5 last:border-0 flex items-center gap-3 cursor-pointer ${
                          selectedPatient?.id === p.id ? 'bg-sky-500/15 border-l-2 border-sky-400' : ''
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-600 to-cyan-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {p.firstName[0]}{p.lastName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-semibold truncate">{p.firstName} {p.lastName}</p>
                          <p className="text-xs text-gray-400">{p.patientId} · {p.department} · {p.ward}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                          p.status === 'Critical' ? 'bg-rose-500/20 text-rose-300' :
                          p.status === 'Admitted' ? 'bg-amber-500/20 text-amber-300' :
                          'bg-emerald-500/20 text-emerald-300'
                        }`}>{p.status}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {selectedPatient && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 p-3 rounded-xl bg-sky-500/5 border border-sky-500/20">
            {[
              ['Ward', selectedPatient.ward],
              ['Doctor', selectedPatient.assignedDoctor],
              ['Condition', selectedPatient.primaryCondition ?? '—'],
              ['Admitted', selectedPatient.admissionDate ?? '—'],
            ].map(([l, v]) => (
              <div key={l} className="bg-white/5 rounded-lg p-2">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">{l}</p>
                <p className="text-xs text-white font-semibold mt-0.5 truncate">{v}</p>
              </div>
            ))}
          </motion.div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          TAB: NURSING NOTES
      ══════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {activeTab === 'notes' && (
          <motion.div key="notes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">

            {/* ── Form ── */}
            <form onSubmit={handleNoteSubmit} noValidate className="glass-card p-5 border border-white/10 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-sky-400" />
                  {editingNoteId ? 'Edit Nursing Note' : 'Add Nursing Note'}
                </h3>
                {editingNoteId && (
                  <button type="button" onClick={() => { setEditingNoteId(null); setNoteForm({ ...EMPTY_NOTE_FORM, patientId: noteForm.patientId }); setNoteErrors({}); }}
                    className="text-xs text-gray-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <X className="w-3 h-3" /> Cancel Edit
                  </button>
                )}
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Note Date" required error={noteErrors.date}>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={noteForm.date}
                      max={getTodayDateString()}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        setNoteForm((f) => ({ ...f, date: newDate }));
                        const today = getTodayDateString();
                        const currTime = getCurrentTimeString();
                        setNoteErrors((prev) => {
                          const next = { ...prev };
                          if (!newDate) {
                            next.date = 'Date is required.';
                          } else if (newDate > today) {
                            next.date = 'Note date cannot be in the future.';
                          } else {
                            delete next.date;
                          }

                          if (newDate === today && noteForm.time && noteForm.time > currTime) {
                            next.time = 'Note time cannot run beyond current time.';
                          } else if (next.time === 'Note time cannot run beyond current time.') {
                            delete next.time;
                          }
                          return next;
                        });
                      }}
                      className={`w-full py-2.5 pl-9 pr-3 text-sm text-white bg-white/5 border rounded-xl focus:outline-none focus:ring-1 [color-scheme:dark] ${noteErrors.date ? 'border-rose-500/60' : 'border-white/15 focus:border-sky-400/60 focus:ring-sky-400/30'}`}
                    />
                  </div>
                </Field>
                <Field label="Note Time" required error={noteErrors.time}>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="time"
                      value={noteForm.time}
                      max={noteForm.date === getTodayDateString() ? getCurrentTimeString() : undefined}
                      onChange={(e) => {
                        const newTime = e.target.value;
                        setNoteForm((f) => ({ ...f, time: newTime }));
                        const today = getTodayDateString();
                        const currTime = getCurrentTimeString();
                        setNoteErrors((prev) => {
                          const next = { ...prev };
                          if (!newTime) {
                            next.time = 'Time is required.';
                          } else if (noteForm.date === today && newTime > currTime) {
                            next.time = 'Note time cannot run beyond current time.';
                          } else {
                            delete next.time;
                          }
                          return next;
                        });
                      }}
                      className={`w-full py-2.5 pl-9 pr-3 text-sm text-white bg-white/5 border rounded-xl focus:outline-none focus:ring-1 [color-scheme:dark] ${noteErrors.time ? 'border-rose-500/60' : 'border-white/15 focus:border-sky-400/60 focus:ring-sky-400/30'}`}
                    />
                  </div>
                </Field>
              </div>

              {/* Note Type & Nurse Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Note Type" required error={noteErrors.noteType}>
                  <select value={noteForm.noteType}
                    onChange={(e) => setNoteForm((f) => ({ ...f, noteType: e.target.value as NoteType }))}
                    className={inputCls(noteErrors.noteType) + ' cursor-pointer bg-navy-900'}>
                    <option value="" className="bg-navy-900">— Select type —</option>
                    {NOTE_TYPES.map((t) => <option key={t} value={t} className="bg-navy-900">{t}</option>)}
                  </select>
                </Field>
                <Field label="Nurse Name" required error={noteErrors.nurseName}>
                  <input type="text" value={noteForm.nurseName}
                    onChange={(e) => setNoteForm((f) => ({ ...f, nurseName: e.target.value }))}
                    className={inputCls(noteErrors.nurseName)} />
                </Field>
              </div>

              {/* Text Areas */}
              <Field
                label="Nursing Observation"
                required
                error={noteErrors.nursingObservation}
                headerRight={
                  <span className={`text-[11px] font-mono ${(noteForm.nursingObservation || '').trim().length >= 50 && !/\d/.test(noteForm.nursingObservation || '') ? 'text-emerald-400' : (noteForm.nursingObservation || '').trim().length > 0 ? 'text-amber-400' : 'text-gray-400'}`}>
                    {(noteForm.nursingObservation || '').trim().length}/50 min chars
                  </span>
                }
              >
                <textarea
                  rows={3}
                  value={noteForm.nursingObservation}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNoteForm((f) => ({ ...f, nursingObservation: val }));
                    setNoteErrors((prev) => {
                      const next = { ...prev };
                      const trimmed = val.trim();
                      if (!trimmed) {
                        next.nursingObservation = 'Nursing observation is required (minimum 50 characters).';
                      } else if (/\d/.test(val)) {
                        next.nursingObservation = 'Numbers are not allowed in nursing observation.';
                      } else if (trimmed.length < 50) {
                        next.nursingObservation = `Must contain at least 50 characters (currently ${trimmed.length}/50).`;
                      } else {
                        delete next.nursingObservation;
                      }
                      return next;
                    });
                  }}
                  placeholder="Describe the patient's current condition, clinical signs observed (min 50 characters, letters only)…"
                  className={textareaCls(noteErrors.nursingObservation)}
                />
              </Field>

              <Field
                label="Patient Response"
                error={noteErrors.patientResponse}
                headerRight={
                  (noteForm.patientResponse || '').trim().length > 0 ? (
                    <span className={`text-[11px] font-mono ${(noteForm.patientResponse || '').trim().length >= 50 && !/\d/.test(noteForm.patientResponse || '') ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {(noteForm.patientResponse || '').trim().length}/50 min chars
                    </span>
                  ) : null
                }
              >
                <textarea
                  rows={2}
                  value={noteForm.patientResponse}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNoteForm((f) => ({ ...f, patientResponse: val }));
                    setNoteErrors((prev) => {
                      const next = { ...prev };
                      const trimmed = val.trim();
                      if (trimmed) {
                        if (/\d/.test(val)) {
                          next.patientResponse = 'Numbers are not allowed in patient response.';
                        } else if (trimmed.length < 50) {
                          next.patientResponse = `Must contain at least 50 characters (currently ${trimmed.length}/50).`;
                        } else {
                          delete next.patientResponse;
                        }
                      } else {
                        delete next.patientResponse;
                      }
                      return next;
                    });
                  }}
                  placeholder="How did the patient respond to treatment or intervention? (min 50 characters if provided, letters only)"
                  className={textareaCls(noteErrors.patientResponse)}
                />
              </Field>

              <Field
                label="Treatment / Care Provided"
                required
                error={noteErrors.treatmentCareProvided}
                headerRight={
                  <span className={`text-[11px] font-mono ${(noteForm.treatmentCareProvided || '').trim().length >= 50 && !/\d/.test(noteForm.treatmentCareProvided || '') ? 'text-emerald-400' : (noteForm.treatmentCareProvided || '').trim().length > 0 ? 'text-amber-400' : 'text-gray-400'}`}>
                    {(noteForm.treatmentCareProvided || '').trim().length}/50 min chars
                  </span>
                }
              >
                <textarea
                  rows={3}
                  value={noteForm.treatmentCareProvided}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNoteForm((f) => ({ ...f, treatmentCareProvided: val }));
                    setNoteErrors((prev) => {
                      const next = { ...prev };
                      const trimmed = val.trim();
                      if (!trimmed) {
                        next.treatmentCareProvided = 'Treatment / care provided is required (minimum 50 characters).';
                      } else if (/\d/.test(val)) {
                        next.treatmentCareProvided = 'Numbers are not allowed in treatment / care provided.';
                      } else if (trimmed.length < 50) {
                        next.treatmentCareProvided = `Must contain at least 50 characters (currently ${trimmed.length}/50).`;
                      } else {
                        delete next.treatmentCareProvided;
                      }
                      return next;
                    });
                  }}
                  placeholder="Describe nursing interventions, medications given, procedures performed (min 50 characters, letters only)…"
                  className={textareaCls(noteErrors.treatmentCareProvided)}
                />
              </Field>

              <Field
                label="Additional Notes (optional)"
                error={noteErrors.additionalNotes}
                headerRight={
                  (noteForm.additionalNotes || '').trim().length > 0 ? (
                    <span className={`text-[11px] font-mono ${(noteForm.additionalNotes || '').trim().length >= 50 && !/\d/.test(noteForm.additionalNotes || '') ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {(noteForm.additionalNotes || '').trim().length}/50 min chars
                    </span>
                  ) : null
                }
              >
                <textarea
                  rows={2}
                  value={noteForm.additionalNotes}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNoteForm((f) => ({ ...f, additionalNotes: val }));
                    setNoteErrors((prev) => {
                      const next = { ...prev };
                      const trimmed = val.trim();
                      if (trimmed) {
                        if (/\d/.test(val)) {
                          next.additionalNotes = 'Numbers are not allowed in additional notes.';
                        } else if (trimmed.length < 50) {
                          next.additionalNotes = `Must contain at least 50 characters (currently ${trimmed.length}/50).`;
                        } else {
                          delete next.additionalNotes;
                        }
                      } else {
                        delete next.additionalNotes;
                      }
                      return next;
                    });
                  }}
                  placeholder="Any other relevant notes, follow-up actions, or alerts (min 50 characters if provided, letters only)…"
                  className={textareaCls(noteErrors.additionalNotes)}
                />
              </Field>

              <div className="flex gap-3">
                <Button type="submit" variant="primary" size="md" disabled={noteSubmitting}
                  icon={noteSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  className="flex-1 justify-center">
                  {noteSubmitting ? 'Saving…' : editingNoteId ? 'Update Note' : 'Save Nursing Note'}
                </Button>
                <Button type="button" variant="glass" size="md"
                  onClick={() => { setNoteForm({ ...EMPTY_NOTE_FORM, patientId: noteForm.patientId }); setNoteErrors({}); setEditingNoteId(null); }}>
                  <RefreshCw className="w-4 h-4" /> Reset
                </Button>
              </div>
            </form>

            {/* ── History ── */}
            <div className="glass-card border border-white/10 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10 bg-white/[0.02]">
                <Filter className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  {selectedPatient ? `Notes for ${selectedPatient.firstName} ${selectedPatient.lastName}` : 'Select a patient to view notes'}
                </span>
                {notes.length > 0 && <span className="ml-auto text-xs text-gray-400">{notes.length} record{notes.length !== 1 ? 's' : ''}</span>}
              </div>

              {!selectedPatient ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
                  <FileText className="w-10 h-10 text-gray-600" />
                  <p className="text-sm">Select a patient above to view their nursing notes.</p>
                </div>
              ) : notesLoading ? (
                <div className="flex items-center justify-center py-14 gap-3 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
                  <span className="text-sm">Loading nursing notes…</span>
                </div>
              ) : notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
                  <FileText className="w-10 h-10 text-gray-600" />
                  <p className="text-sm">No nursing notes available for this patient.</p>
                  <p className="text-xs text-gray-600">Use the form above to add the first note.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {notes.map((note) => (
                    <motion.div key={note.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="p-4 hover:bg-white/[0.03] transition-colors">
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <NoteTypeBadge type={note.noteType} />
                          <span className="text-xs text-gray-400">{fmtDateTime(note.date, note.time)}</span>
                          <span className="text-xs text-gray-500">· {note.nurseName}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setViewNote(note)} title="View"
                            className="p-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/25 text-sky-400 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleNoteEdit(note)} title="Edit"
                            className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/25 text-blue-300 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setDeleteNoteId(note.id)} title="Delete"
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-200 line-clamp-2">{note.nursingObservation}</p>
                      {note.treatmentCareProvided && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                          <Activity className="w-3 h-3 inline mr-1" />{note.treatmentCareProvided}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB: TREATMENT RECORDS
        ══════════════════════════════════════════════════════ */}
        {activeTab === 'treatments' && (
          <motion.div key="treatments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">

            {/* ── Form ── */}
            <form onSubmit={handleTreatSubmit} noValidate className="glass-card p-5 border border-white/10 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-amber-400" />
                  {editingTreatId ? 'Edit Treatment Record' : 'Add Treatment Record'}
                </h3>
                {editingTreatId && (
                  <button type="button" onClick={() => { setEditingTreatId(null); setTreatForm({ ...EMPTY_TREATMENT_FORM, patientId: treatForm.patientId }); setTreatErrors({}); }}
                    className="text-xs text-gray-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <X className="w-3 h-3" /> Cancel Edit
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Treatment Date" required error={treatErrors.date}>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={treatForm.date}
                      max={getTodayDateString()}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        setTreatForm((f) => ({ ...f, date: newDate }));
                        const today = getTodayDateString();
                        const currTime = getCurrentTimeString();
                        setTreatErrors((prev) => {
                          const next = { ...prev };
                          if (!newDate) {
                            next.date = 'Date is required.';
                          } else if (newDate > today) {
                            next.date = 'Treatment date cannot be in the future.';
                          } else {
                            delete next.date;
                          }

                          if (newDate === today && treatForm.time && treatForm.time > currTime) {
                            next.time = 'Treatment time cannot run beyond current time.';
                          } else if (next.time === 'Treatment time cannot run beyond current time.') {
                            delete next.time;
                          }
                          return next;
                        });
                      }}
                      className={`w-full py-2.5 pl-9 pr-3 text-sm text-white bg-white/5 border rounded-xl focus:outline-none focus:ring-1 [color-scheme:dark] ${treatErrors.date ? 'border-rose-500/60' : 'border-white/15 focus:border-sky-400/60 focus:ring-sky-400/30'}`}
                    />
                  </div>
                </Field>
                <Field label="Treatment Time" required error={treatErrors.time}>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="time"
                      value={treatForm.time}
                      max={treatForm.date === getTodayDateString() ? getCurrentTimeString() : undefined}
                      onChange={(e) => {
                        const newTime = e.target.value;
                        setTreatForm((f) => ({ ...f, time: newTime }));
                        const today = getTodayDateString();
                        const currTime = getCurrentTimeString();
                        setTreatErrors((prev) => {
                          const next = { ...prev };
                          if (!newTime) {
                            next.time = 'Time is required.';
                          } else if (treatForm.date === today && newTime > currTime) {
                            next.time = 'Treatment time cannot run beyond current time.';
                          } else {
                            delete next.time;
                          }
                          return next;
                        });
                      }}
                      className={`w-full py-2.5 pl-9 pr-3 text-sm text-white bg-white/5 border rounded-xl focus:outline-none focus:ring-1 [color-scheme:dark] ${treatErrors.time ? 'border-rose-500/60' : 'border-white/15 focus:border-sky-400/60 focus:ring-sky-400/30'}`}
                    />
                  </div>
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Treatment Name" required error={treatErrors.treatmentName}>
                  <input type="text" value={treatForm.treatmentName} placeholder="e.g. IV Cannulation, Wound Dressing"
                    onChange={(e) => setTreatForm((f) => ({ ...f, treatmentName: e.target.value }))}
                    className={inputCls(treatErrors.treatmentName)} />
                </Field>
                <Field label="Performed By" required error={treatErrors.performedBy}>
                  <input type="text" value={treatForm.performedBy}
                    onChange={(e) => setTreatForm((f) => ({ ...f, performedBy: e.target.value }))}
                    className={inputCls(treatErrors.performedBy)} />
                </Field>
              </div>

              <Field
                label="Description"
                required
                error={treatErrors.description}
                headerRight={
                  <span className={`text-[11px] font-mono ${(treatForm.description || '').trim().length >= 50 && !/\d/.test(treatForm.description || '') ? 'text-emerald-400' : (treatForm.description || '').trim().length > 0 ? 'text-amber-400' : 'text-gray-400'}`}>
                    {(treatForm.description || '').trim().length}/50 min chars
                  </span>
                }
              >
                <textarea
                  rows={3}
                  value={treatForm.description}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTreatForm((f) => ({ ...f, description: val }));
                    setTreatErrors((prev) => {
                      const next = { ...prev };
                      const trimmed = val.trim();
                      if (!trimmed) {
                        next.description = 'Description is required (minimum 50 characters).';
                      } else if (/\d/.test(val)) {
                        next.description = 'Numbers are not allowed in description.';
                      } else if (trimmed.length < 50) {
                        next.description = `Must contain at least 50 characters (currently ${trimmed.length}/50).`;
                      } else {
                        delete next.description;
                      }
                      return next;
                    });
                  }}
                  placeholder="Describe the procedure or treatment in detail (min 50 characters, letters only)…"
                  className={textareaCls(treatErrors.description)}
                />
              </Field>

              <Field
                label="Patient Response"
                required
                error={treatErrors.patientResponse}
                headerRight={
                  <span className={`text-[11px] font-mono ${(treatForm.patientResponse || '').trim().length >= 50 && !/\d/.test(treatForm.patientResponse || '') ? 'text-emerald-400' : (treatForm.patientResponse || '').trim().length > 0 ? 'text-amber-400' : 'text-gray-400'}`}>
                    {(treatForm.patientResponse || '').trim().length}/50 min chars
                  </span>
                }
              >
                <textarea
                  rows={2}
                  value={treatForm.patientResponse}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTreatForm((f) => ({ ...f, patientResponse: val }));
                    setTreatErrors((prev) => {
                      const next = { ...prev };
                      const trimmed = val.trim();
                      if (!trimmed) {
                        next.patientResponse = 'Patient response is required (minimum 50 characters).';
                      } else if (/\d/.test(val)) {
                        next.patientResponse = 'Numbers are not allowed in patient response.';
                      } else if (trimmed.length < 50) {
                        next.patientResponse = `Must contain at least 50 characters (currently ${trimmed.length}/50).`;
                      } else {
                        delete next.patientResponse;
                      }
                      return next;
                    });
                  }}
                  placeholder="How did the patient respond during and after the procedure? (min 50 characters, letters only)…"
                  className={textareaCls(treatErrors.patientResponse)}
                />
              </Field>

              <Field
                label="Additional Notes (optional)"
                error={treatErrors.additionalNotes}
                headerRight={
                  (treatForm.additionalNotes || '').trim().length > 0 ? (
                    <span className={`text-[11px] font-mono ${(treatForm.additionalNotes || '').trim().length >= 50 && !/\d/.test(treatForm.additionalNotes || '') ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {(treatForm.additionalNotes || '').trim().length}/50 min chars
                    </span>
                  ) : null
                }
              >
                <textarea
                  rows={2}
                  value={treatForm.additionalNotes}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTreatForm((f) => ({ ...f, additionalNotes: val }));
                    setTreatErrors((prev) => {
                      const next = { ...prev };
                      const trimmed = val.trim();
                      if (trimmed) {
                        if (/\d/.test(val)) {
                          next.additionalNotes = 'Numbers are not allowed in additional notes.';
                        } else if (trimmed.length < 50) {
                          next.additionalNotes = `Must contain at least 50 characters (currently ${trimmed.length}/50).`;
                        } else {
                          delete next.additionalNotes;
                        }
                      } else {
                        delete next.additionalNotes;
                      }
                      return next;
                    });
                  }}
                  placeholder="Follow-up actions, complications observed, alerts (min 50 characters if provided, letters only)…"
                  className={textareaCls(treatErrors.additionalNotes)}
                />
              </Field>

              <div className="flex gap-3">
                <Button type="submit" variant="primary" size="md" disabled={treatSubmitting}
                  icon={treatSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  className="flex-1 justify-center">
                  {treatSubmitting ? 'Saving…' : editingTreatId ? 'Update Record' : 'Save Treatment Record'}
                </Button>
                <Button type="button" variant="glass" size="md"
                  onClick={() => { setTreatForm({ ...EMPTY_TREATMENT_FORM, patientId: treatForm.patientId }); setTreatErrors({}); setEditingTreatId(null); }}>
                  <RefreshCw className="w-4 h-4" /> Reset
                </Button>
              </div>
            </form>

            {/* ── Records list ── */}
            <div className="glass-card border border-white/10 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10 bg-white/[0.02]">
                <Filter className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  {selectedPatient ? `Records for ${selectedPatient.firstName} ${selectedPatient.lastName}` : 'Select a patient to view records'}
                </span>
                {treatments.length > 0 && <span className="ml-auto text-xs text-gray-400">{treatments.length} record{treatments.length !== 1 ? 's' : ''}</span>}
              </div>

              {!selectedPatient ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
                  <Stethoscope className="w-10 h-10 text-gray-600" />
                  <p className="text-sm">Select a patient above to view their treatment records.</p>
                </div>
              ) : treatmentsLoading ? (
                <div className="flex items-center justify-center py-14 gap-3 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                  <span className="text-sm">Loading treatment records…</span>
                </div>
              ) : treatments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
                  <Stethoscope className="w-10 h-10 text-gray-600" />
                  <p className="text-sm">No treatment records available for this patient.</p>
                  <p className="text-xs text-gray-600">Use the form above to log the first treatment.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {treatments.map((rec) => (
                    <motion.div key={rec.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="p-4 hover:bg-white/[0.03] transition-colors">
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="text-sm font-bold text-white">{rec.treatmentName}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{fmtDateTime(rec.date, rec.time)} · by {rec.performedBy}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setViewTreat(rec)} title="View"
                            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/25 text-amber-400 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleTreatEdit(rec)} title="Edit"
                            className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/25 text-blue-300 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setDeleteTreatId(rec.id)} title="Delete"
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-200 line-clamp-2">{rec.description}</p>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-1">Response: {rec.patientResponse}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modals ── */}
      <AnimatePresence>
        {viewNote && <ViewNoteModal note={viewNote} onClose={() => setViewNote(null)} />}
        {viewTreat && <ViewTreatmentModal record={viewTreat} onClose={() => setViewTreat(null)} />}

        {/* Delete Note Confirm */}
        {deleteNoteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="glass-card max-w-sm w-full p-6 border border-rose-500/30 bg-navy-900/95 rounded-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Delete Nursing Note?</h3>
              <p className="text-sm text-gray-300">This action cannot be undone.</p>
              <div className="flex gap-3">
                <Button variant="glass" size="sm" className="flex-1 justify-center" onClick={() => setDeleteNoteId(null)}>Cancel</Button>
                <button onClick={() => handleNoteDelete(deleteNoteId)}
                  className="flex-1 py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold transition-colors">
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Treatment Confirm */}
        {deleteTreatId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="glass-card max-w-sm w-full p-6 border border-rose-500/30 bg-navy-900/95 rounded-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Delete Treatment Record?</h3>
              <p className="text-sm text-gray-300">This action cannot be undone.</p>
              <div className="flex gap-3">
                <Button variant="glass" size="sm" className="flex-1 justify-center" onClick={() => setDeleteTreatId(null)}>Cancel</Button>
                <button onClick={() => handleTreatDelete(deleteTreatId)}
                  className="flex-1 py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold transition-colors">
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NursingNotesPage;
