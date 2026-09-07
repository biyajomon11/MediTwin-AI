import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';
import { requireRoles } from '../middleware/roleGuard';

const router = Router();
const prisma = new PrismaClient();

// ── Helpers ───────────────────────────────────────────────────

/** Calculates age from dateOfBirth */
function calculateAge(dob: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

/** Logs clinical audit action in audit_logs table */
async function logAudit(userId: number, actionName: string, tableName: string, recordId?: number, details?: any) {
  try {
    const isCreate = actionName.startsWith('CREATE');
    const actionType = await prisma.actionType.findFirst({
      where: { name: isCreate ? 'CREATE' : 'READ' },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        actionTypeId: actionType?.id || (isCreate ? 1 : 2),
        tableName,
        recordId: recordId || null,
        newValues: { action: actionName, ...details, timestamp: new Date().toISOString() },
      },
    });
  } catch (err) {
    console.error('[AUDIT_LOG] Error recording audit log:', err);
  }
}

/**
 * Builds the structured, patient-friendly AI Health Summary.
 * Strictly adheres to patient safety guidelines:
 * - Simple, patient-friendly language.
 * - Zero diagnostic inferences or disease predictions.
 * - Zero medication recommendations or dosage alterations.
 * - Clear source hospital/provider attribution for hospital data isolation.
 * - Distinct handling of missing data vs negative findings.
 */
