/**
 * medicationSafety.ts
 * Clinical Decision Support & Medication Safety Engine for MediTwin AI
 * Handles Drug-Drug Interactions (DDI), Allergy contraindication checking,
 * Tall Man Lettering formatting, and Maximum Safe Dose thresholds.
 */

import { MEDICATION_FORMULARY, type FormularyMedication } from '../data/medicationFormulary';

export interface SafetyAlert {
  type: 'Allergy' | 'DrugInteraction' | 'Overdose' | 'DuplicateTherapy' | 'Warning';
  severity: 'Critical' | 'Severe' | 'Moderate' | 'Info';
  title: string;
  description: string;
  recommendation: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Search & Formulary Lookup
// ─────────────────────────────────────────────────────────────────────────────
export function searchFormulary(query: string): FormularyMedication[] {
  const q = query.toLowerCase().trim();
  if (!q) return MEDICATION_FORMULARY.slice(0, 10);

  return MEDICATION_FORMULARY.filter((med) => {
    const nameMatch = med.genericName.toLowerCase().includes(q);
    const brandMatch = med.brandNames.some((b) => b.toLowerCase().includes(q));
    const classMatch = med.drugClass.toLowerCase().includes(q);
    const categoryMatch = med.category.toLowerCase().includes(q);
    return nameMatch || brandMatch || classMatch || categoryMatch;
  });
}

export function findMedicationByName(name: string): FormularyMedication | undefined {
  const normalized = name.toLowerCase().trim();
  return MEDICATION_FORMULARY.find(
    (m) =>
      m.genericName.toLowerCase().includes(normalized) ||
      m.brandNames.some((b) => b.toLowerCase() === normalized) ||
      normalized.includes(m.genericName.toLowerCase().split(' ')[0])
  );
}

export function getTallManName(drugName: string): string {
  const match = findMedicationByName(drugName);
  return match ? match.tallManName : drugName;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Drug-Drug Interaction (DDI) Matrix
// ─────────────────────────────────────────────────────────────────────────────
interface KnownDDI {
  drugA: string; // keyword or class
  drugB: string;
  severity: 'Critical' | 'Severe' | 'Moderate';
  title: string;
  description: string;
  recommendation: string;
}

const KNOWN_INTERACTIONS: KnownDDI[] = [
  {
    drugA: 'warfarin',
    drugB: 'aspirin',
    severity: 'Critical',
    title: 'High-Risk Bleeding Hazard (Warfarin + Aspirin)',
    description: 'Concurrent anticoagulant and antiplatelet therapy significantly increases risk of major gastrointestinal and intracranial hemorrhage.',
    recommendation: 'Use combination only with documented cardiology/stroke indication. Monitor INR frequently and consider gastric protection (PPI).',
  },
  {
    drugA: 'warfarin',
    drugB: 'ibuprofen',
    severity: 'Critical',
    title: 'Severe Bleeding & INR Elevation (Warfarin + NSAID)',
    description: 'NSAIDs increase gastrointestinal mucosal damage and displace warfarin from protein binding sites, dramatically elevating hemorrhage risk.',
    recommendation: 'Avoid NSAIDs in patients taking Warfarin. Substitute with Paracetamol / Acetaminophen for pain control.',
  },
  {
    drugA: 'metformin',
    drugB: 'contrast',
    severity: 'Severe',
    title: 'Lactic Acidosis Risk with Iodinated Contrast',
    description: 'Intravascular iodinated contrast may cause acute renal impairment leading to fatal metformin accumulation and lactic acidosis.',
    recommendation: 'Withhold Metformin 48 hours prior to and after radiological contrast imaging. Re-check renal eGFR before resuming.',
  },
  {
    drugA: 'ramipril',
    drugB: 'amiloride',
    severity: 'Severe',
    title: 'Severe Hyperkalemia Risk (ACE Inhibitor + Potassium-Sparing Diuretic)',
    description: 'Both agents reduce renal potassium excretion, risking life-threatening hyperkalemia and cardiac dysrhythmias.',
    recommendation: 'Monitor serum potassium and creatinine within 1-2 weeks of initiation.',
  },
  {
    drugA: 'telmisartan',
    drugB: 'amiloride',
    severity: 'Severe',
    title: 'Hyperkalemia Risk (ARB + Potassium-Sparing Diuretic)',
    description: 'Concurrent use synergistically increases potassium retention.',
    recommendation: 'Check baseline serum potassium and monitor regularly.',
  },
  {
    drugA: 'labetalol',
    drugB: 'amlodipine',
    severity: 'Moderate',
    title: 'Additive Hypotension & Bradycardia',
    description: 'Dual beta-blocker and calcium-channel blocker therapy can lead to profound blood pressure reduction or heart block.',
    recommendation: 'Monitor resting heart rate and seated/standing blood pressure during dosage titration.',
  },
  {
    drugA: 'tramadol',
    drugB: 'ondansetron',
    severity: 'Moderate',
    title: 'Reduced Analgesia & Serotonergic Interaction',
    description: 'Ondansetron (5-HT3 antagonist) may diminish the analgesic efficacy of Tramadol through competitive serotonergic pathway inhibition.',
    recommendation: 'Assess patient pain control and titrate analgesic therapy if necessary.',
  },
  {
    drugA: 'metronidazole',
    drugB: 'warfarin',
    severity: 'Severe',
    title: 'Warfarin Potentiation (Metronidazole Inhibition)',
    description: 'Metronidazole inhibits CYP2C9 metabolism of Warfarin, causing rapid INR elevation and bleeding complications.',
    recommendation: 'Reduce Warfarin dose by 30-50% during Metronidazole therapy and monitor INR every 2 days.',
  },
];

export function checkDrugInteractions(
  existingMedications: string[],
  candidateMedicineName: string
): SafetyAlert[] {
  const alerts: SafetyAlert[] = [];
  const candidateLower = candidateMedicineName.toLowerCase();

  for (const existing of existingMedications) {
    const existingLower = existing.toLowerCase();

    for (const ddi of KNOWN_INTERACTIONS) {
      const matchA = candidateLower.includes(ddi.drugA) && existingLower.includes(ddi.drugB);
      const matchB = candidateLower.includes(ddi.drugB) && existingLower.includes(ddi.drugA);

      if (matchA || matchB) {
        alerts.push({
          type: 'DrugInteraction',
          severity: ddi.severity,
          title: ddi.title,
          description: ddi.description,
          recommendation: ddi.recommendation,
        });
      }
    }
  }

  return alerts;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Allergy Conflict Checker
// ─────────────────────────────────────────────────────────────────────────────
const ALLERGY_MAP: { allergenKeyword: string; conflictingDrugs: string[]; reaction: string }[] = [
  {
    allergenKeyword: 'penicillin',
    conflictingDrugs: ['amoxicillin', 'augmentin', 'penicillin', 'ampicillin', 'cloxacillin'],
    reaction: 'Anaphylaxis / Severe angioedema and urticaria',
  },
  {
    allergenKeyword: 'sulfa',
    conflictingDrugs: ['sulfamethoxazole', 'glimepiride', 'furosemide', 'bactrim'],
    reaction: 'Stevens-Johnson Syndrome / Severe cutaneous adverse reaction',
  },
  {
    allergenKeyword: 'aspirin',
    conflictingDrugs: ['aspirin', 'ibuprofen', 'naproxen', 'diclofenac'],
    reaction: 'Bronchospasm / Aspirin-exacerbated respiratory disease (AERD)',
  },
  {
    allergenKeyword: 'latex',
    conflictingDrugs: [], // non-drug allergen
    reaction: 'Contact dermatitis and mucosal irritation',
  },
];

export function checkAllergyConflicts(
  patientAllergies: (string | { substance: string; severity?: string; verificationStatus?: string; verifiedBy?: string })[],
  candidateMedicineName: string
): SafetyAlert[] {
  const alerts: SafetyAlert[] = [];
  const candidateLower = candidateMedicineName.toLowerCase();

  for (const allergy of patientAllergies) {
    const substance = (typeof allergy === 'string' ? allergy : allergy.substance).toLowerCase();
    const isVerified = typeof allergy !== 'string' && allergy.verificationStatus?.startsWith('Verified');
    const verifier = typeof allergy !== 'string' && allergy.verifiedBy ? ` (${allergy.verifiedBy})` : '';

    for (const map of ALLERGY_MAP) {
      if (substance.includes(map.allergenKeyword)) {
        const hasConflict = map.conflictingDrugs.some((drug) => candidateLower.includes(drug));
        if (hasConflict) {
          alerts.push({
            type: 'Allergy',
            severity: isVerified ? 'Critical' : 'Severe',
            title: `${isVerified ? 'Clinically Verified' : 'Self-Reported'} Allergy Conflict: ${substance.toUpperCase()}`,
            description: `Patient has a ${isVerified ? 'clinically verified' : 'patient-reported'} allergy to "${substance}"${verifier}. Prescribing "${candidateMedicineName}" carries risk of ${map.reaction}.`,
            recommendation: isVerified
              ? 'ABSOLUTE CONTRAINDICATION: Select an alternative drug class (e.g., Macrolides like Azithromycin instead of Penicillin/Cephalosporins).'
              : 'REVIEW REQUIRED: Patient self-reported this allergy. If treatment is indispensable, perform clinical allergy evaluation or supervised test dose before full administration.',
          });
        }
      }
    }
  }

  return alerts;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Maximum Dose Threshold Validation
// ─────────────────────────────────────────────────────────────────────────────
export function validateDose(
  medicineName: string,
  doseStr: string
): { isValid: boolean; alert?: SafetyAlert } {
  const match = findMedicationByName(medicineName);
  if (!match) return { isValid: true };

  // Parse numeric amount from e.g. "5 mg" or "500 mg"
  const numericVal = parseFloat(doseStr);
  if (isNaN(numericVal)) return { isValid: true };

  if (numericVal > match.maxSafeDailyDose) {
    return {
      isValid: false,
      alert: {
        type: 'Overdose',
        severity: 'Critical',
        title: `Dose Exceeds Maximum Safe Threshold (${match.tallManName})`,
        description: `Entered dose (${doseStr}) exceeds the maximum safe daily therapeutic limit of ${match.maxSafeDailyDose} ${match.standardUnits}.`,
        recommendation: `Reduce dosage to standard therapeutic range: ${match.availableStrengths.join(', ')}.`,
      },
    };
  }

  return { isValid: true };
}
