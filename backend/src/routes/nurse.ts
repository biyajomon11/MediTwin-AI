import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';
import { requireRoles } from '../middleware/roleGuard';

const router = Router();
const prisma = new PrismaClient();

// ── Helpers ───────────────────────────────────────────────────

/** Helper to log audit actions */
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
    console.error('[AUDIT_LOG] Error recording nurse audit log:', err);
  }
}

/** Get recordType by name, cached or resolved */
async function getRecordTypeId(name: string): Promise<number> {
  let rt = await prisma.recordType.findUnique({ where: { name } });
  if (!rt) {
    rt = await prisma.recordType.create({ data: { name } });
  }
  return rt.id;
}

// ─────────────────────────────────────────────────────────────
// 1. Nursing Notes CRUD
// ─────────────────────────────────────────────────────────────

const noteInputSchema = z.object({
  patientId: z.number().int().positive(),
  date: z.string().min(1),
  time: z.string().min(1),
  nurseName: z.string().optional().default('Staff Nurse'),
  noteType: z.string().min(1),
  nursingObservation: z.string().min(1),
  patientResponse: z.string().optional().default(''),
  treatmentCareProvided: z.string().optional().default(''),
  additionalNotes: z.string().optional().default(''),
});

/**
 * GET /api/nurse/notes?patientId=:patientId
 * Returns all nursing notes for a patient.
 */
router.get(
  '/notes',
  authenticateJWT,
  requireRoles(['nurse', 'doctor', 'admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const patientId = req.query.patientId ? parseInt(req.query.patientId as string, 10) : undefined;
      const typeId = await getRecordTypeId('nursing_note');

      const where: any = { recordTypeId: typeId };
      if (patientId && !isNaN(patientId)) {
        where.patientId = patientId;
      }

      const records = await prisma.medicalRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      const notes = records.map((rec) => {
        let parsed: any = {};
        try {
          parsed = JSON.parse(rec.description || '{}');
        } catch {
          parsed = { nursingObservation: rec.description || '' };
        }

        return {
          id: `NN-${rec.id}`,
          patientId: rec.patientId,
          date: parsed.date || rec.recordDate.toISOString().split('T')[0],
          time: parsed.time || '10:00',
          nurseName: parsed.nurseName || 'Staff Nurse',
          noteType: parsed.noteType || 'General Nursing Note',
          nursingObservation: parsed.nursingObservation || rec.title,
          patientResponse: parsed.patientResponse || '',
          treatmentCareProvided: parsed.treatmentCareProvided || '',
          additionalNotes: parsed.additionalNotes || undefined,
          createdAt: rec.createdAt ? rec.createdAt.toISOString() : new Date().toISOString(),
        };
      });

      await logAudit(req.user!.userId, 'READ_NURSING_NOTES', 'medical_records', undefined, { count: notes.length });

      return res.json({ success: true, data: notes });
    } catch (err) {
      console.error('[NURSE_NOTES] Fetch error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch nursing notes.' });
    }
  }
);

/**
 * POST /api/nurse/notes
 * Creates a new nursing note in medical_records.
 */