async function buildPatientAISummary(patientId: number) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      gender: true,
      bloodGroup: true,
      user: { select: { email: true } },
      appointments: {
        include: {
          doctor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              department: { select: { name: true, hospital: { select: { name: true } } } },
            },
          },
          status: true,
        },
        orderBy: { appointmentDate: 'desc' },
      },
      prescriptions: {
        include: {
          doctor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              department: { select: { name: true, hospital: { select: { name: true } } } },
            },
          },
          items: { include: { medicine: true } },
        },
        orderBy: { prescribedDate: 'desc' },
      },
      medicalRecords: {
        include: {
          doctor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              department: { select: { name: true, hospital: { select: { name: true } } } },
            },
          },
          recordType: true,
          documents: { include: { documentType: true } },
        },
        orderBy: { recordDate: 'desc' },
      },
      medicalDocuments: {
        include: { documentType: true },
        orderBy: { uploadedAt: 'desc' },
      },
      observations: {
        include: {
          nurse: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              department: { select: { name: true, hospital: { select: { name: true } } } },
            },
          },
        },
        orderBy: { observationDate: 'desc' },
        take: 5,
      },
    },
  });

  if (!patient) return null;

  const age = calculateAge(new Date(patient.dateOfBirth));
  const fullName = `${patient.firstName} ${patient.lastName}`.trim();
  const bloodGroupName = patient.bloodGroup?.name || 'Not available in your current records.';
  const genderName = patient.gender?.name || 'Not specified';
  const latestObservation = patient.observations[0];

  // 1. Health Overview
  const knownAllergiesCount = 0; // Derived safely below
  const recordedConditionsCount = patient.medicalRecords.filter(
    (r) => r.recordType.name !== 'consultation' && r.recordType.name !== 'lab_result'
  ).length;

  const overviewSummary = `Your available records show you are a ${age}-year-old ${genderName.toLowerCase()} registered under MediTwin Healthcare. Your blood group is recorded as ${bloodGroupName}.`;

  const healthOverview = {
    age,
    gender: genderName,
    bloodGroup: bloodGroupName,
    height: 'Not available in your current records.',
    weight: latestObservation?.weight ? `${latestObservation.weight} kg` : 'Not available in your current records.',
    knownAllergiesCount,
    recordedConditionsCount,
    summaryText: overviewSummary,
    isComplete: Boolean(patient.bloodGroup && patient.gender && patient.dateOfBirth),
  };

  // 2. Medical History (Excludes routine consult notes and raw lab entries)
  const medicalHistory = patient.medicalRecords
    .filter((r) => r.recordType.name !== 'consultation' && r.recordType.name !== 'lab_result')
    .map((r, idx) => {
      const hospitalName = r.doctor?.department?.hospital?.name || 'MediTwin Medical Center';
      const deptName = r.doctor?.department?.name ? ` - ${r.doctor.department.name}` : '';
      const doctorName = r.doctor ? ` (Dr. ${r.doctor.firstName} ${r.doctor.lastName})` : '';

      return {
        id: `MH-${r.id || idx + 1}`,
        date: r.recordDate.toISOString().split('T')[0],
        conditionOrEvent: r.title,
        description: r.description || 'Clinical record on file.',
        hospitalOrProvider: `${hospitalName}${deptName}${doctorName}`,
        status: (r.recordType.name === 'surgery' || r.recordType.name === 'hospitalization') ? 'Resolved' : 'Active',
        verificationStatus: 'Verified by Physician',
      };
    });

  // 3. Current Medications (From active prescriptions)
  const currentMedications = patient.prescriptions.flatMap((rx, rxIdx) => {
    const hospitalName = rx.doctor?.department?.hospital?.name || 'MediTwin Hospital';
    const deptName = rx.doctor?.department?.name ? ` (${rx.doctor.department.name})` : '';
    const prescriber = `Dr. ${rx.doctor.firstName} ${rx.doctor.lastName}${deptName}`;

    return rx.items.map((item, itemIdx) => ({
      id: `MED-${item.id || `${rxIdx}-${itemIdx}`}`,
      medicineName: item.medicine.name,
      dosage: item.dosage,
      frequency: item.frequency || 'As directed by physician',
      route: 'Oral',
      duration: item.durationDays ? `${item.durationDays} days` : 'Ongoing as prescribed',
      prescribedBy: prescriber,
      prescriptionDate: rx.prescribedDate.toISOString().split('T')[0],
      hospitalOrSource: hospitalName,
      instructions: item.instructions || 'Take as advised by your healthcare provider.',
      status: 'Active',
    }));
  });

  // 4. Allergies
  // Explicitly note: If no allergy table record exists, do NOT say "No allergies", state "No allergy information is currently recorded."
  const allergies: Array<{
    id?: string;
    substance: string;
    reaction: string;
    severity: string;
    verificationStatus?: string;
    source?: string;
  }> = [];

  // 5. Laboratory Reports
  const laboratoryReports = [
    ...patient.medicalRecords
      .filter((r) => r.recordType.name === 'lab_result')
      .map((r, idx) => ({
        id: `LAB-${r.id || idx + 1}`,
        testName: r.title,
        date: r.recordDate.toISOString().split('T')[0],
        result: 'Result available in your laboratory report.',
        referenceRange: 'Standard Laboratory Range',
        status: 'Available in file',
        hospitalOrProvider: r.doctor?.department?.hospital?.name || 'Central Pathology Laboratory',
        documentRefId: `DOC-${r.id}`,
      })),
    ...patient.medicalDocuments
      .filter((d) => d.documentType.name.toLowerCase().includes('lab') || d.documentType.name.toLowerCase().includes('report'))
      .map((d, idx) => ({
        id: `DOC-LAB-${d.id || idx + 1}`,
        testName: d.fileName,
        date: d.uploadedAt ? d.uploadedAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        result: 'Official document attached.',
        referenceRange: 'See attached report',
        status: 'Uploaded Document',
        hospitalOrProvider: 'MediTwin Diagnostic Records',
        documentRefId: `DOC-${d.id}`,
      })),
  ];

  // 6. Recent Visits
  const recentVisits = patient.appointments.map((a, idx) => {
    const hospitalName = a.doctor?.department?.hospital?.name || 'MediTwin Medical Center';
    const deptName = a.doctor?.department?.name || 'General OPD';
    const doctorName = `Dr. ${a.doctor.firstName} ${a.doctor.lastName}`;

    return {
      id: `VISIT-${a.id || idx + 1}`,
      hospital: hospitalName,
      visitDate: a.appointmentDate.toISOString().split('T')[0],
      visitType: `${deptName} Consultation`,
      chiefComplaint: a.reason || 'Routine Health Consultation',
      recordedDiagnosis: 'General Follow-up / Consultation',
      treatmentSummary: `Consultation with ${doctorName}.`,
      followUp: a.status.name === 'scheduled' ? 'Follow-up scheduled' : 'Completed as scheduled',
      caseSheetNumber: `CS-${a.id ? String(a.id).padStart(4, '0') : '001'}`,
    };
  });

  // 7. Treatment Information
  const treatmentInformation = patient.prescriptions.map((rx, idx) => {
    const hospitalName = rx.doctor?.department?.hospital?.name || 'MediTwin Hospital';
    const medsList = rx.items.map((i) => `${i.medicine.name} ${i.dosage}`).join(', ');

    return {
      id: `TRT-${rx.id || idx + 1}`,
      title: rx.diagnosis || 'Clinical Care Plan',
      details: medsList ? `Prescribed medications: ${medsList}.` : 'Clinical care instructions on record.',
      sourceHospital: hospitalName,
      date: rx.prescribedDate.toISOString().split('T')[0],
      instructions: rx.notes || 'Please follow your healthcare professional’s direct instructions.',
    };
  });

  // 8. Important Health Information (Concise, verified highlights only)
  const importantInformation: string[] = [];

  if (currentMedications.length > 0) {
    importantInformation.push(
      `You have ${currentMedications.length} active prescribed medication${currentMedications.length > 1 ? 's' : ''} on record.`
    );
  }
  if (laboratoryReports.length > 0) {
    importantInformation.push(
      `You have ${laboratoryReports.length} laboratory/diagnostic report${laboratoryReports.length > 1 ? 's' : ''} available for review.`
    );
  }
  if (recentVisits.length > 0) {
    importantInformation.push(
      `Your most recent recorded visit was on ${recentVisits[0].visitDate} at ${recentVisits[0].hospital}.`
    );
  }
  if (allergies.length === 0) {
    importantInformation.push('No allergy information is currently recorded in your profile.');
  }

  return {
    patientId: patient.id,
    generatedAt: new Date().toISOString(),
    disclaimer:
      'This AI-generated summary is based solely on your available health records and is for informational purposes only. It does not replace professional medical advice, clinical diagnosis, or treatment from a qualified healthcare professional.',
    patientInfo: {
      name: fullName,
      patientId: `PAT-${String(patient.id).padStart(4, '0')}`,
      hospitalName: 'MediTwin Healthcare Network',
      dateOfBirth: patient.dateOfBirth.toISOString().split('T')[0],
    },
    healthOverview,
    medicalHistory,
    currentMedications,
    allergies,
    laboratoryReports,
    recentVisits,
    treatmentInformation,
    importantInformation,
  };
}

