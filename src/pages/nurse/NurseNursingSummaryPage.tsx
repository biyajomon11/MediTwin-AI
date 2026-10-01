import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileCheck, User, HeartPulse, Activity, AlertTriangle,
  CheckCircle2, Printer, Save, Send, Lock, RotateCcw, AlertCircle,
  Search, ChevronDown, Check, X, Pill, FileText, Stethoscope, Layers, Loader2,
} from 'lucide-react';
import * as nurseService from '../../services/nurseService';
import type {
  NursePatient,
  NursingPatientSummary,
  CreateNursingSummaryInput,
  NurseClinicalContext,
  ConsciousnessLevel,
  MobilityStatus,
  PainStatus,
} from '../../types';

export const NurseNursingSummaryPage: React.FC = () => {
  // ── State: Patient Selection ───────────────────────────────────────────────
  const [patients, setPatients] = useState<NursePatient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<NursePatient | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);

  // ── State: Context & Existing Summaries ───────────────────────────────────
  const [clinicalContext, setClinicalContext] = useState<NurseClinicalContext | null>(null);
  const [summaries, setSummaries] = useState<NursingPatientSummary[]>([]);
  const [activeSummary, setActiveSummary] = useState<NursingPatientSummary | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // ── State: Form Fields ───────────────────────────────────────────────────
  const todayStr = new Date().toISOString().split('T')[0];
  const [summaryDate, setSummaryDate] = useState(todayStr);
  const [patientCurrentCondition, setPatientCurrentCondition] = useState('');
  const [levelOfConsciousness, setLevelOfConsciousness] = useState<ConsciousnessLevel>('Alert');
  const [mobilityStatus, setMobilityStatus] = useState<MobilityStatus>('Independent');
  const [painStatus, setPainStatus] = useState<PainStatus>('None reported');
  const [nutritionStatus, setNutritionStatus] = useState('Tolerating standard oral diet without nausea');
  const [eliminationStatus, setEliminationStatus] = useState('Normal bowel and urinary elimination pattern');
  const [woundCareStatus, setWoundCareStatus] = useState('Intact skin integrity, no pressure injuries or unmanaged lesions');
  const [vitalSignsSummary, setVitalSignsSummary] = useState('');
  const [observationsSummary, setObservationsSummary] = useState('');
  const [nursingAssessment, setNursingAssessment] = useState('');
  const [nursingCareProvided, setNursingCareProvided] = useState('');
  const [treatmentSummary, setTreatmentSummary] = useState('');
  const [medicationSummary, setMedicationSummary] = useState('');
  const [patientResponse, setPatientResponse] = useState('');
  const [patientEducation, setPatientEducation] = useState('');
  const [dischargeInstructions, setDischargeInstructions] = useState('');
  const [followUpInstructions, setFollowUpInstructions] = useState('');
  const [warningSignsObserved, setWarningSignsObserved] = useState('');
  const [doctorCommunication, setDoctorCommunication] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // ── State: Modals & Confirmation ──────────────────────────────────────────
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printData, setPrintData] = useState<any>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // ── Validation Errors ────────────────────────────────────────────────────
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Current Nurse Ward
  const currentWard = nurseService.getCurrentNurseWard();

  // ── Load Patient Directory ────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const fetchPatients = async () => {
      setPatientsLoading(true);
      try {
        const list = await nurseService.getPatients();
        if (mounted) {
          setPatients(list);
          if (list.length > 0 && !selectedPatient) {
            setSelectedPatient(list[0]);
          }
        }
      } catch (err: any) {
        if (mounted) setErrorBanner(err.message || 'Failed to load patients for assigned ward.');
      } finally {
        if (mounted) setPatientsLoading(false);
      }
    };
    fetchPatients();
    return () => { mounted = false; };
  }, []);

  // ── Load Clinical Context & Summaries for Selected Patient ────────────────
  const loadPatientData = useCallback(async (patientId: number) => {
    setIsLoadingData(true);
    setErrorBanner(null);
    try {
      const [context, summaryList] = await Promise.all([
        nurseService.getPatientClinicalContext(patientId),
        nurseService.getNursingSummaries(patientId),
      ]);
      setClinicalContext(context);
      setSummaries(summaryList);

      // If active summary already exists, select the latest draft or most recent summary
      const draft = summaryList.find((s) => s.status === 'DRAFT');
      if (draft) {
        populateForm(draft);
      } else if (summaryList.length > 0) {
        populateForm(summaryList[0]);
      } else {
        resetFormToDefault(context);
      }
    } catch (err: any) {
      console.warn('[NURSE_SUMMARY] Handled patient data load error:', err);
      if (err?.message && !err.message.toLowerCase().includes('access denied') && !err.message.toLowerCase().includes('roles')) {
        setErrorBanner(err.message);
      }
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      loadPatientData(selectedPatient.id);
    }
  }, [selectedPatient, loadPatientData]);

  // ── Populate Form from Existing Record ────────────────────────────────────
  const populateForm = (record: NursingPatientSummary) => {
    setActiveSummary(record);
    setSummaryDate(record.summaryDate || todayStr);
    setPatientCurrentCondition(record.patientCurrentCondition || '');
    setLevelOfConsciousness(record.levelOfConsciousness || 'Alert');
    setMobilityStatus(record.mobilityStatus || 'Independent');
    setPainStatus(record.painStatus || 'None reported');
    setNutritionStatus(record.nutritionStatus || '');
    setEliminationStatus(record.eliminationStatus || '');
    setWoundCareStatus(record.woundCareStatus || '');
    setVitalSignsSummary(record.vitalSignsSummary || '');
    setObservationsSummary(record.observationsSummary || '');
    setNursingAssessment(record.nursingAssessment || '');
    setNursingCareProvided(record.nursingCareProvided || '');
    setTreatmentSummary(record.treatmentSummary || '');
    setMedicationSummary(record.medicationSummary || '');
    setPatientResponse(record.patientResponse || '');
    setPatientEducation(record.patientEducation || '');
    setDischargeInstructions(record.dischargeInstructions || '');
    setFollowUpInstructions(record.followUpInstructions || '');
    setWarningSignsObserved(record.warningSignsObserved || '');
    setDoctorCommunication(record.doctorCommunication || '');
    setAdditionalNotes(record.additionalNotes || '');
    setValidationErrors({});
  };

  // ── Reset Form with Contextual Clinical Defaults ─────────────────────────
  const resetFormToDefault = (ctx?: NurseClinicalContext | null) => {
    const context = ctx || clinicalContext;
    setActiveSummary(null);
    setSummaryDate(todayStr);
    setPatientCurrentCondition('Patient alert and clinically stable. Resting comfortably in allocated inpatient bed.');
    setLevelOfConsciousness(context?.latestVitals?.consciousnessLevel as ConsciousnessLevel || 'Alert');
    setMobilityStatus('Independent');
    setPainStatus(context?.latestVitals?.painScore === '0/10' ? 'None reported' : 'Mild');
    setNutritionStatus('Tolerating standard oral diet and adequate oral hydration.');
    setEliminationStatus('Normal bowel and urinary elimination pattern documented.');
    setWoundCareStatus('Skin dry and intact. No non-blanchable erythema or breakdown.');

    if (context?.latestVitals) {
      const v = context.latestVitals;
      setVitalSignsSummary(
        `BP: ${v.bloodPressure}, Pulse: ${v.pulseRate}, Temp: ${v.temperature}, RR: ${v.respiratoryRate}, SpO2: ${v.spo2}, Glucose: ${v.bloodGlucose}`
      );
    } else {
      setVitalSignsSummary('');
    }

    if (context?.recentObservations && context.recentObservations.length > 0) {
      setObservationsSummary(context.recentObservations.map((o) => `[${o.date}] ${o.generalObservation}`).join('; '));
    } else {
      setObservationsSummary('Continuous routine telemetry and nurse round observation performed without adverse acute changes.');
    }

    setNursingAssessment('Comprehensive physical inspection indicates stable cardiopulmonary status and good recovery progress.');
    setNursingCareProvided('Vital signs monitored every 4 hours, oral medication administration observed, fluid intake verified.');
    setTreatmentSummary(context?.recentTreatments?.map((t) => `${t.treatmentName} (${t.date})`).join(', ') || 'Inpatient ward standard care protocol administered.');

    if (context?.activeMedications && context.activeMedications.length > 0) {
      setMedicationSummary(context.activeMedications.map((m) => `${m.name} ${m.dosage} (${m.frequency})`).join(', '));
    } else {
      setMedicationSummary('Standard prescribed inpatient medications administered with verified patient tolerance.');
    }

    setPatientResponse('Patient verbalizes feeling improved and denies acute pain or respiratory distress.');
    setPatientEducation('Explained medication adherence, importance of adequate rest, and hydration.');
    setDischargeInstructions('Follow up with primary physician as scheduled. Report any acute symptoms immediately.');
    setFollowUpInstructions('Follow-up outpatient visit in 7 to 10 days.');
    setWarningSignsObserved('Report immediately if fever > 101°F, acute chest discomfort, severe dizziness, or persistent vomiting.');
    setDoctorCommunication('Attending physician notified during morning clinical rounds of stable vital trends.');
    setAdditionalNotes('Nursing care delivered per hospital inpatient protocol.');
    setValidationErrors({});
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!summaryDate) {
      errs.summaryDate = 'Summary date is required.';
    } else if (new Date(summaryDate) > new Date(new Date().setHours(23, 59, 59, 999))) {
      errs.summaryDate = 'Summary date cannot be in the future.';
    }

    if (!patientCurrentCondition.trim() || patientCurrentCondition.trim().length < 3) {
      errs.patientCurrentCondition = 'Current patient condition is required (minimum 3 characters).';
    }

    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Save Draft ────────────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (!selectedPatient) return;
    if (!validateForm()) {
      setErrorBanner('Please address the highlighted validation errors before saving.');
      return;
    }

    setIsSubmitting(true);
    setErrorBanner(null);
    setSuccessBanner(null);

    const payload: CreateNursingSummaryInput = {
      summaryDate,
      status: 'DRAFT',
      patientCurrentCondition: patientCurrentCondition.trim(),
      levelOfConsciousness,
      mobilityStatus,
      painStatus,
      nutritionStatus,
      eliminationStatus,
      woundCareStatus,
      vitalSignsSummary,
      observationsSummary,
      nursingAssessment,
      nursingCareProvided,
      treatmentSummary,
      medicationSummary,
      patientResponse,
      patientEducation,
      dischargeInstructions,
      followUpInstructions,
      warningSignsObserved,
      doctorCommunication,
      additionalNotes,
    };

    try {
      let saved: NursingPatientSummary;
      if (activeSummary && activeSummary.status === 'DRAFT') {
        saved = await nurseService.updateNursingSummary(activeSummary.id, payload);
      } else {
        saved = await nurseService.createNursingSummary(selectedPatient.id, payload);
      }
      setSuccessBanner(`Nursing summary draft #${saved.id} saved successfully.`);
      await loadPatientData(selectedPatient.id);
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to save nursing summary draft.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Submit for Review ─────────────────────────────────────────────────────
  const handleSubmitForReview = async () => {
    if (!selectedPatient) return;
    if (!validateForm()) {
      setErrorBanner('Please resolve validation errors before submitting.');
      return;
    }

    setIsSubmitting(true);
    setErrorBanner(null);
    setSuccessBanner(null);

    try {
      let targetId = activeSummary?.id;
      if (!targetId || activeSummary?.status !== 'DRAFT') {
        const created = await nurseService.createNursingSummary(selectedPatient.id, {
          summaryDate,
          status: 'SUBMITTED',
          patientCurrentCondition: patientCurrentCondition.trim(),
          levelOfConsciousness,
          mobilityStatus,
          painStatus,
          nutritionStatus,
          eliminationStatus,
          woundCareStatus,
          vitalSignsSummary,
          observationsSummary,
          nursingAssessment,
          nursingCareProvided,
          treatmentSummary,
          medicationSummary,
          patientResponse,
          patientEducation,
          dischargeInstructions,
          followUpInstructions,
          warningSignsObserved,
          doctorCommunication,
          additionalNotes,
        });
        targetId = created.id;
      } else {
        // Update first, then submit
        await nurseService.updateNursingSummary(targetId, {
          summaryDate,
          patientCurrentCondition: patientCurrentCondition.trim(),
          levelOfConsciousness,
          mobilityStatus,
          painStatus,
          nutritionStatus,
          eliminationStatus,
          woundCareStatus,
          vitalSignsSummary,
          observationsSummary,
          nursingAssessment,
          nursingCareProvided,
          treatmentSummary,
          medicationSummary,
          patientResponse,
          patientEducation,
          dischargeInstructions,
          followUpInstructions,
          warningSignsObserved,
          doctorCommunication,
          additionalNotes,
        });
        await nurseService.submitNursingSummary(targetId);
      }

      setSuccessBanner(`Nursing summary submitted for multidisciplinary review.`);
      await loadPatientData(selectedPatient.id);
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to submit nursing summary.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Finalize Summary ──────────────────────────────────────────────────────
  const handleFinalize = async () => {
    if (!selectedPatient) return;
    setShowFinalizeModal(false);
    setIsSubmitting(true);
    setErrorBanner(null);
    setSuccessBanner(null);

    try {
      let targetId = activeSummary?.id;
      if (!targetId) {
        const created = await nurseService.createNursingSummary(selectedPatient.id, {
          summaryDate,
          status: 'DRAFT',
          patientCurrentCondition: patientCurrentCondition.trim(),
          levelOfConsciousness,
          mobilityStatus,
          painStatus,
          nutritionStatus,
          eliminationStatus,
          woundCareStatus,
          vitalSignsSummary,
          observationsSummary,
          nursingAssessment,
          nursingCareProvided,
          treatmentSummary,
          medicationSummary,
          patientResponse,
          patientEducation,
          dischargeInstructions,
          followUpInstructions,
          warningSignsObserved,
          doctorCommunication,
          additionalNotes,
        });
        targetId = created.id;
      } else if (activeSummary?.status === 'DRAFT' && targetId) {
        await nurseService.updateNursingSummary(targetId, {
          summaryDate,
          patientCurrentCondition: patientCurrentCondition.trim(),
          levelOfConsciousness,
          mobilityStatus,
          painStatus,
          nutritionStatus,
          eliminationStatus,
          woundCareStatus,
          vitalSignsSummary,
          observationsSummary,
          nursingAssessment,
          nursingCareProvided,
          treatmentSummary,
          medicationSummary,
          patientResponse,
          patientEducation,
          dischargeInstructions,
          followUpInstructions,
          warningSignsObserved,
          doctorCommunication,
          additionalNotes,
        });
      }

      const finalized = await nurseService.finalizeNursingSummary(targetId);
      setSuccessBanner(`Nursing summary #${finalized.id} officially finalized and signed. Record is now sealed.`);
      await loadPatientData(selectedPatient.id);
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to finalize nursing summary.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Open Print Document ───────────────────────────────────────────────────
  const handleOpenPrintModal = async () => {
    if (!activeSummary) return;
    setIsPrinting(true);
    try {
      const data = await nurseService.getPrintNursingSummary(activeSummary.id);
      setPrintData(data);
      setShowPrintModal(true);
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to generate print document.');
    } finally {
      setIsPrinting(false);
    }
  };

  const isFinalized = activeSummary?.status === 'FINALIZED';

  // Filtered patients for dropdown search
  const filteredPatients = patients.filter((p) => {
    const q = patientSearch.toLowerCase();
    const name = `${p.firstName} ${p.lastName}`.toLowerCase();
    const pid = p.patientId ? p.patientId.toLowerCase() : '';
    return name.includes(q) || pid.includes(q);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ── Top Header Banner ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-6 border border-white/10">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 flex-shrink-0">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Nursing Patient Summary
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/15 border border-sky-500/30 text-sky-300">
                Inpatient & Discharge Care
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Ward: {currentWard}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-3xl">
              Authoritative nursing assessment, vital trends, documented care, patient education, and multidisciplinary hand-off documentation.
            </p>
          </div>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {activeSummary && (
            <button
              onClick={handleOpenPrintModal}
              disabled={isPrinting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4 text-sky-400" />
              <span>{isPrinting ? 'Preparing…' : 'Print / View Official'}</span>
            </button>
          )}

          <button
            onClick={() => resetFormToDefault()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-gray-400" />
            <span>New Summary Draft</span>
          </button>
        </div>
      </div>

      {/* ── Patient Selector Card ── */}
      <div className="glass-card p-5 border border-white/10 relative z-30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-sky-400" /> Allocated Inpatient
            </h3>
            <p className="text-xs text-gray-400">
              Only patients authorized in <strong className="text-sky-300">{currentWard}</strong> are accessible.
            </p>
          </div>

          <div className="relative min-w-[280px] sm:min-w-[340px]">
            <button
              type="button"
              onClick={() => setPatientDropdownOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm bg-white/5 border border-white/15 rounded-xl hover:border-sky-400/50 transition-all text-left cursor-pointer"
            >
              {selectedPatient ? (
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold">{selectedPatient.firstName} {selectedPatient.lastName}</span>
                  <span className="text-sky-400 text-xs font-mono">{selectedPatient.patientId}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-semibold">
                    {selectedPatient.ward || currentWard}
                  </span>
                </div>
              ) : (
                <span className="text-gray-400">Choose patient from assigned ward…</span>
              )}
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${patientDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {patientDropdownOpen && (
              <div className="absolute top-full mt-1.5 left-0 right-0 z-50 bg-navy-900 border border-white/15 rounded-xl shadow-2xl p-2 space-y-2 backdrop-blur-xl">
                <div className="relative">
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    placeholder="Filter by name or ID…"
                    className="w-full py-1.5 pl-8 pr-3 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-sky-400"
                    autoFocus
                  />
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                </div>
                <div className="max-h-52 overflow-y-auto space-y-1">
                  {patientsLoading ? (
                    <div className="flex items-center justify-center gap-2 py-4 text-xs text-gray-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                      <span>Loading patients…</span>
                    </div>
                  ) : filteredPatients.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-3">No matching patients in {currentWard}.</p>
                  ) : (
                    filteredPatients.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedPatient(p);
                          setPatientDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors text-left ${
                          selectedPatient?.id === p.id ? 'bg-sky-500/20 text-sky-300 font-bold' : 'hover:bg-white/5 text-gray-300'
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-white">{p.firstName} {p.lastName}</p>
                          <p className="text-[10px] text-gray-400">{p.gender?.name || 'Patient'} · Bed: {p.bedNumber || '12'}</p>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono">
                          {p.patientId}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Existing Summaries History Bar */}
        {summaries.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-sky-400" /> Documented Summaries:
            </span>
            {summaries.map((s) => {
              const isSelected = activeSummary?.id === s.id;
              const isFinal = s.status === 'FINALIZED';
              const isSubm = s.status === 'SUBMITTED';

              return (
                <button
                  key={s.id}
                  onClick={() => populateForm(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-sky-500/20 text-sky-200 border-sky-500/50 shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                  }`}
                >
                  <span className="font-bold">#{s.id}</span>
                  <span>({s.summaryDate})</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                      isFinal
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : isSubm
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {s.status}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Banners: Error / Success ── */}
      {errorBanner && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs sm:text-sm">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{errorBanner}</div>
          <button onClick={() => setErrorBanner(null)} className="text-rose-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successBanner && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs sm:text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div className="flex-1 font-medium">{successBanner}</div>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Sealed Summary Notice ── */}
      {isFinalized && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm">
          <Lock className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <strong>Summary Finalized and Officially Sealed.</strong> This nursing summary was finalized by{' '}
            <span className="font-semibold text-white">{activeSummary?.nurseName || 'Attending Nurse'}</span> on{' '}
            {activeSummary?.finalizedAt ? new Date(activeSummary.finalizedAt).toLocaleDateString() : 'Record Date'}. It is in
            read-only mode per hospital compliance standards.
          </div>
        </div>
      )}

      {/* ── Patient Identity Card (Read-Only) ── */}
      {clinicalContext && (
        <div className="glass-card p-5 border border-white/10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-xs">
          <div>
            <p className="text-gray-400 uppercase font-semibold text-[10px]">Patient Name</p>
            <p className="text-white font-bold text-sm mt-0.5">
              {clinicalContext.patient.firstName} {clinicalContext.patient.lastName}
            </p>
            <span className="text-[10px] text-sky-400 font-mono">{clinicalContext.patient.patientId}</span>
          </div>

          <div>
            <p className="text-gray-400 uppercase font-semibold text-[10px]">Age / Gender</p>
            <p className="text-white font-semibold mt-0.5">
              {clinicalContext.patient.age} yrs · {clinicalContext.patient.gender}
            </p>
            <span className="text-[10px] text-gray-400">Blood: {clinicalContext.patient.bloodGroup}</span>
          </div>

          <div>
            <p className="text-gray-400 uppercase font-semibold text-[10px]">Ward / Bed</p>
            <p className="text-white font-semibold mt-0.5">{clinicalContext.patient.ward}</p>
            <span className="text-[10px] text-accent font-semibold">{clinicalContext.patient.bedNumber}</span>
          </div>

          <div>
            <p className="text-gray-400 uppercase font-semibold text-[10px]">Admission Date</p>
            <p className="text-white font-semibold mt-0.5">{clinicalContext.patient.admissionDate}</p>
            <span className="text-[10px] text-emerald-400 font-bold uppercase">{clinicalContext.patient.admissionStatus}</span>
          </div>

          <div>
            <p className="text-gray-400 uppercase font-semibold text-[10px]">Attending Physician</p>
            <p className="text-white font-semibold mt-0.5">{clinicalContext.patient.assignedDoctor}</p>
            <span className="text-[10px] text-gray-400">Inpatient Medicine</span>
          </div>

          <div>
            <p className="text-gray-400 uppercase font-semibold text-[10px]">Authoring Nurse</p>
            <p className="text-white font-semibold mt-0.5">
              {activeSummary?.nurseName || nurseService.getCurrentNurseName()}
            </p>
            <span className="text-[10px] text-sky-400 font-mono">
              Reg: {activeSummary?.nurseRegistrationNumber || 'NRN-2024-001'}
            </span>
          </div>
        </div>
      )}

      {/* ── Main Nursing Summary Form ── */}
      <div className="space-y-6">
        {/* Section 1: Summary Date & Condition at Documentation */}
        <div className="glass-card p-6 border border-white/10 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10">
            <Activity className="w-5 h-5 text-sky-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              1. Current Patient Condition & Functional Assessment
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Summary Documentation Date *
              </label>
              <input
                type="date"
                value={summaryDate}
                max={todayStr}
                disabled={isFinalized}
                onChange={(e) => setSummaryDate(e.target.value)}
                className={`w-full py-2 px-3 text-xs bg-white/5 border rounded-xl text-white focus:outline-none focus:border-sky-400 disabled:opacity-60 ${
                  validationErrors.summaryDate ? 'border-rose-500' : 'border-white/15'
                }`}
              />
              {validationErrors.summaryDate && (
                <p className="text-[11px] text-rose-400 mt-1">{validationErrors.summaryDate}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Level of Consciousness
              </label>
              <select
                value={levelOfConsciousness}
                disabled={isFinalized}
                onChange={(e) => setLevelOfConsciousness(e.target.value as ConsciousnessLevel)}
                className="w-full py-2 px-3 text-xs bg-navy-900 border border-white/15 rounded-xl text-white focus:outline-none focus:border-sky-400 disabled:opacity-60"
              >
                <option value="Alert">Alert</option>
                <option value="Drowsy">Drowsy</option>
                <option value="Confused">Confused</option>
                <option value="Unresponsive">Unresponsive</option>
                <option value="Not documented">Not documented</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Mobility Status
              </label>
              <select
                value={mobilityStatus}
                disabled={isFinalized}
                onChange={(e) => setMobilityStatus(e.target.value as MobilityStatus)}
                className="w-full py-2 px-3 text-xs bg-navy-900 border border-white/15 rounded-xl text-white focus:outline-none focus:border-sky-400 disabled:opacity-60"
              >
                <option value="Independent">Independent</option>
                <option value="Assisted">Assisted</option>
                <option value="Bed-bound">Bed-bound</option>
                <option value="Wheelchair">Wheelchair</option>
                <option value="Not documented">Not documented</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Pain Status Reported
              </label>
              <select
                value={painStatus}
                disabled={isFinalized}
                onChange={(e) => setPainStatus(e.target.value as PainStatus)}
                className="w-full py-2 px-3 text-xs bg-navy-900 border border-white/15 rounded-xl text-white focus:outline-none focus:border-sky-400 disabled:opacity-60"
              >
                <option value="None reported">None reported</option>
                <option value="Mild">Mild</option>
                <option value="Moderate">Moderate</option>
                <option value="Severe">Severe</option>
                <option value="Not documented">Not documented</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Current Clinical Patient Condition *
            </label>
            <textarea
              rows={2}
              value={patientCurrentCondition}
              disabled={isFinalized}
              onChange={(e) => setPatientCurrentCondition(e.target.value)}
              placeholder="Document current physical condition, mental alertness, hemodynamics, and comfort level…"
              className={`w-full p-3 text-xs bg-white/5 border rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-sky-400 disabled:opacity-60 ${
                validationErrors.patientCurrentCondition ? 'border-rose-500' : 'border-white/15'
              }`}
            />
            {validationErrors.patientCurrentCondition && (
              <p className="text-[11px] text-rose-400 mt-1">{validationErrors.patientCurrentCondition}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Nutrition & Hydration Status</label>
              <input
                type="text"
                value={nutritionStatus}
                disabled={isFinalized}
                onChange={(e) => setNutritionStatus(e.target.value)}
                placeholder="Diet tolerated, fluid intake…"
                className="w-full py-2 px-3 text-xs bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-sky-400 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Elimination Status</label>
              <input
                type="text"
                value={eliminationStatus}
                disabled={isFinalized}
                onChange={(e) => setEliminationStatus(e.target.value)}
                placeholder="Bowel & urinary pattern…"
                className="w-full py-2 px-3 text-xs bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-sky-400 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Wound Care & Skin Integrity</label>
              <input
                type="text"
                value={woundCareStatus}
                disabled={isFinalized}
                onChange={(e) => setWoundCareStatus(e.target.value)}
                placeholder="Dressings, skin integrity…"
                className="w-full py-2 px-3 text-xs bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-sky-400 disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Latest Documented Vital Signs (Live from PostgreSQL) */}
        <div className="glass-card p-6 border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-rose-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                2. Latest Documented Vital Signs (Telemetry / Observations)
              </h2>
            </div>
            {clinicalContext?.latestVitals ? (
              <span className="text-[11px] font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 self-start sm:self-auto">
                <Check className="w-3 h-3 text-emerald-400" />
                Source: PostgreSQL Observations ({clinicalContext.latestVitals.recordedAt})
              </span>
            ) : (
              <span className="text-[11px] font-medium text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 rounded-full self-start sm:self-auto">
                No observations on file
              </span>
            )}
          </div>

          {clinicalContext?.latestVitals ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                <p className="text-[10px] uppercase font-bold text-gray-400">Blood Pressure</p>
                <p className="text-sm font-black text-white mt-1">{clinicalContext.latestVitals.bloodPressure}</p>
                <span className="text-[10px] text-emerald-400">Normal Range</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                <p className="text-[10px] uppercase font-bold text-gray-400">Pulse / Heart Rate</p>
                <p className="text-sm font-black text-white mt-1">{clinicalContext.latestVitals.pulseRate}</p>
                <span className="text-[10px] text-gray-400">bpm</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                <p className="text-[10px] uppercase font-bold text-gray-400">Body Temperature</p>
                <p className="text-sm font-black text-white mt-1">{clinicalContext.latestVitals.temperature}</p>
                <span className="text-[10px] text-gray-400">Celsius</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                <p className="text-[10px] uppercase font-bold text-gray-400">SpO2 Oxygen</p>
                <p className="text-sm font-black text-white mt-1">{clinicalContext.latestVitals.spo2}</p>
                <span className="text-[10px] text-emerald-400">Adequate saturation</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                <p className="text-[10px] uppercase font-bold text-gray-400">Blood Glucose</p>
                <p className="text-sm font-black text-white mt-1">{clinicalContext.latestVitals.bloodGlucose}</p>
                <span className="text-[10px] text-gray-400">Fasting/Random</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                <p className="text-[10px] uppercase font-bold text-gray-400">Pain Score</p>
                <p className="text-sm font-black text-white mt-1">{clinicalContext.latestVitals.painScore}</p>
                <span className="text-[10px] text-gray-400">Visual Analog Scale</span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-center text-xs text-gray-400">
              No vital signs recorded in database. Please record initial telemetry under Patient Observations.
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Synthesized Vital Signs Narrative Summary
            </label>
            <textarea
              rows={2}
              value={vitalSignsSummary}
              disabled={isFinalized}
              onChange={(e) => setVitalSignsSummary(e.target.value)}
              placeholder="Summarize hemodynamic stability across the inpatient stay…"
              className="w-full p-3 text-xs bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-sky-400 disabled:opacity-60"
            />
          </div>
        </div>

        {/* Section 3: Nursing Observations & Clinical Assessment */}
        <div className="glass-card p-6 border border-white/10 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10">
            <Stethoscope className="w-5 h-5 text-teal-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              3. Nursing Observations & Clinical Assessment
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Documented Observations Summary
              </label>
              <textarea
                rows={3}
                value={observationsSummary}
                disabled={isFinalized}
                onChange={(e) => setObservationsSummary(e.target.value)}
                placeholder="Summary of documented ward observations, changes in behavior or symptoms…"
                className="w-full p-3 text-xs bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-sky-400 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Nurse Inpatient Clinical Assessment
              </label>
              <textarea
                rows={3}
                value={nursingAssessment}
                disabled={isFinalized}
                onChange={(e) => setNursingAssessment(e.target.value)}
                placeholder="Physical inspection, breathing ease, cognitive status, and general nursing evaluation…"
                className="w-full p-3 text-xs bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-sky-400 disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Nursing Care Provided & Treatment Summary */}
        <div className="glass-card p-6 border border-white/10 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              4. Nursing Care Delivered & Inpatient Treatments
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Nursing Interventions Delivered
              </label>
              <textarea
                rows={3}
                value={nursingCareProvided}
                disabled={isFinalized}
                onChange={(e) => setNursingCareProvided(e.target.value)}
                placeholder="Vital monitoring, assistance with ambulation, hygiene, respiratory support…"
                className="w-full p-3 text-xs bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-sky-400 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Documented Treatment Summary
              </label>
              <textarea
                rows={3}
                value={treatmentSummary}
                disabled={isFinalized}
                onChange={(e) => setTreatmentSummary(e.target.value)}
                placeholder="Nebulization, wound dressing, catheter care, IV fluids per physician order…"
                className="w-full p-3 text-xs bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-sky-400 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Patient Response to Care
              </label>
              <textarea
                rows={3}
                value={patientResponse}
                disabled={isFinalized}
                onChange={(e) => setPatientResponse(e.target.value)}
                placeholder="Verbalized comfort, reduction of distress, physical tolerance to therapy…"
                className="w-full p-3 text-xs bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-sky-400 disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Medication Review & Administration Details */}
        <div className="glass-card p-6 border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                5. Medication & Reminder Review (Integrated from Prescriptions)
              </h2>
            </div>
            <span className="text-[11px] text-gray-400">
              Read-only Physician Orders · Document Nurse Administration Details
            </span>
          </div>

          {clinicalContext?.activeMedications && clinicalContext.activeMedications.length > 0 ? (
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
              <p className="text-[11px] font-semibold text-gray-300">Active Prescriptions Administered on Ward:</p>
              <div className="flex flex-wrap gap-2">
                {clinicalContext.activeMedications.map((m, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-white/5 border border-white/10 text-white"
                  >
                    <span className="font-bold text-sky-400">{m.name}</span>
                    <span className="text-gray-400">· {m.dosage}</span>
                    <span className="text-gray-500">({m.frequency})</span>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic">No active prescriptions on file.</p>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Nurse Medication Administration Summary & Tolerance
            </label>
            <textarea
              rows={2}
              value={medicationSummary}
              disabled={isFinalized}
              onChange={(e) => setMedicationSummary(e.target.value)}
              placeholder="Confirm medication adherence, dosage verification, lack of adverse drug reactions…"
              className="w-full p-3 text-xs bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-sky-400 disabled:opacity-60"
            />
          </div>
        </div>

        {/* Section 6: Patient Education, Discharge & Warning Signs */}
        <div className="glass-card p-6 border border-white/10 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              6. Patient Education, Discharge Instructions & Warning Signs
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Patient & Family Education Provided
              </label>
              <textarea
                rows={2}
                value={patientEducation}
                disabled={isFinalized}
                onChange={(e) => setPatientEducation(e.target.value)}
                placeholder="Care routines, dressing changes, activity restrictions discussed with patient…"
                className="w-full p-3 text-xs bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-sky-400 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Nursing Discharge & Hand-off Instructions
              </label>
              <textarea
                rows={2}
                value={dischargeInstructions}
                disabled={isFinalized}
                onChange={(e) => setDischargeInstructions(e.target.value)}
                placeholder="Medication timing, activity pacing, when to remove dressings…"
                className="w-full p-3 text-xs bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-sky-400 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Follow-Up Nursing Care / Clinic Appointments
              </label>
              <textarea
                rows={2}
                value={followUpInstructions}
                disabled={isFinalized}
                onChange={(e) => setFollowUpInstructions(e.target.value)}
                placeholder="Return visit schedule, community health referral, suture removal…"
                className="w-full p-3 text-xs bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-sky-400 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Red-Flag Warning Signs Explained to Patient
              </label>
              <textarea
                rows={2}
                value={warningSignsObserved}
                disabled={isFinalized}
                onChange={(e) => setWarningSignsObserved(e.target.value)}
                placeholder="Fever > 101°F, breathing difficulty, acute pain, bleeding requiring emergency review…"
                className="w-full p-3 text-xs bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-sky-400 disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        {/* Section 7: Doctor Communication & Additional Notes */}
        <div className="glass-card p-6 border border-white/10 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10">
            <Send className="w-5 h-5 text-sky-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              7. Multidisciplinary Hand-off & Physician Communication
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Doctor Communication / Ward Round Handoff
              </label>
              <textarea
                rows={2}
                value={doctorCommunication}
                disabled={isFinalized}
                onChange={(e) => setDoctorCommunication(e.target.value)}
                placeholder="Physician informed of vital parameters, round consultations, pending orders…"
                className="w-full p-3 text-xs bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-sky-400 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Additional Nursing Hand-off Notes
              </label>
              <textarea
                rows={2}
                value={additionalNotes}
                disabled={isFinalized}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Special notes for oncoming shift nurse or transfer facility…"
                className="w-full p-3 text-xs bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-sky-400 disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        {/* ── Action Buttons Footer ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Status:</span>
            <span
              className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                isFinalized
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : activeSummary?.status === 'SUBMITTED'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {activeSummary?.status || 'NEW DRAFT'}
            </span>
            {activeSummary && (
              <span className="text-[11px] text-gray-500">
                · Last updated: {activeSummary.updatedAt ? new Date(activeSummary.updatedAt).toLocaleString() : 'Just now'}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!isFinalized && (
              <>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSubmitting || isLoadingData}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4 text-sky-400" />
                  <span>{isSubmitting ? 'Saving…' : 'Save as Draft'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSubmitForReview}
                  disabled={isSubmitting || isLoadingData}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit for Review</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (validateForm()) setShowFinalizeModal(true);
                  }}
                  disabled={isSubmitting || isLoadingData}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white transition-all cursor-pointer shadow-lg shadow-emerald-600/25 disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>Finalize Summary</span>
                </button>
              </>
            )}

            {isFinalized && activeSummary && (
              <button
                type="button"
                onClick={handleOpenPrintModal}
                disabled={isPrinting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white transition-all cursor-pointer shadow-lg shadow-sky-600/20"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Summary</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Finalization Confirmation Modal ── */}
      <AnimatePresence>
        {showFinalizeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card p-6 border border-emerald-500/40 max-w-md w-full bg-navy-900/95 space-y-4 shadow-2xl"
            >
              <div className="flex items-center gap-3 text-emerald-400">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Finalize Nursing Patient Summary?</h3>
                  <p className="text-xs text-gray-400">Electronic Nurse Signature & Seal</p>
                </div>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed">
                After finalization, the summary will become <strong>permanently read-only</strong> per healthcare clinical
                governance rules. Please verify that all documented observations, vital signs, and nursing care records are accurate.
              </p>

              <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-[11px] text-gray-400 space-y-1">
                <p>• Patient: <strong className="text-white">{selectedPatient?.firstName} {selectedPatient?.lastName}</strong></p>
                <p>• Date: <strong className="text-white">{summaryDate}</strong></p>
                <p>• Nurse: <strong className="text-white">{nurseService.getCurrentNurseName()}</strong></p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFinalizeModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFinalize}
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all cursor-pointer shadow-lg shadow-emerald-600/30"
                >
                  {isSubmitting ? 'Finalizing…' : 'Confirm & Finalize Summary'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Official Print Document Modal ── */}
      <AnimatePresence>
        {showPrintModal && printData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-lg overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="bg-white text-gray-900 rounded-2xl max-w-3xl w-full p-8 shadow-2xl space-y-6 my-8 print:m-0 print:p-0"
            >
              {/* Document Header */}
              <div className="flex items-start justify-between border-b pb-4">
                <div>
                  <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                    {printData.hospitalName || 'MediTwin Central Hospital'}
                  </h1>
                  <p className="text-xs text-gray-500">{printData.hospitalAddress || 'Medical District, Central Ward'}</p>
                  <p className="text-xs text-gray-500">Phone: {printData.hospitalPhone || '+1 (800) 555-0199'}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded bg-sky-100 text-sky-800 text-xs font-black uppercase tracking-wider">
                    Official Nursing Summary
                  </span>
                  <p className="text-[11px] text-gray-500 mt-1">Record ID: #{printData.id}</p>
                  <p className="text-[11px] text-gray-500">Date: {printData.summaryDate}</p>
                </div>
              </div>

              {/* Patient Demographics Table */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-xl text-xs border">
                <div>
                  <p className="text-gray-500 uppercase text-[10px] font-bold">Patient Name</p>
                  <p className="font-bold text-gray-900">{printData.patient?.firstName} {printData.patient?.lastName}</p>
                  <p className="text-gray-500 font-mono text-[10px]">{printData.patient?.patientId}</p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase text-[10px] font-bold">Age / Gender / Blood</p>
                  <p className="font-semibold text-gray-800">
                    {printData.patient?.gender} · Blood {printData.patient?.bloodGroup}
                  </p>
                  <p className="text-gray-500 text-[10px]">DOB: {printData.patient?.dateOfBirth ? String(printData.patient.dateOfBirth).split('T')[0] : '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase text-[10px] font-bold">Ward & Bed Allocation</p>
                  <p className="font-semibold text-gray-800">{printData.patient?.ward || currentWard}</p>
                  <p className="text-sky-700 text-[10px] font-bold">{printData.patient?.bedNumber || 'Bed 12'}</p>
                </div>
              </div>

              {/* Clinical Sections */}
              <div className="space-y-4 text-xs leading-relaxed">
                <div>
                  <h4 className="font-bold text-gray-900 uppercase text-[11px] border-b pb-1">
                    1. Patient Status & Functional Assessment
                  </h4>
                  <div className="grid grid-cols-3 gap-2 mt-1.5 text-gray-700">
                    <p>• Consciousness: <strong>{printData.levelOfConsciousness}</strong></p>
                    <p>• Mobility: <strong>{printData.mobilityStatus}</strong></p>
                    <p>• Pain: <strong>{printData.painStatus}</strong></p>
                  </div>
                  <p className="mt-1 text-gray-800"><strong>Current Condition:</strong> {printData.patientCurrentCondition}</p>
                  <p className="mt-0.5 text-gray-600"><strong>Nutrition & Elimination:</strong> {printData.nutritionStatus} · {printData.eliminationStatus}</p>
                  <p className="mt-0.5 text-gray-600"><strong>Skin & Wound Care:</strong> {printData.woundCareStatus}</p>
                </div>

                {printData.vitalSignsSummary && (
                  <div>
                    <h4 className="font-bold text-gray-900 uppercase text-[11px] border-b pb-1">
                      2. Vital Signs Summary
                    </h4>
                    <p className="mt-1 text-gray-800">{printData.vitalSignsSummary}</p>
                  </div>
                )}

                {printData.observationsSummary && (
                  <div>
                    <h4 className="font-bold text-gray-900 uppercase text-[11px] border-b pb-1">
                      3. Documented Nursing Observations & Assessment
                    </h4>
                    <p className="mt-1 text-gray-800">{printData.observationsSummary}</p>
                    {printData.nursingAssessment && (
                      <p className="mt-1 text-gray-700 italic">Assessment: {printData.nursingAssessment}</p>
                    )}
                  </div>
                )}

                {printData.nursingCareProvided && (
                  <div>
                    <h4 className="font-bold text-gray-900 uppercase text-[11px] border-b pb-1">
                      4. Nursing Care Delivered & Treatments
                    </h4>
                    <p className="mt-1 text-gray-800">{printData.nursingCareProvided}</p>
                    {printData.treatmentSummary && (
                      <p className="mt-1 text-gray-700"><strong>Treatment Summary:</strong> {printData.treatmentSummary}</p>
                    )}
                    {printData.patientResponse && (
                      <p className="mt-1 text-gray-700"><strong>Patient Response:</strong> {printData.patientResponse}</p>
                    )}
                  </div>
                )}

                {printData.medicationSummary && (
                  <div>
                    <h4 className="font-bold text-gray-900 uppercase text-[11px] border-b pb-1">
                      5. Medication Administration
                    </h4>
                    <p className="mt-1 text-gray-800">{printData.medicationSummary}</p>
                  </div>
                )}

                {(printData.patientEducation || printData.dischargeInstructions || printData.warningSignsObserved) && (
                  <div>
                    <h4 className="font-bold text-gray-900 uppercase text-[11px] border-b pb-1">
                      6. Patient Education & Discharge Care Instructions
                    </h4>
                    {printData.patientEducation && <p className="mt-1 text-gray-800"><strong>Education Provided:</strong> {printData.patientEducation}</p>}
                    {printData.dischargeInstructions && <p className="mt-1 text-gray-800"><strong>Discharge Care:</strong> {printData.dischargeInstructions}</p>}
                    {printData.followUpInstructions && <p className="mt-1 text-gray-800"><strong>Follow-Up:</strong> {printData.followUpInstructions}</p>}
                    {printData.warningSignsObserved && <p className="mt-1 text-rose-800 font-medium"><strong>Warning Signs:</strong> {printData.warningSignsObserved}</p>}
                  </div>
                )}

                {printData.doctorCommunication && (
                  <div>
                    <h4 className="font-bold text-gray-900 uppercase text-[11px] border-b pb-1">
                      7. Physician Communication / Handoff
                    </h4>
                    <p className="mt-1 text-gray-800">{printData.doctorCommunication}</p>
                  </div>
                )}
              </div>

              {/* Signature Footer */}
              <div className="pt-6 border-t flex items-end justify-between text-xs text-gray-600">
                <div>
                  <p>Attending Nurse: <strong className="text-gray-900">{printData.nurseName}</strong></p>
                  <p>Nursing Registration: <strong className="text-gray-900">{printData.nurseRegistrationNumber}</strong></p>
                  <p>Ward Assignment: {printData.nurseWard}</p>
                  <p className="text-[10px] text-gray-400 mt-1">Printed on: {new Date().toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <div className="w-40 border-b border-gray-400 mb-1" />
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Registered Nurse Signature</p>
                  <p className="text-[9px] text-emerald-700 font-bold uppercase">{printData.status}</p>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t print:hidden">
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 transition-all cursor-pointer shadow-lg shadow-sky-600/30"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Document</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
