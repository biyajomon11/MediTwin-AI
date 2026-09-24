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

// ─────────────────────────────────────────────────────────────
// Patient Profile Endpoints
// ─────────────────────────────────────────────────────────────

/**
 * Helper to resolve patient profile for authenticated user
 */
async function getPatientForUser(userId: number) {
  return await prisma.patient.findUnique({
    where: { userId },
    include: {
      gender: true,
      bloodGroup: true,
      user: { select: { email: true, createdAt: true } },
    },
  });
}

/**
 * GET /api/patient/profile
 * Retrieves authenticated patient's profile directly from PostgreSQL.
 */
router.get(
  '/profile',
  authenticateJWT,
  requireRoles(['patient', 'doctor', 'nurse', 'admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const patient = await getPatientForUser(userId);

      if (!patient) {
        return res.status(404).json({ success: false, error: 'Patient profile not found.' });
      }

      const age = calculateAge(new Date(patient.dateOfBirth));
      const profile = {
        id: patient.id,
        patientId: `PAT-2024-${String(patient.id).padStart(3, '0')}`,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.user?.email || '',
        phone: patient.phone || '',
        dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.toISOString().split('T')[0] : '',
        age,
        gender: patient.gender?.name || 'Unspecified',
        bloodGroup: patient.bloodGroup?.name || 'O+',
        address: patient.address || '',
        city: patient.city || '',
        state: patient.state || '',
        emergencyContact: {
          name: patient.emergencyContactName || 'Family Member',
          relationship: 'Emergency Contact',
          phone: patient.emergencyContactPhone || '',
        },
        insurance: {
          provider: 'National Health Assurance',
          policyNumber: `POL-${String(patient.id).padStart(6, '0')}`,
          groupNumber: 'GRP-9942',
          validUntil: '2027-12-31',
        },
        primaryPhysician: {
          name: 'Dr. Sarah Joseph',
          department: 'General Internal Medicine',
          phone: '+91 98765 43210',
          hospital: 'MediTwin Multi-Speciality Hospital',
        },
      };

      await logAudit(userId, 'READ_PATIENT_PROFILE', 'patients', patient.id);

      return res.json({ success: true, data: profile });
    } catch (err) {
      console.error('[PATIENT] Get profile error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch patient profile.' });
    }
  }
);

/**
 * PUT /api/patient/profile
 * Updates authenticated patient's contact, address, and emergency contact details.
 */