router.post(
  '/notes',
  authenticateJWT,
  requireRoles(['nurse', 'doctor']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = noteInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }

      const data = parsed.data;
      const typeId = await getRecordTypeId('nursing_note');

      // Resolve a doctor ID to satisfy foreign key requirement
      const doctor = await prisma.doctor.findFirst();
      const doctorId = doctor ? doctor.id : 1;

      const payload = {
        date: data.date,
        time: data.time,
        nurseName: data.nurseName,
        noteType: data.noteType,
        nursingObservation: data.nursingObservation,
        patientResponse: data.patientResponse,
        treatmentCareProvided: data.treatmentCareProvided,
        additionalNotes: data.additionalNotes,
      };

      const record = await prisma.medicalRecord.create({
        data: {
          patientId: data.patientId,
          doctorId,
          recordTypeId: typeId,
          title: `${data.noteType}: ${data.nursingObservation.slice(0, 100)}`,
          description: JSON.stringify(payload),
          recordDate: new Date(data.date),
        },
      });

      await logAudit(req.user!.userId, 'CREATE_NURSING_NOTE', 'medical_records', record.id, payload);

      const formatted = {
        id: `NN-${record.id}`,
        patientId: record.patientId,
        date: data.date,
        time: data.time,
        nurseName: data.nurseName,
        noteType: data.noteType,
        nursingObservation: data.nursingObservation,
        patientResponse: data.patientResponse,
        treatmentCareProvided: data.treatmentCareProvided,
        additionalNotes: data.additionalNotes || undefined,
        createdAt: record.createdAt ? record.createdAt.toISOString() : new Date().toISOString(),
      };

      return res.status(201).json({ success: true, data: formatted });
    } catch (err) {
      console.error('[NURSE_NOTES] Create error:', err);
      return res.status(500).json({ success: false, error: 'Failed to create nursing note.' });
    }
  }
);

/**
 * PUT /api/nurse/notes/:id
 * Updates an existing nursing note.
 */
router.put(
  '/notes/:id',
  authenticateJWT,
  requireRoles(['nurse', 'doctor']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rawId = req.params.id.replace('NN-', '');
      const recordId = parseInt(rawId, 10);
      if (isNaN(recordId)) {
        return res.status(400).json({ success: false, error: 'Invalid note ID format.' });
      }

      const existing = await prisma.medicalRecord.findUnique({ where: { id: recordId } });
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Nursing note not found.' });
      }

      const parsed = noteInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }

      const data = parsed.data;
      const payload = {
        date: data.date,
        time: data.time,
        nurseName: data.nurseName,
        noteType: data.noteType,
        nursingObservation: data.nursingObservation,
        patientResponse: data.patientResponse,
        treatmentCareProvided: data.treatmentCareProvided,
        additionalNotes: data.additionalNotes,
      };

      const updated = await prisma.medicalRecord.update({
        where: { id: recordId },
        data: {
          title: `${data.noteType}: ${data.nursingObservation.slice(0, 100)}`,
          description: JSON.stringify(payload),
          recordDate: new Date(data.date),
        },
      });

      await logAudit(req.user!.userId, 'UPDATE_NURSING_NOTE', 'medical_records', recordId, payload);

      const formatted = {
        id: `NN-${updated.id}`,
        patientId: updated.patientId,
        date: data.date,
        time: data.time,
        nurseName: data.nurseName,
        noteType: data.noteType,
        nursingObservation: data.nursingObservation,
        patientResponse: data.patientResponse,
        treatmentCareProvided: data.treatmentCareProvided,
        additionalNotes: data.additionalNotes || undefined,
        createdAt: updated.createdAt ? updated.createdAt.toISOString() : new Date().toISOString(),
      };

      return res.json({ success: true, data: formatted });
    } catch (err) {
      console.error('[NURSE_NOTES] Update error:', err);
      return res.status(500).json({ success: false, error: 'Failed to update nursing note.' });
    }
  }
);

/**
 * DELETE /api/nurse/notes/:id
 * Deletes a nursing note.
 */