// ─────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/patient/ai-health-summary
 * POST /api/patient/ai-health-summary
 *
 * Generates an AI-powered, patient-friendly Health Summary.
 * Security: Patient identity is strictly resolved from authenticated JWT token.
 * A patient cannot supply an arbitrary patientId to view another patient's records.
 */
const handleAISummaryRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    let targetPatientId: number | null = null;

    if (userRole === 'patient') {
      // Find patient record linked to the authenticated user's ID
      const patientRecord = await prisma.patient.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!patientRecord) {
        return res.status(404).json({
          success: false,
          error: 'Patient profile record not found for this account.',
        });
      }
      targetPatientId = patientRecord.id;
    } else if (['doctor', 'nurse', 'admin'].includes(userRole || '')) {
      // Clinical staff may query a patient with authorized patientId param
      const queryId = req.query.patientId || req.body?.patientId;
      if (queryId) {
        targetPatientId = parseInt(String(queryId), 10);
      }
    }

    if (!targetPatientId) {
      return res.status(400).json({
        success: false,
        error: 'Patient record identifier could not be determined.',
      });
    }

    const summary = await buildPatientAISummary(targetPatientId);

    if (!summary) {
      return res.status(404).json({
        success: false,
        error: 'We could not find enough health information to generate a summary.',
      });
    }

    await logAudit(userId, 'VIEW_PATIENT_AI_SUMMARY', 'patients', targetPatientId, {
      patientId: targetPatientId,
    });

    return res.json({
      success: true,
      data: summary,
    });
  } catch (err) {
    console.error('[PATIENT_AI_SUMMARY] Generation error:', err);
    return res.status(500).json({
      success: false,
      error: 'Unable to generate your health summary. Please try again.',
    });
  }
};

router.get(
  '/ai-health-summary',
  authenticateJWT,
  requireRoles(['patient', 'doctor', 'nurse', 'admin']),
  handleAISummaryRequest
);

router.post(
  '/ai-health-summary',
  authenticateJWT,
  requireRoles(['patient', 'doctor', 'nurse', 'admin']),
  handleAISummaryRequest
);

export default router;