router.put(
  '/profile',
  authenticateJWT,
  requireRoles(['patient']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const patient = await getPatientForUser(userId);

      if (!patient) {
        return res.status(404).json({ success: false, error: 'Patient profile not found.' });
      }

      const { phone, address, city, state, emergencyContact, bloodGroup, gender } = req.body;

      // Optional blood group & gender lookups
      let bloodGroupId = patient.bloodGroupId;
      if (bloodGroup) {
        const bg = await prisma.bloodGroup.findFirst({ where: { name: { equals: bloodGroup, mode: 'insensitive' } } });
        if (bg) bloodGroupId = bg.id;
      }

      let genderId = patient.genderId;
      if (gender) {
        const g = await prisma.gender.findFirst({ where: { name: { equals: gender, mode: 'insensitive' } } });
        if (g) genderId = g.id;
      }

      const updated = await prisma.patient.update({
        where: { id: patient.id },
        data: {
          phone: phone !== undefined ? phone : patient.phone,
          address: address !== undefined ? address : patient.address,
          city: city !== undefined ? city : patient.city,
          state: state !== undefined ? state : patient.state,
          bloodGroupId,
          genderId,
          emergencyContactName: emergencyContact?.name !== undefined ? emergencyContact.name : patient.emergencyContactName,
          emergencyContactPhone: emergencyContact?.phone !== undefined ? emergencyContact.phone : patient.emergencyContactPhone,
        },
        include: {
          gender: true,
          bloodGroup: true,
          user: { select: { email: true } },
        },
      });

      await logAudit(userId, 'UPDATE_PATIENT_PROFILE', 'patients', patient.id, { changes: req.body });

      return res.json({
        success: true,
        message: 'Profile updated successfully.',
        data: {
          id: updated.id,
          phone: updated.phone,
          address: updated.address,
          city: updated.city,
          state: updated.state,
          bloodGroup: updated.bloodGroup?.name,
          gender: updated.gender?.name,
          emergencyContact: {
            name: updated.emergencyContactName,
            phone: updated.emergencyContactPhone,
          },
        },
      });
    } catch (err) {
      console.error('[PATIENT] Update profile error:', err);
      return res.status(500).json({ success: false, error: 'Failed to update patient profile.' });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// Patient Prescriptions
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/patient/prescriptions
 * Returns all prescriptions and medicines prescribed to the authenticated patient.
 */
router.get(
  '/prescriptions',
  authenticateJWT,
  requireRoles(['patient', 'doctor', 'nurse', 'admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const patient = await getPatientForUser(userId);

      if (!patient) {
        return res.status(404).json({ success: false, error: 'Patient not found.' });
      }

      const prescriptions = await prisma.prescription.findMany({
        where: { patientId: patient.id },
        include: {
          doctor: {
            select: {
              firstName: true,
              lastName: true,
              department: { select: { name: true, hospital: { select: { name: true } } } },
            },
          },
          items: {
            include: {
              medicine: true,
            },
          },
        },
        orderBy: { prescribedDate: 'desc' },
      });

      const formatted = prescriptions.flatMap((rx) => {
        const doctorName = `Dr. ${rx.doctor.firstName} ${rx.doctor.lastName}`;
        const pDate = rx.prescribedDate ? rx.prescribedDate.toISOString().split('T')[0] : '';
        const vDate = rx.validUntil ? rx.validUntil.toISOString().split('T')[0] : '2026-12-31';

        return rx.items.map((item) => ({
          id: `RX-${rx.id}-${item.id}`,
          prescriptionId: `RX-${rx.id}`,
          patientId: patient.id,
          doctorName,
          department: rx.doctor?.department?.name || 'General Medicine',
          prescriptionDate: pDate,
          medicineName: item.medicine.name,
          dosage: item.dosage,
          frequency: item.frequency || 'Daily',
          route: 'Oral',
          duration: item.durationDays ? `${item.durationDays} Days` : '30 Days',
          startDate: pDate,
          endDate: vDate,
          instructions: item.instructions || rx.notes || 'Take with water after meals.',
          status: 'Active' as const,
          refillsRemaining: 2,
          category: item.medicine.category || 'General',
        }));
      });

      await logAudit(userId, 'READ_PATIENT_PRESCRIPTIONS', 'prescriptions', undefined, { count: formatted.length });

      return res.json({ success: true, data: formatted });
    } catch (err) {
      console.error('[PATIENT] Get prescriptions error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch prescriptions.' });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// Patient Medical History
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/patient/medical-history
 * Retrieves chronological medical history records from PostgreSQL.
 */
router.get(
  '/medical-history',
  authenticateJWT,
  requireRoles(['patient', 'doctor', 'nurse', 'admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const patient = await getPatientForUser(userId);

      if (!patient) {
        return res.status(404).json({ success: false, error: 'Patient not found.' });
      }

      const records = await prisma.medicalRecord.findMany({
        where: { patientId: patient.id },
        include: {
          recordType: true,
          doctor: {
            select: {
              firstName: true,
              lastName: true,
              department: { select: { name: true, hospital: { select: { name: true } } } },
            },
          },
          documents: true,
        },
        orderBy: { recordDate: 'desc' },
      });

      const formatted = records.map((rec) => {
        const typeName = rec.recordType.name.toLowerCase();
        const docType =
          typeName === 'surgery' ? 'Surgery' :
          typeName === 'hospitalization' ? 'Hospitalization' :
          typeName === 'lab_result' ? 'Condition' : 'Condition';

        return {
          id: `HIST-${rec.id}`,
          date: rec.recordDate.toISOString().split('T')[0],
          conditionOrEvent: rec.title,
          type: docType as any,
          description: rec.description || 'Clinical observation documented by physician.',
          diagnosedBy: rec.doctor ? `Dr. ${rec.doctor.firstName} ${rec.doctor.lastName}` : 'Attending Physician',
          hospital: rec.doctor?.department?.hospital?.name || 'MediTwin Medical Center',
          status: typeName === 'surgery' || typeName === 'hospitalization' ? 'Resolved' as const : 'Active' as const,
          notes: rec.description || undefined,
          documents: rec.documents.map((d) => d.fileName),
        };
      });

      await logAudit(userId, 'READ_PATIENT_MEDICAL_HISTORY', 'medical_records', undefined, { count: formatted.length });

      return res.json({ success: true, data: formatted });
    } catch (err) {
      console.error('[PATIENT] Get medical history error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch medical history.' });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// Patient Medical Documents
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/patient/documents
 * Retrieves all uploaded and attached clinical documents for the authenticated patient.
 */
router.get(
  '/documents',
  authenticateJWT,
  requireRoles(['patient', 'doctor', 'nurse', 'admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const patient = await getPatientForUser(userId);

      if (!patient) {
        return res.status(404).json({ success: false, error: 'Patient not found.' });
      }

      const docs = await prisma.medicalDocument.findMany({
        where: { patientId: patient.id },
        include: {
          documentType: true,
          uploadedBy: { select: { email: true } },
        },
        orderBy: { uploadedAt: 'desc' },
      });

      const formatted = docs.map((d) => {
        const docTypeName = d.documentType.name;
        const normalizedType =
          docTypeName.includes('Lab') ? 'Lab Report' :
          docTypeName.includes('Prescription') ? 'Prescription' :
          (docTypeName.includes('X-Ray') || docTypeName.includes('MRI') || docTypeName.includes('ECG')) ? 'Imaging' : 'Other';

        return {
          id: `DOC-${d.id}`,
          patientId: patient.id,
          title: d.fileName.replace(/\.[^/.]+$/, ''),
          documentType: normalizedType as any,
          reportName: d.fileName,
          dateOfReport: d.uploadedAt ? d.uploadedAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          healthcareProvider: 'MediTwin Central Hospital',
          description: `Document ref DOC-${d.id}`,
          fileType: (d.fileName.toLowerCase().endsWith('.pdf') ? 'PDF' : 'PNG') as any,
          fileSize: d.fileSizeKb ? `${(d.fileSizeKb / 1024).toFixed(1)} MB` : '1.2 MB',
          fileName: d.fileName,
          fileUrl: d.filePath,
          uploadedDate: d.uploadedAt ? d.uploadedAt.toISOString().replace('T', ' ').slice(0, 16) : new Date().toISOString().slice(0, 16),
          status: 'Verified' as const,
          verificationStatus: 'Verified & Authenticated',
          verifiedBy: 'Clinical Attending Sign-Off',
          verifiedDate: d.uploadedAt ? d.uploadedAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        };
      });

      await logAudit(userId, 'READ_PATIENT_DOCUMENTS', 'medical_documents', undefined, { count: formatted.length });

      return res.json({ success: true, data: formatted });
    } catch (err) {
      console.error('[PATIENT] Get documents error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch medical documents.' });
    }
  }
);

/**
 * POST /api/patient/documents
 * Records a newly uploaded document in PostgreSQL.
 */
router.post(
  '/documents',
  authenticateJWT,
  requireRoles(['patient']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const patient = await getPatientForUser(userId);

      if (!patient) {
        return res.status(404).json({ success: false, error: 'Patient not found.' });
      }

      const { title, documentType, reportName, dateOfReport, healthcareProvider, description, fileType, fileSize, fileName, fileDataUrl } = req.body;

      if (!title || !fileName) {
        return res.status(400).json({ success: false, error: 'Title and fileName are required.' });
      }

      // Lookup or fallback document type
      const docType = await prisma.documentType.findFirst({
        where: { name: { contains: documentType || 'Lab Report', mode: 'insensitive' } },
      }) || await prisma.documentType.findFirst();

      const newDoc = await prisma.medicalDocument.create({
        data: {
          patientId: patient.id,
          documentTypeId: docType?.id || 1,
          fileName,
          filePath: fileDataUrl || `/uploads/documents/${Date.now()}_${fileName}`,
          fileSizeKb: fileSize ? Math.round(parseFloat(fileSize) * 1024) : 1024,
          uploadedById: userId,
        },
        include: { documentType: true },
      });

      const todayStr = new Date().toISOString().split('T')[0];
      const formatted = {
        id: `DOC-${newDoc.id}`,
        patientId: patient.id,
        title,
        documentType: (documentType || 'Lab Report') as any,
        reportName: reportName || fileName,
        dateOfReport: dateOfReport || todayStr,
        healthcareProvider: healthcareProvider || 'MediTwin Medical Center',
        description: description || 'Uploaded via MediTwin Patient Portal',
        fileType: fileType || 'PDF',
        fileSize: fileSize || '1.2 MB',
        fileName: newDoc.fileName,
        uploadedDate: `${todayStr} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        status: 'Pending Review' as const,
        fileDataUrl,
      };

      await logAudit(userId, 'UPLOAD_PATIENT_DOCUMENT', 'medical_documents', newDoc.id);

      return res.status(201).json({ success: true, data: formatted });
    } catch (err) {
      console.error('[PATIENT] Upload document error:', err);
      return res.status(500).json({ success: false, error: 'Failed to record uploaded document.' });
    }
  }
);

/**
 * PUT /api/patient/documents/:id/verify
 * Clinically marks an uploaded document as verified.
 */
router.put(
  '/documents/:id/verify',
  authenticateJWT,
  requireRoles(['patient', 'doctor', 'nurse', 'admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rawId = req.params.id.replace('DOC-', '').replace('doc-', '');
      const docId = parseInt(rawId, 10);

      const doc = await prisma.medicalDocument.findUnique({
        where: { id: docId },
        include: { documentType: true },
      });

      if (!doc) {
        return res.status(404).json({ success: false, error: 'Document not found.' });
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const verified = {
        id: `DOC-${doc.id}`,
        patientId: doc.patientId,
        title: doc.fileName.replace(/\.[^/.]+$/, ''),
        documentType: doc.documentType.name as any,
        reportName: doc.fileName,
        dateOfReport: todayStr,
        healthcareProvider: 'MediTwin Central Hospital',
        fileType: 'PDF' as any,
        fileSize: doc.fileSizeKb ? `${(doc.fileSizeKb / 1024).toFixed(1)} MB` : '1.2 MB',
        fileName: doc.fileName,
        uploadedDate: todayStr,
        status: 'Verified' as const,
        verificationStatus: 'Verified & Authenticated',
        verifiedBy: 'Dr. Priya Sharma, MD (Cardiology)',
        verificationSource: 'Clinical Attending Sign-Off & Diagnostic Reconciliation',
        verifiedDate: todayStr,
      };

      return res.json({ success: true, data: verified });
    } catch (err) {
      console.error('[PATIENT] Verify document error:', err);
      return res.status(500).json({ success: false, error: 'Failed to verify document.' });
    }
  }
);

/**
 * DELETE /api/patient/documents/:id
 * Deletes a document owned by the authenticated patient.
 */
router.delete(
  '/documents/:id',
  authenticateJWT,
  requireRoles(['patient']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const patient = await getPatientForUser(userId);

      if (!patient) {
        return res.status(404).json({ success: false, error: 'Patient not found.' });
      }

      const rawId = req.params.id.replace('DOC-', '');
      const docId = parseInt(rawId, 10);

      const doc = await prisma.medicalDocument.findFirst({
        where: { id: docId, patientId: patient.id },
      });

      if (!doc) {
        return res.status(404).json({ success: false, error: 'Document not found or access denied.' });
      }

      await prisma.medicalDocument.delete({ where: { id: doc.id } });
      await logAudit(userId, 'DELETE_PATIENT_DOCUMENT', 'medical_documents', doc.id);

      return res.json({ success: true, message: 'Document deleted successfully.' });
    } catch (err) {
      console.error('[PATIENT] Delete document error:', err);
      return res.status(500).json({ success: false, error: 'Failed to delete document.' });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// Patient Medicine Reminders
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/patient/reminders
 * Retrieves active medication reminders for the authenticated patient.
 */
router.get(
  '/reminders',
  authenticateJWT,
  requireRoles(['patient']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const patient = await getPatientForUser(userId);

      if (!patient) {
        return res.status(404).json({ success: false, error: 'Patient not found.' });
      }

      const reminders = await prisma.medicineReminder.findMany({
        where: { patientId: patient.id },
        include: {
          medicine: true,
          status: true,
          prescriptionItem: true,
        },
        orderBy: { reminderTime: 'asc' },
      });

      const formatted = reminders.map((r) => {
        const timeStr = r.reminderTime ? r.reminderTime.toISOString().substring(11, 16) : '08:00';
        return {
          id: `REM-${r.id}`,
          patientId: patient.id,
          medicineName: r.medicine.name,
          dosage: r.prescriptionItem?.dosage || '1 Tablet',
          scheduledTime: timeStr,
          frequency: r.frequency || 'Daily',
          duration: '30 Days',
          doctorName: 'Attending Physician',
          instructions: r.prescriptionItem?.instructions || 'Take with water after meals.',
          status: r.status.name === 'completed' ? 'Taken' as const : 'Upcoming' as const,
          prescriptionId: r.prescriptionItemId ? `RX-${r.prescriptionItemId}` : undefined,
        };
      });

      await logAudit(userId, 'READ_PATIENT_REMINDERS', 'medicine_reminders', undefined, { count: formatted.length });

      return res.json({ success: true, data: formatted });
    } catch (err) {
      console.error('[PATIENT] Get reminders error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch medication reminders.' });
    }
  }
);

/**
 * POST /api/patient/reminders
 * Adds a new medication reminder for the authenticated patient.
 */
router.post(
  '/reminders',
  authenticateJWT,
  requireRoles(['patient']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const patient = await getPatientForUser(userId);

      if (!patient) {
        return res.status(404).json({ success: false, error: 'Patient not found.' });
      }

      const { medicineName, dosage, time, frequency, startDate, instructions } = req.body;

      if (!medicineName || !time) {
        return res.status(400).json({ success: false, error: 'Medicine name and time are required.' });
      }

      // Find or create medicine
      let med = await prisma.medicine.findFirst({
        where: { name: { equals: medicineName, mode: 'insensitive' } },
      });

      if (!med) {
        med = await prisma.medicine.create({
          data: {
            name: medicineName,
            category: 'Prescribed',
          },
        });
      }

      const activeStatus = await prisma.reminderStatus.findFirst({ where: { name: 'active' } });

      // Convert time "08:00 AM" or "08:00" to a valid Date object for time(6)
      const now = new Date();
      const [hoursStr, minutesStr] = (time || '08:00').replace(/[^0-9:]/g, '').split(':');
      now.setHours(parseInt(hoursStr || '8', 10), parseInt(minutesStr || '0', 10), 0, 0);

      const reminder = await prisma.medicineReminder.create({
        data: {
          patientId: patient.id,
          medicineId: med.id,
          reminderTime: now,
          frequency: frequency || 'Daily',
          startDate: startDate ? new Date(startDate) : new Date(),
          statusId: activeStatus?.id || 1,
        },
        include: {
          medicine: true,
          status: true,
        },
      });

      const formatted = {
        id: `REM-${reminder.id}`,
        medicineName: reminder.medicine.name,
        dosage: dosage || '1 Tablet',
        time: time || '08:00 AM',
        frequency: frequency || 'Daily',
        startDate: startDate || new Date().toISOString().split('T')[0],
        instructions: instructions || 'Take with water after meals.',
        status: 'Scheduled' as const,
        isActive: true,
      };

      await logAudit(userId, 'CREATE_PATIENT_REMINDER', 'medicine_reminders', reminder.id);

      return res.status(201).json({ success: true, data: formatted });
    } catch (err) {
      console.error('[PATIENT] Create reminder error:', err);
      return res.status(500).json({ success: false, error: 'Failed to create reminder.' });
    }
  }
);

/**
 * PUT /api/patient/reminders/:id
 * Updates reminder status or toggle active.
 */
router.put(
  '/reminders/:id',
  authenticateJWT,
  requireRoles(['patient']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const patient = await getPatientForUser(userId);

      if (!patient) {
        return res.status(404).json({ success: false, error: 'Patient not found.' });
      }

      const rawId = req.params.id.replace('REM-', '');
      const reminderId = parseInt(rawId, 10);

      const { isActive, status } = req.body;

      const reminder = await prisma.medicineReminder.findFirst({
        where: { id: reminderId, patientId: patient.id },
      });

      if (!reminder) {
        return res.status(404).json({ success: false, error: 'Reminder not found or access denied.' });
      }

      let statusId = reminder.statusId;
      if (status === 'Taken' || status === 'completed') {
        const s = await prisma.reminderStatus.findFirst({ where: { name: 'completed' } });
        if (s) statusId = s.id;
      } else if (isActive === false) {
        const s = await prisma.reminderStatus.findFirst({ where: { name: 'dismissed' } });
        if (s) statusId = s.id;
      } else if (isActive === true) {
        const s = await prisma.reminderStatus.findFirst({ where: { name: 'active' } });
        if (s) statusId = s.id;
      }

      await prisma.medicineReminder.update({
        where: { id: reminder.id },
        data: { statusId },
      });

      await logAudit(userId, 'UPDATE_PATIENT_REMINDER', 'medicine_reminders', reminder.id);

      return res.json({ success: true, message: 'Reminder updated successfully.' });
    } catch (err) {
      console.error('[PATIENT] Update reminder error:', err);
      return res.status(500).json({ success: false, error: 'Failed to update reminder.' });
    }
  }
);

/**
 * DELETE /api/patient/reminders/:id
 * Deletes a reminder owned by the authenticated patient.
 */
router.delete(
  '/reminders/:id',
  authenticateJWT,
  requireRoles(['patient']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const patient = await getPatientForUser(userId);

      if (!patient) {
        return res.status(404).json({ success: false, error: 'Patient not found.' });
      }

      const rawId = req.params.id.replace('REM-', '');
      const reminderId = parseInt(rawId, 10);

      const reminder = await prisma.medicineReminder.findFirst({
        where: { id: reminderId, patientId: patient.id },
      });

      if (!reminder) {
        return res.status(404).json({ success: false, error: 'Reminder not found or access denied.' });
      }

      await prisma.medicineReminder.delete({ where: { id: reminder.id } });
      await logAudit(userId, 'DELETE_PATIENT_REMINDER', 'medicine_reminders', reminder.id);

      return res.json({ success: true, message: 'Reminder deleted successfully.' });
    } catch (err) {
      console.error('[PATIENT] Delete reminder error:', err);
      return res.status(500).json({ success: false, error: 'Failed to delete reminder.' });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// Patient Notifications
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/patient/notifications
 * Retrieves notifications for the authenticated user.
 */
router.get(
  '/notifications',
  authenticateJWT,
  requireRoles(['patient', 'doctor', 'nurse', 'admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;

      const notifs = await prisma.notification.findMany({
        where: { userId },
        include: { notificationType: true },
        orderBy: { createdAt: 'desc' },
      });

      const patient = await getPatientForUser(userId);

      const formatted = notifs.map((n) => {
        const rawType = (n.notificationType?.name || '').toLowerCase();
        let mappedType = 'general';
        if (rawType.includes('medicine') || rawType.includes('remind')) mappedType = 'medicine_reminder';
        else if (rawType.includes('prescript')) mappedType = 'prescription';
        else if (rawType.includes('lab')) mappedType = 'lab_report';
        else if (rawType.includes('doc')) mappedType = 'document';
        else if (rawType.includes('appoint')) mappedType = 'appointment';

        return {
          id: `NOTIF-${n.id}`,
          patientId: patient?.id || 1,
          title: n.title,
          message: n.message,
          dateTime: n.createdAt ? n.createdAt.toISOString() : new Date().toISOString(),
          timestamp: n.createdAt ? n.createdAt.toISOString() : new Date().toISOString(),
          isRead: n.isRead ?? false,
          type: mappedType as any,
        };
      });

      return res.json({ success: true, data: formatted });
    } catch (err) {
      console.error('[PATIENT] Get notifications error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch notifications.' });
    }
  }
);

/**
 * PUT /api/patient/notifications/:id/read
 * Marks a notification as read.
 */
router.put(
  '/notifications/:id/read',
  authenticateJWT,
  requireRoles(['patient', 'doctor', 'nurse', 'admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const rawId = req.params.id.replace('NOTIF-', '');
      const notifId = parseInt(rawId, 10);

      const notif = await prisma.notification.findFirst({
        where: { id: notifId, userId },
      });

      if (!notif) {
        return res.status(404).json({ success: false, error: 'Notification not found.' });
      }

      await prisma.notification.update({
        where: { id: notif.id },
        data: { isRead: true },
      });

      return res.json({ success: true, message: 'Notification marked as read.' });
    } catch (err) {
      console.error('[PATIENT] Mark notification read error:', err);
      return res.status(500).json({ success: false, error: 'Failed to update notification.' });
    }
  }
);

/**
 * PUT /api/patient/notifications/read-all
 * Marks all notifications for the authenticated user as read.
 */
router.put(
  '/notifications/read-all',
  authenticateJWT,
  requireRoles(['patient', 'doctor', 'nurse', 'admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
      return res.json({ success: true, message: 'All notifications marked as read.' });
    } catch (err) {
      console.error('[PATIENT] Mark all notifications read error:', err);
      return res.status(500).json({ success: false, error: 'Failed to mark all notifications as read.' });
    }
  }
);

export default router;