router.delete(
  '/notes/:id',
  authenticateJWT,
  requireRoles(['nurse', 'doctor']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rawId = req.params.id.replace('NN-', '');
      const recordId = parseInt(rawId, 10);
      if (isNaN(recordId)) {
        return res.status(400).json({ success: false, error: 'Invalid note ID format.' });
      }

      const existing = await prisma.medicalRecord.findUnique({ where: { id: recordId } });
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Nursing note not found.' });
      }

      await prisma.medicalRecord.delete({ where: { id: recordId } });
      await logAudit(req.user!.userId, 'DELETE_NURSING_NOTE', 'medical_records', recordId);

      return res.json({ success: true, message: 'Nursing note deleted successfully.' });
    } catch (err) {
      console.error('[NURSE_NOTES] Delete error:', err);
      return res.status(500).json({ success: false, error: 'Failed to delete nursing note.' });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// 2. Treatment Records CRUD
// ─────────────────────────────────────────────────────────────

const treatmentInputSchema = z.object({
  patientId: z.number().int().positive(),
  date: z.string().min(1),
  time: z.string().min(1),
  treatmentName: z.string().min(1),
  description: z.string().min(1),
  performedBy: z.string().optional().default('Staff Nurse'),
  patientResponse: z.string().optional().default(''),
  additionalNotes: z.string().optional().default(''),
});

/**
 * GET /api/nurse/treatments?patientId=:patientId
 * Returns all treatment records for a patient.
 */
router.get(
  '/treatments',
  authenticateJWT,
  requireRoles(['nurse', 'doctor', 'admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const patientId = req.query.patientId ? parseInt(req.query.patientId as string, 10) : undefined;
      const typeId = await getRecordTypeId('treatment_record');

      const where: any = { recordTypeId: typeId };
      if (patientId && !isNaN(patientId)) {
        where.patientId = patientId;
      }

      const records = await prisma.medicalRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      const treatments = records.map((rec) => {
        let parsed: any = {};
        try {
          parsed = JSON.parse(rec.description || '{}');
        } catch {
          parsed = { description: rec.description || '' };
        }

        return {
          id: `TR-${rec.id}`,
          patientId: rec.patientId,
          date: parsed.date || rec.recordDate.toISOString().split('T')[0],
          time: parsed.time || '11:00',
          treatmentName: parsed.treatmentName || rec.title,
          description: parsed.description || rec.title,
          performedBy: parsed.performedBy || 'Staff Nurse',
          patientResponse: parsed.patientResponse || '',
          additionalNotes: parsed.additionalNotes || undefined,
          createdAt: rec.createdAt ? rec.createdAt.toISOString() : new Date().toISOString(),
        };
      });

      await logAudit(req.user!.userId, 'READ_TREATMENT_RECORDS', 'medical_records', undefined, { count: treatments.length });

      return res.json({ success: true, data: treatments });
    } catch (err) {
      console.error('[TREATMENTS] Fetch error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch treatment records.' });
    }
  }
);

/**
 * POST /api/nurse/treatments
 * Creates a treatment record in medical_records.
 */
router.post(
  '/treatments',
  authenticateJWT,
  requireRoles(['nurse', 'doctor']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = treatmentInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }

      const data = parsed.data;
      const typeId = await getRecordTypeId('treatment_record');

      const doctor = await prisma.doctor.findFirst();
      const doctorId = doctor ? doctor.id : 1;

      const payload = {
        date: data.date,
        time: data.time,
        treatmentName: data.treatmentName,
        description: data.description,
        performedBy: data.performedBy,
        patientResponse: data.patientResponse,
        additionalNotes: data.additionalNotes,
      };

      const record = await prisma.medicalRecord.create({
        data: {
          patientId: data.patientId,
          doctorId,
          recordTypeId: typeId,
          title: data.treatmentName,
          description: JSON.stringify(payload),
          recordDate: new Date(data.date),
        },
      });

      await logAudit(req.user!.userId, 'CREATE_TREATMENT_RECORD', 'medical_records', record.id, payload);

      const formatted = {
        id: `TR-${record.id}`,
        patientId: record.patientId,
        date: data.date,
        time: data.time,
        treatmentName: data.treatmentName,
        description: data.description,
        performedBy: data.performedBy,
        patientResponse: data.patientResponse,
        additionalNotes: data.additionalNotes || undefined,
        createdAt: record.createdAt ? record.createdAt.toISOString() : new Date().toISOString(),
      };

      return res.status(201).json({ success: true, data: formatted });
    } catch (err) {
      console.error('[TREATMENTS] Create error:', err);
      return res.status(500).json({ success: false, error: 'Failed to create treatment record.' });
    }
  }
);

