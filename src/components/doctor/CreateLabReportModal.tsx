/**
 * CreateLabReportModal.tsx
 * Professional Diagnostic Order & Laboratory Report Entry Modal for Attending Physicians.
 * Provides rapid test presets, quantitative results, reference bounds, and clinical status tagging.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FlaskConical,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import type { DoctorPatient, LabReport } from '../../types';
import { addLabReport } from '../../services/doctorService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patient: DoctorPatient;
  onLabReportCreated: (newLab: LabReport) => void;
}

interface CommonTestPreset {
  name: string;
  defaultUnit: string;
  defaultRef: string;
  category: string;
}

const COMMON_PRESETS: CommonTestPreset[] = [
  { name: 'Complete Blood Count (CBC) & Ferritin', defaultUnit: 'g/dL', defaultRef: 'Hb: 12.0–16.5 g/dL, WBC: 4.5–11.0', category: 'Hematology' },
  { name: 'Fasting Blood Sugar (FBS)', defaultUnit: 'mg/dL', defaultRef: '70–99 mg/dL', category: 'Biochemistry' },
  { name: 'HbA1c Glycemic Panel', defaultUnit: '%', defaultRef: '< 5.7% (Normal), 5.7–6.4% (Pre-diabetes)', category: 'Endocrine' },
  { name: 'Renal Function (Serum Creatinine & eGFR)', defaultUnit: 'mg/dL', defaultRef: 'Creatinine: 0.7–1.2 mg/dL, eGFR > 90', category: 'Renal' },
  { name: 'Comprehensive Lipid Profile', defaultUnit: 'mg/dL', defaultRef: 'Total Chol < 200, LDL < 100, HDL > 40', category: 'Cardiology' },
  { name: 'Liver Function Panel (LFT & Enzymes)', defaultUnit: 'U/L', defaultRef: 'ALT: 7–56, AST: 10–40, Bili: 0.2–1.2', category: 'Hepatic' },
  { name: 'Serum Electrolytes (Na+, K+, Cl-)', defaultUnit: 'mEq/L', defaultRef: 'Na: 136–145, K: 3.5–5.0, Cl: 98–106', category: 'Biochemistry' },
  { name: 'Arterial Blood Gas (ABG)', defaultUnit: 'mmHg', defaultRef: 'pH: 7.35–7.45, pCO2: 35–45, pO2: 80–100', category: 'Pulmonary' },
  { name: '12-Lead Electrocardiogram (ECG)', defaultUnit: '-', defaultRef: 'Normal Sinus Rhythm, PR: 0.12–0.20s', category: 'Cardiology' },
  { name: 'Chest X-Ray PA View (Radiology)', defaultUnit: '-', defaultRef: 'Clear lung fields, normal cardiothoracic ratio', category: 'Radiology' },
];

export const CreateLabReportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  patient,
  onLabReportCreated,
}) => {
  const today = new Date().toISOString().split('T')[0];

  const [testName, setTestName] = useState('');
  const [testDate, setTestDate] = useState(today);
  const [result, setResult] = useState('');
  const [unit, setUnit] = useState('-');
  const [referenceRange, setReferenceRange] = useState('Standard Reference Range');
  const [status, setStatus] = useState<'Normal' | 'Abnormal' | 'Critical' | 'Pending'>('Normal');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSelectPreset = (preset: CommonTestPreset) => {
    setTestName(preset.name);
    setUnit(preset.defaultUnit);
    setReferenceRange(preset.defaultRef);
    if (!result.trim()) {
      setResult('Within normal limits');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!testName.trim()) {
      setErrorMsg('Please specify the investigation or laboratory test name.');
      return;
    }
    if (!result.trim()) {
      setErrorMsg('Please enter the test result or observation.');
      return;
    }

    setSubmitting(true);
    try {
      const newLab = await addLabReport(patient.id, {
        testName: testName.trim(),
        date: testDate,
        result: result.trim(),
        unit: unit.trim() || '-',
        referenceRange: referenceRange.trim() || 'Standard Reference Range',
        status,
        notes: notes.trim() || undefined,
      });

      onLabReportCreated(newLab);
      onClose();
    } catch (err: any) {
      console.error('Failed to create lab report:', err);
      setErrorMsg(err.message || 'Failed to submit lab report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl flex flex-col bg-[#0B132B] border border-white/20 rounded-2xl shadow-2xl overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-teal-950/40 via-navy-900 to-navy-950">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Enter Diagnostic Laboratory Report</span>
                </h3>
                <p className="text-xs text-gray-400">
                  Document findings for patient <strong className="text-teal-300">{patient.firstName} {patient.lastName}</strong>
                  {patient.ward && <span className="ml-1 text-gray-400">({patient.ward})</span>}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Error Banner */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                <span>Quick Test Presets</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                      testName === preset.name
                        ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                        : 'bg-white/[0.04] text-gray-300 border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {preset.name.split('(')[0].trim()}
                  </button>
                ))}
              </div>
            </div>

            {/* Test Name & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-gray-300">
                  Test / Investigation Name *
                </label>
                <input
                  type="text"
                  required
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="e.g. Complete Blood Count (CBC) or Fasting Blood Sugar"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">
                  Test Date *
                </label>
                <input
                  type="date"
                  required
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white focus:outline-none focus:border-teal-400"
                />
              </div>
            </div>

            {/* Result, Unit & Reference Range */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">
                  Result / Finding *
                </label>
                <input
                  type="text"
                  required
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  placeholder="e.g. 12.8 or Normal"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">
                  Unit of Measurement
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="e.g. g/dL, mg/dL, %"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">
                  Reference Range
                </label>
                <input
                  type="text"
                  value={referenceRange}
                  onChange={(e) => setReferenceRange(e.target.value)}
                  placeholder="e.g. 12.0–15.5 g/dL"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-400"
                />
              </div>
            </div>

            {/* Clinical Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">
                Clinical Interpretation / Diagnostic Status *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'Normal', label: 'Normal', color: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10' },
                  { id: 'Abnormal', label: 'Abnormal', color: 'border-amber-500/40 text-amber-300 bg-amber-500/10' },
                  { id: 'Critical', label: 'Critical', color: 'border-rose-500/40 text-rose-300 bg-rose-500/10' },
                  { id: 'Pending', label: 'Pending', color: 'border-blue-500/40 text-blue-300 bg-blue-500/10' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStatus(s.id as any)}
                    className={`p-2 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                      status === s.id
                        ? `${s.color} ring-1 ring-teal-400 shadow-md`
                        : 'bg-white/[0.03] text-gray-400 border-white/10 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Physician Notes */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300">
                Clinical Interpretation & Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Physician notes, clinical correlation, follow-up recommendations..."
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-400 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/10 text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/15 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-accent text-navy-950 font-bold text-xs hover:brightness-110 shadow-lg shadow-teal-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Save Lab Report</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
