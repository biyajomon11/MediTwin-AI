/**
 * CreatePrescriptionModal.tsx
 * Computerized Physician Order Entry (CPOE) & Electronic Prescription Modal
 * Includes Formulary Search, Tall Man Lettering, and Real-Time CDSS Safety Checks.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Pill,
  Plus,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Search,
  Send,
  Loader2,
} from 'lucide-react';
import type { DoctorPatient, Prescription } from '../../types';
import {
  searchFormulary,
  findMedicationByName,
  checkDrugInteractions,
  checkAllergyConflicts,
  validateDose,
  type SafetyAlert,
} from '../../utils/medicationSafety';
import { addPrescription } from '../../services/doctorService';
import { Button } from '../Button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patient: DoctorPatient;
  onPrescriptionCreated: (newRx: Prescription) => void;
}

interface MedicationDraftItem {
  id: string;
  name: string;
  tallManName: string;
  dosage: string;
  frequency: string;
  route: string;
  duration: string;
  instructions: string;
}

export const CreatePrescriptionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  patient,
  onPrescriptionCreated,
}) => {
  // Prescription items draft
  const [items, setItems] = useState<MedicationDraftItem[]>([
    {
      id: `item-${Date.now()}`,
      name: '',
      tallManName: '',
      dosage: '',
      frequency: 'Once Daily (Morning)',
      route: 'Oral',
      duration: '30 Days',
      instructions: 'Take with water after breakfast.',
    },
  ]);

  const [generalNotes, setGeneralNotes] = useState('');
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Active medications and allergies of the patient
  const activeMedNames = useMemo(() => {
    return (patient.currentMedications || []).map((m) => m.name);
  }, [patient]);

  // Compute live safety alerts for all draft items
  const allSafetyAlerts = useMemo(() => {
    const alerts: { itemId: string; medName: string; alert: SafetyAlert }[] = [];

    items.forEach((item) => {
      if (!item.name.trim()) return;

      // 1. Allergy conflicts
      const allergyAlerts = checkAllergyConflicts(patient.allergies || [], item.name);
      allergyAlerts.forEach((a) => alerts.push({ itemId: item.id, medName: item.name, alert: a }));

      // 2. Drug-Drug Interactions (against patient's existing meds + other items in this draft)
      const otherDraftMeds = items.filter((it) => it.id !== item.id && it.name).map((it) => it.name);
      const combinedActive = [...activeMedNames, ...otherDraftMeds];
      const ddiAlerts = checkDrugInteractions(combinedActive, item.name);
      ddiAlerts.forEach((a) => alerts.push({ itemId: item.id, medName: item.name, alert: a }));

      // 3. Overdose limits
      const doseRes = validateDose(item.name, item.dosage);
      if (!doseRes.isValid && doseRes.alert) {
        alerts.push({ itemId: item.id, medName: item.name, alert: doseRes.alert });
      }
    });

    return alerts;
  }, [items, patient, activeMedNames]);

  // Handle selecting a medicine from formulary
  const handleSelectMedication = (itemId: string, genericName: string) => {
    const match = findMedicationByName(genericName);
    const tallMan = match ? match.tallManName : genericName;
    const defaultStrength = match?.availableStrengths?.[0] || '10 mg';
    const defaultRoute = match?.commonRoutes?.[0] || 'Oral';
    const defaultFreq = match?.commonFrequencies?.[0] || 'Once Daily (Morning)';
    const defaultFood = match?.foodInstructions || 'Take with water.';

    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? {
              ...it,
              name: match ? match.genericName : genericName,
              tallManName: tallMan,
              dosage: defaultStrength,
              route: defaultRoute,
              frequency: defaultFreq,
              instructions: defaultFood,
            }
          : it
      )
    );
    setActiveDropdownId(null);
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: '',
        tallManName: '',
        dosage: '',
        frequency: 'Once Daily (Morning)',
        route: 'Oral',
        duration: '30 Days',
        instructions: 'Take after meals with water.',
      },
    ]);
  };

  const handleRemoveItem = (itemId: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validation
    const invalidItem = items.find((it) => !it.name.trim() || !it.dosage.trim());
    if (invalidItem) {
      setErrorMsg('Please select a valid medication name and dosage strength for each item.');
      return;
    }

    try {
      setSubmitting(true);
      const newRx = await addPrescription(patient.id, {
        medications: items.map((it) => ({
          name: it.tallManName || it.name,
          dosage: it.dosage,
          frequency: it.frequency,
          route: it.route,
          duration: it.duration,
          instructions: it.instructions,
        })),
        notes: generalNotes.trim() || undefined,
      });

      onPrescriptionCreated(newRx);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit prescription.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0B132B] border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* ── Modal Header ── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-navy-900 via-navy-800 to-navy-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
                <Pill className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  Computerized Physician Order Entry (CPOE)
                </h2>
                <p className="text-xs text-gray-400">
                  Prescribing for <span className="text-white font-semibold">{patient.firstName} {patient.lastName}</span> (ID: {patient.id})
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── Patient Baseline Quick Bar ── */}
          <div className="px-6 py-2.5 bg-white/5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-medium">Documented Allergies:</span>
              {patient.allergies && patient.allergies.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {patient.allergies.map((a, i) => {
                    const substance = typeof a === 'string' ? a : a.substance;
                    const isVerified = typeof a !== 'string' && a.verificationStatus?.startsWith('Verified');
                    const statusLabel = typeof a !== 'string' ? a.verificationStatus || 'Self-Reported' : 'Unverified';
                    return (
                      <span
                        key={i}
                        title={typeof a !== 'string' && a.verifiedBy ? `Verified by: ${a.verifiedBy}` : 'Patient Self-Reported'}
                        className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold flex items-center gap-1 ${
                          isVerified
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        <span>{isVerified ? '🛡️' : '⚠️'}</span>
                        <span>{substance}</span>
                        <span className="text-[9px] opacity-75">({statusLabel})</span>
                      </span>
                    );
                  })}
                </div>
              ) : (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  ✓ No Known Drug Allergies (NKDA)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-gray-400">
              <span>Active Meds:</span>
              <span className="text-white font-semibold">{patient.currentMedications?.length || 0}</span>
            </div>
          </div>

          {/* ── Modal Body / Form ── */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Live Safety Alerts Header (If any detected) */}
            {allSafetyAlerts.length > 0 && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  Clinical Decision Support: Safety Alerts ({allSafetyAlerts.length})
                </div>
                <div className="space-y-2">
                  {allSafetyAlerts.map((item, idx) => (
                    <div key={idx} className="text-xs p-2.5 rounded-lg bg-black/40 border border-rose-500/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-300">{item.alert.title}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400">
                          {item.alert.severity}
                        </span>
                      </div>
                      <p className="text-gray-300">{item.alert.description}</p>
                      <p className="text-accent text-[11px] font-medium italic">
                        💡 Recommendation: {item.alert.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {errorMsg}
              </div>
            )}

            {/* Medication Items List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Pill className="w-4 h-4 text-accent" /> Prescribed Medications ({items.length})
                </h3>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/15 text-accent text-xs font-semibold hover:bg-accent/25 border border-accent/30 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Another Medication
                </button>
              </div>

              {items.map((item, index) => {
                const match = findMedicationByName(item.name);
                const query = searchQueries[item.id] || '';
                const formularyMatches = searchFormulary(query || item.name);

                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-4 relative"
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                      <span className="text-xs font-bold text-accent uppercase tracking-wider">
                        Medication #{index + 1}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Medicine Search Autocomplete */}
                      <div className="space-y-1 relative md:col-span-2">
                        <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Drug Search & Formulary (Tall Man Lettering) <span className="text-rose-400">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={searchQueries[item.id] !== undefined ? searchQueries[item.id] : item.tallManName || item.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSearchQueries((p) => ({ ...p, [item.id]: val }));
                              setActiveDropdownId(item.id);
                            }}
                            onFocus={() => setActiveDropdownId(item.id)}
                            placeholder="Type to search generic or brand name (e.g. Amlodipine, Metformin, Augmentin)..."
                            className="w-full py-2.5 pl-9 pr-3 text-sm text-white bg-[#0F172A] border border-white/20 rounded-xl focus:outline-none focus:border-accent font-medium"
                          />
                          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        </div>

                        {/* Dropdown Options */}
                        {activeDropdownId === item.id && (
                          <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-[#0F172A] border border-white/20 rounded-xl shadow-2xl z-30 divide-y divide-white/10">
                            {formularyMatches.length === 0 ? (
                              <div className="p-3 text-xs text-gray-400 text-center">
                                No formulary match found. You can enter a custom medication name.
                              </div>
                            ) : (
                              formularyMatches.map((f) => (
                                <button
                                  key={f.id}
                                  type="button"
                                  onClick={() => {
                                    handleSelectMedication(item.id, f.genericName);
                                    setSearchQueries((p) => ({ ...p, [item.id]: f.tallManName }));
                                  }}
                                  className="w-full p-3 text-left hover:bg-white/10 flex items-center justify-between transition-colors"
                                >
                                  <div>
                                    <p className="text-sm font-bold text-white font-mono">{f.tallManName}</p>
                                    <p className="text-xs text-gray-400">
                                      {f.genericName} · Brands: {f.brandNames.join(', ')}
                                    </p>
                                  </div>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 font-medium">
                                    {f.category}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {/* Dosage Strength */}
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Dosage Strength <span className="text-rose-400">*</span>
                        </label>
                        {match && match.availableStrengths.length > 0 ? (
                          <div className="flex gap-2">
                            <select
                              value={item.dosage}
                              onChange={(e) =>
                                setItems((prev) =>
                                  prev.map((it) => (it.id === item.id ? { ...it, dosage: e.target.value } : it))
                                )
                              }
                              className="w-full py-2.5 px-3 text-sm text-white bg-[#0F172A] border border-white/20 rounded-xl focus:outline-none focus:border-accent cursor-pointer"
                            >
                              <option value="">— Select Strength —</option>
                              {match.availableStrengths.map((str) => (
                                <option key={str} value={str}>
                                  {str}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={item.dosage}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((it) => (it.id === item.id ? { ...it, dosage: e.target.value } : it))
                              )
                            }
                            placeholder="e.g. 5 mg, 500 mg, 1 puff"
                            className="w-full py-2.5 px-3 text-sm text-white bg-[#0F172A] border border-white/20 rounded-xl focus:outline-none focus:border-accent"
                          />
                        )}
                      </div>

                      {/* Route */}
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Route
                        </label>
                        <select
                          value={item.route}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((it) => (it.id === item.id ? { ...it, route: e.target.value } : it))
                            )
                          }
                          className="w-full py-2.5 px-3 text-sm text-white bg-[#0F172A] border border-white/20 rounded-xl focus:outline-none focus:border-accent cursor-pointer"
                        >
                          <option value="Oral">Oral (PO)</option>
                          <option value="IV">Intravenous (IV)</option>
                          <option value="IM">Intramuscular (IM)</option>
                          <option value="Subcutaneous">Subcutaneous (SC)</option>
                          <option value="Inhalation">Inhalation</option>
                          <option value="Topical">Topical</option>
                          <option value="Sublingual">Sublingual (SL)</option>
                        </select>
                      </div>

                      {/* Frequency */}
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Frequency & Timing
                        </label>
                        <select
                          value={item.frequency}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((it) => (it.id === item.id ? { ...it, frequency: e.target.value } : it))
                            )
                          }
                          className="w-full py-2.5 px-3 text-sm text-white bg-[#0F172A] border border-white/20 rounded-xl focus:outline-none focus:border-accent cursor-pointer"
                        >
                          <option value="Once Daily (Morning)">Once Daily (Morning / OD)</option>
                          <option value="Once Daily (Night / Bedtime)">Once Daily (Night / QHS)</option>
                          <option value="Twice Daily (Morning & Night)">Twice Daily (BD / BID)</option>
                          <option value="Three Times Daily with Meals">Three Times Daily (TID)</option>
                          <option value="Four Times Daily">Four Times Daily (QID)</option>
                          <option value="Every 6-8 Hours as Needed">Every 6-8 Hours (PRN)</option>
                        </select>
                      </div>

                      {/* Duration */}
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Duration
                        </label>
                        <select
                          value={item.duration}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((it) => (it.id === item.id ? { ...it, duration: e.target.value } : it))
                            )
                          }
                          className="w-full py-2.5 px-3 text-sm text-white bg-[#0F172A] border border-white/20 rounded-xl focus:outline-none focus:border-accent cursor-pointer"
                        >
                          <option value="5 Days">5 Days (Short Course)</option>
                          <option value="7 Days">7 Days</option>
                          <option value="14 Days">14 Days</option>
                          <option value="30 Days">30 Days (Standard 1 Month)</option>
                          <option value="60 Days">60 Days</option>
                          <option value="90 Days">90 Days (Chronic Supply)</option>
                          <option value="Ongoing / Chronic">Ongoing Maintenance</option>
                        </select>
                      </div>

                      {/* Food & Patient Intake Instructions */}
                      <div className="space-y-1 md:col-span-2">
                        <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Special Intake & Dietary Instructions
                        </label>
                        <input
                          type="text"
                          value={item.instructions}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((it) => (it.id === item.id ? { ...it, instructions: e.target.value } : it))
                            )
                          }
                          placeholder="e.g. Take 30 mins before breakfast with a full glass of water."
                          className="w-full py-2 px-3 text-xs text-white bg-[#0F172A] border border-white/20 rounded-xl focus:outline-none focus:border-accent"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* General Prescription Clinical Remarks */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Clinical Remarks / Follow-up Notes
              </label>
              <textarea
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Review blood pressure and renal panel in 4 weeks. Continue regular aerobic exercise."
                className="w-full py-2.5 px-3 text-xs text-white bg-white/5 border border-white/15 rounded-xl focus:outline-none focus:border-accent resize-none"
              />
            </div>
          </form>

          {/* ── Modal Footer ── */}
          <div className="px-6 py-4 border-t border-white/10 bg-gradient-to-r from-navy-900 via-navy-800 to-navy-900 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Cryptographically signed by attending physician</span>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="glass" size="md" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleSubmit}
                disabled={submitting}
                icon={submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              >
                {submitting ? 'Signing & Authorizing...' : 'Authorize & Issue Prescription'}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