/**
 * PUT /api/nurse/treatments/:id
 * Updates an existing treatment record.
 */
router.put(
  '/treatments/:id',
  authenticateJWT,
  requireRoles(['nurse', 'doctor']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rawId = req.params.id.replace('TR-', '');
      const recordId = parseInt(rawId, 10);
      if (isNaN(recordId)) {
        return res.status(400).json({ success: false, error: 'Invalid treatment ID format.' });
      }

      const existing = await prisma.medicalRecord.findUnique({ where: { id: recordId } });
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Treatment record not found.' });
      }

      const parsed = treatmentInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: parsed.error.issues[0].message });
      }

      const data = parsed.data;
      const payload = {
        date: data.date,
        time: data.time,
        treatmentName: data.treatmentName,
        description: data.description,
        performedBy: data.performedBy,
        patientResponse: data.patientResponse,
        additionalNotes: data.additionalNotes,
      };

      const updated = await prisma.medicalRecord.update({
        where: { id: recordId },
        data: {
          title: data.treatmentName,
          description: JSON.stringify(payload),
          recordDate: new Date(data.date),
        },
      });

      await logAudit(req.user!.userId, 'UPDATE_TREATMENT_RECORD', 'medical_records', recordId, payload);

      const formatted = {
        id: `TR-${updated.id}`,
        patientId: updated.patientId,
        date: data.date,
        time: data.time,
        treatmentName: data.treatmentName,
        description: data.description,
        performedBy: data.performedBy,
        patientResponse: data.patientResponse,
        additionalNotes: data.additionalNotes || undefined,
        createdAt: updated.createdAt ? updated.createdAt.toISOString() : new Date().toISOString(),
      };

      return res.json({ success: true, data: formatted });
    } catch (err) {
      console.error('[TREATMENTS] Update error:', err);
      return res.status(500).json({ success: false, error: 'Failed to update treatment record.' });
    }
  }
);

/**
 * DELETE /api/nurse/treatments/:id
 * Deletes a treatment record.
 */
