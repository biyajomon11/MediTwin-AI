import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowRightLeft,
  Bed,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { HospitalWardDTO, WardBedDTO, InpatientAdmissionRecord } from '../../types';
import { getHospitalWards, getWardBeds, transferInpatientBed } from '../../services/doctorService';

interface InpatientTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  admission: InpatientAdmissionRecord | null;
  onTransferred: (updated: InpatientAdmissionRecord) => void;
}

const COMMON_TRANSFER_REASONS = [
  'Clinical step-down to general care',
  'Step-up to Intensive Care Unit (ICU)',
  'Postoperative recovery transfer',
  'Isolation & infection control precautions',
  'Specialty care department relocation',
  'Bed maintenance or room sanitization',
  'Patient requested room transfer',
];

export const InpatientTransferModal: React.FC<InpatientTransferModalProps> = ({
  isOpen,
  onClose,
  admission,
  onTransferred,
}) => {
  const [wards, setWards] = useState<HospitalWardDTO[]>([]);
  const [loadingWards, setLoadingWards] = useState(false);
  const [selectedWardId, setSelectedWardId] = useState<number | null>(null);

  const [beds, setBeds] = useState<WardBedDTO[]>([]);
  const [loadingBeds, setLoadingBeds] = useState(false);
  const [selectedBedId, setSelectedBedId] = useState<number | null>(null);

  const [transferReason, setTransferReason] = useState(COMMON_TRANSFER_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [isCustomReason, setIsCustomReason] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load wards on modal open
  useEffect(() => {
    if (!isOpen || !admission) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsCustomReason(false);
    setCustomReason('');
    setTransferReason(COMMON_TRANSFER_REASONS[0]);

    const loadWards = async () => {
      setLoadingWards(true);
      try {
        const fetched = await getHospitalWards();
        setWards(fetched);
        // Default to first available ward that isn't full
        if (fetched.length > 0) {
          // If current ward has other beds or pick another ward
          const otherWard = fetched.find((w) => w.id !== admission.wardId && w.availableBeds > 0) || fetched[0];
          setSelectedWardId(otherWard.id);
        }
      } catch (err) {
        console.error('Failed to load wards for transfer:', err);
      } finally {
        setLoadingWards(false);
      }
    };

    loadWards();
  }, [isOpen, admission]);

  // Load beds when selectedWardId changes
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

        // Auto select first available bed that isn't current bed
        const availableBeds = bedList.filter(
          (b) =>
            (b.isAvailable || b.status === 'AVAILABLE') &&
            !(selectedWardId === admission?.wardId && (b.id === admission?.bedId || b.bedNumber.toLowerCase() === (admission?.bedNumber || '').toLowerCase()))
        );
        setSelectedBedId(availableBeds.length > 0 ? availableBeds[0].id : null);
      } catch (err) {
        console.error('Failed to load beds for transfer:', err);
        setBeds([]);
      } finally {
        setLoadingBeds(false);
      }
    };

    loadBeds();
  }, [selectedWardId, admission?.bedId]);

  if (!isOpen || !admission) return null;

  const currentWardName = admission.wardName || 'Current Ward';
  const currentBedNumber = admission.bedNumber || 'Current Bed';
  const destinationWard = wards.find((w) => w.id === selectedWardId);
  const destinationBed = beds.find((b) => b.id === selectedBedId);

  const availableBedsInWard = beds.filter(
    (b) => (b.isAvailable || b.status === 'AVAILABLE') && b.id !== admission.bedId
  );

  const finalReason = isCustomReason ? customReason.trim() : transferReason;

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWardId || !selectedBedId) {
      setErrorMessage('Please select a destination ward and available bed.');
      return;
    }

    const destBed = beds.find((b) => b.id === selectedBedId);
    if (
      selectedWardId === admission.wardId &&
      (selectedBedId === admission.bedId ||
        (destBed && destBed.bedNumber.toLowerCase() === (admission.bedNumber || '').toLowerCase()))
    ) {
      setErrorMessage('Destination bed cannot be the patient’s current bed in the same ward.');
      return;
    }

    if (!finalReason) {
      setErrorMessage('Please provide a clinical transfer reason.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await transferInpatientBed(admission.id, {
        destinationWardId: selectedWardId,
        destinationBedId: selectedBedId,
        transferReason: finalReason,
      });

      if (res.success && res.data) {
        setSuccessMessage(res.message || 'Patient transferred successfully!');
        setTimeout(() => {
          onTransferred(res.data!);
          onClose();
        }, 1200);
      } else {
        setErrorMessage(res.error || 'Failed to transfer patient. The destination bed may have just been occupied.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during bed transfer.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-gradient-to-b from-navy-900 to-navy-950 border border-white/15 rounded-2xl shadow-2xl overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-navy-950/80">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent/15 border border-accent/30 text-accent">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white tracking-wide">
                    Inpatient Bed & Ward Transfer
                  </h3>
                  <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-accent/20 text-accent border border-accent/40 font-bold">
                    {admission.admissionNumber}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  Atomically reallocate bed, preserve clinical continuity, and update hospital telemetry
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={submitting}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleTransferSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
            {/* Feedback Alerts */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Current Patient & Location Card */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                Active Inpatient & Current Location
              </span>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-accent font-bold text-xs">
                    {(admission.patientName || 'PT').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{admission.patientName}</span>
                      <span className="text-xs text-gray-400 font-mono">({admission.patientCode || `PT-${admission.patientId}`})</span>
                    </h4>
                    <p className="text-xs text-gray-400">
                      {admission.gender} • {admission.age} yrs • Blood Group: <strong className="text-white">{admission.bloodGroup}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-navy-950/80 border border-white/10 text-xs">
                  <Bed className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="text-[10px] text-gray-400 block">Current Assignment</span>
                    <span className="font-semibold text-amber-300">
                      {currentWardName} • {currentBedNumber}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Transfer Movement Visualization */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-navy-950/90 via-navy-900 to-navy-950/90 border border-accent/20">
              <div className="flex items-center justify-between gap-3 text-center sm:text-left">
                <div className="flex-1">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-medium">Source Bed</span>
                  <p className="text-xs font-bold text-rose-300 truncate">{currentWardName}</p>
                  <p className="text-xs text-gray-400 font-mono">{currentBedNumber}</p>
                </div>
                <div className="p-2 rounded-full bg-accent/20 border border-accent/40 text-accent animate-pulse">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div className="flex-1 text-right">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-medium">Destination Bed</span>
                  <p className="text-xs font-bold text-emerald-300 truncate">{destinationWard?.name || 'Select Ward'}</p>
                  <p className="text-xs text-emerald-400 font-mono">{destinationBed?.bedNumber || 'Select Bed'}</p>
                </div>
              </div>
            </div>

            {/* Destination Ward Selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-accent" />
                  <span>Destination Hospital Ward</span>
                </span>
                {loadingWards && <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {wards.map((w) => {
                  const isSelected = selectedWardId === w.id;
                  const isCurrent = admission.wardId === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setSelectedWardId(w.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all relative ${
                        isSelected
                          ? 'bg-accent/15 border-accent text-white shadow-glow-accent/20'
                          : 'bg-white/[0.02] border-white/10 text-gray-300 hover:border-white/20 hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-xs text-white flex items-center gap-1.5">
                            <span>{w.name}</span>
                            {isCurrent && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Current
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 block mt-0.5">
                            {w.department || 'Inpatient Care'} • {w.wardNumber}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                            w.availableBeds > 0
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {w.availableBeds} avail
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Destination Bed Selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Bed className="w-3.5 h-3.5 text-accent" />
                  <span>Select Available Destination Bed</span>
                </span>
                {loadingBeds && <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />}
              </label>

              {availableBedsInWard.length === 0 && !loadingBeds ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>No beds currently available in {destinationWard?.name || 'this ward'}. Please select another ward.</span>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {beds.map((b) => {
                    const isAvailable = (b.isAvailable || b.status === 'AVAILABLE') && b.id !== admission.bedId;
                    const isCurrent = b.id === admission.bedId;
                    const isSelected = selectedBedId === b.id;

                    return (
                      <button
                        key={b.id}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => setSelectedBedId(b.id)}
                        className={`p-2 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'bg-accent text-navy-950 font-bold border-accent shadow-glow-accent'
                            : isCurrent
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 opacity-60 cursor-not-allowed'
                            : isAvailable
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 cursor-pointer'
                            : 'bg-white/[0.02] border-white/5 text-gray-600 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <Bed className="w-3.5 h-3.5 mx-auto mb-1 opacity-80" />
                        <span className="text-[11px] font-mono block leading-none">{b.bedNumber}</span>
                        <span className="text-[9px] block mt-0.5 opacity-80 uppercase">
                          {isCurrent ? 'Current' : isAvailable ? 'Avail' : 'Occupied'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Clinical Transfer Reason */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-accent" />
                <span>Clinical Reason for Bed Transfer</span>
              </label>

              {!isCustomReason ? (
                <div className="space-y-2">
                  <select
                    value={transferReason}
                    onChange={(e) => {
                      if (e.target.value === 'OTHER') {
                        setIsCustomReason(true);
                      } else {
                        setTransferReason(e.target.value);
                      }
                    }}
                    className="w-full bg-navy-950/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent"
                  >
                    {COMMON_TRANSFER_REASONS.map((r) => (
                      <option key={r} value={r} className="bg-navy-900 text-white">
                        {r}
                      </option>
                    ))}
                    <option value="OTHER" className="bg-navy-900 text-accent font-semibold">
                      + Enter Custom Clinical Reason...
                    </option>
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Enter detailed clinical indication (e.g., Post-PCI telemetry step-down)..."
                    className="w-full bg-navy-950/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setIsCustomReason(false)}
                    className="text-[11px] text-accent hover:underline cursor-pointer"
                  >
                    ← Choose from standard clinical reasons
                  </button>
                </div>
              )}
            </div>
          </form>

          {/* Footer Actions */}
          <div className="px-5 py-3.5 border-t border-white/10 flex items-center justify-between bg-navy-950/80">
            <span className="text-[11px] text-gray-400">
              Atomic transaction locks destination bed & releases current bed
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTransferSubmit}
                disabled={submitting || !selectedBedId || selectedBedId === admission.bedId}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-navy-950 bg-accent hover:bg-accent-light transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-glow-accent"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing Transfer...</span>
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Confirm Bed Transfer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
