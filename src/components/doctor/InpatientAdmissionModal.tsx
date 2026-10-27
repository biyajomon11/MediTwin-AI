import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Bed,
  Building2,
  Activity,
  Stethoscope,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Search,
  User,
  ShieldAlert,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  DoctorPatient,
  HospitalWardDTO,
  WardBedDTO,
  InpatientAdmissionRecord,
} from '../../types';
import {
  getHospitalWards,
  getWardBeds,
  searchPatientsForAdmission,
  createInpatientAdmission,
} from '../../services/doctorService';

interface InpatientAdmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: DoctorPatient[];
  initialPatientId?: number;
  initialWardId?: number;
  initialBedId?: number;
  onAdmitted: (admission: InpatientAdmissionRecord) => void;
}

// Safe clinical helpers to guarantee strings for JSX rendering
const formatGender = (g: any): string => {
  if (!g) return 'Unspecified';
  if (typeof g === 'string') return g;
  if (typeof g === 'object' && g.name) return String(g.name);
  return 'Unspecified';
};

const formatBloodGroup = (bg: any): string => {
  if (!bg) return 'Unknown';
  if (typeof bg === 'string') return bg;
  if (typeof bg === 'object' && bg.name) return String(bg.name);
  return 'Unknown';
};

export const InpatientAdmissionModal: React.FC<InpatientAdmissionModalProps> = ({
  isOpen,
  onClose,
  patients = [],
  initialPatientId,
  initialWardId,
  initialBedId,
  onAdmitted,
}) => {
  // ── States ───────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);

  const [wards, setWards] = useState<HospitalWardDTO[]>([]);
  const [loadingWards, setLoadingWards] = useState(false);
  const [selectedWardId, setSelectedWardId] = useState<number | null>(null);

  const [beds, setBeds] = useState<WardBedDTO[]>([]);
  const [loadingBeds, setLoadingBeds] = useState(false);
  const [selectedBedId, setSelectedBedId] = useState<number | null>(null);

  const [acuityLevel, setAcuityLevel] = useState<'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'>('MODERATE');
  const [admissionStatus, setAdmissionStatus] = useState<'ADMITTED' | 'UNDER_OBSERVATION'>('ADMITTED');

  const [admissionDiagnosis, setAdmissionDiagnosis] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [nursingHandoverInstructions, setNursingHandoverInstructions] = useState('');

  const [fieldErrors, setFieldErrors] = useState<{
    admissionDiagnosis?: string;
    chiefComplaint?: string;
    nursingHandoverInstructions?: string;
  }>({});
  const [touched, setTouched] = useState<{
    admissionDiagnosis?: boolean;
    chiefComplaint?: boolean;
    nursingHandoverInstructions?: boolean;
  }>({});

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validateField = (
    field: 'admissionDiagnosis' | 'chiefComplaint' | 'nursingHandoverInstructions',
    val: string
  ): string | undefined => {
    const trimmed = (val || '').trim();
    if (!trimmed) {
      if (field === 'admissionDiagnosis') return 'Admission diagnosis is required (minimum 50 characters).';
      if (field === 'chiefComplaint') return 'Chief complaint is required (minimum 50 characters).';
      return 'Nursing handover & telemetry instructions are required (minimum 50 characters).';
    }
    if (trimmed.length < 50) {
      return `Must contain at least 50 characters (currently ${trimmed.length}/50).`;
    }
    return undefined;
  };

  const getCounterCls = (length: number) => {
    if (length >= 50) return 'text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30';
    if (length > 0) return 'text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30';
    return 'text-gray-400 font-normal bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/10';
  };

  const getFieldInputCls = (hasError?: boolean, length: number = 0) => {
    if (hasError) {
      return 'w-full bg-slate-900/90 border border-rose-500/60 rounded-xl px-3.5 py-2 text-xs text-white focus:border-rose-400 focus:ring-1 focus:ring-rose-500/50 outline-none transition-colors';
    }
    if (length >= 50) {
      return 'w-full bg-slate-900/90 border border-emerald-500/40 rounded-xl px-3.5 py-2 text-xs text-white focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/30 outline-none transition-colors';
    }
    return 'w-full bg-slate-900/90 border border-white/20 rounded-xl px-3.5 py-2 text-xs text-white focus:border-accent outline-none transition-colors';
  };

  // ── Load Wards on Open ───────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setFieldErrors({});
    setTouched({});

    const loadWards = async () => {
      setLoadingWards(true);
      try {
        const fetchedWards = await getHospitalWards();
        const wardList = Array.isArray(fetchedWards) ? fetchedWards : [];
        setWards(wardList);
        if (wardList.length > 0) {
          if (initialWardId && wardList.some((w) => w.id === initialWardId)) {
            setSelectedWardId(initialWardId);
          } else {
            setSelectedWardId(wardList[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load hospital wards:', err);
        setWards([]);
      } finally {
        setLoadingWards(false);
      }
    };

    loadWards();
  }, [isOpen, initialWardId]);

  // ── Load Beds when selectedWardId changes ────────────────────
  useEffect(() => {
    if (!selectedWardId) {
      setBeds([]);
      setSelectedBedId(null);
      return;
    }

    const loadBeds = async () => {
      setLoadingBeds(true);
      try {
        const res = await getWardBeds(selectedWardId);
        const bedList = Array.isArray(res?.beds) ? res.beds : [];
        setBeds(bedList);
        // Automatically select initialBedId or first available bed
        if (initialBedId && bedList.some((b) => b.id === initialBedId)) {
          setSelectedBedId(initialBedId);
        } else {
          const firstAvail = bedList.find((b) => b.isAvailable || b.status === 'AVAILABLE');
          setSelectedBedId(firstAvail ? firstAvail.id : null);
        }
      } catch (err) {
        console.error('Failed to load beds for ward:', err);
        setBeds([]);
      } finally {
        setLoadingBeds(false);
      }
    };

    loadBeds();
  }, [selectedWardId, initialBedId]);

  // ── Handle initialPatientId or fallback selection ────────────
  useEffect(() => {
    if (!isOpen) return;

    const patientList = Array.isArray(patients) ? patients : [];

    if (initialPatientId) {
      const match = patientList.find((p) => p.id === initialPatientId);
      if (match) {
        setSelectedPatient({
          id: match.id,
          name: (match as any).name || `${match.firstName || ''} ${match.lastName || ''}`.trim() || 'Selected Patient',
          age: match.age ?? 0,
          gender: formatGender(match.gender),
          bloodGroup: formatBloodGroup(match.bloodGroup),
          email: match.email || '',
          phone: match.phone || '',
          patientCode: (match as any).patientCode || `PT-${String(match.id).padStart(3, '0')}`,
          isAdmitted: ['Admitted', 'Critical', 'Under Observation'].includes(match.status || ''),
          ward: match.ward,
          bedNumber: match.bedNumber,
        });
        if (match.primaryCondition) {
          setAdmissionDiagnosis(match.primaryCondition);
        }
      } else {
        // Search server
        searchPatientsForAdmission(String(initialPatientId)).then((res) => {
          if (Array.isArray(res) && res.length > 0) {
            const r = res[0];
            setSelectedPatient({
              ...r,
              name: r.name || `${r.firstName || ''} ${r.lastName || ''}`.trim() || 'Selected Patient',
              gender: formatGender(r.gender),
              bloodGroup: formatBloodGroup(r.bloodGroup),
            });
          }
        }).catch(() => {});
      }
    } else if (!selectedPatient && patientList.length > 0) {
      const first = patientList[0];
      setSelectedPatient({
        id: first.id,
        name: (first as any).name || `${first.firstName || ''} ${first.lastName || ''}`.trim() || 'Selected Patient',
        age: first.age ?? 0,
        gender: formatGender(first.gender),
        bloodGroup: formatBloodGroup(first.bloodGroup),
        email: first.email || '',
        phone: first.phone || '',
        patientCode: (first as any).patientCode || `PT-${String(first.id).padStart(3, '0')}`,
        isAdmitted: ['Admitted', 'Critical', 'Under Observation'].includes(first.status || ''),
        ward: first.ward,
        bedNumber: first.bedNumber,
      });
    }
  }, [isOpen, initialPatientId, patients]);

  // ── Server-side debounced search for patients ─────────────────
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchPatientsForAdmission(searchTerm.trim());
        setSearchResults(
          (Array.isArray(results) ? results : []).map((p) => ({
            ...p,
            name: p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Patient',
            gender: formatGender(p.gender),
            bloodGroup: formatBloodGroup(p.bloodGroup),
          }))
        );
      } catch (err) {
        console.error('Patient search error:', err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const activeWard = useMemo(() => {
    return (wards || []).find((w) => w.id === selectedWardId);
  }, [wards, selectedWardId]);

  const availableBeds = useMemo(() => {
    return (beds || []).filter((b) => b.isAvailable || b.status === 'AVAILABLE');
  }, [beds]);

  const isPatientAlreadyAdmitted = Boolean(selectedPatient?.isAdmitted);

  // ── Form Submit ──────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedPatient) {
      setErrorMessage('Please select a patient to admit.');
      return;
    }

    if (isPatientAlreadyAdmitted) {
      setErrorMessage(
        `Patient ${selectedPatient.name} is already admitted (${selectedPatient.ward || 'Hospital Ward'} - ${selectedPatient.bedNumber || 'Assigned Bed'}). A patient cannot have two active inpatient admissions concurrently.`
      );
      return;
    }

    if (!selectedWardId) {
      setErrorMessage('Please select an active hospital ward.');
      return;
    }

    if (!selectedBedId) {
      setErrorMessage('Please select an available hospital bed.');
      return;
    }

    setTouched({
      admissionDiagnosis: true,
      chiefComplaint: true,
      nursingHandoverInstructions: true,
    });

    const diagErr = validateField('admissionDiagnosis', admissionDiagnosis);
    const compErr = validateField('chiefComplaint', chiefComplaint);
    const handErr = validateField('nursingHandoverInstructions', nursingHandoverInstructions);

    setFieldErrors({
      admissionDiagnosis: diagErr,
      chiefComplaint: compErr,
      nursingHandoverInstructions: handErr,
    });

    if (diagErr || compErr || handErr) {
      const firstErr = diagErr || compErr || handErr;
      setErrorMessage(firstErr || 'Admission diagnosis, chief complaint, and nursing handover instructions must each contain at least 50 characters.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await createInpatientAdmission({
        patientId: selectedPatient.id,
        wardId: selectedWardId,
        bedId: selectedBedId,
        admissionDiagnosis: admissionDiagnosis.trim(),
        chiefComplaint: chiefComplaint.trim(),
        nursingHandoverInstructions: nursingHandoverInstructions.trim(),
        admissionStatus,
        acuityLevel,
      });

      if (res.success && res.data) {
        setSuccessMessage(`Patient successfully admitted under admission #${res.data.admissionNumber}!`);
        onAdmitted(res.data);
        setTimeout(() => {
          onClose();
        }, 900);
      } else {
        setErrorMessage(res.error || 'Failed to complete inpatient admission.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during admission.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative w-full max-w-2xl bg-gradient-to-b from-navy-900 to-navy-950 border border-white/15 rounded-2xl shadow-2xl overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-navy-950/70">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent/15 border border-accent/30 text-accent">
                <Bed className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">
                  Admit Inpatient to Hospital Ward
                </h3>
                <p className="text-xs text-gray-400">
                  Assign verified bed, separate clinical acuity, and record nursing handover telemetry
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={submitting}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto custom-scrollbar">
            {/* Error / Success Notifications */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* 1. Patient Selector & Search */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-accent" />
                <span>Select Patient (Outpatient or Registered Directory)</span>
              </label>

              {/* Patient Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search patient by name, ID, phone, or email..."
                  className="w-full bg-slate-900/90 border border-white/20 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-gray-500 focus:border-accent outline-none"
                />
                {searching && (
                  <Loader2 className="w-3.5 h-3.5 text-accent animate-spin absolute right-3 top-2.5" />
                )}
              </div>

              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto bg-slate-900 border border-white/15 rounded-xl divide-y divide-white/5 shadow-xl">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedPatient(p);
                        setSearchTerm('');
                        setSearchResults([]);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-white/5 flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{p.name}</span>
                        <span className="text-[10px] text-gray-400">
                          (Age {p.age ?? '—'}, {formatGender(p.gender)}, {formatBloodGroup(p.bloodGroup)})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.isAdmitted ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Currently Admitted ({p.ward || 'Ward'})
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            Available for Admission
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-gray-400">{p.patientCode || `PT-${p.id}`}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Patient Banner */}
              {selectedPatient && (
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{selectedPatient.name}</span>
                      <span className="text-[11px] font-mono text-accent">
                        {selectedPatient.patientCode || `PT-${selectedPatient.id}`}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Age: {selectedPatient.age ?? 'N/A'} • Gender: {formatGender(selectedPatient.gender)} • Blood: {formatBloodGroup(selectedPatient.bloodGroup)} • Phone: {selectedPatient.phone || 'N/A'}
                    </p>
                  </div>
                  <div>
                    {isPatientAlreadyAdmitted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Already Admitted</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Eligible</span>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Already admitted warning banner */}
              {isPatientAlreadyAdmitted && (
                <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Warning: This patient is already active in <strong>{selectedPatient?.ward || 'an inpatient unit'}</strong> (Bed: {selectedPatient?.bedNumber || 'Assigned'}). To assign a new bed, discharge or transfer the existing record first.
                  </span>
                </div>
              )}
            </div>

            {/* 2. Hospital Ward & Bed Allocation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Ward Select */}
              <div>
                <label className="text-xs font-semibold text-gray-300 flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-accent" />
                    <span>Designated Hospital Ward</span>
                  </span>
                  {activeWard && (
                    <span className="text-[10px] text-emerald-400 font-medium">
                      {activeWard.availableBeds} / {activeWard.totalBeds} beds available
                    </span>
                  )}
                </label>
                <select
                  value={selectedWardId || ''}
                  onChange={(e) => setSelectedWardId(Number(e.target.value))}
                  disabled={loadingWards}
                  className="w-full bg-slate-900/90 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-accent outline-none"
                >
                  {(wards || []).length === 0 ? (
                    <option value="" disabled className="bg-slate-900 text-gray-400">
                      {loadingWards ? 'Loading hospital wards...' : 'No wards available'}
                    </option>
                  ) : (
                    wards.map((w) => (
                      <option key={w.id} value={w.id} className="bg-slate-900 text-white">
                        {w.name} ({w.availableBeds} free)
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Bed Select */}
              <div>
                <label className="text-xs font-semibold text-gray-300 flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Bed className="w-3.5 h-3.5 text-accent" />
                    <span>Assigned Bed</span>
                  </span>
                  {loadingBeds && <Loader2 className="w-3 h-3 text-accent animate-spin" />}
                </label>

                {availableBeds.length === 0 && !loadingBeds ? (
                  <div className="px-3 py-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                    No beds available in this ward. Please choose another ward.
                  </div>
                ) : (
                  <select
                    value={selectedBedId || ''}
                    onChange={(e) => setSelectedBedId(Number(e.target.value))}
                    disabled={loadingBeds || availableBeds.length === 0}
                    className="w-full bg-slate-900/90 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-accent outline-none"
                  >
                    {(beds || []).length === 0 ? (
                      <option value="" disabled className="bg-slate-900 text-gray-400">
                        {loadingBeds ? 'Loading ward beds...' : 'No beds in selected ward'}
                      </option>
                    ) : (
                      beds.map((b) => (
                        <option
                          key={b.id}
                          value={b.id}
                          disabled={!b.isAvailable && b.status !== 'AVAILABLE'}
                          className="bg-slate-900 text-white"
                        >
                          {b.bedNumber} — {b.status === 'AVAILABLE' ? 'Available' : 'Occupied'}
                        </option>
                      ))
                    )}
                  </select>
                )}

                {/* Available Bed Quick Presets */}
                {availableBeds.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] text-gray-400 mr-1">Available:</span>
                    {availableBeds.slice(0, 6).map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedBedId(b.id)}
                        className={`text-[10px] px-2 py-0.5 rounded-md transition-colors cursor-pointer border ${
                          selectedBedId === b.id
                            ? 'bg-accent/20 text-accent border-accent/50 font-bold'
                            : 'bg-white/5 text-gray-300 hover:text-white border-white/10'
                        }`}
                      >
                        {b.bedNumber}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Clinical Acuity vs Ward Placement Separation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-accent" />
                    <span>Clinical Acuity Level</span>
                  </span>
                  <span className="text-[10px] text-gray-400">(Independent of Ward)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'LOW', label: 'Low Acuity', desc: 'Stable / Routine care', color: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10' },
                    { id: 'MODERATE', label: 'Moderate Acuity', desc: 'Standard observation', color: 'border-blue-500/40 text-blue-300 bg-blue-500/10' },
                    { id: 'HIGH', label: 'High Acuity', desc: 'Frequent nursing checks', color: 'border-amber-500/40 text-amber-300 bg-amber-500/10' },
                    { id: 'CRITICAL', label: 'Critical Acuity', desc: 'Intensive ICU monitoring', color: 'border-rose-500/40 text-rose-300 bg-rose-500/10' },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setAcuityLevel(lvl.id as any)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        acuityLevel === lvl.id
                          ? `${lvl.color} ring-1 ring-white/20 shadow-sm`
                          : 'border-white/10 bg-white/[0.02] text-gray-400 hover:bg-white/[0.05]'
                      }`}
                    >
                      <span className="font-bold text-xs block text-white">{lvl.label}</span>
                      <span className="text-[10px] text-gray-400 mt-0.5 block leading-tight">{lvl.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5 mb-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-accent" />
                  <span>Admission Lifecycle Status</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'ADMITTED', label: 'Admitted', desc: 'Full inpatient admission', color: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10' },
                    { id: 'UNDER_OBSERVATION', label: 'Under Observation', desc: '24-48h clinical watch', color: 'border-amber-500/40 text-amber-300 bg-amber-500/10' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setAdmissionStatus(st.id as any)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        admissionStatus === st.id
                          ? `${st.color} ring-1 ring-white/20 shadow-sm`
                          : 'border-white/10 bg-white/[0.02] text-gray-400 hover:bg-white/[0.05]'
                      }`}
                    >
                      <span className="font-bold text-xs block text-white">{st.label}</span>
                      <span className="text-[10px] text-gray-400 mt-0.5 block leading-tight">{st.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Admission Diagnosis & Chief Complaint */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-accent" />
                    <span>Admission Diagnosis <span className="text-rose-400">*</span></span>
                  </span>
                  <span className={`text-[11px] font-mono transition-colors ${getCounterCls(admissionDiagnosis.trim().length)}`}>
                    {admissionDiagnosis.trim().length}/50 min chars
                  </span>
                </label>
                <input
                  type="text"
                  value={admissionDiagnosis}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAdmissionDiagnosis(val);
                    if (touched.admissionDiagnosis) {
                      setFieldErrors((prev) => ({ ...prev, admissionDiagnosis: validateField('admissionDiagnosis', val) }));
                    }
                  }}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, admissionDiagnosis: true }));
                    setFieldErrors((prev) => ({ ...prev, admissionDiagnosis: validateField('admissionDiagnosis', admissionDiagnosis) }));
                  }}
                  placeholder="e.g. Community-Acquired Pneumonia with secondary acute respiratory distress (min 50 characters)"
                  className={getFieldInputCls(Boolean(fieldErrors.admissionDiagnosis), admissionDiagnosis.trim().length)}
                  required
                />
                {fieldErrors.admissionDiagnosis && (
                  <p className="text-[11px] text-rose-400 mt-1.5 flex items-center gap-1 animate-fadeIn">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                    <span>{fieldErrors.admissionDiagnosis}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-accent" />
                    <span>Chief Complaint <span className="text-rose-400">*</span></span>
                  </span>
                  <span className={`text-[11px] font-mono transition-colors ${getCounterCls(chiefComplaint.trim().length)}`}>
                    {chiefComplaint.trim().length}/50 min chars
                  </span>
                </label>
                <input
                  type="text"
                  value={chiefComplaint}
                  onChange={(e) => {
                    const val = e.target.value;
                    setChiefComplaint(val);
                    if (touched.chiefComplaint) {
                      setFieldErrors((prev) => ({ ...prev, chiefComplaint: validateField('chiefComplaint', val) }));
                    }
                  }}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, chiefComplaint: true }));
                    setFieldErrors((prev) => ({ ...prev, chiefComplaint: validateField('chiefComplaint', chiefComplaint) }));
                  }}
                  placeholder="e.g. Severe shortness of breath, SpO2 88% on room air, productive cough (min 50 characters)"
                  className={getFieldInputCls(Boolean(fieldErrors.chiefComplaint), chiefComplaint.trim().length)}
                  required
                />
                {fieldErrors.chiefComplaint && (
                  <p className="text-[11px] text-rose-400 mt-1.5 flex items-center gap-1 animate-fadeIn">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                    <span>{fieldErrors.chiefComplaint}</span>
                  </p>
                )}
              </div>
            </div>

            {/* 5. Nursing Handover Instructions */}
            <div>
              <label className="text-xs font-semibold text-gray-300 flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-accent" />
                  <span>Nursing Handover & Immediate Telemetry Instructions <span className="text-rose-400">*</span></span>
                </span>
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] text-emerald-400 font-medium">Persisted in Nurse Telemetry</span>
                  <span className={`text-[11px] font-mono transition-colors ${getCounterCls(nursingHandoverInstructions.trim().length)}`}>
                    {nursingHandoverInstructions.trim().length}/50 min chars
                  </span>
                </div>
              </label>
              <textarea
                value={nursingHandoverInstructions}
                onChange={(e) => {
                  const val = e.target.value;
                  setNursingHandoverInstructions(val);
                  if (touched.nursingHandoverInstructions) {
                    setFieldErrors((prev) => ({ ...prev, nursingHandoverInstructions: validateField('nursingHandoverInstructions', val) }));
                  }
                }}
                onBlur={() => {
                  setTouched((prev) => ({ ...prev, nursingHandoverInstructions: true }));
                  setFieldErrors((prev) => ({ ...prev, nursingHandoverInstructions: validateField('nursingHandoverInstructions', nursingHandoverInstructions) }));
                }}
                rows={3}
                placeholder="e.g. Initiate O2 via nasal cannula at 2L/min. Record vitals q4h. Administer IV Ceftriaxone 1g after skin sensitivity test. Notify on-call doctor if SBP < 90 or SpO2 < 92%. (min 50 characters)"
                className={`${getFieldInputCls(Boolean(fieldErrors.nursingHandoverInstructions), nursingHandoverInstructions.trim().length)} resize-none leading-relaxed`}
                required
              />
              {fieldErrors.nursingHandoverInstructions && (
                <p className="text-[11px] text-rose-400 mt-1.5 flex items-center gap-1 animate-fadeIn">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                  <span>{fieldErrors.nursingHandoverInstructions}</span>
                </p>
              )}
            </div>

            {/* Footer Actions */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-gray-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Atomically reserves bed in PostgreSQL & logs audit trail</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || isPatientAlreadyAdmitted || availableBeds.length === 0}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-accent to-emerald-400 hover:from-accent/90 hover:to-emerald-400/90 text-navy-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-accent/20 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Admitting Inpatient...</span>
                    </>
                  ) : (
                    <>
                      <Bed className="w-3.5 h-3.5" />
                      <span>Confirm Inpatient Admission</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