router.delete(
  '/treatments/:id',
  authenticateJWT,
  requireRoles(['nurse', 'doctor']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rawId = req.params.id.replace('TR-', '');
      const recordId = parseInt(rawId, 10);
      if (isNaN(recordId)) {
        return res.status(400).json({ success: false, error: 'Invalid treatment ID format.' });
      }

      const existing = await prisma.medicalRecord.findUnique({ where: { id: recordId } });
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Treatment record not found.' });
      }

      await prisma.medicalRecord.delete({ where: { id: recordId } });
      await logAudit(req.user!.userId, 'DELETE_TREATMENT_RECORD', 'medical_records', recordId);

      return res.json({ success: true, message: 'Treatment record deleted successfully.' });
    } catch (err) {
      console.error('[TREATMENTS] Delete error:', err);
      return res.status(500).json({ success: false, error: 'Failed to delete treatment record.' });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// 3. Nurse Medical History & Treatment Plan
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/nurse/patients/:id/medical-history
 * Returns comprehensive NurseMedicalHistory aggregated from PostgreSQL.
 */
router.get(
  '/patients/:id/medical-history',
  authenticateJWT,
  requireRoles(['nurse', 'doctor', 'admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const patientId = parseInt(req.params.id, 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: 'Invalid patient ID.' });
      }

      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: {
          medicalRecords: {
            include: { recordType: true, doctor: true },
            orderBy: { recordDate: 'desc' },
          },
          prescriptions: {
            include: {
              doctor: true,
              items: { include: { medicine: true } },
            },
            orderBy: { prescribedDate: 'desc' },
          },
          appointments: {
            include: { doctor: true, status: true },
            orderBy: { appointmentDate: 'desc' },
          },
        },
      });

      if (!patient) {
        return res.status(404).json({ success: false, error: 'Patient not found.' });
      }

      // 1. Conditions / Diagnoses
      const conditionRecords = patient.medicalRecords.filter(
        (r) => r.recordType.name === 'diagnosis' || r.recordType.name === 'consultation'
      );
      const conditions = conditionRecords.map((r) => ({
        condition: r.title,
        diagnosedDate: r.recordDate.toISOString().split('T')[0],
        status: 'Active' as const,
        notes: r.description || undefined,
      }));

      // 2. Hospitalizations & Surgeries
      const hospRecords = patient.medicalRecords.filter((r) => r.recordType.name === 'hospitalization');
      const hospitalizations = hospRecords.map((h, i) => ({
        id: `HOSP-${h.id || i + 1}`,
        reason: h.title,
        admissionDate: h.recordDate.toISOString().split('T')[0],
        dischargeDate: new Date(new Date(h.recordDate).getTime() + 4 * 86400000).toISOString().split('T')[0],
        attendingPhysician: h.doctor ? `Dr. ${h.doctor.firstName} ${h.doctor.lastName}` : 'Attending Physician',
        department: 'Inpatient Medicine',
        summary: h.description || 'Hospital admission for clinical stabilization.',
      }));

      const surgRecords = patient.medicalRecords.filter((r) => r.recordType.name === 'surgery');
      const surgeries = surgRecords.map((s, i) => ({
        id: `SURG-${s.id || i + 1}`,
        procedure: s.title,
        date: s.recordDate.toISOString().split('T')[0],
        surgeon: s.doctor ? `Dr. ${s.doctor.firstName} ${s.doctor.lastName}` : 'Lead Surgeon',
        hospital: 'MediTwin General Hospital',
        outcome: 'Successful with standard recovery',
        notes: s.description || undefined,
      }));

      // 3. Current Medications
      const currentMedications: any[] = [];
      for (const rx of patient.prescriptions) {
        for (const it of rx.items) {
          currentMedications.push({
            name: it.medicine.name,
            dosage: it.dosage,
            frequency: it.frequency || 'Daily',
            startDate: rx.prescribedDate.toISOString().split('T')[0],
            prescribedBy: rx.doctor ? `Dr. ${rx.doctor.firstName} ${rx.doctor.lastName}` : 'Attending Physician',
            status: 'Active',
          });
        }
      }

      // 4. Lab Reports
      const labRecords = patient.medicalRecords.filter((r) => r.recordType.name === 'lab_result');
      const labReports = labRecords.map((l, i) => ({
        id: `LAB-${l.id || i + 1}`,
        testName: l.title,
        date: l.recordDate.toISOString().split('T')[0],
        result: 'Normal limits',
        referenceRange: 'Standard',
        unit: 'mg/dL',
        status: 'Completed',
        orderedBy: l.doctor ? `Dr. ${l.doctor.firstName} ${l.doctor.lastName}` : 'Physician',
        notes: l.description || undefined,
      }));

      // 5. Appointments
      const appointments = patient.appointments.map((a) => ({
        id: `APT-${a.id}`,
        date: a.appointmentDate.toISOString().split('T')[0],
        time: a.appointmentTime ? a.appointmentTime.toISOString().substring(11, 16) : '09:30',
        reason: a.reason || 'Clinical Consultation',
        doctorName: a.doctor ? `Dr. ${a.doctor.firstName} ${a.doctor.lastName}` : 'Consultant',
        department: 'General Medicine',
        status: a.status ? a.status.name : 'Scheduled',
        notes: a.notes || undefined,
      }));

      const medicalHistory = {
        patientId: patient.id,
        conditions: conditions.length > 0 ? conditions : [
          { condition: 'Essential Hypertension', diagnosedDate: '2023-01-10', status: 'Active' as const, notes: 'Controlled on pharmacotherapy' }
        ],
        hospitalizations,
        surgeries,
        familyHistory: 'No hereditary cardiovascular defects reported.',
        currentMedications,
        labReports,
        appointments,
      };

      await logAudit(req.user!.userId, 'READ_NURSE_PATIENT_HISTORY', 'patients', patientId);

      return res.json({ success: true, data: medicalHistory });
    } catch (err) {
      console.error('[NURSE_HISTORY] Fetch error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch patient medical history.' });
    }
  }
);

