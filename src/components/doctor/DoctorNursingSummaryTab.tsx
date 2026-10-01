import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileCheck, Printer, AlertCircle, X, Loader2, ShieldCheck,
} from 'lucide-react';
import type { DoctorPatient, NursingPatientSummary } from '../../types';
import * as nurseService from '../../services/nurseService';

interface DoctorNursingSummaryTabProps {
  patient: DoctorPatient;
}

export const DoctorNursingSummaryTab: React.FC<DoctorNursingSummaryTabProps> = ({ patient }) => {
  const [summaries, setSummaries] = useState<NursingPatientSummary[]>([]);
  const [selectedSummary, setSelectedSummary] = useState<NursingPatientSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printData, setPrintData] = useState<any>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadSummaries = async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await nurseService.getNursingSummaries(patient.id);
        if (mounted) {
          setSummaries(list);
          if (list.length > 0) {
            setSelectedSummary(list[0]);
          }
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to load nursing summaries.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadSummaries();
    return () => { mounted = false; };
  }, [patient.id]);

  const handlePrint = async (summaryId: number) => {
    setIsPrinting(true);
    try {
      const data = await nurseService.getPrintNursingSummary(summaryId);
      setPrintData(data);
      setShowPrintModal(true);
    } catch (err: any) {
      setError(err.message || 'Failed to generate print document.');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Physician Review Notice ── */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-sky-950/40 border border-sky-500/30 text-sky-200 text-xs sm:text-sm">
        <ShieldCheck className="w-5 h-5 text-sky-400 flex-shrink-0" />
        <div>
          <strong>Attending Physician Nursing Care Documentation Review.</strong> Longitudinal nursing summaries, telemetry reviews, and patient responses documented by ward nurses. Read-only clinical review mode.
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white cursor-pointer"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* ── Loading State ── */}
      {loading && (
        <div className="glass-card p-12 border border-white/10 flex items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
          <span className="text-sm">Loading nursing summaries from hospital database…</span>
        </div>
      )}

      {/* ── Empty State ── */}
      {!loading && summaries.length === 0 && (
        <div className="glass-card p-12 border border-white/10 flex flex-col items-center justify-center gap-3 text-center text-gray-400">
          <FileCheck className="w-12 h-12 text-gray-600" />
          <h3 className="text-sm font-bold text-white">No Nursing Summaries Documented</h3>
          <p className="text-xs text-gray-500 max-w-md">
            The ward nurses have not yet authored an inpatient nursing summary for this patient. Any new summary authored by duty nurses will automatically appear here.
          </p>
        </div>
      )}

      {/* ── Summaries Content ── */}
      {!loading && summaries.length > 0 && (
        <div className="space-y-4">
          {/* History selector tabs */}
          <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-white/10">
            <span className="text-xs font-semibold text-gray-400">Documented Summaries:</span>
            {summaries.map((s) => {
              const isSelected = selectedSummary?.id === s.id;
              const isFinal = s.status === 'FINALIZED';
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSummary(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-sky-500/20 text-sky-200 border-sky-500/50 shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-gray-400 border-white/10'
                  }`}
                >
                  <span className="font-bold">#{s.id}</span>
                  <span>({s.summaryDate})</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                      isFinal
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {s.status}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected Summary Inspection Card */}
          {selectedSummary && (
            <div className="glass-card p-6 border border-white/10 space-y-6">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-bold text-white">Nursing Patient Summary #{selectedSummary.id}</h3>
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        selectedSummary.status === 'FINALIZED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {selectedSummary.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Documented on <strong className="text-white">{selectedSummary.summaryDate}</strong> by{' '}
                    <strong className="text-sky-300">{selectedSummary.nurseName || 'Ward Nurse'}</strong> (Reg: {selectedSummary.nurseRegistrationNumber || 'NRN-2024-001'}) · Ward: {selectedSummary.nurseWard || 'General Ward 2B'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handlePrint(selectedSummary.id)}
                  disabled={isPrinting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 transition-all cursor-pointer shadow-lg shadow-sky-600/20 disabled:opacity-50 self-start sm:self-auto"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isPrinting ? 'Preparing…' : 'Print Official Summary'}</span>
                </button>
              </div>

              {/* Functional Assessment */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400">1. Current Patient Condition & Functional Status</h4>
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-gray-300 space-y-2">
                  <p className="text-white font-medium">{selectedSummary.patientCurrentCondition}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-white/5 text-[11px]">
                    <p>• Consciousness: <strong className="text-white">{selectedSummary.levelOfConsciousness || 'Alert'}</strong></p>
                    <p>• Mobility: <strong className="text-white">{selectedSummary.mobilityStatus || 'Independent'}</strong></p>
                    <p>• Pain: <strong className="text-white">{selectedSummary.painStatus || 'None reported'}</strong></p>
                  </div>
                  {selectedSummary.nutritionStatus && (
                    <p className="text-gray-400 text-[11px]"><strong>Nutrition:</strong> {selectedSummary.nutritionStatus}</p>
                  )}
                  {selectedSummary.eliminationStatus && (
                    <p className="text-gray-400 text-[11px]"><strong>Elimination:</strong> {selectedSummary.eliminationStatus}</p>
                  )}
                  {selectedSummary.woundCareStatus && (
                    <p className="text-gray-400 text-[11px]"><strong>Wound / Skin:</strong> {selectedSummary.woundCareStatus}</p>
                  )}
                </div>
              </div>

              {/* Vital Signs Summary */}
              {selectedSummary.vitalSignsSummary && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400">2. Vital Signs Summary</h4>
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-gray-200">
                    {selectedSummary.vitalSignsSummary}
                  </div>
                </div>
              )}

              {/* Observations & Nursing Assessment */}
              {(selectedSummary.observationsSummary || selectedSummary.nursingAssessment) && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400">3. Nursing Observations & Assessment</h4>
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-gray-300 space-y-2">
                    {selectedSummary.observationsSummary && <p>{selectedSummary.observationsSummary}</p>}
                    {selectedSummary.nursingAssessment && (
                      <p className="text-sky-300 italic pt-1 border-t border-white/5">
                        <strong>Clinical Assessment:</strong> {selectedSummary.nursingAssessment}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Care Provided & Treatments */}
              {(selectedSummary.nursingCareProvided || selectedSummary.treatmentSummary || selectedSummary.patientResponse) && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">4. Nursing Care Delivered & Inpatient Treatments</h4>
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-gray-300 space-y-2">
                    {selectedSummary.nursingCareProvided && <p>{selectedSummary.nursingCareProvided}</p>}
                    {selectedSummary.treatmentSummary && (
                      <p className="text-gray-400 text-[11px]"><strong>Treatments:</strong> {selectedSummary.treatmentSummary}</p>
                    )}
                    {selectedSummary.patientResponse && (
                      <p className="text-emerald-300 text-[11px]"><strong>Patient Response:</strong> {selectedSummary.patientResponse}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Medications */}
              {selectedSummary.medicationSummary && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">5. Medication Administration Summary</h4>
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-gray-200">
                    {selectedSummary.medicationSummary}
                  </div>
                </div>
              )}

              {/* Patient Education & Discharge Instructions */}
              {(selectedSummary.patientEducation || selectedSummary.dischargeInstructions || selectedSummary.warningSignsObserved) && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">6. Patient Education & Care Instructions</h4>
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-gray-300 space-y-1.5">
                    {selectedSummary.patientEducation && <p><strong>Education:</strong> {selectedSummary.patientEducation}</p>}
                    {selectedSummary.dischargeInstructions && <p><strong>Discharge Care:</strong> {selectedSummary.dischargeInstructions}</p>}
                    {selectedSummary.followUpInstructions && <p><strong>Follow-Up:</strong> {selectedSummary.followUpInstructions}</p>}
                    {selectedSummary.warningSignsObserved && (
                      <p className="text-rose-300"><strong>Warning Signs:</strong> {selectedSummary.warningSignsObserved}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Doctor Communication */}
              {selectedSummary.doctorCommunication && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400">7. Multidisciplinary & Physician Communication</h4>
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-gray-200">
                    {selectedSummary.doctorCommunication}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Print Document Modal ── */}
      <AnimatePresence>
        {showPrintModal && printData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/85 backdrop-blur-lg overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="bg-white text-gray-900 rounded-2xl max-w-3xl w-full p-8 shadow-2xl space-y-6 my-8 print:m-0 print:p-0"
            >
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

              {/* Patient Demographics */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-xl text-xs border">
                <div>
                  <p className="text-gray-500 uppercase text-[10px] font-bold">Patient Name</p>
                  <p className="font-bold text-gray-900">{printData.patient?.firstName} {printData.patient?.lastName}</p>
                  <p className="text-gray-500 font-mono text-[10px]">{printData.patient?.patientId}</p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase text-[10px] font-bold">Age / Gender / Blood</p>
                  <p className="font-semibold text-gray-800">{printData.patient?.gender} · Blood {printData.patient?.bloodGroup}</p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase text-[10px] font-bold">Ward & Bed Allocation</p>
                  <p className="font-semibold text-gray-800">{printData.patient?.ward || 'General Ward'}</p>
                  <p className="text-sky-700 text-[10px] font-bold">{printData.patient?.bedNumber || 'Bed 12'}</p>
                </div>
              </div>

              {/* Narrative Content */}
              <div className="space-y-4 text-xs leading-relaxed">
                <div>
                  <h4 className="font-bold text-gray-900 uppercase text-[11px] border-b pb-1">1. Patient Status & Functional Assessment</h4>
                  <p className="mt-1 text-gray-800"><strong>Current Condition:</strong> {printData.patientCurrentCondition}</p>
                  <p className="mt-0.5 text-gray-600"><strong>Consciousness:</strong> {printData.levelOfConsciousness} · <strong>Mobility:</strong> {printData.mobilityStatus} · <strong>Pain:</strong> {printData.painStatus}</p>
                </div>

                {printData.vitalSignsSummary && (
                  <div>
                    <h4 className="font-bold text-gray-900 uppercase text-[11px] border-b pb-1">2. Vital Signs Summary</h4>
                    <p className="mt-1 text-gray-800">{printData.vitalSignsSummary}</p>
                  </div>
                )}

                {printData.observationsSummary && (
                  <div>
                    <h4 className="font-bold text-gray-900 uppercase text-[11px] border-b pb-1">3. Nursing Observations & Assessment</h4>
                    <p className="mt-1 text-gray-800">{printData.observationsSummary}</p>
                  </div>
                )}

                {printData.nursingCareProvided && (
                  <div>
                    <h4 className="font-bold text-gray-900 uppercase text-[11px] border-b pb-1">4. Nursing Care Delivered & Treatments</h4>
                    <p className="mt-1 text-gray-800">{printData.nursingCareProvided}</p>
                  </div>
                )}

                {printData.medicationSummary && (
                  <div>
                    <h4 className="font-bold text-gray-900 uppercase text-[11px] border-b pb-1">5. Medication Administration Summary</h4>
                    <p className="mt-1 text-gray-800">{printData.medicationSummary}</p>
                  </div>
                )}

                {(printData.patientEducation || printData.dischargeInstructions || printData.warningSignsObserved) && (
                  <div>
                    <h4 className="font-bold text-gray-900 uppercase text-[11px] border-b pb-1">6. Patient Education & Care Instructions</h4>
                    {printData.patientEducation && <p className="mt-1 text-gray-800"><strong>Education:</strong> {printData.patientEducation}</p>}
                    {printData.dischargeInstructions && <p className="mt-1 text-gray-800"><strong>Discharge Instructions:</strong> {printData.dischargeInstructions}</p>}
                    {printData.warningSignsObserved && <p className="mt-1 text-rose-800 font-medium"><strong>Warning Signs:</strong> {printData.warningSignsObserved}</p>}
                  </div>
                )}

                {printData.doctorCommunication && (
                  <div>
                    <h4 className="font-bold text-gray-900 uppercase text-[11px] border-b pb-1">7. Physician Communication</h4>
                    <p className="mt-1 text-gray-800">{printData.doctorCommunication}</p>
                  </div>
                )}
              </div>

              {/* Signature Footer */}
              <div className="pt-6 border-t flex items-end justify-between text-xs text-gray-600">
                <div>
                  <p>Attending Nurse: <strong className="text-gray-900">{printData.nurseName}</strong></p>
                  <p>Registration: <strong className="text-gray-900">{printData.nurseRegistrationNumber}</strong></p>
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
