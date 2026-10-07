import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileCheck,
  Printer,
  Plus,
  Edit3,
  Eye,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Calendar,
  Activity,
  FileText,
  Pill,
  Trash2,
  X,
  Loader2,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import type {
  DoctorPatient,
  DischargeSummary,
  DischargeMedicationItem,
  CreateDischargeSummaryInput,
} from '../../types';
import * as doctorService from '../../services/doctorService';
import { MEDICATION_FORMULARY, type FormularyMedication } from '../../data/medicationFormulary';
import { getTallManName } from '../../utils/medicationSafety';

interface DischargeSummaryTabProps {
  patient: DoctorPatient;
  onPatientUpdated?: () => void;
}

export const DischargeSummaryTab: React.FC<DischargeSummaryTabProps> = ({
  patient,
  onPatientUpdated,
}) => {
  const [summaries, setSummaries] = useState<DischargeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form mode: 'list' | 'create' | 'edit'
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit'>('list');
  const [selectedSummary, setSelectedSummary] = useState<DischargeSummary | null>(null);
  const [viewingModalSummary, setViewingModalSummary] = useState<DischargeSummary | null>(null);

  // Form state
  const [admissionDate, setAdmissionDate] = useState('');
  const [dischargeDate, setDischargeDate] = useState('');
  const [admissionDiagnosis, setAdmissionDiagnosis] = useState('');
  const [dischargeDiagnosis, setDischargeDiagnosis] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [clinicalCourse, setClinicalCourse] = useState('');
  const [proceduresPerformed, setProceduresPerformed] = useState('');
  const [investigations, setInvestigations] = useState('');
  const [treatmentGiven, setTreatmentGiven] = useState('');
  const [conditionAtDischarge, setConditionAtDischarge] = useState('Stable');
  const [medications, setMedications] = useState<DischargeMedicationItem[]>([]);
  const [followUpInstructions, setFollowUpInstructions] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpDepartment, setFollowUpDepartment] = useState('');
  const [dietaryAdvice, setDietaryAdvice] = useState('');
  const [activityAdvice, setActivityAdvice] = useState('');
  const [warningSigns, setWarningSigns] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  // New medication form row & options selection
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');
  const [newMedFreq, setNewMedFreq] = useState('');
  const [newMedInstructions, setNewMedInstructions] = useState('');
  const [selectedMedOptionId, setSelectedMedOptionId] = useState('');
  const [capitalMode, setCapitalMode] = useState<'UPPERCASE' | 'TALLMAN'>('UPPERCASE');

  // Group formulary medications by category for clear selection options
  const groupedFormulary = useMemo(() => {
    const groups: Record<string, FormularyMedication[]> = {};
    MEDICATION_FORMULARY.forEach((med) => {
      const cat = med.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(med);
    });
    return groups;
  }, []);

  const selectedMedFormulary = useMemo(() => {
    if (!selectedMedOptionId || selectedMedOptionId === '__CUSTOM__') return null;
    return MEDICATION_FORMULARY.find((m) => m.id === selectedMedOptionId) || null;
  }, [selectedMedOptionId]);

  // Validation & Submission
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [confirmFinalizeOpen, setConfirmFinalizeOpen] = useState(false);

  // Load summaries on mount and when patient changes
  useEffect(() => {
    loadSummaries();
  }, [patient.id]);

  const loadSummaries = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await doctorService.getPatientDischargeSummaries(patient.id);
      setSummaries(data);
    } catch (err: any) {
      console.error('[DISCHARGE_SUMMARY] Fetch error:', err);
      setError(err.message || 'Failed to load discharge summaries.');
    } finally {
      setLoading(false);
    }
  };

  /** Formats a date string safely */
  const fmtDate = (d?: string | null) => {
    if (!d) return '—';
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return d;
      return dt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return d;
    }
  };

  /** Resets form state to default / pre-filled values */
  const initCreateForm = () => {
    const today = new Date().toISOString().split('T')[0];

    // Fetch the admitted date from patient record
    let initialAdmissionDate = patient.admissionDate || patient.lastVisit;
    if (!initialAdmissionDate || initialAdmissionDate >= today) {
      const fallbackDate = new Date();
      fallbackDate.setDate(fallbackDate.getDate() - 5);
      initialAdmissionDate = fallbackDate.toISOString().split('T')[0];
    }

    setAdmissionDate(initialAdmissionDate);
    setDischargeDate(today);
    setAdmissionDiagnosis(patient.primaryCondition || '');
    setDischargeDiagnosis(patient.primaryCondition || '');
    setChiefComplaint('');
    setClinicalCourse('');
    setProceduresPerformed('');
    setInvestigations('');
    setTreatmentGiven('');
    setConditionAtDischarge('Stable');
    setFollowUpInstructions('Follow up in Outpatient Clinic in 7 days or sooner if symptoms worsen.');
    setFollowUpDate('');
    setFollowUpDepartment(patient.department || 'General Medicine');
    setDietaryAdvice('Normal balanced diet, low sodium, adequate hydration.');
    setActivityAdvice('Gradual return to normal daily activities. Avoid heavy lifting.');
    setWarningSigns('Report immediately to Emergency if fever > 101°F, acute shortness of breath, severe pain, or bleeding.');
    setAdditionalInstructions('Take all discharge medications strictly as directed.');
    setValidationErrors({});
    setAiNotice(null);

    // Auto-populate active prescriptions with capital letters to avoid confusions
    const initialMeds: DischargeMedicationItem[] = [];
    const sourceMeds: { name: string; dosage: string; frequency: string; instructions?: string }[] = [];

    if (patient.prescriptions && patient.prescriptions.length > 0) {
      patient.prescriptions.forEach((rx) => {
        if (rx.medications && Array.isArray(rx.medications)) {
          rx.medications.forEach((m) => {
            sourceMeds.push({
              name: m.name,
              dosage: m.dosage,
              frequency: m.frequency,
              instructions: (m as any).instructions,
            });
          });
        }
      });
    }

    if (patient.currentMedications && patient.currentMedications.length > 0) {
      patient.currentMedications.forEach((m) => {
        if (!sourceMeds.some((x) => x.name.toLowerCase() === m.name.toLowerCase())) {
          sourceMeds.push({
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            instructions: 'Take as prescribed after meals.',
          });
        }
      });
    }

    sourceMeds.forEach((m) => {
      const upperName = m.name.toUpperCase();
      if (!initialMeds.some((x) => x.name.toUpperCase() === upperName)) {
        initialMeds.push({
          name: upperName,
          dosage: m.dosage,
          frequency: m.frequency,
          instructions: m.instructions || 'Take as prescribed after meals.',
        });
      }
    });

    setMedications(initialMeds);
    setViewMode('create');
    setSelectedSummary(null);
  };

  /** Pre-fills form with existing summary data for editing */
  const initEditForm = (summary: DischargeSummary) => {
    setSelectedSummary(summary);
    setAdmissionDate(summary.admissionDate);
    setDischargeDate(summary.dischargeDate);
    setAdmissionDiagnosis(summary.admissionDiagnosis || '');
    setDischargeDiagnosis(summary.dischargeDiagnosis || '');
    setChiefComplaint(summary.chiefComplaint || '');
    setClinicalCourse(summary.clinicalCourse || '');
    setProceduresPerformed(summary.proceduresPerformed || '');
    setInvestigations(summary.investigations || '');
    setTreatmentGiven(summary.treatmentGiven || '');
    setConditionAtDischarge(summary.conditionAtDischarge || 'Stable');
    setMedications(
      (summary.dischargeMedications || []).map((m) => ({
        ...m,
        name: m.name.toUpperCase(),
      }))
    );
    setFollowUpInstructions(summary.followUpInstructions || '');
    setFollowUpDate(summary.followUpDate || '');
    setFollowUpDepartment(summary.followUpDepartment || '');
    setDietaryAdvice(summary.dietaryAdvice || '');
    setActivityAdvice(summary.activityAdvice || '');
    setWarningSigns(summary.warningSigns || '');
    setAdditionalInstructions(summary.additionalInstructions || '');
    setValidationErrors({});
    setAiNotice(null);
    setViewMode('edit');
  };

  /** AI Draft Assistance Button Handler */
  const handleGenerateAiDraft = async () => {
    try {
      setGeneratingAi(true);
      setError(null);
      const res = await doctorService.generateAIDischargeDraft(patient.id);
      const draft = res.draft;

      if (draft.admissionDate) {
        if (draft.dischargeDate && draft.admissionDate >= draft.dischargeDate) {
          let adjustedAdm = patient.admissionDate || patient.lastVisit;
          if (!adjustedAdm || adjustedAdm >= draft.dischargeDate) {
            const fb = new Date(draft.dischargeDate);
            fb.setDate(fb.getDate() - 5);
            adjustedAdm = fb.toISOString().split('T')[0];
          }
          setAdmissionDate(adjustedAdm);
        } else {
          setAdmissionDate(draft.admissionDate);
        }
      } else {
        let fallbackAdm = patient.admissionDate || patient.lastVisit;
        if (!fallbackAdm || (draft.dischargeDate && fallbackAdm >= draft.dischargeDate)) {
          const fb = new Date(draft.dischargeDate || new Date().toISOString().split('T')[0]);
          fb.setDate(fb.getDate() - 5);
          fallbackAdm = fb.toISOString().split('T')[0];
        }
        setAdmissionDate(fallbackAdm);
      }
      if (draft.dischargeDate) setDischargeDate(draft.dischargeDate);
      if (draft.admissionDiagnosis) setAdmissionDiagnosis(draft.admissionDiagnosis);
      if (draft.dischargeDiagnosis) setDischargeDiagnosis(draft.dischargeDiagnosis);
      if (draft.chiefComplaint) setChiefComplaint(draft.chiefComplaint);
      if (draft.clinicalCourse) setClinicalCourse(draft.clinicalCourse);
      if (draft.proceduresPerformed) setProceduresPerformed(draft.proceduresPerformed);
      if (draft.investigations) setInvestigations(draft.investigations);
      if (draft.treatmentGiven) setTreatmentGiven(draft.treatmentGiven);
      if (draft.conditionAtDischarge) setConditionAtDischarge(draft.conditionAtDischarge);
      if (draft.followUpInstructions) setFollowUpInstructions(draft.followUpInstructions);
      if (draft.followUpDepartment) setFollowUpDepartment(draft.followUpDepartment);
      if (draft.dietaryAdvice) setDietaryAdvice(draft.dietaryAdvice);
      if (draft.activityAdvice) setActivityAdvice(draft.activityAdvice);
      if (draft.warningSigns) setWarningSigns(draft.warningSigns);
      if (draft.additionalInstructions) setAdditionalInstructions(draft.additionalInstructions);

      if (draft.dischargeMedications && draft.dischargeMedications.length > 0) {
        setMedications(
          draft.dischargeMedications.map((m) => ({
            ...m,
            name: m.name.toUpperCase(),
          }))
        );
      }

      setAiNotice(res.disclaimer || 'AI-assisted clinical draft. Attending physician verification required.');
    } catch (err: any) {
      console.error('[AI_DRAFT] Error:', err);
      setError(err.message || 'Failed to generate AI clinical draft.');
    } finally {
      setGeneratingAi(false);
    }
  };

  /** Medication row actions */
  const handleSelectMedicationOption = (medId: string) => {
    setSelectedMedOptionId(medId);
    if (!medId || medId === '__CUSTOM__') {
      return;
    }
    const med = MEDICATION_FORMULARY.find((m) => m.id === medId);
    if (!med) return;

    // Provide capital letters to medication name to avoid confusion (ISMP / FDA standard)
    const formattedName =
      capitalMode === 'TALLMAN' && med.tallManName
        ? med.tallManName
        : med.genericName.toUpperCase();

    setNewMedName(formattedName);

    if (med.availableStrengths && med.availableStrengths.length > 0) {
      setNewMedDosage(med.availableStrengths[0]);
    }
    if (med.commonFrequencies && med.commonFrequencies.length > 0) {
      setNewMedFreq(med.commonFrequencies[0]);
    }
    if (med.foodInstructions) {
      setNewMedInstructions(med.foodInstructions);
    }
  };

  const handleAddMedication = () => {
    if (!newMedName.trim() || !newMedDosage.trim()) return;

    // Enforce capital letters to avoid confusions
    const formattedName =
      capitalMode === 'TALLMAN'
        ? (getTallManName(newMedName.trim()) || newMedName.trim().toUpperCase())
        : newMedName.trim().toUpperCase();

    setMedications((prev) => [
      ...prev,
      {
        name: formattedName,
        dosage: newMedDosage.trim(),
        frequency: newMedFreq.trim() || 'Once daily',
        instructions: newMedInstructions.trim() || 'Take as prescribed after meals.',
      },
    ]);
    setNewMedName('');
    setNewMedDosage('');
    setNewMedFreq('');
    setNewMedInstructions('');
    setSelectedMedOptionId('');
  };

  const handleRemoveMedication = (index: number) => {
    setMedications((prev) => prev.filter((_, i) => i !== index));
  };

  /** Client-side validation */
  const validateForm = (isFinalizing: boolean) => {
    const errors: Record<string, string> = {};

    if (!admissionDate) {
      errors.admissionDate = 'Admission date is required.';
    }
    if (!dischargeDate) {
      errors.dischargeDate = 'Discharge date is required.';
    }

    if (admissionDate && dischargeDate) {
      const adm = new Date(admissionDate);
      const dis = new Date(dischargeDate);
      if (dis < adm) {
        errors.dischargeDate = 'Discharge date cannot be earlier than admission date.';
      } else if (admissionDate === dischargeDate) {
        errors.dischargeDate = 'Discharge date must be different from admission date for inpatient discharge.';
      }
    }

    if (followUpDate && dischargeDate) {
      const dis = new Date(dischargeDate);
      const fup = new Date(followUpDate);
      if (fup < dis) {
        errors.followUpDate = 'Follow-up date cannot be earlier than discharge date.';
      }
    }

    if (!dischargeDiagnosis.trim()) {
      errors.dischargeDiagnosis = 'Discharge diagnosis is required.';
    }

    if (isFinalizing) {
      if (!clinicalCourse.trim()) {
        errors.clinicalCourse = 'Clinical course summary is required to finalize.';
      }
      if (!conditionAtDischarge.trim()) {
        errors.conditionAtDischarge = 'Condition at discharge is required to finalize.';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /** Handles Save Draft or Finalize */
  const handleSave = async (isFinalizing: boolean) => {
    if (!validateForm(isFinalizing)) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload: CreateDischargeSummaryInput = {
        patientId: patient.id,
        admissionDate,
        dischargeDate,
        admissionDiagnosis,
        dischargeDiagnosis,
        chiefComplaint,
        clinicalCourse,
        proceduresPerformed,
        investigations,
        treatmentGiven,
        conditionAtDischarge,
        dischargeMedications: medications,
        followUpInstructions,
        followUpDate: followUpDate || undefined,
        followUpDepartment,
        dietaryAdvice,
        activityAdvice,
        warningSigns,
        additionalInstructions,
        summaryStatus: isFinalizing ? 'FINALIZED' : 'DRAFT',
      };

      if (viewMode === 'create') {
        await doctorService.createDischargeSummary(patient.id, payload);
        setSuccessMessage(
          isFinalizing
            ? 'Discharge summary finalized and officially signed. Patient marked as Discharged.'
            : 'Discharge summary draft saved successfully.'
        );
        setViewMode('list');
        await loadSummaries();
        if (isFinalizing && onPatientUpdated) {
          onPatientUpdated();
        }
      } else if (viewMode === 'edit' && selectedSummary) {
        await doctorService.updateDischargeSummary(selectedSummary.id, payload);
        setSuccessMessage(
          isFinalizing
            ? 'Discharge summary finalized and officially signed.'
            : 'Discharge summary draft updated successfully.'
        );
        setViewMode('list');
        await loadSummaries();
        if (isFinalizing && onPatientUpdated) {
          onPatientUpdated();
        }
      }
    } catch (err: any) {
      console.error('[DISCHARGE_SUMMARY] Save error:', err);
      if (err.status === 409 && err.existingDraftId) {
        setError(
          'An active draft discharge summary already exists for this patient. Click "Continue Editing" below to edit the existing draft.'
        );
      } else {
        setError(err.message || 'Failed to save discharge summary.');
      }
    } finally {
      setSubmitting(false);
      setConfirmFinalizeOpen(false);
    }
  };

  /** Native professional browser print and PDF generation */
  const handlePrintSummary = async (summary: DischargeSummary) => {
    try {
      // Trigger backend print audit log
      const full = await doctorService.getDischargeSummaryPrintData(summary.id);

      const printWindow = window.open('', '_blank', 'width=900,height=1000');
      if (!printWindow) {
        alert('Please allow pop-ups to open the print-ready discharge summary.');
        return;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Discharge Summary - ${full.patientName || `${patient.firstName} ${patient.lastName}`}</title>
          <style>
            @page {
              size: A4;
              margin: 15mm 20mm;
            }
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              color: #1e293b;
              line-height: 1.5;
              padding: 0;
              margin: 0;
              background: #fff;
              font-size: 13px;
            }
            .header-table {
              width: 100%;
              border-bottom: 3px double #0284c7;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }
            .hospital-title {
              font-size: 22px;
              font-weight: 800;
              color: #0369a1;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .sub-title {
              font-size: 11px;
              color: #64748b;
              margin-top: 3px;
            }
            .doc-type-banner {
              text-align: center;
              background: #f0f9ff;
              border: 1px solid #bae6fd;
              color: #0369a1;
              padding: 8px;
              border-radius: 6px;
              font-weight: bold;
              font-size: 15px;
              letter-spacing: 1px;
              margin-bottom: 20px;
              text-transform: uppercase;
            }
            .section-header {
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
              color: #0369a1;
              border-bottom: 1.5px solid #cbd5e1;
              padding-bottom: 4px;
              margin-top: 18px;
              margin-bottom: 8px;
            }
            .info-grid {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
            }
            .info-grid td {
              padding: 5px 8px;
              vertical-align: top;
              font-size: 12.5px;
            }
            .info-grid .label {
              font-weight: 600;
              color: #475569;
              width: 20%;
            }
            .info-grid .value {
              color: #0f172a;
              width: 30%;
            }
            .clinical-box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 10px 14px;
              margin-bottom: 12px;
              font-size: 12.5px;
              white-space: pre-wrap;
              color: #1e293b;
            }
            .med-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 8px;
              margin-bottom: 15px;
            }
            .med-table th {
              background: #e0f2fe;
              color: #0369a1;
              text-align: left;
              padding: 7px 10px;
              font-size: 11px;
              text-transform: uppercase;
              border: 1px solid #cbd5e1;
            }
            .med-table td {
              border: 1px solid #cbd5e1;
              padding: 8px 10px;
              font-size: 12px;
            }
            .warning-box {
              background: #fffbeb;
              border: 1px solid #fde68a;
              border-left: 4px solid #f59e0b;
              padding: 10px 14px;
              border-radius: 4px;
              color: #92400e;
              font-size: 12px;
              margin-top: 10px;
              margin-bottom: 15px;
            }
            .signature-section {
              margin-top: 40px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              page-break-inside: avoid;
            }
            .sig-block {
              text-align: right;
            }
            .sig-line {
              width: 240px;
              border-bottom: 1.5px solid #0f172a;
              margin-bottom: 6px;
              display: inline-block;
            }
            .seal-stamp {
              border: 2px dashed #0284c7;
              border-radius: 8px;
              padding: 10px 16px;
              font-size: 10px;
              color: #0369a1;
              text-align: center;
              font-weight: 600;
              text-transform: uppercase;
              display: inline-block;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <div class="hospital-title">🏥 ${full.hospitalName || 'MediTwin Central Hospital'}</div>
                <div class="sub-title">Department of Clinical Services & Digital Health Informatics</div>
                <div class="sub-title">Computerized Physician Order Entry & Inpatient Record</div>
              </td>
              <td style="text-align: right; vertical-align: top;">
                <div style="font-size: 11px; color: #64748b;">Summary ID: <strong>#DS-${full.id}</strong></div>
                <div style="font-size: 11px; color: #64748b;">Status: <strong style="color: #059669;">${full.summaryStatus}</strong></div>
                <div style="font-size: 11px; color: #64748b;">Issue Date: ${fmtDate(full.finalizedAt || full.updatedAt)}</div>
              </td>
            </tr>
          </table>

          <div class="doc-type-banner">Official Inpatient Discharge Summary</div>

          <div class="section-header">1. Patient Demographic & Admission Details</div>
          <table class="info-grid">
            <tr>
              <td class="label">Patient Name:</td>
              <td class="value"><strong>${full.patientName || `${patient.firstName} ${patient.lastName}`}</strong></td>
              <td class="label">Patient ID:</td>
              <td class="value">#${full.patientId || patient.id}</td>
            </tr>
            <tr>
              <td class="label">Age / Gender:</td>
              <td class="value">${full.patientAge || patient.age || '—'} Yrs / ${full.patientGender || patient.gender || '—'}</td>
              <td class="label">Ward & Bed:</td>
              <td class="value">${full.ward || patient.ward || 'General Ward'} (${full.bedNumber || patient.bedNumber || 'Bed Assigned'})</td>
            </tr>
            <tr>
              <td class="label">Admission Date:</td>
              <td class="value"><strong>${fmtDate(full.admissionDate)}</strong></td>
              <td class="label">Discharge Date:</td>
              <td class="value"><strong>${fmtDate(full.dischargeDate)}</strong></td>
            </tr>
            <tr>
              <td class="label">Attending Doctor:</td>
              <td class="value"><strong>${full.doctorName || 'Attending Physician'}</strong></td>
              <td class="label">Specialization:</td>
              <td class="value">${full.doctorSpecialization || 'Clinical Specialist'}</td>
            </tr>
          </table>

          <div class="section-header">2. Diagnostic Evaluation</div>
          <table class="info-grid">
            ${full.admissionDiagnosis ? `
            <tr>
              <td class="label">Admission Diagnosis:</td>
              <td class="value" colspan="3">${full.admissionDiagnosis}</td>
            </tr>` : ''}
            <tr>
              <td class="label">Discharge Diagnosis:</td>
              <td class="value" colspan="3"><strong>${full.dischargeDiagnosis}</strong></td>
            </tr>
            ${full.chiefComplaint ? `
            <tr>
              <td class="label">Chief Complaint:</td>
              <td class="value" colspan="3">${full.chiefComplaint}</td>
            </tr>` : ''}
            <tr>
              <td class="label">Condition at Discharge:</td>
              <td class="value" colspan="3"><span style="display:inline-block; padding: 2px 8px; border-radius: 4px; background: #ecfdf5; color: #047857; font-weight: bold;">${full.conditionAtDischarge}</span></td>
            </tr>
          </table>

          <div class="section-header">3. Hospital Course & Clinical Assessment</div>
          <div class="clinical-box">${full.clinicalCourse}</div>

          ${full.treatmentGiven ? `
            <div class="section-header">4. Inpatient Treatment & Interventions Given</div>
            <div class="clinical-box">${full.treatmentGiven}</div>
          ` : ''}

          ${full.proceduresPerformed ? `
            <div class="section-header">5. Procedures Performed</div>
            <div class="clinical-box">${full.proceduresPerformed}</div>
          ` : ''}

          ${full.investigations ? `
            <div class="section-header">6. Laboratory & Diagnostic Investigations</div>
            <div class="clinical-box">${full.investigations}</div>
          ` : ''}

          <div class="section-header">7. Prescribed Discharge Medications</div>
          ${full.dischargeMedications && full.dischargeMedications.length > 0 ? `
            <table class="med-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Medication Name</th>
                  <th>Dosage / Strength</th>
                  <th>Frequency & Timing</th>
                  <th>Instructions</th>
                </tr>
              </thead>
              <tbody>
                ${full.dischargeMedications.map((m: any, idx: number) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td><strong>${m.name.toUpperCase()}</strong></td>
                    <td>${m.dosage}</td>
                    <td>${m.frequency}</td>
                    <td>${m.instructions || 'Take as directed'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<p style="font-size: 12px; color: #64748b;">No active discharge medications prescribed.</p>'}

          <div class="section-header">8. Follow-up & Discharge Instructions</div>
          <table class="info-grid">
            <tr>
              <td class="label">Follow-up Date:</td>
              <td class="value">${full.followUpDate ? fmtDate(full.followUpDate) : 'Within 7-10 days'}</td>
              <td class="label">Department:</td>
              <td class="value">${full.followUpDepartment || 'Outpatient Clinic'}</td>
            </tr>
            ${full.followUpInstructions ? `
            <tr>
              <td class="label">Instructions:</td>
              <td class="value" colspan="3">${full.followUpInstructions}</td>
            </tr>` : ''}
            ${full.dietaryAdvice ? `
            <tr>
              <td class="label">Dietary Advice:</td>
              <td class="value" colspan="3">${full.dietaryAdvice}</td>
            </tr>` : ''}
            ${full.activityAdvice ? `
            <tr>
              <td class="label">Activity Advice:</td>
              <td class="value" colspan="3">${full.activityAdvice}</td>
            </tr>` : ''}
          </table>

          ${full.warningSigns ? `
            <div class="warning-box">
              <strong>⚠️ WARNING SIGNS & EMERGENCY RED FLAGS:</strong><br/>
              ${full.warningSigns}
            </div>
          ` : ''}

          ${full.additionalInstructions ? `
            <div class="section-header">9. Additional Remarks</div>
            <div class="clinical-box">${full.additionalInstructions}</div>
          ` : ''}

          <div class="signature-section">
            <div class="seal-stamp">
              MediTwin AI Inpatient Care<br/>
              Certified Electronic Record
            </div>
            <div class="sig-block">
              <div class="sig-line"></div>
              <div style="font-weight: bold; font-size: 13px;">${full.doctorName || 'Attending Physician'}</div>
              <div style="font-size: 11px; color: #64748b;">${full.doctorSpecialization || 'Physician'} · Reg: ${full.doctorLicenseNumber || 'MED-REG-IND'}</div>
              <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Electronic signature verified via JWT session</div>
            </div>
          </div>
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();

      setTimeout(() => {
        printWindow.print();
      }, 350);
    } catch (err: any) {
      console.error('[PRINT] Error generating print summary:', err);
      setError(err.message || 'Failed to generate print document.');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER: LIST VIEW
  // ─────────────────────────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <div className="space-y-5">
        {/* Alerts */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm shadow-md"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                className="p-1 rounded hover:bg-white/10 text-emerald-400"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-between p-4 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-sm shadow-md"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="p-1 rounded hover:bg-white/10 text-rose-400"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Section Header */}
        <div className="glass-card p-5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Discharge Summary Records</h3>
                <p className="text-xs text-gray-400">
                  Document, validate, and finalize hospital discharge summaries for {patient.firstName} {patient.lastName}.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadSummaries}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-colors"
              title="Refresh list from database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              id="btn-create-discharge-summary"
              onClick={initCreateForm}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-accent to-primary text-white text-xs font-bold hover:opacity-90 transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create Discharge Summary</span>
            </button>
          </div>
        </div>

        {/* Content list */}
        {loading ? (
          <div className="glass-card p-12 border border-white/10 flex flex-col items-center justify-center gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <p className="text-sm">Loading authorized discharge summaries...</p>
          </div>
        ) : summaries.length === 0 ? (
          <div className="glass-card p-12 border border-white/10 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-500">
              <FileCheck className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-white">No Discharge Summaries Yet</h4>
              <p className="text-xs text-gray-400 max-w-md mx-auto mt-1">
                No formal discharge summaries have been created for this patient. Click the button below to draft a new discharge record.
              </p>
            </div>
            <button
              onClick={initCreateForm}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/80 transition-colors shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Draft Initial Summary</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {summaries.map((summary) => {
              const isFinal = summary.summaryStatus === 'FINALIZED';

              return (
                <motion.div
                  key={summary.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-5 border border-white/10 hover:border-accent/40 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full border ${
                          isFinal
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        {isFinal ? 'FINALIZED & SEALED' : 'DRAFT IN PROGRESS'}
                      </span>
                      <span className="text-xs text-gray-400">
                        Record ID: <strong>#DS-{summary.id}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Calendar className="w-3.5 h-3.5 text-accent" />
                      <span>
                        Stay: <strong>{fmtDate(summary.admissionDate)}</strong> →{' '}
                        <strong>{fmtDate(summary.dischargeDate)}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-gray-400 block mb-0.5">Discharge Diagnosis:</span>
                      <p className="font-semibold text-white truncate">{summary.dischargeDiagnosis}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">Condition at Discharge:</span>
                      <span className="inline-block px-2.5 py-0.5 rounded-md bg-white/10 font-bold text-accent">
                        {summary.conditionAtDischarge}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-0.5">Authoring Physician:</span>
                      <p className="text-gray-200">
                        {summary.doctorName || 'Attending Physician'}
                        {summary.doctorSpecialization && (
                          <span className="text-gray-400 text-[11px] block">
                            ({summary.doctorSpecialization})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {summary.clinicalCourse && (
                    <div className="p-3 rounded-xl bg-white/5 text-xs text-gray-300 line-clamp-2">
                      <strong className="text-white">Hospital Course:</strong> {summary.clinicalCourse}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-gray-500">
                      {isFinal
                        ? `Finalized: ${fmtDate(summary.finalizedAt || summary.updatedAt)}`
                        : `Last Updated: ${fmtDate(summary.updatedAt)}`}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewingModalSummary(summary)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-accent" />
                        <span>View Details</span>
                      </button>

                      {!isFinal ? (
                        <button
                          onClick={() => initEditForm(summary)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold text-amber-300 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Continue Editing</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePrintSummary(summary)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/40 text-xs font-bold text-accent hover:text-white transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print / PDF</span>
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Detailed Modal View */}
        <AnimatePresence>
          {viewingModalSummary && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
              onClick={() => setViewingModalSummary(null)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="glass-card max-w-3xl w-full p-6 border border-white/20 rounded-2xl shadow-2xl bg-[#0B132B]/95 space-y-5 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-start border-b border-white/10 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">Discharge Summary #DS-{viewingModalSummary.id}</h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          viewingModalSummary.summaryStatus === 'FINALIZED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {viewingModalSummary.summaryStatus}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Patient: <strong className="text-white">{viewingModalSummary.patientName || `${patient.firstName} ${patient.lastName}`}</strong> · Stay: {fmtDate(viewingModalSummary.admissionDate)} to {fmtDate(viewingModalSummary.dischargeDate)}
                    </p>
                  </div>
                  <button
                    onClick={() => setViewingModalSummary(null)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3.5 rounded-xl bg-white/5">
                    <div>
                      <span className="text-gray-400 block">Discharge Diagnosis</span>
                      <strong className="text-white text-sm">{viewingModalSummary.dischargeDiagnosis}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Condition</span>
                      <strong className="text-accent text-sm">{viewingModalSummary.conditionAtDischarge}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Attending Doctor</span>
                      <span className="text-gray-200">{viewingModalSummary.doctorName || 'Attending Physician'}</span>
                    </div>
                  </div>

                  {viewingModalSummary.chiefComplaint && (
                    <div>
                      <h5 className="font-bold text-gray-300 uppercase tracking-wider text-[11px] mb-1">Chief Complaint</h5>
                      <p className="p-3 rounded-xl bg-black/40 border border-white/10 text-gray-300 whitespace-pre-wrap">{viewingModalSummary.chiefComplaint}</p>
                    </div>
                  )}

                  <div>
                    <h5 className="font-bold text-gray-300 uppercase tracking-wider text-[11px] mb-1">Hospital Clinical Course</h5>
                    <p className="p-3 rounded-xl bg-black/40 border border-white/10 text-gray-300 whitespace-pre-wrap leading-relaxed">{viewingModalSummary.clinicalCourse}</p>
                  </div>

                  {viewingModalSummary.treatmentGiven && (
                    <div>
                      <h5 className="font-bold text-gray-300 uppercase tracking-wider text-[11px] mb-1">Treatment Given</h5>
                      <p className="p-3 rounded-xl bg-black/40 border border-white/10 text-gray-300 whitespace-pre-wrap">{viewingModalSummary.treatmentGiven}</p>
                    </div>
                  )}

                  {viewingModalSummary.dischargeMedications && viewingModalSummary.dischargeMedications.length > 0 && (
                    <div>
                      <h5 className="font-bold text-gray-300 uppercase tracking-wider text-[11px] mb-1">Discharge Medications (Capital Letters)</h5>
                      <div className="space-y-2">
                        {viewingModalSummary.dischargeMedications.map((m, idx) => {
                          const tallMan = getTallManName(m.name);
                          const isLASA = tallMan && tallMan.toLowerCase() !== m.name.toLowerCase();
                          return (
                            <div key={idx} className="p-2.5 rounded-lg bg-black/40 border border-white/10 flex justify-between items-center">
                              <div>
                                <strong className="text-white text-xs uppercase tracking-wide">{m.name.toUpperCase()}</strong>
                                {isLASA && (
                                  <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-accent/20 text-accent font-mono border border-accent/30 font-semibold" title="Tall Man Lettering to prevent confusion">
                                    {tallMan}
                                  </span>
                                )}
                                <span className="text-gray-400 ml-2">({m.dosage})</span>
                                <span className="text-gray-500 block text-[11px]">{m.instructions}</span>
                              </div>
                              <span className="px-2 py-0.5 rounded bg-white/5 text-[11px] text-accent font-semibold">{m.frequency}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {viewingModalSummary.followUpInstructions && (
                      <div>
                        <h5 className="font-bold text-gray-300 uppercase tracking-wider text-[11px] mb-1">Follow-Up</h5>
                        <p className="p-3 rounded-xl bg-black/40 border border-white/10 text-gray-300 whitespace-pre-wrap">
                          {viewingModalSummary.followUpDate ? `Appointment Date: ${fmtDate(viewingModalSummary.followUpDate)}\n` : ''}
                          {viewingModalSummary.followUpInstructions}
                        </p>
                      </div>
                    )}
                    {viewingModalSummary.warningSigns && (
                      <div>
                        <h5 className="font-bold text-amber-400 uppercase tracking-wider text-[11px] mb-1">Warning Signs & Red Flags</h5>
                        <p className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 whitespace-pre-wrap">{viewingModalSummary.warningSigns}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-white/10">
                  <span className="text-xs text-gray-400">
                    {viewingModalSummary.summaryStatus === 'FINALIZED'
                      ? '🔒 Official Sealed Medical Document'
                      : '📝 Draft Record — Pending Final Physician Seal'}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewingModalSummary(null)}
                      className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      Close
                    </button>
                    {viewingModalSummary.summaryStatus === 'DRAFT' ? (
                      <button
                        onClick={() => {
                          const target = viewingModalSummary;
                          setViewingModalSummary(null);
                          initEditForm(target);
                        }}
                        className="px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition-colors"
                      >
                        Edit Draft
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePrintSummary(viewingModalSummary)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary/80 transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Document</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: CREATE / EDIT FORM VIEW
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="glass-card p-6 border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-accent">
                {viewMode === 'create' ? 'New Clinical Record' : `Editing Draft #DS-${selectedSummary?.id}`}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                DRAFT IN PROGRESS
              </span>
            </div>
            <h2 className="text-xl font-black text-white mt-1">Inpatient Discharge Summary</h2>
            <p className="text-xs text-gray-400">
              Prepare the official clinical summary, medication instructions, and follow-up guidance for{' '}
              <strong className="text-white">{patient.firstName} {patient.lastName}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleGenerateAiDraft}
              disabled={generatingAi}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-accent/20 hover:bg-accent/30 border border-accent/40 text-xs font-bold text-accent transition-all shadow-sm"
              title="Synthesize observations, lab reports, and prescriptions into a structured draft"
            >
              {generatingAi ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-accent" />
              )}
              <span>{generatingAi ? 'Synthesizing...' : 'AI Draft Assistance'}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-colors"
            >
              Back to List
            </button>
          </div>
        </div>

        {/* AI Disclaimer Alert if populated */}
        {aiNotice && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl bg-accent/10 border border-accent/30 flex items-start gap-2.5 text-xs text-accent"
          >
            <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="block text-white">AI-Assisted Synthesis Populated</strong>
              {aiNotice}
            </div>
            <button
              onClick={() => setAiNotice(null)}
              className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}

        {/* Read-Only Patient Demographics Card */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 p-4 rounded-xl bg-black/30 border border-white/10 text-xs">
          <div>
            <span className="text-gray-400 block text-[11px]">Patient Name</span>
            <strong className="text-white">{patient.firstName} {patient.lastName}</strong>
          </div>
          <div>
            <span className="text-gray-400 block text-[11px]">Patient ID</span>
            <strong className="text-accent">#{patient.id}</strong>
          </div>
          <div>
            <span className="text-gray-400 block text-[11px]">Age / Gender</span>
            <span className="text-gray-200">
              {patient.age || '—'} Yrs / {typeof patient.gender === 'string' ? patient.gender : patient.gender?.name || '—'}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block text-[11px]">Blood Group</span>
            <span className="text-gray-200">{typeof patient.bloodGroup === 'string' ? patient.bloodGroup : patient.bloodGroup?.name || '—'}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-[11px]">Ward & Bed</span>
            <span className="text-emerald-400 font-semibold">{patient.ward || 'Ward 1'} · {patient.bedNumber || 'Bed 01'}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-[11px]">Admission Status</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300">
              {patient.status || 'Admitted'}
            </span>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Section 1: Admission & Discharge Dates */}
      <div className="glass-card p-5 border border-white/10 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
          <Calendar className="w-4 h-4 text-accent" /> 1. Admission & Discharge Information
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-300">
                Admission Date <span className="text-rose-400">*</span>
              </label>
              {(patient.admissionDate || patient.lastVisit) && (
                <span className="text-[10px] text-teal-400/80 font-medium">
                  Admitted: {fmtDate(patient.admissionDate || patient.lastVisit)}
                </span>
              )}
            </div>
            <input
              id="input-admission-date"
              type="date"
              value={admissionDate}
              onChange={(e) => setAdmissionDate(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl bg-black/40 border text-xs text-white focus:outline-none ${
                validationErrors.admissionDate ? 'border-rose-500' : 'border-white/10 focus:border-accent'
              }`}
            />
            {validationErrors.admissionDate && (
              <p className="text-[11px] text-rose-400 mt-1">{validationErrors.admissionDate}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Discharge Date <span className="text-rose-400">*</span>
            </label>
            <input
              id="input-discharge-date"
              type="date"
              value={dischargeDate}
              onChange={(e) => setDischargeDate(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl bg-black/40 border text-xs text-white focus:outline-none ${
                validationErrors.dischargeDate ? 'border-rose-500' : 'border-white/10 focus:border-accent'
              }`}
            />
            {validationErrors.dischargeDate && (
              <p className="text-[11px] text-rose-400 mt-1">{validationErrors.dischargeDate}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Condition at Discharge <span className="text-rose-400">*</span>
            </label>
            <select
              id="select-condition-discharge"
              value={conditionAtDischarge}
              onChange={(e) => setConditionAtDischarge(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-accent"
            >
              <option value="Stable">Stable / Recovered</option>
              <option value="Improved">Clinically Improved</option>
              <option value="Cured">Cured / Resolved</option>
              <option value="Under Observation">Under Continued Home Observation</option>
              <option value="Transferred">Transferred to Specialized Facility</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section 2: Clinical Summary & Diagnoses */}
      <div className="glass-card p-5 border border-white/10 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent" /> 2. Clinical Diagnoses & Course
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Admission Diagnosis
            </label>
            <input
              id="input-admission-diagnosis"
              type="text"
              value={admissionDiagnosis}
              onChange={(e) => setAdmissionDiagnosis(e.target.value)}
              placeholder="e.g. Acute exacerbation of bronchial asthma"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Final Discharge Diagnosis <span className="text-rose-400">*</span>
            </label>
            <input
              id="input-discharge-diagnosis"
              type="text"
              value={dischargeDiagnosis}
              onChange={(e) => setDischargeDiagnosis(e.target.value)}
              placeholder="e.g. Bronchial Asthma with secondary respiratory infection (Resolved)"
              className={`w-full px-3.5 py-2.5 rounded-xl bg-black/40 border text-xs text-white focus:outline-none ${
                validationErrors.dischargeDiagnosis ? 'border-rose-500' : 'border-white/10 focus:border-accent'
              }`}
            />
            {validationErrors.dischargeDiagnosis && (
              <p className="text-[11px] text-rose-400 mt-1">{validationErrors.dischargeDiagnosis}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1">
            Chief Complaint & Presenting Symptoms
          </label>
          <input
            id="input-chief-complaint"
            type="text"
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
            placeholder="e.g. Dyspnea, persistent cough for 4 days, low grade fever"
            className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1">
            Hospital Clinical Course & Progress <span className="text-rose-400">*</span>
          </label>
          <textarea
            id="textarea-clinical-course"
            rows={4}
            value={clinicalCourse}
            onChange={(e) => setClinicalCourse(e.target.value)}
            placeholder="Document inpatient clinical evolution, response to therapy, vital signs stabilization, and discharge readiness..."
            className={`w-full px-3.5 py-2.5 rounded-xl bg-black/40 border text-xs text-white focus:outline-none resize-none ${
              validationErrors.clinicalCourse ? 'border-rose-500' : 'border-white/10 focus:border-accent'
            }`}
          />
          {validationErrors.clinicalCourse && (
            <p className="text-[11px] text-rose-400 mt-1">{validationErrors.clinicalCourse}</p>
          )}
        </div>
      </div>

      {/* Section 3: Procedures & Treatment */}
      <div className="glass-card p-5 border border-white/10 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
          <FileText className="w-4 h-4 text-accent" /> 3. Treatment Given, Procedures & Investigations
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Treatment Given During Admission
            </label>
            <textarea
              id="textarea-treatment-given"
              rows={3}
              value={treatmentGiven}
              onChange={(e) => setTreatmentGiven(e.target.value)}
              placeholder="e.g. IV bronchodilators, nebulization Q6H, tapering corticosteroids..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-accent resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Procedures Performed
            </label>
            <textarea
              id="textarea-procedures-performed"
              rows={3}
              value={proceduresPerformed}
              onChange={(e) => setProceduresPerformed(e.target.value)}
              placeholder="e.g. Chest Radiograph, Spirometry, ABG analysis, IV cannulation..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-accent resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Diagnostic Investigations & Results
            </label>
            <textarea
              id="textarea-investigations"
              rows={3}
              value={investigations}
              onChange={(e) => setInvestigations(e.target.value)}
              placeholder="e.g. CBC: TLC 8,200/mcL; Chest X-Ray: Clear lung fields bilaterally..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-accent resize-none"
            />
          </div>
        </div>
      </div>

      {/* Section 4: Discharge Medications */}
      <div className="glass-card p-5 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
            <Pill className="w-4 h-4 text-accent" /> 4. Discharge Medications
          </h4>
          <span className="text-[11px] text-gray-400">
            {medications.length} medication(s) prescribed
          </span>
        </div>

        {/* Existing Medications Table */}
        {medications.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 font-semibold text-[11px] uppercase">
                  <th className="pb-2">Medication Name (Capital Letters)</th>
                  <th className="pb-2">Dosage / Strength</th>
                  <th className="pb-2">Frequency</th>
                  <th className="pb-2">Instructions</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {medications.map((med, index) => {
                  const tallMan = getTallManName(med.name);
                  const isLASA = tallMan && tallMan.toLowerCase() !== med.name.toLowerCase();
                  return (
                    <tr key={index} className="hover:bg-white/5">
                      <td className="py-2.5 font-bold text-white uppercase tracking-wide">
                        <div className="flex items-center gap-2">
                          <span>{med.name.toUpperCase()}</span>
                          {isLASA && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] bg-accent/20 text-accent font-mono border border-accent/30 font-semibold"
                              title="Tall Man Capitalization to prevent Look-Alike Sound-Alike confusion"
                            >
                              {tallMan}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 text-gray-300 font-medium">{med.dosage}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded bg-accent/20 text-accent font-semibold text-[11px]">
                          {med.frequency}
                        </span>
                      </td>
                      <td className="py-2.5 text-gray-400 text-[11px]">{med.instructions || '—'}</td>
                      <td className="py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveMedication(index)}
                          className="p-1 rounded text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Remove medication"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">No discharge medications added yet.</p>
        )}

        {/* Add Medication Row */}
        <div className="pt-4 border-t border-white/10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-gray-200">
                Add Additional Discharge Medication:
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> CAPITAL LETTERS ACTIVE
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-gray-400">Capital Format:</span>
              <button
                type="button"
                onClick={() => {
                  setCapitalMode('UPPERCASE');
                  if (newMedName) setNewMedName(newMedName.toUpperCase());
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  capitalMode === 'UPPERCASE'
                    ? 'bg-accent text-white shadow-sm'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
                title="Format medication name in FULL CAPITAL LETTERS"
              >
                ALL CAPS (UPPERCASE)
              </button>
              <button
                type="button"
                onClick={() => {
                  setCapitalMode('TALLMAN');
                  if (newMedName) {
                    const tm = getTallManName(newMedName);
                    if (tm) setNewMedName(tm);
                  }
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  capitalMode === 'TALLMAN'
                    ? 'bg-accent text-white shadow-sm'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
                title="Format with ISMP/FDA Tall Man Capital Letters"
              >
                Tall Man Letters
              </button>
            </div>
          </div>

          {/* 1. Medication Options Selector */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="select-discharge-medication-option" className="text-[11px] font-semibold text-accent flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5" /> Select Medicine Option:
              </label>
              <span className="text-[10px] text-gray-400">
                Choose an option to auto-fill in Capital Letters
              </span>
            </div>

            <select
              id="select-discharge-medication-option"
              value={selectedMedOptionId}
              onChange={(e) => handleSelectMedicationOption(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#0B132B] border border-white/20 text-xs text-white font-medium focus:outline-none focus:border-accent cursor-pointer"
            >
              <option value="">— Select Medicine Option (Formulary Drugs in Capital Letters) —</option>
              {Object.entries(groupedFormulary).map(([category, meds]) => (
                <optgroup key={category} label={`── ${category.toUpperCase()} ──`} className="bg-navy-900 text-accent font-bold">
                  {meds.map((m) => (
                    <option key={m.id} value={m.id} className="bg-[#0B132B] text-white py-1">
                      {m.genericName.toUpperCase()} {m.tallManName && `[Tall Man: ${m.tallManName}]`} ({m.availableStrengths.join(', ')})
                    </option>
                  ))}
                </optgroup>
              ))}
              <option value="__CUSTOM__">✍️ Other / Custom Medicine (Type in Capital Letters below)</option>
            </select>

            {/* Quick Pick Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-gray-400 font-medium">Quick Select Options:</span>
              {[
                { name: 'SALBUTAMOL', id: 'med-salbutamol' },
                { name: 'MONTELUKAST', id: 'med-montelukast' },
                { name: 'LEVOTHYROXINE', id: 'med-levothyroxine' },
                { name: 'PARACETAMOL', id: 'med-paracetamol' },
                { name: 'PANTOPRAZOLE', id: 'med-pantoprazole' },
                { name: 'AMLODIPINE', id: 'med-amlodipine' },
                { name: 'ATORVASTATIN', id: 'med-atorvastatin' },
                { name: 'CETIRIZINE', id: 'med-cetirizine' },
              ].map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => handleSelectMedicationOption(chip.id)}
                  className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-accent/20 hover:text-accent border border-white/10 text-[10px] font-bold text-gray-300 font-mono transition-colors"
                >
                  + {chip.name}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Direct Form Inputs (Medication name, Dosage, Frequency, Instructions) */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div>
              <input
                type="text"
                list="medication-options-datalist"
                placeholder="MEDICATION NAME (CAPITALS)"
                value={newMedName}
                onChange={(e) => {
                  const val = capitalMode === 'UPPERCASE' ? e.target.value.toUpperCase() : e.target.value;
                  setNewMedName(val);
                }}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white uppercase font-bold placeholder-gray-500 focus:outline-none focus:border-accent"
                title="Medication name in Capital Letters to avoid confusion"
              />
              <datalist id="medication-options-datalist">
                {MEDICATION_FORMULARY.map((m) => (
                  <option key={m.id} value={m.genericName.toUpperCase()}>
                    {m.tallManName ? `${m.tallManName} (${m.drugClass})` : m.genericName}
                  </option>
                ))}
              </datalist>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Dosage (e.g. 100 mcg)"
                value={newMedDosage}
                onChange={(e) => setNewMedDosage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent"
              />
              {selectedMedFormulary && selectedMedFormulary.availableStrengths.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {selectedMedFormulary.availableStrengths.map((str) => (
                    <button
                      key={str}
                      type="button"
                      onClick={() => setNewMedDosage(str)}
                      className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                        newMedDosage === str
                          ? 'bg-accent text-white border-accent'
                          : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                      }`}
                    >
                      {str}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <input
                type="text"
                placeholder="Frequency (e.g. Once daily / BID)"
                value={newMedFreq}
                onChange={(e) => setNewMedFreq(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent"
              />
              <div className="flex gap-1 mt-1 flex-wrap">
                {['Once daily (Night)', 'Once daily (Morning)', 'Twice daily (BID)', 'As needed (PRN)'].map((fq) => (
                  <button
                    key={fq}
                    type="button"
                    onClick={() => setNewMedFreq(fq)}
                    className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                      newMedFreq === fq
                        ? 'bg-accent/30 text-accent border-accent/40'
                        : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {fq.split(' ')[0] + (fq.includes('(') ? ' ' + fq.split('(')[1].replace(')', '') : '')}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Instructions (e.g. Take after meals)"
                  value={newMedInstructions}
                  onChange={(e) => setNewMedInstructions(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={handleAddMedication}
                  disabled={!newMedName.trim() || !newMedDosage.trim()}
                  className="px-4 py-2 rounded-xl bg-accent text-white font-bold text-xs hover:bg-accent/80 transition-colors disabled:opacity-40 flex items-center gap-1 shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
              <span className="text-[10px] text-gray-400">
                💡 Added medication names are stored in capital letters to prevent confusion
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 5: Follow-Up & Recovery Advice */}
      <div className="glass-card p-5 border border-white/10 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-accent" /> 5. Follow-Up Plan & Patient Recovery Advice
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Follow-Up Date
            </label>
            <input
              id="input-followup-date"
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl bg-black/40 border text-xs text-white focus:outline-none ${
                validationErrors.followUpDate ? 'border-rose-500' : 'border-white/10 focus:border-accent'
              }`}
            />
            {validationErrors.followUpDate && (
              <p className="text-[11px] text-rose-400 mt-1">{validationErrors.followUpDate}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Follow-Up Department / Clinic
            </label>
            <input
              id="input-followup-dept"
              type="text"
              value={followUpDepartment}
              onChange={(e) => setFollowUpDepartment(e.target.value)}
              placeholder="e.g. Pulmonology Outpatient Clinic Room 204"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1">
            Follow-Up Instructions
          </label>
          <textarea
            id="textarea-followup-instructions"
            rows={2}
            value={followUpInstructions}
            onChange={(e) => setFollowUpInstructions(e.target.value)}
            placeholder="Review with physician in OPD. Bring discharge summary and medication records..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-accent resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Dietary Advice
            </label>
            <textarea
              id="textarea-dietary-advice"
              rows={2}
              value={dietaryAdvice}
              onChange={(e) => setDietaryAdvice(e.target.value)}
              placeholder="e.g. Low sodium, high fiber diet. Avoid cold liquids."
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-accent resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Activity & Exercise Advice
            </label>
            <textarea
              id="textarea-activity-advice"
              rows={2}
              value={activityAdvice}
              onChange={(e) => setActivityAdvice(e.target.value)}
              placeholder="e.g. Light ambulation as tolerated. Avoid strenuous physical exertion for 2 weeks."
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-accent resize-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-amber-400 mb-1">
            ⚠️ Warning Signs & Immediate Red Flags
          </label>
          <textarea
            id="textarea-warning-signs"
            rows={2}
            value={warningSigns}
            onChange={(e) => setWarningSigns(e.target.value)}
            placeholder="e.g. Acute chest pain, SpO2 < 92%, high fever > 101°F, or sudden dizziness requires immediate Emergency Department visit."
            className="w-full px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 placeholder-amber-500/50 focus:outline-none focus:border-amber-400 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1">
            Additional Discharge Notes
          </label>
          <textarea
            id="textarea-additional-instructions"
            rows={2}
            value={additionalInstructions}
            onChange={(e) => setAdditionalInstructions(e.target.value)}
            placeholder="Special nursing remarks or patient counseling notes..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-accent resize-none"
          />
        </div>
      </div>

      {/* Form Action Buttons */}
      <div className="glass-card p-5 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setViewMode('list')}
          disabled={submitting}
          className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-colors"
        >
          Cancel & Return
        </button>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            id="btn-save-draft"
            onClick={() => handleSave(false)}
            disabled={submitting}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-40"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5 text-amber-400" />}
            <span>Save as Draft</span>
          </button>

          <button
            type="button"
            id="btn-finalize-discharge-summary"
            onClick={() => {
              if (validateForm(true)) {
                setConfirmFinalizeOpen(true);
              }
            }}
            disabled={submitting}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-extrabold transition-all shadow-lg active:scale-95 disabled:opacity-40"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-white" />}
            <span>Finalize Discharge Summary</span>
          </button>
        </div>
      </div>

      {/* Finalization Confirmation Dialog */}
      <AnimatePresence>
        {confirmFinalizeOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="glass-card max-w-md w-full p-6 border border-emerald-500/40 rounded-2xl shadow-2xl bg-[#0B132B] space-y-4"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                <ShieldCheck className="w-7 h-7" />
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="text-base font-bold text-white">Finalize & Sign Discharge Summary</h3>
                <p className="text-xs text-gray-300">
                  You are about to officially finalize and seal the discharge summary for{' '}
                  <strong className="text-white">{patient.firstName} {patient.lastName}</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-xs space-y-2 text-gray-300">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Clinical records will be officially sealed (Read-Only)</span>
                </div>
                <div className="flex items-center gap-2 text-sky-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Patient status will be updated to "Discharged"</span>
                </div>
                <div className="flex items-center gap-2 text-amber-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Permanent audit record logged with physician timestamp</span>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmFinalizeOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Return to Edit
                </button>
                <button
                  type="button"
                  id="btn-confirm-finalize-modal"
                  onClick={() => handleSave(true)}
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-md disabled:opacity-40"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>{submitting ? 'Finalizing...' : 'Confirm & Finalize'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
