import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  UploadCloud,
  Search,
  Trash2,
  Eye,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  File,
  FileCheck,
  Building,
  Calendar,
  Loader2,
  RefreshCw,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../../components/Button';
import * as patientService from '../../services/patientService';
import type { PatientUploadedDocument, PatientDocumentCategory } from '../../types';

const DOCUMENT_CATEGORIES: PatientDocumentCategory[] = [
  'Laboratory Report',
  'Prescription',
  'Medical Report',
  'Scan/Imaging Report',
  'Discharge Summary',
  'Vaccination Record',
  'Other Medical Document',
];

const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

interface UploadFormState {
  title: string;
  documentType: PatientDocumentCategory | '';
  reportName: string;
  dateOfReport: string;
  healthcareProvider: string;
  description: string;
  file: File | null;
  fileDataUrl?: string;
}

const INITIAL_FORM_STATE: UploadFormState = {
  title: '',
  documentType: '',
  reportName: '',
  dateOfReport: new Date().toISOString().split('T')[0],
  healthcareProvider: '',
  description: '',
  file: null,
};

export const MedicalDocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<PatientUploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filtering & search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Form & Upload state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<UploadFormState>(INITIAL_FORM_STATE);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Modals
  const [previewDoc, setPreviewDoc] = useState<PatientUploadedDocument | null>(null);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await patientService.getMedicalDocuments();
      setDocuments(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load your medical documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  // Auto-dismiss alerts
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // File handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const ext = selected.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setFormErrors((prev) => ({
        ...prev,
        file: `Invalid file format (.${ext}). Only PDF, JPG, JPEG, and PNG files are supported.`,
      }));
      setForm((prev) => ({ ...prev, file: null, fileDataUrl: undefined }));
      return;
    }

    if (selected.size > MAX_FILE_SIZE_BYTES) {
      setFormErrors((prev) => ({
        ...prev,
        file: `File size exceeds the 10 MB limit (${(selected.size / (1024 * 1024)).toFixed(1)} MB).`,
      }));
      setForm((prev) => ({ ...prev, file: null, fileDataUrl: undefined }));
      return;
    }

    // Clear file error if valid
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.file;
      return next;
    });

    // Create a local data preview URL for image files
    if (['jpg', 'jpeg', 'png'].includes(ext)) {
      const reader = new FileReader();
      reader.onload = () => {
        setForm((prev) => ({
          ...prev,
          file: selected,
          fileDataUrl: reader.result as string,
        }));
      };
      reader.readAsDataURL(selected);
    } else {
      setForm((prev) => ({
        ...prev,
        file: selected,
        fileDataUrl: undefined,
      }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = 'Document title is required.';
    if (!form.documentType) errors.documentType = 'Please select a document category.';
    if (!form.dateOfReport) errors.dateOfReport = 'Report date is required.';
    if (!form.file) errors.file = 'Please select a medical document to upload.';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !form.file || !form.documentType) return;

    setUploading(true);
    setUploadProgress(20);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => (prev >= 90 ? prev : prev + 25));
    }, 120);

    try {
      const ext = form.file.name.split('.').pop()?.toUpperCase() as 'PDF' | 'JPG' | 'JPEG' | 'PNG';
      const sizeStr = `${(form.file.size / (1024 * 1024)).toFixed(1)} MB`;

      const newDoc = await patientService.uploadMedicalDocument({
        patientId: patientService.getCurrentPatientId(),
        title: form.title.trim(),
        documentType: form.documentType,
        reportName: form.reportName.trim() || form.title.trim(),
        dateOfReport: form.dateOfReport,
        healthcareProvider: form.healthcareProvider.trim() || 'Self-Uploaded Record',
        description: form.description.trim() || undefined,
        fileType: ext,
        fileSize: sizeStr,
        fileName: form.file.name,
        fileDataUrl: form.fileDataUrl,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      setDocuments((prev) => [newDoc, ...prev]);
      setSuccessMsg('Medical document uploaded successfully.');
      setForm(INITIAL_FORM_STATE);
      setIsFormOpen(false);
    } catch (err) {
      clearInterval(progressInterval);
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed. Please check your file and try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDocId) return;
    try {
      await patientService.deleteMedicalDocument(deleteDocId);
      setDocuments((prev) => prev.filter((d) => d.id !== deleteDocId));
      setSuccessMsg('Document removed from your records.');
      setDeleteDocId(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to delete document.');
    }
  };

  // Filtered list
  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.reportName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.healthcareProvider.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || doc.documentType === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 border border-accent/30 bg-gradient-to-r from-navy-900/90 via-navy-800/80 to-navy-900/90"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-glow-primary flex-shrink-0">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-accent/20 text-accent text-[11px] font-bold border border-accent/40">
                  Patient Health Records
                </span>
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> HIPAA Encrypted
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Medical Documents & Lab Reports</h2>
              <p className="text-xs sm:text-sm text-gray-300">
                Upload, organize, and view your diagnostic test results and clinical documents
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsFormOpen((prev) => !prev)}
          >
            {isFormOpen ? 'Close Upload Form' : 'Upload Document'}
          </Button>
        </div>
      </motion.div>

      {/* ── Feedback Banners ── */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg('')} className="text-rose-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Upload Form Accordion ── */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form
              onSubmit={handleUploadSubmit}
              noValidate
              className="glass-card p-6 border border-accent/40 bg-navy-900/95 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-accent" />
                  <h3 className="text-base font-bold text-white">Upload New Medical Document</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-xs text-gray-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Document Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Complete Blood Count Report"
                    className={`w-full py-2.5 px-3.5 text-sm text-white bg-white/5 border rounded-xl focus:outline-none focus:ring-1 transition-all ${
                      formErrors.title ? 'border-rose-500/60 focus:ring-rose-500/30' : 'border-white/15 focus:border-accent/60'
                    }`}
                  />
                  {formErrors.title && <p className="text-rose-400 text-xs mt-1">{formErrors.title}</p>}
                </div>

                {/* Document Type */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Document Category <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={form.documentType}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, documentType: e.target.value as PatientDocumentCategory }))
                    }
                    className={`w-full py-2.5 px-3.5 text-sm text-white bg-navy-900 border rounded-xl focus:outline-none focus:ring-1 transition-all cursor-pointer ${
                      formErrors.documentType ? 'border-rose-500/60' : 'border-white/15 focus:border-accent/60'
                    }`}
                  >
                    <option value="" className="bg-navy-900">
                      — Select Category —
                    </option>
                    {DOCUMENT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className="bg-navy-900">
                        {cat}
                      </option>
                    ))}
                  </select>
                  {formErrors.documentType && <p className="text-rose-400 text-xs mt-1">{formErrors.documentType}</p>}
                </div>

                {/* Report / Test Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Report / Test Name
                  </label>
                  <input
                    type="text"
                    value={form.reportName}
                    onChange={(e) => setForm((prev) => ({ ...prev, reportName: e.target.value }))}
                    placeholder="e.g. Automated Serum Lipid & CBC Panel"
                    className="w-full py-2.5 px-3.5 text-sm text-white bg-white/5 border border-white/15 rounded-xl focus:outline-none focus:border-accent/60 focus:ring-1"
                  />
                </div>

                {/* Date of Report */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Date of Report <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={form.dateOfReport}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setForm((prev) => ({ ...prev, dateOfReport: e.target.value }))}
                      className={`w-full py-2.5 pl-10 pr-3.5 text-sm text-white bg-white/5 border rounded-xl focus:outline-none focus:ring-1 [color-scheme:dark] ${
                        formErrors.dateOfReport ? 'border-rose-500/60' : 'border-white/15 focus:border-accent/60'
                      }`}
                    />
                  </div>
                  {formErrors.dateOfReport && <p className="text-rose-400 text-xs mt-1">{formErrors.dateOfReport}</p>}
                </div>

                {/* Healthcare Provider */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Healthcare Provider / Hospital / Lab
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={form.healthcareProvider}
                      onChange={(e) => setForm((prev) => ({ ...prev, healthcareProvider: e.target.value }))}
                      placeholder="e.g. MediTwin Diagnostics or Dr. Priya Sharma"
                      className="w-full py-2.5 pl-10 pr-3.5 text-sm text-white bg-white/5 border border-white/15 rounded-xl focus:outline-none focus:border-accent/60 focus:ring-1"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Clinical Summary / Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief notes or doctor instructions regarding this report"
                    className="w-full py-2.5 px-3.5 text-sm text-white bg-white/5 border border-white/15 rounded-xl focus:outline-none focus:border-accent/60 focus:ring-1"
                  />
                </div>
              </div>

              {/* File Dropzone Area */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Select File <span className="text-rose-400">*</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                    formErrors.file
                      ? 'border-rose-500/50 bg-rose-500/5 hover:bg-rose-500/10'
                      : form.file
                      ? 'border-emerald-500/50 bg-emerald-500/5'
                      : 'border-white/20 bg-white/[0.02] hover:bg-white/[0.05] hover:border-accent/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {form.file ? (
                    <div className="flex flex-col items-center gap-2">
                      <FileCheck className="w-10 h-10 text-emerald-400" />
                      <p className="text-sm font-semibold text-white">{form.file.name}</p>
                      <p className="text-xs text-gray-400">
                        Size: {(form.file.size / (1024 * 1024)).toFixed(2)} MB • Ready for upload
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setForm((prev) => ({ ...prev, file: null, fileDataUrl: undefined }));
                        }}
                        className="text-xs text-rose-400 hover:text-rose-300 mt-1"
                      >
                        Change or remove file
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <UploadCloud className="w-10 h-10 text-accent/80" />
                      <p className="text-sm font-semibold text-white">Click or Drag & Drop medical document here</p>
                      <p className="text-xs text-gray-400">
                        Supported formats: <strong className="text-white">PDF, JPG, JPEG, PNG</strong> (Max size:{' '}
                        <strong className="text-white">10 MB</strong>)
                      </p>
                    </div>
                  )}
                </div>
                {formErrors.file && (
                  <p className="text-rose-400 text-xs flex items-center gap-1.5 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {formErrors.file}
                  </p>
                )}
              </div>

              {/* Progress Bar */}
              {uploading && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-300">
                    <span>Uploading medical document...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={uploading}
                  icon={uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  className="flex-1 justify-center"
                >
                  {uploading ? 'Processing Upload...' : 'Upload Document'}
                </Button>
                <Button
                  type="button"
                  variant="glass"
                  size="md"
                  onClick={() => {
                    setForm(INITIAL_FORM_STATE);
                    setFormErrors({});
                    setIsFormOpen(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Filters and Search ── */}
      <div className="glass-card p-4 border border-white/10 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, lab, provider..."
              className="w-full py-2.5 pl-10 pr-9 text-xs sm:text-sm text-white bg-white/5 border border-white/15 rounded-xl focus:outline-none focus:border-accent/60"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 rounded-full hover:bg-white/10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Refresh */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button variant="glass" size="sm" onClick={loadDocuments} icon={<RefreshCw className="w-3.5 h-3.5" />}>
              Refresh
            </Button>
          </div>
        </div>

        {/* Categories wrapping pill tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'All'
                ? 'bg-primary text-white border border-accent/40 shadow-glow-primary font-bold'
                : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/10'
            }`}
          >
            <span>All Documents</span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                selectedCategory === 'All' ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400 border border-white/10'
              }`}
            >
              {documents.length}
            </span>
          </button>
          {DOCUMENT_CATEGORIES.map((cat) => {
            const count = documents.filter((d) => d.documentType === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-white border border-accent/40 shadow-glow-primary font-bold'
                    : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/10'
                }`}
              >
                <span>{cat}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400 border border-white/10'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Document List ── */}
      <div className="glass-card border border-white/10 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <p className="text-sm font-medium">Loading your medical information...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500">
              <File className="w-8 h-8" />
            </div>
            <div>
              <p className="text-base font-bold text-white">
                {searchQuery || selectedCategory !== 'All'
                  ? 'No matching documents found'
                  : 'No medical documents uploaded yet.'}
              </p>
              <p className="text-xs text-gray-400 max-w-sm mt-1">
                {searchQuery || selectedCategory !== 'All'
                  ? 'Try adjusting your search terms or filter category.'
                  : 'Use the upload form above to add your blood tests, prescriptions, radiology scans, or discharge summaries.'}
              </p>
            </div>
            {!isFormOpen && (
              <Button
                variant="accent"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setIsFormOpen(true)}
              >
                Upload First Document
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03]">
                  {['Document Title', 'Category', 'Test / Report Name', 'Report Date', 'Provider / Hospital', 'Format', 'Uploaded', 'Status', 'Actions'].map(
                    (head) => (
                      <th
                        key={head}
                        className="px-4 py-3.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap"
                      >
                        {head}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredDocs.map((doc, idx) => (
                  <tr
                    key={doc.id}
                    className={`hover:bg-white/[0.04] transition-colors ${idx % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
                  >
                    <td className="px-4 py-3.5 font-bold text-white whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent flex-shrink-0">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate max-w-[200px]" title={doc.title}>
                          {doc.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent/10 border border-accent/20 text-accent">
                        {doc.documentType}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-300 max-w-[180px] truncate" title={doc.reportName}>
                      {doc.reportName}
                    </td>
                    <td className="px-4 py-3.5 text-gray-300 whitespace-nowrap">{doc.dateOfReport}</td>
                    <td className="px-4 py-3.5 text-gray-300 max-w-[160px] truncate" title={doc.healthcareProvider}>
                      {doc.healthcareProvider}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap font-mono text-[11px]">
                      <span className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300">
                        {doc.fileType} • {doc.fileSize}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-400 whitespace-nowrap text-[11px]">{doc.uploadedDate}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          doc.status === 'Verified'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : doc.status === 'Pending Review'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                        }`}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          title="View & Preview"
                          className="p-1.5 rounded-lg bg-accent/10 hover:bg-accent/25 text-accent transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setPreviewDoc(doc);
                          }}
                          title="Download / Save"
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteDocId(doc.id)}
                          title="Delete"
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 transition-colors"
                        >
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
      </div>

      {/* ── Document View / Simulated Preview Modal ── */}
      <AnimatePresence>
        {previewDoc && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md"
            onClick={() => setPreviewDoc(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card max-w-2xl w-full p-6 border border-white/20 bg-navy-900/98 max-h-[90vh] overflow-y-auto rounded-2xl space-y-5"
            >
              <div className="flex items-start justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{previewDoc.title}</h3>
                    <p className="text-xs text-gray-400">
                      {previewDoc.documentType} • {previewDoc.fileName} ({previewDoc.fileSize})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Document details grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-white/5 border border-white/10 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Report Name</span>
                  <span className="text-white font-medium">{previewDoc.reportName}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Report Date</span>
                  <span className="text-white font-medium">{previewDoc.dateOfReport}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Healthcare Provider</span>
                  <span className="text-white font-medium">{previewDoc.healthcareProvider}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">File Format</span>
                  <span className="text-white font-mono">{previewDoc.fileType}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Uploaded On</span>
                  <span className="text-white">{previewDoc.uploadedDate}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Clinical Verification</span>
                  <span className="text-emerald-400 font-semibold">{previewDoc.verificationStatus || previewDoc.status}</span>
                </div>
              </div>

              {(previewDoc.verifiedBy || previewDoc.verificationSource) && (
                <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Document Authentication & Clinical Sign-Off
                    </span>
                    {previewDoc.verifiedDate && (
                      <span className="text-[10px] text-emerald-400 font-mono">
                        {previewDoc.verifiedDate}
                      </span>
                    )}
                  </div>
                  {previewDoc.verifiedBy && (
                    <p className="text-gray-200 text-xs">
                      <span className="text-gray-400 font-medium">Verified by:</span>{' '}
                      <strong className="text-white font-semibold">{previewDoc.verifiedBy}</strong>
                    </p>
                  )}
                  {previewDoc.verificationSource && (
                    <p className="text-gray-300 text-[11px]">
                      <span className="text-gray-400 font-medium">Authority / Ledger:</span>{' '}
                      <span className="text-emerald-300 font-medium">{previewDoc.verificationSource}</span>
                    </p>
                  )}
                </div>
              )}

              {previewDoc.description && (
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs">
                  <span className="text-gray-400 font-bold block mb-1">Clinical Notes / Comments:</span>
                  <p className="text-gray-200">{previewDoc.description}</p>
                </div>
              )}

              {/* Simulated Document Preview Area */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Document Preview</p>
                {previewDoc.fileDataUrl ? (
                  <div className="border border-white/15 rounded-xl overflow-hidden max-h-64 flex items-center justify-center bg-black/40 p-2">
                    <img
                      src={previewDoc.fileDataUrl}
                      alt={previewDoc.title}
                      className="max-h-60 max-w-full object-contain rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="border border-white/10 rounded-xl p-8 text-center bg-white/[0.02] flex flex-col items-center justify-center gap-3">
                    <FileText className="w-12 h-12 text-accent/80" />
                    <div>
                      <p className="text-sm font-semibold text-white">{previewDoc.fileName}</p>
                      <p className="text-xs text-gray-400">
                        {previewDoc.fileType} Document ({previewDoc.fileSize}) — Secure Medical Storage
                      </p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified Document Record
                    </div>
                  </div>
                )}
              </div>

              {/* Modal footer actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1 justify-center"
                  icon={<Download className="w-4 h-4" />}
                  onClick={() => {
                    alert(`Simulated download for: ${previewDoc.fileName}`);
                  }}
                >
                  Download Document
                </Button>
                <Button
                  variant="glass"
                  size="sm"
                  className="justify-center"
                  onClick={() => setPreviewDoc(null)}
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation Modal ── */}
      <AnimatePresence>
        {deleteDocId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md"
            onClick={() => setDeleteDocId(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card max-w-sm w-full p-6 border border-rose-500/30 bg-navy-900/98 rounded-2xl text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Delete Document?</h3>
              <p className="text-xs text-gray-300">
                Are you sure you want to remove this medical document from your health profile? This action will remove it from your records.
              </p>
              <div className="flex gap-3">
                <Button variant="glass" size="sm" className="flex-1 justify-center" onClick={() => setDeleteDocId(null)}>
                  Cancel
                </Button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shadow-lg"
                >
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

export default MedicalDocumentsPage;
