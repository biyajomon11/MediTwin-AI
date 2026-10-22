import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  UploadCloud,
  X,
  FileText,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Building2,
  Paperclip,
  Trash2,
  Loader2,
  Sparkles,
  FlaskConical,
  Activity,
  Pill,
  ArrowRightCircle,
} from 'lucide-react';
import type { DoctorPatient, MedicalDocument } from '../../types';
import { uploadDoctorMedicalDocument } from '../../services/doctorService';

interface AddMedicalDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: DoctorPatient;
  onDocumentAdded: (doc: MedicalDocument) => void;
}

const CATEGORY_OPTIONS: Array<{
  id: MedicalDocument['category'];
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = [
  { id: 'Lab Report',         label: 'Lab Report',         icon: FlaskConical,       color: 'border-teal-500/40 text-teal-300 bg-teal-500/10' },
  { id: 'Radiology',          label: 'Radiology Imaging',  icon: Activity,          color: 'border-purple-500/40 text-purple-300 bg-purple-500/10' },
  { id: 'Prescription',       label: 'Prescription Order', icon: Pill,              color: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10' },
  { id: 'Discharge Summary',  label: 'Discharge Summary',  icon: FileCheck,         color: 'border-blue-500/40 text-blue-300 bg-blue-500/10' },
  { id: 'Referral',           label: 'Clinical Referral',  icon: ArrowRightCircle,  color: 'border-amber-500/40 text-amber-300 bg-amber-500/10' },
  { id: 'Other',              label: 'General / Other',    icon: FileText,          color: 'border-slate-500/40 text-slate-300 bg-slate-500/10' },
];

const PRESETS: Array<{
  name: string;
  category: MedicalDocument['category'];
  fileType: string;
  size: string;
  notes: string;
}> = [
  {
    name: '12-Lead Electrocardiogram (ECG) Report',
    category: 'Lab Report',
    fileType: 'PDF',
    size: '420 KB',
    notes: 'Normal sinus rhythm, heart rate 72 bpm. PR interval 160ms, QTc 410ms. No acute ST-T wave changes.',
  },
  {
    name: 'Chest X-Ray (PA & Lateral Views)',
    category: 'Radiology',
    fileType: 'PDF',
    size: '1.4 MB',
    notes: 'Bilateral lung fields clear. Cardiothoracic ratio within normal physiological limits. Costophrenic angles sharp.',
  },
  {
    name: 'Complete Blood Count (CBC) with Differential',
    category: 'Lab Report',
    fileType: 'PDF',
    size: '280 KB',
    notes: 'Hemoglobin 13.8 g/dL, WBC 7,200 /mcL, Platelets 240,000 /mcL. All indices stable.',
  },
  {
    name: 'Transthoracic Echocardiogram (2D Echo)',
    category: 'Radiology',
    fileType: 'PDF',
    size: '2.8 MB',
    notes: 'LVEF 58%, normal LV systolic & diastolic function. Mild aortic valve sclerosis without significant gradient.',
  },
  {
    name: 'Specialist Cardiology Consultation & Referral Note',
    category: 'Referral',
    fileType: 'PDF',
    size: '185 KB',
    notes: 'Patient evaluated for periodic exertion symptoms. Medically optimized on ACE-inhibitor and statin therapy.',
  },
];

export const AddMedicalDocumentModal: React.FC<AddMedicalDocumentModalProps> = ({
  isOpen,
  onClose,
  patient,
  onDocumentAdded,
}) => {
  const [docName, setDocName] = useState('');
  const [category, setCategory] = useState<MedicalDocument['category']>('Lab Report');
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [facility, setFacility] = useState('MediTwin Central Diagnostic Center');
  const [notes, setNotes] = useState('');
  const [fileType, setFileType] = useState('PDF');
  const [fileSizeStr, setFileSizeStr] = useState('320 KB');
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleApplyPreset = (p: typeof PRESETS[0]) => {
    setDocName(p.name);
    setCategory(p.category);
    setFileType(p.fileType);
    setFileSizeStr(p.size);
    setNotes(p.notes);
    setAttachedFileName(`${p.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
    setErrorMsg(null);
  };

  const processFile = (file: File) => {
    if (!file) return;

    const sizeInKb = Math.round(file.size / 1024);
    const sizeFormatted = sizeInKb >= 1024 ? `${(sizeInKb / 1024).toFixed(1)} MB` : `${sizeInKb} KB`;

    let ext = 'PDF';
    const parts = file.name.split('.');
    if (parts.length > 1) {
      ext = parts[parts.length - 1].toUpperCase();
    }

    setAttachedFileName(file.name);
    if (!docName.trim()) {
      // Auto-populate document title from clean file name
      const cleanName = parts.slice(0, -1).join('.').replace(/[_-]+/g, ' ');
      setDocName(cleanName || file.name);
    }
    setFileType(ext);
    setFileSizeStr(sizeFormatted);

    // Read base64 data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setFileDataUrl(result);
    };
    reader.readAsDataURL(file);
    setErrorMsg(null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleClearFile = () => {
    setAttachedFileName(null);
    setFileDataUrl(null);
    setFileSizeStr('250 KB');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) {
      setErrorMsg('Document name / title is required.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const saved = await uploadDoctorMedicalDocument(patient.id, {
        name: docName.trim(),
        category,
        type: fileType,
        size: fileSizeStr,
        fileDataUrl: fileDataUrl || undefined,
        notes: notes.trim() || undefined,
        uploadedDate: reportDate,
      });

      onDocumentAdded(saved);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to attach medical document.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        className="glass-card max-w-2xl w-full p-5 sm:p-6 border border-white/20 rounded-2xl shadow-2xl bg-[#0B132B]/95 space-y-5 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 shadow-inner">
              <UploadCloud className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Attach Medical Document
              </h2>
              <p className="text-xs text-gray-400">
                Patient: <span className="font-semibold text-white">{patient.firstName} {patient.lastName}</span> (ID #{patient.id}) • EHR Chart
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Quick Diagnostic Presets */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>Quick Clinical Templates (Click to Autocomplete)</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 hover:border-accent/40 text-gray-300 hover:text-white transition-all cursor-pointer truncate max-w-[200px] sm:max-w-none"
              >
                + {p.name.split('(')[0].trim()}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Document Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Document Title / Report Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="e.g. Contrast-Enhanced Chest CT Scan or 12-Lead ECG Report"
              className="w-full bg-slate-900/90 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-all"
              required
            />
          </div>

          {/* Category Picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Clinical Document Category <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORY_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = category === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCategory(opt.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold border transition-all text-left cursor-pointer ${
                      isSelected
                        ? `${opt.color} ring-1 ring-white/30 font-bold shadow-sm`
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Metadata Grid: Date & Facility */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>Date of Report / Test</span>
              </label>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="w-full bg-slate-900/90 border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Facility / Diagnostic Lab</span>
              </label>
              <input
                type="text"
                value={facility}
                onChange={(e) => setFacility(e.target.value)}
                placeholder="Hospital Laboratory / Radiology Center"
                className="w-full bg-slate-900/90 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-cyan-400 outline-none"
              />
            </div>
          </div>

          {/* File Upload Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-teal-400" />
                <span>File Attachment (PDF, Image, Scans)</span>
              </span>
              <span className="text-[10px] text-gray-400 font-normal">Max 25 MB • Encrypted Storage</span>
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.docx,.doc,.dicom"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {!attachedFileName ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-cyan-400 bg-cyan-500/10'
                    : 'border-white/20 hover:border-cyan-400/60 hover:bg-white/[0.03]'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-gray-400 mb-2">
                  <UploadCloud className="w-5 h-5 text-cyan-400" />
                </div>
                <p className="text-xs font-semibold text-white">
                  Drag and drop file here, or <span className="text-cyan-400 underline">Browse Local Storage</span>
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Supports PDF, PNG, JPG, DICOM, DOCX
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 flex-shrink-0 font-bold text-[10px]">
                    {fileType}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate max-w-xs sm:max-w-md">{attachedFileName}</p>
                    <p className="text-[10px] text-cyan-300/80">{fileSizeStr} • Verified EHR Attachment</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearFile}
                  className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors ml-2"
                  title="Remove File"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Clinical Notes / Interpretation */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Physician Clinical Notes & Diagnostic Interpretation (Optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter significant findings, test interpretations, clinical impressions, or instructions for the care team..."
              className="w-full bg-slate-900/90 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none resize-none transition-all"
            />
          </div>

          {/* Verification Stamp Banner */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-[11px] text-gray-300">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Attending Physician Verified</span>
            </span>
            <span className="text-gray-400">Syncs directly to hospital PostgreSQL</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold text-xs transition-all shadow-lg shadow-cyan-900/40 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Attaching Document…</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Attach & Save Document</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