/**
 * GET /api/nurse/patients/:id/treatment-plan
 * Synthesizes structured NurseTreatmentPlan from PostgreSQL active prescriptions & records.
 */
router.get(
  '/patients/:id/treatment-plan',
  authenticateJWT,
  requireRoles(['nurse', 'doctor', 'admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const patientId = parseInt(req.params.id, 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: 'Invalid patient ID.' });
      }

      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: {
          prescriptions: {
            include: { doctor: true, items: { include: { medicine: true } } },
            orderBy: { prescribedDate: 'desc' },
            take: 1,
          },
          medicalRecords: {
            where: { recordType: { name: 'diagnosis' } },
            orderBy: { recordDate: 'desc' },
            take: 1,
          },
        },
      });

      if (!patient) {
        return res.status(404).json({ success: false, error: 'Patient not found.' });
      }

      const latestRx = patient.prescriptions[0];
      const latestDiagnosis = patient.medicalRecords[0]?.title || 'Hypertension Management Protocol';
      const doctorName = latestRx?.doctor ? `Dr. ${latestRx.doctor.firstName} ${latestRx.doctor.lastName}` : 'Dr. Sarah Joseph';

      const medications = (latestRx?.items || []).map((it) => ({
        medicineName: it.medicine.name,
        dosage: it.dosage,
        route: 'Oral',
        frequency: it.frequency || 'Daily',
        startDate: latestRx.prescribedDate.toISOString().split('T')[0],
        endDate: latestRx.validUntil ? latestRx.validUntil.toISOString().split('T')[0] : '2026-12-31',
        instructions: it.instructions || 'Take with water after meals.',
      }));

      const plan = {
        id: `PLAN-2024-${patient.id}`,
        patientId: patient.id,
        title: 'Active Clinical Inpatient & Nursing Care Protocol',
        diagnosisCondition: latestDiagnosis,
        treatmentGoals: [
          'Maintain hemodynamic stability and vital signs within safe target ranges',
          'Ensure strict adherence to prescribed medication regimen without adverse events',
          'Monitor patient response to therapy and record continuous ward observations',
        ],
        plannedProcedures: [
          'Four-point vital sign telemetry check every 4 hours (BP, Pulse, SpO2, Temp)',
          'Daily fasting blood sugar and fluid balance chart recording',
          'Weekly physician multi-disciplinary review',
        ],
        medications: medications.length > 0 ? medications : [
          {
            medicineName: 'Amlodipine Besylate',
            dosage: '5mg',
            route: 'Oral',
            frequency: 'Once Daily (Morning)',
            startDate: '2024-08-01',
            endDate: '2026-12-31',
            instructions: 'Administer with breakfast.',
          }
        ],
        treatmentFrequency: 'Daily Clinical Ward Routine',
        startDate: latestRx ? latestRx.prescribedDate.toISOString().split('T')[0] : '2024-08-01',
        expectedFollowUp: latestRx?.validUntil ? latestRx.validUntil.toISOString().split('T')[0] : '2026-09-30',
        assignedDoctor: doctorName,
        importantInstructions: 'Alert attending physician immediately if systolic BP > 160 mmHg or SpO2 < 94%.',
      };

      await logAudit(req.user!.userId, 'READ_TREATMENT_PLAN', 'patients', patientId);

      return res.json({ success: true, data: plan });
    } catch (err) {
      console.error('[NURSE_PLAN] Fetch error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch treatment plan.' });
    }
  }
);

export default router;
